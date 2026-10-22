// Blocky Roblox-style coach figures, feet at the origin facing +Z, with pivots at the hips, waist,
// shoulders and neck so coach.js can animate them. `coachFigure('coach')` is the Coach standing on
// the deck (tracksuit, cap, whistle, clipboard); every other look is a roster coach (config
// COACH_TRAINING.coaches, same ids), rendered into the Coach window's portraits (coachPortraits.js);
// `player` is the dancer in the Kayak Shop's emote pictures.
// A look is base colours (shirt/sleeves null = bare skin) plus a list of `add` parts from PARTS.
import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, TorusGeometry } from 'three'
import { plastic } from './materials.js'

const chrome = new MeshStandardMaterial({ color: '#dfe6ee', metalness: 0.9, roughness: 0.22 })
const gold = new MeshStandardMaterial({ color: '#ffc83a', metalness: 0.8, roughness: 0.3 })
const glass = (c) => new MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.1 })
const glow = (c) => new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 })
const shade = (c, k) => `#${new Color(c).multiplyScalar(k).getHexString()}`

function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new Mesh(new BoxGeometry(w, h, d), typeof material === 'string' ? plastic(material) : material)
  m.position.set(x, y, z)
  m.castShadow = m.receiveShadow = true
  parent.add(m)
  return m
}
function pivot(parent, x, y, z) {
  const p = new Group()
  p.position.set(x, y, z)
  parent.add(p)
  return p
}

