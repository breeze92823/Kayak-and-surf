// Showcase effects (from the reference shot): drifting sparkles, embers, twinkles, swirling aura
// puffs, rising bubbles, and a fresnel rim glow. Every emitter is one Points draw whose motion
// runs entirely in the vertex shader off a shared clock, so they cost no CPU per frame; call
// `updateParticles(dt)` once a frame.
//   rise    - particles climb from a disc of `radius` up `height`, curling a little, fading in
//             and out, colour easing from `color` to `color2` over their life (sparkles, flames)
//   orbit   - swirl round the centre at `radius` within `height`, flickering (aura puffs)
//   twinkle - hold still at random spots in the volume, popping in and out (star glints)
//   bubble  - rise slowly with a side-to-side wobble (bubbles)
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  NormalBlending,
  Points,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three'
import { canvas, mulberry32, toTexture } from '../textures.js'

const TIME = { value: 0 }
const MODES = { rise: 0, orbit: 1, twinkle: 2, bubble: 3 }

export function updateParticles(dt) {
  TIME.value += dt
}

// Sprite shapes, white on transparent; tinted in the shader.
const SHAPES = {
  // Four-pointed star with a soft core.
  spark: (g, s) => {
    const c = s / 2
    const core = g.createRadialGradient(c, c, 0, c, c, c * 0.5)
    core.addColorStop(0, 'rgba(255,255,255,1)')
    core.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = core
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#ffffff'
    for (const [w, h] of [[s * 0.07, s * 0.48], [s * 0.48, s * 0.07]]) {
      g.beginPath()
      g.moveTo(c, c - h)
      g.quadraticCurveTo(c, c, c + w, c)
      g.quadraticCurveTo(c, c, c, c + h)
      g.quadraticCurveTo(c, c, c - w, c)
      g.quadraticCurveTo(c, c, c, c - h)
      g.fill()
    }
  },
  // Soft round puff.
  dot: (g, s) => {
    const c = s / 2
    const grad = g.createRadialGradient(c, c, 0, c, c, c)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, s, s)
  },
  // Flame tongue: a teardrop pointing up.
  flame: (g, s) => {
    const c = s / 2
    const grad = g.createRadialGradient(c, c * 1.25, 0, c, c * 1.15, c * 0.75)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.5, 'rgba(255,255,255,0.75)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(c, s * 0.05)
    g.bezierCurveTo(c + s * 0.12, s * 0.35, c + s * 0.4, s * 0.55, c + s * 0.3, s * 0.78)
    g.bezierCurveTo(c + s * 0.2, s * 0.98, c - s * 0.2, s * 0.98, c - s * 0.3, s * 0.78)
    g.bezierCurveTo(c - s * 0.4, s * 0.55, c - s * 0.12, s * 0.35, c, s * 0.05)
    g.fill()
  },
  // Soap bubble: faint fill, bright rim and a highlight.
  bubble: (g, s) => {
    const c = s / 2
    const grad = g.createRadialGradient(c, c, c * 0.55, c, c, c * 0.95)
    grad.addColorStop(0, 'rgba(255,255,255,0.08)')
    grad.addColorStop(0.8, 'rgba(255,255,255,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(c, c, c * 0.95, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.9)'
    g.beginPath()
    g.ellipse(c - c * 0.38, c - c * 0.38, c * 0.16, c * 0.09, -Math.PI / 4, 0, Math.PI * 2)
    g.fill()
  },
  // Blocky glowing pixel (the cyan cloud).
  pixel: (g, s) => {
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84)
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.fillRect(s * 0.22, s * 0.22, s * 0.56, s * 0.56)
  },
}
const textures = {}
function shape(name) {
  if (!textures[name]) {
    const c = canvas(64)
    SHAPES[name](c.getContext('2d'), 64)
    textures[name] = toTexture(c)
  }
  return textures[name]
}

