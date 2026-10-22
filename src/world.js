import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { COLORS, FOG, LIGHT, MATERIAL_PBR, WATER_COLOR, WORLD_BOUNDS } from './config.js'
import { sandMacro, sandTile, toTexture } from './textures.js'

// Everything is procedural: the floor is canvas-painted (textures.js), the sky is a
// gradient shader, the lights are plain three lights. No imported assets. The hub's
// scenery props are solid boxes in colliders.js.

// The beach: sand tile (shading map x sand colour + bump) under a big non-repeating macro
// overlay that breaks up the tiling. The sea (createSea) laps its north edge.
export function createGround() {
  const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS
  const w = maxX - minX
  const d = maxZ - minZ
  const { color, height } = sandTile()
  const repeat = [w / 8, d / 8]
  const group = new Group()
  const sand = new Mesh(
    new PlaneGeometry(w, d),
    new MeshStandardMaterial({
      color: COLORS.sand,
      map: toTexture(color, { repeat }),
      bumpMap: toTexture(height, { srgb: false, repeat }),
      bumpScale: 1.2,
      ...MATERIAL_PBR.GROUND,
    }),
  )
  const macro = new Mesh(
    new PlaneGeometry(w, d),
    new MeshBasicMaterial({ map: toTexture(sandMacro()), transparent: true, depthWrite: false }),
  )
  macro.position.y = 0.01
  for (const m of [sand, macro]) {
    m.rotation.x = -Math.PI / 2
    m.position.x = (minX + maxX) / 2
    m.position.z = (minZ + maxZ) / 2
  }
  sand.receiveShadow = true
  group.add(sand, macro)
  return group
}

// Open water past the north edge of the beach (not walkable: WORLD_BOUNDS stops the player).
export function createSea() {
  const sea = new Mesh(
    new PlaneGeometry(2400, 1200),
    new MeshStandardMaterial({ color: WATER_COLOR, transparent: true, opacity: 0.9, ...MATERIAL_PBR.WATER }),
  )
  sea.rotation.x = -Math.PI / 2
  sea.position.set(0, -0.15, WORLD_BOUNDS.minZ - 600 + 1)
  sea.receiveShadow = true
  return sea
}

// Gradient dome with a soft sun glow toward the light direction. Recentre it on the camera
// each frame (`sky.position.copy(player)`) so the horizon never gets closer.
export function createSky() {
  const sunDir = new Vector3(...LIGHT.sunPosition).normalize()
  const mesh = new Mesh(
    new SphereGeometry(900, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new Color(COLORS.zenith) },
        bottom: { value: new Color(COLORS.horizon) },
        sunDir: { value: sunDir },
        sunColor: { value: new Color(LIGHT.sunColor) },
      },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
        void main() {
          vec3 col = mix(bottom, top, smoothstep(-0.02, 0.45, vDir.y));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += sunColor * (pow(s, 8.0) * 0.25 + pow(s, 600.0) * 1.2); // halo + disc
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  )
  mesh.renderOrder = -1
  mesh.frustumCulled = false
  return mesh
}

// Warm sky/ground hemisphere fill + one shadow-casting sun. The sun's shadow box follows the
// player so a small map covers the whole play area at full resolution; the follow point is
// snapped to shadow-texel steps so shadows do not shimmer while the player walks. Phones pass a
// smaller `mapSize` (main.js).
export function createLights(mapSize = LIGHT.shadowMapSize) {
  const hemi = new HemisphereLight(LIGHT.hemiSky, LIGHT.hemiGround, LIGHT.hemiIntensity)
  const sun = new DirectionalLight(LIGHT.sunColor, LIGHT.sunIntensity)
  const offset = { x: LIGHT.sunPosition[0], y: LIGHT.sunPosition[1], z: LIGHT.sunPosition[2] }
  sun.castShadow = true
  sun.shadow.mapSize.set(mapSize, mapSize)
  const r = LIGHT.shadowRange
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 150 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03

  // The sun (and its shadow camera) rides along with the player, height included: left at a fixed
  // height, high up the slide it ended up below the player inside the tall terraces, and from in
  // there everything read as shadowed (the whole view went dark). Snapped to shadow texels.
  const texel = (r * 2) / mapSize
  const follow = (px, pz, py = 0) => {
    const x = Math.round(px / texel) * texel
    const y = Math.round(py / texel) * texel
    const z = Math.round(pz / texel) * texel
    sun.position.set(x + offset.x, y + offset.y, z + offset.z)
    sun.target.position.set(x, y, z)
    sun.target.updateMatrixWorld()
  }
  follow(0, 0)
  return { hemi, sun, follow }
}

export const createFog = () => new Fog(COLORS.horizon, FOG.near, FOG.far)
