// Showcase pets for the pedestal pods and the band (from the reference shot): Celestial Dragon
// (white and gold, feathered wings raised, one paw lifted), Hydra (three green heads with gold
// crests, gold belt and red chest gem), Phoenix (flame-feathered, wings spread), Griffin (white
// eagle head, tawny lion body, brown wings) and the Stinging Bee (brown dotted wings).
// `createPet(species)` returns { group, update(t) }: feet at the origin, facing +Z, about 1 unit
// tall before scaling. Static parts are baked to one mesh per material; only the wings move.
import { Group, TorusGeometry, Vector3 } from 'three'
import { markDynamic } from './batch.js'
import { neon, plastic } from './materials.js'
import { GEM, SPHERE_LO, bake, ball, blade, spike, tube, v3 } from './sculpt.js'
import { particles } from './particles.js'

const TORUS = new TorusGeometry(1, 0.12, 8, 32)
// Pets sit in dark pods, so even the plain parts carry a little self-light.
const mat = (color, glow = 0.14) => neon(color, glow)

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mx = (p, s) => [p[0] * s, p[1], p[2]] // mirror across the body's midline

// Cartoon eye: white ball, dark pupil toward `look`, white glint.
function eye(g, pos, r, { iris = '#141418', white = '#ffffff', look = [0, 0, 1], glow = 0 } = {}) {
  const l = v3(look).normalize()
  ball(g, mat(white, glow), pos, r, null, SPHERE_LO)
  const pupil = add(pos, [l.x * r * 0.55, l.y * r * 0.55 + r * 0.05, l.z * r * 0.55])
  ball(g, mat(iris), pupil, r * 0.62, null, SPHERE_LO)
  ball(g, mat('#ffffff', 0.6), add(pupil, [l.x * r * 0.45, r * 0.28, l.z * r * 0.45]), r * 0.2, null, SPHERE_LO)
}

// Feathered wing in its own group so it can flap about its root. Local +X points outward on
// `side`, +Y up; feathers fan from `a0` to `a1` (radians from outward toward up), in layers from
// the longest (drawn behind) to the shortest. Returns the group; `pose(phase)` sets the flap.
function wing(side, root, { bone, boneMat, layers, a0, a1, n, raise, sweep, amp = 0.12 }) {
  const w = new Group()
  w.position.copy(v3(root))
  const P = (x, y, z = 0) => new Vector3(x * side, y, z)
  tube(w, boneMat, [P(0, 0), P(bone[0] * 0.5, bone[1] * 0.35), P(bone[0], bone[1])], 0.055, 0.03)
  layers.forEach(({ material, len, width, count = n }, li) => {
    const z = 0.016 * li - 0.012 // shorter layers in front (local +Z faces forward-out)
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1)
      const a = a0 + (a1 - a0) * t
      const l = typeof len === 'function' ? len(t) : len
      const from = P(bone[0] * (0.2 + 0.8 * (1 - t)) * 0.9, bone[1] * (0.2 + 0.8 * (1 - t)) * 0.9, z)
      const to = from.clone().add(P(Math.cos(a) * l, Math.sin(a) * l))
      blade(w, material, from, to, typeof width === 'function' ? width(t) : width, 0.035, [0, 0, 1])
    }
  })
  bake(w)
  markDynamic(w)
  w.rotation.y = side * sweep
  const pose = (phase) => (w.rotation.z = side * (raise + Math.sin(phase) * amp))
  pose(0)
  return { group: w, pose }
}

function wings(g, root, opts) {
  const pair = [-1, 1].map((s) => wing(s, mx(root, s), opts))
  for (const w of pair) g.add(w.group)
  return (phase) => pair.forEach((w) => w.pose(phase))
}

