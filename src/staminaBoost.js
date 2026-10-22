// The stamina boost button (config STAMINA_BOOST): while the raft climbs the blue lane (stamina not
// full, AFK off, no centre window open) a round button pops up over it `firstAfter` s into the
// climb and every `every` s after one goes. It stays `showFor` s, counting down (hud/staminaBoost.js);
// it has to be clicked (or tapped; with the mouse captured for looking round, a click anywhere
// counts, as the cursor is hidden) to give back `refill` stamina points (stamina.js add(), so the
// climb speeds straight back up). Leaving the lane, Surf!, the top of the slide or AFK takes it
// away; the next climb starts the timer again.
import { Vector3 } from 'three'
import { STAMINA, STAMINA_BOOST } from './config.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { createStaminaBoostButton } from './hud/staminaBoost.js'

const { showFor, firstAfter, every, refill, above } = STAMINA_BOOST
const nextWait = () => every[0] + Math.random() * (every[1] - every[0])
const WINDOWS = /-open|hatching/ // a centre window is up (.hud.coach-open, .hud.eggs-hatching, ...)

// hud (hud/index.js), stamina (stamina.js).
export function createStaminaBoost({ hud, camera, stamina }) {
  const ui = createStaminaBoostButton(hud.root, { onTap: tap })
  const at = new Vector3()
  let wait = firstAfter // s until the next one, counted only while climbing
  let left = 0 // s the one on screen has left, 0 when none
  let mouseWas = false

  function tap() {
    if (left <= 0) return
    left = 0
    wait = nextWait()
    const added = Math.round(stamina.add(refill))
    ui.hit(added)
    sfx.levelUp(4)
  }

  // Taken away early (left the lane, Surf!, AFK, a window opened).
  function hide() {
    if (left <= 0) return
    left = 0
    ui.hide()
  }

  return {
    get showing() {
      return left > 0
    },
    tap,
    // Each frame after stamina.update (main.js). climbing: in the blue lane short of the top;
    // afk: AFK Auto-Play is driving.
    update(dt, { climbing, afk }) {
      const mouse = inputState.mouse && !!document.pointerLockElement // a click with the cursor captured
      const clicked = mouse && !mouseWas
      mouseWas = mouse
      if (!climbing) {
        hide()
        wait = firstAfter
        return
      }
      if (afk || WINDOWS.test(hud.root.className)) return hide()

      if (left > 0) {
        if (clicked) return tap()
        left -= dt
        if (left <= 0) {
          left = 0
          ui.miss()
          wait = nextWait()
          return
        }
      } else {
        if (stamina.value >= STAMINA.max) return
        wait -= dt
        if (wait > 0) return
        left = showFor
        ui.show()
      }
      at.set(player.position.x, player.position.y + above, player.position.z).project(camera)
      ui.offscreen(at.z > 1)
      ui.place(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight, left, showFor)
    },
  }
}
