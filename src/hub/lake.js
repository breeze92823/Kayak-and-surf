// The lake surface (and, through poolWater(), the island's splash pool): a single-pass shader on
// top of MeshStandardMaterial (so it keeps lights, shadows and fog). Two caustic webs cross at different scales and drift apart, so
// the tile never shows and the cells shimmer; the colour runs from deep blue to turquoise over
// the shallows; foam hugs every shore with bands rolling in toward it; sun glints twinkle where
// the webs cross. Depth and shore distance come from a map baked once from the colliders
// (bake(), after the whole hub is built), so there is no depth pre-pass.
import { ClampToEdgeWrapping, Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshStandardMaterial, PlaneGeometry, RGBAFormat, Vector3, Vector4 } from 'three'
import { COLORS, HUB_COLORS, LAKE_FX, LIGHT, MATERIAL_PBR, WORLD_BOUNDS } from '../config.js'
import { solidsThrough } from '../colliders.js'
import { causticTile, toTexture } from '../textures.js'
import { LAKE } from './layout.js'

const VERTEX_HEAD = /* glsl */ `
varying vec3 vLakeWorld;
`

const FRAGMENT_HEAD = /* glsl */ `
uniform float uTime;
uniform sampler2D uCaustic;
uniform vec2 uCausticScale;
uniform float uFoamSpeed;
uniform float uBands; // foam bands across an edge's foam range
uniform float uFroth; // how lumpy the foam line along an edge is
uniform float uSparkle;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uLine;
uniform vec3 uHorizon;
uniform vec3 uFoam;
uniform vec3 uSunDir;
varying vec3 vLakeWorld;
`

// Replaces map_fragment: computes the water colour into diffuseColor, plus `lakeGlow` (foam and
// glints, added to the emissive so they stay bright in shadow). Each surface supplies
// waterShore(wp) -> r shallowness, g closeness to an edge (foam rolls in toward it), b closeness
// to an outflow (foam spreads away from it).
const FRAGMENT_COLOUR = /* glsl */ `
vec2 wp = vLakeWorld.xz;
vec3 toEye = cameraPosition - vLakeWorld;
float eyeDist = length(toEye);
vec3 V = toEye / eyeDist;
float far = smoothstep(40.0, 260.0, eyeDist);
float grazing = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);

float c1 = texture2D(uCaustic, wp / uCausticScale.x + uTime * vec2(0.012, 0.005)).r;
float c2 = texture2D(uCaustic, mat2(0.8, -0.6, 0.6, 0.8) * wp / uCausticScale.y - uTime * vec2(0.004, 0.011)).r;
float web = max(c1, c2);
vec3 shore = waterShore(wp);

// Slow broad patches so open water isn't one flat colour.
float patches = sin(wp.x * 0.05 + uTime * 0.07) * sin(wp.y * 0.043 - uTime * 0.05);
vec3 lakeCol = mix(uDeep, uShallow, clamp(shore.r + patches * 0.12 + 0.1, 0.0, 1.0));
lakeCol = mix(lakeCol, uLine, web * mix(0.8, 0.25, far));
lakeCol = mix(lakeCol, uHorizon, grazing * 0.55);

// Foam: a frothy line along each edge with bands rolling in toward it that fade further out, and
// churn at an outflow with bands spreading away from it.
float near = shore.g;
float edge = smoothstep(0.8, 0.88, near + (c1 - 0.5) * uFroth);
float roll = fract(near * uBands - uTime * uFoamSpeed + c2 * 0.08);
float bands = smoothstep(0.8, 0.9, roll) * (1.0 - smoothstep(0.93, 1.0, roll)) * smoothstep(0.2, 0.7, near) * (0.5 + 0.5 * c2);
float spill = shore.b;
float churn = smoothstep(0.72, 0.86, spill + (c2 - 0.5) * uFroth * 1.4);
float rollOut = fract(spill * uBands + uTime * uFoamSpeed * 1.6 + c1 * 0.08);
float spread = smoothstep(0.8, 0.9, rollOut) * (1.0 - smoothstep(0.93, 1.0, rollOut)) * smoothstep(0.1, 0.6, spill) * (0.5 + 0.5 * c1);
float foam = clamp(max(max(edge, bands * 0.85), max(churn, spread * 0.9)), 0.0, 1.0);
lakeCol = mix(lakeCol, uFoam, foam);

// Glints where the webs cross, much stronger along the sun's reflection.
float tw = texture2D(uCaustic, wp * 0.43 + uTime * vec2(-0.06, 0.04)).r;
float sun = pow(max(dot(reflect(-V, vec3(0.0, 1.0, 0.0)), uSunDir), 0.0), 24.0);
float sparkle = smoothstep(0.45, 0.85, c1 * tw * 1.4) * (0.3 + 2.5 * sun) * (1.0 - far) * uSparkle;

diffuseColor.rgb = lakeCol;
diffuseColor.a = mix(diffuseColor.a * mix(1.0, 0.8, shore.r), 1.0, foam);
vec3 lakeGlow = uFoam * (foam * 0.3 + sparkle);
`

