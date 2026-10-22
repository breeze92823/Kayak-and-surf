// Daily rewards (config DAILY_REWARDS; the window is hud/daily.js): a 7-day calendar opened by the
// HUD's top-right check-list button (hud.on('daily'), toggles). Day N opens N - 1 days after the
// week started and stays claimable until claimed, in any order; claiming the last one starts the
// next week (a week after this one began, or now if that is later). A claim pays coins or trophies
// (they fly up to their counter and it counts up), spin-wheel spins (spinWheel.addSpins), a timed
// boost (boosts.js, shown as a chip under the counters) or a pet (`bag.add` + the Index; refused
// while storage is full). The HUD button wears a red badge while a day is ready (hud state `daily`).
// Where the calendar lives (after Paper-plane's daily.js):
//  - Signed in, with a server: on the server (backend src/daily.ts). It decides every claim and
//    sends back the reward to apply, so a reward is never granted twice across tabs, reloads or
//    devices. Until its calendar arrives nothing is claimable ('waiting'), and claims wait for a
//    connection. Countdowns run on the server's clock (its `now` sets an offset).
//  - A guest, or a build with no server: in this browser (localStorage), claims decided here by the
//    same rules.
import { DAILY_REWARDS } from './config.js'
import { boosts } from './boosts.js'
import { inventory } from './petInventory.js'
import { petIndex as pets } from './petIndex.js'
import { petPortrait } from './petPortraits.js'
import { subscribeAuth } from './bloxity.js'
import { accountId, hasServer, net, onNet, send } from './net.js'
import { sfx } from './sfx.js'
import { createDailyWindow } from './hud/daily.js'
import { formatNum } from './hud/index.js'

const { days, storageKey } = DAILY_REWARDS
const DAYS = days.length
const BOOST = { speed: 'Speed', stamina: 'Stamina', win: 'Wins' }
const COUNTER = { coins: 'Coins', trophies: 'Trophies' }
const DENIED = { locked: ['Not yet!', 'Come back tomorrow'], claimed: ['Already claimed!', ''], signin: ['Sign in to claim', ''] }

// What a day's card says: { amount, name } (pictures are the window's, by kind).
export function describe(r) {
  if (r.kind === 'coins' || r.kind === 'trophies') return { amount: formatNum(r.amount), name: COUNTER[r.kind] }
  if (r.kind === 'spins') return { amount: `x${r.amount}`, name: r.amount === 1 ? 'Spin' : 'Spins' }
  if (r.kind === 'boost') return { amount: `+${r.pct}%`, name: `${BOOST[r.boost]} ${Math.round(r.time / 60)}m` }
  return { amount: 'x1', name: pets.pet(r.pet).name }
}

// A reward as the server sent it, checked before it touches anything; null if it isn't one.
function validReward(r) {
  const n = (v) => Number.isFinite(v) && v > 0
  if ((r?.kind === 'coins' || r?.kind === 'trophies' || r?.kind === 'spins') && n(r.amount)) return r
  if (r?.kind === 'boost' && BOOST[r.boost] && n(r.pct) && n(r.time)) return r
  if (r?.kind === 'pet' && pets.pet(r.pet)) return r
  return null
}

