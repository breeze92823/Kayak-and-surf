// Fixtures standing on the hub island (placements in layout.js, measured off the top-down shot).
// West rim: display slots on the yellow band (Stinging Bee, 500K pot, 15K rainbow stack, 20
// pixel egg), the dome shop stall and the pet pedestals (Griffin, Phoenix, Hydra, Celestial
// Dragon). Deck: SHOP pad, egg, Mutate pad and machine, the Teleport portal on the south landing,
// Coach pad, SPIN pad, the cyan secret-pet pad with the join-the-group steps, the magenta pad.
// East rim: spin wheel, the Lunar New Year pavilion, the Golden Dragon Kayak on the magenta pad
// and the three TOP 100 leaderboards.
import {
  BackSide,
  Box3,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three'
import { EGG_HATCH, HUB_COLORS, LUNAR_EVENT, MATERIAL_PBR, SPAWN } from '../config.js'
import { petIndex } from '../petIndex.js'
import { formatNum } from '../hud/index.js'
import { addBox } from '../colliders.js'
import { mulberry32, stripes, toTexture } from '../textures.js'
import { addSegmentCollider } from './terrain.js'
import {
  BAND_ITEMS,
  COACH,
  DRAGON_KAYAK,
  EGG,
  EGG_ROW,
  ISLAND,
  LANTERNS,
  LEADERBOARDS,
  MAGENTA_PAD,
  MUTATE,
  onIsland,
  PEDESTALS,
  PORTAL,
  RIM_BANDS,
  SHOP,
  SPIN,
} from './layout.js'
import { neon, plastic } from './materials.js'
import { markDynamic } from './batch.js'
import { bannerTexture, labelSprite, leaderboardTexture, portalTexture, rainbowFrameTexture, shopCounterTexture } from './signs.js'
import { createPet } from './pets.js'
import { coachFigure } from './coachFigure.js'
import { creamEgg, eggStand, glow, pixelEgg, rainbowEgg, spottedEgg, stoneEgg } from './eggs.js'
import { particles, updateParticles } from './particles.js'
import { lunarGate } from './lunarGate.js'
import { dragonKayak } from './dragonKayak.js'

const GOLD = ['#fff27a', '#ffc21a'] // coin price tags
const BAND_H = RIM_BANDS[0].h

function shadow(mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = shadow(new Mesh(geo, material))
  m.position.set(x, y, z)
  return m
}

// Yaw that turns local +Z toward the island centre from (x, z).
const faceCentre = (x, z) => Math.atan2(ISLAND.x - x, ISLAND.z - z)

// Glowing floor pad with white dashes round the rim.
function pad(group, x, z, r, color, y = 0) {
  const g = new Group()
  g.add(mesh(new CylinderGeometry(r, r, 0.1, 48), neon(color, 0.6), 0, 0.05, 0))
  g.add(mesh(new CylinderGeometry(r * 0.72, r * 0.72, 0.12, 48), neon(color, 0.25), 0, 0.06, 0))
  const dash = new BoxGeometry(r * 0.32, 0.08, 0.16)
  const white = neon('#ffffff', 0.6)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const d = new Mesh(dash, white)
    d.position.set(Math.cos(a) * (r + 0.15), 0.06, Math.sin(a) * (r + 0.15))
    d.rotation.y = -a + Math.PI / 2
    g.add(d)
  }
  g.position.set(x, y, z)
  group.add(g)
  return g
}

function label(group, rows, height, x, y, z) {
  const s = labelSprite(rows, height)
  s.position.set(x, y, z)
  group.add(s)
  return s
}

// Blocky Roblox-style figure (the shop keeper), feet at the origin.
function figure({ skin = '#f2c79a', shirt = '#2d6cff', pants = '#1f2a44', hair = '#3a2416', scale = 1, bulk = 1 } = {}) {
  const g = new Group()
  const m = (c) => plastic(c)
  for (const side of [-1, 1]) g.add(mesh(new BoxGeometry(0.28, 0.75, 0.3), m(pants), side * 0.16, 0.375, 0))
  g.add(mesh(new BoxGeometry(0.62 * bulk, 0.7, 0.34 * bulk), m(shirt), 0, 1.1, 0))
  for (const side of [-1, 1]) g.add(mesh(new BoxGeometry(0.26 * bulk, 0.7, 0.3 * bulk), m(skin), side * (0.31 * bulk + 0.14), 1.1, 0))
  g.add(mesh(new BoxGeometry(0.42, 0.42, 0.42), m(skin), 0, 1.66, 0))
  g.add(mesh(new BoxGeometry(0.46, 0.14, 0.46), m(hair), 0, 1.9, -0.02))
  g.scale.setScalar(scale)
  return g
}

