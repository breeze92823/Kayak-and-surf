// The Index window (HUD Index tile), laid out off the user's reference shots (1918x991): rarity
// buttons down the left (Common ... Exclusive), a dark glass panel with "Index", the page's
// "found/total" and a red X in the header, variant tabs (Normal / Big / Huge / Shiny / Rainbow),
// a scrolling 5-column grid of pet cards (portrait, name, rarity; undiscovered pets show as black
// silhouettes) and "Collect 100% for +N% Luck" over a progress bar. Hovering a card (tap on touch)
// pops a card with the big name and rarity, "Hatched from:" + the egg, and "Found in:" + a shot
// of the slide area. Data in petIndex.js; pictures from petPortraits.js, rendered a few per frame
// the first time a page shows. While open the right-hand HUD column steps aside.
import './petIndex.css'
import { petIndex } from '../petIndex.js'
import { createPortraitStudio, petPortrait } from '../petPortraits.js'
import { SLIDE_AREAS } from '../hub/layout.js'
import { sfx } from '../sfx.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const PER_FRAME = 3 // portraits rendered per animation frame
const areaName = (id) => SLIDE_AREAS.find((a) => a.id === id)?.name ?? ''

const card = (p, i) => `
<div class="pidx-card" data-id="${p.id}" style="animation-delay:${i * 0.02}s">
  <span class="pidx-face"><img alt=""><i class="pidx-tag"></i></span>
  <b class="hud-txt pidx-name" style="font-size:${Math.min(1.12, 13 / p.name.length).toFixed(2)}em">${p.name}</b>
  <span class="hud-txt pidx-rarity r-${p.rarity}">${petIndex.rarities.find((r) => r.id === p.rarity).name}</span>
</div>`

