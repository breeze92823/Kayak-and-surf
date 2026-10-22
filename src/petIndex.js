// The pet collection book behind the HUD's Index window (hud/petIndex.js): every pet by rarity,
// the egg it hatches from and the slide area it is found in, and which of them the player has
// discovered in each variant (Normal / Big / Huge / Shiny / Rainbow). Completing a rarity's page in
// a variant earns its `reward` (+% luck, waiting for the hatching gameplay to read bonus('luck')).
// `look` is the hub/petFigure.js recipe for the portrait; `species` uses the hub/pets.js showcase
// model instead. In memory until net.js saves progress; a new player has discovered nothing.

export const VARIANTS = [
  { id: 'normal', name: 'Normal' },
  { id: 'big', name: 'Big' },
  { id: 'huge', name: 'Huge' },
  { id: 'shiny', name: 'Shiny' },
  { id: 'rainbow', name: 'Rainbow' },
]

export const RARITIES = [
  { id: 'common', name: 'Common', reward: 2 },
  { id: 'uncommon', name: 'Uncommon', reward: 3 },
  { id: 'rare', name: 'Rare', reward: 4 },
  { id: 'epic', name: 'Epic', reward: 5 },
  { id: 'legendary', name: 'Legendary', reward: 6 },
  { id: 'secret', name: 'Secret', reward: 8 },
  { id: 'limited', name: 'Limited', reward: 8 },
  { id: 'exclusive', name: 'Exclusive', reward: 10 },
]

// Eggs: `model` picks the hub/eggs.js showcase egg, otherwise a spotted egg in `colors`. Prices
// are config EGG_HATCH; the Basic Egg is the 20-coin pixel egg on the yellow band.
export const EGGS = {
  basic: { name: 'Basic Egg', model: 'pixel', colors: ['#f4ead2', '#8fd16a'] },
  canyon: { name: 'Canyon Egg', colors: ['#9be35a', '#a8442e'] },
  frost: { name: 'Frost Egg', colors: ['#e8f6ff', '#5ec8f2'] },
  cloud: { name: 'Cloud Egg', colors: ['#fff6c8', '#ffb43a'] },
  rainbow: { name: 'Rainbow Egg', model: 'rainbow' },
  cream: { name: 'Cream Egg', model: 'cream' },
  stone: { name: 'Stone Egg', model: 'stone' },
  lunar: { name: 'Lunar Egg', colors: ['#e8282e', '#ffd23a'] },
  spin: { name: 'Spin Wheel', colors: ['#ff5fd2', '#3fd2ff'] }, // not an egg: the spin wheel's prize
}

// plan: quad | bird | jelly | seahorse | golem | blob. Colours: c body, b belly/muzzle, a accent.
// Extras: ears (pointy|round|floppy|long|big|none), tail (short|bushy|long|curl|none), horns,
// tusks, trunk, wings (true = feathered for birds / bat wings for quads), stripes, glow, crest.
const P = (id, name, rarity, egg, area, look) => ({ id, name, rarity, egg, area, look })
const S = (id, name, rarity, egg, area, species) => ({ id, name, rarity, egg, area, species })

