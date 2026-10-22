// A Kayak Shop collection bought with trophies (trails.js, emotes.js): items are bought in list
// order (only the next one is for sale, the rest are locked); free ones are owned from the start
// and the first of those equipped (none when every item has a price); at most one is equipped and
// unequip() leaves none. In memory until net.js saves progress.
export function createCollection(list) {
  const owned = new Set(list.filter((t) => !t.price).map((t) => t.id))
  let equipped = list.find((t) => !t.price)?.id ?? null
  const listeners = []
  const changed = () => listeners.forEach((fn) => fn(equipped))

  const col = {
    list,
    item: (id) => list.find((t) => t.id === id),
    owns: (id) => owned.has(id),
    isEquipped: (id) => equipped === id,
    // The equipped item's id, or null.
    get equipped() {
      return equipped
    },
    // The first item not yet owned: the only one for sale. Later ones are locked.
    get next() {
      return list.find((t) => !owned.has(t.id))?.id ?? null
    },
    isLocked: (id) => !owned.has(id) && id !== col.next,
    // false unless it's the item for sale.
    buy(id) {
      if (id !== col.next) return false
      owned.add(id)
      return true
    },
    // false unless owned.
    equip(id) {
      if (!owned.has(id)) return false
      equipped = id
      changed()
      return true
    },
    unequip() {
      equipped = null
      changed()
    },
    // fn(id | null) whenever the equipped item changes.
    onEquip(fn) {
      listeners.push(fn)
    },
  }
  return col
}