const VERT = /* glsl */ `
attribute vec4 seed;
uniform float uTime;
uniform float uScale;
uniform float uSize;
uniform float uMode;
uniform float uSpeed;
uniform float uHeight;
uniform float uRadius;
uniform float uSpin;
uniform vec3 uColor;
uniform vec3 uColor2;
varying float vAlpha;
varying vec3 vColor;
varying float vRot;
void main() {
  float rate = uSpeed * (0.7 + 0.6 * seed.w);
  float life = fract(uTime * rate + seed.x);
  float a = seed.y * 6.2832;
  float r = uRadius * sqrt(seed.z);
  float size = uSize * (0.6 + 0.8 * seed.w);
  float alpha = 1.0;
  vec3 p;
  float mixT = seed.w;
  if (uMode < 0.5) {
    a += life * 2.0 * (seed.w - 0.5);
    p = vec3(cos(a) * r, life * uHeight, sin(a) * r);
    alpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
    size *= 1.0 - 0.45 * life;
    mixT = life;
  } else if (uMode < 1.5) {
    float ang = a + uTime * rate * 6.2832;
    float rr = uRadius * (0.55 + 0.45 * seed.z);
    p = vec3(cos(ang) * rr, (seed.z - 0.5) * uHeight + sin(uTime * 2.0 + seed.x * 6.2832) * 0.12, sin(ang) * rr);
    alpha = 0.55 + 0.45 * sin(uTime * 5.0 + seed.x * 20.0);
  } else if (uMode < 2.5) {
    p = vec3(cos(a) * r, (seed.z * 0.8 + seed.w * 0.2) * uHeight, sin(a) * r);
    float pop = sin(life * 3.14159);
    pop = pop * pop * pop;
    alpha = pop;
    size *= pop;
  } else {
    p = vec3(cos(a) * r + sin(life * 9.0 + seed.x * 6.2832) * 0.12, life * uHeight, sin(a) * r + cos(life * 7.0 + seed.y * 6.2832) * 0.1);
    alpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.85, 1.0, life));
  }
  vColor = mix(uColor, uColor2, mixT);
  vAlpha = alpha;
  vRot = seed.y * 6.2832 + uTime * uSpin * (seed.w - 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;
varying float vRot;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float c = cos(vRot);
  float s = sin(vRot);
  uv = mat2(c, -s, s, c) * uv + 0.5;
  vec4 tex = texture2D(uMap, vec2(uv.x, 1.0 - uv.y));
  float a = tex.a * vAlpha * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * tex.rgb, a);
  #include <colorspace_fragment>
}
`

// One emitter. Its origin is the foot of the effect (rise/bubble) or its centre's foot (orbit,
// twinkle); add it to whatever it decorates.
export function particles({
  mode = 'rise',
  count = 24,
  shape: shapeName = 'spark',
  color = '#ffffff',
  color2 = color,
  size = 0.2,
  radius = 1,
  height = 2,
  speed = 0.3,
  spin = 0,
  opacity = 1,
  additive = true,
  seed = 1,
}) {
  const rand = mulberry32(seed)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  const seeds = new Float32Array(count * 4)
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand()
  geo.setAttribute('seed', new BufferAttribute(seeds, 4))
  const reach = Math.max(radius, height) + size
  geo.boundingSphere = new Sphere(new Vector3(0, mode === 'orbit' ? 0 : height / 2, 0), reach)
  const material = new ShaderMaterial({
    uniforms: {
      uTime: TIME,
      uScale: { value: 400 },
      uSize: { value: size },
      uMode: { value: MODES[mode] },
      uSpeed: { value: speed },
      uHeight: { value: height },
      uRadius: { value: radius },
      uSpin: { value: spin },
      uColor: { value: new Color(color) },
      uColor2: { value: new Color(color2) },
      uMap: { value: shape(shapeName) },
      uOpacity: { value: opacity },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  })
  const points = new Points(geo, material)
  // World-size points: pixels per metre at unit depth for this camera and canvas.
  points.onBeforeRender = (renderer, scene, camera) => {
    material.uniforms.uScale.value = (renderer.domElement.height * camera.projectionMatrix.elements[5]) / 2
  }
  points.renderOrder = 4
  return points
}

// Fresnel rim light hugging a shape: bright where the surface turns away from the camera (the
// gold crescent round the 500K egg). Reuses the shape's geometry, slightly swollen.
export function rimGlow(geometry, color, { power = 2.2, strength = 1.4, swell = 1.06 } = {}) {
  const material = new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uPower: { value: power }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower) * uStrength;
        gl_FragColor = vec4(uColor * rim, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const m = new Mesh(geometry, material)
  m.scale.setScalar(swell)
  m.renderOrder = 4
  return m
}