// Shared by every surface using this shader: one clock (ticked by the lake's update) and one
// grey caustic tile.
const clock = { value: 0 }
let causticTex = null

// A MeshStandardMaterial running the water shader. shoreGLSL declares the surface's own uniforms
// and defines waterShore(); `extra` holds those uniforms plus any colour/scale overrides.
function waterMaterial(shoreGLSL, extra, { opacity = 1, glow = 0.35 } = {}) {
  causticTex ??= toTexture(causticTile('#000000', '#ffffff'), { srgb: false })
  const uniforms = {
    uTime: clock,
    uCaustic: { value: causticTex },
    uCausticScale: { value: LAKE_FX.causticScale },
    uFoamSpeed: { value: LAKE_FX.foamRollSpeed },
    uBands: { value: LAKE_FX.foamBands },
    uFroth: { value: LAKE_FX.froth },
    uSparkle: { value: LAKE_FX.sparkle },
    uDeep: { value: new Color(HUB_COLORS.lakeDeep) },
    uShallow: { value: new Color(HUB_COLORS.lakeShallow) },
    uLine: { value: new Color(HUB_COLORS.lakeLine) },
    uHorizon: { value: new Color(COLORS.horizon) },
    uFoam: { value: new Color(HUB_COLORS.foam) },
    uSunDir: { value: new Vector3(...LIGHT.sunPosition).normalize() },
    ...extra,
  }
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: glow,
    transparent: opacity < 1,
    opacity,
    ...MATERIAL_PBR.WATER,
  })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvLakeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
    shader.fragmentShader = FRAGMENT_HEAD + shoreGLSL + shader.fragmentShader
      .replace('#include <map_fragment>', FRAGMENT_COLOUR)
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = totalEmissiveRadiance * lakeCol + lakeGlow;')
  }
  // The lake and pool shaders differ only in waterShore(): tell three's program cache apart.
  material.customProgramCacheKey = () => shoreGLSL
  material.userData.waterUniforms = uniforms
  return material
}

// The splash pool on the island: an elliptical basin (pool { x, z, rx, rz }) with the slide's
// foot pouring into it (foot { x, z, halfWidth }: the slide body covers |x - foot.x| <= halfWidth
// north of foot.z). Its edges are analytic, so it needs no shore map.
export function poolWater(pool, foot) {
  const FX = LAKE_FX.pool
  return waterMaterial(
    /* glsl */ `
uniform vec4 uPool; // x, z, rx, rz
uniform vec4 uFoot; // x, z, half-width, foam range
uniform float uRimRange;
vec3 waterShore(vec2 wp) {
  vec2 q = (wp - uPool.xy) / uPool.zw;
  float rim = max(0.0, (1.0 - length(q)) * min(uPool.z, uPool.w));
  float nearRim = clamp(1.0 - rim / uRimRange, 0.0, 1.0);
  vec2 d = max(vec2(abs(wp.x - uFoot.x) - uFoot.z, wp.y - uFoot.y), 0.0);
  float nearFoot = clamp(1.0 - length(d) / uFoot.w, 0.0, 1.0);
  return vec3(0.25 + 0.6 * nearRim, nearRim, nearFoot);
}
`,
    {
      uPool: { value: new Vector4(pool.x, pool.z, pool.rx, pool.rz) },
      uFoot: { value: new Vector4(foot.x, foot.z, foot.halfWidth, FX.footRange) },
      uRimRange: { value: FX.rimRange },
      uCausticScale: { value: FX.causticScale },
      uBands: { value: FX.foamBands },
      uFroth: { value: FX.froth },
      uDeep: { value: new Color(HUB_COLORS.pool) },
      uShallow: { value: new Color(HUB_COLORS.poolShallow) },
      uLine: { value: new Color(HUB_COLORS.poolLine) },
    },
    { glow: FX.glow },
  )
}

