// The eggs on the island and the pets sold outright (config EGG_HATCH), after Paper-plane's eggs.js:
// the stone egg on its magenta stand, the area eggs on the south-east deck (Canyon / Frost / Cloud),
// the eggs on the yellow band (Cream, Rainbow, the 20-coin Basic pixel egg) and, sold for coins with
// no roll, the bee on the band and the four pods on the purple band. Paddling within `promptRange` of
// one shows its E prompt; E (or the prompt) opens the egg window (hud/eggs.js). With it open, E opens
// one, R `openMany`, T toggles Auto (hatch again as each one ends); a pet spot's E buys. A hatch pays
// the coins, rolls (hatch.js, luck from the Index), puts the pets in the Pet window (`bag`, which also
// discovers them; `index` repaints the Index) and plays the hatch overlay. The window closes on its X,
// paddling past `closeRange` (unless opened from the HUD: the bee offer card) or another window
// opening. Consumes input.js's E press only when near an egg or with the window open.
import { Vector3 } from 'three'
import { EGG_HATCH } from './config.js'
import { BAND_ITEMS, EGG, EGG_ROW, onIsland, PEDESTALS, RIM_BANDS } from './hub/layout.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { petIndex } from './petIndex.js'
import { inventory } from './petInventory.js'
import { eggOdds, rollEgg } from './hatch.js'
import { createPortraitStudio, hasPetPortrait, petPortrait } from './petPortraits.js'
import { createEggWindow } from './hud/eggs.js'

const { promptRange, closeRange, openMany, autoDelay, time, prices, pets: PET_PRICES } = EGG_HATCH
const BAND_H = RIM_BANDS[0].h
const PER_FRAME = 3 // portraits rendered per animation frame

// Every spot E works at: an egg (`egg`) or a pet sold outright (`pet`); (x, z) on the island and
// `y` where its prompt hangs.
const SPOTS = [
  { egg: 'stone', x: EGG.x, z: EGG.z, y: 3.4 },
  ...EGG_ROW.map((s) => ({ egg: s.egg, x: s.x, z: s.z, y: 3 })),
  ...BAND_ITEMS.map((i) => {
    const [x, z] = onIsland(i.r, i.a)
    return { egg: i.egg, pet: i.pet, x, z, y: BAND_H + 2.6 }
  }),
  ...PEDESTALS.map((p) => {
    const [x, z] = onIsland(p.r, p.a)
    return { pet: p.pet, x, z, y: BAND_H + 3 }
  }),
].map((s) => ({
  ...s,
  id: s.pet ?? s.egg,
  name: s.pet ? petIndex.pet(s.pet).name : petIndex.eggs[s.egg].name,
  price: s.pet ? PET_PRICES[s.pet] : prices[s.egg],
}))

