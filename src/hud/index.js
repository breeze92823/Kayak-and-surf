// The on-screen HUD, laid out off the reference shot (1917x991, 1em = 16px there; hud.css scales
// it with the viewport). DOM over the canvas: the root ignores the pointer, buttons take it.
import './hud.css'
import { CHARACTER_COLORS, RIDE_PERKS } from '../config.js'
import { SLIDE } from '../hub/layout.js'
import * as icon from './icons.js'

// Distance bar: metres climbed up the slide (horizontal run north of its foot), linear, the top
// of the bar is the slide's end. Six labels like the shot's, one every fifth of the run (15 km).
const DIST_MAX = SLIDE.run
const DIST_TICKS = [0, 1, 2, 3, 4, 5].map((i) => (DIST_MAX * i) / 5)
const MARKER_GAP = 1.4 // em: markers closer than this on the bar fan out sideways
const RACER_LEFT = 3.8 // em: the innermost head's left (hud.css .hud-racer)
const FAN_STEP = 1.7 // em each further head in a cluster sits to the right
const FAN_MAX = 5 // heads past this pile on the last spot

// Placeholder values until the gameplay and net.js exist; change them through `hud.set`.
const state = {
  trophies: 0,
  coins: 0,
  distance: 0, // metres up the slide, the player's own marker (main.js feeds it every frame)
  // Everyone else in the room [{ id, distance, pfp }] (main.js, from net.js roster() poses and
  // Bloxity profile pictures); a racer without a `look` gets one of RACER_LOOKS picked by id.
  racers: [],
  pfp: '', // the player's own Bloxity profile picture for the "You" head ('' = the cartoon look)
  // Blue-lane ride (second reference shot): main.js sets `lane` while the player is in the blue
  // lane, `stamina` (0..100, stamina.js) for the bottom bar and `earned` (coins for the height
  // reached this visit, config LANE_REWARD, paid into `coins` on Surf!). ridePerks.js sets
  // `doubleLeft` (s of Double Speed left) and `afk` ('locked' | 'off' | 'on') for the side buttons.
  lane: false,
  stamina: 100,
  earned: 0,
  doubleLeft: 0,
  afk: 'locked',
  daily: false, // a daily reward is ready to claim (daily.js): the Daily Rewards button wears its badge
}
const ME_LOOK = { bg: '#2a2a2a', skin: CHARACTER_COLORS.skin, hair: CHARACTER_COLORS.hair, shades: '#4a3a7a' }
const RACER_LOOKS = [
  { skin: '#e9e9e9', smirk: true },
  { bg: '#2b2b2b', skin: '#c98a5a', hair: '#1c1c1c', beard: '#9a9a9a' },
  { skin: '#f2c79a', hair: '#c0502a', shades: '#5a3a8a' },
  { skin: '#f2c79a', hair: '#3a2a1a' },
]
// The same racer always gets the same head.
function racerLook(id) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0
  return RACER_LOOKS[Math.abs(h) % RACER_LOOKS.length]
}

// 0, 999, 43.06K, 1.5M ... up to the coach prices' Qa, Qi, Sx, Sp, Oc, No, Dc.
export function formatNum(n) {
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
  let i = 0
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000
    i++
  }
  return i === 0 ? String(Math.floor(n)) : n.toFixed(2).replace(/\.?0+$/, '') + units[i]
}
const formatDist = (m) => (m < 1000 ? `${Math.floor(m)}m` : `${(m / 1000).toFixed(1).replace(/\.0$/, '')}km`)
const distFrac = (m) => Math.min(1, Math.max(0, m / DIST_MAX))

const badge = (cls = '') => `<i class="hud-badge ${cls}">${icon.badge}</i>`

const price = (n, art = icon.robux) => `<span class="hud-price"><i>${art}</i><b class="hud-txt">${n}</b></span>`
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const tile = (id, art, label, extra = '') =>
  `<button class="hud-tile hud-tile-${id}" data-id="${id}">${extra}<span class="hud-tile-icon">${art}</span><span class="hud-txt">${label}</span></button>`

