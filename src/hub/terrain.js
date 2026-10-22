// The hub's ground and water: the lake, the round plank island with its sand skirt, the red
// chevron lanes, cross, the portal isle and its stairs, the yellow and purple rim bands, the tree islet, the shores across the water (maroon cliffs
// with dripping grass caps and hills, green meadows, beaches), the railing, the bridge up the east hill and the long bridge east of the island.
// Every solid piece registers a collider.
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  IcosahedronGeometry,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
} from 'three'
import { HUB_COLORS, MATERIAL_PBR, WORLD_BOUNDS } from '../config.js'
import { addBox, addFloorSampler, addPusher, STEP_UP } from '../colliders.js'
import { mulberry32, studTile, toTexture } from '../textures.js'
import { CROSS, FENCES, ISLAND, islandEdgeAt, BOULDERS, ISLE_PLANTS, LAKE, LANDS, LONG_BRIDGE, PORTAL_ISLE, RIM_BANDS, SOUTH_STAIRS, TREE_ISLET } from './layout.js'
import { neon, plastic } from './materials.js'
import { createLake } from './lake.js'
import { petBandTexture } from './signs.js'

const deg = (d) => (d * Math.PI) / 180

function box(w, h, d, material, x, y, z, { cast = true } = {}) {
  const m = new Mesh(new BoxGeometry(w, h, d), material)
  m.position.set(x, y, z)
  m.castShadow = cast
  m.receiveShadow = true
  return m
}

