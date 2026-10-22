// Blue-lane climbing stamina (config STAMINA): in the blue lane the raft paddles itself up the slide
// (player.climb) at a speed set by the stamina left, which drains over `drainTime` s of climbing
// whatever the speed (so faster boats get further); empty, it keeps paddling on up at the slow
// `emptySpeed`. Refills when the player leaves the slide.
// Owns player.moveSpeed and player.climb while climbing and hands them back afterwards.
// Equipped coaches (training.js) and the spin wheel's timed boosts (boosts.js) stretch `drainTime`
// (stamina) and `climbSpeed` (speed); the equipped boat (kayaks.js) adds speed, and Double Speed
// (ridePerks.js, boosts kind 'double') doubles it; so does climbing the VIP lane (config VIP_LANE).
import { PHYSICS, STAMINA } from './config.js'
import { player } from './player.js'
import { training } from './training.js'
import { boosts } from './boosts.js'
import { kayaks } from './kayaks.js'

const { max, drainTime, climbSpeed, emptySpeed } = STAMINA
const drainRate = () => max / (drainTime * training.bonus('stamina') * boosts.mult('stamina')) // points/s

export function createStamina() {
  let value = max
  let lastHeight = 0
  let lastSpeed = climbSpeed // m/s the raft was set to climb at (bonuses included)

  return {
    get value() {
      return value
    },
    // Points back (the stamina boost button, staminaBoost.js), capped at full; returns what was added.
    add(points) {
      const before = value
      value = Math.min(max, value + points)
      return value - before
    },
    // height: metres up the slide (<= 0 off it); climbing: in a ride lane (blue, or VIP once
    // bought), not surfing; laneX: that lane's centre (player.climbX); lane: its speed multiplier
    // (VIP_LANE.speed in the VIP lane).
    update(height, { onSlide, climbing, laneX = 0, lane = 1 }) {
      if (!onSlide) {
        value = max
        lastHeight = 0
      } else {
        // Only climbing time costs stamina: the new height over the speed it was climbed at (no dt
        // needed, and a raft held still, at the top or going back down, costs nothing).
        if (climbing && height > lastHeight) value = Math.max(0, value - (drainRate() * (height - lastHeight)) / lastSpeed)
        if (value < 0.05) value = 0 // spent: the bar reads 0%
        lastHeight = height
      }
      // Speed follows the stamina left, from climbSpeed when full down to emptySpeed when spent (and
      // stays there: an empty raft still climbs, just slowly).
      const speed = emptySpeed + (climbSpeed - emptySpeed) * (value / max)
      player.climb = climbing
      if (climbing) player.climbX = laneX
      lastSpeed = speed * lane * training.bonus('speed') * kayaks.bonus('speed') * boosts.mult('speed') * boosts.mult('double')
      player.moveSpeed = climbing ? lastSpeed : PHYSICS.moveSpeed
    },
  }
}