function celestialDragon() {
  const g = new Group()
  const cream = mat('#fff9ee', 0.3)
  const shade = mat('#f2e3c0', 0.25)
  const gold = mat('#ffc62a', 0.35)
  const goldDeep = mat('#f2a51a', 0.2)
  const glowEye = mat('#62e8ff', 1)

  // Body: torso, deep chest, belly and haunches; the gold gem set in the breastplate.
  ball(g, cream, [0, 0.62, -0.03], [0.33, 0.31, 0.46], [-0.12, 0, 0])
  ball(g, cream, [0, 0.75, 0.27], [0.27, 0.28, 0.24])
  ball(g, shade, [0, 0.53, 0.1], [0.24, 0.2, 0.36])
  ball(g, cream, [0, 0.6, -0.34], [0.27, 0.27, 0.28])
  ball(g, goldDeep, [0, 0.8, 0.465], [0.14, 0.15, 0.05], [-0.4, 0, 0])
  ball(g, gold, [0, 0.8, 0.5], [0.08, 0.1, 0.06], [-0.4, 0, 0], GEM)
  for (const s of [-1, 1]) {
    ball(g, goldDeep, [s * 0.25, 0.83, 0.22], [0.12, 0.05, 0.14], [0, 0, s * 0.6]) // shoulder plates
    ball(g, goldDeep, [s * 0.24, 0.72, -0.35], [0.1, 0.05, 0.13], [0, 0, s * 0.7]) // hip plates
  }
  // Spines down the back and tail.
  ;[[0.2, 0.98], [-0.05, 0.94], [-0.3, 0.88], [-0.52, 0.78]].forEach(([z, y], i) =>
    spike(g, gold, [0, y - 0.04, z], [0, y + 0.13 - i * 0.015, z - 0.08], 0.045, [1, 0, 0]),
  )

  // Neck and head.
  tube(g, cream, [[0, 0.82, 0.3], [0, 1.03, 0.43], [0, 1.18, 0.5]], 0.15, 0.12)
  const H = [0, 1.28, 0.56]
  const h = (x, y, z) => add(H, [x, y, z])
  ball(g, cream, H, [0.19, 0.18, 0.21])
  ball(g, cream, h(0, -0.04, 0.19), [0.13, 0.105, 0.17])
  ball(g, shade, h(0, -0.11, 0.15), [0.11, 0.05, 0.14])
  for (const s of [-1, 1]) {
    ball(g, glowEye, h(s * 0.125, 0.03, 0.12), [0.05, 0.04, 0.035], [0, s * 0.7, 0])
    blade(g, gold, h(s * 0.07, 0.09, 0.16), h(s * 0.17, 0.13, 0.03), 0.07, 0.03, [0, 1, 0]) // brow
    tube(g, gold, [h(s * 0.08, 0.12, -0.02), h(s * 0.13, 0.25, -0.16), h(s * 0.15, 0.3, -0.33)], 0.045, 0.012) // horns
    blade(g, cream, h(s * 0.15, 0.04, -0.05), h(s * 0.34, 0.12, -0.16), 0.13, 0.03, [0, 1, 0]) // ear fins
    blade(g, gold, h(s * 0.16, 0.03, -0.06), h(s * 0.3, 0.06, -0.12), 0.08, 0.03, [0, 1, 0])
    // Golden mane flaring behind the head.
    blade(g, gold, h(s * 0.04, 0.06, -0.12), h(s * 0.3, 0.32, -0.38), 0.13, 0.03, [s, 0, 0.4])
    blade(g, gold, h(s * 0.03, 0.08, -0.1), h(s * 0.14, 0.42, -0.3), 0.12, 0.03, [s, 0, 0.4])
  }
  blade(g, gold, h(0, 0.1, -0.1), h(0, 0.46, -0.24), 0.12, 0.03, [1, 0, 0])
  ball(g, gold, h(0, 0.02, 0.36), [0.035, 0.02, 0.02]) // nose tip

  // Legs: left fore planted, right fore raised, hind legs crouched; gold feet and claws.
  const foot = (p, dir) => {
    ball(g, gold, p, [0.085, 0.055, 0.11])
    for (const dx of [-0.05, 0, 0.05]) spike(g, gold, add(p, [dx, -0.01, 0.07]), add(p, [dx * 1.3, -0.03 + dir[1], 0.07 + dir[2]]), 0.025)
  }
  for (const s of [-1, 1]) {
    ball(g, cream, [s * 0.2, 0.68, 0.26], [0.13, 0.16, 0.14])
    ball(g, cream, [s * 0.22, 0.55, -0.33], [0.14, 0.19, 0.19])
    tube(g, cream, [[s * 0.24, 0.45, -0.3], [s * 0.27, 0.24, -0.22], [s * 0.26, 0.1, -0.3]], 0.12, 0.085)
    foot([s * 0.26, 0.055, -0.25], [0, 0, 0.09])
  }
  tube(g, cream, [[-0.2, 0.66, 0.28], [-0.24, 0.38, 0.33], [-0.23, 0.12, 0.36]], 0.115, 0.085)
  foot([-0.23, 0.055, 0.4], [0, 0, 0.09])
  tube(g, cream, [[0.2, 0.66, 0.28], [0.27, 0.5, 0.46], [0.25, 0.44, 0.6]], 0.115, 0.085)
  foot([0.25, 0.42, 0.64], [0, -0.06, 0.06])

  // Tail sweeping back and up into a gold feather tip.
  tube(g, cream, [[0, 0.62, -0.55], [0, 0.48, -0.82], [0, 0.5, -1.05], [0, 0.68, -1.2]], 0.13, 0.035)
  const tip = [0, 0.68, -1.2]
  blade(g, gold, tip, add(tip, [0, 0.26, -0.1]), 0.14, 0.03, [1, 0, 0])
  for (const s of [-1, 1]) blade(g, gold, tip, add(tip, [s * 0.15, 0.18, -0.14]), 0.12, 0.03, [s * 0.5, 0, 1])
  ;[[-0.75, 0.6], [-0.98, 0.6]].forEach(([z, y]) => spike(g, gold, [0, y - 0.03, z], [0, y + 0.09, z - 0.06], 0.035, [1, 0, 0]))

  bake(g)
  // Great feathered wings held high: gold flight feathers behind, cream ones over them.
  const flap = wings(g, [0.17, 0.93, 0.05], {
    bone: [0.4, 0.38],
    boneMat: cream,
    a0: 0.3,
    a1: 1.8,
    n: 9,
    raise: 0.25,
    sweep: 0.55,
    layers: [
      { material: gold, len: (t) => 0.66 + Math.sin(t * Math.PI) * 0.32, width: 0.22 },
      { material: cream, len: (t) => 0.5 + Math.sin(t * Math.PI) * 0.24, width: 0.22 },
      { material: cream, len: 0.3, width: 0.2, count: 6 },
    ],
  })
  return { group: g, update: (t) => flap(t * 2.2) }
}

