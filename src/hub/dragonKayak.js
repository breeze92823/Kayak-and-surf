// The Golden Dragon Kayak, as the reference shows it on the magenta pad: a dragon boat. A fat gold
// hull with a flame stripe down each side, orange scale ridges across the stern deck and dark-edged
// serrated tail fins splayed off the stern; at the bow a bulb with a glowing medallion on each side,
// out of which the dragon's neck rears up (orange chevron plates down the throat, a row of gold
// spikes down its back), carrying the head on top facing forward: snout with nostrils, teeth along
// the jaw, red eyes under orange brows, cream horns swept back, whiskers and a gold spike crown.
// Fans of dark-edged gold fins spray back from the neck toward the stern on both sides.
// Built in the shop boats' raft-local space (kayakModels.js: +Z the bow, keel at y 0, deck up, the
// paddler seated at RAFT.seatY over the cockpit, DRAGON_COCKPIT_Y). Static parts are baked to one
// mesh per material. island.js stands the showcase on the magenta pad keel down.
import { Group, MeshStandardMaterial } from 'three'
import { MATERIAL_PBR } from '../config.js'
import { canvas, toTexture } from '../textures.js'
import { hull } from './kayakModels.js'
import { neon, plastic } from './materials.js'
import { ball, bake, blade, fan, spike, tube } from './sculpt.js'

export const DRAGON_HULL = { length: 4, width: 1.3, depth: 0.36, deck: 0.24, sheer: 0.1, sharp: 0.5, belly: 1, z: -0.15 }

const { length: L, width: W, depth: D, deck: DECK, sharp, belly, z: Z } = DRAGON_HULL
const uAt = (z) => (z - Z) / L + 0.5
// Half-width at the gunwale and the deck's crown height at z (hull() in kayakModels.js).
const halfWidth = (z) => (W / 2) * Math.sin(Math.PI * uAt(z) ** belly) ** sharp
const deckY = (z) => {
  const u = uAt(z)
  return D + DECK * Math.sin(Math.PI * u) ** 0.8 * Math.max(Math.sin(Math.PI * u ** belly) ** sharp, 0.001) ** 0.3
}
// Deck height at the cockpit (kayakModels.js puts the cockpit rim here).
export const DRAGON_COCKPIT_Y = deckY(0.2) + 0.02

// Hull paint in hull uv (canvas x = u stern -> bow, canvas y = v: the top half is the deck, its
// middle the deck's centre line; v 0.5..1 the bottom, the sides near 0.5 and 1).
function hullSkin() {
  const c = canvas(512, 256)
  const g = c.getContext('2d')
  const w = 512
  const h = 256
  const along = g.createLinearGradient(0, 0, w, 0)
  along.addColorStop(0, '#ffb81a')
  along.addColorStop(0.5, '#ffd21a')
  along.addColorStop(1, '#ffe24a')
  g.fillStyle = along
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(232,120,10,0.3)' // underside a shade deeper
  g.fillRect(0, h * 0.62, w, h * 0.26)
  // Flame stripe down each side: a wavy orange band just under the gunwale, licking up and down.
  for (const y0 of [h * 0.535, h * 0.965]) {
    const dir = y0 < h * 0.75 ? 1 : -1 // into the side from that gunwale
    g.fillStyle = '#ff7a12'
    g.beginPath()
    g.moveTo(w * 0.04, y0)
    for (let x = 0; x <= 1; x += 0.02) {
      const lick = 0.5 + 0.5 * Math.sin(x * 26)
      g.lineTo(w * (0.04 + x * 0.9), y0 + dir * h * (0.03 + 0.06 * lick * Math.sin(Math.PI * x)))
    }
    g.lineTo(w * 0.94, y0)
    g.closePath()
    g.fill()
  }
  g.fillStyle = '#ff9a1a' // gunwale trim
  for (const y of [0, h / 2 - 8, h / 2, h - 8]) g.fillRect(0, y, w, 8)
  const tex = toTexture(c)
  tex.flipY = false // canvas y = v, like the shop boats' skins
  return new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.4, ...MATERIAL_PBR.PLASTIC })
}

// The neck's centre line from the bow bulb up to the head (y, z), and its radius at each point.
const NECK = [
  [0.55, 1.4],
  [1.05, 1.6],
  [1.6, 1.56],
  [2.05, 1.42],
]
const NECK_R = [0.42, 0.27]

