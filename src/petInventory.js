// The pets the player owns, behind the HUD's Pet window (hud/pets.js; config PET_TEAM). Each owned
// pet is { uid, id, variant }: a petIndex.js species in one of its variants, so the same species can
// be owned many times. At most `storage` pets, and up to `teamSize` of them equipped in the team;
// every pet has a coin multiplier (power(): its rarity's range spread over that rarity's list, times
// the variant's) and bonus('coin') adds up the team's, waiting for coin earnings like the coaches'.
// Adding a pet also discovers it in the Index. In memory until net.js saves progress (snapshot() /
// hydrate() are the saved shape); the starting pets are placeholders.
import { PET_TEAM } from './config.js'
import { petIndex } from './petIndex.js'

const { power: POWER, variantMult } = PET_TEAM

// Base multiplier of a species: low -> high down its rarity's list.
const base = {}
for (const r of petIndex.rarities) {
  const list = petIndex.ofRarity(r.id)
  const [lo, hi] = POWER[r.id] ?? [1, 1]
  list.forEach((p, i) => (base[p.id] = lo + (hi - lo) * (list.length > 1 ? i / (list.length - 1) : 0)))
}
// Rarity order for ties: rarer first.
const rank = Object.fromEntries(petIndex.rarities.map((r, i) => [r.id, i]))

let nextUid = 1
const owned = [] // in the order they were got
const team = new Set() // uids
let teamSize = PET_TEAM.team
const storage = PET_TEAM.storage
const listeners = []
const changed = () => listeners.forEach((fn) => fn())

export const inventory = {
  get list() {
    return owned
  },
  get count() {
    return owned.length
  },
  get storage() {
    return storage
  },
  get teamSize() {
    return teamSize
  },
  get teamCount() {
    return team.size
  },
  get full() {
    return owned.length >= storage
  },
  pet: (uid) => owned.find((p) => p.uid === uid),
  info: (p) => petIndex.pet(p.id),
  isEquipped: (uid) => team.has(uid),
  // Coin multiplier of one owned pet (or { id, variant }).
  power: (p) => base[p.id] * (variantMult[p.variant] ?? 1),
  // Strongest first; rarer, then newer, on a tie.
  sorted(list = owned) {
    return [...list].sort((a, b) => inventory.power(b) - inventory.power(a) || rank[inventory.info(b).rarity] - rank[inventory.info(a).rarity] || b.uid - a.uid)
  },
  // The team, strongest first.
  get team() {
    return inventory.sorted(owned.filter((p) => team.has(p.uid)))
  },
  // Hatching / prizes: the new pet, or null when storage is full.
  add(id, variant = 'normal') {
    if (owned.length >= storage || !petIndex.pet(id)) return null
    const p = { uid: nextUid++, id, variant }
    owned.push(p)
    petIndex.discover(id, variant)
    changed()
    return p
  },
  // false when the team is full.
  equip(uid) {
    if (team.has(uid)) return true
    if (team.size >= teamSize || !inventory.pet(uid)) return false
    team.add(uid)
    changed()
    return true
  },
  unequip(uid) {
    if (team.delete(uid)) changed()
  },
  // The strongest pets fill the team; true when it changed.
  equipBest() {
    const best = inventory.sorted().slice(0, teamSize).map((p) => p.uid)
    const same = best.length === team.size && best.every((uid) => team.has(uid))
    team.clear()
    for (const uid of best) team.add(uid)
    if (!same) changed()
    return !same
  },
  unequipAll() {
    if (!team.size) return false
    team.clear()
    changed()
    return true
  },
  // Removes pets for good (equipped ones leave the team); the number removed.
  remove(uids) {
    let n = 0
    for (const uid of uids) {
      const i = owned.findIndex((p) => p.uid === uid)
      if (i < 0) continue
      owned.splice(i, 1)
      team.delete(uid)
      n++
    }
    if (n) changed()
    return n
  },
  // One more team slot; false at PET_TEAM.maxTeam.
  addTeamSlot() {
    if (teamSize >= PET_TEAM.maxTeam) return false
    teamSize++
    changed()
    return true
  },
  // Multiplier from the team: 'coin' (the multipliers add up; 1 with no team).
  bonus(effect) {
    if (effect !== 'coin' || !team.size) return 1
    let sum = 0
    for (const p of owned) if (team.has(p.uid)) sum += inventory.power(p)
    return sum
  },
  // fn() after any change.
  onChange(fn) {
    listeners.push(fn)
  },
  // The saved half (saveProgress; Kayak-and-surf -backend sanitize.ts sanitizePets keeps the same
  // shape): pets [{ uid, id, variant }], petTeam [uid], petTeamSize, nextPetUid.
  snapshot() {
    return { pets: owned.map(({ uid, id, variant }) => ({ uid, id, variant })), petTeam: [...team], petTeamSize: teamSize, nextPetUid: nextUid }
  },
  // A loaded save replaces the placeholders: known species and variants only, unique uids, at most
  // `storage`; the team only owned pets, at most the team size.
  hydrate(d) {
    if (!Array.isArray(d?.pets)) return
    const variants = new Set(petIndex.variants.map((v) => v.id))
    owned.length = 0
    team.clear()
    for (const p of d.pets) {
      if (owned.length >= storage) break
      if (!Number.isInteger(p?.uid) || p.uid < 1 || owned.some((o) => o.uid === p.uid) || !petIndex.pet(p.id) || !variants.has(p.variant)) continue
      owned.push({ uid: p.uid, id: p.id, variant: p.variant })
      petIndex.discover(p.id, p.variant) // anything owned has been seen
    }
    if (Number.isInteger(d.petTeamSize)) teamSize = Math.min(PET_TEAM.maxTeam, Math.max(PET_TEAM.team, d.petTeamSize))
    for (const uid of Array.isArray(d.petTeam) ? d.petTeam : []) if (team.size < teamSize && owned.some((p) => p.uid === uid)) team.add(uid)
    nextUid = Math.max(Number.isInteger(d.nextPetUid) ? d.nextPetUid : 1, ...owned.map((p) => p.uid + 1), 1)
    changed()
  },
  // The Mutate machine: the pet becomes `variant`, keeping its uid and team slot (and is discovered
  // in that variant); false for an unknown pet or variant.
  setVariant(uid, variant) {
    const p = inventory.pet(uid)
    if (!p || !petIndex.variants.some((v) => v.id === variant)) return false
    p.variant = variant
    petIndex.discover(p.id, variant)
    changed()
    return true
  },
  // A finished trade (net.js tradeDone): the pets given away leave (and the team); the ones got
  // arrive with the uids the server picked (one clashing with a pet hatched since the last save
  // gets a fresh uid). No storage check: the server made it, and a trade must never lose a pet.
  // Returns the pets added.
  applyTrade({ gave = [], got = [] }) {
    const gone = new Set(gave)
    for (let i = owned.length - 1; i >= 0; i--) {
      if (!gone.has(owned[i].uid)) continue
      team.delete(owned[i].uid)
      owned.splice(i, 1)
    }
    const added = []
    for (const p of got) {
      if (!petIndex.pet(p.id)) continue
      const uid = owned.some((o) => o.uid === p.uid) ? nextUid : p.uid
      const pet = { uid, id: p.id, variant: p.variant }
      owned.push(pet)
      added.push(pet)
      nextUid = Math.max(nextUid, uid + 1)
      petIndex.discover(p.id, p.variant)
    }
    changed()
    return added
  },
}

for (const { id, variant } of PET_TEAM.start) inventory.add(id, variant)
