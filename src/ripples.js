// Rings on the lake around the raft: a splash where the paddle bites, a wake trailing a moving
// raft, a slow lap while it drifts, a big ring on landing in the water. One InstancedMesh of flat
// quads drawn by a tiny shader (no textures); spawn() recycles the oldest ring, and a ring's
// growth and fade run on the GPU from its spawn time, so per frame only a clock uniform changes.
import { Color, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { HUB_COLORS, RIPPLES } from './config.js'
import { LAKE } from './hub/layout.js'

const vertexShader = /* glsl */ `
attribute vec3 aRipple; // spawn time, lifetime (s), strength
uniform float uTime;
varying vec2 vUv;
varying float vAge;
varying float vStrength;
void main() {
  vUv = uv * 2.0 - 1.0;
  vAge = clamp((uTime - aRipple.x) / aRipple.y, 0.0, 1.0);
  vStrength = aRipple.z;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vAge;
varying float vStrength;
void main() {
  float r = length(vUv);
  float radius = 0.15 + 0.85 * (1.0 - (1.0 - vAge) * (1.0 - vAge)); // eases out as it spreads
  float width = mix(0.2, 0.08, vAge);
  float ring = 1.0 - smoothstep(0.0, width, abs(r - radius));
  float trail = (1.0 - smoothstep(0.0, width * 2.5, abs(r - radius * 0.6))) * 0.45; // a fainter ring inside it
  float inner = (1.0 - smoothstep(0.0, radius, r)) * 0.35 * (1.0 - vAge); // a soft disc of churned water
  float a = min(1.0, ring + trail + inner) * (1.0 - vAge) * vStrength * step(r, 1.0);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}
`

export function createRipples() {
  const n = RIPPLES.max
  const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const data = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) data[i * 3 + 1] = 1 // lifetime 1 s, spawn time 0: already faded
  const attr = new InstancedBufferAttribute(data, 3)
  geometry.setAttribute('aRipple', attr)
  const uniforms = { uTime: { value: 0 }, uColor: { value: new Color(HUB_COLORS.foam) } }
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })
  const mesh = new InstancedMesh(geometry, material, n)
  mesh.frustumCulled = false // instances roam the whole lake; there are only a few dozen
  mesh.renderOrder = 2 // over the lake surface
  const m = new Matrix4()
  const zero = new Matrix4().makeScale(0, 0, 0)
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, zero)

  let next = 0
  let time = 0
  const pos = new Vector3()

  // A ring at (x, z) that grows to `size` m across over `life` s, on the lake or at height `y`
  // (the splash pool).
  function spawn(x, z, size, strength = 1, life = 1.4, y = LAKE.y) {
    const i = next
    next = (next + 1) % n
    mesh.setMatrixAt(i, m.makeScale(size, 1, size).setPosition(pos.set(x, y + 0.03, z)))
    data[i * 3] = time
    data[i * 3 + 1] = life
    data[i * 3 + 2] = strength
    mesh.instanceMatrix.needsUpdate = true
    attr.needsUpdate = true
  }

  return {
    mesh,
    spawn,
    update(dt) {
      time += dt
      uniforms.uTime.value = time
    },
  }
}
