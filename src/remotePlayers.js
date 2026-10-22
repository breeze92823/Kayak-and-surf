// Everyone else in the room, drawn in the world: each remote player is a paddler (the game's
// character in their Bloxity look) on their equipped boat, with their name floating over them.
// Read straight from the room state net.js keeps (net.players, backend PlayerState): position,
// heading and slide tilt eased toward the last pose (sent every NET.poseEvery s), `pose` ('' paddle,
// 'surf', 'climb') and `speed01` driving the same animator and raft.js as the player's own raft.
// Nothing here collides; with no server (or disconnected) the set is empty.
import { Group, Vector3 } from 'three'
import { KAYAK_SHOP, PHYSICS } from './config.js'
import { net } from './net.js'
import { createRaft } from './raft.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { labelSprite } from './hub/signs.js'

const BOATS = new Set(KAYAK_SHOP.boats.map((b) => b.id))
const FOLLOW = 12 // 1/s: how fast a remote eases toward its last pose
const SNAP = 30 // m: a jump further than this (respawn, teleport) is not eased
const SPLASH_RANGE = 80 // m from the camera: closer rafts throw paddle and wake rings
const LABEL_Y = 2.75 // m over the raft
const LABEL_H = 0.42

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const ease = (k, dt) => 1 - Math.exp(-k * dt)

function parseLook(json) {
  try {
    const look = json ? JSON.parse(json) : null
    return look && typeof look === 'object' && look.equipped && typeof look.equipped === 'object' ? look : null
  } catch {
    return null
  }
}

// ripples (ripples.js) for their splashes; camera to keep those near the view. onAvatar() runs when a
// new character lands (main.js warms the renderer up for its materials).
export function createRemotePlayers({ ripples, camera, onAvatar = () => {} }) {
  const group = new Group()
  const remotes = new Map() // sessionId -> remote
  const goal = new Vector3()
  const before = new Vector3()

  function add(id, p) {
    const root = new Group()
    root.rotation.order = 'YXZ' // yaw, then the slide tilt (like the player group)
    const raft = createRaft(ripples)
    root.add(raft.group)
    const r = { id, root, raft, avatar: null, animator: null, label: null, name: null, look: null, boat: null, gen: 0, speed: 0 }
    r.pos = new Vector3(p.x, p.y, p.z)
    r.yaw = p.yaw
    r.pitch = p.pitch ?? 0
    r.roll = p.roll ?? 0
    setAvatar(r, buildDefaultCharacter())
    group.add(root)
    remotes.set(id, r)
    return r
  }

  function remove(r) {
    r.gen++ // drop a look still loading
    group.remove(r.root)
    disposeAnimator(r.animator)
    r.raft.setBoat('raft') // frees a painted shop hull
    r.label?.material.map.dispose()
    r.label?.material.dispose()
    remotes.delete(r.id)
  }

  function setAvatar(r, avatar) {
    if (r.avatar) r.root.remove(r.avatar)
    disposeAnimator(r.animator)
    r.avatar = avatar
    r.root.add(avatar)
    r.animator = makeAnimator(avatar)
  }

  // The player's look: the shared base rig dressed in their equipped Bloxity items ('' = default).
  async function loadLook(r, json) {
    const mine = ++r.gen
    const look = parseLook(json)
    const avatar = await loadBaseCharacter()
    if (mine !== r.gen) return
    if (look) {
      await attachEquippedAccessories(avatar, look.equipped, { skinTextureUrl: typeof look.skin === 'string' ? look.skin : null })
      if (mine !== r.gen) return
      applyProportions(avatar, look.proportions ?? null)
    }
    setAvatar(r, avatar)
    onAvatar()
  }

  function setName(r, name) {
    r.name = name
    if (r.label) {
      r.root.remove(r.label)
      r.label.material.map.dispose()
      r.label.material.dispose()
    }
    r.label = labelSprite([{ text: name, px: 56 }], LABEL_H)
    r.label.position.y = LABEL_Y
    r.root.add(r.label)
  }

  function sync() {
    const players = net.connected ? net.players : null
    for (const r of remotes.values()) if (!players?.has(r.id) || r.id === net.sessionId) remove(r)
    players?.forEach((p, id) => {
      if (id === net.sessionId) return
      const r = remotes.get(id) ?? add(id, p)
      r.state = p
      const name = p.username || 'Player'
      if (name !== r.name) setName(r, name)
      if (p.avatar !== r.look) {
        r.look = p.avatar
        loadLook(r, p.avatar).catch((err) => console.warn('[remotePlayers] look failed', err))
      }
      const boat = BOATS.has(p.boat) ? p.boat : 'raft'
      if (boat !== r.boat) r.raft.setBoat((r.boat = boat))
    })
  }

  function update(dt) {
    sync()
    for (const r of remotes.values()) {
      const p = r.state
      const k = ease(FOLLOW, dt)
      before.copy(r.pos)
      goal.set(p.x, p.y, p.z)
      if (r.pos.distanceTo(goal) > SNAP) r.pos.copy(goal)
      else r.pos.lerp(goal, k)
      r.yaw += wrap(p.yaw - r.yaw) * k
      r.pitch += ((p.pitch ?? 0) - r.pitch) * k
      r.roll += ((p.roll ?? 0) - r.roll) * k
      // Pace from the eased motion (drives the stroke like the player's own speed does).
      const moved = Math.hypot(r.pos.x - before.x, r.pos.z - before.z) / dt
      r.speed += (Math.min(moved, PHYSICS.moveSpeed * 3) - r.speed) * ease(6, dt)

      const surfing = p.pose === 'surf'
      const s01 = p.speed01 ?? 0
      const body = surfing ? { stand: 1, crouch: s01, lean: 0, brace: 0, jolt: 0, chatter: s01 * 0.5 } : null
      const climb = p.pose === 'climb' ? { effort: 0.6, tired: 0, steer: 0 } : null
      r.animator?.update(dt, { grounded: p.grounded !== false, speed: surfing ? 0 : r.speed, surf: body, climb })
      const lift = r.raft.update(dt, { feetY: r.pos.y, stroke: r.animator?.stroke, stand: Math.max(r.animator?.stand ?? 0, r.animator?.emoteWeight ?? 0), sliding: surfing })
      r.root.position.set(r.pos.x, r.pos.y + lift, r.pos.z)
      r.root.rotation.set(r.pitch, r.yaw, r.roll)
      if (camera.position.distanceTo(r.root.position) < SPLASH_RANGE) r.raft.splash(dt, { speed: r.speed, stroke: r.animator?.stroke })
    }
  }

  return {
    group,
    update,
    get count() {
      return remotes.size
    },
  }
}
