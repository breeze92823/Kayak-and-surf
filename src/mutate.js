// The Mutate machine on the deck (config MUTATE_MACHINE; pad and winged vase in hub/island.js). On
// the Mutate pad (within `promptRange`) the E prompt shows; E (or the prompt) opens the Mutate window
// (hud/mutate.js): every owned pet whose variant is worth less than `variant` (PET_TEAM.variantMult),
// strongest first. Pick one and Mutate (or E): it pays the rarity's `cost` in coins and the pet turns
// `variant` in place (petInventory.js setVariant: same uid and team slot, discovered in the Index,
// saved by net.js), with a spark burst over the machine. The window closes on its X, paddling past
// `closeRange` or another window opening. Consumes input.js's E press only when on the pad or open.
import { Vector3 } from 'three'
import { MUTATE_MACHINE, PET_TEAM } from './config.js'
import { MUTATE } from './hub/layout.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { petIndex } from './petIndex.js'
import { inventory } from './petInventory.js'
import { hasPetPortrait, petPortrait } from './petPortraits.js'
import { createBurst } from './coach.js'
import { createMutateWindow } from './hud/mutate.js'

const { promptRange, closeRange, variant: TO, cost: COST } = MUTATE_MACHINE
const PER_FRAME = 3 // portraits rendered per animation frame
const VARIANT = Object.fromEntries(petIndex.variants.map((v) => [v.id, v.name]))

// Pets that can go in: their variant is worth less than the machine's.
const eligible = (p) => (PET_TEAM.variantMult[p.variant] ?? 1) < (PET_TEAM.variantMult[TO] ?? 1)
const view = (p, variant = p.variant) => ({ uid: p.uid, id: p.id, variant, rarity: inventory.info(p).rarity, power: inventory.power({ id: p.id, variant }) })

export function createMutate({ hud, camera, scene, renderer, index }) {
  const win = createMutateWindow(hud.root, { onAct, onPick: pick, petPicture })
  const coinEl = hud.root.querySelector('.hud-counter-coin')
  const burst = createBurst(scene)
  let open = false
  let picked = null // uid
  let done = null // the pet that just turned: { uid, before } shown until another is picked
  let shownCoins = -1
  const at = new Vector3()

  // Pictures shared with the Index and Pet window, a few per frame.
  const queue = []
  let pumping = false
  function petPicture(id) {
    if (hasPetPortrait(id)) return petPortrait(renderer, id)
    if (!queue.includes(id)) queue.push(id)
    if (!pumping) {
      pumping = true
      requestAnimationFrame(pump)
    }
    return null
  }
  function pump() {
    for (let n = 0; n < PER_FRAME && queue.length; n++) {
      const id = queue.shift()
      win.setPetImage(id, petPortrait(renderer, id))
    }
    if (queue.length) requestAnimationFrame(pump)
    else pumping = false
  }

  const coins = () => hud.get('coins')
  const list = () => inventory.sorted().filter(eligible)

  // The left side: the picked pet before -> after, or the one that just turned.
  function paintPick() {
    const p = done ? inventory.pet(done.uid) : picked != null && inventory.pet(picked)
    if (!p) {
      picked = null
      done = null
      return win.paintPick(null, coins())
    }
    const info = inventory.info(p)
    const before = done ? done.before : p.variant
    const rarity = info.rarity
    win.paintPick(
      {
        pet: view(p, before),
        after: view(p, TO),
        name: `${VARIANT[TO]} ${info.name}`,
        cost: COST[rarity] ?? 0,
        done: !!done,
      },
      coins(),
    )
  }
  function paint() {
    if (!open) return
    win.paintList(list().map((p) => view(p)), picked)
    paintPick()
  }
  inventory.onChange(paint)

  function onAct(act) {
    if (act === 'prompt') openWindow()
    else if (act === 'close') close()
    else if (act === 'mutate') mutate()
  }

  function pick(uid) {
    if (picked === uid && !done) return
    picked = uid
    done = null
    paintPick()
    sfx.page({ level: 0.35 })
  }

  function openWindow() {
    if (open) return
    open = true
    hud.opening('mutate')
    document.exitPointerLock?.() // the window needs the cursor
    picked = list()[0]?.uid ?? null // the strongest one ready to go
    done = null
    win.open()
    hud.root.classList.add('mut-open')
    paint()
    sfx.page({})
  }
  function close() {
    if (!open) return
    open = false
    win.close()
    hud.root.classList.remove('mut-open')
    sfx.page({ level: 0.6 })
  }
  hud.addWindow('mutate', close)

  // Pays and turns the picked pet; false, saying why, when it can't.
  function mutate() {
    const p = !done && picked != null && inventory.pet(picked)
    if (!p || !eligible(p)) {
      win.refuse()
      sfx.denied({})
      return false
    }
    const info = inventory.info(p)
    const cost = COST[info.rarity] ?? 0
    if (coins() < cost) {
      win.refuse()
      win.toast('Not enough coins!', `Need ${cost.toLocaleString('en-US')}`)
      sfx.denied({})
      return false
    }
    hud.set({ coins: coins() - cost })
    coinEl?.classList.remove('spend')
    void coinEl?.offsetWidth
    coinEl?.classList.add('spend')
    done = { uid: p.uid, before: p.variant }
    picked = null
    inventory.setVariant(p.uid, TO) // repaints through onChange
    index?.discover(p.id, TO) // repaints the Index if it is showing
    win.done()
    win.toast(`${VARIANT[TO]} ${info.name}!`, `Now x${inventory.power(p).toFixed(2).replace(/\.?0+$/, '')} coins`)
    burst.fire(MUTATE.machine.x, 1.6 * MUTATE.machine.scale, MUTATE.machine.z)
    sfx.coins(5)
    sfx.levelUp()
    sfx.fanfare(true)
    return true
  }

  return {
    get isOpen() {
      return open
    },
    open: openWindow,
    close,
    update(dt) {
      burst.update(dt)
      const { x, z } = MUTATE.pad
      const dist = Math.hypot(player.position.x - x, player.position.z - z)
      const near = dist < promptRange
      // E: open on the pad; with the window open, mutate the picked pet.
      if (inputState.interact && (open || near)) {
        inputState.interact = false
        if (open) mutate()
        else openWindow()
      }
      if (open && dist > closeRange) close()
      if (open && coins() !== shownCoins) {
        shownCoins = coins() // the counter moved (a payout, a spin): repaint "You have"
        paintPick()
      }
      // Prompt over the pad while the window is shut.
      if (near && !open) {
        at.set(x, 1.8, z).project(camera)
        if (at.z < 1) win.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight)
        else win.prompt(null)
      } else win.prompt(null)
    },
  }
}
