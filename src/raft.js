// The log raft the player always sits on, with the paddle held across the body. A child of the
// player group (so it turns with the player). The held paddle
// follows the animator's stroke; on the lake the raft floats at the surface, lifting the player.
// Surfing (surf.js) it rides the slide instead, and the held paddle is laid down on the benches
// while the player stands.
// The log raft is the free boat; setBoat(id) swaps in one bought in the Kayak Shop (kayaks.js,
// hub/kayakModels.js), keeping the held paddle.
import { CylinderGeometry, BoxGeometry, Euler, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Shape, Vector3 } from 'three'
import { MATERIAL_PBR, PHYSICS, RAFT, RIPPLES } from './config.js'
import { mulberry32 } from './textures.js'
import { LAKE } from './hub/layout.js'
import { kayakModel } from './hub/kayakModels.js'

const C = RAFT.colors
const mat = (color) => new MeshStandardMaterial({ color, ...MATERIAL_PBR.PLASTIC })

function shadow(mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Tapered cylinder from point a to point b.
function rod(a, b, r, material) {
  const from = new Vector3(...a)
  const dir = new Vector3(...b).sub(from)
  const m = shadow(new Mesh(new CylinderGeometry(r, r, dir.length(), 8), material))
  m.position.copy(from).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  return m
}

// Flat arrow-tipped blade in its XY plane, pointing +X: lighter rim, darker face plates.
function blade(length, width) {
  const outline = (inset) => {
    const s = new Shape()
    const w = width / 2 - inset
    s.moveTo(inset, -w * 0.7)
    s.lineTo(length * 0.78, -w)
    s.lineTo(length - inset * 1.5, 0)
    s.lineTo(length * 0.78, w)
    s.lineTo(inset, w * 0.7)
    s.lineTo(inset, -w * 0.7)
    return s
  }
  const g = new Group()
  const rim = shadow(new Mesh(new ExtrudeGeometry(outline(0), { depth: 0.03, bevelEnabled: false }), mat(C.bladeRim)))
  rim.position.z = -0.015
  g.add(rim)
  for (const side of [-1, 1]) {
    const face = new Mesh(new ExtrudeGeometry(outline(0.03), { depth: 0.006, bevelEnabled: false }), mat(C.blade))
    face.position.z = side > 0 ? 0.015 : -0.021
    g.add(face)
  }
  return g
}

// Paddle along X: handle end at +handle, shaft to shaftEnd, blade beyond it (toward -X).
function paddle() {
  const p = RAFT.paddle
  const g = new Group()
  g.add(rod([p.handle, 0, 0], [p.shaftEnd, 0, 0], 0.028, mat(C.shaft)))
  const b = blade(p.blade, p.bladeWidth)
  b.rotation.y = Math.PI // point the tip toward -X
  b.position.x = p.shaftEnd + 0.02
  g.add(b)
  return g
}

// The log raft without the held paddle: logs, rope bands, benches and the spare oar (also the
// Wooden Raft's picture in the Kayak Shop).
export function raftHull() {
  const g = new Group()
  const { logs, logRadius: r, logLength: len, front, bandX } = RAFT
  const rand = mulberry32(8)
  const logMesh = new InstancedMesh(new CylinderGeometry(r, r, 1, 14), [mat(C.log), mat(C.logEnd), mat(C.logEnd)], logs)
  const bandMesh = new InstancedMesh(new CylinderGeometry(r * 1.05, r * 1.05, 0.06, 14), mat(C.band), logs * 2)
  const m = new Matrix4()
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2) // cylinder axis -> X
  for (let i = 0; i < logs; i++) {
    const z = front - r - i * r * 2
    const l = len * (0.97 + rand() * 0.06)
    const shift = (rand() - 0.5) * 0.06
    logMesh.setMatrixAt(i, m.compose(new Vector3(shift, r, z), q, new Vector3(1, l, 1)))
    bandMesh.setMatrixAt(i * 2, m.compose(new Vector3(-bandX + shift, r, z), q, new Vector3(1, 1, 1)))
    bandMesh.setMatrixAt(i * 2 + 1, m.compose(new Vector3(bandX + shift, r, z), q, new Vector3(1, 1, 1)))
  }
  logMesh.castShadow = logMesh.receiveShadow = true
  bandMesh.castShadow = true
  g.add(logMesh, bandMesh)

  // Benches on short legs across the deck.
  const wood = mat(C.bench)
  const deckTop = r * 2
  const legH = RAFT.seatY - 0.07 - deckTop
  for (const z of RAFT.benchZ) {
    const seat = shadow(new Mesh(new BoxGeometry(1.3, 0.07, 0.34), wood))
    seat.position.set(0, RAFT.seatY - 0.035, z)
    g.add(seat)
    for (const side of [-1, 1]) {
      const leg = shadow(new Mesh(new BoxGeometry(0.1, legH, 0.24), wood))
      leg.position.set(side * 0.5, deckTop + legH / 2, z)
      g.add(leg)
    }
  }

  // Spare oar lying flat across the benches: handle at the rear-left corner, blade forward
  // beside the player's right leg. Local +X (the handle) is yawed toward the rear-left.
  const spare = paddle()
  const dir = new Vector3(0.95, 0, -2.35).normalize()
  spare.rotation.set(Math.PI / 2, Math.atan2(-dir.z, dir.x), 0, 'YXZ')
  spare.position.set(0.55 - dir.x * RAFT.paddle.handle, RAFT.seatY + 0.03, -1.9 - dir.z * RAFT.paddle.handle)
  g.add(spare)
  return g
}

