// The water slide standing in the lake and its splash pool on the island's edge, plus the lane-foot
// markers (silver downhill arrow, start arrow, VIP rope + pad + label). The slide is one side profile
// (foot -> one straight 20 degree climb to the end) extruded across X for the body, walls and
// rails; the lane beds are strips laid on the same profile so the water texture flows down them.
// The areas it climbs through (terraces, gates, clouds) are areas.js.
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three'
import { HUB_COLORS, LANE_COLORS, MATERIAL_PBR, WATER_FLOW } from '../config.js'
import { studTile, toTexture } from '../textures.js'
import { addFloorSampler, addPusher, STEP_UP } from '../colliders.js'
import { ARROW, LAKE, LANES, POOL, SILVER_ARROW, SLIDE, slideSurfaceAt, VIP } from './layout.js'
import { laneWater, neon, plastic } from './materials.js'
import { poolWater } from './lake.js'
import { markDynamic, nearInstances } from './batch.js'
import { LABEL_RENDER_ORDER, vipTexture } from './signs.js'

const PROFILE = [SLIDE.footZ, SLIDE.endZ] // z of each profile vertex

function shadow(mesh, cast = true) {
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

// Solid from the lake bed up to (lane bed + top) along the profile, spanning x0..x1.
function profileSolid(x0, x1, top, material) {
  const s = new Shape()
  s.moveTo(-SLIDE.footZ, LAKE.bed)
  s.lineTo(-SLIDE.footZ, top)
  s.lineTo(-SLIDE.endZ, SLIDE.height + top)
  s.lineTo(-SLIDE.endZ, LAKE.bed)
  s.lineTo(-SLIDE.footZ, LAKE.bed)
  const mesh = new Mesh(new ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false }), material)
  mesh.rotation.y = Math.PI / 2 // shape X -> world -Z, extrusion -> world +X
  mesh.position.x = x0
  return shadow(mesh)
}

// Flat-shaded triangle soup from quads [a, b, c, d] (counter-clockwise seen from the front).
function quadsGeometry(quads, uvs) {
  const pos = []
  const uv = []
  quads.forEach((q, i) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(...q[k])
      if (uvs) uv.push(...uvs[i][k])
    }
  })
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  if (uvs) geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  geo.computeVertexNormals()
  return geo
}

// Water bed strip x0..x1 at `lift` above the bed; v counts metres along the slide / vTile.
function laneStrip(x0, x1, lift, vTile) {
  const quads = []
  const uvs = []
  let dist = 0
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const za = PROFILE[i]
    const zb = PROFILE[i + 1]
    const ya = slideSurfaceAt(za) + lift
    const yb = slideSurfaceAt(zb) + lift
    const len = Math.hypot(za - zb, ya - yb)
    const va = dist / vTile
    const vb = (dist + len) / vTile
    dist += len
    quads.push([[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]])
    uvs.push([[0, va], [1, va], [1, vb], [0, vb]])
  }
  return quadsGeometry(quads, uvs)
}

// Sloped outer flank from the top of a wall down to the lake bed at skirtHalf.
function skirt(sign) {
  const xTop = sign * (SLIDE.innerHalf + SLIDE.wallWidth)
  const xFoot = sign * SLIDE.skirtHalf
  const top = (z) => slideSurfaceAt(z) + SLIDE.wallHeight
  const quads = []
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const za = PROFILE[i]
    const zb = PROFILE[i + 1]
    quads.push([[xTop, top(za), za], [xFoot, LAKE.bed, za], [xFoot, LAKE.bed, zb], [xTop, top(zb), zb]])
  }
  const z = SLIDE.footZ
  quads.push([[xTop, LAKE.bed, z], [xFoot, LAKE.bed, z], [xTop, top(z), z], [xTop, top(z), z]]) // front triangle
  // UVs in metres (along the slide, up), so the panel texture tiles evenly.
  const uvs = quads.map((q) => q.map(([, y, zz]) => [-zz, y]))
  return shadow(new Mesh(quadsGeometry(quads, uvs), panelMaterial(true)))
}