export const PETS = [
  // Common: the Basic Egg at Splash Lake and the Canyon Egg
  P('chick', 'Chick', 'common', 'basic', 'lake', { plan: 'bird', c: '#f2f2ec', b: '#ffffff', a: '#ff9a2a', crest: '#e8323a' }),
  P('goat', 'Goat', 'common', 'basic', 'lake', { plan: 'quad', c: '#e9e2d4', b: '#cfc5b2', a: '#8a7a64', ears: 'floppy', horns: '#b9a888', tail: 'short', beard: true }),
  P('boar', 'Wild Boar', 'common', 'basic', 'lake', { plan: 'quad', c: '#7a4a2e', b: '#c48a6a', a: '#3a2416', ears: 'pointy', tusks: true, tail: 'curl', mane: true }),
  P('kangaroo', 'Baby Kangaroo', 'common', 'basic', 'lake', { plan: 'quad', c: '#c98a52', b: '#f0cfa2', a: '#7a4a24', ears: 'long', tail: 'long', upright: true }),
  P('squirrel', 'Squirrel', 'common', 'basic', 'lake', { plan: 'quad', c: '#b8642a', b: '#f2d2a8', a: '#6a3414', ears: 'pointy', tail: 'bushy', upright: true }),
  P('jellyfish', 'Jellyfish', 'common', 'basic', 'lake', { plan: 'jelly', c: '#ff8ad8', b: '#ffd2f2', a: '#b04ad0', glow: 0.35 }),
  P('titan', 'Titan', 'common', 'canyon', 'canyon', { plan: 'golem', c: '#8a8f9a', b: '#b8bec8', a: '#ffb02a', glow: 0.2 }),
  P('draco', 'Draco', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#3ab85a', b: '#c8f08a', a: '#1a6a30', ears: 'none', horns: '#f2e2b0', wings: '#2a8a44', tail: 'long', spikes: true }),
  P('nyx', 'Nyx', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#2a2440', b: '#4a3e72', a: '#b88aff', ears: 'pointy', tail: 'long', glow: 0.15 }),
  P('phanny', 'Phanny', 'common', 'basic', 'lake', { plan: 'quad', c: '#9aa6c0', b: '#c2cadc', a: '#ff9ab8', ears: 'big', trunk: true, tail: 'short' }),
  P('pengy', 'Pengy', 'common', 'basic', 'lake', { plan: 'bird', c: '#26303e', b: '#ffffff', a: '#ffb02a', penguin: true }),
  P('sheila', 'Sheila', 'common', 'basic', 'lake', { plan: 'quad', c: '#f6f4ee', b: '#3a3434', a: '#3a3434', ears: 'floppy', tail: 'short', wool: true }),
  P('wisptiger', 'Temple Wisp Tiger', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#ff9a2a', b: '#fff2dc', a: '#2a1a10', ears: 'round', tail: 'long', stripes: true }),
  P('magmahound', 'Magma Hound', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#3a2a2a', b: '#ff6a1a', a: '#ffb02a', ears: 'pointy', tail: 'long', stripes: true, glow: 0.25 }),
  P('seahorse', 'Tideglow Seahorse', 'common', 'basic', 'lake', { plan: 'seahorse', c: '#3ad8c8', b: '#c8fff4', a: '#1a8ab8', glow: 0.2 }),
  P('bat', 'Flitter Bat', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#4a3a5a', b: '#8a6a9a', a: '#ff6a8a', ears: 'big', wings: '#3a2a4a', tail: 'none', small: true }),
  P('fox', 'Ember Fox', 'common', 'canyon', 'canyon', { plan: 'quad', c: '#f2742a', b: '#ffffff', a: '#2a1a14', ears: 'pointy', tail: 'bushy' }),
  P('bear', 'Bear Cub', 'common', 'basic', 'lake', { plan: 'quad', c: '#8a5a34', b: '#d8a878', a: '#2a1a10', ears: 'round', tail: 'short', chunky: true }),
  P('turtle', 'Shelly', 'common', 'basic', 'lake', { plan: 'quad', c: '#7ad05a', b: '#f2e2a0', a: '#3a7a2a', ears: 'none', tail: 'short', shell: '#8a5a2a' }),
  P('crab', 'Pinchy', 'common', 'basic', 'lake', { plan: 'blob', c: '#ff5a3a', b: '#ffb08a', a: '#c82a1a', claws: true }),
  P('frog', 'Lily Frog', 'common', 'basic', 'lake', { plan: 'blob', c: '#5ad04a', b: '#e8ff9a', a: '#2a8a2a', frog: true }),
  P('bunny', 'Bunny', 'common', 'basic', 'lake', { plan: 'quad', c: '#f4f0ec', b: '#ffd2dc', a: '#ff8aa8', ears: 'long', tail: 'short', upright: true, small: true }),
  P('duckling', 'Duckling', 'common', 'basic', 'lake', { plan: 'bird', c: '#ffe23a', b: '#fff2a0', a: '#ff8a1a' }),
  P('piglet', 'Piglet', 'common', 'basic', 'lake', { plan: 'quad', c: '#ffaac0', b: '#ffd2de', a: '#e8708e', ears: 'floppy', tail: 'curl', snout: true }),
  P('owl', 'Hoot', 'common', 'canyon', 'canyon', { plan: 'bird', c: '#8a6a4a', b: '#e8d2b0', a: '#ffb02a', owl: true }),
  P('pupper', 'Pupper', 'common', 'basic', 'lake', { plan: 'quad', c: '#e8b878', b: '#fff2dc', a: '#5a3a1a', ears: 'floppy', tail: 'long' }),
  P('kitty', 'Kitty', 'common', 'basic', 'lake', { plan: 'quad', c: '#9a9aa2', b: '#e8e8ee', a: '#ff8aa8', ears: 'pointy', tail: 'long', stripes: true }),

  // Uncommon: Canyon and Frost Eggs
  P('raccoon', 'Bandit Raccoon', 'uncommon', 'canyon', 'canyon', { plan: 'quad', c: '#7a7a82', b: '#e8e8ee', a: '#2a2a30', ears: 'round', tail: 'bushy', stripes: true, mask: true }),
  P('deer', 'Fawn', 'uncommon', 'canyon', 'canyon', { plan: 'quad', c: '#c8844a', b: '#f6dcb8', a: '#ffffff', ears: 'floppy', horns: '#8a6a3a', tail: 'short', spots: true }),
  P('lizard', 'Sunny Gecko', 'uncommon', 'canyon', 'canyon', { plan: 'quad', c: '#ffd23a', b: '#fff2a0', a: '#ff6a2a', ears: 'none', tail: 'long', spots: true, small: true }),
  P('polar', 'Polar Cub', 'uncommon', 'frost', 'peaks', { plan: 'quad', c: '#f6faff', b: '#dce8f4', a: '#2a3040', ears: 'round', tail: 'short', chunky: true }),
  P('arcticfox', 'Arctic Fox', 'uncommon', 'frost', 'peaks', { plan: 'quad', c: '#eef6ff', b: '#ffffff', a: '#7ab8e8', ears: 'pointy', tail: 'bushy' }),
  P('seal', 'Snowy Seal', 'uncommon', 'frost', 'peaks', { plan: 'blob', c: '#c8d8e8', b: '#f2f8ff', a: '#3a4a5a', seal: true }),
  P('yeti', 'Yeti Jr.', 'uncommon', 'frost', 'peaks', { plan: 'golem', c: '#f2f8ff', b: '#8ab8e8', a: '#5ac8ff', fur: true }),
  P('puffin', 'Puffin', 'uncommon', 'frost', 'peaks', { plan: 'bird', c: '#20242c', b: '#ffffff', a: '#ff6a1a', penguin: true }),
  P('ram', 'Crag Ram', 'uncommon', 'canyon', 'canyon', { plan: 'quad', c: '#d8c8a8', b: '#f2e8d4', a: '#6a5a4a', ears: 'floppy', horns: '#8a7a5a', tail: 'short', wool: true }),
  P('hedgehog', 'Spiky', 'uncommon', 'canyon', 'canyon', { plan: 'blob', c: '#8a6a4a', b: '#f2d8b8', a: '#4a3424', spikes: true }),

  // Rare
  P('wolf', 'Frost Wolf', 'rare', 'frost', 'peaks', { plan: 'quad', c: '#a8c8e8', b: '#eef6ff', a: '#3a6aa8', ears: 'pointy', tail: 'bushy', glow: 0.18 }),
  P('owlking', 'Snow Owl', 'rare', 'frost', 'peaks', { plan: 'bird', c: '#ffffff', b: '#e8f2ff', a: '#ffd23a', owl: true }),
  P('mammoth', 'Mini Mammoth', 'rare', 'frost', 'peaks', { plan: 'quad', c: '#8a5a3a', b: '#b8885a', a: '#f2ead8', ears: 'big', trunk: true, tusks: true, tail: 'short', chunky: true, wool: true }),
  P('unicorn', 'Unicorn', 'rare', 'rainbow', 'lake', { plan: 'quad', c: '#ffffff', b: '#ffe8f6', a: '#ff8ad8', ears: 'pointy', horns: '#ffd23a', unicorn: true, tail: 'long', mane: true }),
  P('cloudcat', 'Cloud Cat', 'rare', 'cloud', 'summit', { plan: 'quad', c: '#ffffff', b: '#e8f4ff', a: '#7ad8ff', ears: 'pointy', tail: 'bushy', wings: '#ffffff', glow: 0.2 }),
  P('sunbird', 'Sunbird', 'rare', 'cloud', 'summit', { plan: 'bird', c: '#ffb02a', b: '#ffe23a', a: '#ff4a2a', crest: '#ff4a2a', glow: 0.25 }),
  P('crystalgolem', 'Crystal Golem', 'rare', 'frost', 'peaks', { plan: 'golem', c: '#7ad8ff', b: '#d8f6ff', a: '#3a8aff', glow: 0.3 }),
  P('koi', 'Koi Spirit', 'rare', 'rainbow', 'lake', { plan: 'seahorse', c: '#ffffff', b: '#ff6a2a', a: '#ff3a3a', glow: 0.2 }),

  // Epic
  P('thunderwolf', 'Thunder Wolf', 'epic', 'cloud', 'summit', { plan: 'quad', c: '#2a3a8a', b: '#5a7aff', a: '#ffe23a', ears: 'pointy', tail: 'bushy', stripes: true, glow: 0.35 }),
  P('pegasus', 'Pegasus', 'epic', 'cloud', 'summit', { plan: 'quad', c: '#ffffff', b: '#e8f2ff', a: '#7ac8ff', ears: 'pointy', wings: '#e8f4ff', tail: 'long', mane: true }),
  P('lavaturtle', 'Lava Turtle', 'epic', 'cream', 'canyon', { plan: 'quad', c: '#3a2a2a', b: '#ff8a2a', a: '#ff4a1a', ears: 'none', tail: 'short', shell: '#2a1a1a', glow: 0.35 }),
  P('frostdragon', 'Frost Dragon', 'epic', 'frost', 'peaks', { plan: 'quad', c: '#8ad8ff', b: '#e8faff', a: '#2a7ac8', ears: 'none', horns: '#ffffff', wings: '#5ab8f2', tail: 'long', spikes: true, glow: 0.2 }),
  P('starjelly', 'Star Jelly', 'epic', 'cloud', 'summit', { plan: 'jelly', c: '#ffe23a', b: '#fff8c8', a: '#ff8a2a', glow: 0.5 }),
  P('kraken', 'Baby Kraken', 'epic', 'rainbow', 'lake', { plan: 'jelly', c: '#8a3ac8', b: '#d8a8ff', a: '#3a1a6a', kraken: true, glow: 0.2 }),

  // Legendary
  P('cosmic', 'Cosmic Fox', 'legendary', 'cream', 'summit', { plan: 'quad', c: '#3a1a7a', b: '#8a5aff', a: '#ff8ad8', ears: 'pointy', tail: 'bushy', spots: true, glow: 0.45 }),
  P('sungolem', 'Sun Titan', 'legendary', 'cream', 'summit', { plan: 'golem', c: '#ffc83a', b: '#fff2a0', a: '#ff6a1a', glow: 0.5 }),
  P('kitsune', 'Kitsune', 'legendary', 'cream', 'canyon', { plan: 'quad', c: '#ffffff', b: '#ffe8e8', a: '#e8323a', ears: 'pointy', tail: 'bushy', ninetails: true, glow: 0.25 }),
  P('glacier', 'Glacier Dragon', 'legendary', 'cream', 'peaks', { plan: 'quad', c: '#d8f6ff', b: '#ffffff', a: '#3ac8ff', ears: 'none', horns: '#3ac8ff', wings: '#a8e8ff', tail: 'long', spikes: true, glow: 0.4 }),
  P('angel', 'Angel Bunny', 'legendary', 'cream', 'summit', { plan: 'quad', c: '#ffffff', b: '#fff2c8', a: '#ffd23a', ears: 'long', wings: '#ffffff', tail: 'short', upright: true, halo: true, glow: 0.3 }),

  // Secret: one in a million from the eggs
  P('glitch', 'Glitch Cat', 'secret', 'basic', 'lake', { plan: 'quad', c: '#1a1a22', b: '#3aff8a', a: '#ff3ad8', ears: 'pointy', tail: 'long', stripes: true, glow: 0.6 }),
  P('void', 'Void Kraken', 'secret', 'frost', 'peaks', { plan: 'jelly', c: '#14102a', b: '#5a2aff', a: '#ff3a8a', kraken: true, glow: 0.5 }),
  P('goldenduck', 'Golden Duck', 'secret', 'cloud', 'summit', { plan: 'bird', c: '#ffc83a', b: '#fff2a0', a: '#ff8a1a', gold: true, glow: 0.3 }),

  // Limited: the Lunar New Year event and the 9-Robux offer
  S('bee', 'Stinging Bee', 'limited', 'stone', 'lake', 'bee'),
  P('lunarlion', 'Lunar Lion', 'limited', 'lunar', 'lake', { plan: 'quad', c: '#e8282e', b: '#ffd23a', a: '#ffffff', ears: 'round', tail: 'bushy', mane: true, glow: 0.2 }),
  P('lanterndragon', 'Lantern Dragon', 'limited', 'lunar', 'lake', { plan: 'quad', c: '#ffc83a', b: '#e8282e', a: '#ff6a1a', ears: 'none', horns: '#ffffff', tail: 'long', spikes: true, mane: true, glow: 0.3 }),

  // Exclusive: the spin wheel's top prize (spinWheel.js)
  P('spiritwolf', 'Spirit Wolf', 'exclusive', 'spin', 'lake', { plan: 'quad', c: '#3e5c9e', b: '#8ab0e8', a: '#1c2c66', ears: 'pointy', tail: 'bushy', chunky: true, spikes: true, mane: true, glow: 0.3 }),

  // Exclusive: the Robux pets on the deck pedestals
  S('griffin', 'Griffin', 'exclusive', 'stone', 'lake', 'griffin'),
  S('phoenix', 'Phoenix', 'exclusive', 'stone', 'lake', 'phoenix'),
  S('hydra', 'Hydra', 'exclusive', 'stone', 'lake', 'hydra'),
  S('dragon', 'Celestial Dragon', 'exclusive', 'stone', 'lake', 'dragon'),
]

const discovered = new Set()
const key = (variant, id) => `${variant}:${id}`
const listeners = []

export const petIndex = {
  variants: VARIANTS,
  rarities: RARITIES,
  eggs: EGGS,
  pets: PETS,
  pet: (id) => PETS.find((p) => p.id === id),
  ofRarity: (rarity) => PETS.filter((p) => p.rarity === rarity),
  ofEgg: (egg) => PETS.filter((p) => p.egg === egg),
  has: (id, variant = 'normal') => discovered.has(key(variant, id)),
  // Hatching calls this; true when it is new to the book.
  discover(id, variant = 'normal') {
    if (discovered.has(key(variant, id))) return false
    discovered.add(key(variant, id))
    listeners.forEach((fn) => fn())
    return true
  },
  // fn() after a new discovery or a load (net.js saves).
  onChange(fn) {
    listeners.push(fn)
  },
  // The saved half (saveProgress; Kayak-and-surf -backend sanitize.ts sanitizeDiscovered):
  // discovered ["<petId>:<variant>"] (the reverse of this file's own keys).
  snapshot() {
    return { discovered: [...discovered].map((k) => k.split(':').reverse().join(':')) }
  },
  // A loaded save replaces the placeholders: known pets and variants only. Load it before
  // petInventory.js, whose hydrate() discovers every owned pet.
  hydrate(d) {
    if (!Array.isArray(d?.discovered)) return
    discovered.clear()
    for (const entry of d.discovered) {
      const [id, variant] = String(entry).split(':')
      if (petIndex.pet(id) && VARIANTS.some((v) => v.id === variant)) discovered.add(key(variant, id))
    }
    listeners.forEach((fn) => fn())
  },
  // { found, total } for one page (rarity x variant).
  count(rarity, variant) {
    const pets = petIndex.ofRarity(rarity)
    return { found: pets.filter((p) => discovered.has(key(variant, p.id))).length, total: pets.length }
  },
  // Multiplier from completed pages: 'luck'.
  bonus(effect) {
    if (effect !== 'luck') return 1
    let pct = 0
    for (const v of VARIANTS) for (const r of RARITIES) {
      const { found, total } = petIndex.count(r.id, v.id)
      if (found === total) pct += r.reward
    }
    return 1 + pct / 100
  },
}
