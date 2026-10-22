// Egg screens (eggs.js drives them), after Paper-plane's eggUi.js as plain DOM in the HUD (same em
// unit, outlined lettering and rarity colours as the Pet window, pets.css):
//  - the "E  Open / <Egg>" prompt beside an egg (or "E  Buy / <Pet>" at a pod or the bee);
//  - the egg window: the egg's picture, its coin price and the coins you have, every pet it can
//    hatch with its odds and coin multiplier, and Open 1 / Open 3 / Auto (E / R / T); for a pet sold
//    outright, that pet's card and Buy (E);
//  - the hatch overlay: the eggs shake harder and harder, flash, and the pet cards pop out (rays
//    behind Rare and up, the variant tag, NEW! for a first); a click skips ahead.
// Buttons come back through onAct('open1' | 'openMany' | 'auto' | 'buy' | 'close' | 'prompt').
import './eggs.css'
import { formatNum } from './index.js'
import * as icon from './icons.js'
import { formatMult } from './pets.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const RAYS = new Set(['rare', 'epic', 'legendary', 'secret', 'limited', 'exclusive'])

// 12.5% / 0.40% / 1 in 1.2M
function formatChance(c) {
  const pct = c * 100
  if (pct >= 10) return `${pct.toFixed(1).replace(/\.0$/, '')}%`
  if (pct >= 0.01) return `${pct.toFixed(2)}%`
  return `1 in ${formatNum(Math.round(1 / c))}`
}