// Maroon panelling for the slide body, walls and flanks (textures map 1 unit = 1 m).
const panelMats = {}
function panelMaterial(double = false) {
  const key = double ? 'double' : 'single'
  if (!panelMats[key]) {
    const tile = studTile(HUB_COLORS.maroon, { cols: 2, rows: 2, lip: 5, vary: 0.06, seed: 17 })
    panelMats[key] = new MeshStandardMaterial({ map: toTexture(tile.color, { repeat: [0.25, 0.25] }), ...MATERIAL_PBR.PLASTIC, ...(double ? { side: DoubleSide } : {}) })
  }
  return panelMats[key]
}

function buildSlide(group, waters) {
  const { innerHalf, wallWidth, wallHeight, lane, rail, railHeight, divider, dividerHeight } = SLIDE
  const maroon = plastic(HUB_COLORS.maroon)
  const panels = panelMaterial()
  group.add(profileSolid(-innerHalf, innerHalf, 0.02, panels))
  group.add(profileSolid(-innerHalf - wallWidth, -innerHalf, wallHeight, panels))
  group.add(profileSolid(innerHalf, innerHalf + wallWidth, wallHeight, panels))
  group.add(skirt(-1), skirt(1))

  const half = lane / 2
  for (const l of LANES) {
    const c = LANE_COLORS[l.id]
    const mat = laneWater(c, lane, WATER_FLOW.lane)
    waters.push(mat.userData.uniforms.uTime)
    const bed = new Mesh(laneStrip(l.x - half, l.x + half, 0.05, 1), mat)
    bed.receiveShadow = true
    group.add(bed)
    const railMat = plastic(c.rail)
    group.add(profileSolid(l.x - half - rail, l.x - half, railHeight, railMat))
    group.add(profileSolid(l.x + half, l.x + half + rail, railHeight, railMat))
  }
  for (let i = 0; i < LANES.length - 1; i++) {
    const mid = (LANES[i].x + LANES[i + 1].x) / 2
    group.add(profileSolid(mid - divider / 2, mid + divider / 2, dividerHeight, maroon))
  }
}