// Parts. The head pivot is at the neck (head box y 0..0.42, face at z 0.21); the torso pivot at the
// waist (y 0..0.7, front at z d/2); arms hang from the shoulder (hand at y -0.67).
const PARTS = {
  // --- hair and hats
  hair: (r, c) => box(r.head, 0.46, 0.12, 0.46, c, 0, 0.41, -0.02),
  longHair(r, c) {
    PARTS.hair(r, c)
    box(r.head, 0.46, 0.5, 0.08, c, 0, 0.2, -0.21)
    for (const s of [-1, 1]) box(r.head, 0.05, 0.36, 0.34, c, s * 0.225, 0.26, -0.04)
  },
  quiff(r, c) {
    box(r.head, 0.46, 0.16, 0.38, c, 0, 0.47, -0.03)
    box(r.head, 0.44, 0.12, 0.14, c, 0, 0.5, 0.18).rotation.x = -0.25
  },
  spiky(r, c) {
    PARTS.hair(r, c)
    for (const [x, z, a] of [[-0.14, 0.1, 0.4], [0, 0.12, 0], [0.14, 0.1, -0.4], [-0.1, -0.1, 0.3], [0.1, -0.1, -0.3]]) box(r.head, 0.1, 0.2, 0.1, c, x, 0.52, z).rotation.z = a
  },
  dreads(r, c) {
    PARTS.hair(r, c)
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      if (Math.cos(a) > 0.75) continue // keep the face clear
      box(r.head, 0.07, 0.3, 0.07, c, Math.sin(a) * 0.23, 0.32, Math.cos(a) * 0.23)
    }
  },
  cap(r, c) {
    box(r.head, 0.47, 0.12, 0.47, c, 0, 0.5, -0.01)
    box(r.head, 0.42, 0.03, 0.22, c, 0, 0.45, 0.31)
  },
  swimcap: (r, c) => box(r.head, 0.47, 0.2, 0.47, c, 0, 0.44, -0.01),
  beanie(r, c) {
    box(r.head, 0.47, 0.2, 0.47, c, 0, 0.47, -0.01)
    box(r.head, 0.48, 0.07, 0.48, shade(c, 0.8), 0, 0.37, -0.01)
  },
  santa(r) {
    box(r.head, 0.49, 0.09, 0.49, '#ffffff', 0, 0.44, 0)
    box(r.head, 0.44, 0.16, 0.44, '#d42a2a', 0, 0.56, -0.01)
    box(r.head, 0.3, 0.14, 0.3, '#d42a2a', 0.04, 0.69, -0.03)
    box(r.head, 0.17, 0.12, 0.17, '#d42a2a', 0.12, 0.79, -0.05)
    box(r.head, 0.12, 0.12, 0.12, '#ffffff', 0.2, 0.86, -0.06)
  },
  cowboy(r, c) {
    box(r.head, 0.8, 0.04, 0.72, c, 0, 0.45, 0)
    box(r.head, 0.44, 0.22, 0.42, c, 0, 0.57, -0.01)
    box(r.head, 0.45, 0.05, 0.43, '#3a2410', 0, 0.49, -0.01)
  },
  witch(r) {
    box(r.head, 0.82, 0.04, 0.82, '#16161c', 0, 0.48, 0)
    box(r.head, 0.42, 0.05, 0.42, '#ff7a1a', 0, 0.52, 0)
    for (const [s, y, x] of [[0.4, 0.6, 0], [0.3, 0.72, 0.03], [0.2, 0.84, 0.07], [0.11, 0.95, 0.12]]) box(r.head, s, 0.13, s, '#16161c', x, y, -0.02)
  },
  headband: (r, c) => box(r.head, 0.44, 0.07, 0.44, c, 0, 0.34, 0),
  // --- faces
  shades(r, lens) {
    box(r.head, 0.44, 0.08, 0.02, '#111', 0, 0.27, 0.215)
    for (const s of [-1, 1]) box(r.head, 0.15, 0.09, 0.02, glass(lens), s * 0.1, 0.27, 0.225)
  },
  goggles(r, y = 0.36) {
    box(r.head, 0.48, 0.05, 0.48, '#111', 0, y, 0)
    for (const s of [-1, 1]) box(r.head, 0.13, 0.1, 0.03, glass('#7ae0ff'), s * 0.1, y, 0.235)
  },
  mask(r, c) {
    box(r.head, 0.44, 0.18, 0.05, c, 0, 0.11, 0.22)
    box(r.head, 0.06, 0.24, 0.04, c, 0.12, 0.42, 0.21) // snorkel
  },
  glowEyes(r, c) {
    for (const s of [-1, 1]) box(r.head, 0.1, 0.05, 0.02, glow(c), s * 0.09, 0.26, 0.215)
  },
  alienEyes(r, c) {
    for (const s of [-1, 1]) box(r.head, 0.15, 0.12, 0.03, c === '#111' ? glass(c) : glow(c), s * 0.1, 0.27, 0.222).rotation.z = s * -0.3
  },
  beard(r, c) {
    box(r.head, 0.44, 0.17, 0.08, c, 0, 0.06, 0.2)
    for (const s of [-1, 1]) box(r.head, 0.06, 0.2, 0.3, c, s * 0.2, 0.12, 0.06)
  },
  mustache: (r, c) => box(r.head, 0.2, 0.05, 0.03, c, 0, 0.17, 0.225),
  bigBeard(r, c) {
    box(r.head, 0.42, 0.5, 0.1, c, 0, -0.04, 0.21)
    for (const s of [-1, 1]) box(r.head, 0.06, 0.24, 0.3, c, s * 0.2, 0.12, 0.06)
    PARTS.mustache(r, shade(c, 0.85))
  },
  snout(r, c) {
    box(r.head, 0.3, 0.18, 0.22, c, 0, 0.11, 0.3)
    for (const s of [-1, 1]) box(r.head, 0.04, 0.03, 0.01, '#111', s * 0.07, 0.17, 0.412)
  },
  teeth(r) {
    for (let i = 0; i < 5; i++) box(r.head, 0.035, 0.05, 0.02, '#fff8e8', -0.1 + i * 0.05, 0.03, 0.4)
  },
  crest(r, c) {
    for (let i = 0; i < 4; i++) box(r.head, 0.05, 0.14, 0.14, c, 0, 0.45 + (i % 2) * 0.02, 0.15 - i * 0.12).rotation.x = 0.785
    for (let i = 0; i < 3; i++) box(r.torso, 0.05, 0.14, 0.14, c, 0, 0.6 - i * 0.2, -r.d / 2 - 0.02).rotation.x = 0.785
  },
  pumpkin(r) {
    box(r.head, 0.54, 0.5, 0.54, '#ff7a1a', 0, 0.23, 0)
    for (const x of [-0.16, 0, 0.16]) box(r.head, 0.02, 0.5, 0.55, '#e05a10', x, 0.23, 0)
    box(r.head, 0.06, 0.1, 0.06, '#3a7a2a', 0, 0.52, 0)
    for (const s of [-1, 1]) box(r.head, 0.1, 0.1, 0.02, glow('#ffd23a'), s * 0.11, 0.3, 0.272).rotation.z = 0.785
    box(r.head, 0.28, 0.06, 0.02, glow('#ffd23a'), 0, 0.12, 0.272)
  },
  // --- body
  band: (r, c) => box(r.torso, r.w + 0.01, 0.08, r.d + 0.01, c, 0, 0.5, 0),
  logo: (r, c) => box(r.torso, r.w * 0.5, 0.2, 0.01, c, 0, 0.4, r.d / 2 + 0.006),
  stripe(r, c) {
    for (const z of [1, -1]) box(r.torso, r.w * 1.05, 0.1, 0.01, c, 0, 0.38, z * (r.d / 2 + 0.006)).rotation.z = 0.55 * z
  },
  number(r, c) {
    box(r.torso, 0.18, 0.05, 0.01, c, 0, 0.55, r.d / 2 + 0.006)
    box(r.torso, 0.05, 0.28, 0.01, c, 0.04, 0.4, r.d / 2 + 0.006).rotation.z = -0.35
  },
  abs(r) {
    const c = shade(r.look.skin, 0.82)
    const z = r.d / 2 + 0.005
    box(r.torso, r.w * 0.7, 0.03, 0.01, c, 0, 0.47, z)
    box(r.torso, 0.025, 0.36, 0.01, c, 0, 0.22, z)
    for (const y of [0.3, 0.17]) box(r.torso, 0.26, 0.022, 0.01, c, 0, y, z)
  },
  tattoo(r, c) {
    const z = r.d / 2 + 0.005
    for (const [x, y, a] of [[-0.15, 0.45, 0.5], [0.15, 0.45, -0.5], [0, 0.32, 0], [-0.1, 0.2, -0.3], [0.1, 0.2, 0.3]]) box(r.torso, 0.16, 0.06, 0.01, c, x, y, z).rotation.z = a
  },
  chain(r) {
    const chain = new Mesh(new TorusGeometry(0.28, 0.03, 6, 24), gold)
    chain.rotation.x = Math.PI / 2 - 0.5
    chain.position.set(0, 0.58, 0.08)
    r.torso.add(chain)
    box(r.torso, 0.12, 0.12, 0.03, gold, 0, 0.36, r.d / 2 + 0.03)
  },
  shirtFront: (r, c) => box(r.torso, 0.22, 0.5, 0.01, c, 0, 0.38, r.d / 2 + 0.006),
  tie(r, c) {
    box(r.torso, 0.08, 0.42, 0.015, c, 0, 0.36, r.d / 2 + 0.014)
    box(r.torso, 0.1, 0.07, 0.03, c, 0, 0.6, r.d / 2 + 0.018)
  },
  bowtie: (r) => box(r.torso, 0.2, 0.07, 0.03, '#0e0e10', 0, 0.6, r.d / 2 + 0.02),
  vest(r, c) {
    for (const s of [-1, 1]) {
      box(r.torso, 0.16, 0.68, 0.012, c, s * (r.w / 2 - 0.08), 0.35, r.d / 2 + 0.008)
      box(r.torso, 0.012, 0.68, r.d + 0.02, c, s * (r.w / 2 + 0.006), 0.35, 0)
    }
    box(r.torso, r.w + 0.02, 0.68, 0.012, c, 0, 0.35, -r.d / 2 - 0.008)
  },
  bandana(r, c) {
    box(r.torso, r.w * 0.6, 0.1, r.d * 0.9, c, 0, 0.68, 0)
    box(r.torso, 0.18, 0.18, 0.02, c, 0, 0.57, r.d / 2 + 0.01).rotation.z = 0.785
  },
  belt(r, c, big = false) {
    box(r.torso, r.w + 0.02, big ? 0.16 : 0.1, r.d + 0.02, c, 0, 0.05, 0)
    box(r.torso, big ? 0.32 : 0.14, big ? 0.22 : 0.1, 0.03, gold, 0, 0.05, r.d / 2 + 0.02)
  },
  skirt: (r, c) => box(r.torso, r.w + 0.1, 0.45, r.d + 0.1, c, 0, -0.17, 0),
  buttons(r) {
    for (const [y, c] of [[0.55, '#e8343a'], [0.38, '#3ac85a'], [0.21, '#e8343a']]) box(r.torso, 0.08, 0.08, 0.03, c, 0, y, r.d / 2 + 0.015)
  },
  icing(r) {
    for (const limb of [r.armL, r.armR]) for (const y of [-0.45, -0.55]) box(limb, r.aw + 0.01, 0.025, r.ad + 0.01, '#ffffff', 0, y, 0)
    for (const leg of r.legs) for (const y of [-0.55, -0.62]) box(leg, 0.29, 0.025, 0.31, '#ffffff', 0, y, 0)
    box(r.head, 0.3, 0.025, 0.01, '#ffffff', 0, 0.08, 0.212)
  },
  wristbands(r, c) {
    for (const arm of [r.armL, r.armR]) box(arm, r.aw + 0.02, 0.1, r.ad + 0.02, c === 'gold' ? gold : c, 0, -0.55, 0)
  },
  gloves(r, c, big = false) {
    const g = big ? 0.16 : 0.04
    for (const arm of [r.armL, r.armR]) box(arm, r.aw + g, big ? 0.28 : 0.18, r.ad + g, c, 0, -0.66, big ? 0.03 : 0)
  },
  sack(r, c) {
    box(r.torso, 0.5, 0.55, 0.32, c, 0.06, 0.42, -r.d / 2 - 0.17).rotation.z = 0.15
    box(r.torso, 0.14, 0.08, 0.14, shade(c, 0.7), 0.1, 0.74, -r.d / 2 - 0.17)
  },
  wings(r, c) {
    const m = new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 })
    for (const s of [-1, 1]) {
      const wing = box(r.torso, 0.55, 0.75, 0.02, m, s * 0.32, 0.5, -r.d / 2 - 0.08)
      wing.rotation.set(0, s * 0.5, s * -0.35)
    }
  },
  bow(r) {
    const arc = new Mesh(new TorusGeometry(0.42, 0.025, 6, 24, Math.PI), plastic('#6a4ab8'))
    arc.position.set(0, 0.35, -r.d / 2 - 0.06)
    arc.rotation.z = Math.PI / 2 + 0.6
    r.torso.add(arc)
  },
  duckRing(r) {
    const ring = new Mesh(new TorusGeometry(0.5, 0.17, 12, 28), plastic('#ffd21a'))
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.05
    r.torso.add(ring)
    box(r.torso, 0.26, 0.26, 0.24, '#ffd21a', 0, 0.27, 0.58)
    box(r.torso, 0.16, 0.06, 0.12, '#ff8a1a', 0, 0.24, 0.75)
    for (const s of [-1, 1]) box(r.torso, 0.04, 0.05, 0.01, '#111', s * 0.07, 0.33, 0.705)
  },
  rind(r) {
    for (const leg of r.legs) box(leg, 0.29, 0.06, 0.31, '#2fbf4a', 0, -0.06, 0)
  },
  // --- the deck Coach's kit
  whistle(r) {
    const barrel = new Mesh(new CylinderGeometry(0.06, 0.06, 0.12, 16), chrome)
    barrel.position.set(0, -0.7, 0.16)
    barrel.rotation.z = Math.PI / 2
    r.armR.add(barrel)
    box(r.armR, 0.05, 0.04, 0.12, chrome, 0.02, -0.69, 0.25)
    const ring = new Mesh(new TorusGeometry(0.035, 0.012, 6, 14), chrome)
    ring.position.set(-0.08, -0.7, 0.12)
    r.armR.add(ring)
  },
  clipboard(r) {
    // In the left hand, tipped up so the Coach can read it.
    const board = new Group()
    board.position.set(0, -0.68, 0.2)
    board.rotation.x = 1.15
    box(board, 0.36, 0.46, 0.03, '#a8723e')
    box(board, 0.31, 0.38, 0.012, '#fbfbf4', 0, -0.02, 0.02)
    for (let i = 0; i < 4; i++) box(board, 0.22 - (i % 2) * 0.06, 0.018, 0.004, '#7d8aa8', -0.02, 0.08 - i * 0.07, 0.03)
    box(board, 0.14, 0.06, 0.05, chrome, 0, 0.21, 0.02)
    r.armL.add(board)
  },
}

