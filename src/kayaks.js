// The boats in the Kayak Shop (config KAYAK_SHOP.boats): bought with coins in the shop window
// (shop.js) in list order (only the next one is for sale, the rest are locked; a `featured` boat
// sits outside the order and is for sale from the start), one equipped at a time; the free Wooden Raft is owned and equipped from the start. The equipped boat's `speed` is
// read by stamina.js through bonus(), its `coaches` by training.js (coach slots); raft.js shows its
// model. net.js saves and loads it (snapshot() / hydrate()).
import { KAYAK_SHOP } from './config.js'

const { boats, speedPct } = KAYAK_SHOP
const free = boats.filter((b) => !b.price).map((b) => b.id)
const owned = new Set(free)
let equipped = boats[0].id
const listeners = []
const changeListeners = []
const changed = () => changeListeners.forEach((fn) => fn())

export const kayaks = {
  boats,
  boat: (id) => boats.find((b) => b.id === id),
  owns: (id) => owned.has(id),
  isEquipped: (id) => equipped === id,
  get equipped() {
    return equipped
  },
  // The first boat in the list order not yet owned: for sale. Later ones are locked.
  get next() {
    return boats.find((b) => !b.featured && !owned.has(b.id))?.id ?? null
  },
  isLocked: (id) => !owned.has(id) && !kayaks.boat(id).featured && id !== kayaks.next,
  // Coaches the equipped boat carries (extra coach slots).
  get coachSlots() {
    return kayaks.boat(equipped).coaches
  },
  // false unless it's for sale (the next in order, or a featured boat not yet owned).
  buy(id) {
    if (owned.has(id) || kayaks.isLocked(id)) return false
    owned.add(id)
    changed()
    return true
  },
  // false unless owned.
  equip(id) {
    if (!owned.has(id)) return false
    equipped = id
    for (const fn of listeners) fn(id)
    changed()
    return true
  },
  // fn(id) whenever the equipped boat changes (raft.js swaps the model).
  onEquip(fn) {
    listeners.push(fn)
  },
  // fn() after any change (bought or equipped; net.js saves).
  onChange(fn) {
    changeListeners.push(fn)
  },
  // The saved half (saveProgress; Kayak-and-surf -backend sanitize.ts): kayaks [id], kayak (equipped id).
  snapshot() {
    return { kayaks: [...owned], kayak: equipped }
  },
  // A loaded save: known boats only (the free ones always owned), then the equipped one if owned.
  // Load this before training.js, whose coach slots come from the equipped boat.
  hydrate(d) {
    if (Array.isArray(d?.kayaks)) {
      owned.clear()
      for (const id of [...free, ...d.kayaks]) if (kayaks.boat(id)) owned.add(id)
    }
    if (typeof d?.kayak !== 'string' || !kayaks.equip(d.kayak)) changed()
  },
  // Multiplier from the equipped boat for 'speed'.
  bonus(effect) {
    return effect === 'speed' ? 1 + (kayaks.boat(equipped).speed * speedPct) / 100 : 1
  },
}