function buildRaft() {
  const g = new Group()
  const hull = raftHull()
  // The paddle in the player's hands, shaft across the body at hand height.
  const held = paddle()
  held.position.set(RAFT.paddle.x, RAFT.paddle.y, RAFT.paddle.z)
  g.add(hull, held)
  return { group: g, hull, held }
}

// Where the held paddle lies while the player stands to surf: flat on the benches beside the
// spare oar, handle aft.
const STOWED_AT = new Vector3(-0.5, RAFT.seatY + 0.03, -0.6)
const STOWED_Q = new Quaternion().setFromEuler(new Euler(Math.PI / 2, -Math.PI / 2, 0, 'YXZ'))
const HELD_AT = new Vector3(RAFT.paddle.x, RAFT.paddle.y, RAFT.paddle.z)

// Raft-local points the water rings start from: the blade's middle (on the held paddle), the rear
// corners (wake) and the bow.
const BLADE = new Vector3(RAFT.paddle.shaftEnd - RAFT.paddle.blade * 0.5, 0, 0)
const STERN = [new Vector3(-RAFT.logLength / 2, 0, RAFT.front - RAFT.logs * RAFT.logRadius * 2), new Vector3(RAFT.logLength / 2, 0, RAFT.front - RAFT.logs * RAFT.logRadius * 2)]
const BOW = new Vector3(0, 0, RAFT.front)

// ripples (ripples.js): where the paddle, wake and landings put their rings.
export function createRaft(ripples) {
  const { group, hull, held } = buildRaft()
  let boat = null // the shop boat shown instead of the log hull
  let lift = 0 // metres the player + raft are raised to float on the lake
  let t = 0
  let afloat = false
  let wasAfloat = false
  let wasDipping = false
  let wakeClock = 0
  let idleClock = 0
  const p = new Vector3()

  // feetY: the player's feet. stroke: the animator's paddle { yaw, roll, depth }. stand: 0..1 how
  // far the player has stood up to surf (surf.js), sliding: on the slide (no floating).
  // Returns the extra height to add to the player group.
  function update(dt, { feetY, stroke, stand = 0, sliding = false }) {
    t += dt
    const surface = LAKE.y - RAFT.floatDepth
    afloat = !sliding && feetY < surface
    lift += ((afloat ? surface - feetY : 0) - lift) * (1 - Math.exp(-8 * dt))
    const bob = afloat ? Math.sin(t * 1.8) * 0.025 : 0
    group.rotation.z = afloat ? Math.sin(t * 1.3) * 0.02 : 0

    // The stroke turns the paddle about the point between the hands; at rest it sways a little.
    const rest = 1 - (stroke?.depth ?? 0)
    held.rotation.set(
      Math.sin(t * 1.1) * 0.04 * rest,
      (stroke?.yaw ?? 0) + Math.sin(t * 0.7) * 0.05 * rest,
      (stroke?.roll ?? 0) + Math.sin(t * 0.9) * 0.06 * rest,
      'YXZ',
    )
    held.position.copy(HELD_AT)
    if (stand > 0.001) {
      const k = stand * stand * (3 - 2 * stand)
      held.quaternion.slerp(STOWED_Q, k)
      held.position.lerp(STOWED_AT, k)
    }
    return lift + bob
  }

  // After the player group is placed for this frame (world matrices current): rings for the
  // paddle's bite, the wake, idle lapping and a splash on landing in the water.
  function splash(dt, { speed, stroke }) {
    const landed = afloat && !wasAfloat
    wasAfloat = afloat
    if (!afloat) {
      wasDipping = false
      return
    }
    group.updateWorldMatrix(true, true)
    const at = (local, target = group) => target.localToWorld(p.copy(local))
    if (landed) {
      at(BOW)
      ripples.spawn(p.x, p.z, 7, 0.9, 1.8)
      ripples.spawn(p.x, p.z, 4, 0.7, 1.2)
    }

    // The blade bites as the stroke rolls it down into the water, then trails small swirls.
    const dipping = (stroke?.roll ?? 0) > 0.05 && (stroke?.depth ?? 0) > 0.3
    if (dipping && !wasDipping) {
      at(BLADE, held)
      ripples.spawn(p.x, p.z, 3, 1, 1.2)
    }
    wasDipping = dipping

    const pace = Math.min(1, speed / PHYSICS.moveSpeed)
    wakeClock -= dt
    if (pace > 0.15 && wakeClock <= 0) {
      wakeClock = RIPPLES.wakeEvery / pace
      for (const s of STERN) {
        at(s)
        ripples.spawn(p.x, p.z, 2 + 2.5 * pace, 0.85 * pace, 1.6)
      }
      at(BOW)
      ripples.spawn(p.x, p.z, 1.6 + 1.4 * pace, 0.6 * pace, 0.9)
    }
    idleClock -= dt
    if (pace < 0.15 && idleClock <= 0) {
      idleClock = RIPPLES.idleEvery
      group.getWorldPosition(p)
      ripples.spawn(p.x, p.z, 4.6, 0.45, 2.6)
    }
  }

  // Paddle a Kayak Shop boat instead of the logs ('raft' brings the logs back).
  function setBoat(id) {
    if (boat) {
      group.remove(boat)
      boat.traverse((o) => {
        o.geometry?.dispose()
        if (o.material?.map) o.material.map.dispose() // painted hulls; plain plastic() materials are shared
      })
    }
    boat = id === 'raft' ? null : kayakModel(id)
    hull.visible = !boat
    if (boat) group.add(boat)
  }

  return { group, update, splash, setBoat }
}
