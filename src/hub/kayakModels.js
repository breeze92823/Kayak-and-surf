// The boats sold in the Kayak Shop (config KAYAK_SHOP), modelled off the user's shop shot. Every
// boat shares the raft's local space (raft.js): +Z is the bow, the bottom at y = 0, the paddler's
// seat at RAFT.seatY over z = RAFT.benchZ[0], so raft.js can swap one in under the player. The
// Wooden Raft itself is raft.js's log raft (raftHull()); the rest come from kayakModel(id).
// Hulls are one parametric surface (u along the boat stern to bow, v round it: v 0 / 0.5 the
// gunwales, 0.25 the deck, 0.75 the keel) painted with a canvas texture in that same uv space,
// so a stripe at u is a band across the boat and the top half of the canvas is the deck. A
// negative `deck` scoops the top in (an open canoe) instead of doming it (a kayak).
import { BoxGeometry, CanvasTexture, CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, SRGBColorSpace, TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js'
import { MATERIAL_PBR, RAFT } from '../config.js'
import { plastic } from './materials.js'
import { DRAGON_COCKPIT_Y, dragonKayak } from './dragonKayak.js'

const SEAT_Y = RAFT.seatY
const SEAT_Z = RAFT.benchZ[0]

function shadow(m) {
  m.castShadow = true
  m.receiveShadow = true
  return m
}
const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = shadow(new Mesh(geo, mat))
  m.position.set(x, y, z)
  return m
}

// Canvas texture painted by fn(ctx, w, h) in the hull's uv space (canvas x = u, canvas y = v).
function paint(fn, w = 512, h = 256) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  fn(c.getContext('2d'), w, h)
  const tex = new CanvasTexture(c)
  tex.flipY = false // canvas y = v, so the top half of the canvas is the deck
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
const skin = (fn) => new MeshStandardMaterial({ map: paint(fn), ...MATERIAL_PBR.PLASTIC })

// Hull: `length` x `width`, `depth` from the gunwale down to the keel, `deck` the dome (+) or scoop
// (-) above it, `sheer` how far the ends rise, `sharp` how pointed the ends are (higher = fuller),
// `belly` < 1 moves the widest point toward the stern (rounder stern, longer pointed bow).
export function hull({ length, width, depth, deck, sheer = 0.12, sharp = 0.6, belly = 1, z = -0.15 }, material) {
  const geo = new ParametricGeometry(
    (u, v, out) => {
      const s = Math.sin(Math.PI * u ** belly) ** sharp
      const a = v * Math.PI * 2
      const end = (2 * u - 1) ** 4
      const gunwale = depth + sheer * end
      const up = Math.sin(a)
      const h = up > 0 ? deck * Math.sin(Math.PI * u) ** 0.8 : depth * (1 - end * 0.65)
      // -x: keeps the faces' winding outward (round the hull the other way they'd face in)
      out.set(-(width / 2) * s * Math.cos(a), gunwale + h * up * Math.max(s, 0.001) ** 0.3, z + (u - 0.5) * length)
    },
    64,
    32,
  )
  return mesh(geo, material)
}

// Black cockpit hole with a coaming round it, on the deck at the seat.
function cockpit(g, y, color = '#1a1a1a', rim = '#2a2a2a') {
  const hole = mesh(new CylinderGeometry(1, 1, 0.04, 28), plastic(color), 0, y, SEAT_Z + 0.25)
  hole.scale.set(0.3, 1, 0.55)
  const coaming = mesh(new TorusGeometry(1, 0.06, 8, 32), plastic(rim), 0, y + 0.02, SEAT_Z + 0.25)
  coaming.rotation.x = Math.PI / 2
  coaming.scale.set(0.31, 0.56, 1)
  g.add(hole, coaming)
}

// A moulded seat: a cushion with a backrest, its top at the paddler's seat height.
function chair(g, z, color, back = color, y = SEAT_Y) {
  g.add(mesh(new BoxGeometry(0.5, 0.08, 0.42), plastic(color), 0, y - 0.04, z))
  const rest = mesh(new BoxGeometry(0.5, 0.42, 0.08), plastic(back), 0, y + 0.17, z - 0.22)
  rest.rotation.x = -0.25
  g.add(rest)
}

