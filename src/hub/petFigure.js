// Blocky Roblox-style pets for the Index window's portraits (petPortraits.js): a big head on a small
// body, flat black eyes with a glint, built from shared unit boxes, cones and domes in the cached
// plastic/neon materials. `petFigure(look)` takes a petIndex.js look recipe (body plan + colours +
// extras, see the PETS table there) and returns a Group, feet at the origin, facing +Z.
import { BoxGeometry, ConeGeometry, Group, Mesh, SphereGeometry, TorusGeometry } from 'three'
import { neon, plastic } from './materials.js'

const CUBE = new BoxGeometry(1, 1, 1)
// Square pyramid, base at the origin, tip at +Y 1 (ears, horns, spikes, beaks).
const PYRAMID = new ConeGeometry(0.5, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0)
const DOME = new SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
const ROUND = new SphereGeometry(0.5, 16, 12)
const RING = new TorusGeometry(0.5, 0.07, 8, 28)

export function petFigure(look) {
  const g = new Group()
  const glow = look.glow ?? 0
  const gold = look.gold ? { metalness: 0.65, roughness: 0.3 } : {}
  // Body colours glow a little on glowing pets; accents glow more.
  const mat = (color, k = 0.4) => (glow ? neon(color, glow * k) : plastic(color, gold))
  const C = mat(look.c)
  const B = mat(look.b)
  const A = glow ? neon(look.a, Math.max(0.5, glow * 1.6)) : plastic(look.a, gold)

  const part = (geo, material, [w, h, d], [x, y, z], [rx = 0, ry = 0, rz = 0] = [], parent = g) => {
    const m = new Mesh(geo, material)
    m.scale.set(w, h, d)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    parent.add(m)
    return m
  }
  const box = (material, size, pos, rot, parent) => part(CUBE, material, size, pos, rot, parent)
  const pyr = (material, size, pos, rot, parent) => part(PYRAMID, material, size, pos, rot, parent)
  const mirror = (fn) => [-1, 1].forEach(fn)

  // Two flat black eyes with a white glint on a face whose front is at z, centred at (x, y).
  const BLACK = plastic('#141418')
  const WHITE = neon('#ffffff', 0.6)
  function eyes(y, z, spread, size = 0.13, iris = BLACK) {
    mirror((s) => {
      box(iris, [size * 0.75, size, 0.03], [s * spread, y, z])
      box(WHITE, [size * 0.28, size * 0.28, 0.035], [s * spread + size * 0.12, y + size * 0.22, z + 0.005])
    })
  }

  // Head cube of side `h` centred at (0, y, z); dresses it from the look.
  function head(h, y, z) {
    box(C, [h, h * 0.92, h * 0.9], [0, y, z])
    const front = z + h * 0.45
    if (look.mask) box(A, [h * 1.02, h * 0.2, 0.04], [0, y + h * 0.08, front])
    eyes(y + h * 0.08, front + 0.03, h * 0.22, h * 0.21)
    if (look.snout) {
      box(B, [h * 0.36, h * 0.26, h * 0.16], [0, y - h * 0.16, front + h * 0.06])
      mirror((s) => box(mat(look.a), [h * 0.06, h * 0.1, 0.02], [s * h * 0.08, y - h * 0.16, front + h * 0.15]))
    } else box(B, [h * 0.42, h * 0.24, 0.06], [0, y - h * 0.22, front])
    if (look.beard) box(B, [h * 0.2, h * 0.3, h * 0.16], [0, y - h * 0.55, z + h * 0.3])
    if (look.trunk) {
      box(C, [h * 0.2, h * 0.3, h * 0.2], [0, y - h * 0.3, front + h * 0.1], [0.3, 0, 0])
      box(C, [h * 0.17, h * 0.28, h * 0.17], [0, y - h * 0.55, front + h * 0.2], [-0.2, 0, 0])
    }
    if (look.tusks) mirror((s) => pyr(plastic('#f6f0dc'), [h * 0.1, h * 0.3, h * 0.1], [s * h * 0.22, y - h * 0.38, front + h * 0.08], [0.3, 0, -s * 0.2]))
    const top = y + h * 0.46
    const ears = look.ears ?? 'none'
    mirror((s) => {
      const x = s * h * 0.32
      if (ears === 'pointy') pyr(C, [h * 0.3, h * 0.38, h * 0.16], [x, top - 0.02, z], [0, 0, -s * 0.18])
      else if (ears === 'round') box(C, [h * 0.26, h * 0.22, h * 0.12], [x, top + 0.06, z])
      else if (ears === 'long') box(C, [h * 0.16, h * 0.62, h * 0.1], [s * h * 0.2, top + h * 0.28, z - h * 0.1], [-0.15, 0, -s * 0.12])
      else if (ears === 'floppy') box(C, [h * 0.14, h * 0.36, h * 0.24], [s * h * 0.53, y + h * 0.05, z], [0, 0, s * 0.45])
      else if (ears === 'big') box(C, [h * 0.08, h * 0.7, h * 0.6], [s * h * 0.62, y + h * 0.12, z - h * 0.05], [0, -s * 0.35, s * 0.25])
      if (ears === 'pointy' || ears === 'round') box(B, [h * 0.12, h * 0.12, 0.02], [x, top + 0.07, z + h * 0.07])
      if (look.horns && !look.unicorn) pyr(plastic(look.horns), [h * 0.13, h * 0.42, h * 0.13], [s * h * 0.2, top - 0.02, z - h * 0.12], [-0.45, 0, -s * 0.35])
    })
    if (look.unicorn) pyr(neon(look.horns, 0.4), [h * 0.14, h * 0.55, h * 0.14], [0, top - 0.03, z + h * 0.25], [0.45, 0, 0])
    if (look.mane) box(A, [h * 1.14, h * 1.08, h * 0.3], [0, y + 0.02, z - h * 0.42])
    if (look.halo) part(RING, neon('#ffd23a', 1.2), [h * 0.8, h * 0.8, h * 0.8], [0, top + h * 0.35, z], [Math.PI / 2, 0, 0])
    if (look.stripes) for (const k of [-0.28, 0, 0.28]) box(mat(look.a, 1), [h * 0.12, 0.03, h * 0.5], [k * h, top + 0.005, z - h * 0.1])
    return top
  }

  // Wings at the shoulders (y, z): feathered fans for birds, flat webbed for the rest.
  function wings(y, z, half, color, bird = false) {
    const W = mat(color)
    mirror((s) => {
      const root = new Group()
      root.position.set(s * half, y, z)
      root.rotation.set(0, 0, s * (bird ? -0.25 : -0.55))
      g.add(root)
      if (bird) box(W, [0.08, 0.36, 0.38], [s * 0.04, -0.05, 0], [0.15, 0, 0], root)
      else {
        box(W, [0.62, 0.05, 0.34], [s * 0.3, 0, 0], [0, 0, 0], root)
        box(W, [0.4, 0.05, 0.26], [s * 0.58, 0.04, -0.1], [0, 0, s * 0.35], root)
      }
    })
  }

  const plan = look.plan
  if (plan === 'quad') {
    const up = !!look.upright
    const bw = look.chunky ? 0.66 : 0.52
    if (up) {
      // Sitting up (kangaroo, squirrel, bunny): big haunches, little arms, head on top.
      box(C, [bw, 0.55, 0.42], [0, 0.42, -0.02])
      box(B, [bw * 0.6, 0.4, 0.04], [0, 0.42, 0.2])
      mirror((s) => {
        box(C, [0.18, 0.24, 0.42], [s * (bw / 2 + 0.02), 0.13, 0.05])
        box(C, [0.1, 0.22, 0.1], [s * bw * 0.32, 0.5, 0.24], [-0.5, 0, 0])
      })
      head(0.58, 0.98, 0.04)
      if (look.wings) wings(0.6, -0.15, bw / 2, look.wings)
    } else {
      box(C, [bw, 0.4, 0.62], [0, 0.48, -0.1])
      box(B, [bw * 0.7, 0.04, 0.5], [0, 0.27, -0.1])
      mirror((s) => {
        for (const z of [0.12, -0.32]) box(C, [0.16, 0.3, 0.16], [s * (bw / 2 - 0.1), 0.15, z])
      })
      head(0.62, 0.9, 0.3)
      if (look.wings) wings(0.62, -0.05, bw / 2, look.wings)
      if (look.spots) for (const [x, y, z] of [[1, 0.55, 0], [-1, 0.5, -0.22], [1, 0.42, -0.3], [-1, 0.6, 0.08]]) box(mat(look.a, 1), [0.03, 0.09, 0.09], [x * (bw / 2 + 0.005), y, z - 0.1])
      if (look.stripes) for (const z of [0.05, -0.15, -0.35]) box(mat(look.a, 1), [bw + 0.01, 0.06, 0.07], [0, 0.66, z])
      if (look.spikes) for (const z of [0.12, -0.08, -0.28]) pyr(A, [0.12, 0.18, 0.12], [0, 0.66, z])
      if (look.wool) {
        box(C, [bw + 0.14, 0.5, 0.72], [0, 0.5, -0.1])
        for (const [x, z] of [[-1, 0.15], [1, -0.05], [-1, -0.3], [1, -0.4]]) box(C, [0.2, 0.2, 0.2], [x * 0.2, 0.78, z])
      }
      if (look.shell) {
        const S = mat(look.shell)
        part(DOME, S, [bw + 0.24, 0.62, 0.8], [0, 0.5, -0.1])
        for (const [x, z] of [[0, -0.1], [-0.18, 0.08], [0.18, 0.08], [-0.18, -0.28], [0.18, -0.28]]) box(mat(look.a), [0.14, 0.04, 0.14], [x, 0.78 - Math.abs(x) * 0.4 - Math.abs(z + 0.1) * 0.3, z], [z * 0.6, 0, -x * 1.4])
      }
    }
    // Tails out the back.
    const tz = up ? -0.24 : -0.43
    const ty = up ? 0.22 : 0.56
    const tail = look.tail ?? 'none'
    const tails = look.ninetails ? [-0.8, -0.4, 0, 0.4, 0.8] : [0]
    for (const spread of tails) {
      if (tail === 'short') box(C, [0.14, 0.14, 0.12], [0, ty, tz])
      else if (tail === 'long') {
        box(C, [0.1, 0.1, 0.32], [spread * 0.2, ty + 0.06, tz - 0.12], [0.5, spread * 0.6, 0])
        box(A, [0.12, 0.12, 0.14], [spread * 0.32, ty + 0.18, tz - 0.3], [0.5, spread * 0.6, 0])
      } else if (tail === 'bushy') {
        box(C, [0.24, 0.5, 0.22], [spread * 0.25, ty + 0.25, tz - 0.12], [-0.35, 0, -spread * 0.5])
        box(B, [0.2, 0.16, 0.18], [spread * 0.42, ty + 0.5, tz - 0.22], [-0.35, 0, -spread * 0.5])
      } else if (tail === 'curl') {
        box(C, [0.06, 0.06, 0.14], [0, ty + 0.04, tz - 0.04])
        box(C, [0.06, 0.12, 0.06], [0.04, ty + 0.12, tz - 0.1])
      }
    }
  } else if (plan === 'bird') {
    const bw = look.owl ? 0.66 : 0.58
    box(C, [bw, 0.58, 0.52], [0, 0.4, 0])
    box(B, [bw * 0.72, look.penguin ? 0.5 : 0.36, 0.04], [0, look.penguin ? 0.42 : 0.34, 0.26])
    mirror((s) => box(mat(look.a), [0.14, 0.08, 0.2], [s * 0.15, 0.04, 0.06]))
    wings(0.46, 0, bw / 2, look.c, true)
    if (look.owl) {
      box(C, [0.66, 0.44, 0.5], [0, 0.88, 0])
      mirror((s) => {
        box(B, [0.24, 0.24, 0.03], [s * 0.15, 0.9, 0.26])
        box(BLACK, [0.12, 0.14, 0.03], [s * 0.15, 0.9, 0.285])
        box(WHITE, [0.04, 0.04, 0.03], [s * 0.15 + 0.03, 0.94, 0.3])
        pyr(C, [0.12, 0.2, 0.1], [s * 0.26, 1.08, 0], [0, 0, -s * 0.3])
      })
      pyr(A, [0.1, 0.14, 0.1], [0, 0.82, 0.24], [Math.PI / 2 + 0.3, 0, 0])
    } else {
      box(C, [0.5, 0.46, 0.46], [0, 0.9, 0.02])
      if (look.penguin) box(B, [0.38, 0.28, 0.03], [0, 0.88, 0.25])
      eyes(0.95, 0.27, 0.12, 0.12)
      pyr(A, [0.16, 0.2, 0.1], [0, 0.84, 0.24], [Math.PI / 2, 0, 0])
      if (look.crest) for (const [z, h] of [[0.08, 0.16], [-0.06, 0.2], [-0.18, 0.13]]) box(mat(look.crest, 1), [0.06, h, 0.1], [0, 1.13 + h / 2 - 0.02, z])
    }
    box(C, [0.3, 0.06, 0.16], [0, 0.32, -0.3], [0.4, 0, 0])
  } else if (plan === 'jelly') {
    part(DOME, C, [0.86, 0.8, 0.86], [0, 0.58, 0])
    box(B, [0.74, 0.08, 0.74], [0, 0.6, 0])
    eyes(0.8, 0.43, 0.13, 0.13)
    const n = look.kraken ? 6 : 8
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 0.28
      const x = Math.sin(a) * r
      const z = Math.cos(a) * r
      if (look.kraken) {
        box(C, [0.12, 0.3, 0.12], [x, 0.42, z], [Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4])
        box(A, [0.1, 0.24, 0.1], [x * 1.6, 0.2, z * 1.6], [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9])
        box(A, [0.09, 0.14, 0.09], [x * 2.1, 0.12, z * 2.1], [Math.cos(a) * 1.6, 0, -Math.sin(a) * 1.6])
      } else
        for (let k = 0; k < 3; k++) box(k % 2 ? B : A, [0.05, 0.16, 0.05], [x + Math.sin(k * 2 + i) * 0.03, 0.48 - k * 0.15, z], [0, 0, Math.sin(i + k) * 0.25])
    }
  } else if (plan === 'seahorse') {
    // Snout to curled tail, a column of tilted blocks.
    box(C, [0.36, 0.34, 0.4], [0, 1.0, 0.02])
    box(C, [0.14, 0.12, 0.26], [0, 0.96, 0.3])
    eyes(1.06, 0.23, 0.11, 0.1)
    const spine = [[0.82, -0.06, 0.2], [0.62, -0.02, -0.1], [0.42, 0.04, -0.25], [0.24, 0.02, -0.5], [0.12, -0.1, -1.2]]
    spine.forEach(([y, z, rx], i) => {
      const s = 0.38 - i * 0.06
      box(C, [s, 0.24, s], [0, y, z], [rx, 0, 0])
      box(B, [s * 0.7, 0.2, 0.03], [0, y, z + s / 2 + 0.01], [rx, 0, 0])
    })
    box(C, [0.12, 0.12, 0.12], [0, 0.12, 0.12])
    box(A, [0.03, 0.34, 0.22], [0, 0.66, -0.24], [-0.2, 0, 0])
    for (const [y, z] of [[1.2, -0.05], [1.12, -0.18], [0.95, -0.22]]) pyr(A, [0.08, 0.14, 0.08], [0, y, z], [-0.7, 0, 0])
  } else if (plan === 'golem') {
    mirror((s) => {
      box(C, [0.24, 0.32, 0.26], [s * 0.18, 0.16, 0])
      box(C, [0.22, 0.56, 0.24], [s * 0.45, 0.62, 0.02], [0, 0, s * 0.08])
      box(B, [0.26, 0.2, 0.28], [s * 0.48, 0.3, 0.04])
    })
    box(C, [0.66, 0.62, 0.46], [0, 0.66, 0])
    box(A, [0.3, 0.3, 0.04], [0, 0.68, 0.23])
    box(C, [0.44, 0.38, 0.4], [0, 1.15, 0.02])
    eyes(1.17, 0.23, 0.1, 0.1, glow ? A : BLACK)
    if (look.fur) for (const [x, y] of [[-0.2, 0.95], [0.2, 0.95], [0, 1.36], [-0.34, 0.86], [0.34, 0.86]]) box(C, [0.18, 0.16, 0.18], [x, y, -0.12])
  } else if (plan === 'blob') {
    if (look.claws) {
      box(C, [0.84, 0.36, 0.56], [0, 0.32, 0])
      mirror((s) => {
        box(C, [0.06, 0.2, 0.06], [s * 0.14, 0.58, 0.18])
        box(C, [0.14, 0.14, 0.14], [s * 0.14, 0.7, 0.18])
        box(BLACK, [0.08, 0.1, 0.03], [s * 0.14, 0.71, 0.26])
        box(C, [0.24, 0.2, 0.26], [s * 0.56, 0.44, 0.38], [0, s * 0.4, 0])
        box(A, [0.08, 0.16, 0.2], [s * 0.6, 0.6, 0.48], [0.4, s * 0.4, 0])
        for (const z of [-0.15, 0, 0.15]) box(A, [0.3, 0.05, 0.05], [s * 0.5, 0.12, z], [0, 0, -s * 0.5])
      })
      box(B, [0.4, 0.05, 0.04], [0, 0.26, 0.29])
    } else if (look.frog) {
      box(C, [0.8, 0.42, 0.66], [0, 0.3, 0])
      box(B, [0.6, 0.12, 0.04], [0, 0.18, 0.33])
      mirror((s) => {
        box(C, [0.24, 0.2, 0.22], [s * 0.24, 0.58, 0.16])
        box(WHITE, [0.18, 0.16, 0.03], [s * 0.24, 0.6, 0.28])
        box(BLACK, [0.1, 0.12, 0.03], [s * 0.24, 0.6, 0.295])
        box(A, [0.28, 0.1, 0.3], [s * 0.42, 0.06, -0.12])
      })
      box(A, [0.5, 0.03, 0.03], [0, 0.3, 0.335])
    } else if (look.seal) {
      box(C, [0.5, 0.42, 0.9], [0, 0.22, -0.1])
      box(C, [0.48, 0.44, 0.42], [0, 0.5, 0.3])
      box(B, [0.3, 0.16, 0.06], [0, 0.42, 0.52])
      eyes(0.58, 0.52, 0.12, 0.12)
      mirror((s) => {
        box(C, [0.3, 0.06, 0.18], [s * 0.34, 0.08, 0.15], [0, 0.4 * s, 0])
        for (const k of [-1, 1]) box(A, [0.18, 0.015, 0.015], [s * 0.18, 0.42 + k * 0.03, 0.55], [0, 0, k * 0.15 * s])
      })
      box(C, [0.42, 0.06, 0.18], [0, 0.06, -0.62])
    } else {
      // Hedgehog: round body full of spikes, little face.
      part(ROUND, C, [0.72, 0.58, 0.8], [0, 0.32, -0.04])
      box(B, [0.36, 0.3, 0.2], [0, 0.28, 0.34])
      box(BLACK, [0.07, 0.06, 0.04], [0, 0.27, 0.45])
      eyes(0.38, 0.44, 0.1, 0.09)
      for (let i = 0; i < 14; i++) {
        const a = -0.9 + (i % 7) * 0.3
        const b = i < 7 ? 0.5 : 1.0
        pyr(A, [0.1, 0.24, 0.1], [Math.sin(a) * 0.3, 0.32 + Math.cos(a) * 0.24, -0.04 - b * 0.22], [-b * 0.9, 0, -a])
      }
    }
  }
  return g
}
