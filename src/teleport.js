// Teleport portal (config TELEPORT): paddling within `promptRange` of the portal on the portal isle
// with too few wins (trophies) shows "E  Need 100 Wins / Teleport" over it (hud/vipLane.js prompt).
// E (or a click on the prompt): a toast, the prompt shakes, sfx.denied. With enough wins nothing
// shows and E does nothing: the portal has no destination yet. The wins are a requirement, not
// spent. Consumes input.js's E press only while the prompt shows.
import { Vector3 } from 'three'
import { TELEPORT } from './config.js'
import { PORTAL } from './hub/layout.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { formatNum } from './hud/index.js'
import { createVipPrompt } from './hud/vipLane.js'

const ANCHOR_Y = PORTAL.y + 0.5 + PORTAL.r * 1.15 // the swirl's middle (island.js buildPortal)

// hud (hud/index.js).
export function createTeleport({ hud, camera }) {
  const need = formatNum(TELEPORT.wins)
  const ui = createVipPrompt(hud.root, { onBuy: use, title: 'Teleport' })
  const at = new Vector3()
  const ready = () => hud.get('trophies') >= TELEPORT.wins

  function use() {
    if (ready()) return
    ui.refuse()
    ui.toast('Not enough wins!', `Need ${need} Wins (you have ${formatNum(hud.get('trophies'))})`)
    sfx.denied({})
  }

  return {
    use,
    update() {
      const p = player.position
      const near = !ready() && Math.hypot(p.x - PORTAL.x, p.z - PORTAL.z) < TELEPORT.promptRange
      if (near && inputState.interact) {
        inputState.interact = false
        use()
      }
      if (!near) return ui.prompt(null)
      at.set(PORTAL.x, ANCHOR_Y, PORTAL.z).project(camera)
      if (at.z < 1) ui.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight, `Need ${need} Wins`)
      else ui.prompt(null)
    },
  }
}