// Pet pods (reference shot): a bevelled black foot, a black shell with a tall glass window
// toward the deck, a dark floor and ceiling each ringed in glowing yellow, and a black cap with a
// yellow ring on top; a little arrow on the foot and a rainbow neon square on the band round it.
// The pet (pets.js) stands on the floor ring, turned three-quarters and swaying.
const POD_WINDOW = (150 * Math.PI) / 180

function buildPedestals(group, animated) {
  const black = plastic('#1d1b20')
  const liner = plastic('#3b3a42', { side: BackSide })
  const floor = plastic('#2c2b31')
  const yellow = neon('#ffd21a', 0.9)
  const glass = new MeshStandardMaterial({ color: '#d8f4ff', transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1, depthWrite: false })
  const shine = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })
  const frame = new MeshBasicMaterial({ map: rainbowFrameTexture(), transparent: true, depthWrite: false, toneMapped: false })
  const arrow = neon('#fff3b0', 0.8)
  const arrowGeo = new ShapeGeometry(new Shape([new Vector2(-0.14, -0.1), new Vector2(0.14, -0.1), new Vector2(0, 0.14)]))
  const W = POD_WINDOW
  for (const p of PEDESTALS) {
    const [x, z] = onIsland(p.r, p.a)
    const R = p.radius
    const H = p.h
    const F = 0.95 // floor
    const T = H - 0.72 // top of the window
    const g = new Group()
    g.position.set(x, BAND_H, z)
    g.rotation.y = faceCentre(x, z)
    const ring = (r0, r1, y, up = true) => {
      const m = mesh(new RingGeometry(r0, r1, 48), yellow, 0, y, 0)
      m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2
      return g.add(m)
    }
    // Foot with a bevelled top edge.
    g.add(mesh(new CylinderGeometry(R * 1.16, R * 1.18, 0.24, 48), black, 0, 0.12, 0))
    g.add(mesh(new CylinderGeometry(R * 1.06, R * 1.16, 0.1, 48), black, 0, 0.29, 0))
    // Shell: solid below and above the window, open over it (the window faces local +Z).
    g.add(mesh(new CylinderGeometry(R, R, F - 0.34, 48), black, 0, (F + 0.34) / 2, 0))
    g.add(mesh(new CylinderGeometry(R, R, H - 0.42 - T, 48), black, 0, (H - 0.42 + T) / 2, 0))
    g.add(mesh(new CylinderGeometry(R, R, T - F, 48, 1, true, W / 2, Math.PI * 2 - W), black, 0, (T + F) / 2, 0))
    g.add(mesh(new CylinderGeometry(R - 0.03, R - 0.03, T - F, 48, 1, true, W / 2, Math.PI * 2 - W), liner, 0, (T + F) / 2, 0))
    for (const s of [-1, 1]) {
      const jamb = mesh(new BoxGeometry(0.12, T - F, 0.16), black, Math.sin((s * W) / 2) * (R - 0.02), (T + F) / 2, Math.cos((s * W) / 2) * (R - 0.02))
      jamb.rotation.y = (s * W) / 2
      g.add(jamb)
    }
    // Floor and ceiling with their glowing rings.
    g.add(mesh(new CylinderGeometry(R - 0.02, R - 0.02, 0.06, 48), floor, 0, F, 0))
    ring(R * 0.58, R * 0.84, F + 0.035)
    g.add(mesh(new CylinderGeometry(R - 0.02, R - 0.02, 0.06, 48), floor, 0, T, 0))
    ring(R * 0.6, R * 0.86, T - 0.035, false)
    // Cap: a touch wider, yellow ring on top.
    g.add(mesh(new CylinderGeometry(R * 1.05, R * 1.05, 0.42, 48), black, 0, H - 0.21, 0))
    ring(R * 0.5, R * 0.88, H + 0.005)
    // Glass over the window with bright streaks down it.
    const pane = new Mesh(new CylinderGeometry(R + 0.01, R + 0.01, T - F, 32, 1, true, -W / 2 - 0.04, W + 0.08), glass)
    pane.position.y = (T + F) / 2
    pane.renderOrder = 2
    g.add(pane)
    for (const [a, wd] of [[0.3, 0.07], [0.38, 0.035], [-0.42, 0.03]]) {
      const streak = new Mesh(new CylinderGeometry(R + 0.02, R + 0.02, T - F - 0.1, 2, 1, true, a * W, wd), shine)
      streak.position.y = (T + F) / 2
      streak.renderOrder = 3
      g.add(streak)
    }
    const tri = mesh(arrowGeo, arrow, Math.sin(0.55) * (R * 1.17 + 0.01), 0.15, Math.cos(0.55) * (R * 1.17 + 0.01))
    tri.rotation.y = 0.55
    g.add(tri)
    const square = new Mesh(new PlaneGeometry(R * 3.1, R * 3.1), frame)
    square.rotation.x = -Math.PI / 2
    square.position.y = 0.015
    square.renderOrder = 1
    g.add(square)
    group.add(g)
    addBox(x - R * 1.1, x + R * 1.1, 0, BAND_H + H, z - R * 1.1, z + R * 1.1)

    // The pet, in a holder that turns it three-quarters toward the walkway and sways.
    const pet = createPet(p.species)
    pet.group.scale.setScalar(p.scale)
    pet.group.position.z = p.offset * p.scale
    const holder = new Group()
    holder.position.y = F + 0.04
    holder.add(pet.group)
    g.add(holder)
    markDynamic(holder)
    animated.push((t) => {
      holder.rotation.y = p.turn + Math.sin(t * 0.7 + p.a) * 0.25
      holder.position.y = F + 0.04 + (Math.sin(t * 2 + p.a) + 1) * 0.04
      pet.update(t + p.a)
    })

    const rows = [
      { text: formatNum(EGG_HATCH.pets[p.pet]), gradient: GOLD, px: 46, icon: 'coin' },
      { text: p.stock, gradient: ['#ffe14a', '#ff4dd2', '#9a5cff', '#4ab8ff', '#c8ff3a'], px: p.best ? 76 : 48 },
      { text: p.name, color: '#ffffff', px: p.best ? 56 : 46 },
      { text: p.bonus, color: '#ffffff', px: p.best ? 50 : 42, icon: 'coin' },
      ...(p.best ? [{ text: '+700% of Your Best Pet!', gradient: ['#ffe14a', '#ffc21a', '#ff5a1a'], px: 46 }] : []),
    ]
    const tall = rows.reduce((sum, r) => sum + r.px, 0) / 72
    label(group, rows, tall, x, BAND_H + H + 0.35 + tall / 2, z)
    if (p.best) {
      const op = labelSprite([{ text: 'OP!', gradient: ['#ffe14a', '#ffc21a', '#ff3b1a'], px: 110, stroke: '#14080a' }], 1.3)
      op.material.rotation = 0.22
      op.position.set(-R * 0.4, T - 0.7, R + 0.25)
      g.add(op)
    }
  }
}

