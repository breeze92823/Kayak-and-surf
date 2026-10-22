// The Coach's DOM: the Roblox-style proximity prompt ("E  Coach / Train") pinned beside the Coach,
// the Coach window (laid out off the user's reference shot, 1917x991: dark glass panel, grey header
// with the title, "Equipped: n/slots" and a red X, a scrolling 3-column grid of coach cards, each
// a rarity-coloured portrait with the name under it, "Effect:" + one line per effect
// ("Speed:+18%"), and a button:
// coin price (blue) to buy, Equip (green), Unequip (red), Equipped (grey, a locked coach)) and the big toast. While the window is
// open the game behind is blurred and the HUD shows only the wins and coins counters.
// coach.js drives it; card buttons and the X come back through onPick(id) / onClose().
import './coach.css'
import { training } from '../training.js'
import { formatNum } from './index.js'
import * as icon from './icons.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const EFFECT = { speed: 'Speed', coin: 'Coin', stamina: 'Stamina' }

const effectLines = (c) => Object.entries(c.effects).map(([k, v]) => `<span class="hud-txt">${EFFECT[k]}:+${v}%</span>`).join('')
const card = (c, i) => `
<div class="coach-card rarity-${c.rarity}" data-id="${c.id}" style="animation-delay:${i * 0.035}s">
  <span class="coach-card-face"><img alt=""></span>
  <b class="hud-txt coach-card-name">${c.name}</b>
  <span class="hud-txt coach-card-label">Effect:</span>
  <span class="coach-card-effects">${effectLines(c)}</span>
  <i class="hud-txt coach-card-tag">EQUIPPED</i>
  <button class="coach-btn" data-act="pick" data-id="${c.id}"></button>
</div>`

export function createCoachWindow(root, { onPick, onClose }) {
  const el = document.createElement('div')
  el.className = 'coach'
  el.innerHTML = `
<button class="coach-prompt" data-act="open"><span class="coach-key">E</span><span class="coach-prompt-txt"><small>Coach</small><b>Train</b></span></button>
<div class="coach-backdrop"></div>
<div class="coach-win">
  <div class="coach-panel">
    <div class="coach-head">
      <b class="hud-txt coach-title">Coach</b>
      <span class="hud-txt coach-slots"></span>
      <button class="coach-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="coach-grid">${training.coaches.map(card).join('')}</div>
  </div>
</div>
<div class="coach-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.coach-prompt')
  const winEl = el.querySelector('.coach-win')
  const slotsEl = el.querySelector('.coach-slots')
  const toastEl = el.querySelector('.coach-toast')
  const cards = Object.fromEntries([...el.querySelectorAll('.coach-card')].map((c) => [c.dataset.id, c]))
  let isOpen = false
  let onOpen = () => {}

  // Retrigger a CSS animation class.
  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  function paint() {
    slotsEl.textContent = `Equipped: ${training.equippedCount}/${training.slots}`
    for (const c of training.coaches) {
      const node = cards[c.id]
      const owns = training.owns(c.id)
      const on = training.isEquipped(c.id)
      const btn = node.querySelector('.coach-btn')
      node.classList.toggle('is-equipped', on)
      const locked = on && training.isLocked(c.id)
      btn.className = `coach-btn ${!owns ? 'is-buy' : locked ? 'is-locked' : on ? 'is-off' : 'is-equip'}`
      btn.innerHTML = !owns ? `<i>${icon.coin}</i><b class="hud-txt">${formatNum(c.price)}</b>` : `<b class="hud-txt">${locked ? 'Equipped' : on ? 'Unequip' : 'Equip'}</b>`
    }
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (!b) return
    if (b.dataset.act === 'pick') onPick(b.dataset.id)
    else if (b.dataset.act === 'close') onClose()
    else if (b.dataset.act === 'open') onOpen()
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') && document.pointerLockElement) document.exitPointerLock()
  })

  return {
    get isOpen() {
      return isOpen
    },
    set onOpen(fn) {
      onOpen = fn
    },
    // { [coach id]: image url } from coachPortraits.js.
    setPortraits(urls) {
      for (const c of training.coaches) cards[c.id].querySelector('img').src = urls[c.id] ?? ''
    },
    open() {
      isOpen = true
      paint()
      root.classList.add('coach-open')
      winEl.classList.add('open')
      replay(winEl, 'pop')
    },
    close() {
      isOpen = false
      root.classList.remove('coach-open')
      winEl.classList.remove('open', 'pop')
    },
    paint,
    // Screen position (px) for the prompt, or null to hide it.
    prompt(x, y) {
      promptEl.classList.toggle('show', x != null)
      if (x != null) promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
    // Celebrations: 'new' (bought), 'on' (equipped), 'off' (unequipped).
    flash(id, kind) {
      paint()
      replay(cards[id], kind === 'new' ? 'is-new' : kind === 'on' ? 'is-on' : 'is-off')
      if (kind === 'off') return
      const c = training.coach(id)
      toastEl.querySelector('b').textContent = kind === 'new' ? `${c.name} joined!` : `${c.name} equipped!`
      toastEl.querySelector('span').textContent = Object.entries(c.effects).map(([k, v]) => `${EFFECT[k]} +${v}%`).join('   ')
      replay(toastEl, 'show')
    },
    // Can't: not enough coins (the price button) or every slot taken (the Equipped counter too).
    refuse(id, full = false) {
      replay(cards[id], 'is-no')
      if (full) replay(slotsEl, 'is-no')
    },
  }
}