export function createDaily({ hud, renderer, spinWheel, index, bag }) {
  // mode: 'local' | 'server' | 'waiting'. pending: the day a server claim is out for.
  const week = { mode: 'local', start: 0, claimed: [], dayMs: DAILY_REWARDS.dayMs, offset: 0, pending: null }
  const now = () => Date.now() + week.offset

  const win = createDailyWindow(hud.root, { onAct, onClaim: claim })
  hud.on('daily', () => (win.isOpen ? close() : open()))
  const tweens = {} // counter -> { from, to, t } while it counts up
  let clock = 0
  let shownReady = null

  // --- Where the calendar lives -------------------------------------------------------
  function loadLocal() {
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch {
      // Blocked or junk storage: a fresh week.
    }
    const t = Date.now()
    const ok = saved && Number.isFinite(saved.start)
    Object.assign(week, { mode: 'local', offset: 0, dayMs: DAILY_REWARDS.dayMs, pending: null })
    week.start = ok ? Math.min(saved.start, t) : t
    week.claimed = ok && Array.isArray(saved.claimed) ? [...new Set(saved.claimed.filter((d) => Number.isInteger(d) && d >= 1 && d <= DAYS))] : []
    if (!ok) saveLocal()
    changed()
  }
  function saveLocal() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ start: week.start, claimed: week.claimed }))
    } catch {
      // Storage blocked: the calendar lasts this visit.
    }
  }
  // The server's week for this account: { start, claimed, now, dayMs }.
  function applyView(view) {
    if (!view || !Number.isFinite(view.start) || !Number.isFinite(view.now)) return
    week.mode = 'server'
    week.start = view.start
    week.claimed = Array.isArray(view.claimed) ? view.claimed.filter((d) => Number.isInteger(d)) : []
    week.dayMs = view.dayMs > 0 ? view.dayMs : DAILY_REWARDS.dayMs
    week.offset = view.now - Date.now()
  }
  // A signed-in player (with a server to ask) waits for the server's week; anyone else uses this
  // browser's.
  function syncIdentity() {
    if (accountId() && hasServer()) {
      if (week.mode === 'local') {
        Object.assign(week, { mode: 'waiting', pending: null })
        changed()
      }
    } else if (week.mode !== 'local') loadLocal()
  }

  onNet('daily', (view) => {
    if (view) applyView(view)
    else loadLocal() // a guest (or signed out): back to this browser's calendar
    week.pending = null
    changed()
  })
  onNet('dailyClaimed', (msg) => {
    week.pending = null
    applyView(msg?.daily)
    const r = validReward(msg?.reward)
    if (r) {
      grant(r, msg.day)
      win.claimed(msg.day)
    }
    changed()
  })
  onNet('dailyDenied', (msg) => {
    week.pending = null
    applyView(msg?.daily)
    const [title, sub] = DENIED[msg?.reason] ?? ['Try again later', '']
    refuse(msg?.day, title, sub)
    changed()
  })

  // --- The calendar ---------------------------------------------------------------------
  // Every day's state: 'claimed', 'ready', 'next' (the first still shut; `left` ms until it opens)
  // or 'locked' (also every day while the server's week is still on its way).
  function calendar() {
    const t = now()
    let nextShown = false
    return days.map((reward, i) => {
      const day = i + 1
      const opens = week.start + i * week.dayMs
      let status = 'locked'
      let left = 0
      if (week.mode === 'waiting') status = 'locked'
      else if (week.claimed.includes(day)) status = 'claimed'
      else if (t >= opens) status = 'ready'
      else if (!nextShown) {
        nextShown = true
        status = 'next'
        left = opens - t
      }
      return { day, reward, status, left, pending: week.pending === day }
    })
  }

  const paint = () => win.paint(calendar(), { waiting: week.mode === 'waiting' })
  function changed() {
    if (win.isOpen) paint()
    paintBadge()
  }

  function onAct(act) {
    if (act === 'close') close()
  }

  function open() {
    hud.opening('daily')
    document.exitPointerLock?.() // the window needs the cursor
    const pet = days.find((r) => r.kind === 'pet')
    if (pet) win.setPetImage(pet.pet, petPortrait(renderer, pet.pet)) // rendered on first open
    win.open()
    hud.root.classList.add('daily-open')
    paint()
    sfx.page({})
  }

  function close() {
    if (!win.isOpen) return
    win.close()
    hud.root.classList.remove('daily-open')
    sfx.page({ level: 0.6 })
  }
  hud.addWindow('daily', close)

  function refuse(day, title, sub) {
    if (day) win.refuse(day)
    win.toast(title, sub)
    sfx.denied({})
  }

  // --- Claiming ---------------------------------------------------------------------------
  function claim(day) {
    const entry = calendar()[day - 1]
    if (!entry || entry.status === 'claimed' || week.pending) return
    if (week.mode === 'waiting') return refuse(day, 'Connecting…', 'Try again in a moment')
    if (entry.status !== 'ready') return refuse(day, ...DENIED.locked)
    if (entry.reward.kind === 'pet' && inventory.full) return refuse(day, 'Pets full!', 'Delete some pets first')
    if (week.mode === 'server') {
      // The server decides and answers with the reward (dailyClaimed) or why not (dailyDenied).
      if (!net.connected) return refuse(day, 'Reconnecting…', 'Try again in a moment')
      week.pending = day
      send('claimDaily', { day })
      return
    }
    week.claimed.push(day)
    if (week.claimed.length >= DAYS) {
      week.start = Math.max(week.start + DAYS * week.dayMs, Date.now())
      week.claimed = []
    }
    saveLocal()
    grant(entry.reward, day)
    win.claimed(day)
    changed()
  }

  // Counters count up to the new total once the flying coins/trophies land. What is still in the air
  // (`owed`) or counting up is settled at once if the page goes away (before net.js saves), so a
  // claim the server has recorded is never lost to a reload.
  const owed = { coins: 0, trophies: 0 }
  const countUp = (key, amount) => {
    const shown = hud.get(key)
    tweens[key] = { from: shown, to: (tweens[key]?.to ?? shown) + amount, t: 0 }
  }
  function settle() {
    for (const key of Object.keys(owed)) {
      const to = (tweens[key]?.to ?? hud.get(key)) + owed[key]
      delete tweens[key]
      owed[key] = 0
      if (to !== hud.get(key)) hud.set({ [key]: to })
    }
  }
  window.addEventListener('beforeunload', settle)
  document.addEventListener('visibilitychange', () => document.hidden && settle())

  function grant(r, day) {
    const { amount, name } = describe(r)
    if (r.kind === 'coins' || r.kind === 'trophies') {
      win.toast(`+${amount} ${name}!`, `Day ${day} reward`)
      sfx.fanfare()
      sfx.coins(8)
      owed[r.kind] += r.amount
      win.fly(day, r.kind, 10, () => {
        if (owed[r.kind] < r.amount) return // settled already
        owed[r.kind] -= r.amount
        countUp(r.kind, r.amount)
        sfx.coins(5)
      })
    } else if (r.kind === 'spins') {
      spinWheel.addSpins(r.amount)
      win.toast(`+${r.amount} ${name}!`, 'Spin the wheel to use it')
      sfx.fanfare()
    } else if (r.kind === 'boost') {
      boosts.add(r.boost, r.pct, r.time)
      win.toast(`+${r.pct}% ${BOOST[r.boost]}!`, `Boost for ${Math.round(r.time / 60)} min`)
      sfx.fanfare()
    } else if (r.kind === 'pet') {
      const fresh = !pets.has(r.pet) // asked first: bag.add discovers it too
      const kept = !!bag.add(r.pet)
      if (kept) index.discover(r.pet)
      win.toast(`${name}!`, !kept ? 'Pet storage full!' : fresh ? 'New pet in your Index!' : 'Added to your pets!')
      sfx.fanfare(true)
      sfx.claps(4, { delay: 0.55 })
    }
  }

  function paintBadge() {
    const ready = calendar().some((d) => d.status === 'ready')
    if (ready === shownReady) return
    shownReady = ready
    hud.set({ daily: ready })
  }

  loadLocal()
  subscribeAuth(syncIdentity)
  syncIdentity()

  return {
    get isOpen() {
      return win.isOpen
    },
    get mode() {
      return week.mode
    },
    open,
    close,
    calendar,
    // Dev hook: __game.daily.skip() moves this browser's week a day on (the next day opens). The
    // server's week can't be moved from here: start the backend with DAILY_DAY_MS instead.
    skip(n = 1) {
      if (week.mode !== 'local') return console.warn('[daily] the server keeps this week; use DAILY_DAY_MS on the backend')
      week.start -= n * week.dayMs
      saveLocal()
      changed()
    },
    update(dt) {
      for (const [key, tw] of Object.entries(tweens)) {
        tw.t = Math.min(1, tw.t + dt / 0.8)
        hud.set({ [key]: Math.round(tw.from + (tw.to - tw.from) * (1 - (1 - tw.t) ** 3)) })
        if (tw.t >= 1) delete tweens[key]
      }
      // Days open with the clock: the badge and the open window's countdowns follow.
      clock -= dt
      if (clock > 0) return
      clock = 0.25
      paintBadge()
      if (win.isOpen) paint()
    },
  }
}
