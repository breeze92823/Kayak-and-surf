// The spin wheel on the deck's SPIN pad (config SPIN_WHEEL). Paddling within `promptRange` shows the
// E prompt beside the wheel; E (or the prompt, or the HUD's wheel button) opens the Spin window
// (hud/spinWheel.js). Spin spends one spin: the prize is drawn by `weight` first, then the wheel (and
// the 3D one on the pad with it) turns `turns` times and eases out onto it, the pointer clicking over
// the pegs; Skip Animation makes it a quick snap. Coins fly up to the counter and it counts up, a
// potion starts a timed boost (boosts.js) shown as a chip under the counters, the Spirit Wolf goes
// into the Index and the Pet window (`bag`, hud/pets.js). One free spin every `freeEvery` s; the
// +1 / +10 buttons sell spins for `prices` coins. The window closes on E, its X, or paddling past
// `closeRange` (unless it was opened from the HUD); closing mid-spin settles it at once, so a spin is
// never lost. Consumes input.js's E press only when near the wheel or with the window open.
// In memory until net.js saves progress.
import { Vector3 } from 'three'
import { SPIN_WHEEL } from './config.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { boosts } from './boosts.js'
import { petIndex as pets } from './petIndex.js'
import { createPortraitStudio } from './petPortraits.js'
import { createSpinWindow, paintWheel } from './hud/spinWheel.js'
import { formatNum } from './hud/index.js'
import { canvas, toTexture } from './textures.js'

const { promptRange, closeRange, startSpins, freeEvery, prices, spinTime, skipTime, turns, prizes } = SPIN_WHEEL
const SEG = 360 / prizes.length // degrees per wedge; wedge i is centred on i * SEG
const PEG = SEG / 2 // a peg every half wedge
const BOOST = { speed: 'Speed', stamina: 'Stamina', win: 'Wins' }

// Index of a prize drawn by weight.
function draw() {
  let r = Math.random() * prizes.reduce((sum, p) => sum + p.weight, 0)
  for (let i = 0; i < prizes.length; i++) if ((r -= prizes[i].weight) < 0) return i
  return prizes.length - 1
}

