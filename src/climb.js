// Paddling up the slide (the blue or VIP lane's auto-climb, or any raft on the slide that is not surfing).
// The raft lies on the slope and answers every stroke: it rolls toward the paddle as the blade
// bites, the bow swings away from the stroke and lifts, and it lunges on the pull and sags back on
// the recovery (the climb speed pulses, stamina.js sets the average). The paddler leans into the
// slope with effort and tires as stamina runs low (animator `climb`). Each stroke splashes and is
// heard (catch, pull, drips; creaks; breathing once tired); the lane's water piles up against the
// bow in a small wave and gurgles under the raft.
// update() runs after stamina.js each frame (it scales player.moveSpeed for the next step) and
// gives `pose` for the player group; effects() runs once the group is placed.
import { Vector3 } from 'three'
import { ANIM, CLIMB, RAFT, STAMINA } from './config.js'
import { SLIDE, slideSurfaceAt } from './hub/layout.js'
import { player } from './player.js'
import { shake } from './camera.js'
import { sfx } from './sfx.js'

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const rnd = (a, b) => a + (b - a) * Math.random()
const BLADE = new Vector3(-RAFT.logLength / 2 - 0.9, 0.12, 0.6) // raft-local: the paddle works on the player's right (-X)
const BOW = RAFT.front

