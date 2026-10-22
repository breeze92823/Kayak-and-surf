// The Pet window (HUD Pet tile, toggles), laid out off the user's reference shot (1917x991): a dark
// glass panel with "Pet" and a red X in the header; on the right a bordered box with the green +
// (one more team slot) and "Pet Team ( n/size Pets)" over the equipped pets (empty slots dashed), a
// line, then the other pets in a scrolling grid, strongest first. Every card is the pet's portrait
// on its rarity's colour with its coin multiplier ("x150") bottom left. Under the panel the bar:
// EquipBest, UnEquipAll, Delete | backpack count/storage.
// The empty left of the panel shows the picked pet (click a card): big portrait, name, rarity and
// variant, multiplier, Equip / Unequip and Delete (click twice); with none picked, the team's total
// coin boost. Double-click a card to equip / unequip it. Delete turns the bar into Cancel /
// Delete (n): click cards to mark them, then Delete (n) removes them for good.
// State in petInventory.js (config PET_TEAM); pictures shared with the Index (petPortraits.js
// petPortrait), rendered a few per frame. While open the right-hand HUD column steps aside.
import './pets.css'
import { PET_TEAM } from '../config.js'
import { inventory } from '../petInventory.js'
import { petIndex } from '../petIndex.js'
import { hasPetPortrait, petPortrait } from '../petPortraits.js'
import { sfx } from '../sfx.js'
import { formatNum } from './index.js'
import * as icon from './icons.js'

const CLOSE = `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8 8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`
const PLUS = `<svg viewBox="0 0 32 32"><path d="M16 8v16M8 16h16" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`
const PER_FRAME = 3 // portraits rendered per animation frame
const VARIANT = Object.fromEntries(petIndex.variants.map((v) => [v.id, v.name]))
const RARITY = Object.fromEntries(petIndex.rarities.map((r) => [r.id, r.name]))

// x2.70, x8.50, x40, x175, x1.2K
export const formatMult = (n) => 'x' + (n < 10 ? n.toFixed(2) : n < 1000 ? String(Math.round(n)) : formatNum(n))

const card = (p, i = 0) => {
  const info = inventory.info(p)
  return `
<div class="pets-card pets-v r-${info.rarity} v-${p.variant}" data-uid="${p.uid}" style="animation-delay:${Math.min(i, 24) * 0.02}s">
  <img alt="" data-pet="${p.id}">
  <i class="pets-tag"></i>
  <span class="pets-mult"><i>${icon.coin}</i><b class="hud-txt">${formatMult(inventory.power(p))}</b></span>
  <i class="pets-mark">${CLOSE}</i>
</div>`
}

