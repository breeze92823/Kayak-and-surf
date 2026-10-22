// VIP lane access (config VIP_LANE): the VIP lane is roped off until bought once for 25K wins
// (trophies). While locked, the floating VIP ACCESS label carries the price as a third row, and
// paddling within `promptRange` of the rope across its foot or the gold VIP pad in the pool shows
// "E  Buy for 25K Wins / VIP Access" (hud/vipLane.js) over the rope. E (or a click on the prompt)
// buys it: the wins counter jolts, the rope drops (hub/slide.js `vip.unlock()`, which also opens
// its collider), the price row goes, a gold burst, a fanfare. Too few wins: a toast, the prompt
// shakes, sfx.denied. In memory like the wins counter (no net.js save yet), so a reload ropes it
// off again. Consumes input.js's E press only while in range.
import { Vector3 } from 'three'
import { VIP_LANE } from './config.js'
import { VIP } from './hub/layout.js'
import { vipTexture } from './hub/signs.js'
import { createBurst } from './coach.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { formatNum } from './hud/index.js'
import { createVipPrompt } from './hud/vipLane.js'

const ROPE = { x: (VIP.postsX[0] + VIP.postsX[1]) / 2, z: VIP.z }

// hud (hud/index.js), gate: hub.vip (slide.js).
export function createVipLane({ hud, camera, scene, gate }) {
  const price = formatNum(VIP_LANE.wins)
  const ui = createVipPrompt(hud.root, { onBuy: buy })
  const burst = createBurst(scene)
  const trophyEl = hud.root.querySelector('.hud-counter-trophy')
  const at = new Vector3()

  // The label with the price row is taller: stretch the sprite to match and keep its top in place.
  const { label } = gate
  const plain = label.material.map
  const priced = vipTexture(`🏆 ${price} Wins`)
  const k = priced.image.height / plain.image.height
  label.material.map = priced
  label.scale.y *= k
  label.center.y = 1 - 0.5 / k

  function buy() {
    if (gate.open) return
    const have = hud.get('trophies')
    if (have < VIP_LANE.wins) {
      ui.refuse()
      ui.toast('Not enough wins!', `Need ${price} Wins (you have ${formatNum(have)})`)
      sfx.denied({})
      return
    }
    hud.set({ trophies: have - VIP_LANE.wins })
    trophyEl?.classList.remove('spend')
    void trophyEl?.offsetWidth
    trophyEl?.classList.add('spend')
    gate.unlock()
    label.material.map = plain
    label.scale.y /= k
    label.center.y = 0.5
    ui.prompt(null)
    ui.toast('VIP Access!', 'The VIP lane is open')
    burst.fire(player.position.x, player.position.y, player.position.z)
    sfx.levelUp(5)
    sfx.fanfare(true)
  }

  return {
    get owned() {
      return gate.open
    },
    buy,
    update(dt) {
      burst.update(dt)
      if (gate.open) return
      const p = player.position
      const near = Math.hypot(p.x - ROPE.x, p.z - ROPE.z) < VIP_LANE.promptRange || Math.hypot(p.x - VIP.pad.x, p.z - VIP.pad.z) < VIP_LANE.promptRange
      if (near && inputState.interact) {
        inputState.interact = false
        buy()
      }
      if (!near || gate.open) return ui.prompt(null)
      at.set(ROPE.x, VIP.ropeY + 0.6, ROPE.z).project(camera)
      if (at.z < 1) ui.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight, `Buy for ${price} Wins`)
      else ui.prompt(null)
    },
  }
}
