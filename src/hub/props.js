// Hub scenery: the big trees (the islet one with the hanging sign, south-west, west and east shores), the
// cliff-top pines, distant mountains, the rainbow and the two waterfalls, the RAPIDS AHEAD! billboard on the north-west meadow,
// the giant surfboards standing in the lake, the kayaker statue on the east hill and the clouds.
// The island's own fixtures are in island.js.
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { HUB_COLORS, MATERIAL_PBR } from '../config.js'
import { addBox } from '../colliders.js'
import { mulberry32, toTexture, waterfallTile } from '../textures.js'
import { AREA_PINES, BILLBOARD, GREEN_SURFBOARD, HANGING_SIGN, KAYAK_STATUE, LAKE, MOUNTAINS, PINES, RAINBOW, SURFBOARD, SW_TREE, TREE, W_TREE, E_TREE, WATERFALLS } from './layout.js'
import { plastic } from './materials.js'
import { markDynamic } from './batch.js'
import { billboardTexture, hangingSignTexture, surfboardTexture } from './signs.js'

function shadow(mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

const box = (w, h, d, material) => shadow(new Mesh(new BoxGeometry(w, h, d), material))

// Tapered cylinder from point a to point b.
function beam(a, b, r0, r1, material, sides = 7) {
  const from = new Vector3(...a)
  const to = new Vector3(...b)
  const dir = to.clone().sub(from)
  const m = shadow(new Mesh(new CylinderGeometry(r1, r0, dir.length(), sides), material))
  m.position.copy(from).addScaledVector(dir, 0.5)
  m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()))
  return m
}

// Big low-poly tree; `cfg.branchTo` adds the long branch carrying the hanging sign.
function buildTree(group, cfg) {
  const bark = plastic(HUB_COLORS.trunk, { flatShading: true })
  const { x, z, base, height, lean, scale: k } = cfg
  const tx = x + lean[0]
  const tz = z + lean[1]
  group.add(beam([x, base, z], [tx, height, tz], 0.95 * k, 0.55 * k, bark))
  // Roots flaring into the islet.
  for (const [dx, dz] of [[0.9, 0.3], [-0.7, 0.6], [0.2, -0.9], [-0.5, -0.6]]) {
    group.add(beam([x + dx * 1.6 * k, base, z + dz * 1.6 * k], [x, base + 1.3 * k, z], 0.32 * k, 0.5 * k, bark, 6))
  }
  // Two crown branches (plus, on the sign tree, the long branch out toward the slide).
  group.add(beam([tx, height * 0.95, tz], [tx - 2.4 * k, height + 1.2 * k, tz + 1.6 * k], 0.4 * k, 0.2 * k, bark))
  group.add(beam([tx, height * 0.95, tz], [tx + 1.4 * k, height + 1.6 * k, tz - 2.6 * k], 0.38 * k, 0.2 * k, bark))
  addBox(x - 0.8 * k, x + 0.8 * k, base, height, z - 0.8 * k, z + 0.8 * k)

  // Low-poly canopy blobs around the crown, reaching out over the sign branch.
  const leaves = plastic(HUB_COLORS.leaves, { flatShading: true })
  const leavesDark = plastic(HUB_COLORS.leavesDark, { flatShading: true })
  const blobs = [
    [-0.4, 1.6, 0.2, 3.2, leaves],
    [1.8, 1.1, -2.6, 2.5, leavesDark],
    [-2.6, 0.9, 2.0, 2.8, leavesDark],
    [-1.6, 2.6, -1.8, 2.6, leaves],
    [1.2, 2.4, 1.4, 2.3, leaves],
    [-3.4, 2.2, -0.6, 2.2, leaves],
    [3.4, 1.1, -3.4, 2.4, leaves],
    [4.8, 1.4, -4.8, 2.0, leavesDark],
    [0.6, 0.2, -0.8, 2.6, leaves],
  ]
  for (const [cx, cy, cz, r, mat] of blobs) {
    const m = shadow(new Mesh(new IcosahedronGeometry(r * k, 1), mat))
    m.position.set(tx + cx * k, height + cy * k, tz + cz * k)
    m.scale.y = 0.75
    group.add(m)
  }
  if (cfg.branchTo) buildSignBranch(group, cfg, bark, leaves)
}

