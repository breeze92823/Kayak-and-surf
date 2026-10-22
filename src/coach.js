// The Coach on the deck (config COACH_TRAINING). Paddling within `promptRange` shows the E prompt
// beside the Coach (hud/coach.js), who turns to face the player and waves with a quick whistle.
// E (or the prompt, or the HUD's Coach tile) opens the Coach window: the coach roster (training.js)
// with portraits rendered on first open (coachPortraits.js). Buying a coach spends coins and equips
// it if a slot is free: the counter ticks down, coins chink, the Coach blows the whistle, cheers and
// claps, and gold sparks and a ring of light go up round the raft. Equip/Unequip toggle owned ones.
// Too few coins or no free slot: the Coach shakes its head and knocks on the clipboard. The window
// closes on E, its X, or paddling past `closeRange`. Consumes input.js's E press only when near the
// Coach or with the window open (main.js drops any press left over).
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  Vector3,
} from 'three'
import { COACH_TRAINING } from './config.js'
import { inputState } from './input.js'
import { player } from './player.js'
import { sfx } from './sfx.js'
import { training } from './training.js'
import { createCoachWindow } from './hud/coach.js'
import { renderCoachPortraits } from './coachPortraits.js'

const { promptRange, closeRange } = COACH_TRAINING
const smooth = (rate, dt) => 1 - Math.exp(-rate * dt)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Gestures: length in seconds; `next` follows straight on.
const GESTURES = { wave: { len: 1.5 }, nod: { len: 0.7 }, whistle: { len: 0.85, next: 'cheer' }, cheer: { len: 1.7 }, deny: { len: 0.9 } }
const JOINTS = ['torsoX', 'torsoZ', 'headX', 'headY', 'headZ', 'armLX', 'armLZ', 'armRX', 'armRZ', 'legLX', 'legRX']

// Target pose for the Coach at time t, mid-gesture `g` (s into it) and whether the window is open.
// Arms hang at 0; -X swings them forward; armR's -Z / armL's +Z lift them out to the side.
function pose(t, g, gt, talking) {
  const breathe = Math.sin(t * 1.7)
  const p = {
    torsoX: 0.015 * breathe,
    torsoZ: 0.02 * Math.sin(t * 0.45),
    headX: 0.05,
    headY: 0,
    headZ: 0,
    armLX: -0.85 + 0.03 * breathe, // clipboard up in front
    armLZ: 0.1,
    armRX: 0.06 + 0.04 * breathe,
    armRZ: -0.14,
    legLX: 0,
    legRX: 0,
    lift: 0,
  }
  // Every few seconds the Coach glances down at the clipboard.
  if (!talking && t % 7 < 1.3) p.headX = 0.38
  if (talking) {
    p.armRX = -0.75 + 0.22 * Math.sin(t * 3.1)
    p.armRZ = -0.3 + 0.14 * Math.sin(t * 2.3)
    p.headX = 0.06 * Math.sin(t * 2.6)
    p.headZ = 0.05 * Math.sin(t * 1.3)
  }
  if (!g) return p
  const k = Math.min(1, gt / 0.15) * Math.min(1, (GESTURES[g].len - gt) / 0.2) // ease in/out
  if (g === 'wave') {
    p.armRZ = -2.65 + 0.38 * Math.sin(gt * 12)
    p.armRX = -0.15
    p.headZ = 0.12
    p.torsoZ = 0.05
  } else if (g === 'nod') {
    p.headX = 0.3 * Math.max(0, Math.sin(gt * 9))
  } else if (g === 'whistle') {
    // Whistle to the lips, lean back and blow.
    p.armRX = -2.25
    p.armRZ = 0.35
    p.torsoX = -0.14 * k
    p.headX = -0.2 * k
    p.armLX = -0.5
  } else if (g === 'cheer') {
    // Both fists pumping overhead, two little hops.
    const pump = 0.35 * Math.abs(Math.sin(gt * 8))
    p.armRZ = -2.75 + pump
    p.armLZ = 2.75 - pump
    p.armRX = p.armLX = -0.2
    p.headX = -0.15
    p.lift = 0.22 * Math.max(0, Math.sin(Math.min(gt, 1.2) * Math.PI * (2 / 1.2))) * k
    p.legLX = p.legRX = -0.35 * (p.lift / 0.22)
  } else if (g === 'deny') {
    // Head shake and a wagging finger.
    const fall = 1 - gt / GESTURES.deny.len
    p.headY = 0.45 * Math.sin(gt * 15) * fall
    p.armRX = -1.7
    p.armRZ = -0.1 + 0.3 * Math.sin(gt * 15)
  }
  return p
}