// Riders stand on the lane beds; the walls (and the flanks, from outside) block them.
// Warm lights studding both wall tops, instanced in pieces that draw only near the camera.
function buildWallLights(group) {
  const x = SLIDE.innerHalf + SLIDE.wallWidth / 2
  const spots = []
  for (let z = SLIDE.footZ - 1; z > SLIDE.endZ + 2; z -= 5) {
    const y = slideSurfaceAt(z) + SLIDE.wallHeight + 0.15
    spots.push(new Matrix4().makeTranslation(-x, y, z), new Matrix4().makeTranslation(x, y, z))
  }
  group.add(nearInstances(new SphereGeometry(0.22, 10, 6), new MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf5a', emissiveIntensity: 0.9 }), spots))
}

// The silver lane (and its divider) is closed at the foot: only a Surf! ride (surf.js, which places
// the raft itself) goes in. Anyone else is turned back to the pool or out into the blue lane.
// The VIP lane (and its divider) is closed the same way until `vip.open` (bought in vipLane.js).
function slideColliders(vip) {
  const { innerHalf, skirtHalf, wallHeight, footZ, endZ, divider } = SLIDE
  const silverEdge = (LANES[0].x + LANES[1].x) / 2 + divider / 2 // the blue lane's west rail
  const vipEdge = (LANES[1].x + LANES[2].x) / 2 - divider / 2 // the blue lane's east rail
  addFloorSampler((x, z) => (Math.abs(x) <= innerHalf && z <= footZ && z >= endZ ? slideSurfaceAt(z) : -Infinity))
  addPusher((p, v, r) => {
    if (p.z < endZ || p.z > footZ + r) return
    if (p.x > -innerHalf && p.x < silverEdge) {
      const front = footZ + r - p.z
      const side = silverEdge - p.x
      if (front < side) {
        p.z = footZ + r
        if (v.z < 0) v.z = 0
      } else {
        p.x = silverEdge
        if (v.x < 0) v.x = 0
      }
      return
    }
    if (!vip.open && p.x > vipEdge && p.x < innerHalf) {
      const front = footZ + r - p.z
      const side = p.x - vipEdge
      if (front < side) {
        p.z = footZ + r
        if (v.z < 0) v.z = 0
      } else {
        p.x = vipEdge
        if (v.x > 0) v.x = 0
      }
      return
    }
    const ax = Math.abs(p.x)
    const sign = p.x < 0 ? -1 : 1
    const top = slideSurfaceAt(Math.min(p.z, footZ)) + wallHeight
    if (p.y + STEP_UP >= top) return // above the walls
    if (ax < innerHalf && p.z <= footZ) {
      // In the channel: keep the capsule off the inner wall faces.
      const lim = innerHalf - r
      if (ax > lim) {
        p.x = sign * lim
        if (v.x * sign > 0) v.x = 0
      }
      return
    }
    if (ax >= skirtHalf + r) return
    if (ax < innerHalf) return // in front of the foot, in line with the channel: walk in
    // Wall or flank: leave by the nearer of the side and (at the foot) the front.
    const side = skirtHalf + r - ax
    const front = footZ + r - p.z
    if (front < side) {
      p.z = footZ + r
      if (v.z < 0) v.z = 0
    } else {
      p.x = sign * (skirtHalf + r)
      if (v.x * sign < 0) v.x = 0
    }
  })
}

function ellipseShape(rx, rz, holeRx, holeRz) {
  const s = new Shape()
  s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false)
  if (holeRx) {
    const hole = new Shape()
    hole.absellipse(0, 0, holeRx, holeRz, 0, Math.PI * 2, true)
    s.holes.push(hole)
  }
  return s
}

// The pool water uses the lake's shader (lake.js): foam along the rim, churn spreading from the
// slide's foot, sun glints; it animates off the lake's clock.
function buildPool(group) {
  const mat = poolWater(POOL, { x: 0, z: SLIDE.footZ, halfWidth: SLIDE.innerHalf + SLIDE.wallWidth })
  const surface = new Mesh(new ShapeGeometry(ellipseShape(POOL.rx, POOL.rz), 64), mat)
  surface.rotation.x = -Math.PI / 2
  surface.position.set(POOL.x, POOL.waterY, POOL.z)
  surface.receiveShadow = true

  const rimShape = ellipseShape(POOL.rx + POOL.rim, POOL.rz + POOL.rim, POOL.rx, POOL.rz)
  const rim = new Mesh(
    new ExtrudeGeometry(rimShape, { depth: POOL.rimHeight - LAKE.bed, bevelEnabled: false, curveSegments: 64 }),
    plastic(HUB_COLORS.poolRim),
  )
  rim.rotation.x = -Math.PI / 2 // extrusion -> world +Y, from the lake bed
  rim.position.set(POOL.x, LAKE.bed, POOL.z)
  group.add(surface, shadow(rim, false))


  // The pool floor is walkable; where the basin stands in the lake its rim wall blocks swimmers.
  const inPool = (px, pz, grow) => ((px - POOL.x) / (POOL.rx + grow)) ** 2 + ((pz - POOL.z) / (POOL.rz + grow)) ** 2 <= 1
  addFloorSampler((px, pz) => (inPool(px, pz, POOL.rim) ? 0 : -Infinity))
  addPusher((p, v, r) => {
    if (p.y + STEP_UP >= 0 || !inPool(p.x, p.z, POOL.rim + r)) return
    // Out along the ellipse's normalised radial direction.
    const ex = (p.x - POOL.x) / (POOL.rx + POOL.rim + r)
    const ez = (p.z - POOL.z) / (POOL.rz + POOL.rim + r)
    const k = Math.hypot(ex, ez) || 1
    p.x = POOL.x + (ex / k) * (POOL.rx + POOL.rim + r)
    p.z = POOL.z + (ez / k) * (POOL.rz + POOL.rim + r)
    v.x = 0
    v.z = 0
  })
}

function polyShape(points) {
  const s = new Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  return s
}

function buildMarkers(group, animated) {
  // Red start arrow standing at the foot of the blue lane, pointing up the slide.
  const k = ARROW.height
  const arrowShape = polyShape([
    [-0.17 * k, 0], [0.17 * k, 0], [0.17 * k, 0.55 * k], [0.4 * k, 0.55 * k],
    [0, k], [-0.4 * k, 0.55 * k], [-0.17 * k, 0.55 * k],
  ])
  const arrow = new Mesh(
    new ExtrudeGeometry(arrowShape, { depth: 0.2 * k, bevelEnabled: true, bevelSize: 0.03 * k, bevelThickness: 0.03 * k, bevelSegments: 2 }),
    neon(HUB_COLORS.arrow, 0.35),
  )
  arrow.position.set(ARROW.x, slideSurfaceAt(ARROW.z) + 0.05, ARROW.z)
  group.add(shadow(arrow))
  markDynamic(arrow)
  animated.push((t) => (arrow.position.y = slideSurfaceAt(ARROW.z) + 0.05 + Math.sin(t * 3) * 0.06))

  // Gold arrow lying on the silver lane's foot, pointing downhill (the start arrow's outline, centred).
  const L = SILVER_ARROW.length
  const silverShape = polyShape([
    [-0.17 * L, -0.5 * L], [0.17 * L, -0.5 * L], [0.17 * L, 0.05 * L], [0.4 * L, 0.05 * L],
    [0, 0.5 * L], [-0.4 * L, 0.05 * L], [-0.17 * L, 0.05 * L],
  ])
  const silverArrow = new Mesh(new ExtrudeGeometry(silverShape, { depth: 0.04 * L, bevelEnabled: false }), neon(HUB_COLORS.chevron, 0.5))
  silverArrow.rotation.set(-Math.PI / 2 + SLIDE.angle, 0, Math.PI) // flat on the slope, tip (shape +Y) turned south
  silverArrow.position.set(SILVER_ARROW.x, slideSurfaceAt(SILVER_ARROW.z) + 0.08, SILVER_ARROW.z)
  group.add(shadow(silverArrow))
  animated.push((t) => (silverArrow.material.emissiveIntensity = 0.35 + 0.3 * Math.max(0, Math.sin(t * 4))))

  // VIP lane: rope barrier across the foot (dropped once bought), gold pad in the pool, floating label.
  const postMat = plastic(HUB_COLORS.vipPost)
  const pinkMat = neon(HUB_COLORS.vipRope, 0.3)
  for (const x of VIP.postsX) {
    const post = new Mesh(new CylinderGeometry(0.14, 0.17, VIP.ropeY + 0.15, 10), postMat)
    post.position.set(x, (VIP.ropeY + 0.15) / 2, VIP.z)
    const cap = new Mesh(new SphereGeometry(0.22, 12, 8), pinkMat)
    cap.position.set(x, VIP.ropeY + 0.25, VIP.z)
    group.add(shadow(post), shadow(cap))
  }
  const span = VIP.postsX[1] - VIP.postsX[0]
  const rope = new Mesh(new CylinderGeometry(0.1, 0.1, span, 8), pinkMat)
  rope.rotation.z = Math.PI / 2
  rope.position.set((VIP.postsX[0] + VIP.postsX[1]) / 2, VIP.ropeY, VIP.z)
  group.add(shadow(rope))
  markDynamic(rope) // hidden when the lane is bought

  const pad = new Mesh(new CylinderGeometry(VIP.pad.r, VIP.pad.r, 0.08, 40), neon(HUB_COLORS.vipPad, 0.55))
  pad.position.set(VIP.pad.x, POOL.waterY + 0.02, VIP.pad.z)
  const padInner = new Mesh(new CylinderGeometry(VIP.pad.r * 0.62, VIP.pad.r * 0.62, 0.1, 40), neon('#ffe680', 0.6))
  padInner.position.copy(pad.position)
  group.add(shadow(pad, false), padInner)

  const label = new Sprite(new SpriteMaterial({ map: vipTexture(), transparent: true, depthWrite: false }))
  label.scale.set(VIP.label.w, VIP.label.h, 1)
  label.renderOrder = LABEL_RENDER_ORDER
  label.position.set(VIP.label.x, VIP.label.y, VIP.label.z)
  group.add(label)
  animated.push((t) => (label.position.y = VIP.label.y + Math.sin(t * 2) * 0.06))
  return { rope, label }
}

export function createSlide() {
  const group = new Group()
  const waters = []
  const animated = []
  buildSlide(group, waters)
  buildWallLights(group)
  buildPool(group)
  const { rope, label } = buildMarkers(group, animated)
  // The VIP lane's gate: vipLane.js unlocks it once bought (the pusher reads `open` every step) and
  // paints the price on its floating label while it is locked.
  const vip = {
    open: false,
    label,
    unlock() {
      vip.open = true
      rope.visible = false
    },
  }
  slideColliders(vip)
  let t = 0
  const update = (dt) => {
    t += dt
    for (const time of waters) time.value = t % 3600 // keeps the shader noise precise; one skip an hour
    for (const fn of animated) fn(t)
  }
  return { group, vip, update }
}
