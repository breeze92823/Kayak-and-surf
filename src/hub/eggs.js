// Showcase eggs (from the reference shot): the 149-Robux stone egg on the deck (grey rock plates
// split by dark cracks with cyan specks, embedded blue crystals, two glowing blue eyes, orange
// horns, a moss tuft) on its glowing magenta stand, and the coin eggs on the yellow band: the
// 500K cream egg (chocolate cup under stacked cream tiers, gold rim glow and motes), the 15K rainbow egg
// (stacked colour layers) and the 20 pixel egg (cyan cubes). Each builder returns a Group with its
// base at y = 0, facing +Z (the pixel egg returns { group, update(t) } since its flakes move).
// The stone egg's cracks are drawn per pixel from the same plate seeds that bulge its mesh, so
// they stay crisp up close on a light mesh.
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { canvas, mulberry32, toTexture } from '../textures.js'
import { neon, plastic } from './materials.js'
import { SPHERE, SPHERE_LO, bake, ball, tube } from './sculpt.js'
import { particles, rimGlow } from './particles.js'

const HEX = new CylinderGeometry(1, 1, 1, 6)
const RING = new TorusGeometry(1, 0.04, 8, 48)
const SOCKET = new TorusGeometry(1, 0.3, 8, 24)

// Egg outline: radius at height fraction yn (-1 bottom .. 1 top) for a unit-radius egg, wider
// below the middle and tapering to a point when `tip` > 0.
function eggRadius(yn, tip = 0) {
  const s = Math.sqrt(Math.max(0, 1 - yn * yn))
  return Math.pow(s, 1 + tip * Math.max(0, yn) ** 2) * (1 - 0.1 * yn)
}

// `upTo` (height fraction) cuts the egg off below its top, leaving it open.
function eggGeometry(R, half, tip, around, rows, upTo = 1) {
  const pts = []
  const end = Math.acos(-upTo)
  for (let i = 0; i <= rows; i++) {
    const yn = -Math.cos((i / rows) * end)
    pts.push(new Vector2(R * eggRadius(yn, tip), yn * half))
  }
  return new LatheGeometry(pts, around)
}

// Point and outward normal on the egg's surface at angle `theta` round Y (0 = +Z) and height
// fraction yn.
function onEgg(R, half, tip, theta, yn) {
  const r = R * eggRadius(yn, tip)
  const p = new Vector3(Math.sin(theta) * r, yn * half, Math.cos(theta) * r)
  const n = new Vector3(p.x / (R * R), p.y / (half * half), p.z / (R * R)).normalize()
  return { p, n }
}

// Radial glow sprite (auras).
let glowTex
function glow(color, size, opacity) {
  glowTex ??= (() => {
    const c = canvas(128)
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.45, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    return toTexture(c)
  })()
  const s = new Sprite(new SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false }))
  s.scale.setScalar(size)
  return s
}

// --- Stone egg --------------------------------------------------------------------------

const SEEDS = 58

function plateSeeds(seed) {
  const rand = mulberry32(seed)
  const seeds = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < SEEDS; i++) {
    const y = 1 - ((i + 0.5) / SEEDS) * 2
    const r = Math.sqrt(1 - y * y)
    const a = i * golden + (rand() - 0.5) * 0.9
    seeds.push(new Vector3(Math.cos(a) * r, y + (rand() - 0.5) * 0.12, Math.sin(a) * r).normalize())
  }
  return { seeds, heights: seeds.map(() => rand()) }
}