// spray (spray.js), raft: the raft group (its world matrix places the droplets).
export function createClimb({ spray, raft }) {
  const pose = { pitch: 0, roll: 0, yaw: 0, lift: 0 }
  const body = { effort: 0, tired: 0, steer: 0 } // animator input while climbing (steer: -1 left .. 1 right)
  let onSlope = 0 // eased 0..1: lying on the slide
  let climbing = false
  let pace = 0 // 0..1 of the full climb speed
  let wasDipping = false
  let lastCatch = 0
  let cycle = 0.7 // s between catches, measured
  let clock = 0
  let bowDebt = 0
  let breathClock = 0
  let exhaled = true
  const p = new Vector3()
  const dir = new Vector3()
  const across = new Vector3()

  // stroke: the animator's { yaw, roll, depth }; stamina: points left; climbingLane: auto-climbing;
  // surfing: surf.js owns the raft (the climb lets go and goes quiet).
  function update(dt, { stroke, stamina, climbingLane, surfing = false }) {
    clock += dt
    const pos = player.position
    const up = SLIDE.footZ - pos.z
    const onSlide = !surfing && Math.abs(pos.x) <= SLIDE.innerHalf && up > 0.3 && Math.abs(pos.y - slideSurfaceAt(pos.z)) < 0.5
    onSlope += ((onSlide ? 1 : 0) - onSlope) * (1 - Math.exp(-10 * dt))
    climbing = climbingLane
    const speed = Math.hypot(player.velocity.x, player.velocity.z)
    pace = clamp(speed / STAMINA.climbSpeed, 0, 1)
    body.effort = climbing ? clamp(0.3 + 0.7 * pace, 0, 1) : 0
    body.tired = climbing ? clamp(1 - stamina / CLIMB.tiredBelow, 0, 1) : 0
    body.steer = climbing ? clamp(player.climbTurn / STAMINA.steerAngle, -1, 1) : 0 // the raft faces up the slide: + = its right

    // Stroke response: the blade's dip (roll > 0 pulling, < 0 recovering) rocks and steers the raft.
    const dip = stroke?.roll ?? 0
    const pull = clamp(dip / ANIM.paddle.dip, 0, 1)
    const yaw = player.facing
    pose.pitch = SLIDE.angle * Math.cos(yaw) * onSlope - CLIMB.bowLift * pull * onSlope
    pose.roll = SLIDE.angle * Math.sin(yaw) * onSlope + CLIMB.rock * dip + CLIMB.bank * body.steer * onSlope // banks into a turn
    pose.yaw = CLIMB.yaw * dip * onSlope
    pose.lift = CLIMB.heave * pull * onSlope
    // Lunge on the pull, sag on the recovery (zero on average over a stroke).
    if (climbing) player.moveSpeed *= 1 + CLIMB.surge * (pull * 2.6 - 1) * (stroke?.depth ?? 0)

    // Each catch: the stroke's sounds, sometimes a creak, and a breath once tiring.
    const dipping = dip > 0.05 && (stroke?.depth ?? 0) > 0.3
    if (dipping && !wasDipping && onSlope > 0.5) {
      cycle = clamp(clock - lastCatch, 0.4, 2)
      lastCatch = clock
      const power = (stroke?.depth ?? 0) * (0.55 + 0.45 * body.effort) * (1 - 0.4 * body.tired)
      sfx.paddle(power, cycle * 0.45, body.steer)
      if (Math.random() < 0.3 + 0.3 * body.effort) sfx.creak(0.5 + 0.5 * body.effort)
      if (body.tired > 0.15) {
        sfx.breath('out', body.tired)
        exhaled = true
        breathClock = cycle * 0.55 // breathe in on the recovery
      }
      splash()
    }
    wasDipping = dipping

    // A rail knock (player.js): a woody thud and a slap of water up the side that hit, and a jolt.
    if (player.climbBump > 0) {
      const k = player.climbBump
      player.climbBump = 0
      sfx.bump(0.3 + 0.7 * k)
      shake(0.1 + 0.25 * k)
      railSplash(Math.sign(pos.x - player.climbX) || 1, k) // the rail on the side the raft has drifted to
    }
    // Inhales between strokes; spent and stopped, panting on its own rhythm.
    breathClock -= dt
    if (climbing && body.tired > 0.15 && breathClock <= 0) {
      const panting = pace < 0.1
      if (exhaled && body.tired > 0.35) {
        sfx.breath('in', body.tired)
        exhaled = false
        breathClock = panting ? rnd(0.35, 0.5) : 99
      } else if (panting) {
        sfx.breath('out', body.tired)
        exhaled = true
        breathClock = rnd(0.3, 0.45)
      } else breathClock = 99
    }

    sfx.setClimb(onSlope, pace, dt)
  }

  // Water slapped up the raft's side against a rail. worldSide: which way (world X) the rail is.
  function railSplash(worldSide, k) {
    raft.updateWorldMatrix(true, false)
    across.set(1, 0, 0).transformDirection(raft.matrixWorld)
    const local = Math.sign(across.x) === worldSide ? 1 : -1 // the raft-local side facing that rail
    for (let i = 0; i < 8 + 18 * k; i++) {
      p.set(local * RAFT.logLength / 2, 0.1, rnd(-1.4, 1.2))
      raft.localToWorld(p)
      const out = rnd(0.3, 1.2)
      spray.spawn(p.x, p.y, p.z, -across.x * local * out + rnd(-0.4, 0.4), rnd(1.5, 3.5 + 2 * k), -across.z * local * out + rnd(-0.4, 0.4), rnd(0.4, 0.8), rnd(0.15, 0.35))
    }
  }

  // The blade biting in: a fan of droplets thrown up and out on the paddle side.
  function splash() {
    raft.updateWorldMatrix(true, false)
    p.copy(BLADE)
    raft.localToWorld(p)
    dir.set(-1, 0, 0).transformDirection(raft.matrixWorld)
    for (let i = 0; i < 10; i++) {
      const out = rnd(0.4, 1.6)
      spray.spawn(p.x + rnd(-0.2, 0.2), p.y, p.z + rnd(-0.2, 0.2), dir.x * out + rnd(-0.5, 0.5), rnd(1.4, 3.4), dir.z * out + rnd(-0.5, 0.5), rnd(0.35, 0.7), rnd(0.12, 0.3))
    }
  }

  // After the player group is placed: the bow wave, heavier the faster the climb (the lane's water
  // still breaks on the bow when the raft is holding still).
  function effects(dt) {
    if (onSlope < 0.5) return
    bowDebt += CLIMB.bowSpray * (0.15 + 0.85 * pace) * dt
    const n = Math.floor(bowDebt)
    if (n <= 0) return
    bowDebt -= n
    raft.updateWorldMatrix(true, false)
    dir.set(0, 0, 1).transformDirection(raft.matrixWorld)
    across.set(1, 0, 0).transformDirection(raft.matrixWorld)
    // Steering, the water piles up on the side the raft is crabbing into (its right is local -X).
    const lead = -Math.sign(body.steer)
    const crab = Math.abs(body.steer)
    for (let i = 0; i < n; i++) {
      let lx = rnd(-0.8, 0.8)
      if (Math.random() < crab * 0.6) lx = lead * rnd(0.3, 0.9)
      p.set(lx, 0.1, BOW - (lx * lead > 0 ? rnd(0, 1.2) * crab : 0))
      raft.localToWorld(p)
      const fling = Math.sign(lx) * rnd(0.5, 1.8) * (0.4 + pace) * (lx * lead > 0 ? 1 + crab : 1) // out to the side it broke on
      spray.spawn(
        p.x, p.y, p.z,
        dir.x * player.moveSpeed * 0.25 + across.x * fling,
        rnd(0.6, 1.6 + 1.6 * pace),
        dir.z * player.moveSpeed * 0.25 + across.z * fling,
        rnd(0.3, 0.6),
        rnd(0.12, 0.28),
      )
    }
  }

  return {
    pose,
    body,
    update,
    effects,
    get climbing() {
      return climbing
    },
  }
}