// Display slots on the yellow band: a thin white ring on the floor under each item. Items: the
// Stinging Bee over its purple stand, the 500K cream egg and the 15K rainbow egg, the 20 pixel egg.
function buildBandItems(group, animated) {
  const white = neon('#ffffff', 0.5)
  for (const item of BAND_ITEMS) {
    const [x, z] = onIsland(item.r, item.a)
    const y = BAND_H
    const slot = mesh(new RingGeometry(item.slot - 0.12, item.slot, 48), white, x, y + 0.012, z)
    slot.rotation.x = -Math.PI / 2
    group.add(slot)
    let top = 1.4
    if (item.kind === 'bee') {
      // Stacked purple stand with pink and white neon rims.
      const r = item.slot * 0.72
      group.add(mesh(new CylinderGeometry(r, r * 1.04, 0.14, 40), neon('#ffffff', 0.5), x, y + 0.07, z))
      group.add(mesh(new CylinderGeometry(r * 0.96, r, 0.16, 40), neon('#ff4ad8', 0.6), x, y + 0.22, z))
      group.add(mesh(new CylinderGeometry(r * 0.9, r * 0.96, 0.12, 40), neon('#9a3dff', 0.7), x, y + 0.36, z))
      const aura = glow('#b04dff', 2.4, 0.7)
      aura.position.set(x, y + 1.2, z)
      group.add(aura)
      const bee = createPet('bee')
      const hover = new Group()
      bee.group.scale.setScalar(1.3)
      hover.add(bee.group)
      hover.position.set(x, y + 0.5, z)
      group.add(hover)
      markDynamic(hover)
      animated.push((t) => {
        hover.position.y = y + 0.5 + Math.sin(t * 3) * 0.12
        hover.rotation.y = faceCentre(x, z) + Math.sin(t * 0.9) * 0.6
        bee.update(t)
      })
      top = 2
    } else if (item.kind === 'cream' || item.kind === 'rainbow') {
      const egg = item.kind === 'cream' ? creamEgg() : rainbowEgg()
      egg.position.set(x, y + 0.02, z)
      group.add(egg)
      markDynamic(egg)
      animated.push((t) => (egg.rotation.y = t * 0.35 + item.a))
      top = 2.4
    } else if (item.kind === 'pixel') {
      const egg = pixelEgg()
      egg.group.position.set(x, y + 0.02, z)
      group.add(egg.group)
      markDynamic(egg.group)
      animated.push((t) => {
        egg.group.rotation.y = t * 0.35 + item.a
        egg.update(t)
      })
      // A cyan glow behind it, and bubbles drifting up off the band's end.
      const haze = glow('#3fd8ff', 3.4, 0.45)
      haze.position.set(x, y + 1.05, z)
      const bubbles = particles({ mode: 'bubble', count: 8, shape: 'bubble', color: '#e8fbff', size: 0.5, radius: 2.2, height: 3.6, speed: 0.07, additive: false, seed: 22 })
      bubbles.position.set(x, y, z)
      group.add(haze, bubbles)
      top = 2.4
    }
    // The coin price, then any extra rows (the bee's name and boost).
    const price = item.pet ? EGG_HATCH.pets[item.pet] : EGG_HATCH.prices[item.egg]
    const last = item.label.length - 1
    const rows = [
      { text: formatNum(price), color: '#ffffff', px: 56, icon: 'coin' },
      ...item.label.map((text, i) => ({ text, color: '#ffffff', px: 44, icon: i === last && i > 0 ? 'coin' : undefined })),
    ]
    label(group, rows, rows.length * 0.5, x, y + top + 0.6, z)
  }
}