// Gold sparks bursting up off the raft and a ring of light spreading on the water.
export function createBurst(scene) {
  const N = 90
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,240,180,0.9)')
  grad.addColorStop(1, 'rgba(255,200,60,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const vel = new Float32Array(N * 3)
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))
  const sparks = new Points(geo, new PointsMaterial({ size: 0.55, map: new CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }))
  sparks.frustumCulled = false
  const ring = new Mesh(new RingGeometry(0.82, 1, 64), new MeshBasicMaterial({ color: '#ffd84a', transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }))
  ring.rotation.x = -Math.PI / 2
  sparks.visible = ring.visible = false
  scene.add(sparks, ring)
  let age = Infinity
  const LIFE = 1.5
  return {
    fire(x, y, z) {
      age = 0
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 0.3 + Math.random() * 0.9
        pos.set([x + Math.cos(a) * r, y + 0.4 + Math.random() * 0.6, z + Math.sin(a) * r], i * 3)
        const out = 1.5 + Math.random() * 3
        vel.set([Math.cos(a) * out, 4 + Math.random() * 6, Math.sin(a) * out], i * 3)
        const tint = Math.random()
        col.set(tint < 0.6 ? [1, 0.82, 0.3] : tint < 0.85 ? [1, 1, 0.85] : [0.4, 0.95, 1], i * 3)
      }
      geo.attributes.color.needsUpdate = true
      ring.position.set(x, y + 0.15, z)
      sparks.visible = ring.visible = true
    },
    update(dt) {
      if (age > LIFE) return
      age += dt
      if (age > LIFE) {
        sparks.visible = ring.visible = false
        return
      }
      const drag = Math.exp(-1.6 * dt)
      for (let i = 0; i < N * 3; i += 3) {
        vel[i] *= drag
        vel[i + 2] *= drag
        vel[i + 1] = vel[i + 1] * drag - 9 * dt
        pos[i] += vel[i] * dt
        pos[i + 1] += vel[i + 1] * dt
        pos[i + 2] += vel[i + 2] * dt
      }
      geo.attributes.position.needsUpdate = true
      const k = age / LIFE
      sparks.material.opacity = 1 - k * k
      sparks.material.size = 0.55 * (1 - 0.5 * k)
      ring.scale.setScalar(1 + 7 * Math.sqrt(k))
      ring.material.opacity = (1 - k) ** 2
    },
  }
}

