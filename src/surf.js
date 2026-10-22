// Surfing down the silver lane. It is the only way into that lane (slide.js walls off its foot):
// surfDown() (the HUD's Surf! button) starts the ride mid-slide from wherever the raft is. The raft
// hops sideways over the rails into the silver lane while spinning round to face downhill, the
// player stands into the surf stance, and it surfs down under gravity, friction and drag. A/D carve
// across the lane (the rails knock it back), W tucks, S brakes. At the foot it slams onto the flat:
// the nose digs in, the body is thrown forward, water explodes, the camera jolts, and it skids to a
// stop within SURF.stopDistance; the player sits back down and paddles on.
// While a ride runs, step() replaces player.js's step; main.js applies `pose` (tilt on the slope,
// touchdown kick, chatter) to the player group and passes `body` to the animator and raft.
import { Vector3 } from 'three'
import { PHYSICS, RAFT, SURF } from './config.js'
import { LANES, POOL, SLIDE, slideSurfaceAt } from './hub/layout.js'
import { player } from './player.js'
import { inputState } from './input.js'
import { setSurfSpeed, setSurfView, shake } from './camera.js'
import { sfx } from './sfx.js'

const LANE = LANES.find((l) => l.id === 'silver')
const G = -PHYSICS.gravity
const SIN = Math.sin(SLIDE.angle)
const COS = Math.cos(SLIDE.angle)
const ROOM = SLIDE.lane / 2 - SURF.raftHalfWidth // the raft centre's play either side of the lane centre
const FULL = SURF.fullSpeed
// Terminal speed down the slope, and the metres a ride from rest covers in SURF.longRide s at it
// (less the ~Vt / 2a s spent getting up to speed): rides from further up are warped to fit.
const TERMINAL = Math.sqrt((G * (SIN - SURF.friction * COS)) / SURF.drag)
const LONG_RIDE = TERMINAL * (SURF.longRide - TERMINAL / (2 * G * SIN))
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const smooth = (t) => t * t * (3 - 2 * t)
const lerpRange = ([a, b]) => a + (b - a) * Math.random()

// Raft-local spray sources: the bow, the sides' leading half and the stern corners.
const BACK = RAFT.front - RAFT.logs * RAFT.logRadius * 2
const HALF_W = RAFT.logLength / 2
const SOURCES = [
  [0, 0.15, RAFT.front, 0],
  [-HALF_W, 0.1, RAFT.front - 0.6, -1],
  [HALF_W, 0.1, RAFT.front - 0.6, 1],
  [-HALF_W, 0.1, BACK + 0.3, -1],
  [HALF_W, 0.1, BACK + 0.3, 1],
]