export function createIndexWindow({ hud, renderer, scene, sky }) {
  const root = hud.root
  const el = document.createElement('div')
  el.className = 'pidx'
  el.innerHTML = `
<div class="pidx-win">
  <div class="pidx-rarities">${petIndex.rarities.map((r) => `<button class="pidx-rar r-${r.id}" data-rarity="${r.id}"><span class="hud-txt">${r.name}</span></button>`).join('')}</div>
  <div class="pidx-panel">
    <div class="pidx-head">
      <b class="hud-txt pidx-title">Index</b>
      <span class="hud-txt pidx-count"></span>
      <button class="pidx-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="pidx-tabs">${petIndex.variants.map((v) => `<button class="pidx-tab" data-variant="${v.id}"><span class="hud-txt">${v.name}</span></button>`).join('')}</div>
    <div class="pidx-body"><div class="pidx-grid"></div></div>
    <div class="pidx-foot">
      <b class="hud-txt pidx-goal"></b>
      <div class="pidx-bar"><i class="pidx-fill"></i><span class="hud-txt pidx-bar-txt"></span></div>
    </div>
  </div>
</div>
<div class="pidx-tip">
  <b class="hud-txt pidx-tip-name"></b>
  <span class="hud-txt pidx-tip-rarity"></span>
  <div class="pidx-tip-egg"><span class="hud-txt">Hatched<br>from:<br><em></em></span><img alt=""></div>
  <div class="pidx-tip-area"><b class="hud-txt">Found in:</b><img alt=""><span class="hud-txt"></span></div>
</div>`
  root.appendChild(el)

  const winEl = el.querySelector('.pidx-win')
  const gridEl = el.querySelector('.pidx-grid')
  const bodyEl = el.querySelector('.pidx-body')
  const countEl = el.querySelector('.pidx-count')
  const goalEl = el.querySelector('.pidx-goal')
  const fillEl = el.querySelector('.pidx-fill')
  const barTxt = el.querySelector('.pidx-bar-txt')
  const tipEl = el.querySelector('.pidx-tip')
  let isOpen = false
  let rarity = 'common'
  let variant = 'normal'
  let tipFor = null

  // Pictures: rendered lazily, a few per frame, cached for the session.
  let studio = null
  const urls = { pet: {}, egg: {}, area: {} }
  const queue = []
  let pumping = false
  function want(kind, id) {
    if (urls[kind][id] || queue.some((q) => q.kind === kind && q.id === id)) return
    queue.push({ kind, id })
    if (!pumping) {
      pumping = true
      requestAnimationFrame(pump)
    }
  }
  function pump() {
    studio ??= createPortraitStudio(renderer)
    for (let n = 0; n < PER_FRAME && queue.length; n++) {
      const { kind, id } = queue.shift()
      urls[kind][id] = kind === 'pet' ? petPortrait(renderer, id) : kind === 'egg' ? studio.egg(id) : studio.area(id, scene, sky)
      if (kind === 'pet') gridEl.querySelector(`[data-id="${id}"] img`)?.setAttribute('src', urls.pet[id])
      if (tipFor) paintTip(tipFor)
    }
    if (queue.length) requestAnimationFrame(pump)
    else pumping = false
  }

  // Retrigger a CSS animation class.
  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  function paintCounts() {
    const { found, total } = petIndex.count(rarity, variant)
    const reward = petIndex.rarities.find((r) => r.id === rarity).reward
    countEl.textContent = `${found}/${total}`
    barTxt.textContent = `${found}/${total}`
    fillEl.style.width = `${total ? (found / total) * 100 : 0}%`
    goalEl.textContent = found === total ? `Complete! +${reward}% Luck` : `Collect 100% for +${reward}% Luck`
    goalEl.classList.toggle('is-done', found === total)
  }

  // One page: the rarity's pets in the chosen variant.
  function paint() {
    for (const b of el.querySelectorAll('.pidx-rar')) b.classList.toggle('on', b.dataset.rarity === rarity)
    for (const b of el.querySelectorAll('.pidx-tab')) b.classList.toggle('on', b.dataset.variant === variant)
    const pets = petIndex.ofRarity(rarity)
    gridEl.className = `pidx-grid v-${variant}`
    gridEl.innerHTML = pets.map(card).join('')
    for (const p of pets) {
      const node = gridEl.querySelector(`[data-id="${p.id}"]`)
      node.classList.toggle('is-found', petIndex.has(p.id, variant))
      if (urls.pet[p.id]) node.querySelector('img').src = urls.pet[p.id]
      else want('pet', p.id)
    }
    bodyEl.scrollTop = 0
    replay(gridEl, 'flip')
    paintCounts()
    hideTip()
  }

  function paintTip(id) {
    const p = petIndex.pet(id)
    const found = petIndex.has(id, variant)
    tipEl.querySelector('.pidx-tip-name').textContent = p.name
    const rar = tipEl.querySelector('.pidx-tip-rarity')
    rar.textContent = petIndex.rarities.find((r) => r.id === p.rarity).name
    rar.className = `hud-txt pidx-tip-rarity r-${p.rarity}`
    tipEl.querySelector('.pidx-tip-egg em').textContent = petIndex.eggs[p.egg].name
    tipEl.querySelector('.pidx-tip-area span').textContent = areaName(p.area)
    tipEl.classList.toggle('is-found', found)
    const eggImg = tipEl.querySelector('.pidx-tip-egg img')
    const areaImg = tipEl.querySelector('.pidx-tip-area img')
    if (urls.egg[p.egg]) eggImg.src = urls.egg[p.egg]
    else eggImg.removeAttribute('src')
    if (urls.area[p.area]) areaImg.src = urls.area[p.area]
    else areaImg.removeAttribute('src')
    want('egg', p.egg)
    want('area', p.area)
  }
  function showTip(id, x, y) {
    if (tipFor !== id) {
      tipFor = id
      paintTip(id)
      replay(tipEl, 'show')
    }
    placeTip(x, y)
  }
  // Beside the pointer, kept on screen.
  function placeTip(x, y) {
    const w = tipEl.offsetWidth
    const h = tipEl.offsetHeight
    const gap = 14
    let left = x + gap
    if (left + w > window.innerWidth - 8) left = x - gap - w
    const top = Math.min(Math.max(8, y - h * 0.25), window.innerHeight - h - 8)
    tipEl.style.transform = `translate(${Math.max(8, left)}px, ${top}px)`
  }
  function hideTip() {
    tipFor = null
    tipEl.classList.remove('show')
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-rarity], [data-variant]')
    if (b?.dataset.act === 'close') return close()
    if (b?.dataset.rarity && b.dataset.rarity !== rarity) {
      rarity = b.dataset.rarity
      sfx.page({ level: 0.5 })
      return paint()
    }
    if (b?.dataset.variant && b.dataset.variant !== variant) {
      variant = b.dataset.variant
      sfx.page({ level: 0.5 })
      return paint()
    }
    // Touch: tap a card for its details, tap again (or elsewhere) to put them away.
    const c = e.target.closest('.pidx-card')
    if (c && e.pointerType !== 'mouse') {
      if (tipFor === c.dataset.id) hideTip()
      else showTip(c.dataset.id, e.clientX, e.clientY)
    } else if (!c) hideTip()
  })
  gridEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    const c = e.target.closest('.pidx-card')
    if (c) showTip(c.dataset.id, e.clientX, e.clientY)
    else hideTip()
  })
  gridEl.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hideTip())
  bodyEl.addEventListener('scroll', hideTip, { passive: true })
  el.addEventListener('pointerdown', () => {
    if (document.pointerLockElement) document.exitPointerLock()
  })

  function open() {
    isOpen = true
    hud.opening('index')
    document.exitPointerLock?.() // the window needs the cursor
    paint()
    root.classList.add('index-open')
    winEl.classList.add('open')
    replay(winEl, 'pop')
    sfx.page({})
    // Warm the tooltip pictures for this page after its portraits.
    for (const p of petIndex.ofRarity(rarity)) {
      want('egg', p.egg)
      want('area', p.area)
    }
  }
  function close() {
    if (!isOpen) return
    isOpen = false
    root.classList.remove('index-open')
    winEl.classList.remove('open', 'pop')
    hideTip()
    sfx.page({ level: 0.6 })
  }
  hud.on('index', () => (isOpen ? close() : open()))
  hud.addWindow('index', close)

  return {
    get isOpen() {
      return isOpen
    },
    open,
    close,
    // Hatching calls this; repaints the open page.
    discover(id, v = 'normal') {
      const fresh = petIndex.discover(id, v)
      if (fresh && isOpen) {
        paint()
        const node = gridEl.querySelector(`[data-id="${id}"]`)
        if (node) replay(node, 'is-new')
      }
      return fresh
    },
  }
}