// Shop stall: yellow SHOP counter, posts, a red-and-white striped dome awning with a red "Shop"
// banner, and the white-haired shopkeeper behind the counter; the SHOP pad in front.
function buildShop(group) {
  const [x, z] = onIsland(SHOP.r, SHOP.a)
  const g = new Group()
  g.position.set(x, BAND_H, z)
  g.rotation.y = faceCentre(x, z)
  const white = plastic('#f4f4f4')
  const counterFace = new MeshStandardMaterial({ map: shopCounterTexture(), ...MATERIAL_PBR.PLASTIC })
  const yellow = plastic('#ffd21a')
  const counter = new Mesh(new BoxGeometry(4.2, 1.5, 1.2), [yellow, yellow, yellow, yellow, counterFace, yellow])
  counter.position.set(0, 0.75, 0.9)
  counter.castShadow = true
  g.add(counter)
  g.add(mesh(new BoxGeometry(4.4, 0.16, 1.4), plastic('#e8283a'), 0, 1.58, 0.9))
  for (const side of [-1, 1]) g.add(mesh(new BoxGeometry(0.22, 3.4, 0.22), white, side * 1.9, 1.7, 0.5))
  const keeper = figure({ skin: '#f2c79a', shirt: '#2d6cff', pants: '#1f2a44', hair: '#f4f4f4', scale: 1.1 })
  keeper.position.set(0, 0, -0.2)
  g.add(keeper)
  const awningTex = toTexture(stripes(HUB_COLORS.awning, '#ffffff', 16), { repeat: [1, 1] })
  const dome = mesh(new SphereGeometry(2.6, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ map: awningTex, ...MATERIAL_PBR.PLASTIC }), 0, 3.3, 0.4)
  dome.scale.y = 0.55
  g.add(dome)
  const trim = mesh(new TorusGeometry(2.6, 0.18, 8, 40), plastic(HUB_COLORS.awning), 0, 3.3, 0.4)
  trim.rotation.x = Math.PI / 2
  g.add(trim)
  const banner = new Mesh(new PlaneGeometry(3.4, 1.1), new MeshBasicMaterial({ map: bannerTexture('Shop', '#e8283a', '#ffffff'), transparent: true }))
  banner.position.set(0, 4.5, 2.2)
  g.add(banner)
  group.add(g)
  addBox(x - 2.3, x + 2.3, 0, 4.6, z - 2.3, z + 2.3)

  pad(group, SHOP.pad.x, SHOP.pad.z, SHOP.pad.r, HUB_COLORS.padBlue)
}

// The stone egg (eggs.js) hovering over its glowing magenta stand, priced in coins.
function buildEgg(group, animated) {
  const { x, z } = EGG
  const stand = eggStand(1.25)
  stand.position.set(x, 0, z)
  group.add(stand)
  const egg = stoneEgg()
  egg.position.set(x, 0.62, z)
  egg.rotation.y = Math.atan2(SPAWN.x - x, SPAWN.z - z) - 0.5
  group.add(egg)
  markDynamic(egg)
  animated.push((t) => (egg.position.y = 0.62 + (Math.sin(t * 1.8) + 1) * 0.06))
  addBox(x - 1.3, x + 1.3, 0, 3.1, z - 1.3, z + 1.3)
  label(group, [{ text: formatNum(EGG_HATCH.prices.stone), gradient: GOLD, px: 96, icon: 'coin' }], 0.95, x, 3.55, z)
}

// The area eggs on the south-east deck: a spotted egg in its area's colours bobbing over a small
// magenta stand, its name and coin price above.
function buildEggRow(group, animated) {
  for (const spot of EGG_ROW) {
    const { x, z } = spot
    const info = petIndex.eggs[spot.egg]
    const face = Math.atan2(SPAWN.x - x, SPAWN.z - z)
    const stand = eggStand(0.85)
    stand.scale.y = 0.8
    stand.position.set(x, 0, z)
    group.add(stand)
    const egg = spottedEgg(info.colors)
    egg.scale.setScalar(1.35)
    egg.position.set(x, 0.5, z)
    group.add(egg)
    markDynamic(egg)
    animated.push((t) => {
      egg.position.y = 0.5 + (Math.sin(t * 1.8 + x) + 1) * 0.06
      egg.rotation.y = face + Math.sin(t * 0.8 + z) * 0.35
    })
    addBox(x - 0.9, x + 0.9, 0, 2.4, z - 0.9, z + 0.9)
    label(group, [
      { text: info.name, color: '#ffffff', px: 48 },
      { text: formatNum(EGG_HATCH.prices[spot.egg]), gradient: GOLD, px: 64, icon: 'coin' },
    ], 1.1, x, 3.1, z)
  }
}