export function createPetsWindow({ hud, renderer }) {
  const root = hud.root
  const el = document.createElement('div')
  el.className = 'pets'
  el.innerHTML = `
<div class="pets-win">
  <div class="pets-panel">
    <div class="pets-head">
      <b class="hud-txt pets-title">Pet</b>
      <button class="pets-x" data-act="close" aria-label="Close">${CLOSE}</button>
    </div>
    <div class="pets-side">
      <div class="pets-sum">
        <b class="hud-txt pets-sum-title">Team Boost</b>
        <span class="pets-sum-val"><i>${icon.coin}</i><b class="hud-txt"></b></span>
        <span class="hud-txt pets-sum-hint">Click a pet to see it.<br>Double-click to equip.</span>
      </div>
      <div class="pets-info">
        <span class="pets-info-face"><img alt=""><i class="pets-tag"></i></span>
        <b class="hud-txt pets-info-name"></b>
        <span class="hud-txt pets-info-rarity"></span>
        <span class="pets-info-mult"><i>${icon.coin}</i><b class="hud-txt"></b></span>
        <button class="pets-btn pets-info-equip" data-act="equip"><b class="hud-txt"></b></button>
        <button class="pets-btn is-del pets-info-del" data-act="delOne"><b class="hud-txt">Delete</b></button>
      </div>
    </div>
    <div class="pets-box">
      <div class="pets-team-head">
        <button class="pets-plus" data-act="slot" aria-label="More team slots">${PLUS}</button>
        <b class="hud-txt pets-team-title"></b>
      </div>
      <div class="pets-team"></div>
      <div class="pets-body"><div class="pets-grid"></div><span class="hud-txt pets-empty"></span></div>
    </div>
  </div>
  <div class="pets-bar">
    <button class="pets-btn is-best" data-act="best"><b class="hud-txt">EquipBest</b></button>
    <button class="pets-btn is-none" data-act="none"><b class="hud-txt">UnEquipAll</b></button>
    <button class="pets-btn is-del" data-act="delete"><b class="hud-txt">Delete</b></button>
    <i class="pets-sep"></i>
    <span class="pets-store"><i>${icon.backpack}</i><b class="hud-txt"></b></span>
  </div>
</div>`
  root.appendChild(el)

  const winEl = el.querySelector('.pets-win')
  const teamHead = el.querySelector('.pets-team-head')
  const teamTitle = el.querySelector('.pets-team-title')
  const teamEl = el.querySelector('.pets-team')
  const gridEl = el.querySelector('.pets-grid')
  const bodyEl = el.querySelector('.pets-body')
  const emptyEl = el.querySelector('.pets-empty')
  const sideEl = el.querySelector('.pets-side')
  const infoEl = el.querySelector('.pets-info')
  const sumVal = el.querySelector('.pets-sum-val b')
  const storeEl = el.querySelector('.pets-store')
  const barEl = el.querySelector('.pets-bar')
  const delBtn = barEl.querySelector('[data-act="delete"] b')
  const noneBtn = barEl.querySelector('[data-act="none"] b')
  const delOne = infoEl.querySelector('.pets-info-del')
  let isOpen = false
  let picked = null // uid shown on the left
  let deleting = null // Set of uids marked in delete mode, or null
  let confirmOne = false // the side Delete was clicked once

  // Retrigger a CSS animation class.
  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  // Pictures: one per species, rendered lazily a few per frame, shared with the Index.
  const queue = []
  let pumping = false
  function want(id) {
    if (hasPetPortrait(id) || queue.includes(id)) return
    queue.push(id)
    if (!pumping) {
      pumping = true
      requestAnimationFrame(pump)
    }
  }
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
      else want(id)
    }
  }

  function paintSide() {
    const p = picked != null && inventory.pet(picked)
    if (!p) picked = null
    sideEl.classList.toggle('has-pick', !!p)
    sumVal.textContent = inventory.teamCount ? formatMult(inventory.bonus('coin')) : 'x1'
    if (!p) return
    const info = inventory.info(p)
    const on = inventory.isEquipped(p.uid)
    const face = infoEl.querySelector('.pets-info-face')
    face.className = `pets-info-face pets-v r-${info.rarity} v-${p.variant}`
    const img = face.querySelector('img')
    if (img.dataset.pet !== p.id) {
      img.dataset.pet = p.id
      img.removeAttribute('src')
      fillImages(face)
    }
    const name = infoEl.querySelector('.pets-info-name')
    name.textContent = info.name
    name.style.fontSize = `${Math.min(2.1, 22 / info.name.length).toFixed(2)}em`
    const rar = infoEl.querySelector('.pets-info-rarity')
    rar.textContent = p.variant === 'normal' ? RARITY[info.rarity] : `${VARIANT[p.variant]} ${RARITY[info.rarity]}`
    rar.className = `hud-txt pets-info-rarity t-${info.rarity}`
    infoEl.querySelector('.pets-info-mult b').textContent = formatMult(inventory.power(p))
    const eq = infoEl.querySelector('.pets-info-equip')
    eq.classList.toggle('is-off', on)
    eq.classList.toggle('is-best', !on)
    eq.querySelector('b').textContent = on ? 'Unequip' : 'Equip'
    delOne.querySelector('b').textContent = confirmOne ? 'Sure?' : 'Delete'
    delOne.classList.toggle('is-sure', confirmOne)
  }

  function paintBar() {
    storeEl.querySelector('b').textContent = `${inventory.count}/${inventory.storage}`
    storeEl.classList.toggle('is-full', inventory.full)
    barEl.classList.toggle('is-deleting', !!deleting)
    noneBtn.textContent = deleting ? 'Cancel' : 'UnEquipAll'
    delBtn.textContent = deleting ? `Delete (${deleting.size})` : 'Delete'
    el.querySelector('.pets-plus').classList.toggle('is-max', inventory.teamSize >= PET_TEAM.maxTeam)
  }

  function paintMarks() {
    for (const c of el.querySelectorAll('.pets-card')) {
      const uid = +c.dataset.uid
      c.classList.toggle('is-marked', !!deleting?.has(uid))
      c.classList.toggle('is-picked', uid === picked)
    }
  }

  // Team row + the rest of the pets; `fresh` replays the cards' pop-in.
  function paint(fresh = false) {
    const team = inventory.team
    teamTitle.textContent = `Pet Team ( ${team.length}/${inventory.teamSize} Pets)`
    const empty = Math.max(0, inventory.teamSize - team.length)
    teamEl.innerHTML = team.map(card).join('') + '<i class="pets-slot"></i>'.repeat(empty)
    const rest = inventory.sorted().filter((p) => !inventory.isEquipped(p.uid))
    gridEl.innerHTML = rest.map(card).join('')
    emptyEl.textContent = !inventory.count ? 'No pets yet! Hatch some eggs.' : rest.length ? '' : 'Every pet is in your team!'
    el.classList.toggle('is-deleting', !!deleting)
    fillImages(teamEl)
    fillImages(gridEl)
    if (fresh) {
      replay(gridEl, 'flip')
      replay(teamEl, 'flip')
    }
    paintMarks()
    paintSide()
    paintBar()
  }

  const cardOf = (uid) => el.querySelector(`.pets-card[data-uid="${uid}"]`)
  function bounce(uid, cls = 'is-on') {
    const node = cardOf(uid)
    if (node) replay(node, cls)
  }
  function refuseTeam() {
    replay(teamHead, 'is-no')
    sfx.denied()
  }

  function pick(uid) {
    if (picked === uid) return
    picked = uid
    confirmOne = false
    paintMarks()
    paintSide()
    replay(infoEl, 'pop')
    sfx.page({ level: 0.35 })
  }

  function toggleEquip(uid) {
    if (inventory.isEquipped(uid)) {
      inventory.unequip(uid)
      bounce(uid, 'is-off')
      sfx.page({ level: 0.5 })
    } else if (inventory.equip(uid)) {
      bounce(uid)
      sfx.coins(2)
    } else return refuseTeam()
  }

  function setDeleting(on) {
    deleting = on ? new Set() : null
    sfx.page({ level: 0.45 })
    paint()
  }

  // One more team slot, a Robux buy: bloxity.js has no purchase call yet, so only dev builds hand it out.
  function buySlot() {
    if (!import.meta.env.DEV || !inventory.addTeamSlot()) {
      replay(teamHead, 'is-no')
      return sfx.denied()
    }
    sfx.coins(4)
    sfx.levelUp()
    replay(teamHead, 'is-up')
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    const act = b?.dataset.act
    if (act === 'close') return close()
    if (act === 'slot') return buySlot()
    if (act === 'best') {
      if (!inventory.count) return refuseTeam()
      if (inventory.equipBest()) {
        for (const p of inventory.team) bounce(p.uid)
        replay(teamEl, 'is-best')
        sfx.coins(5)
        sfx.levelUp()
      } else sfx.page({ level: 0.4 })
      return
    }
    if (act === 'none') {
      if (deleting) return setDeleting(false)
      if (inventory.unequipAll()) sfx.page({ level: 0.6 })
      else sfx.denied()
      return
    }
    if (act === 'delete') {
      if (!deleting) return setDeleting(true)
      if (!deleting.size) return setDeleting(false)
      const marked = [...deleting]
      deleting = null
      const n = inventory.remove(marked)
      paint()
      toast(`Deleted ${n} pet${n === 1 ? '' : 's'}`)
      return sfx.bump(0.4)
    }
    if (act === 'equip' && picked != null) return toggleEquip(picked)
    if (act === 'delOne' && picked != null) {
      if (!confirmOne) {
        confirmOne = true
        replay(delOne, 'is-no')
        return paintSide()
      }
      const name = inventory.info(inventory.pet(picked)).name
      confirmOne = false
      inventory.remove([picked])
      toast(`Deleted ${name}`)
      return sfx.bump(0.4)
    }
    const c = e.target.closest('.pets-card')
    if (!c) return
    const uid = +c.dataset.uid
    if (deleting) {
      if (deleting.has(uid)) deleting.delete(uid)
      else deleting.add(uid)
      paintMarks()
      paintBar()
      replay(c, 'is-tick')
      return sfx.page({ level: 0.3 })
    }
    pick(uid)
  })
  el.addEventListener('dblclick', (e) => {
    const c = e.target.closest('.pets-card')
    if (c && !deleting) toggleEquip(+c.dataset.uid)
  })
  el.addEventListener('pointerdown', () => {
    if (document.pointerLockElement) document.exitPointerLock()
  })

  // A short line over the window (shares the Coach window's toast look).
  const toastEl = document.createElement('div')
  toastEl.className = 'coach-toast pets-toast'
  toastEl.innerHTML = '<b class="hud-txt"></b><span class="hud-txt"></span>'
  el.appendChild(toastEl)
  function toast(title, line = '') {
    toastEl.querySelector('b').textContent = title
    toastEl.querySelector('span').textContent = line
    replay(toastEl, 'show')
  }

  inventory.onChange(() => isOpen && paint())

  function open() {
    if (isOpen) return
    isOpen = true
    hud.opening('pet')
    document.exitPointerLock?.() // the window needs the cursor
    picked = null
    deleting = null
    paint(true)
    bodyEl.scrollTop = 0
    root.classList.add('pets-open')
    winEl.classList.add('open')
    replay(winEl, 'pop')
    sfx.page({})
  }
  function close() {
    if (!isOpen) return
    isOpen = false
    root.classList.remove('pets-open')
    winEl.classList.remove('open', 'pop')
    sfx.page({ level: 0.6 })
  }
  hud.on('pet', () => (isOpen ? close() : open()))
  hud.addWindow('pet', close)

  return {
    get isOpen() {
      return isOpen
    },
    open,
    close,
    // Hatching / prizes: adds the pet (and discovers it in the Index); null when storage is full.
    add(id, variant = 'normal') {
      const p = inventory.add(id, variant)
      if (p && isOpen) bounce(p.uid, 'is-new')
      return p
    },
  }
}
