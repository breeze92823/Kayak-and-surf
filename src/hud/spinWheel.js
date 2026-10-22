// The spin wheel's DOM: the Roblox-style proximity prompt ("E  Wheel / Spin", the Coach prompt's
// classes from coach.css), the Spin window (laid out off the user's reference shot, 1920x991: the
// prize wheel in the middle with a red gem pointer on top, red X, "Skip Animation" toggle, the
// OP! Spirit Wolf showcase on the right, and along the bottom the coin +1 Spin button, the green
// Spin button with the spins left (and the free-spin countdown under it) and the coin +10 Spin
// button), the prize toast, coins flying up to the counter, and the running-boost chips under the
// counters. While open the game behind is blurred and the HUD shows only the wins and coins
// counters, like the Coach window. The wheel is painted once on a canvas (prizes from config SPIN_WHEEL, potion and coin
// art from icons.js, the wolf's portrait) and turned by spinWheel.js through setAngle().
// Buttons come back through onAct('spin' | 'buy1' | 'buy10' | 'skip' | 'close' | 'open').
import './spinWheel.css'
import { SPIN_WHEEL } from '../config.js'
import * as icon from './icons.js'
import { formatNum } from './index.js'

const { prizes, prices } = SPIN_WHEEL
const N = prizes.length
const SEG = 360 / N
const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const BOOST = { speed: 'Speed', stamina: 'Stamina', win: 'Win', double: 'Speed' }
const POTION = { ...Object.fromEntries(prizes.filter((p) => p.potion).map((p) => [p.boost, p.potion])), double: '#ff9a2a' }
const chipLabel = (b) => (b.kind === 'double' ? '2x Speed' : `+${b.pct}% ${BOOST[b.kind]}`) // Double Speed (ridePerks.js)
const RAINBOW = ['#7a3aff', '#3a7aff', '#2ad8ff', '#4af06a', '#ffe23a', '#ff9a2a']

