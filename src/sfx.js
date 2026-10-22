// Procedural surf sounds: Web Audio only, no files. Shaped noise makes the water and the wind:
//   rush   - pink noise through a band-pass that opens with speed (water tearing under the raft)
//   fizz   - high white noise with a fast random flutter (spray hiss and droplets)
//   wind   - pink noise through a narrow, slowly wandering band-pass (air at speed)
//   rumble - brown noise low-passed (the logs drumming on the slide)
// setSpeed() glides the four loop levels; one-shots (launch, rail bump, spin, the touchdown slam)
// are built per call from short envelopes and let go. The context starts on the first click or
// key (browsers block audio before a gesture) and sleeps while the tab is hidden.
// Paddling up the slide (climb section): each stroke's blade bite, the water dragged past it and the
// drips off it as it leaves (panned to the paddle side), the lane's water gurgling against the bow,
// the raft's lashings creaking, and the paddler's breathing growing heavy as stamina runs out.
// The Coach's sounds (bottom of the file) are real-world ones built the same way: a pea whistle,
// hand claps, coins, the clipboard page and knocks, a struck chime; panned to where the Coach
// stands and sent through a short outdoor reverb so they sit in the scene.
import { CLIMB, COACH_TRAINING, SURF } from './config.js'

let ctx = null
let out = null
let room = null // reverb send
const noise = {}
let loops = null

function makeNoise(kind, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w
    else if (kind === 'brown') {
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    } else {
      // Paul Kellet's pink filter.
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.969 * b2 + w * 0.153852
      b3 = 0.8665 * b3 + w * 0.3104856
      b4 = 0.55 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.016898
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6 = w * 0.115926
    }
  }
  // Cross-fade the ends so the loop has no click.
  const fade = Math.floor(ctx.sampleRate * 0.05)
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    d[i] = d[i] * k + d[len - fade + i] * (1 - k)
  }
  return buf
}

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  out = ctx.createGain()
  out.gain.value = SURF.sound.volume
  out.connect(comp).connect(ctx.destination)
  noise.white = makeNoise('white')
  noise.pink = makeNoise('pink')
  noise.brown = makeNoise('brown')
  room = ctx.createConvolver()
  room.buffer = makeRoom()
  const wet = ctx.createGain()
  wet.gain.value = 0.28 * SURF.sound.volume
  room.connect(wet).connect(comp)
  return ctx
}

// Impulse for the reverb: a few early reflections off the deck and the stalls, then a darkened
// tail dying away in about a second (open air, not a hall). Stereo, slightly different per side.
function makeRoom(seconds = 1.1) {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      lp += 0.3 * (Math.random() * 2 - 1 - lp)
      d[i] = lp * Math.exp((-i / ctx.sampleRate) * 5.5)
    }
    for (const [ms, g] of [[9, 0.55], [21, 0.4], [34, 0.3], [55, 0.2], [80, 0.12]]) {
      d[Math.floor(((ms + ch * 3.5) / 1000) * ctx.sampleRate)] += g * (Math.random() < 0.5 ? -1 : 1)
    }
  }
  return buf
}

const unlock = () => {
  if (ensure() && ctx.state === 'suspended' && !document.hidden) ctx.resume()
}
window.addEventListener('pointerdown', unlock)
window.addEventListener('keydown', unlock)
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) ctx.suspend()
  else ctx.resume()
})

const ready = () => !!ctx && ctx.state === 'running'

