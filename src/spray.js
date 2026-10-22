// Water spray thrown off the surfing raft: one Points draw for the whole pool. A droplet's flight
// (launch velocity slowed by air drag, gravity, growing soft blob that fades) runs in the vertex
// shader from its spawn time, so spawning writes one slot and a frame only moves the clock. The
// pool is a ring: spawn() overwrites the oldest droplet.
import { BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial } from 'three'
import { PHYSICS, SURF } from './config.js'

const vertexShader = /* glsl */ `
attribute vec4 aStart; // world position, spawn time
attribute vec4 aVel; // world velocity, lifetime
attribute float aSize;
uniform float uTime;
uniform float uScale; // drawing-buffer height / (2 tan(fov / 2)): metres -> pixels at depth 1
uniform float uGravity;
varying float vFade;
varying float vSeed;
const float DRAG = 1.6;
void main() {
  float age = uTime - aStart.w;
  float t = clamp(age / aVel.w, 0.0, 1.0);
  float alive = step(0.0, age) * step(age, aVel.w);
  vec3 p = aStart.xyz + aVel.xyz * (1.0 - exp(-DRAG * age)) / DRAG;
  p.y += 0.5 * uGravity * age * age;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = aSize * (0.55 + 1.1 * t); // the blob spreads as it flies
  gl_PointSize = alive * size * uScale / max(-mv.z, 0.1);
  vFade = alive * (1.0 - t) * (1.0 - t) * smoothstep(0.0, 0.06, t);
  vSeed = fract(aStart.w * 13.7 + aSize * 7.1);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShade;
varying float vFade;
varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  // Lumpy outline so droplets read as splashes rather than perfect discs.
  float a = atan(q.y, q.x);
  float edge = 0.82 + 0.12 * sin(a * 5.0 + vSeed * 30.0) + 0.06 * sin(a * 9.0 - vSeed * 17.0);
  float r = length(q) / edge;
  if (r > 1.0 || vFade < 0.003) discard;
  float body = 1.0 - smoothstep(0.55, 1.0, r);
  vec3 col = mix(uShade, uColor, smoothstep(1.5, 0.2, length(q - vec2(-0.3, 0.35)))); // lit from the upper left
  float rim = smoothstep(0.6, 0.95, r) * 0.35; // a brighter edge, like light through a water sheet
  gl_FragColor = vec4(col + rim, body * vFade * 0.9);
}
`

export function createSpray() {
  const n = SURF.spray.max
  const start = new Float32Array(n * 4)
  const vel = new Float32Array(n * 4)
  const size = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    start[i * 4 + 3] = -1e3 // long dead
    vel[i * 4 + 3] = 1
  }
  const geometry = new BufferGeometry()
  const aStart = new BufferAttribute(start, 4)
  const aVel = new BufferAttribute(vel, 4)
  const aSize = new BufferAttribute(size, 1)
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3)) // unused; three needs it for the draw count
  geometry.setAttribute('aStart', aStart)
  geometry.setAttribute('aVel', aVel)
  geometry.setAttribute('aSize', aSize)
  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: 500 },
    uGravity: { value: PHYSICS.gravity },
    uColor: { value: new Color('#ffffff') },
    uShade: { value: new Color('#8fd3f0') }, // shadowed side, so droplets read against the white lane
  }
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: NormalBlending })
  const points = new Points(geometry, material)
  points.frustumCulled = false // droplets live anywhere; the dead ones cost nothing (size 0)
  points.renderOrder = 3

  let next = 0
  let time = 0
  let lo = n // slots written this frame, uploaded once in update()
  let hi = -1

  // One droplet at (x, y, z) flying off at (vx, vy, vz), living `life` s, `s` m across.
  function spawn(x, y, z, vx, vy, vz, life, s) {
    const i = next
    next = (next + 1) % n
    start.set([x, y, z, time], i * 4)
    vel.set([vx, vy, vz, life], i * 4)
    size[i] = s
    if (i < lo) lo = i
    if (i > hi) hi = i
  }

  function upload(attr, itemSize) {
    attr.clearUpdateRanges()
    attr.addUpdateRange(lo * itemSize, (hi - lo + 1) * itemSize)
    attr.needsUpdate = true
  }

  return {
    points,
    spawn,
    get time() {
      return time
    },
    // camera: for the metre -> pixel scale (the FOV changes while surfing).
    update(dt, camera, renderer) {
      time += dt
      uniforms.uTime.value = time
      uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360)) // canvas height = drawing buffer
      if (hi >= lo) {
        upload(aStart, 4)
        upload(aVel, 4)
        upload(aSize, 1)
        lo = n
        hi = -1
      }
    },
  }
}

