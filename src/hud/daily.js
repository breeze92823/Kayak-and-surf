// The Daily Rewards window (daily.js drives it), in the egg window's glass look (eggs.css panel,
// head and X): the 7 days in a row, each card "Day N", the reward's picture, amount and name, and
// its state: Claim! (ready, glowing), a green check (claimed), the countdown (the next to open) or a
// padlock. Day 7 is the big gold one. A footer counts down to the next day. Clicking a card comes
// back through onClaim(day), the X through onAct('close').
import './daily.css'
import { SPIN_WHEEL } from '../config.js'
import { describe } from '../daily.js'
import { petIndex } from '../petIndex.js'
import * as icon from './icons.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const POTION = Object.fromEntries(SPIN_WHEEL.prizes.filter((p) => p.potion).map((p) => [p.boost, p.potion]))
const COUNTER = { coins: '.hud-counter-coin i', trophies: '.hud-counter-trophy i' }

const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

function art(r) {
  if (r.kind === 'coins') return icon.coin
  if (r.kind === 'trophies') return icon.trophy
  if (r.kind === 'spins') return icon.wheel
  if (r.kind === 'boost') return icon.potion(POTION[r.boost] ?? '#fff')
  return `<img alt="" data-pet="${r.pet}">`
}

const card = ({ day, reward: r }) => {
  const { amount, name } = describe(r)
  const rar = r.kind === 'pet' ? ` r-${petIndex.pet(r.pet).rarity}` : ''
  return `
<button class="daily-card k-${r.kind}${day === 7 ? ' is-big' : ''}" data-day="${day}" style="animation-delay:${(day - 1) * 0.04}s">
  <b class="hud-txt daily-day">Day ${day}</b>
  <i class="daily-art${rar}">${art(r)}</i>
  <b class="hud-txt daily-amt">${amount}</b>
  <small class="hud-txt daily-name">${name}</small>
  <span class="daily-state">
    <b class="hud-txt daily-claim">Claim!</b>
    <i class="daily-check">${icon.check}</i>
    <b class="hud-txt daily-left"></b>
    <i class="daily-lock">${icon.padlock}</i>
  </span>
</button>`
}

export function createDailyWindow(root, { onAct, onClaim }) {
  const el = document.createElement('div')
  el.className = 'daily'
  el.innerHTML = `
<div class="daily-win">
  <div class="eggs-panel daily-panel">
    <div class="eggs-head">
      <i class="daily-head-art">${icon.gift}</i>
      <b class="hud-txt eggs-title">Daily Rewards</b>
      <button class="eggs-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="daily-days"></div>
    <span class="hud-txt daily-foot"></span>
  </div>
</div>
<div class="coach-toast daily-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const winEl = el.querySelector('.daily-win')
  const daysEl = el.querySelector('.daily-days')
  const footEl = el.querySelector('.daily-foot')
  const toastEl = el.querySelector('.daily-toast')
  let isOpen = false
  const petUrl = {}
  let built = false
  let shown = ''

  const replay = (node, cls) => {
    node?.classList.remove(cls)
    void node?.offsetWidth
    node?.classList.add(cls)
  }
  const cardEl = (day) => daysEl.querySelector(`[data-day="${day}"]`)

  el.addEventListener('click', (e) => {
    const c = e.target.closest('.daily-card')
    if (c) return onClaim(+c.dataset.day)
    const b = e.target.closest('[data-act]')
    if (b) onAct(b.dataset.act)
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') && document.pointerLockElement) document.exitPointerLock()
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
    // The pet reward's picture (rendered the first time the window opens).
    setPetImage(id, url) {
      petUrl[id] = url
      for (const img of el.querySelectorAll(`img[data-pet="${id}"]`)) img.src = url
    },
    // days: daily.js calendar() [{ day, reward, status, left, pending }]; `waiting` while a signed-in
    // player's week is still on its way from the server. Cards are built once; states and countdowns
    // repaint in place.
    paint(days, { waiting = false } = {}) {
      if (!built) {
        built = true
        daysEl.innerHTML = days.map(card).join('')
        for (const [id, url] of Object.entries(petUrl)) this.setPetImage(id, url)
      }
      const key = days.map((d) => d.status + (d.pending ? '*' : '')).join()
      if (key !== shown) {
        shown = key
        for (const d of days) {
          const c = cardEl(d.day)
          for (const s of ['claimed', 'ready', 'next', 'locked']) c.classList.toggle(`is-${s}`, d.status === s)
          c.classList.toggle('is-pending', d.pending)
        }
      }
      const next = days.find((d) => d.status === 'next')
      if (next) cardEl(next.day).querySelector('.daily-left').textContent = clock(next.left)
      const ready = days.filter((d) => d.status === 'ready').length
      if (waiting) footEl.textContent = 'Connecting to the server…'
      else footEl.textContent = ready ? `${ready} reward${ready > 1 ? 's' : ''} to claim!` : next ? `Next reward in ${clock(next.left)}` : ''
      footEl.classList.toggle('is-ready', ready > 0)
    },
    // A day just claimed: its card bursts.
    claimed(day) {
      replay(cardEl(day), 'is-got')
    },
    refuse(day) {
      replay(cardEl(day), 'is-no')
    },
    toast(title, sub = '') {
      toastEl.querySelector('b').textContent = title
      toastEl.querySelector('span').textContent = sub
      replay(toastEl, 'show')
    },
    // Coins or trophies burst out of the day's card and fly up to their counter; calls back as
    // the first lands.
    fly(day, kind, n, landed) {
      const from = cardEl(day)?.querySelector('.daily-art').getBoundingClientRect()
      const to = root.querySelector(COUNTER[kind])?.getBoundingClientRect()
      if (!from || !to) return landed()
      const x0 = from.left + from.width / 2
      const y0 = from.top + from.height / 2
      const tx = to.left + to.width / 2
      const ty = to.top + to.height / 2
      for (let i = 0; i < n; i++) {
        const c = document.createElement('i')
        c.className = 'daily-fly'
        c.innerHTML = kind === 'coins' ? icon.coin : icon.trophy
        el.appendChild(c)
        const a = Math.random() * Math.PI * 2
        const burst = (0.4 + Math.random() * 0.5) * from.width
        const mx = x0 + Math.cos(a) * burst
        const my = y0 + Math.sin(a) * burst
        const anim = c.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(0.3)`, opacity: 0 },
            { transform: `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(1.15)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${tx}px, ${ty}px) translate(-50%, -50%) scale(0.6)`, opacity: 1 },
          ],
          { duration: 750 + i * 45, delay: i * 25, easing: 'cubic-bezier(0.45, 0, 0.6, 1)', fill: 'both' },
        )
        anim.onfinish = () => {
          c.remove()
          if (i === 0) landed()
        }
      }
    },
  }
}
