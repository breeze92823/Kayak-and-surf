// The Lunar New Year gate as the reference shows it: a pale pink platform with a red carpet up
// to a lion-dance head on a red stand, pale back wall with red lattice panels, pink pillars and
// lintel, a round-topped pink crest holding the moon window, two big swept pink roof wings
// curling up at the tips, a string of red and yellow lanterns with tassels under them,
// firecracker strings and gold-framed diamond plaques at the wing tips, cherry-blossom trees in
// red pots in front, and a bunch of red star / sun / heart and yellow balloons tied at each front
// corner, rising over the roofs. Local frame: the front faces +Z, `size` metres wide (the wings
// reach a little past it), feet at y 0. Returns { group, update(t) }: lanterns and balloons sway.
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import { mulberry32 } from '../textures.js'
import { markDynamic } from './batch.js'
import { neon, plastic } from './materials.js'
import { tube } from './sculpt.js'

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new Mesh(geo, material)
  m.castShadow = true
  m.receiveShadow = true
  m.position.set(x, y, z)
  return m
}

const UP = new Vector3(0, 1, 0)

// Thin rod between two points (strings, ropes).
function rod(material, a, b, r = 0.025) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]
  const len = Math.hypot(dx, dy, dz)
  const m = mesh(new CylinderGeometry(r, r, len, 4), material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  m.quaternion.setFromUnitVectors(UP, new Vector3(dx / len, dy / len, dz / len))
  m.castShadow = false
  return m
}

function starShape(r, inner = 0.45) {
  const s = new Shape()
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * inner : r
    s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr)
  }
  return s
}

function heartShape(r) {
  const s = new Shape()
  s.moveTo(0, -r)
  s.bezierCurveTo(-r * 0.2, -r * 0.6, -r * 1.1, -r * 0.3, -r * 1.05, r * 0.25)
  s.bezierCurveTo(-r, r * 0.85, -r * 0.25, r * 0.95, 0, r * 0.45)
  s.bezierCurveTo(r * 0.25, r * 0.95, r, r * 0.85, r * 1.05, r * 0.25)
  s.bezierCurveTo(r * 1.1, -r * 0.3, r * 0.2, -r * 0.6, 0, -r)
  return s
}

// A sun: round face and eight pointed rays.
function sunShapes(r) {
  const face = new Shape().absarc(0, 0, r * 0.55, 0, Math.PI * 2)
  const rays = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const w = 0.22
    rays.push(
      new Shape()
        .moveTo(Math.cos(a - w) * r * 0.62, Math.sin(a - w) * r * 0.62)
        .lineTo(Math.cos(a) * r, Math.sin(a) * r)
        .lineTo(Math.cos(a + w) * r * 0.62, Math.sin(a + w) * r * 0.62),
    )
  }
  return [face, ...rays]
}

// Big swept roof wing on side ±1: rises from the crest, sweeps out and down, and curls up at the tip.
function wingShape(side, s) {
  const k = s / 10
  const pts = (x, y) => [side * x * k, y * k]
  const sh = new Shape()
  sh.moveTo(...pts(1.3, 8.4))
  sh.quadraticCurveTo(...pts(3.4, 8.2), ...pts(4.85, 6.9))
  sh.quadraticCurveTo(...pts(5.45, 6.4), ...pts(5.95, 6.95))
  sh.lineTo(...pts(5.75, 5.75))
  sh.quadraticCurveTo(...pts(5.0, 5.55), ...pts(4.2, 6.0))
  sh.quadraticCurveTo(...pts(2.8, 6.9), ...pts(1.3, 7.15))
  sh.closePath()
  return sh
}