export function createEggWindow(root, { onAct, petPicture, rarityName }) {
  const el = document.createElement('div')
  el.className = 'eggs'
  el.innerHTML = `
<button class="coach-prompt eggs-prompt" data-act="prompt"><span class="coach-key">E</span><span class="coach-prompt-txt"><small></small><b></b></span></button>
<div class="eggs-win">
  <div class="eggs-panel">
    <div class="eggs-head">
      <b class="hud-txt eggs-title"></b>
      <button class="eggs-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="eggs-side">
      <span class="eggs-face"><img alt=""></span>
      <span class="eggs-price"><i>${icon.coin}</i><b class="hud-txt"></b></span>
      <span class="hud-txt eggs-have"></span>
    </div>
    <div class="eggs-box"><div class="eggs-grid"></div></div>
  </div>
  <div class="eggs-bar">
    <button class="eggs-btn is-one" data-act="open1"><b class="hud-txt">Open 1</b><kbd>E</kbd></button>
    <button class="eggs-btn is-many" data-act="openMany"><b class="hud-txt"></b><kbd>R</kbd></button>
    <button class="eggs-btn is-auto" data-act="auto"><b class="hud-txt">Auto</b><kbd>T</kbd></button>
    <button class="eggs-btn is-buy" data-act="buy"><b class="hud-txt">Buy</b><kbd>E</kbd></button>
  </div>
</div>
<div class="eggs-hatch"><div class="eggs-hatch-row"></div><span class="hud-txt eggs-hatch-hint">Click to skip</span></div>
<div class="coach-toast eggs-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.eggs-prompt')
  const winEl = el.querySelector('.eggs-win')
  const titleEl = el.querySelector('.eggs-title')
  const faceImg = el.querySelector('.eggs-face img')
  const priceEl = el.querySelector('.eggs-price b')
  const haveEl = el.querySelector('.eggs-have')
  const gridEl = el.querySelector('.eggs-grid')
  const barEl = el.querySelector('.eggs-bar')
  const manyEl = el.querySelector('.is-many b')
  const hatchEl = el.querySelector('.eggs-hatch')
  const rowEl = el.querySelector('.eggs-hatch-row')
  const toastEl = el.querySelector('.eggs-toast')
  let isOpen = false
  let shownPrompt = ''
  let shownPaint = ''
  let hatch = null // { phase: 'shake' | 'reveal', timer, done }

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  el.addEventListener('click', (e) => {
    if (hatch && e.target.closest('.eggs-hatch')) return skip()
    const b = e.target.closest('[data-act]')
    if (b) onAct(b.dataset.act)
  })
  el.addEventListener('pointerdown', (e) => {
    if ((e.target.closest('button') || e.target.closest('.eggs-hatch')) && document.pointerLockElement) document.exitPointerLock()
  })

  // Pictures land later (rendered a few per frame): fill every <img> waiting for that pet.
  function setPetImage(id, url) {
    for (const img of el.querySelectorAll(`img[data-pet="${id}"]`)) img.src = url
  }
  function petImg(id) {
    const url = petPicture(id)
    return `<img alt="" data-pet="${id}"${url ? ` src="${url}"` : ''}>`
  }

  // The hatch's last phase is over: clear it and tell eggs.js.
  function finish() {
    if (!hatch) return
    clearTimeout(hatch.timer)
    const done = hatch.done
    hatch = null
    hatchEl.classList.remove('show', 'reveal')
    root.classList.remove('eggs-hatching')
    done()
  }
  function reveal() {
    if (!hatch) return
    clearTimeout(hatch.timer)
    hatch.phase = 'reveal'
    hatchEl.classList.add('reveal')
    replay(hatchEl, 'flash')
    hatch.timer = setTimeout(finish, hatch.revealMs)
    hatch.onReveal?.()
  }
  function skip() {
    if (hatch?.phase === 'shake') reveal()
    else finish()
  }

  return {
    get isOpen() {
      return isOpen
    },
    get hatching() {
      return !!hatch
    },
    // spot: { name, price, egg: true | false }, odds: [{ pet, chance, power }] (egg) or the one pet.
    open(spot, list, eggUrl) {
      isOpen = true
      titleEl.textContent = spot.name
      titleEl.style.fontSize = `${Math.min(2.6, 40 / spot.name.length).toFixed(2)}em`
      winEl.classList.toggle('is-pet', !spot.egg)
      if (eggUrl) faceImg.src = eggUrl
      else faceImg.removeAttribute('src')
      faceImg.dataset.pet = spot.egg ? '' : list[0].pet.id
      if (!spot.egg && !eggUrl) {
        const url = petPicture(list[0].pet.id)
        if (url) faceImg.src = url
      }
      priceEl.textContent = formatNum(spot.price)
      manyEl.textContent = `Open ${spot.many}`
      gridEl.innerHTML = list
        .map(
          ({ pet, chance, power }, i) => `
<div class="eggs-card r-${pet.rarity}" title="${pet.name}" style="animation-delay:${Math.min(i, 20) * 0.02}s">
  ${petImg(pet.id)}
  <span class="eggs-mult"><i>${icon.coin}</i><b class="hud-txt">${formatMult(power)}</b></span>
  <b class="hud-txt eggs-chance">${spot.egg ? formatChance(chance) : rarityName(pet.rarity)}</b>
  ${spot.egg ? '' : `<b class="hud-txt eggs-card-name">${pet.name}</b>`}
</div>`,
        )
        .join('')
      gridEl.classList.toggle('is-one', !spot.egg)
      winEl.classList.add('open')
      replay(winEl, 'pop')
    },
    close() {
      isOpen = false
      winEl.classList.remove('open', 'pop')
    },
    setEggImage(url) {
      faceImg.src = url
    },
    setPetImage,
    // Coins on hand under the price (red when short), and the Auto toggle.
    paint({ coins, price, auto }) {
      const key = `${coins}|${price}|${auto}`
      if (key === shownPaint) return
      shownPaint = key
      const short = coins < price
      haveEl.textContent = `You have ${formatNum(coins)}`
      haveEl.classList.toggle('is-short', short)
      barEl.classList.toggle('is-auto', auto)
    },
    // Shake a button (and the price) when it can't go ahead.
    refuse(act) {
      const b = barEl.querySelector(`[data-act="${act}"]`)
      if (b) replay(b, 'is-no')
      replay(priceEl.parentElement, 'is-no')
    },
    toast(title, sub = '') {
      toastEl.querySelector('b').textContent = title
      toastEl.querySelector('span').textContent = sub
      replay(toastEl, 'show')
    },
    // Plays the hatch: `pets` [{ pet, variant, isNew, power }], the egg picture (null: a pet bought
    // outright, revealed at once), phase lengths in s; done() when it is over (or skipped through).
    hatch(pets, eggUrl, { shake, reveal: revealS }, done, onReveal) {
      if (hatch) finish()
      rowEl.innerHTML = pets
        .map(
          ({ pet, variant, isNew, power }, i) => `
<div class="eggs-slot" style="--i:${i}">
  <span class="eggs-egg">${eggUrl ? `<img alt="" src="${eggUrl}">` : ''}</span>
  <span class="eggs-burst"></span>
  <div class="eggs-out${RAYS.has(pet.rarity) ? ' has-rays' : ''}">
    <i class="eggs-rays r-${pet.rarity}"></i>
    <div class="eggs-card pets-v r-${pet.rarity} v-${variant}">${petImg(pet.id)}<i class="pets-tag"></i>${isNew ? '<b class="hud-txt eggs-new">NEW!</b>' : ''}</div>
    <b class="hud-txt eggs-out-name">${pet.name}</b>
    <span class="hud-txt eggs-out-rarity t-${pet.rarity}">${variant === 'normal' ? rarityName(pet.rarity) : `${variant[0].toUpperCase()}${variant.slice(1)} ${rarityName(pet.rarity)}`}</span>
    <span class="eggs-mult"><i>${icon.coin}</i><b class="hud-txt">${formatMult(power)}</b></span>
  </div>
</div>`,
        )
        .join('')
      hatchEl.style.setProperty('--shake', `${shake}s`)
      hatchEl.classList.remove('reveal', 'flash')
      root.classList.add('eggs-hatching')
      replay(hatchEl, 'show')
      hatch = { phase: 'shake', timer: 0, done, onReveal, revealMs: revealS * 1000 }
      if (!eggUrl || shake <= 0) reveal()
      else hatch.timer = setTimeout(reveal, shake * 1000)
    },
    // Screen position (px) for the prompt with its two lines, or null to hide it.
    prompt(x, y, small = '', big = '') {
      promptEl.classList.toggle('show', x != null)
      if (x == null) return
      const key = `${small}|${big}`
      if (key !== shownPrompt) {
        shownPrompt = key
        promptEl.querySelector('small').textContent = small
        promptEl.querySelector('b').textContent = big
      }
      promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
  }
}