function hydraHead(g, H, yaw, m) {
  const hg = new Group()
  hg.position.copy(v3(H))
  hg.rotation.y = yaw
  ball(hg, m.green, [0, 0, 0], [0.17, 0.15, 0.17])
  ball(hg, m.green, [0, -0.03, 0.16], [0.12, 0.085, 0.14])
  ball(hg, m.light, [0, -0.11, 0.12], [0.1, 0.04, 0.12], [0.25, 0, 0])
  ball(hg, m.mouth, [0, -0.075, 0.15], [0.09, 0.035, 0.1])
  for (const s of [-1, 1]) {
    spike(hg, m.white, [s * 0.05, -0.05, 0.24], [s * 0.05, -0.1, 0.25], 0.018)
    ball(hg, m.black, [s * 0.04, 0, 0.29], 0.014, null, SPHERE_LO)
    eye(hg, [s * 0.085, 0.075, 0.1], 0.065, { look: [s * 0.4, 0.1, 1] })
    spike(hg, m.gold, [s * 0.07, 0.12, 0.02], [s * 0.11, 0.26, -0.06], 0.03)
    blade(hg, m.gold, [s * 0.13, -0.02, 0], [s * 0.27, 0.03, -0.09], 0.09, 0.03, [0, 1, 0])
    blade(hg, m.gold, [s * 0.05, 0.08, -0.07], [s * 0.2, 0.3, -0.22], 0.11, 0.03, [s, 0, 0.5])
  }
  blade(hg, m.gold, [0, 0.09, -0.07], [0, 0.36, -0.2], 0.11, 0.03, [1, 0, 0])
  g.add(hg)
}