export function lunarGate(size) {
  const s = size
  const half = s / 2
  const g = new Group()
  const pink = neon('#ff2f8e', 0.3)
  const pinkLight = neon('#ff79bd', 0.35)
  const pinkDark = plastic('#cf1d72')
  const red = plastic('#d81b2b')
  const redGlow = neon('#ff2b3b', 0.45)
  const yellow = neon('#ffd21a', 0.5)
  const gold = neon('#ffc21a', 0.45)
  const pale = plastic('#fff0f3')
  const floor = plastic('#f7d6df')
  const white = plastic('#ffffff')
  const string = plastic('#f4f4f4')

  // Platform, steps and the red carpet.
  const depth = s * 0.55
  g.add(mesh(new BoxGeometry(s + 0.6, 0.3, depth), floor, 0, 0.15, -0.2))
  g.add(mesh(new BoxGeometry(3, 0.15, 0.6), floor, 0, 0.075, depth / 2 + 0.05))
  g.add(mesh(new BoxGeometry(2.3, 0.04, depth + 0.4), red, 0, 0.32, 0))

  // Back wall with red lattice panels either side of the lion.
  g.add(mesh(new BoxGeometry(s - 2.6, 6.2, 0.3), pale, 0, 3.4, -2.3))
  for (const side of [-1, 1]) {
    const px = side * 2.15
    g.add(mesh(new BoxGeometry(1.7, 2.6, 0.1), red, px, 2.4, -2.1))
    g.add(mesh(new BoxGeometry(1.4, 2.3, 0.12), pale, px, 2.4, -2.08))
    for (let i = 0; i < 3; i++) g.add(mesh(new BoxGeometry(0.08, 2.3, 0.14), red, px - 0.45 + i * 0.45, 2.4, -2.06))
    for (let i = 0; i < 4; i++) g.add(mesh(new BoxGeometry(1.4, 0.08, 0.14), red, px, 1.5 + i * 0.6, -2.06))
  }

  // Pillars, side walls and the lintel.
  for (const side of [-1, 1]) {
    g.add(mesh(new BoxGeometry(0.9, 6.2, 1.0), pink, side * 3.3, 3.4, 0.9))
    g.add(mesh(new BoxGeometry(0.5, 6.0, 3.2), pinkLight, side * 3.3, 3.2, -0.9))
    g.add(mesh(new BoxGeometry(1.2, 0.3, 1.3), pinkDark, side * 3.3, 0.45, 0.9)) // foot
  }
  g.add(mesh(new BoxGeometry(7.4, 0.6, 1.1), pink, 0, 6.2, 0.9))
  g.add(mesh(new BoxGeometry(6.8, 0.5, 3.4), pinkLight, 0, 6.1, -0.8))

  // Round-topped crest with the moon window.
  const crest = new Group()
  crest.position.set(0, 6.4, 1.0)
  crest.add(mesh(new BoxGeometry(2.8, 1.5, 0.9), pink, 0, 0.75, 0))
  const cap = mesh(new CylinderGeometry(1.4, 1.4, 0.9, 32, 1, false, -Math.PI / 2, Math.PI), pink, 0, 1.5, 0)
  cap.rotation.x = Math.PI / 2
  crest.add(cap)
  const moon = new Group()
  moon.position.set(0, 1.5, 0.5)
  moon.add(mesh(new TorusGeometry(1.08, 0.16, 10, 40), pinkLight))
  const disc = mesh(new CylinderGeometry(1.0, 1.0, 0.1, 32), neon('#e0156b', 0.3))
  disc.rotation.x = Math.PI / 2
  moon.add(disc)
  for (const d of [-0.5, 0, 0.5]) {
    const l = 2 * Math.sqrt(1.0 * 1.0 - d * d)
    moon.add(mesh(new BoxGeometry(0.1, l, 0.14), pinkLight, d, 0, 0.04))
    moon.add(mesh(new BoxGeometry(l, 0.1, 0.14), pinkLight, 0, d, 0.04))
  }
  crest.add(moon)
  g.add(crest)

  // The two swept roof wings: bright pink faces, darker sides and underside.
  for (const side of [-1, 1]) {
    const geo = new ExtrudeGeometry(wingShape(side, s), { depth: 2.4, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2, curveSegments: 14 })
    geo.translate(0, 0, -1.2)
    const wing = new Mesh(geo, [pink, pinkDark])
    wing.position.z = 0.25
    wing.castShadow = wing.receiveShadow = true
    g.add(wing)
  }

  // Firecracker strings and gold-framed diamond plaques at the wing tips.
  const tipX = (s / 10) * 5.85
  for (const side of [-1, 1]) {
    const fx = side * tipX
    g.add(mesh(new SphereGeometry(0.16, 10, 8), gold, fx, 5.55, 1.2))
    for (let i = 0; i < 10; i++) {
      for (const lean of [-1, 1]) {
        const c = mesh(new CylinderGeometry(0.09, 0.09, 0.42, 8), redGlow, fx + lean * 0.16, 5.2 - i * 0.34 - (lean > 0 ? 0.17 : 0), 1.2)
        c.rotation.z = lean * 0.9
        g.add(c)
        const tip = mesh(new CylinderGeometry(0.095, 0.095, 0.07, 8), yellow, 0, 0.2, 0)
        c.add(tip)
      }
    }
    const plaque = new Group()
    plaque.position.set(side * (tipX - 0.75), 4.9, 1.6)
    plaque.rotation.z = Math.PI / 4
    plaque.add(mesh(new BoxGeometry(0.8, 0.8, 0.1), gold))
    plaque.add(mesh(new BoxGeometry(0.6, 0.6, 0.12), red, 0, 0, 0.02))
    g.add(plaque)
  }

  // Lion-dance head on its red stand at the back of the arch.
  g.add(mesh(new BoxGeometry(1.9, 0.8, 1.3), red, 0, 0.7, -1.4))
  g.add(mesh(new BoxGeometry(2.0, 0.12, 1.4), gold, 0, 1.12, -1.4))
  const lion = new Group()
  lion.position.set(0, 1.18, -1.3)
  lion.add(mesh(new BoxGeometry(1.5, 1.3, 1.1), redGlow, 0, 0.7, 0))
  lion.add(mesh(new BoxGeometry(1.65, 0.3, 0.4), gold, 0, 1.35, 0.25)) // brow band
  lion.add(mesh(new BoxGeometry(1.1, 0.28, 0.2), white, 0, 0.32, 0.58)) // mouth
  lion.add(mesh(new BoxGeometry(1.2, 0.12, 0.22), gold, 0, 0.5, 0.6))
  for (const side of [-1, 1]) {
    lion.add(mesh(new SphereGeometry(0.2, 12, 10), white, side * 0.36, 0.95, 0.55))
    lion.add(mesh(new SphereGeometry(0.09, 8, 6), plastic('#141414'), side * 0.36, 0.95, 0.73))
    for (let i = 0; i < 3; i++) lion.add(mesh(new SphereGeometry(0.17, 8, 6), white, side * 0.8, 0.3 + i * 0.4, 0.3))
  }
  lion.add(mesh(new SphereGeometry(0.18, 10, 8), gold, 0, 1.6, 0.2))
  g.add(lion)

  // Cherry-blossom trees in red pots in front: dark red branches tipped with white blossoms.
  const rand = mulberry32(31)
  const bark = plastic('#7a1a24')
  const blossom = plastic('#ffffff')
  const heart = neon('#ff7fb0', 0.4)
  for (const [tx, tz, th] of [[-2.4, 2.4, 2.5], [2.4, 2.4, 2.5], [-4.4, 1.9, 2.1], [4.4, 1.9, 2.1]]) {
    g.add(mesh(new CylinderGeometry(0.42, 0.34, 0.5, 12), red, tx, 0.55, tz))
    const top = [tx, 0.8 + th, tz]
    tube(g, bark, [[tx, 0.8, tz], [tx + 0.1, 0.8 + th * 0.5, tz], top], 0.09, 0.04)
    const tips = []
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + rand()
      const from = [tx, 0.8 + th * (0.35 + i * 0.12), tz]
      const tip = [tx + Math.cos(a) * 0.75, from[1] + 0.5 + rand() * 0.3, tz + Math.sin(a) * 0.4 + 0.15]
      tube(g, bark, [from, [(from[0] + tip[0]) / 2, (from[1] + tip[1]) / 2 + 0.1, (from[2] + tip[2]) / 2], tip], 0.05, 0.025)
      tips.push(from, tip)
    }
    tips.push(top)
    for (const [bx, by, bz] of tips) {
      for (let j = 0; j < 2; j++) {
        const x = bx + (rand() - 0.5) * 0.35
        const y = by + (rand() - 0.5) * 0.3
        const z = bz + 0.1 + rand() * 0.15
        const f = mesh(new SphereGeometry(0.15, 8, 6), blossom, x, y, z)
        f.scale.z = 0.5
        g.add(f)
        g.add(mesh(new SphereGeometry(0.05, 6, 4), heart, x, y, z + 0.07))
      }
    }
  }

  // Lantern string under the wings: red and yellow lanterns with gold caps and red tassels.
  const ropeY = 6.75
  g.add(rod(plastic('#5a1010'), [-2.7, ropeY, 1.7], [2.7, ropeY, 1.7], 0.03))
  const lanterns = []
  for (let i = 0; i < 7; i++) {
    const l = new Group()
    l.position.set(-2.25 + i * 0.75, ropeY, 1.7)
    const body = mesh(new SphereGeometry(0.33, 14, 10), i % 2 ? yellow : redGlow, 0, -0.45, 0)
    body.scale.y = 0.88
    l.add(body)
    l.add(mesh(new CylinderGeometry(0.16, 0.16, 0.1, 10), gold, 0, -0.13, 0))
    l.add(mesh(new CylinderGeometry(0.14, 0.14, 0.08, 10), gold, 0, -0.77, 0))
    l.add(mesh(new BoxGeometry(0.08, 0.42, 0.08), redGlow, 0, -1.02, 0))
    l.add(rod(plastic('#5a1010'), [0, 0, 0], [0, -0.13, 0], 0.02))
    g.add(l)
    lanterns.push(l)
  }

  // Balloon bunches tied at the front corners: [kind, colour, x, y, z] relative to the knot.
  const balloonRed = neon('#ff2236', 0.35)
  const balloonYellow = neon('#ffe23a', 0.4)
  const decal = neon('#ffd21a', 0.6)
  const BUNCHES = [
    [
      ['star', 0.2, 8.2, -0.6],
      ['star', -0.9, 7.6, -0.4],
      ['plain', -0.1, 9.1, -0.9],
      ['sun', 1.0, 7.8, -0.5],
      ['star', -0.6, 8.7, -0.8],
    ],
    [
      ['heart', -0.5, 9.1, -0.8],
      ['star', 0.5, 9.0, -0.7],
      ['heart', -0.9, 8.3, -0.5],
      ['sun', 0.8, 8.2, -0.5],
      ['plain', 0.1, 8.6, -1.0],
      ['star', -0.1, 7.7, -0.4],
    ],
  ]
  const bunches = []
  BUNCHES.forEach((list, b) => {
    const side = b ? 1 : -1
    const bunch = new Group()
    bunch.position.set(side * (half + 0.1), 0.35, 2.3)
    for (const [kind, x, y, z] of list) {
      const bx = x + side * 0.5
      const r = 0.6
      const balloon = new Group()
      balloon.position.set(bx, y + 1, z)
      if (kind === 'heart') {
        const geo = new ExtrudeGeometry(heartShape(r), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.18, bevelSegments: 3, curveSegments: 10 })
        geo.translate(0, 0, -0.175)
        balloon.add(mesh(geo, balloonRed))
        const d = mesh(new ShapeGeometry(heartShape(r * 0.45)), decal, 0, 0.05, 0.42)
        balloon.add(d)
      } else {
        const ball = mesh(new SphereGeometry(r, 18, 14), kind === 'plain' ? balloonYellow : balloonRed)
        ball.scale.y = 1.12
        balloon.add(ball)
        if (kind === 'star') balloon.add(mesh(new ShapeGeometry(starShape(r * 0.5)), decal, 0, 0.02, r * 0.97))
        if (kind === 'sun') balloon.add(mesh(new ShapeGeometry(sunShapes(r * 0.62)), decal, 0, 0.02, r * 0.97))
      }
      balloon.add(mesh(new CylinderGeometry(0.02, 0.08, 0.14, 6), kind === 'plain' ? balloonYellow : balloonRed, 0, -r * 1.12 - 0.04, 0))
      bunch.add(balloon)
      bunch.add(rod(string, [0, 0, 0], [bx, y + 1 - r * 1.12 - 0.1, z], 0.015))
    }
    g.add(bunch)
    bunches.push([bunch, side, b * 2.1])
  })

  markDynamic(...lanterns, ...bunches.map(([bunch]) => bunch))
  return {
    group: g,
    update(t) {
      lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 1.8 + i * 0.9) * 0.07))
      for (const [bunch, side, ph] of bunches) {
        bunch.rotation.z = side * 0.02 + Math.sin(t * 0.9 + ph) * 0.025
        bunch.rotation.x = Math.sin(t * 0.7 + ph) * 0.02
      }
    },
  }
}
