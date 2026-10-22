// Set dressing that fills the open lake and shores so no stretch of the hub looks empty: lily
// pads, reeds, rocks, buoy lines, moored kayaks, drifting swim rings and rubber ducks on the
// water; palms, bushes, flowers, grass, rocks and beach umbrellas on the shores; hot-air balloons
// and gulls in the sky. Nothing here stands on the hub island itself.
//
// Kept cheap: every repeated item is one InstancedMesh (multi-part items are merged into a single
// vertex-coloured geometry first), small pieces cast no shadows, placement is seeded so it never
// changes between loads, and only a few dozen instances are re-posed per frame.
import {
  BoxGeometry,
  BufferAttribute,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MATERIAL_PBR, WORLD_BOUNDS } from '../config.js'
import { addBox } from '../colliders.js'
import { mulberry32, stripes, toTexture } from '../textures.js'
import {
  BILLBOARD,
  HUB_SCALE,
  ISLAND,
  islandEdgeAt,
  KAYAK_STATUE,
  LAKE,
  LANDS,
  LONG_BRIDGE,
  PINES,
  POOL,
  PORTAL_ISLE,
  SLIDE,
  SW_TREE,
  TREE_ISLET,
  W_TREE,
  E_TREE,
} from './layout.js'

const BEACH = 2.2 // terrain.js sand apron around every land block
const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _c = new Color()

// ---------------------------------------------------------------------------------------------
// Geometry helpers

// Merge parts into one vertex-coloured geometry. Part: { geo, color, at, rot, scale }.
function kit(parts) {
  return mergeGeometries(
    parts.map(({ geo, color, at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] }) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone()
      _e.set(rot[0], rot[1], rot[2])
      g.applyMatrix4(_m.compose(_p.set(at[0], at[1], at[2]), _q.setFromEuler(_e), _s.set(scale[0], scale[1], scale[2])))
      _c.set(color)
      const n = g.attributes.position.count
      const col = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3)
      g.setAttribute('color', new BufferAttribute(col, 3))
      return g
    }),
  )
}

const kitMaterial = (extra = {}) => new MeshStandardMaterial({ vertexColors: true, ...MATERIAL_PBR.PLASTIC, ...extra })

function pose(it) {
  _e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0)
  const s = it.s ?? 1
  return _m.compose(_p.set(it.x, it.y, it.z), _q.setFromEuler(_e), Array.isArray(s) ? _s.set(s[0], s[1], s[2]) : _s.setScalar(s))
}

// One InstancedMesh for a list of placements { x, y, z, rx, ry, rz, s, color }.
function instanced(geo, material, items, { cast = false } = {}) {
  const mesh = new InstancedMesh(geo, material, Math.max(1, items.length))
  mesh.count = items.length
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, pose(it))
    if (it.color) mesh.setColorAt(i, _c.set(it.color))
  })
  mesh.castShadow = cast
  mesh.receiveShadow = true
  mesh.computeBoundingSphere()
  return mesh
}

// ---------------------------------------------------------------------------------------------
// Where things may go

const deg = (r) => (r * 180) / Math.PI
const B = WORLD_BOUNDS

function onIsland(x, z, margin) {
  const dx = x - ISLAND.x
  const dz = z - ISLAND.z
  const a = deg(Math.atan2(dz, dx))
  return Math.hypot(dx, dz) < islandEdgeAt(a) + margin
}

const landBoxes = LANDS.map((l) => ({ ...l, top: l.kind === 'cliff' ? l.h + 0.1 : l.h }))
const inBox = (b, x, z, grow) => x > b.x0 - grow && x < b.x1 + grow && z > b.z0 - grow && z < b.z1 + grow

// Distance from (x, z) to the nearest shore (land block edge or island rim), for reeds and pads.
function shoreDistance(x, z) {
  let d = Math.hypot(x - ISLAND.x, z - ISLAND.z) - islandEdgeAt(deg(Math.atan2(z - ISLAND.z, x - ISLAND.x)))
  for (const b of landBoxes) {
    const dx = Math.max(b.x0 - BEACH - x, 0, x - b.x1 - BEACH)
    const dz = Math.max(b.z0 - BEACH - z, 0, z - b.z1 - BEACH)
    d = Math.min(d, Math.hypot(dx, dz))
  }
  return d
}

