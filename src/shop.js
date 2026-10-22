// The Kayak Shop at the stall on the purple band (config KAYAK_SHOP). Paddling within `promptRange`
// of the SHOP pad or the stall shows the E prompt over the counter; E (or the prompt, or the HUD's
// Shop tile) opens the shop window (hud/shop.js), with the boat pictures rendered on first open
// (petPortraits.js boat()). Picking a card shows that boat on the right; its button buys it (coins
// tick down, chink, gold sparks and a ring of light round the raft) and equips it at once, or
// equips one already owned: kayaks.js swaps the boat under the player (raft.js), its speed reaches
// the climb through stamina.js and its coaches the coach slots (training.js). Boats are bought in
// list order; later ones are locked. Too few coins: the card and button shake. The Trails tab's
// buttons buy a trail with trophies (the next one in list order), equip an owned one or take the
// equipped one off (trails.js; boatTrail.js draws it behind the boat); the Emotes tab's do the same
// for emotes (emotes.js; G plays the equipped one), whose pictures render on first view. The window
// closes on E, its X, or paddling past `closeRange` (unless it was opened from the tile). The Golden
// Dragon Kayak stood on the magenta pad (DRAGON_KAYAK) has its own E prompt, which opens the shop
// with that boat picked. Consumes input.js's E press only when near the shop or the dragon, or with
// the window open (main.js drops any press left over). In memory until net.js saves progress.
import { Vector3 } from 'three'
import { KAYAK_SHOP } from './config.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { kayaks } from './kayaks.js'
import { trails } from './trails.js'
import { emotes } from './emotes.js'
import { createBurst } from './coach.js'
import { createPortraitStudio } from './petPortraits.js'
import { createShopWindow } from './hud/shop.js'
import { DRAGON_KAYAK, SHOP, onIsland, RIM_BANDS } from './hub/layout.js'

const { promptRange, dragonRange, closeRange } = KAYAK_SHOP
const [stallX, stallZ] = onIsland(SHOP.r, SHOP.a)
const STALL_TOP = RIM_BANDS[0].h + 2.4 // m: where the prompt hangs, over the counter
const DRAGON_TOP = DRAGON_KAYAK.height * 0.6 // m: the dragon's prompt, below its floating label

