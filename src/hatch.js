// Egg odds and rolls (config EGG_HATCH), after Paper-plane's hatch.js. A hatch picks a rarity by
// `odds` (only the rarities the egg holds count), then one of the egg's pets of that rarity evenly,
// then a variant: each of `variants` in order at its chance x luck, else Normal. Pure: eggs.js pays,
// checks storage and puts the pets in the Pet window.
import { EGG_HATCH } from './config.js'
import { petIndex } from './petIndex.js'

const { odds, variants } = EGG_HATCH

// The egg's pets with their chance (0..1), rarest last.
export function eggOdds(egg) {
  const pets = petIndex.ofEgg(egg)
  const count = {}
  for (const p of pets) count[p.rarity] = (count[p.rarity] ?? 0) + 1
  const total = Object.keys(count).reduce((sum, r) => sum + (odds[r] ?? 0), 0)
  return pets.map((pet) => ({ pet, chance: total ? (odds[pet.rarity] ?? 0) / total / count[pet.rarity] : 0 })).sort((a, b) => b.chance - a.chance)
}

function rollVariant(luck) {
  for (const [variant, chance] of Object.entries(variants)) if (Math.random() < chance * luck) return variant
  return 'normal'
}

// `n` hatches of `egg`: [{ id, variant }].
export function rollEgg(egg, n = 1, luck = 1) {
  const list = eggOdds(egg)
  return Array.from({ length: n }, () => {
    let r = Math.random()
    const hit = list.find((e) => (r -= e.chance) < 0) ?? list[0]
    return { id: hit.pet.id, variant: rollVariant(luck) }
  })
}