function source(kind, loop = false) {
  const s = ctx.createBufferSource()
  s.buffer = noise[kind]
  s.loop = loop
  if (loop) s.loopStart = 0
  s.playbackRate.value = 0.9 + Math.random() * 0.2
  return s
}
const filter = (type, freq, q = 0.7) => {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}
const gain = (v = 0) => {
  const g = ctx.createGain()
  g.gain.value = v
  return g
}
// Attack/decay envelope on a gain param, starting at `at`.
function envelope(param, at, peak, attack, decay) {
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(peak, at + attack)
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}
function noiseHit(kind, at, { type = 'lowpass', freq = 1000, freqTo, q = 0.7, peak = 0.5, attack = 0.005, decay = 0.3, dest = out }) {
  const s = source(kind)
  const f = filter(type, freq, q)
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, at + attack + decay)
  const g = gain()
  envelope(g.gain, at, peak, attack, decay)
  s.connect(f).connect(g).connect(dest)
  s.start(at, Math.random() * 1.5)
  s.stop(at + attack + decay + 0.05)
}
function tone(at, { type = 'sine', freq = 100, freqTo, peak = 0.5, attack = 0.005, decay = 0.3, dest = out }) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, at + attack + decay)
  const g = gain()
  envelope(g.gain, at, peak, attack, decay)
  o.connect(g).connect(dest)
  o.start(at)
  o.stop(at + attack + decay + 0.05)
}

// --- Loops ---------------------------------------------------------------------------------

function startLoops() {
  if (loops || !ready()) return
  const make = (kind, chain) => {
    const s = source(kind, true)
    const g = gain()
    let node = s
    for (const n of chain) node = node.connect(n)
    node.connect(g).connect(out)
    s.start(0, Math.random() * 1.5)
    return { s, g }
  }
  const rushF = filter('bandpass', 400, 0.6)
  const fizzF = filter('highpass', 2600, 0.5)
  const windF = filter('bandpass', 700, 2.5)
  const rumbleF = filter('lowpass', 140, 0.8)
  loops = {
    rush: { ...make('pink', [rushF]), f: rushF },
    fizz: { ...make('white', [fizzF]), f: fizzF },
    wind: { ...make('pink', [windF]), f: windF },
    rumble: { ...make('brown', [rumbleF]), f: rumbleF },
    t: 0,
  }
}

function stopLoops() {
  if (!loops) return
  const at = ctx.currentTime
  for (const k of ['rush', 'fizz', 'wind', 'rumble']) {
    loops[k].g.gain.setTargetAtTime(0, at, 0.15)
    loops[k].s.stop(at + 1)
  }
  loops = null
}

// speed01: 0..1 of the launch speed. wet: on the water (the flat after touchdown dries the rush out).
function setSpeed(speed01, dt, wet = true) {
  if (!loops) return
  const at = ctx.currentTime
  const v = Math.min(1, Math.max(0, speed01))
  const L = loops
  L.t += dt
  // Water turbulence: the level wobbles a little, faster with speed.
  const churn = 0.85 + 0.15 * Math.sin(L.t * (6 + v * 9)) * Math.sin(L.t * 2.3)
  const w = wet ? 1 : 0
  L.rush.g.gain.setTargetAtTime(w * (0.08 + 0.5 * v) * churn, at, 0.05)
  L.rush.f.frequency.setTargetAtTime(260 + 1500 * v, at, 0.08)
  // Spray hiss flutters randomly, like droplets pattering.
  L.fizz.g.gain.setTargetAtTime(w * v * v * (0.1 + 0.12 * Math.random()), at, 0.02)
  L.wind.g.gain.setTargetAtTime(0.32 * v ** 1.5, at, 0.1)
  L.wind.f.frequency.setTargetAtTime(500 + 900 * v + 220 * Math.sin(L.t * 0.7) + 120 * Math.sin(L.t * 1.9), at, 0.1)
  L.rumble.g.gain.setTargetAtTime(w * (0.15 + 0.55 * v), at, 0.06)
}

// --- One-shots ---------------------------------------------------------------------------

// Shot off the chevrons: a whoosh sweeping up, a thump and a sheet of water.
function launch() {
  if (!ready()) return
  const at = ctx.currentTime
  noiseHit('pink', at, { type: 'bandpass', freq: 250, freqTo: 2600, q: 1.2, peak: 0.55, attack: 0.12, decay: 0.7 })
  tone(at, { freq: 95, freqTo: 42, peak: 0.6, decay: 0.3 })
  noiseHit('white', at + 0.02, { freq: 3200, freqTo: 700, peak: 0.35, decay: 0.55 })
}