// The sign tree's long branch, a palm sprout on its tip and the hanging sign below it.
function buildSignBranch(group, cfg, bark, leaves) {
  const { x, z, height, lean, scale: k } = cfg
  const [bx, by, bz] = cfg.branchTo
  group.add(beam([x + lean[0] * 0.7, height * 0.7, z + lean[1] * 0.7], [bx, by, bz], 0.45 * k, 0.22 * k, bark))
  // Little palm sprout on the end of the sign branch.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    group.add(beam([bx, by, bz], [bx + Math.cos(a) * 0.9 * k, by + (0.5 + (i % 2) * 0.3) * k, bz + Math.sin(a) * 0.9 * k], 0.07 * k, 0.03 * k, leaves, 4))
  }

  // The hanging sign: a dark gold-framed board on two ropes.
  const s = HANGING_SIGN
  const face = new MeshStandardMaterial({ map: hangingSignTexture(), ...MATERIAL_PBR.PLASTIC })
  const edge = plastic(HUB_COLORS.signBoard)
  const sign = new Group()
  sign.add(new Mesh(new BoxGeometry(s.w, s.h, 0.3), [edge, edge, edge, edge, face, face]))
  sign.children[0].castShadow = true
  const rope = plastic('#4a3020')
  const ropeTop = by - 0.1 - s.y
  for (const side of [-1, 1]) {
    const r = new Mesh(new CylinderGeometry(0.05, 0.05, ropeTop - s.h / 2, 5), rope)
    r.position.set(side * s.w * 0.38, s.h / 2 + (ropeTop - s.h / 2) / 2, 0)
    sign.add(r)
  }
  sign.position.set(s.x, s.y, s.z)
  sign.rotation.y = s.yaw
  group.add(sign)
}

function buildBillboard(group) {
  const b = BILLBOARD
  const sign = new Group()
  const bezel = plastic(HUB_COLORS.bezel)
  sign.add(box(b.w + 0.36, b.h + 0.36, 0.3, bezel))
  sign.children[0].position.y = b.bottom + b.h / 2
  const tex = billboardTexture()
  const screen = new Mesh(
    new PlaneGeometry(b.w, b.h),
    new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.35, ...MATERIAL_PBR.PLASTIC }),
  )
  screen.position.set(0, b.bottom + b.h / 2, 0.16)
  sign.add(screen)
  for (const side of [-1, 1]) {
    const leg = box(0.3, b.bottom + 0.2, 0.3, bezel)
    leg.position.set(side * b.w * 0.35, (b.bottom + 0.2) / 2, 0)
    sign.add(leg)
  }
  sign.position.set(b.x, b.base, b.z)
  sign.rotation.y = b.yaw
  group.add(sign)
  const hw = b.w / 2 + 0.2
  addBox(b.x - hw * Math.abs(Math.cos(b.yaw)) - 0.3, b.x + hw * Math.abs(Math.cos(b.yaw)) + 0.3, b.base, b.base + b.bottom + b.h + 0.2, b.z - hw * Math.abs(Math.sin(b.yaw)) - 0.3, b.z + hw * Math.abs(Math.sin(b.yaw)) + 0.3)
}

// Giant surfboard standing in the lake: a lens outline (tail wider than the pointed nose)
// extruded with a rounded rail. `cfg`: x, z, base, length, width, lean, yaw.
export function buildSurfboard(group, cfg, colors) {
  const { length: L, width: W } = cfg
  const shape = new Shape()
  const N = 24
  const pts = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const hw = (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.88 + 0.1)), 0.6)
    pts.push([hw, t * L])
  }
  shape.moveTo(0, 0)
  for (const [hw, y] of pts) shape.lineTo(hw, y)
  for (let i = pts.length - 1; i >= 0; i--) shape.lineTo(-pts[i][0], pts[i][1])
  const geo = new ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 })
  // Map the deck art over the whole outline.
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, pos.getY(i) / L)
  const board = shadow(new Mesh(geo, new MeshStandardMaterial({ map: surfboardTexture(colors), ...MATERIAL_PBR.PLASTIC, roughness: 0.45 })))
  board.position.z = -0.05
  const holder = new Group()
  holder.add(board)
  holder.position.set(cfg.x, cfg.base, cfg.z)
  holder.rotation.set(cfg.lean, cfg.yaw, 0, 'YXZ')
  group.add(holder)
  addBox(cfg.x - 0.45, cfg.x + 0.45, cfg.base, cfg.base + L, cfg.z - 0.3, cfg.z + 0.25)
}

