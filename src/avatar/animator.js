// Procedural seated-paddler animator. The player never walks: they sit on the raft (raft.js)
// holding the paddle, and moving drives a one-bladed stroke whose phase advances with distance
// travelled and whose depth eases in with speed. `stroke` (paddle yaw/roll) is published for
// raft.js to turn the held paddle with; the arms and torso follow it here. Surfing (surf.js passes
// `surf`) blends into the standing surf stance (ANIM.surf): crouch with speed, bank into carves
// with the arms see-sawing for balance, a lean-back brace while climbing seated, and a damped
// jolt spring that throws the body forward on the touchdown slam. Climbing the slide (`climb`,
// climb.js) leans into the slope with effort and slumps, pants and paddles raggedly when tired;
// steering there turns the stroke into a wide sweep (left) or a deep draw (right) and leans the
// body and head into the turn. playEmote(id) dances a Kayak Shop emote (avatar/emotes.js) with the
// torso, head and arms over the seated pose for KAYAK_SHOP.emoteTime s, fading in and out
// (`emoteWeight`, which main.js also hands raft.js to lay the paddle down); paddling off, surfing
// or climbing cuts it short. Writes only to bones and the
// avatar root's position.y (the player group owns world placement).
import { ANIM, KAYAK_SHOP } from '../config.js'
import { PlayerRig, PoseBuffer } from './rig.js'
import { emotePose } from './emotes.js'

const TAU = Math.PI * 2
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
const ease = (t) => t * t * (3 - 2 * t)
const smoothstep = (e0, e1, v) => ease(clamp((v - e0) / (e1 - e0 || 1), 0, 1))

const S = ANIM.seated
const P = ANIM.paddle
const U = ANIM.surf
const C = ANIM.climb
const EMOTE_STOP = 1.2 // m/s: paddling off faster than this ends an emote

export function makeAnimator(root) {
  if (!root) return null
  return new PlayerAnimator(root)
}

export function disposeAnimator(animator) {
  animator?.dispose()
}

class PlayerAnimator {
  constructor(root) {
    this.root = root
    this.rig = new PlayerRig(root)
    this.pose = new PoseBuffer()
    this.stance = new PoseBuffer()
    this.stand = 0 // 0 seated .. 1 standing in the surf stance
    this.jolt = 0 // forward throw of the upper body (rad), a damped spring
    this.joltVel = 0
    this.time = 0
    this.breathPhase = 0
    this.phase = 0 // stroke cycle: 0 = catch (blade forward), PI = exit (blade back)
    this.depth = 0 // 0 = paddle resting across the body, 1 = full stroke
    this.airTime = 0
    this.stroke = { yaw: 0, roll: 0, depth: 0 } // read by raft.js
    this.emote = null // { id, t } while an emote plays
    this.emoteWeight = 0 // 0..1 blend of the emote over the seated pose
    this.emoteBuf = new PoseBuffer()
    this.emoteParts = {}
  }

  // Play a Kayak Shop emote (config KAYAK_SHOP.emotes) from the start.
  playEmote(id) {
    this.emote = { id, t: 0 }
  }

  dispose() {
    this.rig.resetToBindPose()
    this.root.position.y = 0
  }