function stoneMaterial(scale, seeds) {
  const material = new MeshStandardMaterial({ color: '#d9dde2', roughness: 0.8, metalness: 0 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.eggSeeds = { value: seeds }
    shader.uniforms.eggScale = { value: scale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 eggScale;\nvarying vec3 vEggDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEggDir = position / eggScale;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
uniform vec3 eggSeeds[${SEEDS}];
varying vec3 vEggDir;
float eggHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
vec3 eggDir = normalize(vEggDir);
float d1 = -2.0;
float d2 = -2.0;
float plate = 0.0;
for (int i = 0; i < ${SEEDS}; i++) {
  float d = dot(eggDir, eggSeeds[i]);
  if (d > d1) { d2 = d1; d1 = d; plate = float(i); }
  else if (d > d2) { d2 = d; }
}
// Angular distance to the nearest plate border (half the gap between the two nearest seeds).
float edge = acos(clamp(d2, -1.0, 1.0)) - acos(clamp(d1, -1.0, 1.0));
float aa = fwidth(edge);
float crack = 1.0 - smoothstep(0.022 - aa, 0.022 + aa, edge);
float tone = 0.86 + 0.14 * eggHash(vec3(plate, 3.1, 7.7));
float rim = mix(0.68, 1.0, smoothstep(0.0, 0.22, edge));
diffuseColor.rgb *= tone * rim;
// Cyan specks scattered over the plates.
vec3 sp = eggDir * 15.0;
vec3 cell = floor(sp);
float pick = eggHash(cell);
vec3 centre = cell + 0.5 + (vec3(eggHash(cell + 1.3), eggHash(cell + 2.7), eggHash(cell + 4.1)) - 0.5) * 0.5;
float speck = step(0.62, pick) * (1.0 - smoothstep(0.1, 0.17, length(sp - centre))) * (1.0 - crack);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.85, 1.0), speck);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.17, 0.2), crack);
float eggSpeck = speck;`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.2, 0.6, 1.0) * eggSpeck * 0.8;')
  }
  return material
}

export function stoneEgg() {
  const g = new Group()
  const R = 0.92
  const half = 1.12
  const tip = 0.9
  const { seeds, heights } = plateSeeds(21)
  // Shell: plates bulge out a little each, sinking into grooves along their borders.
  let geo = eggGeometry(R, half, tip, 56, 44)
  geo.deleteAttribute('normal')
  geo.deleteAttribute('uv')
  geo = mergeVertices(geo)
  const pos = geo.attributes.position
  const v = new Vector3()
  const dir = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    dir.set(v.x / R, v.y / half, v.z / R).normalize()
    let d1 = -2
    let d2 = -2
    let id = 0
    seeds.forEach((s, j) => {
      const d = dir.dot(s)
      if (d > d1) [d2, d1, id] = [d1, d, j]
      else if (d > d2) d2 = d
    })
    const edge = Math.acos(Math.min(1, d2)) - Math.acos(Math.min(1, d1))
    const k = Math.min(1, edge / 0.13)
    const bulge = (0.02 + heights[id] * 0.035) * k * (2 - k) - 0.025 * (1 - k)
    const len = Math.hypot(v.x, v.z)
    // Push out along the horizontal radius (the tips stay put so the poles keep closed).
    if (len > 1e-4) {
      const s = (len + bulge * Math.min(1, len / (R * 0.3))) / len
      v.x *= s
      v.z *= s
    }
    v.y += Math.sign(v.y) * bulge * Math.abs(v.y / half) * 0.6
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  ball(g, stoneMaterial(new Vector3(R, half, R), seeds), [0, 0, 0], 1, null, geo)

  const stone = plastic('#cfd4d9', { roughness: 0.8 })
  const at = (theta, yn) => onEgg(R, half, tip, theta, yn)
  // Embedded crystals: flat-topped hex gems standing out along the surface normal.
  const crystal = plastic('#1fa6ff', { flatShading: true, roughness: 0.2, emissive: '#0a7dff', emissiveIntensity: 0.9 })
  const crystalPale = plastic('#5fd2ff', { flatShading: true, roughness: 0.2, emissive: '#22a8ff', emissiveIntensity: 0.8 })
  ;[
    [-1.0, 0.25, 0.3, crystal],
    [-1.45, -0.18, 0.22, crystalPale],
    [-0.78, -0.08, 0.14, crystal],
    [-0.22, -0.5, 0.24, crystalPale],
    [1.05, 0.44, 0.14, crystal],
    [1.55, -0.32, 0.16, crystal],
    [2.6, 0.12, 0.24, crystalPale],
    [-2.4, -0.35, 0.2, crystal],
    [3.1, 0.5, 0.13, crystal],
  ].forEach(([theta, yn, r, material], i) => {
    const { p, n } = at(theta, yn)
    const m = ball(g, material, p.clone().addScaledVector(n, r * 0.05), [r, r * 0.7, r], null, HEX)
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), n)
    m.rotateY(i * 0.7)
  })
  // Face: two glowing eyes in rock sockets under heavy brows, a snout bump, orange horns.
  const eyeGlow = neon('#29b6ff', 0.9)
  const iris = neon('#a6f2ff', 0.8)
  for (const s of [-1, 1]) {
    const { p, n } = at(s * 0.46, 0.04)
    ball(g, stone, p, 0.19, null, SOCKET).lookAt(p.clone().add(n))
    ball(g, eyeGlow, p.clone().addScaledVector(n, 0.02), [0.16, 0.15, 0.09]).lookAt(p.clone().add(n))
    ball(g, iris, p.clone().addScaledVector(n, 0.08), [0.07, 0.07, 0.04], null, SPHERE_LO).lookAt(p.clone().addScaledVector(n, 2))
    ball(g, plastic('#0c3c6e'), p.clone().addScaledVector(n, 0.11), [0.035, 0.035, 0.02], null, SPHERE_LO).lookAt(p.clone().addScaledVector(n, 2))
    ball(g, neon('#ffffff', 1), p.clone().addScaledVector(n, 0.12).add(new Vector3(s * 0.03, 0.05, 0)), 0.022, null, SPHERE_LO)
    const brow = at(s * 0.42, 0.26)
    ball(g, stone, brow.p, [0.2, 0.07, 0.1]).lookAt(brow.p.clone().add(brow.n))
    const horn = at(s * 0.38, 0.62)
    const up = horn.n.clone().add(new Vector3(s * 0.4, 0.9, -0.2)).normalize()
    tube(g, plastic('#f2a35a', { roughness: 0.6 }), [horn.p.clone().addScaledVector(horn.n, -0.05), horn.p.clone().addScaledVector(up, 0.14), horn.p.clone().addScaledVector(up, 0.26).add(new Vector3(s * 0.04, 0.02, 0))], 0.075, 0.01)
  }
  const snout = at(0, -0.15)
  ball(g, stone, snout.p, [0.14, 0.1, 0.1]).lookAt(snout.p.clone().add(snout.n))
  for (const s of [-1, 1]) ball(g, plastic('#4a4f57'), snout.p.clone().addScaledVector(snout.n, 0.08).add(new Vector3(s * 0.045, 0, 0)), 0.02, null, SPHERE_LO)
  const moss = at(0.3, -0.72)
  for (const [dx, dy, r] of [[0, 0, 0.09], [0.08, -0.03, 0.07], [-0.07, -0.02, 0.06]]) ball(g, plastic('#4fbf3a'), moss.p.clone().add(new Vector3(dx, dy, 0)), r, null, SPHERE_LO)
  // Shift so the egg's base sits at y = 0.
  for (const c of g.children) c.position.y += half
  bake(g)
  // Cyan glints and dust round the shell, like its specks breaking loose.
  g.add(
    particles({ mode: 'twinkle', count: 9, shape: 'spark', color: '#a8f4ff', size: 0.3, radius: R * 1.3, height: half * 2.3, speed: 0.3, seed: 13 }),
    particles({ mode: 'rise', count: 12, shape: 'dot', color: '#7fe8ff', color2: '#2f9dff', size: 0.07, radius: R * 1.1, height: half * 2.6, speed: 0.18, seed: 14 }),
  )
  return g
}

// Magenta stand under the stone egg: white glow at the foot, pink and yellow neon rings.
export function eggStand(r = 1.25) {
  const g = new Group()
  ball(g, neon('#ffffff', 0.6), [0, 0.03, 0], [r * 1.12, 0.06, r * 1.12], null, new CylinderGeometry(1, 1, 1, 48))
  ball(g, neon('#b0189a', 0.3), [0, 0.3, 0], [r, 0.5, r], null, new CylinderGeometry(0.98, 1.03, 1, 48))
  ball(g, neon('#4b1060', 0.2), [0, 0.56, 0], [r * 0.97, 0.02, r * 0.97], null, new CylinderGeometry(1, 1, 1, 48))
  const ring = (y, rr, color, k) => ball(g, neon(color, k), [0, y, 0], [rr, rr, 1.4], [Math.PI / 2, 0, 0], RING)
  ring(0.08, r * 1.08, '#ffffff', 1)
  ring(0.24, r * 1.04, '#ff7ae8', 1)
  ring(0.56, r * 0.99, '#ffe23a', 1)
  ring(0.72, r * 0.99, '#ffe23a', 1.2) // the floating halo ring above the rim
  return bake(g)
}

// --- Coin eggs on the band ----------------------------------------------------------------

// Stacked colour layers following the egg outline, each a little skewed.
export function rainbowEgg(R = 0.82, half = 1.05) {
  const g = new Group()
  const colours = ['#c23dff', '#3d4dff', '#2f8bff', '#2fd3ff', '#3ce04a', '#ffe11a', '#ff9a1a', '#ff2d2d']
  const n = colours.length
  const rand = mulberry32(5)
  const cyl = new CylinderGeometry(1, 1, 1, 24)
  colours.forEach((c, i) => {
    const y0 = -1 + (2 * i) / n
    const y1 = -1 + (2 * (i + 1)) / n
    const r = R * eggRadius((y0 + y1) / 2) * 1.04
    ball(g, neon(c, 0.18), [(rand() - 0.5) * 0.06, half * (y0 + y1) / 2 + half, (rand() - 0.5) * 0.06], [r, (half * 2) / n + 0.01, r], [0, rand() * 2, (rand() - 0.5) * 0.08], cyl)
  })
  ball(g, neon('#ff2d2d', 0.18), [0, half * 2 - 0.02, 0], [R * 0.32, 0.06, R * 0.32], null, cyl)
  bake(g)
  // White star glints popping round it (one by its foot in the reference).
  g.add(particles({ mode: 'twinkle', count: 6, shape: 'spark', color: '#ffffff', color2: '#ffe0f4', size: 0.42, radius: R * 1.3, height: half * 2.2, speed: 0.3, seed: 12 }))
  return g
}

// Chocolate cup under stacked cream tiers, wrapped in a gold aura.
export function creamEgg(R = 0.88, half = 1.0) {
  const g = new Group()
  const cyl = new CylinderGeometry(1, 1, 1, 28)
  const cup = eggGeometry(R * 1.04, half, 0, 28, 12, 0.05)
  ball(g, plastic('#5a3a22', { roughness: 0.6 }), [0, half, 0], 1, null, cup)
  const cream = plastic('#f6e3ab', { roughness: 0.65 })
  const creamLight = plastic('#fff1c8', { roughness: 0.65 })
  const tiers = 4
  for (let i = 0; i < tiers; i++) {
    const y0 = -0.05 + i / tiers
    const y1 = -0.05 + (i + 1) / tiers
    const r = R * eggRadius(Math.min(0.97, (y0 + y1) / 2 + 0.05)) * 1.08
    ball(g, i % 2 ? creamLight : cream, [0, half + half * (y0 + y1) / 2, 0], [r, (half / tiers) * 0.95, r], [0, i * 0.4, 0], cyl)
    ball(g, i % 2 ? creamLight : cream, [0, half + half * y1 - 0.02, 0], [r * 0.92, 0.05, r * 0.92], [Math.PI / 2, 0, 0], RING)
  }
  ball(g, creamLight, [0, half * 2 - 0.02, 0], [R * 0.3, 0.08, R * 0.3], null, SPHERE_LO)
  bake(g)
  // Gold rim light round the silhouette and gold motes rising off it.
  const rim = rimGlow(SPHERE, '#ffc21a', { power: 4.5, strength: 1.3 })
  rim.scale.set(R * 1.12, half * 1.06, R * 1.12)
  rim.position.y = half
  g.add(rim, particles({ mode: 'rise', count: 12, shape: 'spark', color: '#fff2a0', color2: '#ffb81a', size: 0.16, radius: R, height: half * 2.4, speed: 0.22, spin: 3, seed: 11 }))
  return g
}

// --- Pixel egg -------------------------------------------------------------------------

// Voxel egg (reference shot): the egg outline filled with cyan cubes in a few shades, brighter
// toward the top, a few cubes poking out or sinking in. Cubes flake off its surface and drift up
// and away, tumbling and shrinking, through a cyan pixel cloud with white glints.
const CUBE = new BoxGeometry(1, 1, 1)
const ICE = ['#16b4ff', '#22c6ff', '#0b9cf2', '#46dcff', '#8ef0ff']

export function pixelEgg(R = 0.8, half = 1.05, v = 0.17) {
  const group = new Group()
  const rand = mulberry32(31)
  const rows = Math.round((half * 2) / v)
  const span = Math.ceil(R / v) + 1
  // A cube is in the egg when its centre is inside the outline at its height.
  const inside = (i, j, k) => {
    if (j < 0 || j >= rows) return false
    const yn = ((j + 0.5) * v) / half - 1
    return Math.hypot((i + 0.5) * v, (k + 0.5) * v) <= R * eggRadius(yn) + v * 0.15
  }
  const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  const cells = []
  for (let j = 0; j < rows; j++)
    for (let i = -span; i < span; i++)
      for (let k = -span; k < span; k++) {
        if (!inside(i, j, k)) continue
        const open = N.filter(([a, b, c]) => !inside(i + a, j + b, k + c))
        if (open.length) cells.push({ i, j, k, open })
      }
  const m = new Matrix4()
  const q = new Quaternion()
  const pos = new Vector3()
  const scl = new Vector3()
  const col = new Color()
  const ice = new MeshStandardMaterial({ color: '#ffffff', emissive: '#0a86d8', emissiveIntensity: 0.55, roughness: 0.3, metalness: 0 })
  const body = new InstancedMesh(CUBE, ice, cells.length)
  cells.forEach(({ i, j, k, open }, n) => {
    pos.set((i + 0.5) * v, (j + 0.5) * v, (k + 0.5) * v)
    const r = rand()
    if (r < 0.14 || r > 0.95) {
      const [a, b, c] = open[Math.floor(rand() * open.length)]
      const d = (r < 0.14 ? 0.3 : -0.25) * v
      pos.x += a * d
      pos.y += b * d
      pos.z += c * d
    }
    m.compose(pos, q.identity(), scl.setScalar(v))
    body.setMatrixAt(n, m)
    const t = rand() + (j / rows) * 0.6
    body.setColorAt(n, col.set(ICE[rand() < 0.08 ? 4 : t > 1.25 ? 3 : t > 0.8 ? 1 : t > 0.35 ? 0 : 2]))
  })
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // Flaking cubes: each leaves a random spot on the shell, drifts out and up, tumbles and shrinks.
  const FLAKES = 16
  const flakes = new InstancedMesh(CUBE, neon('#3fd8ff', 0.8), FLAKES)
  flakes.frustumCulled = false
  flakes.userData.fx = true // drifts far off the shell: pictures frame the egg without it (petPortraits.js)
  const seeds = Array.from({ length: FLAKES }, () => {
    const yn = rand() * 1.6 - 0.8
    return { a: rand() * Math.PI * 2, y: half * (1 + yn), r: R * eggRadius(yn), s: rand(), rate: 0.25 + rand() * 0.25, size: 0.5 + rand() * 0.5 }
  })
  const update = (t) => {
    seeds.forEach((f, n) => {
      const life = (t * f.rate + f.s) % 1
      const out = f.r + 0.1 + life * 0.9
      pos.set(Math.cos(f.a) * out, f.y + life * 0.9, Math.sin(f.a) * out)
      q.setFromAxisAngle(scl.set(1, 1, 0).normalize(), life * 5 + f.s * 6)
      m.compose(pos, q, scl.setScalar(v * f.size * (1 - life) ** 0.6))
      flakes.setMatrixAt(n, m)
    })
    flakes.instanceMatrix.needsUpdate = true
  }
  update(0)
  const cloud = particles({ mode: 'orbit', count: 26, shape: 'pixel', color: '#3fd8ff', color2: '#9ff0ff', size: 0.36, radius: R * 1.3, height: half * 2, speed: 0.12, opacity: 0.7, additive: false, seed: 21 })
  cloud.position.y = half
  group.add(
    flakes,
    cloud,
    particles({ mode: 'twinkle', count: 7, shape: 'spark', color: '#ffffff', color2: '#c8f6ff', size: 0.4, radius: R * 1.4, height: half * 2.2, speed: 0.35, seed: 23 }),
  )
  return { group, update }
}

// --- Spotted egg ------------------------------------------------------------------------

// Plain egg (base at 0, top at 1.3) in a shell colour with spots of a second, for the eggs that
// have no showcase model (petIndex.js EGGS `colors`): the area eggs on the deck and their pictures.
const SPOTTED_GEO = new LatheGeometry(
  Array.from({ length: 17 }, (_, i) => {
    const t = i / 16
    const a = Math.PI * t
    return new Vector2(Math.sin(a) * (t < 0.5 ? 0.62 : 0.62 - (t - 0.5) * 0.26), (1 - Math.cos(a)) * 0.65)
  }),
  24,
)
const SPOT = new SphereGeometry(1, 10, 8)

export function spottedEgg([shell, spot]) {
  const g = new Group()
  const body = new Mesh(SPOTTED_GEO, plastic(shell))
  body.castShadow = true
  g.add(body)
  const m = plastic(spot)
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4
    const y = 0.25 + ((i * 0.37) % 1) * 0.85
    const r = Math.sin(Math.PI * (y / 1.3)) * 0.6
    const s = new Mesh(SPOT, m)
    s.position.set(Math.sin(a) * r, y, Math.cos(a) * r)
    s.scale.set(0.12, 0.12, 0.04)
    s.lookAt(0, y, 0)
    g.add(s)
  }
  return g
}

export { glow }