function hydra() {
  const g = new Group()
  const m = {
    green: mat('#36c64b'),
    light: mat('#62e066'),
    belly: mat('#f3ec92'),
    gold: mat('#ffd21f', 0.3),
    gem: mat('#ff5a1f', 0.6),
    white: mat('#ffffff'),
    black: mat('#141414'),
    mouth: mat('#d2283c'),
  }
  ball(g, m.green, [0, 0.5, 0], [0.42, 0.33, 0.46])
  ball(g, m.belly, [0, 0.42, 0.1], [0.34, 0.24, 0.38])
  // Gold belt round the chest with the red gem in front.
  ball(g, m.gold, [0, 0.55, 0.04], [0.44, 0.47, 0.45], [Math.PI / 2 + 0.25, 0, 0], TORUS)
  ball(g, m.gold, [0, 0.58, 0.47], [0.13, 0.13, 0.05], [-0.3, 0, 0])
  ball(g, m.gem, [0, 0.58, 0.5], [0.08, 0.1, 0.06], [-0.3, 0, 0], GEM)
  for (const [x, z] of [[-0.27, 0.24], [0.27, 0.24], [-0.27, -0.24], [0.27, -0.24]]) {
    tube(g, m.green, [[x, 0.45, z], [x * 1.1, 0.22, z + 0.03], [x * 1.1, 0.11, z + 0.05]], 0.12, 0.1)
    const f = [x * 1.1, 0.06, z + 0.08]
    ball(g, m.gold, f, [0.12, 0.07, 0.14])
    for (const dx of [-0.06, 0, 0.06]) spike(g, m.gold, add(f, [dx, 0, 0.1]), add(f, [dx, -0.03, 0.19]), 0.03)
  }
  ;[0.2, 0.02, -0.16, -0.32].forEach((z, i) => spike(g, m.gold, [0, 0.8 - i * 0.02, z], [0, 0.95 - i * 0.03, z - 0.07], 0.05, [1, 0, 0]))
  tube(g, m.green, [[0, 0.5, -0.42], [0, 0.42, -0.65], [0.1, 0.45, -0.85]], 0.14, 0.04)
  spike(g, m.gold, [0.1, 0.45, -0.85], [0.14, 0.5, -1.0], 0.04)
  // Three necks: the middle one tallest, the outer two leaning out.
  for (const k of [-1, 0, 1]) {
    const H = k ? [k * 0.42, 1.08, 0.44] : [0, 1.24, 0.48]
    tube(g, m.green, [[k * 0.2, 0.68, 0.28], [k * 0.33, 0.92, 0.38], add(H, [0, -0.09, -0.06])], 0.14, 0.11)
    hydraHead(g, H, k * 0.35, m)
  }
  bake(g)
  return { group: g, update: () => {} }
}