// Raft knocking a rail: a woody thud with a slap of water. strength 0..1.
function bump(strength) {
  if (!ready()) return
  const at = ctx.currentTime
  const s = Math.min(1, strength)
  tone(at, { type: 'triangle', freq: 150, freqTo: 70, peak: 0.25 + 0.35 * s, decay: 0.12 })
  tone(at, { freq: 62, freqTo: 40, peak: 0.3 * s, decay: 0.18 })
  noiseHit('white', at, { type: 'bandpass', freq: 1400, q: 1, peak: 0.25 * s, decay: 0.16 })
}

// Spinning round at the top: a soft swish.
function spin() {
  if (!ready()) return
  noiseHit('pink', ctx.currentTime, { type: 'bandpass', freq: 1800, freqTo: 500, q: 2, peak: 0.22, attack: 0.15, decay: 0.5 })
}

// Touchdown on the flat at speed: a deep slam, a crash of water collapsing, the logs knocking,
// then droplets pattering down for a second. strength 0..1.
function impact(strength) {
  if (!ready()) return
  const at = ctx.currentTime
  const s = Math.min(1, Math.max(0.3, strength))
  tone(at, { freq: 120, freqTo: 32, peak: 0.95 * s, attack: 0.004, decay: 0.55 })
  noiseHit('brown', at, { freq: 400, freqTo: 90, peak: 0.9 * s, decay: 0.45 })
  noiseHit('white', at + 0.01, { freq: 6000, freqTo: 500, peak: 0.6 * s, attack: 0.01, decay: 1.3 })
  noiseHit('pink', at + 0.03, { type: 'bandpass', freq: 800, freqTo: 300, q: 0.8, peak: 0.55 * s, attack: 0.02, decay: 1 })
  for (const [d, f] of [[0.02, 210], [0.11, 180], [0.19, 240]]) tone(at + d, { type: 'triangle', freq: f, freqTo: f * 0.6, peak: 0.18 * s, decay: 0.09 })
  for (let i = 0; i < 18; i++) {
    const t = at + 0.25 + Math.random() * 1.3
    const f = 900 + Math.random() * 1800
    tone(t, { freq: f, freqTo: f * 0.55, peak: 0.04 + Math.random() * 0.05, attack: 0.002, decay: 0.05 + Math.random() * 0.05 })
  }
}

// --- The Coach ---------------------------------------------------------------------------
// `where` = { pan (-1 left .. 1 right), level (distance falloff), delay (s) }, from coach.js.

// A one-shot's way out: panned, scaled, dry plus a share into the reverb. Returns [node, start time].
function voice(where = {}) {
  const g = gain((where.level ?? 1) * COACH_TRAINING.volume)
  let last = g
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, where.pan ?? 0))
    last = g.connect(p)
  }
  last.connect(out)
  last.connect(room)
  return [g, ctx.currentTime + 0.01 + (where.delay ?? 0)]
}

