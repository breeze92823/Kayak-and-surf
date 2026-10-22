// Tiny modelling kit for the hub's showcase models (pets.js, eggs.js): shared unit geometries
// placed with position/scale/orientation, tapered tubes for necks, limbs and tails, and pointed
// blades for feathers, spikes and flames. Everything uses the cached plastic/neon materials, so
// `bake()` can merge a finished model down to one draw per material.
import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Mesh,
  OctahedronGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeStatic } from './batch.js'

export const SPHERE = new SphereGeometry(1, 14, 10)
export const SPHERE_LO = new SphereGeometry(1, 8, 6)
export const GEM = new OctahedronGeometry(1, 0)
// Cone with its base at the origin and its tip at +Y 1.
export const CONE = new ConeGeometry(1, 1, 8).translate(0, 0.5, 0)
// Pointed leaf / feather: a flattened spindle, base at the origin, tip at +Y 1, width 1.
export const BLADE = new LatheGeometry(
  [[0, 0], [0.32, 0.07], [0.5, 0.28], [0.44, 0.58], [0.24, 0.84], [0, 1]].map(([x, y]) => new Vector2(x, y)),
  8,
)

const _y = new Vector3()
const _z = new Vector3()
const _x = new Vector3()
const _m = new Matrix4()

export const v3 = (p) => (p.isVector3 ? p : new Vector3(p[0], p[1], p[2]))

function add(g, geo, material, pos) {
  const m = new Mesh(geo, material)
  m.castShadow = true
  m.receiveShadow = true
  if (pos) m.position.copy(v3(pos))
  g.add(m)
  return m
}

// Ellipsoid (or any unit geometry) at pos with per-axis radii; `rot` is an Euler triple.
export function ball(g, material, pos, scale, rot, geo = SPHERE) {
  const m = add(g, geo, material, pos)
  if (typeof scale === 'number') m.scale.setScalar(scale)
  else m.scale.set(scale[0], scale[1], scale[2])
  if (rot) m.rotation.set(rot[0], rot[1], rot[2])
  return m
}

// Orients a +Y-up unit part from `from` toward `to`; its local Z (the flat side of a blade)
// turns toward `face`.
function aim(m, from, to, face = [0, 0, 1]) {
  const a = v3(from)
  const b = v3(to)
  _y.subVectors(b, a)
  const len = _y.length()
  _y.divideScalar(len || 1)
  _z.copy(v3(face))
  _z.addScaledVector(_y, -_z.dot(_y))
  if (_z.lengthSq() < 1e-6) _z.set(_y.y, _y.z, _y.x).cross(_y)
  _z.normalize()
  _x.crossVectors(_y, _z)
  m.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z))
  m.position.copy(a)
  return len
}

// Feather / flame / leaf from `from` to `to`, `width` wide and `thick` deep.
export function blade(g, material, from, to, width, thick = 0.05, face) {
  const m = add(g, BLADE, material)
  const len = aim(m, from, to, face)
  m.scale.set(width, len, thick)
  return m
}

// Horn / claw / spike: a cone from base radius `r` at `from` to its tip at `to`.
export function spike(g, material, from, to, r, face) {
  const m = add(g, CONE, material)
  const len = aim(m, from, to, face)
  m.scale.set(r, len, r)
  return m
}

// Tube along a smooth curve through `points`, radius r0 at the start easing to r1 at the end,
// with round caps. Necks, legs, tails, horns.
export function tube(g, material, points, r0, r1 = r0, { radial = 8, seg, caps = true } = {}) {
  const curve = new CatmullRomCurve3(points.map(v3))
  const n = seg ?? Math.max(1, (points.length - 1) * 4)
  const frames = curve.computeFrenetFrames(n, false)
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  const p = new Vector3()
  const d = new Vector3()
  for (let i = 0; i <= n; i++) {
    const t = i / n
    curve.getPointAt(t, p)
    const r = r0 + (r1 - r0) * t
    const N = frames.normals[i]
    const B = frames.binormals[i]
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2
      d.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a))
      pos.push(p.x + d.x * r, p.y + d.y * r, p.z + d.z * r)
      nor.push(d.x, d.y, d.z)
      uv.push(j / radial, t)
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j
      const b = a + radial + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  const m = add(g, geo, material)
  if (caps) {
    ball(g, material, points[0], r0, null, SPHERE_LO)
    ball(g, material, points[points.length - 1], r1, null, SPHERE_LO)
  }
  return m
}

// A fan of feathers spreading from `root` in the plane spanned by `out` (along the fan's first
// feather) and `up` (its last): feather i of n points at angle a0..a1 (radians from `out`).
export function fan(g, material, root, { out, up, n, a0, a1, len, width, thick = 0.04, lift = 0 }) {
  const o = v3(out).normalize()
  const u = v3(up).normalize()
  const face = new Vector3().crossVectors(o, u)
  const r = v3(root)
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1)
    const a = a0 + (a1 - a0) * t
    const l = typeof len === 'function' ? len(t) : len
    const dir = o.clone().multiplyScalar(Math.cos(a)).addScaledVector(u, Math.sin(a))
    const from = r.clone().addScaledVector(face, lift * i)
    blade(g, material, from, from.clone().addScaledVector(dir, l), typeof width === 'function' ? width(t) : width, thick, face)
  }
}

// Merges a finished model's static parts into one mesh per material (moving parts flagged with
// markDynamic stay separate).
export function bake(group) {
  mergeStatic(group)
  return group
}