const hms = (s) => [s / 3600, (s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':')
const ms = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

// An inline-SVG icon as an <img> the canvas can draw (sized, or Firefox won't).
function svgImage(markup, size = 256) {
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace('<svg ', `<svg width="${size}" height="${size}" `))}`
  return img.decode().then(() => img, () => img)
}
const loadImage = (src) => {
  const img = new Image()
  img.src = src
  return img.decode().then(() => img, () => null)
}

// Rim, rim seam and peg colours: the window's salmon wheel, and the deck wheel's gold one (the
// 3D wheel on the SPIN pad, spinWheel.js), which also gets a pink hub.
const RIMS = {
  window: { outline: '#4a0a14', stops: ['#d8303e', '#ff7078', '#e8404c'], seam: '#8a1626', peg: ['#5a0a16', '#fff2e8'] },
  deck: { outline: '#1a0e02', stops: ['#e88a0a', '#ffd23a', '#f5a412'], seam: '#3a1c02', peg: ['#5a3200', '#fff07a'], hub: ['#ff9ab0', '#ff6a8a'] },
}

// Paints the wheel: rim with pegs every half wedge, the wedges (gradient edge to edge, lit
// in the middle, darker at the rim), each prize's name along the rim and its picture inside.
// Angles: 0 is straight up, clockwise; wedge i is centred on i * SEG. Pictures stay upright at rest.
export async function paintWheel(canvas, wolfUrl, look = 'window') {
  const rimLook = RIMS[look]
  const pics = {}
  await Promise.all([
    svgImage(icon.coin).then((img) => (pics.coin = img)),
    ...prizes.filter((p) => p.potion).map((p) => svgImage(icon.potion(p.potion)).then((img) => (pics[p.id] = img))),
    wolfUrl ? loadImage(wolfUrl).then((img) => (pics.wolf = img)) : null,
  ])
  await document.fonts?.load('700 40px Fredoka').catch(() => {})
  const S = canvas.width
  const g = canvas.getContext('2d')
  const c = S / 2
  const R0 = c - 6 // outer edge
  const R1 = R0 * 0.905 // wedges
  const rad = (deg) => ((deg - 90) * Math.PI) / 180 // our angle -> canvas angle
  g.clearRect(0, 0, S, S)

  // Rim.
  g.fillStyle = rimLook.outline
  g.beginPath()
  g.arc(c, c, R0, 0, Math.PI * 2)
  g.fill()
  const rim = g.createRadialGradient(c, c, R1, c, c, R0)
  rim.addColorStop(0, rimLook.stops[0])
  rim.addColorStop(0.35, rimLook.stops[1])
  rim.addColorStop(1, rimLook.stops[2])
  g.fillStyle = rim
  g.beginPath()
  g.arc(c, c, R0 - 6, 0, Math.PI * 2)
  g.fill()

  // Wedges.
  prizes.forEach((p, i) => {
    const a0 = rad(i * SEG - SEG / 2)
    const a1 = rad(i * SEG + SEG / 2)
    g.save()
    g.beginPath()
    g.moveTo(c, c)
    g.arc(c, c, R1, a0, a1)
    g.closePath()
    g.clip()
    let fill
    if (p.colors === 'rainbow') {
      fill = g.createRadialGradient(c, c, R1 * 0.1, c, c, R1)
      RAINBOW.forEach((col, k) => fill.addColorStop(k / (RAINBOW.length - 1), col))
    } else {
      const r = R1 * 0.6
      fill = g.createLinearGradient(c + Math.cos(a0) * r, c + Math.sin(a0) * r, c + Math.cos(a1) * r, c + Math.sin(a1) * r)
      fill.addColorStop(0, p.colors[0])
      fill.addColorStop(1, p.colors[1])
    }
    g.fillStyle = fill
    g.fillRect(0, 0, S, S)
    const shade = g.createRadialGradient(c, c, 0, c, c, R1)
    shade.addColorStop(0, 'rgba(255,255,255,0.35)')
    shade.addColorStop(0.45, 'rgba(255,255,255,0.08)')
    shade.addColorStop(0.85, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(0,0,0,0.22)')
    g.fillStyle = shade
    g.fillRect(0, 0, S, S)
    g.restore()
  })
  // Wedge seams and the inner edge of the rim.
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 4
  for (let i = 0; i < N; i++) {
    const a = rad(i * SEG + SEG / 2)
    g.beginPath()
    g.moveTo(c, c)
    g.lineTo(c + Math.cos(a) * R1, c + Math.sin(a) * R1)
    g.stroke()
  }
  g.strokeStyle = rimLook.seam
  g.lineWidth = 9
  g.beginPath()
  g.arc(c, c, R1 + 2, 0, Math.PI * 2)
  g.stroke()

  // Pegs on the rim, one per half wedge: the pointer clicks over them.
  const pegR = (R0 + R1) / 2
  for (let i = 0; i < N * 2; i++) {
    const a = rad((i * SEG) / 2 + SEG / 2)
    const x = c + Math.cos(a) * pegR
    const y = c + Math.sin(a) * pegR
    g.fillStyle = rimLook.peg[0]
    g.beginPath()
    g.arc(x, y + 2, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = rimLook.peg[1]
    g.beginPath()
    g.arc(x, y, 7.5, 0, Math.PI * 2)
    g.fill()
  }

  // Names along the rim and pictures inside, in each wedge's frame.
  prizes.forEach((p, i) => {
    const turn = (i * SEG * Math.PI) / 180
    g.save()
    g.translate(c, c)
    g.rotate(turn)
    const r = R1 * 0.8
    const maxW = 2 * r * Math.sin((SEG / 2) * (Math.PI / 180)) * 0.86
    let px = 40
    g.font = `700 ${px}px Fredoka, system-ui, sans-serif`
    const w = g.measureText(p.label).width
    if (w > maxW) {
      px = Math.floor((px * maxW) / w)
      g.font = `700 ${px}px Fredoka, system-ui, sans-serif`
    }
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineJoin = 'round'
    g.lineWidth = px * 0.26
    g.strokeStyle = '#1a1a1a'
    g.strokeText(p.label, 0, -r)
    g.fillStyle = '#ffffff'
    g.fillText(p.label, 0, -r)

    g.translate(0, -R1 * 0.52)
    g.rotate(-turn) // upright at rest
    const pic = p.kind === 'pet' ? pics.wolf : p.kind === 'coins' ? pics.coin : pics[p.id]
    if (pic) {
      g.shadowColor = 'rgba(0,0,0,0.35)'
      g.shadowBlur = 10
      g.shadowOffsetY = 5
      if (p.kind === 'pet') {
        const s = R1 * 0.5
        g.drawImage(pic, -s / 2, -s / 2, s, s)
      } else if (p.kind === 'coins') {
        // The big win is a little pile of three.
        const s = R1 * 0.3
        const pile = p.amount >= 1e5 ? [[-0.32, 0.18], [0.32, 0.18], [0, -0.12]] : [[0, 0]]
        for (const [dx, dy] of pile) g.drawImage(pic, dx * s - s / 2, dy * s - s / 2, s, s)
      } else {
        const s = R1 * 0.34
        g.rotate(-0.25)
        g.drawImage(pic, -s / 2, -s / 2, s, s)
      }
    }
    g.restore()
  })

  if (rimLook.hub) {
    const hub = g.createRadialGradient(c - 10, c - 10, 4, c, c, R1 * 0.09)
    hub.addColorStop(0, rimLook.hub[0])
    hub.addColorStop(1, rimLook.hub[1])
    g.fillStyle = rimLook.outline
    g.beginPath()
    g.arc(c, c, R1 * 0.1, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = hub
    g.beginPath()
    g.arc(c, c, R1 * 0.085, 0, Math.PI * 2)
    g.fill()
  }
}

export function createSpinWindow(root, { onAct }) {
  const el = document.createElement('div')
  el.className = 'spin'
  el.innerHTML = `