export function dragonKayak() {
  const g = new Group()
  g.add(hull(DRAGON_HULL, hullSkin()))
  const gold = neon('#ffb21a', 0.45)
  const deep = neon('#ff8412', 0.4)
  const shine = neon('#ffe84a', 1.4) // glowing medallions
  const edge = plastic('#2a1806')
  const cream = plastic('#fff1c2')
  const black = plastic('#141414')

  // Bow bulb the neck rises out of, a glowing medallion on each side.
  ball(g, gold, [0, 0.48, 1.3], [0.6, 0.42, 0.72])
  for (const side of [-1, 1]) {
    ball(g, shine, [side * 0.55, 0.47, 1.26], [0.06, 0.26, 0.26])
  }

  // Neck, its throat plates (front, +Z) and the spikes down its back (-Z).
  tube(g, gold, NECK.map(([y, z]) => [0, y, z]), NECK_R[0], NECK_R[1], { radial: 14, seg: 18 })
  for (let i = 0; i < 5; i++) {
    const t = 0.12 + i * 0.19
    const [y, z] = along(t)
    const r = NECK_R[0] + (NECK_R[1] - NECK_R[0]) * t
    ball(g, deep, [0, y, z + r * 0.92], [r * 0.8, 0.08, 0.1], [-0.35, 0, 0])
    spike(g, gold, [0, y + 0.05, z - r * 0.9], [0, y + 0.2, z - r * 0.9 - 0.3], 0.07)
  }

  // Head on top facing forward: skull, snout, jaw with teeth, nostrils, eyes, brows, horns.
  const [hy, hz] = NECK[NECK.length - 1]
  const top = hy + 0.25
  ball(g, gold, [0, top, hz + 0.05], [0.36, 0.3, 0.42])
  ball(g, gold, [0, top - 0.1, hz + 0.45], [0.25, 0.19, 0.32]) // snout
  ball(g, deep, [0, top - 0.25, hz + 0.38], [0.21, 0.08, 0.3]) // jaw
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const tz = hz + 0.22 + i * 0.12
      spike(g, cream, [side * 0.15, top - 0.16, tz], [side * 0.15, top - 0.28, tz], 0.03) // tooth
    }
    ball(g, black, [side * 0.09, top - 0.04, hz + 0.7], 0.045) // nostril
    ball(g, plastic('#c81e14'), [side * 0.28, top + 0.08, hz + 0.18], [0.06, 0.09, 0.1]) // eye
    ball(g, black, [side * 0.31, top + 0.08, hz + 0.21], [0.03, 0.05, 0.05]) // pupil
    ball(g, deep, [side * 0.25, top + 0.2, hz + 0.18], [0.17, 0.05, 0.09], [0, side * 0.4, side * 0.25]) // brow
    spike(g, cream, [side * 0.17, top + 0.2, hz - 0.05], [side * 0.33, top + 0.62, hz - 0.5], 0.07) // horn
    blade(g, gold, [side * 0.22, top - 0.12, hz + 0.55], [side * 0.62, top - 0.28, hz + 0.3], 0.1, 0.03) // whisker
  }
  for (let i = 0; i < 4; i++) {
    const z = hz + 0.2 - i * 0.16
    spike(g, gold, [0, top + 0.24 - i * 0.03, z], [0, top + 0.52 - i * 0.05, z - 0.18], 0.07) // crown
  }

  // Fins spraying back from the neck toward the stern, both sides: gold blades over thin, slightly
  // longer and wider dark ones so their serrated edges read black, an orange vein down each.
  // (Blades are lenses: the dark layer must stay thinner than the gold or it shows through.)
  for (const side of [-1, 1]) {
    for (const [t, len] of [[0.75, 1.0], [0.4, 0.85]]) {
      const [y, z] = along(t)
      const root = [side * 0.24, y, z - 0.18]
      const opts = { out: [side * 0.4, -0.05, -1], up: [side * 0.25, 1, -0.15], n: 5, a0: -0.1, a1: 1.05 }
      const reach = (k) => len * (1 - k * 0.3)
      fan(g, edge, root, { ...opts, len: (k) => reach(k) + 0.07, width: 0.33, thick: 0.02 })
      fan(g, gold, root, { ...opts, len: reach, width: 0.28, thick: 0.08 })
      fan(g, deep, root, { ...opts, len: (k) => reach(k) * 0.55, width: 0.1, thick: 0.1 })
    }
  }

  // Scale ridges across the stern deck, behind the cockpit.
  for (let i = 0; i < 5; i++) {
    const z = -0.6 - i * 0.26
    ball(g, deep, [0, deckY(z) - 0.02, z], [halfWidth(z) * 0.62, 0.06, 0.08])
  }

  // Serrated tail fins splayed back off the stern, dark edged.
  const sternZ = Z - L / 2
  for (const side of [-1, 1]) {
    const root = [side * 0.12, D + 0.06, sternZ + 0.3]
    const opts = { out: [side * 0.3, 0.05, -1], up: [side, 0.25, -0.2], n: 4, a0: 0, a1: 1.0 }
    fan(g, edge, root, { ...opts, len: (k) => 0.8 - k * 0.2, width: 0.3, thick: 0.02 })
    fan(g, gold, root, { ...opts, len: (k) => 0.72 - k * 0.18, width: 0.25, thick: 0.08 })
  }
  return bake(g)
}

// Point on the neck's centre line at t (0 the bow bulb, 1 the head), as [y, z].
function along(t) {
  const f = t * (NECK.length - 1)
  const i = Math.min(NECK.length - 2, Math.floor(f))
  const k = f - i
  return [0, 1].map((j) => NECK[i][j] + (NECK[i + 1][j] - NECK[i][j]) * k)
}
