// Shared hub materials. Roblox SmoothPlastic look: flat colour, no texture, soft roughness.
// Slide lanes get laneWater(), a procedural streaky flow that also drives the emissive, so it
// stays bright in shadow like the reference's glowing lanes.
import { Color, MeshStandardMaterial } from 'three'
import { MATERIAL_PBR } from '../config.js'

const cache = new Map()

export function plastic(color, extra = {}) {
  const key = `${color}${JSON.stringify(extra)}`
  if (!cache.has(key)) cache.set(key, new MeshStandardMaterial({ color, ...MATERIAL_PBR.PLASTIC, ...extra }))
  return cache.get(key)
}

// Self-lit plastic (arrows, pads, neon edges).
export const neon = (color, intensity = 0.45) =>
  plastic(color, { ...MATERIAL_PBR.NEON, emissive: color, emissiveIntensity: intensity })

// Slide lane water: long wavy streaks of foam racing downhill over a cross-lane gradient (a
// deeper channel down the middle, brighter shallows toward the rails), foam rolling along both
// rails and glints twinkling in the flow. All procedural in the fragment shader: `uv` is
// (0..1 across the lane, metres up the slide), `uTime` advances in slide.js. The colour also drives
// the emissive, so the lanes glow even in shadow like the reference's.
const LANE_HEAD = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uWidth;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uFoam;
varying vec2 vLaneUv;
// sin-free hash: stays random at the 100K-unit coordinates far up the 75 km slide, where
// fract(sin(big)) turns to stripes in float32.
float laneHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float laneNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(laneHash(i), laneHash(i + vec2(1.0, 0.0)), f.x), mix(laneHash(i + vec2(0.0, 1.0)), laneHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// Thin anti-aliased line where the noise crosses 0.5 (ridged); w = half-width in noise units.
float laneVein(vec2 p, float w) {
  float r = abs(laneNoise(p) - 0.5);
  float fw = fwidth(r) + 1e-4;
  return 1.0 - smoothstep(w - fw, w + fw, r);
}
`

const LANE_COLOUR = /* glsl */ `
float across = vLaneUv.x * uWidth;             // metres from the west rail
float d = abs(vLaneUv.x - 0.5) * 2.0;          // 0 down the middle, 1 at the rails
float up = vLaneUv.y;
float along = up + uTime * uSpeed;              // sampling ahead: the pattern runs downhill
float slow = up + uTime * uSpeed * 0.72;        // a second, lazier sheet underneath
// Sideways wobble so the streaks snake instead of running ruler-straight.
float wob = 0.45 * sin(along * 0.45 + across * 1.7) + 0.3 * sin(slow * 0.21 - across * 2.3);
vec3 col = mix(uMid, uLight, smoothstep(0.3, 0.95, d));
col = mix(col, uDeep, (1.0 - smoothstep(0.0, 0.42, d)) * 0.55);
// Broad bright bands drifting with the slow sheet.
float band = smoothstep(0.55, 0.8, laneNoise(vec2((across + wob) * 0.9, slow * 0.07)));
col = mix(col, uLight, band * 0.55);
// Fine foam veins: long along the flow, thin across it.
float veins = laneVein(vec2((across + wob) * 1.6, along * 0.11), 0.045);
veins = max(veins, 0.75 * laneVein(vec2((across - wob * 0.6) * 2.6 + 11.0, slow * 0.17), 0.035));
col = mix(col, uFoam, veins * 0.85);
// Foam rolling along both rails, its inner edge broken up by the flow.
float rim = smoothstep(0.78, 0.97, d + 0.1 * (laneNoise(vec2(along * 0.5, d * 4.0)) - 0.5));
col = mix(col, uFoam, rim * 0.9);
// Glints racing down with the water.
float glint = pow(laneNoise(vec2(across * 5.0, along * 1.4)), 14.0) * 2.5;
col += uFoam * glint;
diffuseColor.rgb = col;
vec3 laneGlow = col;
`

export function laneWater({ deep, mid, light, foam }, width, speed, glow = 0.55) {
  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uWidth: { value: width },
    uDeep: { value: new Color(deep) },
    uMid: { value: new Color(mid) },
    uLight: { value: new Color(light) },
    uFoam: { value: new Color(foam) },
  }
  const material = new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: glow, ...MATERIAL_PBR.WATER })
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLaneUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvLaneUv = uv;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${LANE_HEAD}`)
      .replace('#include <map_fragment>', LANE_COLOUR)
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= laneGlow;')
  }
  material.userData.uniforms = uniforms
  return material
}