// One blast of a pea whistle. The tone is nearly pure (a touch of 2nd and 3rd harmonic); the pea
// spinning in the chamber warbles its pitch and level ~35 times a second, a little unevenly; breath
// hisses through it and the first puff of air chuffs. Pitch sags as the blow starts and runs out.
function blast(at, len, dest, { f = 3000, level = 0.3 } = {}) {
  const end = at + len
  const o = ctx.createOscillator()
  o.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, 0.14, 0.04])))
  o.frequency.setValueAtTime(f * 0.88, at)
  o.frequency.exponentialRampToValueAtTime(f, at + 0.045)
  o.frequency.setValueAtTime(f, end - 0.04)
  o.frequency.exponentialRampToValueAtTime(f * 0.93, end + 0.05)
  const pea = ctx.createOscillator()
  pea.type = 'triangle'
  pea.frequency.value = 33 + Math.random() * 8
  const wander = ctx.createOscillator() // the pea never spins quite evenly
  wander.frequency.value = 2.5 + Math.random() * 2
  wander.connect(gain(6)).connect(pea.frequency)
  pea.connect(gain(f * 0.04)).connect(o.frequency)
  const trill = gain(0.6) // level the pea chops: 0.6 +- 0.4
  pea.connect(gain(0.4)).connect(trill.gain)
  const env = gain(0)
  env.gain.setValueAtTime(0.0001, at)
  env.gain.linearRampToValueAtTime(level * 1.25, at + 0.018)
  env.gain.linearRampToValueAtTime(level, at + 0.08)
  env.gain.setValueAtTime(level, end)
  env.gain.setTargetAtTime(0.0001, end, 0.025)
  o.connect(trill).connect(env).connect(dest)
  // Breath: noise right round the pitch rides the same trill; a thin hiss of air above it.
  const breath = source('white')
  breath.connect(filter('bandpass', f, 9)).connect(gain(1.6)).connect(trill)
  const air = source('white')
  const airG = gain(0)
  airG.gain.setValueAtTime(0.0001, at)
  airG.gain.linearRampToValueAtTime(level * 0.1, at + 0.02)
  airG.gain.setValueAtTime(level * 0.1, end)
  airG.gain.setTargetAtTime(0.0001, end, 0.02)
  air.connect(filter('highpass', 5500, 0.5)).connect(airG).connect(dest)
  noiseHit('pink', at, { freq: 700, peak: level * 0.7, attack: 0.003, decay: 0.05, dest })
  for (const n of [o, pea, wander]) n.start(at)
  for (const n of [breath, air]) n.start(at, Math.random() * 1.5)
  for (const n of [o, pea, wander, breath, air]) n.stop(end + 0.2)
}

// Coach's whistle: 'short' is one quick tweet (hello); 'cheer' is tweet-TWEEEET.
function whistle(kind = 'cheer', where) {
  if (!ready()) return
  const [v, at] = voice(where)
  if (kind === 'short') return blast(at, 0.13, v, { f: 2900 + Math.random() * 120, level: 0.2 })
  blast(at, 0.11, v, { f: 3050, level: 0.26 })
  blast(at + 0.18, 0.62, v, { f: 2980, level: 0.32 })
}

// A hand clap: three slaps a few ms apart as the palms meet, then the cupped air rings briefly.
function clap(at, dest, level) {
  const f = 950 + Math.random() * 450
  for (const [d, k] of [[0, 1], [0.008, 0.75], [0.018, 0.6]]) noiseHit('white', at + d, { type: 'bandpass', freq: f, q: 1.1, peak: level * k, attack: 0.001, decay: 0.011, dest })
  noiseHit('white', at + 0.024, { type: 'bandpass', freq: f * 1.12, q: 1.5, peak: level * 0.7, attack: 0.002, decay: 0.1, dest })
  noiseHit('pink', at, { freq: 320, peak: level * 0.35, attack: 0.002, decay: 0.035, dest })
}
function claps(n = 3, where) {
  if (!ready()) return
  const [v, at] = voice(where)
  let t = at
  for (let i = 0; i < n; i++) {
    clap(t, v, 0.5 - i * 0.05)
    t += 0.22 + Math.random() * 0.04
  }
}

// Coins chinking onto a pile: each a thin metal disc ringing at inharmonic partials (the higher
// ones die faster) after a tick of contact; they land unevenly and get quieter.
const COIN = [[1, 1, 0.32], [2.32, 0.55, 0.17], [3.95, 0.35, 0.1], [5.8, 0.2, 0.06]]
function coins(n = 6, where) {
  if (!ready()) return
  const [v, at] = voice(where)
  let t = at
  for (let i = 0; i < n; i++) {
    const f = 2200 + Math.random() * 1000
    const level = 0.2 * (1 - i / (n + 3))
    noiseHit('white', t, { type: 'highpass', freq: 4500, peak: level * 0.7, attack: 0.001, decay: 0.008, dest: v })
    for (const [r, a, d] of COIN) tone(t, { freq: f * r * (1 + (Math.random() - 0.5) * 0.012), peak: level * a, attack: 0.0015, decay: d * (0.7 + Math.random() * 0.6), dest: v })
    t += 0.035 + Math.random() * 0.05
  }
}