// Solid block from x0..x1, y0..y1, z0..z1 (mesh + collider).
function solid(group, x0, x1, y0, y1, z0, z1, material) {
  group.add(box(x1 - x0, y1 - y0, z1 - z0, material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
  addBox(x0, x1, y0, y1, z0, z1)
}

function flat(w, d, material, x, y, z) {
  const m = new Mesh(new PlaneGeometry(w, d), material)
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  m.receiveShadow = true
  return m
}

// A thin wall along a segment, as a row of small boxes (colliders are axis-aligned).
export function addSegmentCollider(ax, az, bx, bz, y0, y1, half = 0.2) {
  const len = Math.hypot(bx - ax, bz - az)
  const n = Math.max(1, Math.ceil(len / (half * 1.5)))
  for (let i = 0; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n
    const z = az + ((bz - az) * i) / n
    addBox(x - half, x + half, y0, y1, z - half, z + half)
  }
}

function buildLake(group) {
  const lake = createLake()
  const bed = flat(1600, 1600, plastic(HUB_COLORS.sand, MATERIAL_PBR.GROUND), 0, LAKE.bed, 0)
  group.add(bed, lake.mesh)
  return lake
}

const angleOf = (dx, dz) => {
  const a = (Math.atan2(dz, dx) * 180) / Math.PI
  return a < 0 ? a + 360 : a
}

function buildIsland(group) {
  const { x, z, r, sides, skirt } = ISLAND
  const height = -LAKE.bed
  const planks = studTile(HUB_COLORS.deck, { cols: 1, rows: 5, lip: 2, vary: 0.07, seed: 5 })
  const top = new MeshStandardMaterial({ map: toTexture(planks.color, { repeat: [r / 1.8, r / 1.8] }), ...MATERIAL_PBR.PLASTIC })
  const side = plastic(HUB_COLORS.deckSide)
  const deck = new Mesh(new CylinderGeometry(r, r, height, sides), [side, top, side])
  deck.position.set(x, -height / 2, z)
  deck.rotation.y = Math.PI / sides // a flat facet faces south, toward the stairs
  deck.receiveShadow = true
  deck.castShadow = true
  // Sand skirt sloping from the island's foot out under the water.
  const sand = new Mesh(new CylinderGeometry(r + 0.25, r + skirt, 0.9, sides, 1, true), plastic(HUB_COLORS.sand))
  sand.position.set(x, LAKE.bed + 0.45, z)
  sand.rotation.y = deck.rotation.y
  sand.receiveShadow = true
  group.add(deck, sand)

  // Deck, rim bands and the sand slope beyond the edge; the island side is a wall from the water.
  addFloorSampler((px, pz) => {
    const d = Math.hypot(px - x, pz - z)
    if (d <= r) return 0
    const a = angleOf(px - x, pz - z)
    const edge = islandEdgeAt(a)
    if (d <= edge) return RIM_BANDS.find((band) => a >= band.a0 && a <= band.a1).h
    if (d <= edge + skirt) return LAKE.bed + 0.9 * (1 - (d - edge) / skirt)
    return -Infinity
  })
  addPusher((p, v, pr) => {
    if (p.y + STEP_UP >= 0) return
    const dx = p.x - x
    const dz = p.z - z
    const d = Math.hypot(dx, dz)
    const edge = islandEdgeAt(angleOf(dx, dz))
    if (d >= edge + pr || d === 0) return
    p.x = x + (dx / d) * (edge + pr)
    p.z = z + (dz / d) * (edge + pr)
    const vn = (v.x * dx + v.z * dz) / d
    if (vn < 0) {
      v.x -= (vn * dx) / d
      v.z -= (vn * dz) / d
    }
  })
}

// Flat painted chevron (tip toward shape +Y), `w` wide.
function chevronGeometry(w) {
  const cw = w / 2
  const chev = new Shape()
  chev.moveTo(-cw, 0)
  chev.lineTo(0, cw * 0.75)
  chev.lineTo(cw, 0)
  chev.lineTo(cw, -cw * 0.45)
  chev.lineTo(0, cw * 0.3)
  chev.lineTo(-cw, -cw * 0.45)
  chev.lineTo(-cw, 0)
  return new ShapeGeometry(chev)
}

const rect = (r, y, material) => flat(r.x1 - r.x0, r.z1 - r.z0, material, (r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2)

function buildCross(group) {
  const red = plastic(HUB_COLORS.carpet)
  group.add(rect(CROSS.block, 0.012, red), rect(CROSS.arm, 0.014, red), rect(CROSS.stem, 0.016, red))
  // One chevron lane per slide lane, from the pool rim to the junction block, chevrons pointing north.
  for (const lane of CROSS.lanes) {
    group.add(rect({ x0: lane.x - lane.width / 2, x1: lane.x + lane.width / 2, z0: CROSS.lanesZ0, z1: CROSS.lanesZ1 }, 0.012, red))
    const geo = chevronGeometry(lane.width * 0.7)
    const mat = neon(lane.chevron, 0.35)
    for (const cz of CROSS.chevronZ) {
      const m = new Mesh(geo, mat)
      m.rotation.x = -Math.PI / 2 // shape +Y (the tip) -> world -Z (north)
      m.position.set(lane.x, 0.02, cz)
      m.receiveShadow = true
      group.add(m)
    }
  }
}

// Portal isle: octagonal sand platform with a lighter rim, its sides sloping away under the water,
// little flowers and plants on top; wooden stairs with rails step down to it from the stem.
function buildPortalIsle(group) {
  const { x, z, r, top, slope } = PORTAL_ISLE
  const sand = plastic(HUB_COLORS.sand)
  // One cone from the top edge down to the bed (the same line the floor sampler walks), so the
  // sides have no lip or gap.
  const body = new Mesh(new CylinderGeometry(r, r + slope, top - LAKE.bed, 8), [sand, plastic('#f8d2b4'), sand])
  body.position.set(x, (top + LAKE.bed) / 2, z)
  body.rotation.y = Math.PI / 8
  body.receiveShadow = true
  body.castShadow = true
  // Light rim along the top edge, hugging the cone (it widens 2.5 m per metre of drop).
  const flare = (0.1 * slope) / (top - LAKE.bed)
  const rim = new Mesh(new CylinderGeometry(r + 0.01, r + 0.01 + flare, 0.1, 8, 1, true), plastic('#fff0e2'))
  rim.position.set(x, top - 0.05, z)
  rim.rotation.y = Math.PI / 8
  group.add(body, rim)
  for (const [dx, dz, kind] of ISLE_PLANTS) {
    if (kind === 'flower') {
      for (let i = 0; i < 3; i++) {
        const f = new Mesh(new SphereGeometry(0.14, 8, 6), neon('#ffd21a', 0.3))
        f.position.set(x + dx + (i - 1) * 0.22, top + 0.25 + (i % 2) * 0.1, z + dz + (i % 2 ? 0.15 : -0.1))
        group.add(f)
      }
      const stem = new Mesh(new BoxGeometry(0.5, 0.2, 0.4), plastic('#4fc23a'))
      stem.position.set(x + dx, top + 0.1, z + dz)
      group.add(stem)
    } else {
      for (let i = 0; i < 4; i++) {
        const leaf = new Mesh(new BoxGeometry(0.16, 0.05, 0.7), plastic('#5fd03a'))
        leaf.position.set(x + dx, top + 0.2, z + dz)
        leaf.rotation.set(0.5, (i / 4) * Math.PI * 2, 0)
        group.add(leaf)
      }
    }
  }
  addFloorSampler((px, pz) => {
    const d = Math.hypot(px - x, pz - z)
    if (d <= r) return top
    if (d <= r + slope) return top + (LAKE.bed - top) * ((d - r) / slope)
    return -Infinity
  })

  // Stairs: plank steps from the stem's end down onto the isle, dark rails either side.
  const s = SOUTH_STAIRS
  const plank = plastic(HUB_COLORS.pier)
  const dark = plastic('#5e4431')
  const depth = (s.z1 - s.z0) / s.steps
  for (let i = 0; i < s.steps; i++) {
    const y = s.from + ((s.to - s.from) * (i + 1)) / s.steps
    const za = s.z0 + depth * i
    group.add(box(s.width, y - LAKE.bed, depth + 0.02, i % 2 ? plank : plastic('#9a7658'), s.x, (y + LAKE.bed) / 2, za + depth / 2))
    addBox(s.x - s.width / 2, s.x + s.width / 2, LAKE.bed, y, za, za + depth)
  }
  for (const side of [-1, 1]) {
    const rx = s.x + side * (s.width / 2 + 0.08)
    for (const pz of [s.z0 + 0.2, s.z1 - 0.1]) group.add(box(0.2, 1.3, 0.2, dark, rx, s.to + 0.55, pz))
    group.add(box(0.14, 0.14, s.z1 - s.z0, dark, rx, s.to + 1.15, (s.z0 + s.z1) / 2))
    addBox(rx - 0.1, rx + 0.1, LAKE.bed, s.from + 1.2, s.z0, s.z1)
  }
}

// Pink boulders on the shores.
function buildBoulders(group) {
  for (const b of BOULDERS) {
    const rock = new Mesh(new IcosahedronGeometry(b.r, 0), plastic('#e9a3a0', { flatShading: true }))
    rock.position.set(b.x, 0.4 + b.r * 0.5, b.z)
    rock.scale.y = 0.75
    rock.castShadow = true
    group.add(rock)
    addBox(b.x - b.r, b.x + b.r, 0, 0.4 + b.r, b.z - b.r, b.z + b.r)
  }
}

// Raised bands outside the deck on the west rim, faceted into straight runs: coloured top (the
// purple one blotched), a light line on the outer edge, a glowing lip and a near-black step face
// toward the deck, and a side wall down into the lake.
function buildRimBands(group) {
  const { rimR } = ISLAND
  const r = ISLAND.r * 0.99 // tucked inside the deck's 40-gon, whose facets sit up to 0.3% inside its radius
  const height = -LAKE.bed
  // Purple band floor: violet with soft lighter blotches, lit from within like the neon parts.
  const blotches = petBandTexture()
  blotches.repeat.set(6, 6)
  const petTop = new MeshStandardMaterial({ map: blotches, emissiveMap: blotches, emissive: '#ffffff', emissiveIntensity: 0.25, ...MATERIAL_PBR.NEON })
  for (const b of RIM_BANDS) {
    const span = deg(b.a1 - b.a0)
    // RingGeometry lies in XY; rotated flat its angle theta maps to atan2(dz, dx) = -theta.
    const n = b.segments
    const top = new Mesh(new RingGeometry(r, rimR, n, 1, -deg(b.a1), span), b.id === 'pets' ? petTop : neon(HUB_COLORS[b.color], 0.22))
    top.rotation.x = -Math.PI / 2
    top.position.set(ISLAND.x, b.h, ISLAND.z)
    top.receiveShadow = true
    const line = new Mesh(new RingGeometry(rimR - 0.35, rimR, n, 1, -deg(b.a1), span), neon('#ffffff', 0.4))
    line.rotation.x = -Math.PI / 2
    line.position.set(ISLAND.x, b.h + 0.005, ISLAND.z)
    const lip = new Mesh(new RingGeometry(r, r + 0.24, n, 1, -deg(b.a1), span), neon(HUB_COLORS[b.lip], 0.35))
    lip.rotation.x = -Math.PI / 2
    lip.position.set(ISLAND.x, b.h + 0.006, ISLAND.z)
    // CylinderGeometry's theta maps to atan2(dz, dx) = 90 - theta.
    const step = new Mesh(new CylinderGeometry(r, r, b.h, n, 1, true, deg(90 - b.a1), span), plastic(HUB_COLORS.bandSide))
    step.position.set(ISLAND.x, b.h / 2, ISLAND.z)
    const wall = new Mesh(new CylinderGeometry(rimR, rimR, height + b.h, n, 1, true, deg(90 - b.a1), span), plastic(HUB_COLORS[b.edge]))
    wall.position.set(ISLAND.x, (b.h + LAKE.bed) / 2, ISLAND.z)
    wall.castShadow = true
    // Sand slope from the wall's foot out under the water, like the deck's skirt (the band covers
    // the deck's own skirt), so the wall no longer drops straight onto the lake bed.
    const sand = new Mesh(new CylinderGeometry(rimR + 0.25, rimR + ISLAND.skirt, 0.9, 64, 1, true, deg(90 - b.a1), span), plastic(HUB_COLORS.sand, { side: DoubleSide }))
    sand.position.set(ISLAND.x, LAKE.bed + 0.45, ISLAND.z)
    sand.receiveShadow = true
    group.add(top, line, lip, step, wall, sand)
    // Close both radial ends: a vertical face from the deck edge to the wall, bed to band top.
    for (const a of [b.a0, b.a1]) {
      const cap = new Mesh(new PlaneGeometry(rimR - r, height + b.h), plastic(HUB_COLORS[b.edge], { side: DoubleSide }))
      const mid = (r + rimR) / 2
      cap.position.set(ISLAND.x + Math.cos(deg(a)) * mid, (b.h + LAKE.bed) / 2, ISLAND.z + Math.sin(deg(a)) * mid)
      cap.rotation.y = -deg(a) // plane's local X runs along the radius
      group.add(cap)
    }
  }
}

// Round grassy islet with a pink boulder, under the big tree off the north-west rim.
function buildTreeIslet(group) {
  const { x, z, r, h } = TREE_ISLET
  const sand = new Mesh(new CylinderGeometry(r + 0.4, r + 1.8, 1.2, 20), plastic(HUB_COLORS.sand))
  sand.position.set(x, LAKE.bed + 0.6, z)
  const grass = new Mesh(new CylinderGeometry(r, r + 0.2, h - LAKE.bed, 20), plastic(HUB_COLORS.grass))
  grass.position.set(x, (h + LAKE.bed) / 2, z)
  grass.receiveShadow = true
  const rock = new Mesh(new IcosahedronGeometry(1.4, 0), plastic('#e9a3a0', { flatShading: true }))
  rock.position.set(x - 1.2, h + 0.6, z + 1.6)
  rock.castShadow = true
  group.add(sand, grass, rock)
  addFloorSampler((px, pz) => (Math.hypot(px - x, pz - z) <= r ? h : -Infinity))
  addPusher((p, v, pr) => {
    if (p.y + STEP_UP >= h) return
    const dx = p.x - x
    const dz = p.z - z
    const d = Math.hypot(dx, dz)
    if (d >= r + pr || d === 0) return
    p.x = x + (dx / d) * (r + pr)
    p.z = z + (dz / d) * (r + pr)
  })
}

function buildLands(group, lake) {
  const rand = mulberry32(21)
  const sand = plastic(HUB_COLORS.sand)
  const drips = {} // colour key -> [x, y, z, sx, sy, sz]
  const OVER = 0.35 // grass cap overhang
  const BEACH = 2.2
  for (const c of LANDS) {
    // Beach apron just above the waterline (no collider, so the lake's shore foam is told about it).
    group.add(box(c.x1 - c.x0 + BEACH * 2, 1.15, c.z1 - c.z0 + BEACH * 2, sand, (c.x0 + c.x1) / 2, LAKE.bed + 0.575, (c.z0 + c.z1) / 2, { cast: false }))
    lake.addShore(c.x0 - BEACH, c.x1 + BEACH, c.z0 - BEACH, c.z1 + BEACH, LAKE.bed + 1.15)
    // Slide-area terraces bring their own colours (layout.js SLIDE_AREAS); the rest is grass on maroon.
    const capMat = plastic(HUB_COLORS[c.cap ?? 'grass'])
    if (c.kind === 'meadow') {
      solid(group, c.x0, c.x1, LAKE.bed, c.h, c.z0, c.z1, capMat)
      continue
    }
    solid(group, c.x0, c.x1, LAKE.bed, c.h, c.z0, c.z1, plastic(HUB_COLORS[c.face ?? (c.dark ? 'maroonDark' : 'maroon')]))
    const dripKey = c.drip ?? 'grassDark'
    drips[dripKey] ??= []
    group.add(box(c.x1 - c.x0 + OVER * 2, 0.6, c.z1 - c.z0 + OVER * 2, capMat, (c.x0 + c.x1) / 2, c.h - 0.2, (c.z0 + c.z1) / 2))
    // Grass drips down the faces that look toward the island.
    const faces = [
      [c.x0, c.z1 + OVER, c.x1, c.z1 + OVER, c.z1 < WORLD_BOUNDS.maxZ], // south
      [c.x1 + OVER, c.z0, c.x1 + OVER, c.z1, c.x1 < WORLD_BOUNDS.maxX], // east
      [c.x0 - OVER, c.z0, c.x0 - OVER, c.z1, c.x0 > WORLD_BOUNDS.minX], // west
    ]
    for (const [ax, az, bx, bz, show] of faces) {
      if (!show) continue
      const len = Math.hypot(bx - ax, bz - az)
      for (let s = rand() * 1.5; s < len; s += 1.2 + rand() * 2.2) {
        const t = s / len
        const w = 0.5 + rand() * 0.9
        const hgt = 0.4 + rand() * 1.1
        const alongX = az === bz
        drips[dripKey].push([ax + (bx - ax) * t, c.h - 0.5 - hgt / 2, az + (bz - az) * t, alongX ? w : 0.3, hgt, alongX ? 0.3 : w])
      }
    }
    if (c.hills) {
      for (let i = 0; i < 3; i++) {
        const r = 4 + rand() * 4
        const hill = new Mesh(new SphereGeometry(1, 28, 16), capMat)
        hill.scale.set(r, r * 0.45, r * 0.9)
        hill.position.set(c.x0 + (c.x1 - c.x0) * (0.25 + 0.5 * rand()), c.h, c.z0 + (c.z1 - c.z0) * (0.3 + 0.5 * rand()))
        hill.castShadow = true
        hill.receiveShadow = true
        group.add(hill)
      }
    }
  }
  const mtx = new Matrix4()
  const dripGeo = new BoxGeometry(1, 1, 1)
  for (const [key, list] of Object.entries(drips)) {
    const dripMesh = new InstancedMesh(dripGeo, plastic(HUB_COLORS[key]), list.length)
    list.forEach(([x, y, z, sx, sy, sz], i) => {
      mtx.makeScale(sx, sy, sz).setPosition(x, y, z)
      dripMesh.setMatrixAt(i, mtx)
    })
    dripMesh.castShadow = true
    group.add(dripMesh)
  }
}

// Group whose local +X runs from (ax, az) toward (bx, bz).
function alongSegment(ax, az, bx, bz) {
  const g = new Group()
  g.position.set(ax, 0, az)
  g.rotation.y = -Math.atan2(bz - az, bx - ax)
  return [g, Math.hypot(bx - ax, bz - az)]
}

// Post-and-two-rail railings, posts standing on the lake bed.
function buildFences(group) {
  const mat = plastic(HUB_COLORS.fence)
  const H = 1.15
  for (const f of FENCES) {
    const [g, len] = alongSegment(f.ax, f.az, f.bx, f.bz)
    const posts = Math.max(2, Math.round(len / 2.2) + 1)
    for (let i = 0; i < posts; i++) {
      const post = box(0.26, H - LAKE.bed, 0.26, mat, (len * i) / (posts - 1), (H + LAKE.bed) / 2, 0)
      g.add(post)
    }
    for (const y of [0.55, 0.98]) g.add(box(len, 0.14, 0.12, mat, len / 2, y, 0.08))
    group.add(g)
    addSegmentCollider(f.ax, f.az, f.bx, f.bz, LAKE.bed, H)
  }
}

// Plank bridge on posts standing in the lake, with a rail either side; its deck runs from height
// y0 at (ax, az) to y1 at (bx, bz) (the pier up the east hill, the long level bridge).
function buildPier(group, { ax, az, bx, bz, width, y0, y1 }) {
  const [g, len] = alongSegment(ax, az, bx, bz)
  const plank = plastic(HUB_COLORS.pier)
  const dark = plastic('#5e4431')
  const heightAt = (t) => y0 + (y1 - y0) * Math.min(1, Math.max(0, t / len))
  const slope = new Group() // local +X climbs along the deck
  slope.position.y = y0
  slope.rotation.z = Math.atan2(y1 - y0, len)
  const run = Math.hypot(len, y1 - y0)
  slope.add(box(run, 0.25, width, plank, run / 2, -0.12, 0))
  for (const side of [-1, 1]) slope.add(box(run, 0.14, 0.14, dark, run / 2, 1.0, side * (width / 2 - 0.1)))
  g.add(slope)
  for (let s = 0; s <= len; s += 2.6) {
    const top = heightAt(s) + 1.1
    for (const side of [-1, 1]) g.add(box(0.26, top - LAKE.bed, 0.26, dark, s, (top + LAKE.bed) / 2, side * (width / 2 - 0.1)))
  }
  group.add(g)

  // Floor rises along the deck; rails keep riders on it.
  const ux = (bx - ax) / len
  const uz = (bz - az) / len
  addFloorSampler((px, pz) => {
    const t = (px - ax) * ux + (pz - az) * uz
    const n = -(px - ax) * uz + (pz - az) * ux
    return t >= 0 && t <= len && Math.abs(n) <= width / 2 ? heightAt(t) : -Infinity
  })
  for (const side of [-1, 1]) {
    const ox = -uz * side * (width / 2)
    const oz = ux * side * (width / 2)
    addSegmentCollider(ax + ox + ux * 0.6, az + oz + uz * 0.6, bx + ox - ux * 1.2, bz + oz - uz * 1.2, LAKE.bed, y1 + 1.1, 0.12)
  }
}

export function createTerrain() {
  const group = new Group()
  const lake = buildLake(group)
  buildIsland(group)
  buildCross(group)
  buildPortalIsle(group)
  buildBoulders(group)
  buildRimBands(group)
  buildTreeIslet(group)
  buildLands(group, lake)
  buildFences(group)
  buildPier(group, LONG_BRIDGE)
  return {
    group,
    bakeWater: lake.bake, // once every collider in the hub exists
    update(dt) {
      lake.update(dt)
    },
  }
}