// Open water at (x, z), keeping `margin` metres from everything solid.
function isWater(x, z, margin = 1) {
  if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) return false
  if (onIsland(x, z, ISLAND.skirt + margin)) return false
  if (Math.abs(x) < SLIDE.skirtHalf + margin && z < POOL.z + POOL.rz + margin) return false
  if (Math.hypot(x - PORTAL_ISLE.x, z - PORTAL_ISLE.z) < PORTAL_ISLE.r + PORTAL_ISLE.slope + margin) return false
  if (Math.hypot(x - TREE_ISLET.x, z - TREE_ISLET.z) < TREE_ISLET.r + 2 + margin) return false
  if (Math.abs(x - LONG_BRIDGE.ax) < LONG_BRIDGE.width / 2 + 1 + margin && z > LONG_BRIDGE.az - 1 && z < LONG_BRIDGE.bz + 1) return false
  if (landBoxes.some((b) => inBox(b, x, z, BEACH + margin))) return false
  return true
}

// Big things already standing on the shores (keep decor clear of them).
const landBlockers = [
  ...[SW_TREE, W_TREE, E_TREE].map((t) => ({ x: t.x, z: t.z, r: 5 })),
  ...PINES.map((p) => ({ x: p.x, z: p.z, r: p.radius + 1 })),
  { x: BILLBOARD.x, z: BILLBOARD.z, r: BILLBOARD.w / 2 + 2 },
  { x: KAYAK_STATUE.x, z: KAYAK_STATUE.z, r: 8 },
]

// A spot on top of a land block of the given kinds, `inset` metres in from its edges.
function landSpot(x, z, kinds, inset = 1.5) {
  const b = landBoxes.find((l) => kinds.includes(l.kind) && inBox(l, x, z, -inset))
  if (!b) return null
  if (landBlockers.some((o) => Math.hypot(x - o.x, z - o.z) < o.r)) return null
  return b.top
}

// Seeded scatter with a minimum spacing. `test(x, z)` returns a y (or null to reject).
function scatter(rand, count, test, spacing, region = B, tries = 60) {
  const out = []
  for (let i = 0; i < count * tries && out.length < count; i++) {
    const x = region.minX + rand() * (region.maxX - region.minX)
    const z = region.minZ + rand() * (region.maxZ - region.minZ)
    const y = test(x, z)
    if (y == null) continue
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < spacing * spacing)) continue
    out.push({ x, y, z })
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Water