// The clipboard page turning: a papery swish crinkling unevenly, then the flap down on the board.
function page(where) {
  if (!ready()) return
  const [v, at] = voice(where)
  const s = source('white')
  const f = filter('bandpass', 2400, 0.6)
  const g = gain(0)
  g.gain.setValueAtTime(0.0001, at)
  let t = at
  for (let i = 0; i < 14; i++) {
    t += 0.007 + Math.random() * 0.012
    g.gain.linearRampToValueAtTime((0.05 + Math.random() * 0.17) * (1 - i / 17), t)
  }
  g.gain.linearRampToValueAtTime(0.0001, t + 0.03)
  f.frequency.exponentialRampToValueAtTime(6000, t)
  s.connect(f).connect(g).connect(v)
  s.start(at, Math.random() * 1.5)
  s.stop(t + 0.1)
  noiseHit('pink', t, { freq: 1300, peak: 0.28, attack: 0.002, decay: 0.06, dest: v })
}

// Knuckle on the clipboard: a short woody knock.
function knock(at, dest, level) {
  tone(at, { type: 'triangle', freq: 330, freqTo: 240, peak: level, attack: 0.001, decay: 0.07, dest })
  tone(at, { freq: 810, freqTo: 690, peak: level * 0.3, attack: 0.001, decay: 0.04, dest })
  noiseHit('white', at, { type: 'bandpass', freq: 2200, q: 1.5, peak: level * 0.5, attack: 0.001, decay: 0.02, dest })
}
// Not enough coins: two knocks on the board (with the Coach shaking its head).
function denied(where) {
  if (!ready()) return
  const [v, at] = voice(where)
  knock(at, v, 0.4)
  knock(at + 0.14, v, 0.32)
}

// A level from the Coach, at the player: a chest-deep whump, a rush of air rising past, then two
// struck chimes (a fifth apart, higher each level) ringing out, with a few tiny glints.
const BELL = [[1, 1, 1.6], [2.01, 0.45, 1.1], [2.76, 0.32, 0.8], [5.4, 0.16, 0.4], [8.93, 0.07, 0.25]]
function levelUp(level = 1) {
  if (!ready()) return
  const [v, at] = voice()
  tone(at, { freq: 115, freqTo: 42, peak: 0.55, attack: 0.006, decay: 0.42, dest: v })
  noiseHit('pink', at, { type: 'bandpass', freq: 280, freqTo: 3400, q: 1.3, peak: 0.32, attack: 0.25, decay: 0.45, dest: v })
  const base = 784 * 2 ** (Math.min(level, 12) / 12)
  for (const [d, f] of [[0.16, base], [0.29, base * 1.5]]) {
    for (const [r, a, dec] of BELL) tone(at + d, { freq: f * r, peak: 0.13 * a, attack: 0.002, decay: dec, dest: v })
  }
  for (let i = 0; i < 9; i++) {
    const f = 4200 + Math.random() * 3200
    tone(at + 0.35 + Math.random() * 0.7, { freq: f, peak: 0.02 + Math.random() * 0.02, attack: 0.001, decay: 0.1 + Math.random() * 0.1, dest: v })
  }
}

// --- Climbing the slide ------------------------------------------------------------------

// A one-shot's way out for the paddler's own sounds: panned, scaled, mostly dry, a little reverb.
function near(pan = 0, level = 1) {
  const g = gain(level * CLIMB.volume)
  let last = g
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    last = g.connect(p)
  }
  last.connect(out)
  const send = gain(0.35)
  last.connect(send).connect(room)
  return g
}