const html = () => `
<div class="hud-tc">
  <div class="hud-counter hud-counter-trophy"><i>${icon.trophy}</i><span class="hud-txt hud-trophies">${formatNum(state.trophies)}</span></div>
  <div class="hud-counter hud-counter-coin"><i>${icon.coin}</i><span class="hud-txt hud-coins">${formatNum(state.coins)}</span></div>
</div>

<div class="hud-tr">
  <button class="hud-round hud-daily" data-id="daily" aria-label="Daily Rewards">${icon.daily}${badge()}</button>
  <button class="hud-round" data-id="spin" aria-label="Spin">${icon.wheel}</button>
</div>

<div class="hud-dist">
  <i class="hud-dist-cup">${icon.trophy}</i>
  <div class="hud-dist-bar">
    ${DIST_TICKS.map((m) => `<span class="hud-txt hud-tick${m === 0 ? ' hud-tick-0' : ''}" style="bottom:${distFrac(m) * 100}%">${formatDist(m).toUpperCase()}</span>`).join('')}
    <span class="hud-txt hud-dist-me"></span>
  </div>
  <div class="hud-racers"></div>
</div>

<div class="hud-right">
  <button class="hud-offer" data-id="offer">
    <i class="hud-rays"></i>
    <span class="hud-offer-price"><i>${icon.robux}</i><b class="hud-txt">9</b></span>
    <span class="hud-offer-pet">${icon.bee}</span>
    <span class="hud-offer-boost"><i>${icon.coin}</i><b class="hud-txt">Boost x70</b></span>
    ${badge()}
  </button>
  <div class="hud-grid">
    ${tile('pet', icon.pet, 'Pet')}
    ${tile('coach', icon.coach, 'Coach')}
    ${tile('shop', icon.shop, 'Shop')}
    ${tile('trade', icon.trade, 'Trade')}
    ${tile('index', icon.book, 'Index', `<i class="hud-spark s4">${icon.sparkle}</i>`)}
  </div>
</div>

<div class="hud-lane">
  <div class="hud-earned">
    <span class="hud-txt hud-earned-title">You earned:</span>
    <span class="hud-earned-row"><i>${icon.coin}</i><b class="hud-txt hud-earned-val">${formatNum(state.earned)}</b></span>
  </div>
  <div class="hud-ride">
    <div class="hud-progress"><div class="hud-progress-fill"></div><span class="hud-txt hud-progress-pct">100%</span></div>
    <button class="hud-ride-btn hud-double" data-id="doubleSpeed">${price(RIDE_PERKS.doubleSpeed.wins, icon.trophy)}<span class="hud-txt hud-double-txt">Double Speed</span></button>
    <button class="hud-ride-btn hud-surf" data-id="surf"><span class="hud-txt">Surf!</span></button>
    <button class="hud-ride-btn hud-afk" data-id="afk">${price(formatNum(RIDE_PERKS.afk.coins), icon.coin)}<span class="hud-txt hud-afk-txt">AFK Auto-Play</span></button>
  </div>
  <div class="hud-timer"><i>${icon.envelope}</i><span class="hud-txt hud-timer-val">00:00</span></div>
</div>
`

// Handlers for the buttons that have somewhere to go (hooked via on()); the rest wait for their windows.
const ACTIONS = {}
// The centre windows' close() (Coach, Index, Pet, Spin, Shop): they share the screen, so opening
// one puts the rest away (hud.opening(id)).
const WINDOWS = {}
// fn(partial) after every set() (net.js saves coins and trophies).
const SET_LISTENERS = []