export function createCoach({ hud, camera, scene, renderer, rig }) {
  const win = createCoachWindow(hud.root, { onPick: pick, onClose: close })
  win.onOpen = () => open(false)
  hud.on('coach', () => (win.isOpen ? close() : open(true)))
  const burst = createBurst(scene)
  const coinEl = hud.root.querySelector('.hud-counter-coin')

  const cur = Object.fromEntries([...JOINTS, 'lift'].map((j) => [j, 0]))
  let t = 0
  let gesture = null
  let gt = 0
  let near = false
  let fromTile = false
  let greeted = -Infinity // time of the last hello, so paddling in and out doesn't spam it
  let coinTween = null
  let portraits = null // rendered the first time the window opens
  const at = new Vector3()
  const right = new Vector3()

  const play = (g) => {
    gesture = g
    gt = 0
  }

  // Where the Coach is heard from: panned by the camera's view, quieter further away.
  function where(extra = {}) {
    rig.root.getWorldPosition(at)
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    const dx = at.x - camera.position.x
    const dz = at.z - camera.position.z
    const d = Math.hypot(dx, dz) || 1
    return { pan: ((dx * right.x + dz * right.z) / d) * 0.75, level: clamp(6 / (d + 3), 0.25, 1), ...extra }
  }

  function open(tile) {
    fromTile = tile
    hud.opening('coach')
    document.exitPointerLock?.() // the window needs the cursor
    if (!portraits) {
      portraits = renderCoachPortraits(renderer, training.coaches.map((c) => c.id))
      win.setPortraits(portraits)
    }
    win.open()
    sfx.page(where())
    play('nod')
  }

  function close() {
    if (!win.isOpen) return
    win.close()
    sfx.page(where({ level: 0.6 }))
  }
  hud.addWindow('coach', close)

  function refuse(id, full) {
    win.refuse(id, full)
    sfx.denied(where())
    play('deny')
  }

  // A card's button: buy (then equip if a slot is free), equip, or unequip (not a locked coach).
  function pick(id) {
    if (training.isLocked(id)) return refuse(id, false)
    if (training.isEquipped(id)) {
      training.unequip(id)
      win.flash(id, 'off')
      sfx.page(where({ level: 0.7 }))
      return
    }
    if (training.owns(id)) {
      if (!training.equip(id)) return refuse(id, true)
      win.flash(id, 'on')
      sfx.whistle('short', where())
      sfx.claps(2, where({ delay: 0.2 }))
      play('nod')
      return
    }
    const { price } = training.coach(id)
    const coins = coinTween?.to ?? hud.get('coins') // mid tick-down the counter still shows more
    if (coins < price) return refuse(id, false)
    training.buy(id)
    training.equip(id)
    coinTween = { from: hud.get('coins'), to: coins - price, t: 0 }
    coinEl?.classList.remove('spend')
    void coinEl?.offsetWidth
    coinEl?.classList.add('spend')
    win.flash(id, 'new')
    sfx.coins(7)
    sfx.levelUp(training.coaches.findIndex((c) => c.id === id))
    sfx.whistle('cheer', where({ delay: 0.15 }))
    sfx.claps(4, where({ delay: 1.05 }))
    play('whistle')
    burst.fire(player.position.x, player.position.y, player.position.z)
  }

  return {
    update(dt) {
      t += dt
      const dist = Math.hypot(player.position.x - rig.root.position.x, player.position.z - rig.root.position.z)
      const wasNear = near
      near = dist < promptRange
      if (near && !wasNear && t - greeted > 8) {
        greeted = t
        if (!win.isOpen) {
          play('wave')
          sfx.whistle('short', where())
        }
      }
      // E: open beside the Coach, close if open.
      if (inputState.interact && (win.isOpen || near)) {
        inputState.interact = false
        if (win.isOpen) close()
        else if (near) open(false)
      }
      if (win.isOpen && !fromTile && dist > closeRange) close()

      // Gesture timeline.
      if (gesture) {
        gt += dt
        const g = GESTURES[gesture]
        if (gt >= g.len) {
          gesture = g.next ?? null
          gt = 0
        }
      }
      // Turn toward the player while near, back to the default stance otherwise.
      const toPlayer = Math.atan2(player.position.x - rig.root.position.x, player.position.z - rig.root.position.z)
      const yaw = near || win.isOpen ? toPlayer : rig.baseYaw
      rig.root.rotation.y += wrap(yaw - rig.root.rotation.y) * smooth(near ? 5 : 2, dt)
      const target = pose(t, gesture, gt, win.isOpen)
      if (near && gesture !== 'deny') target.headY += clamp(wrap(toPlayer - rig.root.rotation.y), -0.8, 0.8)
      const s = smooth(gesture ? 16 : 8, dt)
      for (const j of [...JOINTS, 'lift']) cur[j] += (target[j] - cur[j]) * s
      rig.torso.rotation.set(cur.torsoX, 0, cur.torsoZ)
      rig.head.rotation.set(cur.headX, cur.headY, cur.headZ)
      rig.armL.rotation.set(cur.armLX, 0, cur.armLZ)
      rig.armR.rotation.set(cur.armRX, 0, cur.armRZ)
      rig.legL.rotation.x = cur.legLX
      rig.legR.rotation.x = cur.legRX
      rig.root.position.y = 0.1 + cur.lift * rig.root.scale.y

      // Prompt beside the Coach (to the camera's right, chest high) while near and the window is shut.
      if (near && !win.isOpen) {
        rig.root.getWorldPosition(at)
        right.setFromMatrixColumn(camera.matrixWorld, 0)
        at.addScaledVector(right, 1.4)
        at.y += rig.height * 0.7
        at.project(camera)
        if (at.z < 1) win.prompt(((at.x + 1) / 2) * window.innerWidth, ((1 - at.y) / 2) * window.innerHeight)
        else win.prompt(null)
      } else win.prompt(null)

      // Coins tick down to the new total.
      if (coinTween) {
        coinTween.t = Math.min(1, coinTween.t + dt / 0.6)
        const e = 1 - (1 - coinTween.t) ** 3
        hud.set({ coins: Math.round(coinTween.from + (coinTween.to - coinTween.from) * e) })
        if (coinTween.t >= 1) coinTween = null
      }
      burst.update(dt)
    },
  }
}