<button class="coach-prompt spin-prompt" data-act="open"><span class="coach-key">E</span><span class="coach-prompt-txt"><small>Wheel</small><b>Spin</b></span></button>
<div class="spin-boosts"></div>
<div class="spin-backdrop"></div>
<div class="spin-win">
  <div class="spin-stage">
    <div class="spin-wheel">
      <canvas class="spin-face" width="1024" height="1024"></canvas>
      <i class="spin-hl"></i>
      <i class="spin-hub"></i>
      <i class="spin-pointer">${icon.gem}</i>
    </div>
    <button class="spin-x" data-act="close" aria-label="Close">${CLOSE}</button>
    <div class="spin-skip"><span class="hud-txt">Skip Animation</span><button class="spin-toggle" data-act="skip" aria-label="Skip Animation"><i></i></button></div>
    <div class="spin-op">
      <i class="spin-op-swirl"></i>
      <img class="spin-op-pet" alt="">
      <b class="hud-txt spin-op-tag">OP!</b>
      <span class="hud-txt spin-op-txt">x200% better<br>than your best<br>pet!</span>
    </div>
    <div class="spin-col spin-col-1">
      <button class="spin-btn" data-act="buy1"><i>${icon.coin}</i><b class="hud-txt">${formatNum(prices.one)}</b></button>
      <span class="hud-txt">+1 Spin</span>
    </div>
    <div class="spin-col spin-col-go">
      <button class="spin-btn spin-go" data-act="spin"><b class="hud-txt">Spin</b></button>
      <em class="hud-txt spin-count"></em>
      <span class="hud-txt spin-next"></span>
    </div>
    <div class="spin-col spin-col-10">
      <button class="spin-btn" data-act="buy10"><i>${icon.coin}</i><b class="hud-txt">${formatNum(prices.ten)}</b><s class="hud-txt">${formatNum(prices.tenWas)}</s></button>
      <span class="hud-txt">+10 Spin</span>
    </div>
  </div>