  // input: { grounded, speed, surf?, climb? }; surf: { stand, crouch, lean, brace, jolt, chatter }
  // (surf.js), all 0..1 except lean (-1..1); jolt is an impulse, consumed here. climb: { effort,
  // tired } 0..1 (climb.js).
  update(dt, input) {
    if (!(dt > 0)) return
    this.time += dt
    const surf = input.surf

    // Airborne past a step-down (a jump, a drop off the island): the paddle stops.
    this.airTime = input.grounded ? 0 : this.airTime + dt
    const airborne = this.airTime > ANIM.airborneDelay

    // Climbing the slide the paddle is what moves the raft, so it strokes in full however slowly
    // it goes (a spent climber crawls at STAMINA.emptySpeed; `tired` shortens the strokes instead).
    const goal = airborne || surf || this.emote ? 0 : input.climb ? 1 : smoothstep(P.idleSpeed, P.fullSpeed, input.speed)
    this.depth += (goal - this.depth) * (1 - Math.exp(-P.ease * dt))
    if (this.depth > 0.01) {
      const frequency = clamp(input.speed / P.distancePerStroke, P.minFrequency, P.maxFrequency)
      this.phase = (this.phase + frequency * TAU * dt) % TAU
    }
    const effort = input.climb?.effort ?? 0
    const tired = input.climb?.tired ?? 0
    const steer = input.climb?.steer ?? 0
    const left = Math.max(0, -steer)
    const right = Math.max(0, steer)
    const reachScale = 1 + C.strokeGain * effort - C.strokeLoss * tired
    const sweepScale = reachScale * (1 + C.sweepWide * left - C.sweepShort * right)
    const dipScale = reachScale * (1 + C.drawDip * right - C.sweepDip * left)
    const s = Math.sin(this.phase)
    const yaw = P.sweep * Math.cos(this.phase) * this.depth * sweepScale
    const roll = (P.dip * Math.max(0, s) - P.lift * Math.max(0, -s)) * this.depth * dipScale
    this.stroke.yaw = yaw
    this.stroke.roll = roll
    this.stroke.depth = this.depth

    const pose = this.pose
    this.breathPhase = (this.breathPhase + S.breathFrequency * (1 + C.breathRate * tired) * TAU * dt) % TAU
    const breath = Math.sin(this.breathPhase) * (1 + C.breathDepth * tired)
    pose.applyDefinition(S.basePose)
    // Torso turns and leans with the paddle; the arms make up the rest so the hands stay on
    // the shaft (left hand rises and goes back as the blade dips and swings forward).
    pose.add('Spine1', breath * S.breathAmount, yaw * P.torsoTwist, roll * P.torsoLean)
    pose.add('Neck1', -breath * S.breathAmount * 0.6, -yaw * P.torsoTwist * 0.6, -roll * P.torsoLean)
    const reach = P.armReach * (-Math.sin(roll) * (1 - P.torsoLean) + Math.sin(yaw) * (1 - P.torsoTwist))
    pose.add('ArmL1', reach)
    pose.add('ArmR1', -reach)
    pose.bobY = S.bobY + breath * S.breathBob
    if (input.climb) {
      // Into the slope with effort; tired, the back rounds, the head drops while the blade is out of
      // the water, and each breath lifts the shoulders.
      const resting = 1 - this.depth
      const gasp = Math.max(0, breath) * tired
      pose.add('Spine1', C.lean * effort + C.slump * tired)
      pose.add('Neck1', -C.lookUp * effort * (1 - tired) + C.droop * tired * (0.4 + 0.6 * resting))
      pose.add('ArmL1', -C.heave * gasp, 0, -C.heave * gasp * 0.5)
      pose.add('ArmR1', -C.heave * gasp, 0, C.heave * gasp * 0.5)
      // Into the turn: lean and twist the trunk toward it, look where the bow is going.
      pose.add('Spine1', 0, -steer * C.steerTwist, steer * C.steerLean)
      pose.add('Neck1', 0, -steer * C.steerLook, -steer * C.steerLean * 0.5)
    }

    // Emote: torso, head and arms dance over the seated pose (legs stay put).
    const em = this.emote
    if (em) {
      em.t += dt
      if (input.speed > EMOTE_STOP || surf || input.climb) em.t = Math.max(em.t, KAYAK_SHOP.emoteTime)
    }
    const want = em && em.t < KAYAK_SHOP.emoteTime ? 1 : 0
    this.emoteWeight += (want - this.emoteWeight) * (1 - Math.exp(-8 * dt))
    if (em && !want && this.emoteWeight < 0.01) this.emote = null
    if (this.emote && this.emoteWeight > 0.001) {
      const e = emotePose(em.id, em.t, this.emoteParts)
      const b = this.emoteBuf
      b.copyFrom(pose)
      b.set('ArmL1', ...e.armL)
      b.set('ArmR1', ...e.armR)
      b.set('ArmL2', 0)
      b.set('ArmR2', 0)
      b.add('Spine1', ...e.torso)
      b.add('Neck1', ...e.head)
      pose.lerpBetween(pose, b, ease(clamp(this.emoteWeight, 0, 1)))
    }

    // Jolt spring (stiff, well damped): the slam throws the body forward and it rocks back.
    if (surf?.jolt) {
      this.joltVel += surf.jolt
      surf.jolt = 0
    }
    this.joltVel += (-160 * this.jolt - 14 * this.joltVel) * dt
    this.jolt += this.joltVel * dt

    this.stand += ((surf?.stand ?? 0) - this.stand) * (1 - Math.exp(-U.standEase * dt))
    if (surf) {
      pose.add('Spine1', -U.brace * (surf.brace ?? 0)) // leaning back into the climb
      pose.add('Neck1', U.brace * 0.6 * (surf.brace ?? 0))
    }
    if (this.stand > 0.002) {
      this.surfStance(surf, breath)
      pose.lerpBetween(pose, this.stance, ease(clamp(this.stand, 0, 1)))
    }
    pose.add('Spine1', this.jolt)
    pose.add('Neck1', -this.jolt * 0.5)
    pose.add('ArmL1', -this.jolt * 1.2)
    pose.add('ArmR1', -this.jolt * 1.2)

    this.rig.applyPose(pose)
    this.root.position.y = pose.bobY
  }

  // The standing surf stance into this.stance, from the live surf input.
  surfStance(surf, breath) {
    const st = this.stance
    const crouch = surf?.crouch ?? 0
    const lean = surf?.lean ?? 0
    const chatter = surf?.chatter ?? 0
    const t = this.time
    st.applyDefinition(U.basePose)
    const c = U.crouch
    st.add('LegL1', c.LegL1 * crouch)
    st.add('LegR1', c.LegR1 * crouch)
    st.add('LegL2', c.LegL2 * crouch)
    st.add('LegR2', c.LegR2 * crouch)
    st.add('Spine1', c.Spine1 * crouch + breath * S.breathAmount)
    // Bank into the carve; the knees take it unevenly; the arms see-saw against it and flutter.
    st.add('Rig1', 0, 0, lean * U.lean)
    st.add('LegL1', lean * U.lean * 0.5)
    st.add('LegR1', -lean * U.lean * 0.5)
    const flutter = Math.sin(t * 2.3) * 0.5 + Math.sin(t * 3.7) * 0.5
    st.add('ArmL1', 0, 0, -lean * U.armSwing + flutter * 0.08 + chatter * Math.sin(t * 31) * 0.05)
    st.add('ArmR1', 0, 0, -lean * U.armSwing - flutter * 0.08 + chatter * Math.sin(t * 27) * 0.05)
    st.add('Neck1', 0, -lean * U.lean * 0.4)
    // Legs soak up the slide's chatter.
    const buzz = chatter * (Math.sin(t * 41) * 0.6 + Math.sin(t * 57) * 0.4)
    st.add('LegL2', buzz * 0.06)
    st.add('LegR2', buzz * 0.06)
    st.bobY = U.bobY + c.bob * crouch + buzz * 0.008
  }
}