// One paddle stroke, `power` 0..1, the pull lasting `pull` s: the blade slicing in (a hollow plunk
// and a short splash), water dragged hissing past it, then sheeting off as it lifts out, and drips.
// `turn` (-1..1) while steering: left is a wide sweep (a long swoosh of water pushed round in an
// arc), right a draw (a deep gulp of water pulled in under the raft, ending in a slap on the logs).
function paddle(power = 1, pull = 0.4, turn = 0) {
  if (!ready()) return
  const at = ctx.currentTime
  const p = Math.max(0.2, Math.min(1, power))
  const dest = near(0.45, p)
  tone(at, { freq: 260 + Math.random() * 60, freqTo: 120, peak: 0.16, attack: 0.003, decay: 0.07, dest })
  noiseHit('white', at, { type: 'bandpass', freq: 2400, freqTo: 800, q: 0.9, peak: 0.24, attack: 0.004, decay: 0.11, dest })
  noiseHit('pink', at + 0.03, { type: 'bandpass', freq: 650, freqTo: 380, q: 1.3, peak: 0.2, attack: 0.08, decay: pull * 0.8, dest })
  noiseHit('brown', at + 0.02, { freq: 260, peak: 0.25, attack: 0.03, decay: pull * 0.6, dest }) // the push of water
  if (turn < -0.2) {
    noiseHit('pink', at + 0.06, { type: 'bandpass', freq: 380, freqTo: 950, q: 0.9, peak: 0.22 * -turn, attack: 0.15, decay: pull * 1.3, dest })
  } else if (turn > 0.2) {
    noiseHit('brown', at + 0.04, { freq: 180, freqTo: 90, peak: 0.35 * turn, attack: 0.05, decay: pull * 0.9, dest })
    noiseHit('pink', at + 0.05, { type: 'bandpass', freq: 300, freqTo: 220, q: 2, peak: 0.16 * turn, attack: 0.06, decay: pull * 0.7, dest })
    noiseHit('white', at + pull * 0.85, { type: 'bandpass', freq: 1100, q: 1.2, peak: 0.14 * turn, attack: 0.005, decay: 0.12, dest })
  }
  const out_ = at + pull
  noiseHit('white', out_, { type: 'highpass', freq: 2800, peak: 0.1, attack: 0.01, decay: 0.16, dest })
  for (let i = 0; i < 4; i++) {
    const t = out_ + 0.05 + Math.random() * 0.4
    const f = 1300 + Math.random() * 1500
    tone(t, { freq: f, freqTo: f * 0.55, peak: 0.025 + Math.random() * 0.03, attack: 0.002, decay: 0.04 + Math.random() * 0.04, dest })
  }
}

// The lashings and logs creaking under the strain of a stroke: a rubbing squeak with a stick-slip
// flutter, low and dry.
function creak(level = 1) {
  if (!ready()) return
  const at = ctx.currentTime + Math.random() * 0.1
  const dest = near(Math.random() * 0.6 - 0.3, level)
  const o = ctx.createOscillator()
  o.type = 'sawtooth'
  const base = 95 + Math.random() * 70
  o.frequency.setValueAtTime(base, at)
  o.frequency.linearRampToValueAtTime(base * (0.85 + Math.random() * 0.3), at + 0.3)
  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = 18 + Math.random() * 14
  const depth = gain(base * 0.12)
  lfo.connect(depth).connect(o.frequency)
  const f = filter('bandpass', 900 + Math.random() * 500, 4)
  const g = gain()
  envelope(g.gain, at, 0.06, 0.06, 0.28)
  o.connect(f).connect(g).connect(dest)
  for (const n of [o, lfo]) {
    n.start(at)
    n.stop(at + 0.4)
  }
}

// One breath, `tired` 0..1: an exhale through the mouth ("hah", two formant bands, a grunt in it
// when exhausted) or a quicker, hissier inhale.
function breath(kind = 'out', tired = 1) {
  if (!ready() || tired < 0.05) return
  const at = ctx.currentTime
  const dest = near(0, tired)
  if (kind === 'out') {
    const len = 0.22 + 0.12 * tired
    noiseHit('pink', at, { type: 'bandpass', freq: 850, freqTo: 650, q: 1.4, peak: 0.2, attack: 0.03, decay: len, dest })
    noiseHit('white', at, { type: 'bandpass', freq: 1750, freqTo: 1400, q: 2, peak: 0.09, attack: 0.03, decay: len * 0.8, dest })
    if (tired > 0.6) tone(at, { type: 'sawtooth', freq: 125 + Math.random() * 20, freqTo: 100, peak: 0.02 * tired, attack: 0.03, decay: len * 0.7, dest })
  } else {
    noiseHit('white', at, { type: 'bandpass', freq: 2500, freqTo: 3000, q: 1.5, peak: 0.07, attack: 0.1, decay: 0.15, dest })
  }
}