export function createShop({ hud, camera, scene, renderer }) {
  const win = createShopWindow(hud.root, { onAct })
  hud.on('shop', () => (win.isOpen ? close() : open(true)))
  const burst = createBurst(scene)
  const coinEl = hud.root.querySelector('.hud-counter-coin')
  const trophyEl = hud.root.querySelector('.hud-counter-trophy')

  let near = false
  let atDragon = false // the nearer prompt spot is the dragon's pad, not the stall
  let fromTile = false
  let coinTween = null
  let portraits = null // rendered the first time the window opens
  let emotePictures = false // rendered the first time the Emotes tab opens
  const at = new Vector3()

  function onAct(act, id) {
    if (act === 'open') open(false, atDragon ? 'dragon' : null)
    else if (act === 'close') close()
    else if (act === 'buy') buy(id)
    else if (act === 'trail') item('trails', id)
    else if (act === 'emote') item('emotes', id)
    else {
      sfx.page({ level: 0.45 }) // a card or tab picked
      if (act === 'tab' && id === 'emotes' && !emotePictures) {
        emotePictures = true
        const studio = createPortraitStudio(renderer)
        win.setEmotePortraits(Object.fromEntries(emotes.list.map((t) => [t.id, studio.emote(t.id)])))
      }
    }
  }

  // `pick`: a boat id to show on the right (the dragon's prompt), else the last one picked.
  function open(tile, pick) {
    fromTile = tile
    if (pick) win.pick(pick)
    hud.opening('shop')
    document.exitPointerLock?.() // the window needs the cursor
    if (!portraits) {
      const studio = createPortraitStudio(renderer)
      portraits = Object.fromEntries(kayaks.boats.map((b) => [b.id, studio.boat(b.id)]))
      win.setPortraits(portraits)
    }
    win.open()
    sfx.page({})
  }

  function close() {
    if (!win.isOpen) return
    win.close()
    sfx.page({ level: 0.6 })
  }
  hud.addWindow('shop', close)

  // The picked boat's button: buy and equip, or equip one already owned.
  function buy(id) {
    if (kayaks.isEquipped(id)) return
    if (kayaks.owns(id)) {
      kayaks.equip(id)
      win.flash(id, 'on')
      sfx.levelUp(1)
      return
    }
    if (kayaks.isLocked(id)) return
    const { price } = kayaks.boat(id)
    const coins = coinTween?.to ?? hud.get('coins') // mid tick-down the counter still shows more
    if (coins < price) {
      win.refuse(id)
      sfx.denied({})
      return
    }
    kayaks.buy(id)
    kayaks.equip(id)
    coinTween = { from: hud.get('coins'), to: coins - price, t: 0 }
    coinEl?.classList.remove('spend')
    void coinEl?.offsetWidth
    coinEl?.classList.add('spend')
    win.flash(id, 'new')
    sfx.coins(7)
    sfx.levelUp(kayaks.boats.findIndex((b) => b.id === id))
    burst.fire(player.position.x, player.position.y, player.position.z)
  }

  // An item card's button ('trails' | 'emotes'): take the equipped one off, equip an owned one, or
  // buy the next one with trophies (and equip it).
  function item(kind, id) {
    const store = kind === 'trails' ? trails : emotes
    if (store.isEquipped(id)) {
      store.unequip()
      win.flashItem(kind, id, 'off')
      sfx.page({ level: 0.7 })
      return
    }
    if (store.owns(id)) {
      store.equip(id)
      win.flashItem(kind, id, 'on')
      sfx.levelUp(1)
      return
    }
    if (store.isLocked(id)) return
    const { price } = store.item(id)
    const trophies = hud.get('trophies')
    if (trophies < price) {
      win.refuseItem(kind, id)
      sfx.denied({})
      return
    }
    store.buy(id)
    store.equip(id)
    hud.set({ trophies: trophies - price })
    trophyEl?.classList.remove('spend')
    void trophyEl?.offsetWidth
    trophyEl?.classList.add('spend')
    win.flashItem(kind, id, 'new')
    sfx.levelUp(store.list.findIndex((t) => t.id === id) + 2)
    burst.fire(player.position.x, player.position.y, player.position.z)
  }

  return {
    get isOpen() {
      return win.isOpen
    },
    open: () => open(true),
    close,
    update(dt) {
      const { x, z } = player.position
      const stallDist = Math.min(Math.hypot(x - SHOP.pad.x, z - SHOP.pad.z), Math.hypot(x - stallX, z - stallZ))
      const dragonDist = Math.hypot(x - DRAGON_KAYAK.x, z - DRAGON_KAYAK.z)
      const dist = Math.min(stallDist, dragonDist)
      atDragon = dragonDist < stallDist
      near = atDragon ? dragonDist < dragonRange : stallDist < promptRange
      // E: open by the shop (on the dragon by its pad), close if open.
      if (inputState.interact && (win.isOpen || near)) {
        inputState.interact = false
        if (win.isOpen) close()
        else open(false, atDragon ? 'dragon' : null)
      }
      if (win.isOpen && !fromTile && dist > closeRange) close()

      // Prompt over the counter (or by the dragon) while near and the window is shut.
      if (near && !win.isOpen) {
        if (atDragon) at.set(DRAGON_KAYAK.x, DRAGON_TOP, DRAGON_KAYAK.z).project(camera)
        else at.set(stallX, STALL_TOP, stallZ).project(camera)
        if (at.z < 1) win.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight)
        else win.prompt(null)
      } else win.prompt(null)

      // Coins tick down to the new total.
      if (coinTween) {
        coinTween.t = Math.min(1, coinTween.t + dt / 0.6)
        const e = 1 - (1 - coinTween.t) ** 3
        hud.set({ coins: Math.round(coinTween.from + (coinTween.to - coinTween.from) * e) })
        if (coinTween.t >= 1) coinTween = null
      }
      burst.update(dt)
    },
  }
}