// Mutate pad on the deck, with the Mutate machine just behind it: a white winged vase with gold
// rings and a gold crown ring, on a short plinth.
function buildMutate(group) {
  pad(group, MUTATE.pad.x, MUTATE.pad.z, MUTATE.pad.r, HUB_COLORS.padPurple)
  label(group, [{ text: 'Mutate', color: '#ffd23a', px: 72, stroke: '#2a0a3a' }], 1.5, MUTATE.pad.x, 1.3, MUTATE.pad.z)

  const { x, z, scale } = MUTATE.machine
  const g = new Group()
  g.position.set(x, 0, z)
  g.rotation.y = Math.atan2(SPAWN.x - x, SPAWN.z - z)
  g.scale.setScalar(scale)
  const white = plastic(HUB_COLORS.donateWhite, { roughness: 0.3 })
  const gold = neon(HUB_COLORS.pedestalGold, 0.4)
  g.add(mesh(new CylinderGeometry(0.7, 0.8, 0.3, 24), white, 0, 0.15, 0))
  g.add(mesh(new CylinderGeometry(0.35, 0.55, 0.5, 24), white, 0, 0.55, 0))
  const belly = mesh(new SphereGeometry(0.62, 24, 18), white, 0, 1.3, 0)
  belly.scale.y = 1.25
  g.add(belly)
  for (const y of [0.85, 1.75]) {
    const band = mesh(new TorusGeometry(y > 1 ? 0.5 : 0.48, 0.07, 8, 32), gold, 0, y, 0)
    band.rotation.x = Math.PI / 2
    g.add(band)
  }
  g.add(mesh(new CylinderGeometry(0.4, 0.3, 0.45, 24), white, 0, 2.1, 0))
  const crown = mesh(new TorusGeometry(0.48, 0.14, 10, 32), gold, 0, 2.4, 0)
  crown.rotation.x = Math.PI / 2
  g.add(crown)
  // Swept wings either side.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const feather = mesh(new BoxGeometry(0.16, 0.9 - i * 0.18, 0.08), i === 0 ? gold : white, side * (0.7 + i * 0.16), 1.45 + i * 0.12, -0.05)
      feather.rotation.z = -side * (0.35 + i * 0.2)
      g.add(feather)
    }
  }
  group.add(g)
  addBox(x - 0.9 * scale, x + 0.9 * scale, 0, 2.6 * scale, z - 0.9 * scale, z + 0.9 * scale)
}

// Teleport portal on the portal isle: an oval swirling disc in a thick lavender-white frame on a
// red cog base, facing the spawn.
function buildPortal(group, animated) {
  const { x, z, r, y } = PORTAL
  const g = new Group()
  g.position.set(x, y, z)
  g.rotation.y = Math.atan2(SPAWN.x - x, SPAWN.z - z)
  const red = plastic('#e0283a')
  const cog = mesh(new CylinderGeometry(r * 0.75, r * 0.75, 0.5, 12), red, 0, 0.25, 0)
  g.add(cog)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.add(mesh(new BoxGeometry(0.35, 0.5, 0.35), red, Math.cos(a) * r * 0.8, 0.25, Math.sin(a) * r * 0.8))
  }
  const oval = new Group() // squashed horizontally into an upright oval
  oval.position.y = 0.5 + r * 1.15
  oval.scale.set(0.78, 1.15, 1)
  oval.add(mesh(new TorusGeometry(r, 0.42, 16, 48), plastic('#ece6ff', { roughness: 0.35 })))
  oval.add(mesh(new TorusGeometry(r - 0.32, 0.1, 8, 48), neon('#b06bff', 0.8), 0, 0, 0.12))
  const swirl = new Mesh(
    new CylinderGeometry(r - 0.25, r - 0.25, 0.08, 48),
    new MeshStandardMaterial({ map: portalTexture(), emissiveMap: portalTexture(), emissive: '#ffffff', emissiveIntensity: 0.8, ...MATERIAL_PBR.NEON }),
  )
  swirl.rotation.x = Math.PI / 2 // disc faces +Z
  const spinner = new Group()
  spinner.add(swirl)
  oval.add(spinner)
  g.add(oval)
  group.add(g)
  markDynamic(spinner)
  animated.push((t) => (spinner.rotation.z = -t * 1.5))
  addBox(x - r, x + r, y, y + 0.5 + 2.4 * r, z - 0.6, z + 0.6)
  label(group, [{ text: 'Teleport', color: '#ffffff', px: 72, stroke: '#3a1a6a' }], 0.9, x, y + 0.5 + 2.3 * r + 0.9, z)
}