export function createHud() {
  const root = document.createElement('div')
  root.className = 'hud'
  root.innerHTML = html()
  document.body.appendChild(root)

  const trophiesEl = root.querySelector('.hud-trophies')
  const coinsEl = root.querySelector('.hud-coins')
  const racersEl = root.querySelector('.hud-racers')
  const meLabel = root.querySelector('.hud-dist-me')

  // Racer markers, one element per racer kept between repaints (so a profile picture isn't
  // reloaded every metre): placed by distance, then pushed apart from the bottom up so heads never
  // overlap. A head is the cartoon look until the racer's Bloxity `pfp` has loaded (or if it fails).
  const markers = new Map() // id -> { el, head, pfp }
  function setHead(m, r) {
    const url = (m.pfp = r.pfp || '')
    m.head.innerHTML = icon.avatar(r.look)
    if (!url) return
    const img = new Image()
    img.alt = ''
    img.onload = () => m.pfp === url && m.head.replaceChildren(img)
    img.src = url
  }
  function paintRacers() {
    const bar = racersEl.parentElement.querySelector('.hud-dist-bar')
    const em = parseFloat(getComputedStyle(root).fontSize) || 16
    const h = bar.clientHeight / em
    const all = [...state.racers.map((r) => ({ ...r, look: r.look ?? racerLook(r.id), me: false })), { id: 'me', distance: state.distance, look: ME_LOOK, pfp: state.pfp, me: true }]
    // Every head sits at its true height. Heads closer than MARKER_GAP form a cluster that fans out
    // sideways (stacking them upward put "You" kilometres too high on the 75 km bar once a few
    // players waited at the bottom); the player's own head is innermost and on top.
    all.sort((a, b) => a.distance - b.distance)
    const clusters = []
    for (const r of all) {
      const y = distFrac(r.distance) * h
      const last = clusters.at(-1)
      if (last && y - last.y < MARKER_GAP) last.list.push(r)
      else clusters.push({ y, list: [r] })
    }
    const place = new Map()
    for (const { list } of clusters) {
      list.sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0))
      list.forEach((r, i) => place.set(r.id, Math.min(i, FAN_MAX)))
    }
    const gone = new Set(markers.keys())
    for (const r of all) {
      const y = distFrac(r.distance) * h
      const fan = place.get(r.id)
      let m = markers.get(r.id)
      if (!m) {
        const el = document.createElement('div')
        el.className = `hud-racer${r.me ? ' is-me' : ''}`
        el.innerHTML = `<i class="hud-racer-arrow"></i><span class="hud-racer-head"></span>${r.me ? '<b class="hud-txt">You</b>' : ''}`
        m = { el, head: el.querySelector('.hud-racer-head'), pfp: null }
        markers.set(r.id, m)
        racersEl.appendChild(el)
      }
      if (m.pfp !== (r.pfp || '')) setHead(m, r)
      m.el.style.bottom = `${y}em`
      m.el.style.left = `${RACER_LEFT + fan * FAN_STEP}em`
      m.el.style.zIndex = r.me ? 20 : 10 - fan
      gone.delete(r.id)
    }
    for (const id of gone) {
      markers.get(id).el.remove()
      markers.delete(id)
    }
    meLabel.textContent = formatDist(state.distance)
    meLabel.style.bottom = `${distFrac(state.distance) * 100}%`
  }
  paintRacers()
  window.addEventListener('resize', paintRacers)

  // Blue-lane mode: CSS swaps the extra widgets in; the envelope timer counts this lane visit.
  const barEl = root.querySelector('.hud-progress')
  const fillEl = root.querySelector('.hud-progress-fill')
  const pctEl = root.querySelector('.hud-progress-pct')
  const earnedEl = root.querySelector('.hud-earned-val')
  const timerEl = root.querySelector('.hud-timer-val')
  let shownPct = -1
  let laneSince = 0
  let laneTimer = 0
  // Stamina bar; rounds up so it only reads 0% once it is truly empty.
  function paintProgress() {
    const pct = Math.ceil(Math.min(100, Math.max(0, state.stamina)))
    if (pct === shownPct) return
    shownPct = pct
    fillEl.style.width = `${pct}%`
    pctEl.textContent = `${pct}%`
    barEl.classList.toggle('is-empty', pct === 0)
  }
  function setLane(on) {
    root.classList.toggle('in-lane', on)
    clearInterval(laneTimer)
    if (!on) return
    laneSince = performance.now()
    const tick = () => (timerEl.textContent = clock((performance.now() - laneSince) / 1000))
    tick()
    laneTimer = setInterval(tick, 250)
  }
  paintProgress()

  // Double Speed shows the time left while it runs; AFK drops its price once bought and reads
  // ON/OFF, and stays on screen off the lane while it is on (.hud.afk-on).
  const doubleBtn = root.querySelector('.hud-double')
  const doubleTxt = root.querySelector('.hud-double-txt')
  const afkBtn = root.querySelector('.hud-afk')
  const afkTxt = root.querySelector('.hud-afk-txt')
  const dailyBtn = root.querySelector('.hud-daily')
  let shownDouble = -1
  function paintDouble() {
    const s = Math.ceil(state.doubleLeft)
    if (s === shownDouble) return
    shownDouble = s
    doubleTxt.textContent = s > 0 ? `2x ${clock(s)}` : 'Double Speed'
    doubleBtn.classList.toggle('is-on', s > 0)
  }
  function paintAfk() {
    afkTxt.textContent = state.afk === 'locked' ? 'AFK Auto-Play' : state.afk === 'on' ? 'AFK: ON' : 'AFK: OFF'
    afkBtn.classList.toggle('is-owned', state.afk !== 'locked')
    afkBtn.classList.toggle('is-on', state.afk === 'on')
    root.classList.toggle('afk-on', state.afk === 'on')
  }

  root.addEventListener('click', (e) => {
    const id = e.target.closest('button')?.dataset.id
    if (id) ACTIONS[id]?.()
  })
  // Releasing the pointer lock lets HUD buttons be clicked.
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') && document.pointerLockElement) document.exitPointerLock()
  })

  return {
    root,
    // Partial update, e.g. hud.set({ coins: 120 }) or hud.set({ distance: 1200, racers: [...] }).
    set(next) {
      // Distance, lane and progress arrive every frame: only real changes touch the DOM.
      const moved = 'distance' in next && Math.floor(next.distance) !== Math.floor(state.distance)
      const laneChanged = 'lane' in next && !!next.lane !== state.lane
      Object.assign(state, next)
      if ('trophies' in next) trophiesEl.textContent = formatNum(state.trophies)
      if ('coins' in next) coinsEl.textContent = formatNum(state.coins)
      if ('earned' in next) earnedEl.textContent = formatNum(state.earned)
      if (moved || 'racers' in next || 'pfp' in next) paintRacers()
      if ('stamina' in next) paintProgress()
      if (laneChanged) setLane((state.lane = !!next.lane))
      if ('doubleLeft' in next) paintDouble()
      if ('afk' in next) paintAfk()
      if ('daily' in next) dailyBtn.classList.toggle('is-ready', !!state.daily)
      for (const fn of SET_LISTENERS) fn(next)
    },
    // fn(partial) after every set(), e.g. to save when 'coins' in partial.
    onSet(fn) {
      SET_LISTENERS.push(fn)
    },
    // Current value of a field, e.g. hud.get('coins').
    get(key) {
      return state[key]
    },
    // Not affordable: the button shakes.
    refuse(id) {
      const el = root.querySelector(`[data-id="${id}"]`)
      el?.classList.remove('refuse')
      void el?.offsetWidth
      el?.classList.add('refuse')
    },
    // Gameplay hooks for buttons, e.g. hud.on('surf', launch). Ids: surf, doubleSpeed, afk, coach, daily, ...
    on(id, fn) {
      ACTIONS[id] = fn
    },
    // A centre window registers its close() under `id`, and calls opening(id) as it opens.
    addWindow(id, close) {
      WINDOWS[id] = close
    },
    opening(id) {
      for (const [other, close] of Object.entries(WINDOWS)) if (other !== id) close()
    },
  }
}
