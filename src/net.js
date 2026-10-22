// Colyseus link to Kayak-and-surf -backend (room "world"): loads and saves the player's progress
// (HUD coins and trophies, and the snapshot() / hydrate() of kayaks.js, training.js, petIndex.js
// and petInventory.js), exposes the room's roster and carries the pet-trade messages for
// hud/trade.js. Never throws and never blocks play: with no server (or an unreachable one) the game
// runs solo, and trading says it needs a connection.
//
// Trades are the one server-checked part: the server keeps each player's pet list as last saved and
// swaps the pets itself (backend src/rooms/trades.ts). Every finished trade bumps `petsRev`; saves
// carry it, so a save written before a trade landed can't bring back pets that were traded away.
// A signed-in player's daily rewards are server-checked too (backend src/daily.ts): daily.js sends
// `claimDaily` and listens for `daily` / `dailyClaimed` / `dailyDenied` through onNet().
import { Client } from '@colyseus/sdk'
import { DEV_MODE, GAME_SLUG, NET, SERVER_URL } from './config.js'
import { authState, getPfp, sdk, subscribeAuth } from './bloxity.js'
import { inventory } from './petInventory.js'
import { kayaks } from './kayaks.js'
import { training } from './training.js'
import { petIndex } from './petIndex.js'

// Server -> client trade messages, handed to onNet() listeners.
const TRADE_MESSAGES = ['tradeIncoming', 'tradeIncomingGone', 'tradeRequestEnded', 'tradeOpen', 'tradeUpdate', 'tradeClosed', 'tradeDone']
// Server -> client daily-reward messages (backend src/daily.ts), for daily.js: `daily` (this
// account's week, or null for a guest), `dailyClaimed` and `dailyDenied`.
const DAILY_MESSAGES = ['daily', 'dailyClaimed', 'dailyDenied']

export const net = {
  room: null,
  connected: false,
  hydrated: false, // a progress/noProgress answer arrived: saving is allowed
  get sessionId() {
    return this.room?.sessionId ?? null
  },
  get players() {
    return this.room?.state?.players ?? null
  },
  // Signed in as far as the server is concerned (guests can't trade).
  get signedIn() {
    return !!this.players?.get(this.sessionId)?.signedIn
  },
}

const listeners = {} // type -> Set(fn); also 'roster' (state patches) and 'connection'
function emit(type, msg) {
  for (const fn of listeners[type] ?? []) {
    try {
      fn(msg)
    } catch (err) {
      console.warn('[net] listener threw', type, err)
    }
  }
}
// fn(msg) for a server message type, 'roster' (any state change) or 'connection' (connected or not).
export function onNet(type, fn) {
  ;(listeners[type] ??= new Set()).add(fn)
  return () => listeners[type].delete(fn)
}

