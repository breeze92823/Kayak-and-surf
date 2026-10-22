// The Mutate window (mutate.js drives it): the "E  Machine / Mutate" prompt by the Mutate pad and a
// window in the egg window's glass look (eggs.css panel, Pet window cards from pets.css): on the left
// the picked pet now -> as a Rainbow (hue cycling), their coin multipliers, the coin cost, the coins
// you have and Mutate (E); on the right every pet that can go in, strongest first (click to pick).
// Buttons come back through onAct('mutate' | 'close' | 'prompt') and onPick(uid).
import './mutate.css'
import { formatNum } from './index.js'
import * as icon from './icons.js'
import { formatMult } from './pets.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const ARROW = `<svg viewBox="0 0 32 32"><path d="M5 16h18M16 8l8 8-8 8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

export function createMutateWindow(root, { onAct, onPick, petPicture }) {
  const el = document.createElement('div')
  el.className = 'mut'
  el.innerHTML = `
<button class="coach-prompt mut-prompt" data-act="prompt"><span class="coach-key">E</span><span class="coach-prompt-txt"><small>Machine</small><b>Mutate</b></span></button>
<div class="mut-win">
  <div class="eggs-panel mut-panel">
    <div class="eggs-head">
      <b class="hud-txt eggs-title">Mutate</b>
      <button class="eggs-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="mut-side">
      <div class="mut-pair">
        <div class="mut-from"></div>
        <i class="mut-arrow">${ARROW}</i>
        <div class="mut-to"></div>
      </div>
      <b class="hud-txt mut-name"></b>
      <span class="eggs-price mut-cost"><i>${icon.coin}</i><b class="hud-txt"></b></span>
      <span class="hud-txt eggs-have mut-have"></span>
      <button class="eggs-btn is-one mut-go" data-act="mutate"><b class="hud-txt">Mutate</b><kbd>E</kbd></button>
      <span class="hud-txt mut-hint"></span>
    </div>
    <div class="eggs-box mut-box"><div class="mut-grid"></div><span class="hud-txt mut-empty"></span></div>
  </div>
</div>
<div class="coach-toast mut-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.mut-prompt')
  const winEl = el.querySelector('.mut-win')
  const sideEl = el.querySelector('.mut-side')
  const fromEl = el.querySelector('.mut-from')
  const toEl = el.querySelector('.mut-to')
  const nameEl = el.querySelector('.mut-name')
  const costEl = el.querySelector('.mut-cost')
  const haveEl = el.querySelector('.mut-have')
  const goEl = el.querySelector('.mut-go')
  const hintEl = el.querySelector('.mut-hint')
  const gridEl = el.querySelector('.mut-grid')
  const emptyEl = el.querySelector('.mut-empty')
  const toastEl = el.querySelector('.mut-toast')
  let isOpen = false

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  // A Pet window card (pets.css): portrait on the rarity colour, variant tag, coin multiplier.
  const card = ({ uid, id, variant, rarity, power }, i = 0) => {
    const url = petPicture(id)
    return `
<div class="pets-card pets-v r-${rarity} v-${variant}"${uid != null ? ` data-uid="${uid}"` : ''} style="animation-delay:${Math.min(i, 20) * 0.02}s">
  <img alt="" data-pet="${id}"${url ? ` src="${url}"` : ''}>
  <i class="pets-tag"></i>
  <span class="pets-mult"><i>${icon.coin}</i><b class="hud-txt">${formatMult(power)}</b></span>
</div>`
  }

  el.addEventListener('click', (e) => {
    const c = e.target.closest('.mut-grid .pets-card')
    if (c) return onPick(+c.dataset.uid)
    const b = e.target.closest('[data-act]')
    if (b) onAct(b.dataset.act)
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .pets-card') && document.pointerLockElement) document.exitPointerLock()
  })

  return {
    get isOpen() {
      return isOpen
    },
    open() {
      isOpen = true
      winEl.classList.add('open')
      replay(winEl, 'pop')
    },
    close() {
      isOpen = false
      winEl.classList.remove('open', 'pop')
    },
    // Pictures land later (rendered a few per frame).
    setPetImage(id, url) {
      for (const img of el.querySelectorAll(`img[data-pet="${id}"]`)) img.src = url
    },
    // list: the pets that can go in [{ uid, id, variant, rarity, power }], strongest first.
    paintList(list, picked) {
      gridEl.innerHTML = list.map((p, i) => card(p, i)).join('')
      emptyEl.textContent = list.length ? '' : 'No pets to mutate!\nHatch some eggs first.'
      for (const c of gridEl.querySelectorAll('.pets-card')) c.classList.toggle('is-picked', +c.dataset.uid === picked)
    },
    // The picked pet: { pet: { uid, id, variant, rarity, power }, after: {...}, name, cost, done } or
    // null (`done`: it has just turned, shown until another is picked); `coins` on hand.
    paintPick(pick, coins) {
      sideEl.classList.toggle('has-pick', !!pick)
      for (const c of gridEl.querySelectorAll('.pets-card')) c.classList.toggle('is-picked', +c.dataset.uid === pick?.pet.uid)
      if (!pick) {
        hintEl.textContent = 'Pick a pet to turn it Rainbow'
        return
      }
      hintEl.textContent = ''
      if (fromEl.dataset.uid !== String(pick.pet.uid)) {
        fromEl.dataset.uid = pick.pet.uid
        fromEl.innerHTML = card(pick.pet)
        toEl.innerHTML = card(pick.after)
      }
      nameEl.textContent = pick.name
      goEl.classList.toggle('is-spent', !!pick.done)
      goEl.querySelector('b').textContent = pick.done ? 'Rainbow!' : 'Mutate'
      costEl.querySelector('b').textContent = formatNum(pick.cost)
      haveEl.textContent = `You have ${formatNum(coins)}`
      haveEl.classList.toggle('is-short', coins < pick.cost)
    },
    refuse() {
      replay(goEl, 'is-no')
      replay(costEl, 'is-no')
    },
    // The pet just turned: the after card bursts.
    done() {
      replay(toEl, 'is-done')
    },
    toast(title, sub = '') {
      toastEl.querySelector('b').textContent = title
      toastEl.querySelector('span').textContent = sub
      replay(toastEl, 'show')
    },
    // Screen position (px) for the prompt, or null to hide it.
    prompt(x, y) {
      promptEl.classList.toggle('show', x != null)
      if (x != null) promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
  }
}
