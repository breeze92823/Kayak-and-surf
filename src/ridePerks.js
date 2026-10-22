// The blue-lane ride buttons (config RIDE_PERKS) and the Surf! payout.
// Double Speed: costs wins (trophies) a go and doubles the climb speed for a few minutes (boosts.js
// kind 'double', read in stamina.js; the HUD button counts it down and a chip shows under the
// counters). AFK Auto-Play: bought once with coins, then toggles an autopilot: the raft climbs the
// blue lane by itself as usual, surfs down once stamina is spent (or at the top), then paddles back
// across the pool into the lane it last climbed (blue, or VIP) and climbs again. Any steering key turns it off.
// surfDown() is what the Surf! button (and AFK) calls: it starts the surf and pays the visit's
// "You earned:" into the coin counter. In memory only until net.js saves progress.
import { RIDE_PERKS } from './config.js'
import { LANES, SLIDE } from './hub/layout.js'
import { player } from './player.js'
import { inputState } from './input.js'
import { boosts } from './boosts.js'
import { sfx } from './sfx.js'

const BLUE = LANES.find((l) => l.id === 'blue')
const ENTRY_Z = SLIDE.footZ + 2.5 // m south of the slide's foot: AFK lines up here, then paddles straight in
const LINED_UP = 0.4 // m off the blue lane's centre that counts as lined up

// hud (hud/index.js), surf (surf.js).
export function createRidePerks({ hud, surf }) {
  const coinEl = hud.root.querySelector('.hud-counter-coin')
  const trophyEl = hud.root.querySelector('.hud-counter-trophy')
  let afkOwned = false
  let afkOn = false
  let keysWere = false
  let inLane = false // last frame's ride-lane check (blue or VIP), for the payout
  let homeX = BLUE.x // the lane AFK climbs: the last one ridden
  const heading = { x: 0, z: 0 } // player.autoMove while AFK paddles back to the lane

  const pulse = (el) => {
    el?.classList.remove('spend')
    void el?.offsetWidth
    el?.classList.add('spend')
  }

  function setAfk(on) {
    afkOn = on
    if (!on) player.autoMove = null
    hud.set({ afk: !afkOwned ? 'locked' : on ? 'on' : 'off' })
  }

  // Surf! from a ride lane pays what the climb earned.
  function surfDown() {
    const pay = inLane ? hud.get('earned') : 0
    if (!surf.surfDown()) return false
    if (pay > 0) {
      hud.set({ coins: hud.get('coins') + pay })
      pulse(coinEl)
      sfx.coins(Math.min(10, 3 + Math.floor(pay / 100)))
    }
    return true
  }

  hud.on('surf', surfDown)
  hud.on('doubleSpeed', () => {
    const { wins, time, pct } = RIDE_PERKS.doubleSpeed
    const have = hud.get('trophies')
    if (have < wins) {
      hud.refuse('doubleSpeed')
      sfx.denied({})
      return
    }
    hud.set({ trophies: have - wins })
    pulse(trophyEl)
    boosts.add('double', pct, time) // adds on top of what is left
    hud.set({ doubleLeft: boosts.left('double') })
    sfx.levelUp(1)
  })
  hud.on('afk', () => {
    if (!afkOwned) {
      const have = hud.get('coins')
      if (have < RIDE_PERKS.afk.coins) {
        hud.refuse('afk')
        sfx.denied({})
        return
      }
      hud.set({ coins: have - RIDE_PERKS.afk.coins })
      pulse(coinEl)
      sfx.coins(7)
      sfx.levelUp(2)
      afkOwned = true
    }
    setAfk(!afkOn) // a fresh buy switches it straight on
  })

  return {
    surfDown,
    get afk() {
      return afkOn
    },
    // Each frame after the lane check (main.js); sets player.autoMove for the next step.
    // inLane: climbing a ride lane (blue, or VIP once bought) whose centre is laneX; climbed: metres
    // up the slide; stamina: 0..100.
    update({ surfing, inLane: riding, laneX, climbed, stamina }) {
      inLane = riding
      if (riding) homeX = laneX
      hud.set({ doubleLeft: boosts.left('double') }) // the HUD repaints on whole seconds only
      // A steering key pressed (not one already held when it was switched on) takes back control.
      const keys = inputState.move.x !== 0 || inputState.move.z !== 0
      if (afkOn && keys && !keysWere) setAfk(false)
      keysWere = keys
      if (!afkOn) return

      if (surfing) {
        player.autoMove = null
        return
      }
      if (riding) {
        // player.climb paddles it up; surf down once spent (or at the top).
        player.autoMove = null
        if (stamina <= 0 || climbed >= SLIDE.run - 1) surfDown()
        return
      }
      // Off the lane (after the surf's skid): head for the line-up point south of the foot of the
      // lane last climbed (blue, or VIP), then straight north into it.
      const p = player.position
      const dx = homeX - p.x
      if (Math.abs(dx) > LINED_UP) {
        const dz = ENTRY_Z - p.z
        const d = Math.hypot(dx, dz) || 1
        heading.x = dx / d
        heading.z = dz / d
      } else {
        const d = Math.hypot(dx, 1)
        heading.x = dx / d
        heading.z = -1 / d
      }
      player.autoMove = heading
    },
  }
}
