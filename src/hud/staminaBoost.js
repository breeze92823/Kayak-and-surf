// The stamina boost button's DOM (staminaBoost.js): a round arm-and-paddle button floating over the
// raft with a countdown and a shrinking ring, a pointing hand tapping at it, and the "+25 Stamina"
// that floats up when it is hit.
import './staminaBoost.css'
import * as icon from './icons.js'

export function createStaminaBoostButton(root, { onTap }) {
  const el = document.createElement('div')
  el.className = 'sboost'
  el.innerHTML = `
<div class="sboost-at">
  <button class="sboost-btn" aria-label="Stamina boost">
    <span class="sboost-body">
      <span class="sboost-ring"></span>
      <span class="sboost-icon">${icon.staminaBoost}</span>
      <b class="hud-txt sboost-time">4.0</b>
    </span>
  </button>
  <i class="sboost-hand">${icon.pointer}</i>
  <b class="hud-txt sboost-pop"></b>
</div>`
  root.appendChild(el)

  const at = el.querySelector('.sboost-at')
  const btn = el.querySelector('.sboost-btn')
  const timeEl = el.querySelector('.sboost-time')
  const popEl = el.querySelector('.sboost-pop')
  const barEl = root.querySelector('.hud-progress')
  btn.addEventListener('click', () => onTap())
  let shown = ''

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }
  // '' (hidden) | 'show' | 'hit' (tapped: bursts away) | 'miss' (timed out: fades away)
  const state = (s) => {
    at.classList.remove('show', 'hit', 'miss', 'ending')
    if (s) replay(at, s)
  }

  return {
    show: () => state('show'),
    // Screen position (px) of the raft's head, and the seconds left of `total`.
    place(x, y, left, total) {
      at.style.transform = `translate(${x}px, ${y}px)`
      at.style.setProperty('--t', String(Math.max(0, left / total)))
      at.classList.toggle('ending', left < 1)
      const txt = left.toFixed(1)
      if (txt !== shown) timeEl.textContent = shown = txt
    },
    // On screen but off camera (behind it): keep it out of sight without ending it.
    offscreen(off) {
      at.classList.toggle('off', off)
    },
    hit(points) {
      state('hit')
      popEl.textContent = `+${points} Stamina`
      replay(popEl, 'pop')
      if (barEl) replay(barEl, 'boosted')
    },
    miss: () => state('miss'),
    hide: () => state(''),
  }
}