function buildWater(group, rand, animated) {
  const nearShore = (lo, hi) => (x, z) => {
    if (!isWater(x, z, 0.5)) return null
    const d = shoreDistance(x, z)
    return d > lo && d < hi ? LAKE.y : null
  }

  // Lily pads (notched discs) in clusters near the shores, some with pink flowers.
  const padGeo = new CircleGeometry(0.75, 14, 0.4, Math.PI * 2 - 0.6)
  padGeo.rotateX(-Math.PI / 2)
  const seeds = scatter(rand, 44, nearShore(1, 11), 8)
  const pads = []
  const blooms = []
  for (const sd of seeds) {
    const n = 4 + Math.floor(rand() * 5)
    for (let i = 0; i < n; i++) {
      const x = sd.x + (rand() - 0.5) * 5
      const z = sd.z + (rand() - 0.5) * 5
      if (!isWater(x, z, 0.3)) continue
      const s = 0.7 + rand() * 0.8
      pads.push({ x, y: LAKE.y + 0.03, z, ry: rand() * Math.PI * 2, s, color: rand() < 0.5 ? '#3fae3a' : '#58c447' })
      if (rand() < 0.3) blooms.push({ x, y: LAKE.y + 0.18, z, s: 0.8 + rand() * 0.4, color: rand() < 0.7 ? '#ff8ec7' : '#ffffff' })
    }
  }
  group.add(instanced(padGeo, new MeshStandardMaterial({ ...MATERIAL_PBR.PLASTIC }), pads))
  const bloomGeo = kit([
    { geo: new ConeGeometry(0.22, 0.3, 6), color: '#ffffff', at: [0, 0.1, 0] },
    { geo: new SphereGeometry(0.08, 6, 4), color: '#ffd21a', at: [0, 0.22, 0] },
  ])
  group.add(instanced(bloomGeo, kitMaterial(), blooms))

  // Reed clumps (cattails) hugging the shores.
  const reedGeo = kit(
    [0, 1, 2, 3, 4].flatMap((i) => {
      const a = (i / 5) * Math.PI * 2
      const r = 0.25 + (i % 2) * 0.2
      const h = 1.6 + (i % 3) * 0.4
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      return [
        { geo: new CylinderGeometry(0.03, 0.04, h, 4), color: '#4f8a2a', at: [x, h / 2, z], rot: [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12] },
        { geo: new CylinderGeometry(0.07, 0.07, 0.35, 5), color: '#6b4226', at: [x, h - 0.15, z] },
      ]
    }),
  )
  const reeds = scatter(rand, 90, nearShore(0, 3.5), 2.2).map((p) => ({ ...p, y: LAKE.bed + 0.6, ry: rand() * 6.28, s: 0.8 + rand() * 0.5 }))
  group.add(instanced(reedGeo, kitMaterial(), reeds))

  // Rocks breaking the surface; the big ones are solid.
  const rockGeo = new IcosahedronGeometry(1, 0)
  const rockMat = new MeshStandardMaterial({ ...MATERIAL_PBR.ROCK, flatShading: true })
  const waterRocks = scatter(rand, 30, (x, z) => (isWater(x, z, 2) ? LAKE.y : null), 10).map((p) => {
    const r = 0.6 + rand() * 1.6
    if (r > 1.2) addBox(p.x - r * 0.8, p.x + r * 0.8, LAKE.bed, LAKE.y + r * 0.5, p.z - r * 0.8, p.z + r * 0.8)
    return { ...p, y: LAKE.y - r * 0.2, ry: rand() * 6.28, rx: rand(), s: [r, r * 0.7, r * 1.1], color: rand() < 0.65 ? '#8f969c' : '#d99a96' }
  })
  group.add(instanced(rockGeo, rockMat, waterRocks, { cast: true }))

  // Buoy lines marking safe swimming lanes off the slide's flanks.
  const buoys = []
  for (const side of [-1, 1]) {
    const x0 = side * (SLIDE.skirtHalf + 6)
    for (let i = 0; i < 26; i++) {
      const z = POOL.z - 6 - i * 3
      if (!isWater(x0, z, 0)) continue
      buoys.push({ x: x0, y: LAKE.y + 0.12, z, s: 0.45, color: i % 2 ? '#ffffff' : '#ff3b3b' })
    }
  }
  const buoyMesh = instanced(new SphereGeometry(1, 10, 8), new MeshStandardMaterial({ ...MATERIAL_PBR.PLASTIC }), buoys)
  group.add(buoyMesh)

  // Kayaks moored along the shores, nose-in, in the game's bright colours.
  const kayakGeo = kit([
    { geo: new SphereGeometry(1, 16, 8), color: '#ffffff', scale: [2.1, 0.32, 0.45] },
    { geo: new CylinderGeometry(0.3, 0.3, 0.1, 12), color: '#1a1a1a', at: [0, 0.27, 0], scale: [1.2, 1, 0.8] },
    { geo: new CylinderGeometry(0.04, 0.04, 2.6, 6), color: '#f4f4f4', at: [0.2, 0.36, 0], rot: [Math.PI / 2, 0.3, 0] },
  ])
  const kayakColors = ['#ff6a1a', '#ffd21a', '#3fd2ff', '#ff3b5c', '#5fe03a', '#b64bff']
  const moored = scatter(rand, 14, nearShore(1.5, 4), 9).map((p, i) => {
    // Point the bow at the nearest shore by probing eight directions.
    let best = 0
    let bestD = Infinity
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const d = shoreDistance(p.x + Math.cos(a) * 2, p.z + Math.sin(a) * 2)
      if (d < bestD) {
        bestD = d
        best = a
      }
    }
    return { ...p, y: LAKE.y + 0.12, ry: -best, s: 1.3, color: kayakColors[i % kayakColors.length] }
  })
  group.add(instanced(kayakGeo, kitMaterial({ roughness: 0.45 }), moored, { cast: true }))

  // Drifting swim rings and rubber ducks (re-posed every frame: a couple of dozen matrices).
  const ringSpots = scatter(rand, 12, (x, z) => (isWater(x, z, 3) ? LAKE.y : null), 14)
  const ringColors = ['#ff5fa0', '#ffd21a', '#3fd2ff', '#ff8a1a', '#7a5cff']
  const rings = ringSpots.map((p, i) => ({ ...p, color: ringColors[i % ringColors.length], phase: rand() * 6.28, drift: 1 + rand() * 2 }))
  const ringMesh = instanced(new TorusGeometry(0.75, 0.28, 10, 20), new MeshStandardMaterial({ ...MATERIAL_PBR.PLASTIC, roughness: 0.4 }), rings.map((r) => ({ ...r, rx: Math.PI / 2 })))
  group.add(ringMesh)
  const duckGeo = kit([
    { geo: new SphereGeometry(0.45, 12, 8), color: '#ffd21a', scale: [1.25, 0.8, 1] },
    { geo: new SphereGeometry(0.28, 12, 8), color: '#ffd21a', at: [0.38, 0.42, 0] },
    { geo: new ConeGeometry(0.1, 0.25, 6), color: '#ff8a1a', at: [0.68, 0.38, 0], rot: [0, 0, -Math.PI / 2] },
    { geo: new SphereGeometry(0.05, 6, 4), color: '#1a1a1a', at: [0.55, 0.52, 0.16] },
    { geo: new SphereGeometry(0.05, 6, 4), color: '#1a1a1a', at: [0.55, 0.52, -0.16] },
  ])
  const duckSpots = scatter(rand, 8, (x, z) => (isWater(x, z, 3) ? LAKE.y : null), 12)
  const ducks = duckSpots.map((p) => ({ ...p, phase: rand() * 6.28, radius: 2 + rand() * 3, speed: 0.15 + rand() * 0.15, s: 1.4 }))
  const duckMesh = instanced(duckGeo, kitMaterial({ roughness: 0.35 }), ducks)
  group.add(duckMesh)

  animated.push((t) => {
    rings.forEach((r, i) => {
      ringMesh.setMatrixAt(i, pose({ x: r.x + Math.sin(t * 0.1 + r.phase) * r.drift, y: LAKE.y + 0.08 + Math.sin(t * 1.3 + r.phase) * 0.06, z: r.z + Math.cos(t * 0.08 + r.phase) * r.drift, rx: Math.PI / 2 + Math.sin(t + r.phase) * 0.05 }))
    })
    ringMesh.instanceMatrix.needsUpdate = true
    ducks.forEach((d, i) => {
      const a = t * d.speed + d.phase
      duckMesh.setMatrixAt(i, pose({ x: d.x + Math.cos(a) * d.radius, y: LAKE.y + 0.12 + Math.sin(t * 2 + d.phase) * 0.04, z: d.z + Math.sin(a) * d.radius, ry: -a - Math.PI / 2, s: d.s }))
    })
    duckMesh.instanceMatrix.needsUpdate = true
  })
}