const SKIN = '#f2c49a'
const LOOKS = {
  // The player in the Kayak Shop's emote pictures (petPortraits.js emote()): config CHARACTER_COLORS.
  player: { skin: '#f2c79a', shirt: '#d9822b', sleeves: '#d9822b', pants: '#3a3f4a', bulk: 1.2, add: [['hair', '#5a3a22'], ['shades', '#4a3a7a']] },
  coach: { skin: '#f3dcc8', shirt: '#2f6cff', pants: '#2f6cff', bulk: 1.45, add: [['hair', '#1a1a1a'], ['band', '#ffffff'], ['cap', '#2f6cff'], ['whistle'], ['clipboard']] },
  duck: { skin: '#f6c7a0', pants: '#2f8cff', bulk: 1.5, add: [['hair', '#e8c070'], ['shades', '#2a6aff'], ['duckRing']] },
  watermelon: { skin: '#f6c7a0', pants: '#e8343a', bulk: 1.5, add: [['swimcap', '#2a6aff'], ['goggles'], ['rind']] },
  energy: { skin: SKIN, shirt: '#1f3a8a', pants: '#222a44', bulk: 1.55, add: [['hair', '#141414'], ['logo', '#3ad0ff'], ['headband', '#e8343a'], ['wristbands', '#2a6aff']] },
  beard: { skin: '#e8b48a', shirt: '#1d1d22', sleeves: '#1d1d22', pants: '#2a2a32', bulk: 1.45, add: [['hair', '#5a3a22'], ['beard', '#5a3a22'], ['mustache', '#4a2e1a'], ['logo', '#c03030']] },
  handsome: { skin: '#f3d0b0', shirt: '#121214', sleeves: '#121214', pants: '#121214', bulk: 1.45, add: [['quiff', '#0e0e10'], ['shirtFront', '#ffffff'], ['bowtie']] },
  sped: { skin: '#7a4a2e', shirt: '#d42a2a', pants: '#2a2a32', bulk: 1.45, add: [['dreads', '#121212'], ['number', '#ffffff']] },
  tump: { skin: '#f0b48a', shirt: '#1c2238', sleeves: '#1c2238', pants: '#1c2238', bulk: 1.5, add: [['quiff', '#f0c040'], ['shirtFront', '#ffffff'], ['tie', '#c41e2a']] },
  purple: { skin: SKIN, pants: '#6a2ad8', bulk: 1.7, add: [['abs'], ['hair', '#6a4a2a'], ['shades', '#8a2ad8']] },
  shark: { skin: SKIN, shirt: '#18181c', pants: '#18181c', bulk: 1.6, add: [['stripe', '#e8e8e8'], ['hair', '#18181c'], ['goggles', 0.4]] },
  domineering: { skin: SKIN, pants: '#1a1a1a', bulk: 1.7, add: [['abs'], ['longHair', '#121212'], ['shades', '#111'], ['chain'], ['wristbands', 'gold']] },
  torrent: { skin: SKIN, shirt: '#34343a', sleeves: '#34343a', pants: '#26262c', bulk: 1.6, add: [['hair', '#111'], ['shades', '#111'], ['band', '#46464e']] },
  boxing: { skin: '#e8b090', pants: '#ffffff', bulk: 1.7, add: [['tattoo', '#3a3a3a'], ['longHair', '#3a2418'], ['headband', '#d42a2a'], ['gloves', '#d42a2a', true], ['belt', '#d42a2a']] },
  wrestling: { skin: '#9a5a3a', pants: '#2a4ad8', bulk: 1.8, add: [['abs'], ['spiky', '#111'], ['shades', '#ff7a1a'], ['belt', '#ffc83a', true]] },
  girl: { skin: '#f2c8a8', shirt: '#18181c', sleeves: '#ff7a1a', pants: '#18181c', bulk: 1.2, add: [['longHair', '#3a2418'], ['cap', '#9a9aa4'], ['stripe', '#ffffff']] },
  supreme: { skin: '#8a8a92', shirt: '#5a5a62', sleeves: '#6a6a72', pants: '#4a4a52', bulk: 1.6, add: [['crest', '#2a2a30'], ['glowEyes', '#e8f4ff'], ['gloves', '#3a3a40']] },
  temple: { skin: '#e8b48a', shirt: '#f4f4f0', sleeves: '#f4f4f0', pants: '#6a7a4a', bulk: 1.4, add: [['cowboy', '#c8a060'], ['bandana', '#ffc21a'], ['vest', '#5a3a22'], ['beard', '#7a5a3a'], ['mustache', '#6a4a2a']] },
  dancer: { skin: '#d8a07a', shirt: '#c8602a', pants: '#d8a07a', bulk: 1.15, add: [['longHair', '#1a1010'], ['skirt', '#c8602a']] },
  reef: { skin: '#c8906a', shirt: '#6a4a2a', sleeves: '#6a4a2a', pants: '#5a3a22', bulk: 1.4, add: [['beanie', '#3a2a1a'], ['bigBeard', '#1a1010'], ['belt', '#2a1a10']] },
  mountain: { skin: SKIN, pants: '#c8402a', bulk: 1.35, add: [['mask', '#3ac85a'], ['goggles', 0.3]] },
  choir: { skin: '#f2d8c8', shirt: '#3a5a9a', sleeves: '#3a5a9a', pants: '#3a5a9a', bulk: 1.3, add: [['longHair', '#a8e8b0'], ['santa'], ['skirt', '#3a5a9a']] },
  bristle: { skin: '#f0c8a8', shirt: '#c41e2a', sleeves: '#c41e2a', pants: '#c41e2a', bulk: 1.5, add: [['santa'], ['bigBeard', '#5a3a22'], ['belt', '#111'], ['gloves', '#2a8a3a']] },
  holly: { skin: '#f2c8a8', shirt: '#c41e2a', sleeves: '#c41e2a', pants: '#2a6a3a', bulk: 1.3, add: [['longHair', '#d84a2a'], ['santa'], ['sack', '#8a5a2a'], ['gloves', '#2a8a3a']] },
  cookie: { skin: '#b0683a', shirt: '#b0683a', sleeves: '#b0683a', pants: '#b0683a', bulk: 1.5, add: [['icing'], ['buttons'], ['belt', '#3a2a1a']] },
  spaceman: { skin: '#f2c8a8', pants: '#111', bulk: 1.4, add: [['longHair', '#111'], ['bandana', '#2a3ad8'], ['bow']] },
  zoidreg: { skin: '#3a4ad8', pants: '#c42a2a', bulk: 1.6, add: [['alienEyes', '#e82a2a']] },
  martian: { skin: '#d42a2a', shirt: '#d42a2a', sleeves: '#d42a2a', pants: '#8a1a1a', bulk: 1.5, add: [['alienEyes', '#111'], ['bigBeard', '#1a1a1a']] },
  dino: { skin: '#6a8a3a', pants: '#e86a8a', bulk: 1.8, add: [['abs'], ['snout', '#6a8a3a'], ['crest', '#c43a2a']] },
  rodzilla: { skin: '#2a4a2a', shirt: '#2a4a2a', sleeves: '#2a4a2a', pants: '#2a4a2a', bulk: 1.7, add: [['snout', '#2a4a2a'], ['teeth'], ['crest', '#1a2a1a']] },
  pixie: { skin: '#f2c8a8', shirt: '#c8302a', sleeves: '#ff9a2a', pants: '#c8302a', bulk: 1.3, add: [['beanie', '#ffc23a'], ['bandana', '#ffd23a'], ['wings', '#ffa82a']] },
  devil: { skin: '#1a1a1a', shirt: '#18181c', sleeves: '#18181c', pants: '#18181c', bulk: 1.8, add: [['pumpkin'], ['witch'], ['gloves', '#ff7a1a']] },
}