// Water running down the lane, gurgling and slapping against the raft's bow while it is on the
// slide: `level` 0..1 (0 off the slide), `pace` 0..1 of the climb speed. Built on first use, let go
// after a quiet second.
let climbLoop = null
function setClimb(level, pace, dt) {
  if (!ready()) return
  if (!climbLoop) {
    if (level < 0.02) return
    const s1 = source('pink', true)
    const f1 = filter('bandpass', 520, 1.1)
    const g1 = gain()
    const s2 = source('brown', true)
    const f2 = filter('lowpass', 320, 0.8)
    const g2 = gain()
    const bus = near(0, 1)
    s1.connect(f1).connect(g1).connect(bus)
    s2.connect(f2).connect(g2).connect(bus)
    s1.start(0, Math.random() * 1.5)
    s2.start(0, Math.random() * 1.5)
    climbLoop = { s1, s2, f1, g1, g2, t: 0, quiet: 0 }
  }
  const L = climbLoop
  const at = ctx.currentTime
  L.t += dt
  L.quiet = level < 0.02 ? L.quiet + dt : 0
  if (L.quiet > 1) {
    for (const g of [L.g1, L.g2]) g.gain.setTargetAtTime(0, at, 0.1)
    L.s1.stop(at + 0.6)
    L.s2.stop(at + 0.6)
    climbLoop = null
    return
  }
  // Gurgle: the band wanders and the level bubbles irregularly; the bow slaps faster with pace.
  const bubble = 0.75 + 0.25 * Math.sin(L.t * 7.3) * Math.sin(L.t * 3.1 + 1) + 0.1 * Math.random()
  L.f1.frequency.setTargetAtTime(420 + 260 * pace + 120 * Math.sin(L.t * 1.7), at, 0.08)
  L.g1.gain.setTargetAtTime(level * (0.1 + 0.16 * pace) * bubble, at, 0.05)
  const slap = 0.6 + 0.4 * Math.max(0, Math.sin(L.t * (4 + 6 * pace)))
  L.g2.gain.setTargetAtTime(level * (0.12 + 0.2 * pace) * slap, at, 0.04)
}

// --- The spin wheel ------------------------------------------------------------------------
// UI sounds for hud/spinWheel.js, centred (no `where`), through the Coach's voice() and reverb.

// A peg clacking past the rubber pointer: a hard plastic tick, brighter the faster it goes (0..1).
function wheelTick(speed = 1) {
  if (!ready()) return
  const [v, at] = voice({ level: 0.45 + 0.55 * speed })
  noiseHit('white', at, { type: 'bandpass', freq: 2800 + 1600 * speed, q: 2.5, peak: 0.4, attack: 0.001, decay: 0.022, dest: v })
  tone(at, { type: 'triangle', freq: 1300 + 500 * speed, freqTo: 800, peak: 0.12, attack: 0.001, decay: 0.03, dest: v })
}

// A prize: struck bells running up C-E-G-C with glints after; `big` (the pet) climbs one note
// higher over a deep whump.
function fanfare(big = false) {
  if (!ready()) return
  const [v, at] = voice()
  const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]
  notes.forEach((f, i) => {
    for (const [r, a, dec] of BELL) tone(at + i * 0.085, { freq: f * r, peak: 0.1 * a, attack: 0.002, decay: dec * (i === notes.length - 1 ? 1 : 0.5), dest: v })
  })
  if (big) tone(at, { freq: 115, freqTo: 42, peak: 0.55, attack: 0.006, decay: 0.45, dest: v })
  for (let i = 0; i < (big ? 16 : 8); i++) {
    const f = 4200 + Math.random() * 3200
    tone(at + 0.3 + Math.random() * 0.8, { freq: f, peak: 0.02 + Math.random() * 0.02, attack: 0.001, decay: 0.1 + Math.random() * 0.1, dest: v })
  }
}

export const sfx = { startLoops, stopLoops, setSpeed, launch, bump, spin, impact, paddle, creak, breath, setClimb, whistle, claps, coins, page, denied, levelUp, wheelTick, fanfare }