// The Coach (coachFigure.js: blocky figure with pivots, cap, whistle, clipboard) on its pad, animated
// by coach.js, so it is kept out of the static merge. Returns the rig.
function buildCoach(group) {
  pad(group, COACH.x, COACH.z, COACH.r, HUB_COLORS.padBlue)
  const rig = coachFigure('coach')
  const { root } = rig
  root.position.set(COACH.x, 0.1, COACH.z)
  root.rotation.y = faceCentre(COACH.x, COACH.z) + 0.6
  root.scale.setScalar(COACH.scale)
  group.add(root)
  markDynamic(root)
  addBox(COACH.x - 0.7, COACH.x + 0.7, 0, 2 * COACH.scale, COACH.z - 0.7, COACH.z + 0.7)
  label(group, [{ text: 'Coach', color: '#5ff0ff', px: 64 }], 0.9, COACH.x, 2 * COACH.scale + 1.1, COACH.z)
  return { ...rig, baseYaw: root.rotation.y, height: 2 * COACH.scale }
}

// Orange SPIN pad on the deck with the prize wheel standing on its back half, facing the spawn
// (reference shot): a black A-frame stand, the wheel's face (six gradient wedges in a gold rim,
// painted by spinWheel.js with the Spin window's painter, so `face` is the material it paints
// into), a dark edge and a pink hub knob, a red pointer on top, and the floating SPIN label
// across the wheel's foot. The wheel turns with the Spin window's (spinWheel.js), so it is kept
// out of the static merge. Returns { root, wheel, face, height }.
function buildSpin(group) {
  const { pad: p, wheel: w } = SPIN
  pad(group, p.x, p.z, p.r, '#ff9a1a')
  const out = Math.hypot(p.x - ISLAND.x, p.z - ISLAND.z)
  const x = p.x + ((p.x - ISLAND.x) / out) * w.back
  const z = p.z + ((p.z - ISLAND.z) / out) * w.back
  const g = new Group()
  g.position.set(x, 0, z)
  g.rotation.y = Math.atan2(SPAWN.x - x, SPAWN.z - z)
  const R = w.radius
  const cy = w.lift + R // hub height
  const black = plastic('#16161a')
  // A-frame: two splayed legs from behind the hub to the pad, a crossbar and a back brace.
  for (const side of [-1, 1]) {
    const leg = mesh(new BoxGeometry(0.32, Math.hypot(R * 0.62, cy) + 0.2, 0.28), black, side * R * 0.31, cy / 2, -0.32)
    leg.rotation.z = side * Math.atan2(R * 0.62, cy)
    g.add(leg)
    g.add(mesh(new BoxGeometry(0.6, 0.16, 0.7), black, side * R * 0.62, 0.08, -0.32))
  }
  g.add(mesh(new BoxGeometry(R * 0.75, 0.2, 0.22), black, 0, cy * 0.38, -0.32))
  const brace = mesh(new BoxGeometry(0.22, cy + 0.2, 0.22), black, 0, cy / 2, -0.75)
  brace.rotation.x = -0.25
  g.add(brace)
  // The turning wheel: dark edge, the painted face, a pink hub knob.
  const face = new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, ...MATERIAL_PBR.PLASTIC })
  const hub = new Group()
  hub.position.set(0, cy, 0)
  const edge = mesh(new CylinderGeometry(R, R, 0.26, 64), black)
  edge.rotation.x = Math.PI / 2
  hub.add(edge)
  const disc = mesh(new CircleGeometry(R * 0.995, 64), face, 0, 0, 0.135)
  disc.castShadow = false
  hub.add(disc)
  const knob = mesh(new SphereGeometry(R * 0.085, 16, 10), neon('#ff7a9a', 0.35), 0, 0, 0.15)
  knob.scale.z = 0.6
  hub.add(knob)
  g.add(hub)
  // Pointer: a red wedge over the rim at the top, pointing down at the wedges.
  const tri = new Shape([new Vector2(-0.3, 0.32), new Vector2(0.3, 0.32), new Vector2(0, -0.34)])
  const pointer = mesh(new ExtrudeGeometry(tri, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }), neon('#ff2b3b', 0.35), 0, cy + R - 0.08, 0.16)
  g.add(pointer)
  group.add(g)
  markDynamic(hub)
  addBox(x - 1, x + 1, 0, cy + R + 0.4, z - 1, z + 1)
  // SPIN label across the wheel's foot, a little in front of it.
  const ahead = 0.6
  const fx = x + Math.sin(g.rotation.y) * ahead
  const fz = z + Math.cos(g.rotation.y) * ahead
  label(group, [{ text: 'SPIN', color: '#ffe7a0', stroke: '#2a1800', px: 64 }], R * 0.62, fx, w.lift + R * 0.12, fz)
  return { root: g, wheel: hub, face, height: cy + R + 0.3 }
}