function phoenix() {
  const g = new Group()
  const red = mat('#ff3d17', 0.35)
  const orange = mat('#ff8a1c', 0.35)
  const yellow = mat('#ffd23a', 0.4)
  const beak = mat('#ffcf3a')
  ball(g, orange, [0, 0.62, 0], [0.22, 0.3, 0.22], [0.35, 0, 0])
  ball(g, yellow, [0, 0.6, 0.12], [0.16, 0.22, 0.12], [0.35, 0, 0])
  tube(g, orange, [[0, 0.8, 0.06], [0, 0.92, 0.1]], 0.13, 0.12)
  const H = [0, 1.0, 0.12]
  const h = (x, y, z) => add(H, [x, y, z])
  ball(g, orange, H, 0.15)
  ball(g, yellow, h(0, -0.03, 0.08), [0.1, 0.09, 0.08])
  ball(g, beak, h(0, -0.01, 0.14), [0.05, 0.045, 0.06])
  spike(g, beak, h(0, -0.01, 0.16), h(0, -0.08, 0.27), 0.045)
  for (const s of [-1, 1]) eye(g, h(s * 0.08, 0.035, 0.1), 0.035, { look: [s * 0.6, 0, 1] })
  // Flame crest.
  blade(g, red, h(0, 0.1, -0.02), h(0, 0.38, -0.14), 0.12, 0.03, [1, 0, 0])
  blade(g, orange, h(0, 0.08, 0.02), h(0, 0.3, 0.02), 0.1, 0.03, [1, 0, 0])
  blade(g, yellow, h(0, 0.06, -0.08), h(0, 0.24, -0.28), 0.09, 0.03, [1, 0, 0])
  // Legs and talons.
  for (const s of [-1, 1]) {
    tube(g, beak, [[s * 0.08, 0.42, 0.02], [s * 0.09, 0.2, 0.06], [s * 0.09, 0.05, 0.05]], 0.03, 0.025)
    for (const dx of [-0.04, 0, 0.04]) spike(g, beak, [s * 0.09 + dx, 0.04, 0.06], [s * 0.09 + dx * 1.6, 0.01, 0.16], 0.02)
  }
  // Long tail plumes sweeping down and back, each tipped with a shorter flame.
  ;[-2, -1, 0, 1, 2].forEach((k) => {
    const from = [k * 0.03, 0.46, -0.14]
    const to = [k * 0.17, 0.08 - Math.abs(k) * 0.04, -0.72 + Math.abs(k) * 0.08]
    blade(g, k % 2 ? orange : red, from, to, 0.16, 0.03, [0, 1, 0.3])
    blade(g, yellow, add(to, [0, 0.05, 0.1]), add(to, [k * 0.07, -0.02, -0.18]), 0.1, 0.03, [0, 1, 0.3])
  })
  bake(g)
  // Wings spread wide and high.
  const flap = wings(g, [0.15, 0.8, -0.02], {
    bone: [0.32, 0.3],
    boneMat: orange,
    a0: -0.15,
    a1: 1.45,
    n: 7,
    raise: 0.45,
    sweep: 0.3,
    amp: 0.18,
    layers: [
      { material: red, len: (t) => 0.55 + Math.sin(t * Math.PI) * 0.25, width: 0.17 },
      { material: orange, len: (t) => 0.4 + Math.sin(t * Math.PI) * 0.16, width: 0.16 },
      { material: yellow, len: 0.24, width: 0.15, count: 5 },
    ],
  })
  return { group: g, update: (t) => flap(t * 3) }
}

