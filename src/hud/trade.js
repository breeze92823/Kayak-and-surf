// Pet trading (HUD Trade tile), laid out off the user's two 1917x991 shots:
// - the Trade list: dark glass panel, "Trade" + red X, one row per other player in the room
//   ("Trade" over "Name (@handle)", a white play arrow sends a request). Guests and players already
//   trading are greyed; a sent request reads "Sent" until it is answered or runs out.
// - the request popup, top centre: "<name> wants to trade!" with Accept / Decline and the time left.
// - the trade window: "Your Offer" box left (offered pets on top, your other pets below: click to
//   add or take back), "<name>'s Offer" box right, the trade arrows between, Cancel / Accept under
//   the right box. Any change clears both Accepts; once both accept a short countdown runs over the
//   arrows and the server swaps the pets (net.js applies them to petInventory.js).
// The server decides everything (Kayak-and-surf -backend src/rooms/trades.ts); this only shows its
// answers. Registered with hud.addWindow('trade'): another window opening closes the list, or
// cancels an open trade.
import './trade.css'
import { inventory } from '../petInventory.js'
import { hasPetPortrait, petPortrait } from '../petPortraits.js'
import { net, onNet, roster, send } from '../net.js'
import { sfx } from '../sfx.js'
import { formatMult } from './pets.js'
import * as icon from './icons.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const PLAY = `<svg viewBox="0 0 40 52"><path d="M6 5 35 26 6 47z" fill="#fff" stroke="#141414" stroke-width="4" stroke-linejoin="round"/><path d="M11 13v8" stroke="#d9dde3" stroke-width="3" stroke-linecap="round"/></svg>`
const MAX_OFFER = 9 // backend TRADE.maxPets
const REQUEST_S = 15 // backend TRADE.requestMs
const PER_FRAME = 3 // portraits rendered per animation frame

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const label = (p) => (p.handle ? `${p.name} (@${p.handle})` : p.name)

const card = (p, extra = '') => {
  const info = inventory.info(p)
  if (!info) return ''
  return `
<div class="pets-card pets-v r-${info.rarity} v-${p.variant} ${extra}" data-uid="${p.uid}">
  <img alt="" data-pet="${p.id}">
  <i class="pets-tag"></i>
  <span class="pets-mult"><i>${icon.coin}</i><b class="hud-txt">${formatMult(inventory.power(p))}</b></span>
</div>`
}
const slots = (pets, cls = '') => pets.map((p) => card(p, cls)).join('') + '<i class="trade-slot"></i>'.repeat(Math.max(0, MAX_OFFER - pets.length))
const total = (pets) => pets.reduce((s, p) => s + (inventory.info(p) ? inventory.power(p) : 0), 0)