export function createLake() {
  const rect = {
    x0: WORLD_BOUNDS.minX - LAKE_FX.margin,
    z0: WORLD_BOUNDS.minZ - LAKE_FX.margin,
    x1: WORLD_BOUNDS.maxX + LAKE_FX.margin,
    z1: WORLD_BOUNDS.maxZ + LAKE_FX.margin,
  }
  const w = Math.ceil((rect.x1 - rect.x0) / LAKE_FX.texel)
  const h = Math.ceil((rect.z1 - rect.z0) / LAKE_FX.texel)
  const shore = new DataTexture(new Uint8Array(w * h * 4), w, h, RGBAFormat)
  shore.wrapS = shore.wrapT = ClampToEdgeWrapping
  shore.magFilter = LinearFilter
  shore.minFilter = LinearMipmapLinearFilter
  shore.generateMipmaps = true

  const material = waterMaterial(
    /* glsl */ `
uniform sampler2D uShore;
uniform vec4 uShoreRect; // x0, z0, 1 / width, 1 / depth of the baked shore map
vec3 waterShore(vec2 wp) {
  return vec3(texture2D(uShore, (wp - uShoreRect.xy) * uShoreRect.zw).rg, 0.0);
}
`,
    {
      uShore: { value: shore },
      uShoreRect: { value: new Vector4(rect.x0, rect.z0, 1 / (w * LAKE_FX.texel), 1 / (h * LAKE_FX.texel)) },
    },
    { opacity: 0.93 },
  )

  if (import.meta.env.DEV) window.__lake = material.userData.waterUniforms // tweak colours/strengths live from the console

  const mesh = new Mesh(new PlaneGeometry(1600, 1600), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = LAKE.y
  mesh.receiveShadow = true

  // Visual-only pieces at the waterline that have no collider (the shores' beach aprons).
  const extraShores = []
  function addShore(minX, maxX, minZ, maxZ, maxY) {
    extraShores.push({ minX, maxX, minZ, maxZ, maxY })
  }

  // Fills the shore map from everything solid crossing the surface: R = shallowness (1 at the
  // waterline, 0 over the open lake bed), G = closeness to land (1 at land, 0 at shoreRange).
  function bake() {
    const y = LAKE.y
    const ground = new Float32Array(w * h).fill(LAKE.bed)
    const solids = solidsThrough(y)
    const boxes = [...solids.boxes, ...extraShores]
    const samplers = solids.samplers
    const t = LAKE_FX.texel
    const col = (x) => Math.floor((x - rect.x0) / t)
    const row = (z) => Math.floor((z - rect.z0) / t)
    for (const b of boxes) {
      const i0 = Math.max(0, col(b.minX))
      const i1 = Math.min(w - 1, col(b.maxX))
      const j0 = Math.max(0, row(b.minZ))
      const j1 = Math.min(h - 1, row(b.maxZ))
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (b.maxY > ground[j * w + i]) ground[j * w + i] = b.maxY
    }
    for (let j = 0; j < h; j++) {
      const z = rect.z0 + (j + 0.5) * t
      for (let i = 0; i < w; i++) {
        const x = rect.x0 + (i + 0.5) * t
        const k = j * w + i
        for (const s of samplers) {
          const g = s(x, z, Infinity)
          if (g > ground[k]) ground[k] = g
        }
      }
    }

    // Two-pass chamfer distance (in texels) from every land texel.
    const INF = 1e9
    const dist = new Float32Array(w * h)
    for (let k = 0; k < w * h; k++) dist[k] = ground[k] >= y ? 0 : INF
    const D = Math.SQRT2
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i
        let d = dist[k]
        if (i > 0) d = Math.min(d, dist[k - 1] + 1)
        if (j > 0) {
          d = Math.min(d, dist[k - w] + 1)
          if (i > 0) d = Math.min(d, dist[k - w - 1] + D)
          if (i < w - 1) d = Math.min(d, dist[k - w + 1] + D)
        }
        dist[k] = d
      }
    }
    for (let j = h - 1; j >= 0; j--) {
      for (let i = w - 1; i >= 0; i--) {
        const k = j * w + i
        let d = dist[k]
        if (i < w - 1) d = Math.min(d, dist[k + 1] + 1)
        if (j < h - 1) {
          d = Math.min(d, dist[k + w] + 1)
          if (i < w - 1) d = Math.min(d, dist[k + w + 1] + D)
          if (i > 0) d = Math.min(d, dist[k + w - 1] + D)
        }
        dist[k] = d
      }
    }

    const data = shore.image.data
    const depth = y - LAKE.bed
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i
        const border = i === 0 || j === 0 || i === w - 1 || j === h - 1 // clamp-to-edge reads open water outside
        const shallow = border ? 0 : Math.min(1, Math.max(0, 1 - (y - ground[k]) / depth))
        const near = border ? 0 : Math.max(0, 1 - (dist[k] * t) / LAKE_FX.shoreRange)
        data[k * 4] = shallow * 255
        data[k * 4 + 1] = near * 255
        data[k * 4 + 3] = 255
      }
    }
    shore.needsUpdate = true
  }

  return {
    mesh,
    addShore,
    bake,
    update(dt) {
      clock.value += dt // also drives the splash pool (poolWater)
    },
  }
}