</div>
<div class="spin-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.spin-prompt')
  const winEl = el.querySelector('.spin-win')
  const face = el.querySelector('.spin-face')
  const pointer = el.querySelector('.spin-pointer')
  const hl = el.querySelector('.spin-hl')
  const goBtn = el.querySelector('.spin-go')
  const countEl = el.querySelector('.spin-count')
  const nextEl = el.querySelector('.spin-next')
  const toggleEl = el.querySelector('.spin-toggle')
  const petImg = el.querySelector('.spin-op-pet')
  const toastEl = el.querySelector('.spin-toast')
  const boostsEl = el.querySelector('.spin-boosts')
  let isOpen = false
  let shownNext = ''
  let shownBoosts = ''
  let kick = 0 // pointer flick, eased back each setAngle

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  paintWheel(face, null)

  el.addEventListener('click', (e) => {
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
      root.classList.add('spin-open')
      winEl.classList.add('open')
      replay(winEl, 'pop')
    },
    close() {
      isOpen = false
      root.classList.remove('spin-open')
      winEl.classList.remove('open', 'pop')
    },
    // The Spirit Wolf's portrait (petPortraits.js) for the wheel and the showcase.
    setPortrait(url) {
      petImg.src = url
      paintWheel(face, url)
    },
    // Wheel turn in degrees (clockwise) and how fast it is going (0..1, for the pointer).
    setAngle(deg, dt = 0) {
      face.style.transform = `rotate(${deg}deg)`
      kick *= Math.exp(-14 * dt)
      pointer.style.transform = `rotate(${(-kick * 24).toFixed(2)}deg)`
    },
    // A peg hit the pointer.
    tick() {
      kick = 1
    },
    // Spins left, seconds to the next free one, whether the wheel is turning, Skip Animation.
    paint({ spins, next, spinning, skip }) {
      countEl.textContent = `x${spins}`
      goBtn.classList.toggle('is-empty', spins <= 0)
      winEl.classList.toggle('is-spinning', spinning)
      toggleEl.classList.toggle('on', skip)
      const txt = `+1 spin in ${hms(Math.max(0, next))}`
      if (txt !== shownNext) nextEl.textContent = shownNext = txt
    },
    // Glow on the wedge under the pointer once the wheel stops (false to clear).
    highlight(on) {
      hl.classList.toggle('on', on)
    },
    // No spins left: shake the Spin button and nudge the buy ones.
    refuse() {
      replay(goBtn, 'is-no')
      for (const b of el.querySelectorAll('.spin-col-1 .spin-btn, .spin-col-10 .spin-btn')) replay(b, 'is-nudge')
    },
    bought() {
      replay(countEl, 'is-up')
    },
    // Too few coins for that pack: shake its button.
    short(n) {
      replay(el.querySelector(n === 10 ? '.spin-col-10 .spin-btn' : '.spin-col-1 .spin-btn'), 'is-no')
    },
    // Big outlined toast: `kind` 'coins' | 'boost' | 'pet' colours it.
    toast(title, sub, kind) {
      toastEl.className = `spin-toast is-${kind}`
      toastEl.querySelector('b').textContent = title
      toastEl.querySelector('span').textContent = sub
      replay(toastEl, 'show')
    },
    // Coins burst out of the wheel and fly up to the coin counter; calls back as they land.
    flyCoins(n, landed) {
      const from = face.getBoundingClientRect()
      const to = root.querySelector('.hud-counter-coin i')?.getBoundingClientRect()
      if (!to) return landed()
      const x0 = from.left + from.width / 2
      const y0 = from.top + from.height / 2
      for (let i = 0; i < n; i++) {
        const c = document.createElement('i')
        c.className = 'spin-coin'
        c.innerHTML = icon.coin
        el.appendChild(c)
        const a = Math.random() * Math.PI * 2
        const burst = (0.1 + Math.random() * 0.12) * from.width
        const mx = x0 + Math.cos(a) * burst
        const my = y0 + Math.sin(a) * burst
        const tx = to.left + to.width / 2
        const ty = to.top + to.height / 2
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
    // Screen position (px) for the prompt, or null to hide it.
    prompt(x, y) {
      promptEl.classList.toggle('show', x != null)
      if (x != null) promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
    // Running boosts ({ kind, pct, left } from boosts.js) as chips under the counters.
    paintBoosts(list) {
      const key = list.map((b) => `${b.kind}${b.pct}${Math.ceil(b.left)}`).join()
      if (key === shownBoosts) return
      shownBoosts = key
      boostsEl.innerHTML = list
        .map((b) => `<span class="spin-chip" title="${chipLabel(b)}"><i>${icon.potion(POTION[b.kind] ?? '#fff')}</i><b class="hud-txt">${ms(Math.ceil(b.left))}</b><small class="hud-txt">${chipLabel(b)}</small></span>`)
        .join('')
    },
  }
}