export function createTradeWindow({ hud, renderer }) {
  const root = hud.root
  const el = document.createElement('div')
  el.className = 'trade'
  el.innerHTML = `
<div class="trade-list">
  <div class="trade-list-panel">
    <div class="trade-list-head">
      <b class="hud-txt trade-list-title">Trade</b>
      <button class="pets-x trade-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="trade-rows"></div>
    <span class="hud-txt trade-note"></span>
  </div>
</div>
<div class="trade-asks"></div>
<div class="trade-win">
  <b class="hud-txt trade-title trade-title-me">Your Offer</b>
  <b class="hud-txt trade-title trade-title-them"></b>
  <div class="trade-panel">
    <div class="trade-box trade-mine">
      <div class="trade-offer trade-offer-mine"></div>
      <span class="hud-txt trade-value trade-value-mine"></span>
      <div class="trade-bag">
        <b class="hud-txt trade-bag-title">Your pets <span>click to offer</span></b>
        <div class="trade-bag-grid"></div>
        <span class="hud-txt trade-bag-empty"></span>
      </div>
      <i class="trade-ok hud-txt">Accepted!</i>
    </div>
    <div class="trade-mid"><i class="trade-arrows">${icon.trade}</i><b class="hud-txt trade-count"></b></div>
    <div class="trade-box trade-theirs">
      <div class="trade-offer trade-offer-theirs"></div>
      <span class="hud-txt trade-value trade-value-theirs"></span>
      <span class="hud-txt trade-status"></span>
      <i class="trade-ok hud-txt">Accepted!</i>
    </div>
    <button class="trade-btn is-cancel" data-act="cancel"><b class="hud-txt">Cancel</b></button>
    <button class="trade-btn is-accept" data-act="accept"><b class="hud-txt">Accept</b></button>
  </div>
</div>`
  root.appendChild(el)

  const listEl = el.querySelector('.trade-list')
  const rowsEl = el.querySelector('.trade-rows')
  const noteEl = el.querySelector('.trade-note')
  const asksEl = el.querySelector('.trade-asks')
  const winEl = el.querySelector('.trade-win')
  const themTitle = el.querySelector('.trade-title-them')
  const mineBox = el.querySelector('.trade-mine')
  const theirsBox = el.querySelector('.trade-theirs')
  const offerMine = el.querySelector('.trade-offer-mine')
  const offerTheirs = el.querySelector('.trade-offer-theirs')
  const valueMine = el.querySelector('.trade-value-mine')
  const valueTheirs = el.querySelector('.trade-value-theirs')
  const bagGrid = el.querySelector('.trade-bag-grid')
  const bagEmpty = el.querySelector('.trade-bag-empty')
  const statusEl = el.querySelector('.trade-status')
  const countEl = el.querySelector('.trade-count')
  const acceptBtn = el.querySelector('[data-act="accept"]')

  let listOpen = false
  let sent = null // { to, until } my open request
  const asks = new Map() // from -> { name, until, node }
  // The open trade, or null: partner id/name, my offer (uids), theirs (pets), both Accepts, countdown end.
  let trade = null

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  // A short line over the screen (coach.css's toast look).
  const toastEl = document.createElement('div')
  toastEl.className = 'coach-toast trade-toast'
  toastEl.innerHTML = '<b class="hud-txt"></b><span class="hud-txt"></span>'
  el.appendChild(toastEl)
  function toast(title, line = '') {
    toastEl.querySelector('b').textContent = title
    toastEl.querySelector('span').textContent = line
    replay(toastEl, 'show')
  }

  // --- portraits (shared cache with the Pet window and Index) ------------------------------
  const queue = []
  let pumping = false
  function pump() {
    for (let n = 0; n < PER_FRAME && queue.length; n++) {
      const id = queue.shift()
      const url = petPortrait(renderer, id)
      for (const img of el.querySelectorAll(`img[data-pet="${id}"]`)) img.src = url
    }
    if (queue.length) requestAnimationFrame(pump)
    else pumping = false
  }
  function fillImages(scope) {
    for (const img of scope.querySelectorAll('img[data-pet]')) {
      const id = img.dataset.pet
      if (hasPetPortrait(id)) img.src = petPortrait(renderer, id)
      else if (!queue.includes(id)) {
        queue.push(id)
        if (!pumping) {
          pumping = true
          requestAnimationFrame(pump)
        }
      }
    }
  }

  // --- the list --------------------------------------------------------------------------
  let shownRows = ''
  function paintList(force = false) {
    if (!listOpen) return
    if (sent && sent.until < performance.now()) sent = null
    let note = ''
    let rows = []
    if (!net.connected) note = 'Trading needs a connection to the server.'
    else if (!net.signedIn) note = 'Sign in to trade with other players.'
    else {
      rows = roster()
      if (!rows.length) note = 'Nobody else is here yet.'
    }
    // Only what a row shows: roster patches arrive with every pose, and rebuilding the rows on each
    // one replays their pop-in and swaps the play button out from under the click.
    const key = JSON.stringify([note, rows.map((p) => [p.id, p.name, p.handle, p.signedIn, p.trading]), sent?.to])
    if (key === shownRows && !force) return
    shownRows = key
    noteEl.textContent = note
    rowsEl.innerHTML = rows
      .map((p) => {
        const state = !p.signedIn ? 'guest' : p.trading ? 'busy' : sent?.to === p.id ? 'sent' : ''
        const tag = state === 'guest' ? 'Guest' : state === 'busy' ? 'Busy' : state === 'sent' ? 'Sent' : ''
        return `
<div class="trade-row${state ? ` is-${state}` : ''}" data-id="${esc(p.id)}">
  <b class="hud-txt trade-row-title">Trade</b>
  <span class="hud-txt trade-row-name">${esc(label(p))}</span>
  ${tag ? `<b class="hud-txt trade-row-tag">${tag}</b>` : `<button class="trade-go" data-act="ask" aria-label="Send a trade request">${PLAY}</button>`}
</div>`
      })
      .join('')
  }

  function openList() {
    if (listOpen) return
    if (trade) return // the trade window is up
    listOpen = true
    hud.opening('trade')
    document.exitPointerLock?.()
    paintList(true)
    listEl.classList.add('open')
    replay(listEl, 'pop')
    sfx.page({})
  }
  function closeList() {
    if (!listOpen) return
    listOpen = false
    listEl.classList.remove('open', 'pop')
    sfx.page({ level: 0.6 })
  }

  function ask(id) {
    const p = roster().find((r) => r.id === id)
    if (!p || !p.signedIn || p.trading) return sfx.denied()
    sent = { to: id, name: p.name, until: performance.now() + REQUEST_S * 1000 }
    send('tradeRequest', { to: id })
    paintList(true)
    sfx.page({ level: 0.45 })
  }

  // --- incoming requests -----------------------------------------------------------------
  function paintAsk(from) {
    const a = asks.get(from)
    if (!a) return
    const left = Math.max(0, a.until - performance.now()) / 1000
    a.node.querySelector('.trade-ask-time').style.width = `${(left / REQUEST_S) * 100}%`
    if (left <= 0) dropAsk(from)
  }
  function dropAsk(from) {
    const a = asks.get(from)
    if (!a) return
    asks.delete(from)
    a.node.classList.add('out')
    setTimeout(() => a.node.remove(), 250)
  }
  setInterval(() => {
    for (const from of [...asks.keys()]) paintAsk(from)
    if (sent && sent.until < performance.now()) paintList()
  }, 200)

  // --- the trade window ------------------------------------------------------------------
  const myPets = () => {
    const by = new Map(inventory.list.map((p) => [p.uid, p]))
    return trade.mine.map((u) => by.get(u)).filter(Boolean)
  }
  function paintTrade() {
    if (!trade) return
    const mine = myPets()
    themTitle.textContent = `${trade.name}'s Offer`
    offerMine.innerHTML = slots(mine, 'is-offered')
    offerTheirs.innerHTML = slots(trade.theirs)
    valueMine.textContent = mine.length ? `Coin boost ${formatMult(total(mine))}` : 'Click your pets below to offer them'
    valueTheirs.textContent = trade.theirs.length ? `Coin boost ${formatMult(total(trade.theirs))}` : ''
    const offered = new Set(trade.mine)
    const rest = inventory.sorted().filter((p) => !offered.has(p.uid))
    bagGrid.innerHTML = rest.map((p) => card(p, inventory.isEquipped(p.uid) ? 'is-team' : '')).join('')
    bagEmpty.textContent = inventory.count ? (rest.length ? '' : 'Every pet is in your offer!') : 'No pets to trade yet!'
    mineBox.classList.toggle('is-ok', trade.accepted.me)
    theirsBox.classList.toggle('is-ok', trade.accepted.them)
    statusEl.textContent = trade.accepted.them ? `${trade.name} accepted!` : `Waiting for ${trade.name}…`
    statusEl.classList.toggle('is-ok', trade.accepted.them)
    acceptBtn.classList.toggle('is-on', trade.accepted.me)
    acceptBtn.querySelector('b').textContent = trade.accepted.me ? 'Accepted' : 'Accept'
    fillImages(winEl)
    paintCount()
  }
  function paintCount() {
    const left = trade?.countdownEnd ? Math.ceil((trade.countdownEnd - performance.now()) / 1000) : 0
    winEl.classList.toggle('is-counting', left > 0)
    const text = left > 0 ? String(left) : ''
    if (countEl.textContent !== text) {
      countEl.textContent = text
      if (text) {
        replay(countEl, 'tick')
        sfx.wheelTick?.()
      }
    }
  }
  setInterval(() => trade && paintCount(), 100)

  function setOffer(uids) {
    trade.mine = uids
    trade.accepted = { me: false, them: false } // the server clears both; show it at once
    trade.countdownEnd = 0
    send('tradeOffer', { uids })
    paintTrade()
  }

  function openTrade(partner, name) {
    closeList()
    for (const from of [...asks.keys()]) dropAsk(from)
    sent = null
    trade = { partner, name: name || 'Player', mine: [], theirs: [], accepted: { me: false, them: false }, countdownEnd: 0 }
    hud.opening('trade')
    document.exitPointerLock?.()
    root.classList.add('trade-open')
    paintTrade()
    winEl.classList.add('open')
    replay(winEl, 'pop')
    sfx.page({})
  }
  function closeTrade() {
    if (!trade) return
    trade = null
    root.classList.remove('trade-open')
    winEl.classList.remove('open', 'pop', 'is-counting')
  }

  // --- clicks ------------------------------------------------------------------------------
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    const act = b?.dataset.act
    if (act === 'close') return closeList()
    if (act === 'ask') return ask(b.closest('.trade-row').dataset.id)
    if (act === 'yes' || act === 'no') {
      const from = b.closest('.trade-ask').dataset.from
      dropAsk(from)
      send('tradeRespond', { from, ok: act === 'yes' })
      return sfx.page({ level: act === 'yes' ? 0.5 : 0.3 })
    }
    if (!trade) return
    if (act === 'cancel') {
      send('tradeCancel')
      closeTrade()
      toast('Trade cancelled')
      return sfx.page({ level: 0.6 })
    }
    if (act === 'accept') {
      const on = !trade.accepted.me
      if (on && !trade.mine.length && !trade.theirs.length) {
        replay(acceptBtn, 'is-no')
        toast('Nothing to trade', 'Add a pet first')
        return sfx.denied()
      }
      trade.accepted.me = on
      if (!on) trade.countdownEnd = 0
      send('tradeAccept', { ok: on })
      paintTrade()
      return sfx.page({ level: 0.45 })
    }
    const c = e.target.closest('.pets-card')
    if (!c) return
    const uid = +c.dataset.uid
    if (c.closest('.trade-offer-mine')) {
      setOffer(trade.mine.filter((u) => u !== uid))
      return sfx.page({ level: 0.3 })
    }
    if (c.closest('.trade-bag-grid')) {
      if (trade.mine.length >= MAX_OFFER) {
        replay(offerMine, 'is-no')
        return sfx.denied()
      }
      setOffer([...trade.mine, uid])
      return sfx.page({ level: 0.35 })
    }
  })
  el.addEventListener('pointerdown', () => {
    if (document.pointerLockElement) document.exitPointerLock()
  })

  // --- server messages ---------------------------------------------------------------------
  onNet('roster', () => paintList())
  onNet('connection', (on) => {
    if (!on) {
      if (trade) toast('Trade cancelled', 'Lost the connection')
      closeTrade()
      sent = null
      for (const from of [...asks.keys()]) dropAsk(from)
    }
    paintList(true)
  })
  onNet('tradeIncoming', ({ from, name }) => {
    if (trade) return send('tradeRespond', { from, ok: false })
    dropAsk(from)
    const node = document.createElement('div')
    node.className = 'trade-ask'
    node.dataset.from = from
    node.innerHTML = `
<b class="hud-txt trade-ask-who">${esc(name || 'Player')}</b>
<span class="hud-txt trade-ask-line">wants to trade!</span>
<div class="trade-ask-btns">
  <button class="trade-btn is-accept" data-act="yes"><b class="hud-txt">Accept</b></button>
  <button class="trade-btn is-decline" data-act="no"><b class="hud-txt">Decline</b></button>
</div>
<i class="trade-ask-bar"><i class="trade-ask-time"></i></i>`
    asksEl.appendChild(node)
    asks.set(from, { name, until: performance.now() + REQUEST_S * 1000, node })
    paintAsk(from)
    sfx.coins(1)
  })
  onNet('tradeIncomingGone', ({ from }) => dropAsk(from))
  onNet('tradeRequestEnded', ({ to, reason }) => {
    const name = (sent?.to === to && sent.name) || roster().find((p) => p.id === to)?.name || 'They'
    if (sent?.to === to) sent = null
    paintList(true)
    const lines = {
      declined: [`${name} declined`, ''],
      expired: ['No answer', `${name} didn't respond`],
      busy: [`${name} is busy`, 'They are in another trade'],
      unavailable: ["Can't trade with them", ''],
      guest: ['Sign in to trade', ''],
      cooldown: ['Slow down!', 'Wait a moment before asking again'],
    }
    const [title, line] = lines[reason] ?? lines.unavailable
    toast(title, line)
    sfx.denied()
  })
  onNet('tradeOpen', ({ partner, name }) => openTrade(partner, name))
  onNet('tradeUpdate', (u) => {
    if (!trade || !u) return
    trade.mine = u.mine ?? []
    trade.theirs = (u.theirs ?? []).filter((p) => inventory.info(p))
    const was = trade.accepted
    trade.accepted = u.accepted ?? { me: false, them: false }
    trade.countdownEnd = u.countdown > 0 ? performance.now() + u.countdown : 0
    paintTrade()
    if (trade.accepted.them && !was.them) replay(theirsBox, 'is-flash')
    if (u.note === 'empty') toast('Nothing to trade', 'Add a pet first')
    else if (u.note === 'fullMe') toast('Your pets are full!', `You'd go over ${inventory.storage} pets`)
    else if (u.note === 'fullThem') toast(`${trade.name}'s pets are full!`, 'Offer fewer pets')
    if (u.note) {
      replay(acceptBtn, 'is-no')
      sfx.denied()
    }
  })
  onNet('tradeClosed', ({ reason, byMe }) => {
    if (!trade) return
    const name = trade.name
    closeTrade()
    if (byMe) return
    toast('Trade cancelled', reason === 'left' ? `${name} left` : `${name} cancelled`)
    sfx.denied()
  })
  onNet('tradeDone', ({ got = [], gave = [] }) => {
    closeTrade()
    toast('Trade complete!', `Gave ${gave.length} pet${gave.length === 1 ? '' : 's'}, got ${got.length}`)
    sfx.coins(5)
    sfx.levelUp()
  })

  inventory.onChange(() => {
    if (!trade) return
    // A pet that left the inventory leaves the offer too.
    const owned = new Set(inventory.list.map((p) => p.uid))
    if (trade.mine.some((u) => !owned.has(u))) setOffer(trade.mine.filter((u) => owned.has(u)))
    else paintTrade()
  })

  hud.on('trade', () => (listOpen ? closeList() : openList()))
  // Another centre window opening puts the list away, and walks out of an open trade.
  hud.addWindow('trade', () => {
    closeList()
    if (!trade) return
    send('tradeCancel')
    closeTrade()
  })

  return {
    get isOpen() {
      return listOpen || !!trade
    },
    open: openList,
    close: closeList,
  }
}
