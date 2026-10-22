// The Kayak Shop's DOM: the Roblox-style proximity prompt ("E  Shop / Kayaks", coach.css's
// .coach-prompt) pinned by the stall, and the window laid out off the user's reference shot
// (1918x991, 1em = 16px): category tabs (Kayaks / Trails / Emotes) standing left of a dark
// glass panel, a grey header with "Kayak Shop" and a red X, a scrolling 3-column grid of boat cards
// (name, picture and a bottom row): owned boats are white with lightning + "+speed" and a green
// check on the equipped one, the next boat for sale is white with its coin price, later ones are
// dark grey with a padlock over the picture and their price. On the right the picked boat: its
// picture on yellow, name, speed and coaches rows, and one button: coin price (yellow) to buy,
// Equip (green), Equipped (blue); none for a locked boat. The Trails and Emotes tabs (the user's
// Trails / Emotes Shop shots) swap the header to "Trails Shop" / "Emotes Shop" and the panel to a
// wider 3-column grid of dark glass item cards: the trail's swoosh or the player figure mid emote,
// its name and a button (UnEquip red on the equipped one, Equip green, trophy price blue on the next
// for sale); later items show only a padlock. Bought / equipped toasts reuse coach.css's
// .coach-toast. While open the HUD's right column, distance bar and lane widgets step aside.
// shop.js drives it; the buttons come back through onAct(act, id) ('trail' / 'emote' for an item
// card's button).
import './coach.css'
import './shop.css'
import { KAYAK_SHOP } from '../config.js'
import { kayaks } from '../kayaks.js'
import { trails } from '../trails.js'
import { emotes } from '../emotes.js'
import { formatNum } from './index.js'
import * as icon from './icons.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`

const card = (b, i) => `
<button class="shop-card" data-act="pick" data-id="${b.id}" style="animation-delay:${i * 0.035}s">
  <b class="hud-txt shop-card-name${b.name.length > 14 ? ' is-long' : ''}">${b.name}</b>
  <img class="shop-card-img" alt="">
  <i class="shop-card-lock">${icon.padlock}</i>
  <i class="shop-card-icon"></i>
  <span class="hud-txt shop-card-stat"></span>
  <i class="shop-card-check">${icon.check}</i>
</button>`

const TITLES = { kayaks: 'Kayak Shop', trails: 'Trails Shop', emotes: 'Emotes Shop' }
const RAINBOW = ['#ff2a2a', '#ffb21a', '#fff23a', '#3aff4a', '#3ad8ff', '#6a3aff', '#ff3ad8']

// The trophy collections shown as item grids: tab id -> store, the card button's act, its art and
// the toast's second line.
const ITEMS = {
  trails: {
    store: trails,
    act: 'trail',
    art: (t) => (t.colors === 'rainbow' ? icon.trail(RAINBOW, null, t.id) : icon.trail(t.colors[0], t.colors[1], t.id)),
    hint: 'Paddle to see it!',
  },
  emotes: { store: emotes, act: 'emote', art: () => '<img alt="">', hint: 'Press G to emote!' },
}

const itemCard = (kind) => (t, i) => `
<div class="item-card" data-id="${t.id}" style="animation-delay:${i * 0.035}s">
  <i class="item-art item-art-${kind}">${ITEMS[kind].art(t)}</i>
  <b class="hud-txt item-name">${t.name}</b>
  <button class="item-btn" data-act="${ITEMS[kind].act}" data-id="${t.id}"></button>
  <span class="item-lock"><i>${icon.padlock}</i></span>
</div>`