// ---------------------------------------------------------------------------------------------
// Shores

function buildShores(group, rand) {
  const meadow = ['meadow']
  const anyLand = ['meadow', 'cliff']

  // Palms along the meadows (merged trunk + fronds + coconuts).
  const trunkParts = []
  for (let i = 0; i < 6; i++) {
    trunkParts.push({ geo: new CylinderGeometry(0.28 - i * 0.025, 0.32 - i * 0.025, 1.25, 7), color: i % 2 ? '#9a6a3a' : '#7f5530', at: [i * i * 0.04, 0.6 + i * 1.15, 0], rot: [0, 0, -0.06 * i] })
  }
  const crownX = 25 * 0.04
  const frondParts = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    frondParts.push({ geo: new BoxGeometry(2.6, 0.06, 0.55), color: i % 2 ? '#3fae3a' : '#2f9a3a', at: [crownX + Math.cos(a) * 1.2, 7.1, Math.sin(a) * 1.2], rot: [0, -a, -0.45] })
  }
  for (let i = 0; i < 3; i++) frondParts.push({ geo: new SphereGeometry(0.2, 8, 6), color: '#5a3a1a', at: [crownX + Math.cos(i * 2.1) * 0.3, 6.8, Math.sin(i * 2.1) * 0.3] })
  const palmGeo = kit([...trunkParts, ...frondParts])
  const palms = scatter(rand, 26, (x, z) => landSpot(x, z, meadow, 3), 9).map((p) => ({ ...p, ry: rand() * 6.28, s: (0.9 + rand() * 0.5) * (1 + (HUB_SCALE - 1) / 2) }))
  group.add(instanced(palmGeo, kitMaterial(), palms, { cast: true }))

  // Bushes (three-blob clumps) on meadows and cliff tops.
  const bushGeo = kit([
    { geo: new IcosahedronGeometry(1, 0), color: '#3fae3a', at: [0, 0.7, 0] },
    { geo: new IcosahedronGeometry(0.8, 0), color: '#58c447', at: [0.9, 0.55, 0.3] },
    { geo: new IcosahedronGeometry(0.7, 0), color: '#2f9a3a', at: [-0.8, 0.5, -0.2] },
  ])
  const bushes = scatter(rand, 170, (x, z) => landSpot(x, z, anyLand), 4.5).map((p) => ({ ...p, ry: rand() * 6.28, s: 0.8 + rand() * 0.9 }))
  group.add(instanced(bushGeo, kitMaterial({ flatShading: true }), bushes))

  // Flower clumps in bright mixed colours.
  const flowerGeo = kit([
    { geo: new CylinderGeometry(0.03, 0.03, 0.4, 4), color: '#4f8a2a', at: [0, 0.2, 0] },
    { geo: new SphereGeometry(0.16, 6, 4), color: '#ffffff', at: [0, 0.45, 0] },
    { geo: new CylinderGeometry(0.03, 0.03, 0.3, 4), color: '#4f8a2a', at: [0.25, 0.15, 0.1] },
    { geo: new SphereGeometry(0.13, 6, 4), color: '#ffffff', at: [0.25, 0.33, 0.1] },
    { geo: new CylinderGeometry(0.03, 0.03, 0.35, 4), color: '#4f8a2a', at: [-0.2, 0.17, -0.15] },
    { geo: new SphereGeometry(0.14, 6, 4), color: '#ffffff', at: [-0.2, 0.38, -0.15] },
  ])
  const petals = ['#ff5fa0', '#ffd21a', '#ff8a1a', '#b64bff', '#ffffff', '#3fd2ff']
  const flowers = scatter(rand, 320, (x, z) => landSpot(x, z, anyLand, 1), 2.2).map((p) => ({ ...p, ry: rand() * 6.28, s: 1 + rand() * 0.6, color: petals[Math.floor(rand() * petals.length)] }))
  group.add(instanced(flowerGeo, kitMaterial(), flowers))

  // Grass tufts.
  const tuftGeo = kit([0, 1, 2].map((i) => ({ geo: new ConeGeometry(0.09, 0.6, 3), color: i === 1 ? '#5fd03a' : '#46b52f', at: [(i - 1) * 0.12, 0.3, (i % 2) * 0.08], rot: [0, 0, (i - 1) * 0.3] })))
  const tufts = scatter(rand, 380, (x, z) => landSpot(x, z, meadow, 0.8), 1.8).map((p) => ({ ...p, ry: rand() * 6.28, s: 0.9 + rand() * 0.8 }))
  group.add(instanced(tuftGeo, kitMaterial(), tufts))

  // Boulders on the shores.
  const shoreRocks = scatter(rand, 50, (x, z) => landSpot(x, z, anyLand, 1), 7).map((p) => {
    const r = 0.5 + rand() * 1.1
    return { ...p, y: p.y + r * 0.25, ry: rand() * 6.28, rx: rand(), s: [r, r * 0.7, r], color: rand() < 0.6 ? '#9aa0a6' : '#e2a39f' }
  })
  group.add(instanced(new IcosahedronGeometry(1, 0), new MeshStandardMaterial({ ...MATERIAL_PBR.ROCK, flatShading: true }), shoreRocks, { cast: true }))

  // Beach umbrellas with towels and loungers on the low meadows nearest the island.
  const setGeo = kit([
    { geo: new CylinderGeometry(0.06, 0.06, 3, 6), color: '#f4f4f4', at: [0, 1.5, 0] },
    { geo: new BoxGeometry(2, 0.04, 0.9), color: '#3fd2ff', at: [1.6, 0.03, 0.4] },
    { geo: new BoxGeometry(0.8, 0.12, 2), color: '#ffffff', at: [-1.6, 0.35, 0.2] },
    { geo: new BoxGeometry(0.8, 0.12, 0.8), color: '#ffffff', at: [-1.6, 0.7, -0.9], rot: [0.6, 0, 0] },
  ])
  const canopyGeo = new ConeGeometry(1.8, 0.8, 10)
  const sets = scatter(rand, 12, (x, z) => (landSpot(x, z, meadow, 4) != null && shoreDistance(x, z) < 18 ? landSpot(x, z, meadow, 4) : null), 12).map((p) => ({ ...p, ry: rand() * 6.28 }))
  group.add(instanced(setGeo, kitMaterial(), sets))
  const canopyColors = ['#ff3b5c', '#ffd21a', '#3fd2ff', '#ff8a1a', '#5fe03a']
  group.add(instanced(canopyGeo, new MeshStandardMaterial({ ...MATERIAL_PBR.PLASTIC }), sets.map((p, i) => ({ ...p, y: p.y + 3.2, color: canopyColors[i % canopyColors.length] })), { cast: true }))
}

