// The equipped Trails Shop trail (trails.js, config KAYAK_SHOP.trails / .trail): a glowing ribbon
// streaming off the boat's stern, lying just over the water (or the slide). A new point is dropped
// every `spacing` m travelled, each keeping the boat's sideways direction from when it was dropped;
// points live `life` s, narrowing and fading as they age, so the ribbon shrinks away when the boat
// stops. The head point is pinned to the stern every frame. One mesh, rebuilt per frame from the
// point list; colour runs head to tail through the trail's `colors` (or a scrolling rainbow) in the
// shader, with soft edges across the width; normal blending keeps the hue true over the bright water. Hidden while no trail is equipped.
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, Quaternion, ShaderMaterial, Vector3 } from 'three'
import { KAYAK_SHOP } from './config.js'
import { trails } from './trails.js'

const { width, life, spacing, sternZ, lift, opacity } = KAYAK_SHOP.trail
const MAX = 64 // points kept; at `spacing` this is far longer than a `life` of paddling
const JUMP = 6 // m: the stern moving further than this in a frame (teleport, respawn) starts afresh

const vertex = /* glsl */ `
attribute float aFade;
attribute float aSide;
attribute float aT;
varying float vFade;
varying float vSide;
varying float vT;
void main() {
  vFade = aFade;
  vSide = aSide;
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragment = /* glsl */ `
uniform vec3 uHead;
uniform vec3 uTail;
uniform float uRainbow;
uniform float uTime;
uniform float uOpacity;
varying float vFade;
varying float vSide;
varying float vT;
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
void main() {
  vec3 col = mix(uHead, uTail, vT);
  col = mix(col, hue(fract(vT * 1.4 - uTime * 0.6)), uRainbow);
  float edge = 1.0 - pow(abs(vSide * 2.0 - 1.0), 2.5); // soft sides
  float core = smoothstep(0.55, 1.0, edge) * (1.0 - vT); // a brighter streak down the middle near the boat
  gl_FragColor = vec4(col + core * 0.35, edge * vFade * uOpacity);
}`

export function createBoatTrail() {
  const pos = new Float32Array(MAX * 2 * 3)
  const fade = new Float32Array(MAX * 2)
  const side = new Float32Array(MAX * 2)
  const along = new Float32Array(MAX * 2)
  for (let i = 0; i < MAX; i++) side.set([0, 1], i * 2)
  const index = []
  for (let i = 0; i < MAX - 1; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aFade', new BufferAttribute(fade, 1))
  geo.setAttribute('aSide', new BufferAttribute(side, 1))
  geo.setAttribute('aT', new BufferAttribute(along, 1))
  geo.setIndex(index)
  const uniforms = {
    uHead: { value: new Color() },
    uTail: { value: new Color() },
    uRainbow: { value: 0 },
    uTime: { value: 0 },
    uOpacity: { value: opacity },
  }
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, depthWrite: false, side: DoubleSide })
  const mesh = new Mesh(geo, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 2 // over the water

  // Newest first: { x, y, z, rx, rz (sideways, unit), age }. points[0] follows the stern.
  let points = []
  const stern = new Vector3()
  const right = new Vector3()
  const turn = new Quaternion()

  function recolour(id) {
    const t = id && trails.trail(id)
    mesh.visible = !!t
    points = []
    if (!t) return
    const rainbow = t.colors === 'rainbow'
    uniforms.uRainbow.value = rainbow ? 1 : 0
    if (!rainbow) {
      uniforms.uHead.value.set(t.colors[0])
      uniforms.uTail.value.set(t.colors[1])
    }
  }
  recolour(trails.equipped)
  trails.onEquip(recolour)

  // boat: the raft group (raft.js), after the player group is placed for this frame.
  function update(dt, boat) {
    if (!mesh.visible) return
    uniforms.uTime.value += dt
    boat.updateWorldMatrix(true, false)
    stern.set(0, lift, sternZ)
    boat.localToWorld(stern)
    right.set(1, 0, 0).applyQuaternion(boat.getWorldQuaternion(turn))
    right.y = 0
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    right.normalize()

    for (const p of points) p.age += dt
    const head = points[0]
    if (head && Math.hypot(stern.x - head.x, stern.y - head.y, stern.z - head.z) > JUMP) points = []
    if (!points.length) points.push({ x: stern.x, y: stern.y, z: stern.z, rx: right.x, rz: right.z, age: 0 })
    // Drop a fixed point once the stern is `spacing` past the last one; points[0] stays live.
    const last = points[1] ?? points[0]
    if (Math.hypot(stern.x - last.x, stern.z - last.z) >= spacing || points.length === 1) points.splice(1, 0, { ...points[0], age: 0 })
    Object.assign(points[0], { x: stern.x, y: stern.y, z: stern.z, rx: right.x, rz: right.z, age: 0 })
    while (points.length > MAX || (points.length > 1 && points[points.length - 1].age > life)) points.pop()

    const n = points.length
    for (let i = 0; i < n; i++) {
      const p = points[i]
      const k = Math.min(1, p.age / life)
      const w = (width / 2) * (1 - k) ** 0.6
      pos.set([p.x - p.rx * w, p.y, p.z - p.rz * w, p.x + p.rx * w, p.y, p.z + p.rz * w], i * 6)
      const f = (1 - k) ** 1.4
      fade[i * 2] = fade[i * 2 + 1] = f
      along[i * 2] = along[i * 2 + 1] = k
    }
    geo.setDrawRange(0, Math.max(0, n - 1) * 6)
    geo.attributes.position.needsUpdate = true
    geo.attributes.aFade.needsUpdate = true
    geo.attributes.aT.needsUpdate = true
  }

  return { mesh, update }
}