// A squashed sphere: `r` scaled by [sx, sy, sz] at (x, y, z).
function ball(g, r, mat, [x, y, z], [sx, sy, sz] = [1, 1, 1]) {
  const m = mesh(new SphereGeometry(r, 18, 12), mat, x, y, z)
  m.scale.set(sx, sy, sz)
  g.add(m)
  return m
}

// A creature's eye: white with a black pupil, looking out to `side`.
function eye(g, [x, y, z], side, r = 0.07) {
  ball(g, r, plastic('#ffffff'), [x, y, z])
  ball(g, r * 0.55, plastic('#111111'), [x + side * r * 0.6, y, z + r * 0.35])
}

// Deck colour on top, hull colour below.
const twoTone = (top, bottom, extra) =>
  skin((c, w, h) => {
    c.fillStyle = top
    c.fillRect(0, 0, w, h / 2)
    c.fillStyle = bottom
    c.fillRect(0, h / 2, w, h / 2)
    extra?.(c, w, h)
  })

// Two seats: the paddler's in front and one behind.
function seats(g, color, back = color, y = SEAT_Y) {
  chair(g, SEAT_Z, color, back, y)
  chair(g, -1.2, color, back, y)
}

// Plank seams along the hull and a darker inside (open canoes).
const wood = (outside, inside, seam) =>
  skin((g, w, h) => {
    g.fillStyle = outside
    g.fillRect(0, 0, w, h)
    g.fillStyle = inside
    g.fillRect(0, h * 0.02, w, h * 0.46)
    g.strokeStyle = seam
    g.lineWidth = 3
    for (let i = 1; i < 10; i++) {
      const y = (h * i) / 10
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y)
      g.stroke()
    }
  })