export function createSpinWheel({ hud, camera, renderer, rig, index, bag }) {
  const win = createSpinWindow(hud.root, { onAct })
  hud.on('spin', () => (win.isOpen ? close() : open(true)))

  let spins = startSpins
  let nextFree = performance.now() + freeEvery * 1000
  let angle = 0 // wheel turn, degrees clockwise
  let spin = null // { from, to, t, len, pow, prize } while turning
  let skip = false
  let fromTile = false
  let portrait = null // the Spirit Wolf's picture, rendered shortly after load
  let coinTween = null
  let lastTick = 0
  let chipClock = 0
  const coinEl = hud.root.querySelector('.hud-counter-coin')
  const at = new Vector3()
  const right = new Vector3()

  // The deck wheel wears the window's face in its gold rim (paintWheel 'deck'), the wolf's picture
  // painted in once it is rendered.
  const deckCanvas = canvas(1024, 1024)
  const deckFace = toTexture(deckCanvas)
  rig.face.map = rig.face.emissiveMap = deckFace
  rig.face.needsUpdate = true
  const paintDeck = (url) => paintWheel(deckCanvas, url, 'deck').then(() => (deckFace.needsUpdate = true))
  paintDeck(null)
  const wolf = () => {
    if (!portrait) {
      portrait = createPortraitStudio(renderer).pet(pets.pet('spiritwolf'))
      win.setPortrait(portrait)
      paintDeck(portrait)
    }
  }
  setTimeout(wolf, 1500)

  function onAct(act) {
    if (act === 'open') open(false)
    else if (act === 'close') close()
    else if (act === 'spin') go()
    else if (act === 'buy1') buy(1)
    else if (act === 'buy10') buy(10)
    else if (act === 'skip') {
      skip = !skip
      paint()
      sfx.page({ level: 0.5 })
    }
  }

  const paint = () => win.paint({ spins, next: (nextFree - performance.now()) / 1000, spinning: !!spin, skip })

  function open(tile) {
    fromTile = tile
    hud.opening('spin')
    document.exitPointerLock?.() // the window needs the cursor
    wolf()
    win.open()
    paint()
    sfx.page({})
  }

  function close() {
    if (!win.isOpen) return
    if (spin) settle()
    win.close()
    win.highlight(false)
    sfx.page({ level: 0.6 })
  }
  hud.addWindow('spin', close)

  function go() {
    if (spin) return
    if (spins <= 0) {
      win.refuse()
      sfx.denied({})
      return
    }
    spins--
    const i = draw()
    const rest = (((-i * SEG - angle) % 360) + 360) % 360 // turn left until wedge i is under the pointer
    const jitter = (Math.random() - 0.5) * SEG * 0.7 // land anywhere well inside the wedge
    spin = { from: angle, to: angle + (skip ? 1 : turns) * 360 + rest + jitter, t: 0, len: skip ? skipTime : spinTime, pow: skip ? 3 : 4, prize: prizes[i] }
    win.highlight(false)
    sfx.spin()
    paint()
  }

  // +1 / +10 spins for coins.
  function buy(n) {
    const price = n === 10 ? prices.ten : prices.one
    const coins = coinTween?.to ?? hud.get('coins') // mid count-up the counter still shows less
    if (coins < price) {
      win.short(n)
      sfx.denied({})
      return
    }
    coinTween = { from: hud.get('coins'), to: coins - price, t: 0 }
    coinEl?.classList.remove('spend')
    void coinEl?.offsetWidth
    coinEl?.classList.add('spend')
    spins += n
    win.bought()
    sfx.coins(3)
    paint()
  }

  // The wheel has stopped (or the window closed mid-spin): pay the prize out.
  function settle() {
    const { prize: p, to } = spin
    spin = null
    angle = to % 360
    win.setAngle(angle)
    win.highlight(true)
    paint()
    if (p.kind === 'coins') {
      win.toast(`+${formatNum(p.amount)} Coins!`, 'Coins added!', 'coins')
      sfx.fanfare()
      sfx.coins(10)
      win.flyCoins(12, () => {
        const shown = hud.get('coins')
        coinTween = { from: shown, to: (coinTween?.to ?? shown) + p.amount, t: 0 }
        sfx.coins(6)
      })
    } else if (p.kind === 'boost') {
      boosts.add(p.boost, p.pct, p.time)
      win.toast(`+${p.pct}% ${BOOST[p.boost]}!`, `Boost for ${Math.round(p.time / 60)} min`, 'boost')
      win.paintBoosts(boosts.list())
      sfx.fanfare()
    } else if (p.kind === 'pet') {
      const fresh = !pets.has(p.pet) // asked first: bag.add discovers it too
      const kept = bag ? !!bag.add(p.pet) : true // into the Pet window, unless storage is full
      // Only a pet that landed counts in the Index.
      if (kept && index) index.discover(p.pet)
      else if (kept) pets.discover(p.pet)
      win.toast(`${pets.pet(p.pet).name}!`, !kept ? 'Pet storage full!' : fresh ? 'New pet in your Index!' : 'Another one for the collection!', 'pet')
      sfx.fanfare(true)
      sfx.claps(4, { delay: 0.55 })
    }
  }

  return {
    get isOpen() {
      return win.isOpen
    },
    get spins() {
      return spins
    },
    open: () => open(true),
    close,
    // Daily rewards (daily.js) and the dev hook: __game.spinWheel.addSpins(5).
    addSpins(n) {
      spins += n
      paint()
    },
    update(dt) {
      const now = performance.now()
      while (now >= nextFree) {
        spins++
        nextFree += freeEvery * 1000
      }

      // E: open beside the wheel, close if open.
      const dist = Math.hypot(player.position.x - rig.root.position.x, player.position.z - rig.root.position.z)
      const near = dist < promptRange
      if (inputState.interact && (win.isOpen || near)) {
        inputState.interact = false
        if (win.isOpen) close()
        else open(false)
      }
      if (win.isOpen && !fromTile && dist > closeRange) close()

      // Turning: ease out onto the prize, a click (and pointer flick) per peg passed.
      if (spin) {
        const prev = angle
        spin.t = Math.min(1, spin.t + dt / spin.len)
        angle = spin.from + (spin.to - spin.from) * (1 - (1 - spin.t) ** spin.pow)
        if (Math.floor(angle / PEG) !== Math.floor(prev / PEG)) {
          win.tick()
          if (now - lastTick > 28) {
            lastTick = now
            sfx.wheelTick(Math.min(1, (angle - prev) / Math.max(dt, 1e-3) / 900))
          }
        }
        if (spin.t >= 1) settle()
      }
      if (win.isOpen || spin) {
        win.setAngle(angle, dt)
        paint()
      }
      rig.wheel.rotation.z = (-angle * Math.PI) / 180

      // Prompt beside the wheel (to the camera's right, hub high) while near and the window is shut.
      if (near && !win.isOpen) {
        rig.wheel.getWorldPosition(at)
        right.setFromMatrixColumn(camera.matrixWorld, 0)
        at.addScaledVector(right, rig.height * 0.5 + 0.6)
        at.project(camera)
        if (at.z < 1) win.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight)
        else win.prompt(null)
      } else win.prompt(null)

      // Coins count up to the new total.
      if (coinTween) {
        coinTween.t = Math.min(1, coinTween.t + dt / 0.8)
        const e = 1 - (1 - coinTween.t) ** 3
        hud.set({ coins: Math.round(coinTween.from + (coinTween.to - coinTween.from) * e) })
        if (coinTween.t >= 1) coinTween = null
      }
      chipClock -= dt
      if (chipClock <= 0) {
        chipClock = 0.25
        win.paintBoosts(boosts.list())
      }
    },
  }
}