export function createEggs({ hud, camera, renderer, index, bag }) {
  const win = createEggWindow(hud.root, { onAct, petPicture, rarityName: (r) => petIndex.rarities.find((x) => x.id === r)?.name ?? r })
  const coinEl = hud.root.querySelector('.hud-counter-coin')
  let spot = null // the spot whose window is open
  let near = null // the nearest spot in range
  let fromTile = false
  let auto = false
  let lastCount = 1
  let autoTimer = 0
  let studio = null
  const eggUrls = {}
  const at = new Vector3()
  const right = new Vector3()

  // Pictures: pets shared with the Index and Pet window (a few per frame), eggs rendered here once.
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
  function eggPicture(egg) {
    studio ??= createPortraitStudio(renderer)
    return (eggUrls[egg] ??= studio.egg(egg))
  }

  const coins = () => hud.get('coins')
  const paint = () => spot && win.paint({ coins: coins(), price: spot.price, auto })

  function onAct(act) {
    if (act === 'prompt' && near) open(near, false)
    else if (act === 'close') close()
    else if (act === 'open1' || act === 'buy') go(1, act)
    else if (act === 'openMany') go(openMany, act)
    else if (act === 'auto') toggleAuto()
  }

  function open(s, tile) {
    fromTile = tile
    hud.opening('egg')
    document.exitPointerLock?.() // the window needs the cursor
    spot = s
    auto = false
    const list = s.egg
      ? eggOdds(s.egg).map((e) => ({ ...e, power: inventory.power({ id: e.pet.id, variant: 'normal' }) }))
      : [{ pet: petIndex.pet(s.pet), chance: 1, power: inventory.power({ id: s.pet, variant: 'normal' }) }]
    win.open({ name: s.name, price: s.price, egg: !!s.egg, many: openMany }, list, s.egg ? eggPicture(s.egg) : null)
    hud.root.classList.add('eggs-open')
    paint()
    sfx.page({})
  }

  function close() {
    if (!spot) return
    spot = null
    setAuto(false)
    win.close()
    hud.root.classList.remove('eggs-open')
    sfx.page({ level: 0.6 })
  }
  hud.addWindow('egg', close)

  function setAuto(on) {
    auto = on
    clearTimeout(autoTimer)
    paint()
  }
  function toggleAuto() {
    if (!spot?.egg) return
    setAuto(!auto)
    sfx.page({ level: 0.5 })
    if (auto && !win.hatching && !go(lastCount, 'auto')) setAuto(false)
  }

  // Pays for and hatches `n` (or buys the spot's pet); false, saying why, when it can't.
  function go(n, act) {
    if (!spot || win.hatching) return false
    if (!spot.egg) n = 1
    const cost = spot.price * n
    if (inventory.count + n > inventory.storage) {
      win.refuse(act)
      win.toast('Pets full!', `Delete some in the Pet window (${inventory.count}/${inventory.storage})`)
      sfx.denied({})
      return false
    }
    if (coins() < cost) {
      win.refuse(act)
      win.toast('Not enough coins!', `Need ${cost.toLocaleString('en-US')}`)
      sfx.denied({})
      return false
    }
    hud.set({ coins: coins() - cost })
    coinEl?.classList.remove('spend')
    void coinEl?.offsetWidth
    coinEl?.classList.add('spend')
    sfx.coins(4)
    lastCount = n
    const rolls = spot.egg ? rollEgg(spot.egg, n, petIndex.bonus('luck')) : [{ id: spot.pet, variant: 'normal' }]
    const hatched = rolls.map(({ id, variant }) => {
      const isNew = !petIndex.has(id, variant) // asked first: bag.add discovers it too
      bag.add(id, variant)
      index?.discover(id, variant) // repaints the Index if it is showing
      return { pet: petIndex.pet(id), variant, isNew, power: inventory.power({ id, variant }) }
    })
    paint()
    const speed = auto ? time.auto : 1
    const best = hatched.some((h) => ['legendary', 'secret', 'limited', 'exclusive'].includes(h.pet.rarity) || h.variant !== 'normal')
    win.hatch(
      hatched,
      spot.egg ? eggPicture(spot.egg) : null,
      { shake: spot.egg ? time.shake * speed : 0, reveal: time.reveal * speed },
      done,
      () => {
        sfx.fanfare(best)
        if (best || hatched.some((h) => h.isNew)) sfx.claps(best ? 5 : 2, { delay: 0.3 })
      },
    )
    return true
  }

  // The overlay is over: Auto goes again a moment later while the window stays open.
  function done() {
    paint()
    if (!auto || !spot) return
    const again = spot
    autoTimer = setTimeout(() => {
      if (auto && spot === again && !go(lastCount, 'auto')) setAuto(false)
    }, autoDelay * 1000)
  }

  // R / T while the window is open (E comes through input.js).
  addEventListener('keydown', (e) => {
    if (!spot || e.repeat) return
    if (e.code === 'KeyR') go(openMany, 'openMany')
    else if (e.code === 'KeyT') toggleAuto()
  })

  return {
    get isOpen() {
      return !!spot
    },
    spots: SPOTS,
    // The HUD bee offer card, or a dev hook: __game.eggs.open('basic').
    open(id, tile = true) {
      const s = SPOTS.find((x) => x.id === id)
      if (s) open(s, tile)
    },
    close,
    update() {
      // Nearest spot in range.
      near = null
      let best = promptRange
      for (const s of SPOTS) {
        const d = Math.hypot(player.position.x - s.x, player.position.z - s.z)
        if (d < best) {
          best = d
          near = s
        }
      }
      // E: open the nearest; with the window open, hatch one (or buy).
      if (inputState.interact && (spot || near)) {
        inputState.interact = false
        if (spot) go(1, spot.egg ? 'open1' : 'buy')
        else open(near, false)
      }
      if (spot && !fromTile && Math.hypot(player.position.x - spot.x, player.position.z - spot.z) > closeRange) close()
      if (spot) paint()

      // Prompt over the nearest spot while its window is shut.
      if (near && !spot && !win.hatching) {
        at.set(near.x, near.y, near.z)
        right.setFromMatrixColumn(camera.matrixWorld, 0)
        at.addScaledVector(right, 0.9)
        at.project(camera)
        if (at.z < 1) win.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight, near.pet ? 'Buy' : 'Open', near.name)
        else win.prompt(null)
      } else win.prompt(null)
    },
  }
}