// Lunar New Year gate at the east end of the arm, facing in (lunarGate.js builds it), with its
// sign floating in front at the height of the lantern tassels like the reference: the title in
// rainbow letters over the countdown.
function buildLanterns(group, animated) {
  const { x, z, size: s } = LANTERNS
  const gate = lunarGate(s)
  const g = gate.group
  const yaw = faceCentre(x, z)
  g.position.set(x, 0, z)
  g.rotation.y = yaw
  group.add(g)
  animated.push(gate.update)
  // Local (lx, lz) -> world.
  const at = (lx, lz) => [x + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z - Math.sin(yaw) * lx + Math.cos(yaw) * lz]
  addSegmentCollider(...at(-s * 0.24, -0.4), ...at(s * 0.24, -0.4), 0, 7, 1.9)
  // The sign counts down to LUNAR_EVENT.start; the title row is the widest, so swapping in a new
  // texture each second never changes the sprite's size.
  const rows = (line) => [
    { text: 'Lunar New Year', gradient: ['#2f6bff', '#9b3bff', '#ff3b8a', '#ff8a1a', '#ffd21a', '#4fe03a', '#2fe0d0'], px: 72 },
    { text: line, color: '#ffffff', px: 40 },
  ]
  const height = s * 0.29
  const [sx, sz] = at(0, 2.9)
  let line = lunarCountdown()
  const sign = label(group, rows(line), height, sx, s * 0.445, sz)
  animated.push(() => {
    const next = lunarCountdown()
    if (next === line) return
    line = next
    const fresh = labelSprite(rows(line), height)
    sign.material.map.dispose()
    sign.material.map = fresh.material.map
    fresh.material.dispose()
  })
}

const LUNAR_START = new Date(LUNAR_EVENT.start).getTime()
// "Starts in 1d 23:59:59" (days only while a day or more is left), then "Event is live!".
function lunarCountdown() {
  const s = Math.ceil((LUNAR_START - Date.now()) / 1000)
  if (s <= 0) return 'Event is live!'
  const pad = (n) => String(n).padStart(2, '0')
  const d = Math.floor(s / 86400)
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  return `Starts in ${d ? `${d}d ` : ''}${hms}`
}

// Big icon crowning a leaderboard: gold coin, gold trophy cup (wins) or cyan alarm clock.
function boardIcon(kind) {
  const g = new Group()
  if (kind === 'coin') {
    g.add(mesh(new CylinderGeometry(2.4, 2.4, 0.5, 8), neon('#ffc21a', 0.35)))
    g.add(mesh(new CylinderGeometry(1.7, 1.7, 0.56, 8), neon('#ffe9a0', 0.35)))
    g.rotation.x = Math.PI / 2 - 0.45
  } else if (kind === 'trophy') {
    const gold = neon('#ffc21a', 0.35)
    g.add(mesh(new CylinderGeometry(1.9, 0.9, 2.2, 24), gold, 0, 0.9, 0)) // cup
    g.add(mesh(new CylinderGeometry(1.95, 1.95, 0.25, 24), neon('#ffe9a0', 0.4), 0, 2.05, 0)) // lip
    for (const side of [-1, 1]) {
      const handle = mesh(new TorusGeometry(0.65, 0.2, 8, 20, Math.PI), gold, side * 1.55, 1.1, 0)
      handle.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2
      g.add(handle)
    }
    g.add(mesh(new CylinderGeometry(0.3, 0.45, 1, 12), gold, 0, -0.7, 0)) // stem
    g.add(mesh(new BoxGeometry(2.2, 0.5, 1.2), neon('#3dff6a', 0.35), 0, -1.4, 0)) // base
  } else {
    const face = mesh(new CylinderGeometry(1.6, 1.6, 0.4, 32), plastic('#ffffff'))
    face.rotation.x = Math.PI / 2
    g.add(face)
    g.add(mesh(new TorusGeometry(1.7, 0.35, 10, 40), neon('#3fd2ff', 0.45)))
    for (const side of [-1, 1]) {
      const bell = mesh(new SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), neon('#3fd2ff', 0.45), side * 1.2, 1.55, 0)
      bell.rotation.z = -side * 0.6
      g.add(bell)
    }
    const hand = (len, ang) => {
      const h = mesh(new BoxGeometry(0.12, len, 0.1), plastic('#1a1a1a'), Math.sin(ang) * len * 0.5, Math.cos(ang) * len * 0.5, 0.25)
      h.rotation.z = -ang
      return h
    }
    g.add(hand(1.1, 0), hand(0.8, 2.1))
  }
  return g
}