// Blocky kayaker statue: orange kayak with a yellow deck stripe, a Roblox-style paddler in a
// black jacket and orange hair, holding a long yellow paddle across the boat.
function buildKayakStatue(group) {
  const k = new Group()
  const hull = shadow(new Mesh(new SphereGeometry(1, 32, 14), plastic(HUB_COLORS.kayak, { roughness: 0.45 })))
  hull.scale.set(2.3, 0.42, 0.62)
  const deck = shadow(new Mesh(new SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2), plastic(HUB_COLORS.kayakDeck, { roughness: 0.45 })))
  deck.scale.set(2.15, 0.22, 0.5)
  deck.position.y = 0.12
  const cockpit = new Mesh(new CylinderGeometry(0.42, 0.42, 0.12, 20), plastic('#1a1a1a'))
  cockpit.scale.z = 0.8
  cockpit.position.y = 0.3
  k.add(hull, deck, cockpit)

  const jacket = plastic(HUB_COLORS.jacket)
  const torso = box(0.85, 0.9, 0.45, jacket)
  torso.position.y = 0.8
  const shirt = box(0.3, 0.86, 0.02, plastic(HUB_COLORS.shirt))
  shirt.position.set(0, 0.8, 0.235)
  const head = box(0.52, 0.52, 0.52, plastic(HUB_COLORS.statueHead))
  head.position.y = 1.53
  const hair = box(0.6, 0.24, 0.6, plastic(HUB_COLORS.statueHair))
  hair.position.set(0, 1.84, -0.03)
  const fringe = box(0.6, 0.16, 0.2, plastic(HUB_COLORS.statueHair))
  fringe.position.set(0, 1.72, 0.22)
  const person = new Group()
  person.add(torso, shirt, head, hair, fringe)
  for (const side of [-1, 1]) {
    const arm = box(0.3, 0.3, 0.9, jacket)
    arm.position.set(side * 0.55, 1.0, 0.38)
    person.add(arm)
  }
  // Paddle held across the body, tipped like mid-stroke.
  const paddle = new Group()
  const shaft = new Mesh(new CylinderGeometry(0.05, 0.05, 4.2, 8), plastic(HUB_COLORS.paddle))
  shaft.rotation.z = Math.PI / 2
  paddle.add(shaft)
  for (const side of [-1, 1]) {
    const blade = box(0.6, 0.06, 0.3, plastic(HUB_COLORS.paddle))
    blade.position.x = side * 2.25
    paddle.add(blade)
  }
  paddle.position.set(0, 1.05, 0.8)
  paddle.rotation.z = 0.28
  person.add(paddle)
  person.rotation.y = -Math.PI / 2 // faces the kayak's nose (-X)
  person.position.y = 0.05
  k.add(person)

  k.scale.setScalar(KAYAK_STATUE.scale)
  k.position.set(KAYAK_STATUE.x, KAYAK_STATUE.y, KAYAK_STATUE.z)
  k.rotation.y = KAYAK_STATUE.yaw
  group.add(k)
}

// Puffy cartoon clouds ringing the hub, unaffected by fog.
function buildClouds(group) {
  const rand = mulberry32(77)
  const mat = new MeshStandardMaterial({ color: HUB_COLORS.cloud, emissive: '#dff4ff', emissiveIntensity: 0.55, roughness: 1, fog: false })
  const geo = new SphereGeometry(1, 18, 12)
  for (let c = 0; c < 18; c++) {
    const a = (c / 18) * Math.PI * 2 + rand() * 0.3
    const dist = 170 + rand() * 160
    const cloud = new Group()
    const puffs = 5 + Math.floor(rand() * 4)
    const size = 7 + rand() * 7
    for (let i = 0; i < puffs; i++) {
      const p = new Mesh(geo, mat)
      const r = size * (0.55 + rand() * 0.5)
      p.scale.set(r, r * 0.7, r * 0.8)
      p.position.set((i - puffs / 2) * size * 0.75 + rand() * size * 0.3, rand() * size * 0.35, rand() * size * 0.4)
      cloud.add(p)
    }
    cloud.position.set(Math.sin(a) * dist, 45 + rand() * 70, -Math.cos(a) * dist)
    cloud.lookAt(0, cloud.position.y, 0)
    group.add(cloud)
  }
}

// Stacked-cone pines on the cliff tops and the slide-area terraces (`snow` tips the cones white).
function buildPines(group) {
  const trunk = plastic(HUB_COLORS.trunk)
  const snowMat = plastic(HUB_COLORS.snow, { flatShading: true })
  for (const { x, z, base, height, radius, color = '#2f9a3a', snow } of PINES.concat(AREA_PINES)) {
    const green = plastic(color, { flatShading: true })
    group.add(beam([x, base, z], [x, base + height * 0.3, z], 0.5, 0.4, trunk))
    for (let i = 0; i < 3; i++) {
      const r = radius * (1 - i * 0.25)
      const h = height * 0.42
      const y = base + height * 0.3 + i * height * 0.22 + h / 2
      const cone = shadow(new Mesh(new ConeGeometry(r, h, 8), green))
      cone.position.set(x, y, z)
      group.add(cone)
      if (snow) {
        const tip = shadow(new Mesh(new ConeGeometry(r * 0.55, h * 0.55, 8), snowMat))
        tip.position.set(x, y + h * 0.24, z)
        group.add(tip)
      }
    }
  }
}