// Everyone else in the room: [{ id, name, handle, signedIn, trading, x, z, pfp }], by name.
export function roster() {
  const out = []
  net.players?.forEach((p, id) => {
    if (id !== net.sessionId) out.push({ id, name: p.username || 'Player', handle: p.handle || '', signedIn: !!p.signedIn, trading: !!p.trading, x: p.x, z: p.z, pfp: p.pfp || '' })
  })
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// --- Identity ----------------------------------------------------------------
// Signed-in players use their Bloxity id; everyone else a per-browser guest id (never saved, can't
// trade). Dev mode (no SDK) gives each tab its own signed-in dev id, so two tabs can trade.
function storedId(storage, key, make) {
  try {
    let id = storage.getItem(key)
    if (!id) storage.setItem(key, (id = make()))
    return id
  } catch {
    return make()
  }
}
const rand = () => Math.random().toString(36).slice(2, 8)
const GUEST = storedId(globalThis.localStorage, 'kas-guest', () => `guest-${rand()}`)
const DEV = DEV_MODE ? storedId(globalThis.sessionStorage, 'kas-dev', () => `dev-${rand()}`) : ''

function identity() {
  if (DEV) return { userId: DEV, username: `Dev ${DEV.slice(4)}`, handle: DEV }
  const u = authState.user
  const id = u && (u._id || u.id || u.userId || u.uid)
  if (!id) return { userId: GUEST, username: authState.guest?.displayName || authState.guest?.username || 'Guest', handle: '' }
  return { userId: String(id), username: String(u.displayName || u.username || u.name || 'Player'), handle: String(u.username || '') }
}

// The signed-in account this tab plays as ('' for a guest), and whether there is a server at all:
// a signed-in player's daily rewards live on the server, a guest's (or a serverless build's) in
// this browser (daily.js).
export const accountId = () => {
  const { userId } = identity()
  return userId.startsWith('guest-') ? '' : userId
}
export const hasServer = () => !!(SERVER_URL || canResolve())

// --- Saving ------------------------------------------------------------------
let petsRev = 0
let lastSaved = ''
let saveTimer = 0
let firstDirty = 0
let sentId = '' // identity the server currently attributes saves to
let loadedId = '' // identity whose saved progress this tab has already loaded
let hud = null // initNet's: coins and trophies live in its state

// The saved progress (backend sanitize.ts sanitizeProgress). Every key here must come back in
// `progress` for a load to count as complete (SAVED_KEYS).
const progress = () => ({
  coins: hud?.get('coins') ?? 0,
  trophies: hud?.get('trophies') ?? 0,
  ...kayaks.snapshot(),
  ...training.snapshot(),
  ...petIndex.snapshot(),
  ...inventory.snapshot(),
})
const SAVED_KEYS = ['coins', 'trophies', 'kayaks', 'kayak', 'coaches', 'equippedCoaches', 'discovered', 'pets']
const snapshot = () => JSON.stringify({ ...progress(), petsRev })
const isGuest = () => sentId.startsWith('guest-')

// A loaded save over the local state. Order matters: the boat decides the coach slots, and owned
// pets are discovered in the Index after it loads.
function hydrate(doc) {
  const counters = {}
  for (const k of ['coins', 'trophies']) if (Number.isFinite(doc[k])) counters[k] = doc[k]
  hud?.set(counters)
  kayaks.hydrate(doc)
  training.hydrate(doc)
  petIndex.hydrate(doc)
  inventory.hydrate(doc)
}

export function saveNow() {
  clearTimeout(saveTimer)
  saveTimer = 0
  firstDirty = 0
  if (!net.connected || !net.hydrated || isGuest()) return
  const snap = snapshot()
  if (snap === lastSaved) return
  lastSaved = snap
  send('saveProgress', JSON.parse(snap))
}

function scheduleSave() {
  if (!net.connected || !net.hydrated) return
  const now = performance.now()
  if (!firstDirty) firstDirty = now
  clearTimeout(saveTimer)
  const wait = Math.min(NET.saveDebounce * 1000, Math.max(0, firstDirty + NET.saveMaxWait * 1000 - now))
  saveTimer = setTimeout(saveNow, wait)
}

// --- Pose --------------------------------------------------------------------
// Where this player is, for everyone else's distance bar: at most every NET.poseEvery s, and
// nothing while the raft sits still.
let poseAt = 0
let lastPose = ''
const cm = (n) => Math.round(n * 100) / 100

export function sendPose({ x, y, z, yaw }) {
  if (!net.connected) return
  const now = performance.now()
  if (now - poseAt < NET.poseEvery * 1000) return
  const msg = { x: cm(x), y: cm(y), z: cm(z), yaw: cm(yaw) }
  const key = `${msg.x},${msg.y},${msg.z},${msg.yaw}`
  if (key === lastPose) return
  poseAt = now
  lastPose = key
  send('pose', msg)
}

export function send(type, payload) {
  try {
    net.room?.send(type, payload)
  } catch (err) {
    console.warn('[net] send failed', type, err)
  }
}

// --- Connection --------------------------------------------------------------
function attach(room) {
  net.room = room
  net.connected = true
  petsRev = 0 // the server restarts revisions on every load
  lastPose = '' // a new session starts at the spawn: send where we are
  room.onMessage('progress', (doc) => {
    petsRev = doc?.petsRev ?? 0
    net.hydrated = true
    lastSaved = ''
    // A reconnect under the same identity: this tab is newer than the save (it may hold changes
    // the debounce hadn't sent yet), so push it rather than load over it.
    if (loadedId === sentId || !doc) return saveNow()
    loadedId = sentId
    hydrate(doc)
    // What the server holds: don't echo it straight back. A save from before some keys were kept
    // gets the local values for them.
    if (SAVED_KEYS.every((k) => doc[k] !== undefined)) lastSaved = snapshot()
    else saveNow()
  })
  room.onMessage('noProgress', (msg) => {
    // New account, guest or no database: keep the local progress and push it as the first save.
    petsRev = msg?.petsRev ?? 0
    net.hydrated = true
    loadedId = sentId
    lastSaved = ''
    saveNow()
  })
  room.onMessage('serverError', () => {
    // The save exists but could not be read: never overwrite it.
    net.hydrated = false
    console.warn('[net] server could not read the saved progress; saving is off for this session')
  })
  room.onMessage('leaderboard', () => {}) // no boards are drawn from it yet
  room.onMessage('tradeOpen', () => saveNow()) // the server checks offers against the last save
  room.onMessage('tradeDone', (msg) => {
    inventory.applyTrade(msg ?? {})
    petsRev = msg?.petsRev ?? petsRev
    saveNow() // the full list (team, next uid) under the new revision
  })
  for (const type of [...TRADE_MESSAGES, ...DAILY_MESSAGES]) room.onMessage(type, (msg) => emit(type, msg))
  room.onStateChange(() => emit('roster'))
  room.onLeave(() => {
    if (net.room !== room) return
    net.room = null
    net.connected = false
    net.hydrated = false
    emit('connection', false)
    setTimeout(connect, 3000) // keep trying; solo play is unaffected meanwhile
  })
  emit('connection', true)
}

// Bloxity hosting has no fixed socket URL: the SDK resolves this game's server endpoint (the dev
// channel reaches the dev backend, prod the prod one) on every connect. A configured SERVER_URL wins.
const canResolve = () => typeof sdk()?.net?.resolveEndpoint === 'function'
async function serverUrl() {
  if (SERVER_URL) return SERVER_URL
  const { endpoint } = await sdk().net.resolveEndpoint(GAME_SLUG)
  return endpoint
}

let connecting = false
let sentPfp = '' // profile picture URL the server holds for this session
async function connect() {
  if (!(SERVER_URL || canResolve()) || connecting || net.connected) return
  connecting = true
  try {
    const id = identity()
    sentId = id.userId
    const client = new Client(await serverUrl())
    sentPfp = getPfp() // others draw it on their distance bars (roster `pfp`)
    attach(await client.joinOrCreate('world', { ...id, pfp: sentPfp }))
  } catch (err) {
    console.info('[net] could not reach the server; playing solo', err?.message ?? err)
    setTimeout(connect, NET.retry * 1000)
  } finally {
    connecting = false
  }
}

// `hud`: main.js's createHud(), whose coins and trophies are saved.
export function initNet(opts = {}) {
  if (!SERVER_URL && !canResolve()) return console.info('[net] no server configured; playing solo')
  hud = opts.hud ?? null
  inventory.onChange(scheduleSave)
  kayaks.onChange(scheduleSave)
  training.onChange(scheduleSave)
  petIndex.onChange(scheduleSave)
  hud?.onSet((next) => ('coins' in next || 'trophies' in next) && scheduleSave())
  // The first ready call connects; later ones are sign-in / sign-out.
  subscribeAuth((s) => {
    if (!s.ready) return
    if (!net.connected) return void connect()
    if (getPfp() !== sentPfp) send('setPfp', { pfp: (sentPfp = getPfp()) })
    const id = identity()
    if (id.userId === sentId) return send('identify', { username: id.username, handle: id.handle })
    saveNow() // under the old id, before switching
    net.hydrated = false
    sentId = id.userId
    send('identify', id)
  })
  window.addEventListener('beforeunload', saveNow)
  document.addEventListener('visibilitychange', () => document.hidden && saveNow())
}