// Three TOP 100 boards on the south-east rim, leaning back and facing in, each crowned by its icon.
// Returns { [stat]: board } (signs.js leaderboardTexture: `set(rows, you)` repaints its face).
function buildLeaderboards(group) {
  const frame = plastic(HUB_COLORS.wallFrame)
  const boards = {}
  for (const b of LEADERBOARDS) {
    const [x, z] = onIsland(b.r, b.a)
    const g = new Group()
    g.position.set(x, 0, z)
    g.rotation.y = faceCentre(x, z)
    const board = new Group()
    board.rotation.x = -b.tilt // lean back, away from the centre
    const lb = leaderboardTexture(b.title, b.color)
    boards[b.stat] = lb
    const tex = lb.tex
    const face = new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.35, ...MATERIAL_PBR.PLASTIC })
    const screen = new Mesh(new BoxGeometry(b.w, b.h, 0.3), [frame, frame, frame, frame, face, frame])
    screen.position.y = b.h / 2 + 0.3
    screen.castShadow = true
    board.add(screen)
    const t = 0.4
    board.add(mesh(new BoxGeometry(b.w + t, t, 0.6), frame, 0, b.h + 0.3, 0))
    board.add(mesh(new BoxGeometry(b.w + t, t, 0.6), frame, 0, 0.3, 0))
    for (const side of [-1, 1]) board.add(mesh(new BoxGeometry(t, b.h, 0.6), frame, (side * b.w) / 2, b.h / 2 + 0.3, 0))
    const icon = boardIcon(b.icon)
    icon.position.set(0, b.h + 2.6, -0.4)
    board.add(icon)
    g.add(board)
    group.add(g)
    const half = b.w / 2
    const ux = Math.cos(g.rotation.y)
    const uz = -Math.sin(g.rotation.y)
    addSegmentCollider(x - ux * half, z - uz * half, x + ux * half, z + uz * half, 0, b.h, 0.45)
  }
  return boards
}

// Golden Dragon Kayak (dragonKayak.js) resting keel down on the magenta pad like the reference:
// side-on to the deck, the dragon's head rearing up at the bow (pointing north, turned a little
// toward the island), rocking gently, gold motes twinkling round it. Its label floats over the
// head: price, name (purple into red), OP! sticker with ⚡ speed.
function buildDragonKayak(group, animated) {
  const { x, z, height: H } = DRAGON_KAYAK
  const model = dragonKayak()
  const box = new Box3().setFromObject(model)
  const s = H / box.max.y
  model.scale.setScalar(s)
  const half = Math.max(-box.min.z, box.max.z) * s // bow / stern reach from the middle
  const g = new Group()
  g.add(model)
  const motes = particles({ mode: 'twinkle', shape: 'spark', count: 18, color: '#fff2a0', color2: '#ffc21a', size: 0.35, radius: half * 0.7, height: H, seed: 17 })
  g.add(motes)
  const aura = glow('#ffd21a', half * 1.6, 0.3)
  aura.position.y = H * 0.3
  g.add(aura)
  g.position.set(x, 0.12, z)
  g.rotation.y = faceCentre(x, z) - Math.PI / 2 + 0.5
  group.add(g)
  markDynamic(model)
  animated.push((t) => {
    model.position.y = 0.08 + Math.sin(t * 1.4) * 0.08
    model.rotation.x = Math.sin(t * 1.1) * 0.04 // pitching bow to stern
    model.rotation.z = Math.sin(t * 0.8) * 0.03
  })
  const r = half * 0.75
  addBox(x - r, x + r, 0, H, z - r, z + r)
  label(
    group,
    [
      { text: formatNum(DRAGON_KAYAK.price), gradient: GOLD, px: 56, icon: 'coin' },
      { text: 'Golden Dragon Kayak', gradient: ['#a53bff', '#ff2fa8', '#ff3a2a'], px: 52 },
      { text: formatNum(DRAGON_KAYAK.speed), color: '#ffffff', px: 64, icon: 'bolt', tag: 'OP!' },
    ],
    H * 0.62,
    x,
    H * 1.3,
    z,
  )
}

export function createIslandFixtures() {
  const group = new Group()
  const animated = []
  buildPedestals(group, animated)
  buildBandItems(group, animated)
  buildShop(group)
  buildEgg(group, animated)
  buildEggRow(group, animated)
  buildMutate(group)
  buildPortal(group, animated)
  const coach = buildCoach(group)
  const spin = buildSpin(group)
  buildLanterns(group, animated)
  pad(group, MAGENTA_PAD.x, MAGENTA_PAD.z, MAGENTA_PAD.r, '#ff2bd6')
  const boards = buildLeaderboards(group)
  buildDragonKayak(group, animated)
  let t = 0
  return {
    group,
    coach, // the Coach's rig, animated by coach.js
    spin, // the prize wheel, turned by spinWheel.js
    boards, // the TOP 100 leaderboards by stat, filled by main.js from net.js
    update(dt) {
      t += dt
      updateParticles(dt)
      for (const fn of animated) fn(t)
    },
  }
}