// Distant grey-blue peaks with snowy caps; the fog softens them into the horizon.
function buildMountains(group) {
  const rock = plastic('#7f93b5', { flatShading: true })
  const snow = plastic('#eef4ff', { flatShading: true })
  for (const m of MOUNTAINS) {
    const peak = new Mesh(new ConeGeometry(m.r, m.h, 7), rock)
    peak.position.set(m.x, LAKE.bed + m.h / 2, m.z)
    const cap = new Mesh(new ConeGeometry(m.r * 0.28, m.h * 0.28, 7), snow)
    cap.position.set(m.x, LAKE.bed + m.h * 0.86 + 0.5, m.z)
    group.add(peak, cap)
  }
}

// Seven-band rainbow arching between two feet, standing in a vertical plane.
function buildRainbow(group) {
  const [ax, az] = RAINBOW.from
  const [bx, bz] = RAINBOW.to
  const span = Math.hypot(bx - ax, bz - az) / 2
  const g = new Group()
  g.position.set((ax + bx) / 2, LAKE.y, (az + bz) / 2)
  g.rotation.y = -Math.atan2(bz - az, bx - ax)
  const bands = ['#ff3b3b', '#ff9a1a', '#ffe11a', '#4fe03a', '#2fc6ff', '#3b6bff', '#a94bff']
  bands.forEach((c, i) => {
    const r = span - i * (RAINBOW.width / bands.length)
    const arc = new Mesh(
      new TorusGeometry(r, RAINBOW.width / bands.length / 2, 6, 64, Math.PI),
      new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, fog: false }),
    )
    g.add(arc)
  })
  group.add(g)
}

// Waterfalls: a scrolling sheet of falling water down the cliff face, white foam where it lands
// and a soft mist puff. Returns per-frame updates.
function buildWaterfalls(group, animated) {
  for (const w of WATERFALLS) {
    const g = new Group()
    g.position.set(w.x, 0, w.z)
    g.rotation.y = w.yaw
    const drop = w.top - LAKE.y
    const tex = toTexture(waterfallTile('#7fdcff'), { repeat: [w.width / 4, drop / 6] })
    const sheet = new Mesh(
      new PlaneGeometry(w.width, drop),
      new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.55, transparent: true, opacity: 0.92, ...MATERIAL_PBR.WATER }),
    )
    sheet.position.set(0, LAKE.y + drop / 2, 0.35)
    g.add(sheet)
    const foamMat = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })
    const rand = mulberry32(Math.round(w.x * 7 + w.z))
    const puffs = []
    for (let i = 0; i < 9; i++) {
      const p = new Mesh(new SphereGeometry(0.6 + rand() * 0.7, 12, 8), foamMat)
      p.position.set((rand() - 0.5) * w.width, LAKE.y + 0.1, 0.8 + rand() * 1.6)
      p.scale.y = 0.45
      puffs.push([p, rand() * 6])
      g.add(p)
    }
    const mist = new Mesh(new SphereGeometry(1, 16, 10), new MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.25, depthWrite: false }))
    mist.scale.set(w.width * 0.8, 2.2, 2.5)
    mist.position.set(0, LAKE.y + 1, 1.5)
    g.add(mist)
    group.add(g)
    markDynamic(...puffs.map(([p]) => p))
    animated.push((t, dt) => {
      tex.offset.y += dt * 0.9 // falling
      for (const [p, ph] of puffs) p.scale.setScalar(0.9 + Math.sin(t * 4 + ph) * 0.15).setY(0.45)
    })
  }
}

export function createProps() {
  const group = new Group()
  const animated = []
  buildTree(group, TREE)
  buildTree(group, SW_TREE)
  buildTree(group, W_TREE)
  buildTree(group, E_TREE)
  buildPines(group)
  buildMountains(group)
  buildRainbow(group)
  buildWaterfalls(group, animated)
  buildBillboard(group)
  buildSurfboard(group, SURFBOARD)
  buildSurfboard(group, GREEN_SURFBOARD, { base: HUB_COLORS.surfGreen, stripe: HUB_COLORS.surfYellow, tail: '#2b2f2b' })
  buildKayakStatue(group)
  buildClouds(group)
  let t = 0
  return {
    group,
    update(dt) {
      t += dt
      for (const fn of animated) fn(t, dt)
    },
  }
}