export function coachFigure(lookId = 'coach') {
  const look = LOOKS[lookId] ?? LOOKS.coach
  const { bulk } = look
  const root = new Group()
  const legs = [-1, 1].map((side) => {
    const hip = pivot(root, side * 0.16, 0.75, 0)
    box(hip, 0.28, 0.75, 0.3, look.pants, 0, -0.375, 0)
    return hip
  })
  const w = 0.62 * bulk
  const d = 0.34 * bulk
  const torso = pivot(root, 0, 0.75, 0)
  box(torso, w, 0.7, d, look.shirt ?? look.skin, 0, 0.35, 0)
  if (!look.shirt) box(torso, w + 0.01, 0.12, d + 0.01, look.pants, 0, 0.06, 0) // waistband of the trunks
  const aw = 0.26 * bulk
  const ad = 0.3 * bulk
  // Arms: [left (+X), right (-X)] as the figure faces +Z.
  const arms = [1, -1].map((side) => {
    const shoulder = pivot(torso, side * (w / 2 + 0.14), 0.67, 0)
    box(shoulder, aw, 0.7, ad, look.sleeves ?? look.skin, 0, -0.32, 0)
    if (look.sleeves) box(shoulder, aw - 0.02, 0.1, ad - 0.02, look.skin, 0, -0.7, 0) // hand
    return shoulder
  })
  const head = pivot(torso, 0, 0.7, 0)
  box(head, 0.42, 0.42, 0.42, look.skin, 0, 0.21, 0)
  for (const side of [-1, 1]) box(head, 0.06, 0.08, 0.01, '#16161c', side * 0.09, 0.26, 0.211)
  box(head, 0.14, 0.03, 0.01, '#16161c', 0, 0.13, 0.211)
  const rig = { root, torso, head, armL: arms[0], armR: arms[1], legL: legs[1], legR: legs[0], legs, w, d, aw, ad, look }
  for (const [part, ...args] of look.add ?? []) PARTS[part](rig, ...args)
  return rig
}