export function createShopWindow(root, { onAct }) {
  const el = document.createElement('div')
  el.className = 'shop'
  el.innerHTML = `
<button class="coach-prompt" data-act="open"><span class="coach-key">E</span><span class="coach-prompt-txt"><small>Shop</small><b>Kayaks</b></span></button>
<div class="shop-win">
  <div class="shop-tabs">${KAYAK_SHOP.tabs.map((t) => `<button class="shop-tab shop-tab-${t.id}" data-act="tab" data-id="${t.id}"><span class="hud-txt">${t.name}</span></button>`).join('')}</div>
  <div class="shop-panel">
    <div class="shop-head">
      <b class="hud-txt shop-title">Kayak Shop</b>
      <button class="coach-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="shop-list">
      <div class="shop-grid">${kayaks.boats.map(card).join('')}</div>
      <b class="hud-txt shop-soon">Coming soon!</b>
    </div>
    ${Object.entries(ITEMS).map(([kind, c]) => `<div class="shop-items" data-kind="${kind}">${c.store.list.map(itemCard(kind)).join('')}</div>`).join('')}
    <div class="shop-info">
      <span class="shop-info-pic"><img alt=""></span>
      <b class="hud-txt shop-info-name"></b>
      <span class="shop-info-row shop-info-speed"><i>${icon.bolt}</i><b class="hud-txt"></b></span>
      <span class="shop-info-row shop-info-coaches"><i>${icon.muscle}</i><b class="hud-txt"></b></span>
      <button class="shop-btn" data-act="buy"></button>
    </div>
  </div>
</div>
<div class="coach-toast shop-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.coach-prompt')
  const winEl = el.querySelector('.shop-win')
  const listEl = el.querySelector('.shop-list')
  const infoEl = el.querySelector('.shop-info')
  const btnEl = el.querySelector('.shop-btn')
  const toastEl = el.querySelector('.shop-toast')
  const cards = Object.fromEntries([...el.querySelectorAll('.shop-card')].map((c) => [c.dataset.id, c]))
  const tabs = [...el.querySelectorAll('.shop-tab')]
  const panelEl = el.querySelector('.shop-panel')
  const titleEl = el.querySelector('.shop-title')
  // { trails: { [id]: card }, emotes: { [id]: card } }
  const itemCards = Object.fromEntries(
    Object.keys(ITEMS).map((kind) => [kind, Object.fromEntries([...el.querySelectorAll(`.shop-items[data-kind='${kind}'] .item-card`)].map((c) => [c.dataset.id, c]))]),
  )
  let isOpen = false
  let tab = KAYAK_SHOP.tabs[0].id
  let picked = kayaks.equipped
  let urls = {}

  // Retrigger a CSS animation class.
  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  function paint() {
    for (const t of tabs) t.classList.toggle('is-on', t.dataset.id === tab)
    panelEl.dataset.tab = tab
    titleEl.textContent = TITLES[tab]
    for (const kind in ITEMS) paintItems(kind)
    listEl.classList.toggle('is-soon', tab !== 'kayaks')
    infoEl.classList.toggle('is-soon', tab !== 'kayaks')
    for (const b of kayaks.boats) {
      const node = cards[b.id]
      node.classList.toggle('is-picked', b.id === picked)
      node.classList.toggle('is-equipped', kayaks.isEquipped(b.id))
      const owns = kayaks.owns(b.id)
      const state = owns ? 'is-owned' : kayaks.isLocked(b.id) ? 'is-locked' : 'is-next'
      if (node.dataset.state !== state) {
        node.classList.remove('is-owned', 'is-locked', 'is-next')
        node.classList.add(state)
        node.dataset.state = state
        node.querySelector('.shop-card-icon').innerHTML = owns ? icon.bolt : icon.coin
        node.querySelector('.shop-card-stat').textContent = owns ? `+${formatNum(b.speed)}` : formatNum(b.price)
      }
    }
    const b = kayaks.boat(picked)
    infoEl.querySelector('.shop-info-pic img').src = urls[b.id] ?? ''
    infoEl.querySelector('.shop-info-name').textContent = b.name
    infoEl.querySelector('.shop-info-speed b').textContent = formatNum(b.speed)
    infoEl.querySelector('.shop-info-coaches b').textContent = formatNum(b.coaches)
    const owns = kayaks.owns(b.id)
    const on = kayaks.isEquipped(b.id)
    btnEl.className = `shop-btn ${kayaks.isLocked(b.id) ? 'is-hidden' : !owns ? 'is-buy' : on ? 'is-equipped' : 'is-equip'}`
    btnEl.innerHTML = !owns ? `<i>${icon.coin}</i><b class="hud-txt">${formatNum(b.price)}</b>` : `<b class="hud-txt">${on ? 'Equipped' : 'Equip'}</b>`
  }

  function paintItems(kind) {
    const { store } = ITEMS[kind]
    for (const t of store.list) {
      const node = itemCards[kind][t.id]
      const owns = store.owns(t.id)
      const on = store.isEquipped(t.id)
      const state = store.isLocked(t.id) ? 'is-locked' : on ? 'is-equipped' : owns ? 'is-owned' : 'is-next'
      if (node.dataset.state === state) continue
      node.dataset.state = state
      node.className = `item-card ${state}`
      const btn = node.querySelector('.item-btn')
      btn.innerHTML = on ? '<b class="hud-txt">UnEquip</b>' : owns ? '<b class="hud-txt">Equip</b>' : `<i>${icon.trophy}</i><b class="hud-txt">${formatNum(t.price)}</b>`
    }
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (!b) return
    const { act, id } = b.dataset
    if (act === 'pick') {
      if (picked !== id) {
        picked = id
        paint()
        replay(infoEl.querySelector('.shop-info-pic'), 'is-in')
      }
      onAct('pick', id)
    } else if (act === 'tab') {
      tab = id
      paint()
      onAct('tab', id)
    } else if (act === 'trail' || act === 'emote') onAct(act, id)
    else onAct(act, picked)
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') && document.pointerLockElement) document.exitPointerLock()
  })

  return {
    get isOpen() {
      return isOpen
    },
    get picked() {
      return picked
    },
    // { [emote id]: image url } from petPortraits.js's emote().
    setEmotePortraits(next) {
      for (const t of emotes.list) itemCards.emotes[t.id].querySelector('img').src = next[t.id] ?? ''
    },
    // { [boat id]: image url } from petPortraits.js's boat().
    setPortraits(next) {
      urls = next
      for (const b of kayaks.boats) cards[b.id].querySelector('img').src = urls[b.id] ?? ''
      paint()
    },
    open() {
      isOpen = true
      paint()
      root.classList.add('shop-open')
      winEl.classList.add('open')
      replay(winEl, 'pop')
    },
    close() {
      isOpen = false
      root.classList.remove('shop-open')
      winEl.classList.remove('open', 'pop')
    },
    paint,
    // Show boat `id` on the right and the Kayaks tab (the dragon's prompt opens the shop on it).
    pick(id) {
      picked = id
      tab = 'kayaks'
      paint()
      requestAnimationFrame(() => cards[id].scrollIntoView({ block: 'nearest' })) // once the window shows
    },
    // Screen position (px) for the prompt, or null to hide it.
    prompt(x, y) {
      promptEl.classList.toggle('show', x != null)
      if (x != null) promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
    // Celebrations: 'new' (bought and equipped) or 'on' (equipped).
    flash(id, kind) {
      paint()
      replay(cards[id], kind === 'new' ? 'is-new' : 'is-on')
      replay(btnEl, 'is-done')
      const b = kayaks.boat(id)
      toastEl.querySelector('b').textContent = kind === 'new' ? `${b.name} unlocked!` : `${b.name} equipped!`
      toastEl.querySelector('span').textContent = `Speed +${formatNum(b.speed)}   Coaches ${b.coaches}`
      replay(toastEl, 'show')
    },
    // An item card ('trails' | 'emotes'): 'new' (bought and equipped), 'on' (equipped) or 'off'
    // (taken off).
    flashItem(kind, id, how) {
      paint()
      replay(itemCards[kind][id], how === 'off' ? 'is-off' : how === 'new' ? 'is-new' : 'is-on')
      if (how === 'off') return
      const t = ITEMS[kind].store.item(id)
      toastEl.querySelector('b').textContent = how === 'new' ? `${t.name} unlocked!` : `${t.name} equipped!`
      toastEl.querySelector('span').textContent = ITEMS[kind].hint
      replay(toastEl, 'show')
    },
    // Not enough trophies for an item: its card shakes.
    refuseItem(kind, id) {
      replay(itemCards[kind][id], 'is-no')
    },
    // Not enough coins: the card and the button shake.
    refuse(id) {
      replay(cards[id], 'is-no')
      replay(btnEl, 'is-no')
    },
  }
}