function griffin() {
  const g = new Group()
  const tan = mat('#cf8f3e')
  const tanLight = mat('#efc07a')
  const brown = mat('#9b5a22')
  const white = mat('#fbf8f1')
  const whiteShade = mat('#e9e2d4')
  const beak = mat('#ffc21a')
  // Lion body, sitting; fluffy white chest and neck.
  ball(g, tan, [0, 0.46, -0.08], [0.29, 0.27, 0.44])
  ball(g, tanLight, [0, 0.38, -0.02], [0.23, 0.18, 0.34])
  ball(g, white, [0, 0.62, 0.22], [0.2, 0.22, 0.17])
  for (const s of [-1, 1]) ball(g, white, [s * 0.1, 0.5, 0.3], [0.13, 0.13, 0.11])
  ball(g, white, [0, 0.78, 0.3], [0.17, 0.18, 0.16])
  const H = [0, 0.96, 0.38]
  const h = (x, y, z) => add(H, [x, y, z])
  ball(g, white, H, [0.18, 0.17, 0.19])
  ball(g, whiteShade, h(0, 0.08, 0.1), [0.14, 0.06, 0.1]) // brow
  ball(g, beak, h(0, -0.02, 0.17), [0.07, 0.06, 0.09])
  spike(g, beak, h(0, -0.01, 0.22), h(0, -0.1, 0.3), 0.045)
  ball(g, mat('#e0a514'), h(0, -0.07, 0.16), [0.05, 0.03, 0.06])
  for (const s of [-1, 1]) {
    eye(g, h(s * 0.09, 0.035, 0.12), 0.04, { look: [s * 0.5, 0, 1] })
    blade(g, white, h(s * 0.12, -0.02, -0.04), h(s * 0.26, 0.02, -0.18), 0.13, 0.03, [0, 1, 0]) // cheek ruff
    blade(g, white, h(s * 0.07, 0.12, -0.05), h(s * 0.13, 0.32, -0.15), 0.1, 0.03, [s, 0, 0.6]) // ear tufts
    blade(g, whiteShade, h(s * 0.04, 0.1, -0.1), h(s * 0.08, 0.2, -0.3), 0.1, 0.03, [s, 0, 0.3])
    // Eagle forelegs with yellow talons.
    tube(g, tanLight, [[s * 0.16, 0.5, 0.22], [s * 0.17, 0.25, 0.28], [s * 0.17, 0.08, 0.3]], 0.07, 0.05)
    ball(g, beak, [s * 0.17, 0.045, 0.33], [0.06, 0.04, 0.08])
    for (const dx of [-0.035, 0, 0.035]) spike(g, beak, [s * 0.17 + dx, 0.03, 0.38], [s * 0.17 + dx * 1.5, 0.0, 0.45], 0.018)
    // Lion haunches and hind paws.
    ball(g, tan, [s * 0.22, 0.36, -0.3], [0.15, 0.2, 0.22])
    ball(g, tanLight, [s * 0.24, 0.06, -0.14], [0.09, 0.06, 0.13])
  }
  tube(g, tan, [[0, 0.42, -0.5], [0, 0.32, -0.75], [0.1, 0.44, -0.95]], 0.05, 0.03)
  const tip = [0.1, 0.44, -0.95]
  for (const s of [-1, 0, 1]) blade(g, brown, tip, add(tip, [s * 0.08, 0.14, -0.1]), 0.1, 0.03, [1, 0, 0.3])
  bake(g)
  const flap = wings(g, [0.17, 0.72, 0], {
    bone: [0.32, 0.3],
    boneMat: tan,
    a0: 0.4,
    a1: 1.7,
    n: 6,
    raise: 0.3,
    sweep: 0.75,
    layers: [
      { material: brown, len: (t) => 0.5 + Math.sin(t * Math.PI) * 0.22, width: 0.16 },
      { material: tan, len: (t) => 0.36 + Math.sin(t * Math.PI) * 0.12, width: 0.15 },
      { material: tanLight, len: 0.2, width: 0.14, count: 4 },
    ],
  })
  return { group: g, update: (t) => flap(t * 1.8) }
}