// spray (spray.js), ripples (ripples.js), raft: the raft group (its world matrix places the spray).
export function createSurf({ spray, ripples, raft }) {
  const st = {
    phase: 'off', // turn | descent | skid | settle
    lane: LANE, // the lane being ridden (its rails bound the carve)
    shiftFrom: 0, // x at the start of the hop into the silver lane (Surf! from another lane)
    shifting: false,
    t: 0, // time in this phase
    s: 0, // metres along the slope from the foot
    v: 0, // m/s along the slope, + uphill
    x: 0,
    u: 0, // m/s across the lane
    heading: Math.PI, // the raft's base yaw (south descending)
    turnFrom: 0,
    turnBy: Math.PI, // signed angle the spin turns through
    landSpeed: 0,
    from: new Vector3(), // touchdown point
    dirX: 0,
    dirZ: 1,
    lean: 0,
    best: 0, // highest point up the slope this ride (m), for the HUD
    warp: 1, // metres covered per metre of speed (> 1 only on a long ride from km up)
  }
  const body = { stand: 0, crouch: 0, lean: 0, brace: 0, jolt: 0, chatter: 0 } // animator input
  const pose = { pitch: 0, roll: 0, lift: 0 } // the player group's tilt and hop
  let clock = 0
  let sinceTouch = 99
  let emitDebt = 0
  let speed01 = 0
  const tmp = new Vector3()
  const side = new Vector3()

  function setPhase(phase) {
    st.phase = phase
    st.t = 0
  }

  // Surf! from where the raft is on the slide: hop over into the silver lane while spinning round to
  // face downhill, stand, and surf down it. False when not on the slide or already riding.
  function surfDown() {
    const p = player.position
    const up = SLIDE.footZ - p.z
    if (st.phase !== 'off' || up < 1 || Math.abs(p.x) > SLIDE.innerHalf) return false
    st.lane = LANE
    st.s = up / COS
    st.v = Math.min(0, -player.velocity.z / COS) // keep any slide back down it already had
    st.x = p.x
    st.shiftFrom = p.x
    st.shifting = Math.abs(p.x - LANE.x) > ROOM // outside the silver lane: hop across into it
    st.u = 0
    st.best = st.s
    st.warp = Math.max(1, st.s / LONG_RIDE)
    st.lean = 0
    Object.assign(body, { stand: 0, crouch: 0, lean: 0, brace: 0, chatter: 0 })
    setSurfView(true)
    shake(0.2)
    sfx.startLoops()
    const facing = wrap(player.facing)
    if (Math.abs(facing) < 0.6 && !st.shifting) {
      st.heading = facing
      setPhase('descent')
    } else {
      st.turnFrom = facing
      st.turnBy = -facing // the short way round to face south (downhill)
      setPhase('turn')
      sfx.spin()
    }
    return true
  }

  // Along the slope: gravity, friction and drag (W tucks, S brakes).
  function slope(dt) {
    const tuck = inputState.move.z > 0.1 ? SURF.tuckDrag : inputState.move.z < -0.1 ? SURF.brakeDrag : 1
    const dir = st.v >= 0 ? 1 : -1
    st.v += (-G * SIN - dir * (SURF.friction * G * COS + SURF.drag * tuck * st.v * st.v)) * dt
    st.s += st.v * dt * st.warp
    st.best = Math.max(st.best, st.s)
  }

  // Across the lane: carving from A/D (relative to the way the raft faces), the water's drift,
  // damping, and the rails.
  function lateral(dt, steer = 1) {
    const rightX = -Math.cos(st.heading) // the raft's right, in world X
    const drift = SURF.wobble * speed01 * (Math.sin(clock * 1.3) * 0.6 + Math.sin(clock * 2.9 + 1) * 0.4)
    const accel = inputState.move.x * rightX * SURF.carveAccel * steer + drift
    st.u += accel * dt
    st.u *= Math.exp(-SURF.carveDamping * dt)
    st.x += st.u * dt
    const off = st.x - st.lane.x
    if (Math.abs(off) > ROOM) {
      const sgn = Math.sign(off)
      st.x = st.lane.x + sgn * ROOM
      if (st.u * sgn > 0) {
        const hit = Math.abs(st.u)
        st.u = -st.u * SURF.railBounce
        if (hit > 1.2) knock(sgn, hit)
      }
    }
    st.lean += (clamp(inputState.move.x * steer, -1, 1) * Math.min(1, speed01 * 1.5) - st.lean) * (1 - Math.exp(-5 * dt))
  }

  function knock(sgn, hit) {
    const k = clamp(hit / 6, 0, 1)
    sfx.bump(k)
    shake(0.15 + 0.3 * k)
    const raftSide = sgn * Math.sign(Math.cos(st.heading) || 1) // world side -> the raft's own ±X
    burst(Math.round(10 + 25 * k), { from: raftSide < 0 ? [1, 3] : [2, 4], up: [2, 5], out: [2, 5], back: 0.5, size: [0.25, 0.55], life: [0.4, 0.8] })
  }

  function touchdown() {
    st.landSpeed = Math.abs(st.v)
    const k = clamp(st.landSpeed / FULL, 0.25, 1)
    st.from.set(st.x, 0, SLIDE.footZ)
    const h = Math.atan2(st.u, st.landSpeed * COS) // the slide's heading (south) bent by the carve
    st.dirX = Math.sin(h)
    st.dirZ = Math.cos(h)
    st.s = 0
    st.v = -st.landSpeed
    player.position.z = SLIDE.footZ // this frame's placement is the skid's; start it at the foot
    sinceTouch = 0
    setPhase('skid')
    sfx.impact(k)
    shake(0.75 + 0.25 * k)
    body.jolt = 9 + 9 * k // forward throw (rad/s into the animator's spring)
    burst(Math.round(120 + 90 * k), { from: [0, 1, 2], up: [5, 12], out: [3, 9], back: 0.12, forward: 7 * k, size: [0.5, 1.2], life: [0.9, 1.6], ring: true })
    ripples.spawn(st.x, SLIDE.footZ + 2, 11, 1, 1.8, POOL.waterY)
    ripples.spawn(st.x, SLIDE.footZ + 2, 6, 0.9, 1.1, POOL.waterY)
  }

  function finish() {
    const p = player.position
    p.x = st.x
    p.z = st.from.z + st.dirZ * SURF.stopDistance
    p.y = 0
    player.velocity.x = player.velocity.y = player.velocity.z = 0
    player.facing = st.heading
    setPhase('off')
    setSurfView(false)
    setSurfSpeed(0)
    sfx.stopLoops()
    Object.assign(body, { stand: 0, crouch: 0, lean: 0, brace: 0, chatter: 0 })
    Object.assign(pose, { pitch: 0, roll: 0, lift: 0 })
  }

  // One frame of the ride (instead of player.js's step).
  function step(dt) {
    if (st.phase === 'off' || dt <= 0) return
    clock += dt
    st.t += dt
    sinceTouch += dt
    const p = player.position

    if (st.phase === 'turn') {
      slope(dt)
      const k = Math.min(1, st.t / SURF.turnTime)
      if (st.shifting) {
        // Sideways hop into the silver lane over the rails and dividers; splash down at the end.
        const x = st.shiftFrom + (LANE.x - st.shiftFrom) * smooth(k)
        st.u = (x - st.x) / dt
        st.x = x
        if (k >= 1) {
          st.shifting = false
          st.u = 0
          sfx.bump(0.6)
          shake(0.3)
          burst(40, { from: [1, 2, 3, 4], up: [2, 5], out: [2, 6], back: 0.3, size: [0.35, 0.8], life: [0.5, 1] })
        }
      } else lateral(dt, 0.3)
      st.heading = st.turnFrom + st.turnBy * smooth(k)
      if (st.t >= SURF.turnTime) {
        st.heading = wrap(st.heading)
        setPhase('descent')
      }
    } else if (st.phase === 'descent') {
      slope(dt)
      lateral(dt)
      if (st.s <= 0) touchdown()
    } else if (st.phase === 'skid') {
      // Constant-jerk stop: leaves the slide at landing speed, eases to rest at stopDistance.
      const T = clamp((3 * SURF.stopDistance) / Math.max(st.landSpeed, 3), 0.2, 1.2)
      const tau = Math.min(1, st.t / T)
      const d = SURF.stopDistance * (1 - (1 - tau) ** 3)
      st.u *= Math.exp(-9 * dt)
      st.x += st.u * dt
      p.x = st.x
      p.z = st.from.z + st.dirZ * d
      st.v = -st.landSpeed * (1 - tau) ** 2 // what is left of the speed, for the effects
      if (tau >= 1) setPhase('settle')
    } else if (st.phase === 'settle' && st.t >= SURF.settleTime) {
      finish()
      return
    }

    // Place the player.
    const sliding = st.phase === 'turn' || st.phase === 'descent'
    if (sliding) {
      p.x = st.x
      p.z = SLIDE.footZ - st.s * COS
      p.y = slideSurfaceAt(p.z)
      player.velocity.x = st.u
      player.velocity.y = st.v * SIN
      player.velocity.z = -st.v * COS
    } else {
      p.y = 0
      player.velocity.x = st.u
      player.velocity.y = 0
      player.velocity.z = st.phase === 'skid' ? -st.v * st.dirZ : 0
    }
    player.grounded = true
    speed01 = clamp(Math.abs(st.v) / FULL, 0, 1)

    // Nose follows the carve once there is speed to carve with.
    const carving = smooth(clamp((Math.abs(st.v) - 2) / 8, 0, 1)) * (sliding && st.phase !== 'turn' ? 1 : 0)
    const toward = Math.atan2(st.u, -st.v * COS) // direction of travel
    player.facing = st.heading + clamp(wrap(toward - st.heading), -0.35, 0.35) * carving

    // Body: stand from the spin until the stop, crouch with speed and tuck.
    const standing = st.phase === 'turn' || st.phase === 'descent' || (st.phase === 'skid')
    body.stand = standing ? 1 : 0
    body.crouch = clamp(speed01 * 0.8 + (inputState.move.z > 0.1 ? 0.35 : 0) + (st.phase === 'skid' ? 0.4 : 0), 0, 1)
    body.lean = st.lean
    body.chatter = sliding ? speed01 : 0

    // Group tilt: lie on the slope (pitch/roll from the heading), bank into carves, chatter, and
    // the touchdown kick (nose digs in, rocks back) with a hop.
    const yaw = player.facing
    const onSlope = sliding ? 1 : 0
    const chatter = SURF.chatter * speed01 * onSlope
    const kick = sinceTouch < 2 ? 0.2 * Math.exp(-6 * sinceTouch) * Math.cos(19 * sinceTouch) : 0
    pose.pitch = SLIDE.angle * Math.cos(yaw) * onSlope + kick + chatter * Math.sin(clock * 47) * Math.sin(clock * 13)
    pose.roll = SLIDE.angle * Math.sin(yaw) * onSlope + st.lean * 0.09 + chatter * Math.sin(clock * 39 + 1)
    pose.lift = sinceTouch < 2 ? 0.28 * Math.exp(-5 * sinceTouch) * Math.abs(Math.sin(15 * sinceTouch)) : 0
    if (st.shifting) pose.lift += SURF.shiftHop * Math.sin(Math.PI * Math.min(1, st.t / SURF.turnTime)) // clears the rails

    setSurfSpeed(speed01, SLIDE.angle * Math.cos(st.heading) * onSlope)
    sfx.setSpeed(speed01, dt, true)
  }

  // A burst of droplets from SOURCES[from], flying up/out (m/s ranges), carried by the raft's
  // velocity (scaled by `back`: < 1 lags them behind), `forward` m/s along the touchdown heading,
  // `ring`: thrown all round instead of out of the sides.
  function burst(n, { from, up, out, back = 0.6, forward = 0, size, life, ring = false }) {
    raft.updateWorldMatrix(true, false)
    // Carried along by the raft's horizontal motion; never thrown downward (it would vanish into the slide).
    const vx = player.velocity.x * back
    const vy = Math.max(0, player.velocity.y) * back
    const vz = player.velocity.z * back
    for (let i = 0; i < n; i++) {
      const src = SOURCES[from[i % from.length]]
      tmp.set(src[0], src[1], src[2] - Math.random() * 0.5)
      raft.localToWorld(tmp)
      let ox
      let oz
      if (ring) {
        const a = Math.random() * Math.PI * 2
        ox = Math.cos(a)
        oz = Math.sin(a)
      } else {
        side.set(src[3] || (Math.random() - 0.5) * 2, 0, 0).transformDirection(raft.matrixWorld)
        ox = side.x
        oz = side.z
      }
      const o = lerpRange(out)
      spray.spawn(
        tmp.x, tmp.y, tmp.z,
        vx + ox * o + st.dirX * forward * Math.random() + (Math.random() - 0.5),
        vy + lerpRange(up),
        vz + oz * o + st.dirZ * forward * Math.random() + (Math.random() - 0.5),
        lerpRange(life),
        lerpRange(size),
      )
    }
  }

  // After the player group is placed this frame: the steady spray, scaled by speed.
  function effects(dt) {
    if (st.phase === 'off' || st.phase === 'settle') return
    emitDebt += SURF.spray.rate * speed01 * speed01 * dt
    const n = Math.floor(emitDebt)
    if (n <= 0) return
    emitDebt -= n
    const sliding = st.phase !== 'skid'
    burst(n, {
      from: sliding ? [0, 1, 2, 1, 2, 3, 4] : [0, 1, 2],
      up: [1.2, 3.5 + 3 * speed01],
      out: [1.5, 3 + 4 * speed01],
      back: 0.55,
      size: SURF.spray.size,
      life: SURF.spray.life,
    })
  }

  return {
    body,
    pose,
    surfDown,
    step,
    effects,
    get active() {
      return st.phase !== 'off'
    },
    get sliding() {
      return st.phase === 'turn' || st.phase === 'descent'
    },
    get speed01() {
      return st.phase === 'off' ? 0 : speed01
    },
    get best() {
      return st.best
    },
  }
}
