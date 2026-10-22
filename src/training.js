// The coach roster (config COACH_TRAINING.coaches): coaches bought with coins in the Coach window
// (coach.js), any number of them, but only as many equipped at once as the equipped boat carries
// (its `coaches`, kayaks.js); every equipped coach adds its effect. A `locked` coach is always on
// and takes no slot. Swapping to a boat that carries fewer takes off the coaches equipped last
// until they fit. stamina.js reads
// bonus('speed') and bonus('stamina'); bonus('coin') waits for coin earnings. net.js saves and
// loads it (snapshot() / hydrate()).
import { COACH_TRAINING } from './config.js'
import { kayaks } from './kayaks.js'

const { coaches } = COACH_TRAINING
const free = coaches.filter((c) => !c.price).map((c) => c.id)
const locked = coaches.filter((c) => c.locked).map((c) => c.id)
const owned = new Set(free)
const equipped = new Set(locked)
const listeners = []
const changed = () => listeners.forEach((fn) => fn())

export const training = {
  coaches,
  get slots() {
    return kayaks.coachSlots
  },
  coach: (id) => coaches.find((c) => c.id === id),
  owns: (id) => owned.has(id),
  isEquipped: (id) => equipped.has(id),
  // Always equipped (config `locked`), outside the slots: unequip() ignores it.
  isLocked: (id) => !!training.coach(id)?.locked,
  // Equipped coaches taking a slot (not the locked ones).
  get equippedCount() {
    let n = 0
    for (const id of equipped) if (!training.isLocked(id)) n++
    return n
  },
  buy(id) {
    owned.add(id)
    changed()
  },
  // false when every slot is taken.
  equip(id) {
    if (!owned.has(id) || training.equippedCount >= training.slots) return false
    equipped.add(id)
    changed()
    return true
  },
  unequip(id) {
    if (!training.isLocked(id) && equipped.delete(id)) changed()
  },
  // fn() after any change (net.js saves).
  onChange(fn) {
    listeners.push(fn)
  },
  // The saved half (saveProgress; Kayak-and-surf -backend sanitize.ts): coaches [id], equippedCoaches [id].
  snapshot() {
    return { coaches: [...owned], equippedCoaches: [...equipped] }
  },
  // A loaded save: known coaches only (the free ones always owned), then the equipped ones that are
  // owned, as many as the boat's slots hold (hydrate kayaks.js first).
  hydrate(d) {
    if (Array.isArray(d?.coaches)) {
      owned.clear()
      for (const id of [...free, ...d.coaches]) if (training.coach(id)) owned.add(id)
    }
    if (Array.isArray(d?.equippedCoaches)) {
      equipped.clear()
      for (const id of locked) equipped.add(id)
      for (const id of d.equippedCoaches) {
        if (owned.has(id) && !equipped.has(id) && training.equippedCount < training.slots) equipped.add(id)
      }
    }
    changed()
  },
  // Multiplier from the equipped coaches for 'speed' | 'stamina' | 'coin'.
  bonus(effect) {
    let pct = 0
    for (const id of equipped) pct += training.coach(id).effects[effect] ?? 0
    return 1 + pct / 100
  },
}

// A boat that carries fewer coaches: take off the ones equipped last until they fit.
kayaks.onEquip(() => {
  const extra = [...equipped].filter((id) => !training.isLocked(id))
  if (extra.length <= training.slots) return
  while (extra.length > training.slots) equipped.delete(extra.pop())
  changed()
})