function bee() {
  const g = new Group()
  const yellow = mat('#ffcd2a')
  const black = mat('#1c1a1f')
  const body = new Group()
  body.position.y = 0.42
  ball(body, yellow, [0, 0, -0.18], [0.24, 0.26, 0.32])
  for (const z of [-0.1, -0.26]) ball(body, black, [0, 0, z], [0.25 - Math.abs(z) * 0.1, 0.27 - Math.abs(z) * 0.1, 0.6], null, TORUS)
  spike(body, black, [0, -0.02, -0.47], [0, -0.06, -0.64], 0.05)
  ball(body, black, [0, 0.04, 0.08], 0.17)
  ball(body, yellow, [0, 0.1, 0.28], 0.17)
  for (const s of [-1, 1]) {
    ball(body, black, [s * 0.1, 0.13, 0.37], [0.07, 0.09, 0.06])
    ball(body, mat('#ffffff', 0.6), [s * 0.11, 0.17, 0.42], 0.018, null, SPHERE_LO)
    tube(body, black, [[s * 0.06, 0.24, 0.32], [s * 0.12, 0.4, 0.38], [s * 0.16, 0.44, 0.46]], 0.016, 0.016, { caps: false })
    ball(body, black, [s * 0.16, 0.44, 0.46], 0.035, null, SPHERE_LO)
    for (const z of [-0.06, 0.12]) ball(body, black, [s * 0.15, -0.14, z], [0.03, 0.12, 0.03], [0, 0, s * 0.5]) // legs
  }
  g.add(body)
  bake(g)
  // Brown club-shaped wings with a yellow spot, buzzing.
  const wingMat = mat('#6e4a2f')
  const dot = mat('#ffcf3a', 0.4)
  const pairs = []
  for (const s of [-1, 1]) {
    for (const [lean, len] of [[0.45, 1], [1.05, 0.8]]) {
      const w = new Group()
      w.position.set(s * 0.08, 0.6, 0.02)
      ball(w, wingMat, [0, 0.36 * len, 0], [0.12 * len, 0.36 * len, 0.025])
      ball(w, wingMat, [0, 0.6 * len, 0], [0.15 * len, 0.14 * len, 0.03])
      ball(w, dot, [0, 0.6 * len, 0.03], [0.05, 0.06, 0.015], null, SPHERE_LO)
      bake(w)
      markDynamic(w)
      w.rotation.set(-0.25, 0, -s * lean)
      g.add(w)
      pairs.push({ w, s, lean })
    }
  }
  return {
    group: g,
    update: (t) => {
      for (const { w, s, lean } of pairs) w.rotation.z = -s * (lean + Math.sin(t * 28) * 0.18)
    },
  }
}

const BUILDERS = { dragon: celestialDragon, hydra, phoenix, griffin, bee }

// Each pet's effects (particles.js), in the pet's own units; `y` lifts the emitter's foot.
const FX = {
  // Gold motes drifting up round the dragon, with the odd star glint.
  dragon: [
    { mode: 'rise', count: 30, shape: 'spark', color: '#fff2a0', color2: '#ffb81a', size: 0.17, radius: 0.9, height: 1.8, speed: 0.22, spin: 3, seed: 3 },
    { mode: 'twinkle', count: 7, shape: 'spark', color: '#fff6c8', size: 0.32, radius: 0.95, height: 1.7, speed: 0.35, seed: 4 },
  ],
  // Flame tongues licking up off the body and tail, and embers floating clear.
  phoenix: [
    { mode: 'rise', count: 20, shape: 'flame', color: '#ffe14a', color2: '#ff3a12', size: 0.34, radius: 0.62, height: 1.4, speed: 0.55, y: 0.2, seed: 5 },
    { mode: 'rise', count: 16, shape: 'dot', color: '#ffc02e', color2: '#ff4a1a', size: 0.08, radius: 0.75, height: 1.7, speed: 0.28, seed: 6 },
  ],
  // Little leaf-green sparkles round the heads.
  hydra: [{ mode: 'rise', count: 14, shape: 'spark', color: '#d8ff8a', color2: '#5fe066', size: 0.11, radius: 0.85, height: 1.5, speed: 0.22, spin: 3, y: 0.2, seed: 7 }],
  // Purple smoke swirling round the bee with white glints in it.
  bee: [
    { mode: 'orbit', count: 30, shape: 'dot', color: '#8a1fff', color2: '#c86bff', size: 0.85, radius: 0.6, height: 0.9, speed: 0.25, opacity: 0.8, additive: false, y: 0.42, seed: 8 },
    { mode: 'rise', count: 14, shape: 'spark', color: '#ffffff', color2: '#c86bff', size: 0.16, radius: 0.55, height: 1.2, speed: 0.4, spin: 4, seed: 10 },
    { mode: 'orbit', count: 10, shape: 'spark', color: '#ffffff', color2: '#f0c8ff', size: 0.14, radius: 0.5, height: 0.8, speed: 0.55, spin: 4, y: 0.42, seed: 9 },
  ],
}

export function createPet(species) {
  const pet = (BUILDERS[species] ?? bee)()
  for (const { y = 0, ...fx } of FX[species] ?? []) {
    const p = particles(fx)
    p.position.y = y
    pet.group.add(p)
  }
  return pet
}