// ---------------------------------------------------------------------------------------------
// Sky: two hot-air balloons drifting on wide loops, gulls circling the lake.

function buildSky(group, rand, animated) {
  const balloons = []
  const palettes = [['#ff3b5c', '#ffd21a'], ['#3fd2ff', '#ffffff']]
  palettes.forEach(([a, b], i) => {
    const g = new Group()
    const tex = toTexture(stripes(a, b, 10), { repeat: [1, 1] })
    const env = new Mesh(new SphereGeometry(6, 24, 16), new MeshStandardMaterial({ map: tex, ...MATERIAL_PBR.PLASTIC }))
    env.scale.y = 1.2
    g.add(env)
    const neck = new Mesh(new ConeGeometry(3.2, 3.5, 16, 1, true), new MeshStandardMaterial({ color: a, ...MATERIAL_PBR.PLASTIC }))
    neck.position.y = -7
    neck.rotation.x = Math.PI
    g.add(neck)
    const basket = new Mesh(new BoxGeometry(1.8, 1.4, 1.8), new MeshStandardMaterial({ color: '#8a5a3a', ...MATERIAL_PBR.PLASTIC }))
    basket.position.y = -11
    g.add(basket)
    group.add(g)
    balloons.push({ g, r: (90 + i * 50) * HUB_SCALE * 0.7, y: 55 + i * 18, speed: 0.012 + i * 0.006, phase: i * 2.5 })
  })

  const gullGeo = kit([
    { geo: new BoxGeometry(0.5, 0.18, 0.18), color: '#ffffff' },
    { geo: new BoxGeometry(0.12, 0.04, 1.1), color: '#e8eef4', at: [0, 0.08, 0.55], rot: [0.35, 0, 0] },
    { geo: new BoxGeometry(0.12, 0.04, 1.1), color: '#e8eef4', at: [0, 0.08, -0.55], rot: [-0.35, 0, 0] },
    { geo: new ConeGeometry(0.06, 0.18, 4), color: '#ffb21a', at: [0.32, 0, 0], rot: [0, 0, -Math.PI / 2] },
  ])
  const gulls = Array.from({ length: 9 }, () => ({
    cx: (rand() - 0.5) * 80 * HUB_SCALE,
    cz: (rand() - 0.5) * 80 * HUB_SCALE,
    r: 8 + rand() * 14,
    y: 18 + rand() * 14,
    speed: 0.3 + rand() * 0.25,
    phase: rand() * 6.28,
  }))
  const gullMesh = instanced(gullGeo, kitMaterial(), gulls.map((g) => ({ x: g.cx, y: g.y, z: g.cz, s: 1.6 })))
  group.add(gullMesh)

  animated.push((t) => {
    for (const b of balloons) {
      const a = t * b.speed + b.phase
      b.g.position.set(Math.cos(a) * b.r, b.y + Math.sin(t * 0.3 + b.phase) * 2, Math.sin(a) * b.r)
    }
    gulls.forEach((g, i) => {
      const a = t * g.speed + g.phase
      gullMesh.setMatrixAt(i, pose({ x: g.cx + Math.cos(a) * g.r, y: g.y + Math.sin(t * 1.5 + g.phase), z: g.cz + Math.sin(a) * g.r, ry: -a - Math.PI / 2, rx: 0.3, s: [1.6, 1.6 * (0.6 + Math.abs(Math.sin(t * 6 + g.phase)) * 0.4), 1.6] }))
    })
    gullMesh.instanceMatrix.needsUpdate = true
  })
}

export function createDecor() {
  const group = new Group()
  const animated = []
  const rand = mulberry32(2024)
  buildWater(group, rand, animated)
  buildShores(group, rand)
  buildSky(group, rand, animated)
  let t = 0
  return {
    group,
    update(dt) {
      t += dt
      for (const fn of animated) fn(t)
    },
  }
}