const BUILD = {
  canoe() {
    const g = new Group()
    g.add(hull({ length: 3.9, width: 1, depth: 0.36, deck: -0.22, sheer: 0.22, sharp: 0.5 }, wood('#8a5530', '#5e3a1e', 'rgba(40,20,8,0.35)')))
    const thwart = plastic('#6b3f24')
    for (const z of [SEAT_Z, -1.3]) g.add(mesh(new BoxGeometry(0.86, 0.07, 0.3), thwart, 0, SEAT_Y - 0.035, z))
    g.add(mesh(new BoxGeometry(0.62, 0.05, 0.12), thwart, 0, 0.36, 1.05))
    return g
  },

  kayak() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      const grad = c.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#ff5a1a')
      grad.addColorStop(0.22, '#ff8a1a')
      grad.addColorStop(0.3, '#ffc21a')
      grad.addColorStop(1, '#ffd23a')
      c.fillStyle = grad
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#ffe680'
      c.fillRect(w * 0.3, h * 0.2, w * 0.66, h * 0.08)
      c.fillStyle = '#e8701a'
      c.fillRect(0, h * 0.62, w, h * 0.3)
    })
    g.add(hull({ length: 3.7, width: 0.86, depth: 0.27, deck: 0.18, sheer: 0.1, sharp: 0.55 }, tex))
    cockpit(g, 0.46)
    g.add(mesh(new BoxGeometry(0.06, 0.12, 0.5), plastic('#2a2a2a'), 0, 0.36, -1.6))
    return g
  },

  rainbow() {
    const g = new Group()
    const bands = ['#7a3ad8', '#e83aa0', '#e8283a', '#ff7a1a', '#ffb21a', '#ffd23a', '#ffb21a']
    const tex = skin((c, w, h) => {
      bands.forEach((col, i) => {
        c.fillStyle = col
        c.fillRect((w * i) / bands.length, 0, w / bands.length + 1, h)
      })
      c.fillStyle = 'rgba(255,255,255,0.25)'
      c.fillRect(0, h * 0.18, w, h * 0.05)
    })
    g.add(hull({ length: 3.8, width: 0.9, depth: 0.27, deck: 0.17, sheer: 0.12, sharp: 0.55 }, tex))
    cockpit(g, 0.46, '#1a1a1a', '#ff7a1a')
    return g
  },

  wave() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      c.fillStyle = '#5ad0ff'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#1a7ae8'
      c.fillRect(0, h * 0.5, w, h * 0.5)
      // White wave crest along each side.
      c.strokeStyle = '#ffffff'
      c.lineWidth = 7
      for (const y0 of [h * 0.06, h * 0.44]) {
        c.beginPath()
        for (let x = 0; x <= w; x += 8) c.lineTo(x, y0 + Math.sin(x / 26) * 6)
        c.stroke()
      }
    })
    g.add(hull({ length: 3.8, width: 0.9, depth: 0.27, deck: 0.18, sheer: 0.16, sharp: 0.55 }, tex))
    cockpit(g, 0.46, '#10306a', '#0a4ab8')
    const bump = mesh(new SphereGeometry(0.22, 16, 10), plastic('#3ab0ff'), 0, 0.4, 0.95)
    bump.scale.set(1, 0.5, 1.6)
    g.add(bump)
    return g
  },

  surge() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      c.fillStyle = '#123a9a'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#ffffff'
      for (let i = 0; i < 70; i++) {
        c.beginPath()
        c.arc(((i * 97) % w) + 4, ((i * 53) % h) + 4, 5 + (i % 3) * 2, 0, Math.PI * 2)
        c.fill()
      }
      c.fillStyle = '#7ad8ff'
      c.fillRect(0, h * 0.2, w, h * 0.06)
    })
    g.add(hull({ length: 4.4, width: 0.95, depth: 0.3, deck: 0.08, sheer: 0.4, sharp: 0.45, z: 0 }, tex))
    const stripe = (c, w, h) => {
      c.fillStyle = '#ffffff'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#1a4ac8'
      for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 32, h)
    }
    const seat = new MeshStandardMaterial({ map: paint(stripe, 128, 32), ...MATERIAL_PBR.PLASTIC })
    for (const z of [SEAT_Z, -1.25]) {
      g.add(mesh(new BoxGeometry(0.5, 0.08, 0.42), seat, 0, SEAT_Y - 0.04, z))
      const rest = mesh(new BoxGeometry(0.5, 0.4, 0.08), seat, 0, SEAT_Y + 0.16, z - 0.22)
      rest.rotation.x = -0.25
      g.add(rest)
    }
    return g
  },

  cross() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      const n = 16
      for (let i = 0; i < n * 2; i++)
        for (let j = 0; j < 8; j++) {
          c.fillStyle = (i + j) % 2 ? '#e8283a' : '#ffffff'
          c.fillRect((w * i) / (n * 2), (h * j) / 8, w / (n * 2) + 1, h / 8 + 1)
        }
    })
    g.add(hull({ length: 4, width: 0.95, depth: 0.3, deck: 0.08, sheer: 0.3, sharp: 0.5 }, tex))
    chair(g, SEAT_Z, '#e8283a', '#ffffff')
    chair(g, -1.2, '#ffffff', '#e8283a')
    return g
  },

  cloud() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      c.fillStyle = '#ffffff'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#d8ecff'
      c.fillRect(0, h * 0.55, w, h * 0.45)
    })
    g.add(hull({ length: 3.9, width: 1, depth: 0.3, deck: 0.08, sheer: 0.14, sharp: 0.55 }, tex))
    // Puffs along both sides and round the bow.
    const puff = plastic('#ffffff')
    for (let i = 0; i < 9; i++) {
      const u = 0.12 + (i / 8) * 0.76
      const z = -0.15 + (u - 0.5) * 3.9
      const w = 0.5 * Math.sin(Math.PI * u) ** 0.55
      for (const side of [-1, 1]) {
        const r = 0.2 + ((i * 7) % 3) * 0.04
        g.add(mesh(new SphereGeometry(r, 14, 10), puff, side * w, 0.28, z))
      }
    }
    chair(g, SEAT_Z, '#e8283a')
    chair(g, -1.2, '#e8283a')
    return g
  },

  hotdog() {
    const g = new Group()
    const bun = skin((c, w, h) => {
      c.fillStyle = '#e09a4a'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#f6d6a0'
      c.fillRect(0, h * 0.04, w, h * 0.42)
      c.fillStyle = '#b8682a'
      c.fillRect(0, h * 0.6, w, h * 0.3)
    })
    g.add(hull({ length: 3.9, width: 1.1, depth: 0.3, deck: -0.12, sheer: 0.16, sharp: 0.35 }, bun))
    const sausage = mesh(new CapsuleGeometry(0.17, 3.3, 8, 16), plastic('#c0402a'), 0, 0.3, -0.15)
    sausage.rotation.x = Math.PI / 2
    g.add(sausage)
    const zig = []
    for (let i = 0; i <= 24; i++) zig.push(new Vector3((i % 2 ? 1 : -1) * 0.1, 0.47, 1.45 - (i / 24) * 3.2))
    g.add(mesh(new TubeGeometry(new CatmullRomCurve3(zig), 96, 0.03, 6), plastic('#ffd21a')))
    chair(g, SEAT_Z, '#3a8aff', '#3a8aff', SEAT_Y + 0.03)
    chair(g, -1.2, '#3a8aff', '#3a8aff', SEAT_Y + 0.03)
    return g
  },

  // Round watermelon dinghy: a red ring with a green rind and black seeds, a green seat inside.
  watermelon() {
    const g = new Group()
    // Torus uv: u round the ring, v round the tube from its outer side (0) over the top (0.25) to
    // the inside (0.5) and under (0.75). Red flesh on top and inside, green rind outside and under.
    const tex = skin((c, w, h) => {
      c.fillStyle = '#2a9a3a'
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#d8ffb0'
      c.fillRect(0, h * 0.05, w, h * 0.54)
      c.fillStyle = '#e8283a'
      c.fillRect(0, h * 0.08, w, h * 0.48)
      c.fillStyle = '#1a1a1a'
      for (let i = 0; i < 40; i++) {
        c.beginPath()
        c.ellipse((i * 131) % w, h * 0.14 + ((i * 37) % (h * 0.36)), 4, 7, 0, 0, Math.PI * 2)
        c.fill()
      }
    })
    const ring = mesh(new TorusGeometry(0.82, 0.3, 18, 40), tex, 0, 0.3, SEAT_Z)
    ring.rotation.x = -Math.PI / 2
    g.add(ring)
    g.add(mesh(new CylinderGeometry(0.85, 0.85, 0.1, 32), plastic('#2a9a3a'), 0, 0.05, SEAT_Z))
    const seat = plastic('#2fb84a')
    g.add(mesh(new BoxGeometry(0.55, 0.38, 0.46), seat, 0, SEAT_Y - 0.19, SEAT_Z))
    const rest = mesh(new BoxGeometry(0.6, 0.5, 0.14), seat, 0, SEAT_Y + 0.16, SEAT_Z - 0.3)
    rest.rotation.x = -0.2
    g.add(rest)
    return g
  },

  // White shuttle: swept wings, a tail fin, dark nose, blue stripe.
  plane() {
    const g = new Group()
    const tex = twoTone('#f4f6fa', '#dfe4ec', (c, w, h) => {
      c.fillStyle = '#2a5ae8'
      c.fillRect(0, h * 0.04, w * 0.85, h * 0.05)
      c.fillRect(0, h * 0.41, w * 0.85, h * 0.05)
      c.fillStyle = '#1a1a22'
      c.fillRect(w * 0.86, 0, w * 0.14, h)
    })
    g.add(hull({ length: 4.2, width: 0.9, depth: 0.28, deck: 0.2, sheer: 0.08, sharp: 0.45 }, tex))
    const wing = plastic('#e8ecf2')
    const trim = plastic('#2a5ae8')
    for (const side of [-1, 1]) {
      const w = mesh(new BoxGeometry(1.25, 0.06, 0.95), wing, side * 0.78, 0.3, -0.75)
      w.rotation.y = side * 0.45
      g.add(w)
      const tip = mesh(new BoxGeometry(0.12, 0.08, 0.6), trim, side * 1.35, 0.32, -1.05)
      tip.rotation.y = side * 0.45
      g.add(tip)
      const stab = mesh(new BoxGeometry(0.6, 0.05, 0.35), wing, side * 0.38, 0.42, -2)
      stab.rotation.y = side * 0.3
      g.add(stab)
    }
    const fin = mesh(new BoxGeometry(0.07, 0.7, 0.6), wing, 0, 0.75, -1.95)
    fin.rotation.x = 0.35
    const flame = mesh(new CylinderGeometry(0.1, 0.13, 0.25, 12), plastic('#ff7a1a', { emissive: '#ff5a1a', emissiveIntensity: 0.5 }), 0, 0.3, -2.25)
    flame.rotation.x = Math.PI / 2
    g.add(fin, mesh(new BoxGeometry(0.08, 0.12, 0.5), trim, 0, 1.05, -2.05), flame)
    chair(g, SEAT_Z, '#e8283a', '#ffffff')
    chair(g, -1.15, '#ffffff', '#e8283a')
    return g
  },

  // A penguin on its belly: black back, white belly, head and orange beak at the bow, flippers out.
  penguin() {
    const g = new Group()
    g.add(hull({ length: 3.8, width: 1, depth: 0.3, deck: 0.22, sheer: 0.06, sharp: 0.4 }, twoTone('#1a1a22', '#f4f4f4')))
    const black = plastic('#1a1a22')
    ball(g, 0.36, black, [0, 0.6, 1.55], [1, 0.95, 1.1])
    ball(g, 0.26, plastic('#f4f4f4'), [0, 0.52, 1.75], [1, 0.9, 0.7])
    const beak = mesh(new ConeGeometry(0.11, 0.42, 12), plastic('#ff8a1a'), 0, 0.5, 2.05)
    beak.rotation.x = Math.PI / 2 + 0.25
    g.add(beak)
    for (const side of [-1, 1]) {
      eye(g, [side * 0.17, 0.72, 1.82], side, 0.06)
      const flipper = mesh(new BoxGeometry(0.7, 0.06, 0.3), black, side * 0.72, 0.32, 0.3)
      flipper.rotation.set(0, side * -0.5, side * -0.25)
      g.add(flipper)
      const foot = mesh(new BoxGeometry(0.2, 0.06, 0.3), plastic('#ff8a1a'), side * 0.15, 0.3, -2.1)
      foot.rotation.y = side * 0.3
      g.add(foot)
    }
    seats(g, '#ff9a1a')
    return g
  },

  // Rubber duck: a fat yellow body, the head with an orange bill at the bow, the tail turned up.
  duck() {
    const g = new Group()
    const yellow = plastic('#ffd21a')
    g.add(hull({ length: 3.6, width: 1.3, depth: 0.34, deck: 0.18, sheer: 0.2, sharp: 0.28 }, twoTone('#ffd21a', '#f2bc0a')))
    ball(g, 0.5, yellow, [0, 0.95, 1.35], [1, 0.95, 0.95])
    ball(g, 0.2, plastic('#ff8a1a'), [0, 0.86, 1.86], [1.2, 0.45, 1.3])
    for (const side of [-1, 1]) eye(g, [side * 0.22, 1.08, 1.72], side, 0.08)
    const tail = mesh(new ConeGeometry(0.25, 0.55, 14), yellow, 0, 0.62, -1.75)
    tail.rotation.x = -0.9
    g.add(tail)
    for (const side of [-1, 1]) ball(g, 0.3, yellow, [side * 0.6, 0.42, -0.4], [0.5, 0.6, 1.5])
    seats(g, '#ffffff', '#ffffff', SEAT_Y + 0.04)
    return g
  },

  // White horse: the head and rainbow mane rising at the bow, a rainbow tail at the stern.
  horse() {
    const g = new Group()
    const white = plastic('#f6f6fa')
    g.add(hull({ length: 3.8, width: 1, depth: 0.3, deck: 0.18, sheer: 0.12, sharp: 0.45 }, twoTone('#f6f6fa', '#e2e2ea')))
    const neck = mesh(new BoxGeometry(0.4, 0.8, 0.42), white, 0, 0.8, 1.45)
    neck.rotation.x = 0.35
    const head = mesh(new BoxGeometry(0.42, 0.42, 0.75), white, 0, 1.2, 1.75)
    head.rotation.x = 0.2
    g.add(neck, head, mesh(new BoxGeometry(0.36, 0.3, 0.25), plastic('#ffc0d8'), 0, 1.08, 2.1))
    for (const side of [-1, 1]) {
      eye(g, [side * 0.21, 1.3, 1.72], side, 0.065)
      g.add(mesh(new ConeGeometry(0.07, 0.22, 8), white, side * 0.13, 1.5, 1.55))
    }
    const rainbow = ['#ff3a4a', '#ff9a1a', '#ffe21a', '#3ad84a', '#2aa8ff', '#8a4ae8']
    rainbow.forEach((c, i) => {
      const mane = mesh(new BoxGeometry(0.1, 0.28, 0.22), plastic(c), 0, 1.45 - i * 0.13, 1.5 - i * 0.07)
      mane.rotation.x = 0.35
      const tail = mesh(new BoxGeometry(0.08 + i * 0.01, 0.08, 0.5), plastic(c), (i - 2.5) * 0.06, 0.42 + i * 0.02, -2.05 - i * 0.03)
      tail.rotation.x = -0.5
      g.add(mane, tail)
    })
    seats(g, '#ff7ab8', '#2aa8ff')
    return g
  },

  // Toucan: black body, yellow throat, the huge red-orange-green beak at the bow, a tail at the stern.
  toucan() {
    const g = new Group()
    const black = plastic('#16161c')
    g.add(hull({ length: 3.8, width: 1, depth: 0.3, deck: 0.2, sheer: 0.1, sharp: 0.42 }, twoTone('#16161c', '#24242c')))
    ball(g, 0.38, black, [0, 0.75, 1.5])
    ball(g, 0.26, plastic('#ffe23a'), [0, 0.66, 1.68], [1.1, 0.9, 0.7])
    const beakSkin = skin((c, w, h) => {
      const grad = c.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#e8283a')
      grad.addColorStop(0.45, '#ff8a1a')
      grad.addColorStop(1, '#3ad84a')
      c.fillStyle = grad
      c.fillRect(0, 0, w, h)
    })
    const beak = mesh(new ConeGeometry(0.26, 1.25, 16), beakSkin, 0, 0.7, 2.35)
    beak.rotation.x = Math.PI / 2 + 0.15
    beak.scale.set(0.85, 1, 1.3) // deeper than wide
    g.add(beak)
    for (const side of [-1, 1]) eye(g, [side * 0.22, 0.86, 1.68], side, 0.06)
    const tail = mesh(new BoxGeometry(0.4, 0.06, 0.7), black, 0, 0.5, -2.1)
    tail.rotation.x = 0.35
    g.add(tail)
    seats(g, '#2a2a34', '#e8283a')
    return g
  },

  // Purple open canoe with two dark seats.
  shadow() {
    const g = new Group()
    const tex = skin((c, w, h) => {
      const grad = c.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#5a1ab8')
      grad.addColorStop(1, '#9a4ae8')
      c.fillStyle = grad
      c.fillRect(0, 0, w, h)
      c.fillStyle = '#3a0e7a'
      c.fillRect(0, h * 0.04, w, h * 0.42)
      c.fillStyle = '#c08aff'
      c.fillRect(0, 0, w, h * 0.03)
      c.fillRect(0, h * 0.47, w, h * 0.03)
    })
    g.add(hull({ length: 4.1, width: 1, depth: 0.36, deck: -0.2, sheer: 0.24, sharp: 0.5 }, tex))
    seats(g, '#2a2a34', '#3a3a46')
    return g
  },

  // Golden Dragon Kayak: the magenta pad's showcase boat (dragonKayak.js), the dragon's neck and
  // head rearing up at the bow. Its deck stands higher than the seat, so the paddler sits down
  // inside a cockpit on top.
  dragon() {
    const g = dragonKayak()
    cockpit(g, DRAGON_COCKPIT_Y, '#1a1206', '#ff8a1a')
    return g
  },
}

// A shop boat's model (not the raft), or null for an unknown id.
export function kayakModel(id) {
  return BUILD[id]?.() ?? null
}
