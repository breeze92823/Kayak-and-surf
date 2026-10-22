import { inputState } from './input.js'
import { player, floorAt } from './player.js'
import { CAMERA, PHYSICS, SURF } from './config.js'

// Third-person chase camera. It owns its own yaw/pitch (mouse look) and orbits the player, so
// the movement keys never steer the view. ONE smoothing stage, on the point it follows:
// position and look-at both derive from it, so they cannot disagree.
// The wheel sets a zoom target (minDistance..maxDistance, starting at `distance`) that glides;
// speed pulls the boom back and widens the FOV.
// While surfing (setSurfView) it becomes a low chase cam swinging in behind the raft's heading,
// pulling back and widening with speed; shake() adds trauma that rattles the view (rail knocks,
// the touchdown slam) on top of a speed rumble.
const state = {
  yaw: 0,
  pitch: CAMERA.startPitch,
}
const FLOOR_MARGIN = 0.3 // m the camera stays above the surface under it
const TELEPORT_DISTANCE = 15 // a same-frame jump bigger than this is a respawn: snap

// Driven by the Bloxity `camera_sensitivity` setting.
let sensitivity = 1
export function setCameraSensitivity(value) {
  sensitivity = value
}

const followed = { x: 0, y: 0, z: 0 } // smoothed feet position
const lastPlayerPos = { x: 0, y: 0, z: 0 }
const look = { x: 0, y: 0, z: 0 }
let initialised = false
let zoomTarget = CAMERA.distance // what the wheel asked for
let zoomEased = CAMERA.distance
let rush = 0 // eased 0..1 speed factor

const surf = { on: false, speed: 0, tilt: 0, eased: 0, savedZoom: null } // speed: 0..1 of full speed; tilt: slope rise behind the camera (rad)
let trauma = 0 // 0..1, decays; the shake is trauma squared
let shakeTime = 0

// Surf framing on/off (surf.js). Leaving it restores the zoom.
export function setSurfView(on) {
  if (on === surf.on) return
  surf.on = on
  if (on) {
    surf.savedZoom = zoomTarget
    zoomTarget = SURF.camera.distance
  } else {
    zoomTarget = surf.savedZoom ?? CAMERA.distance
    surf.savedZoom = null
  }
}
// tilt: how far the slide rises behind the chase camera (+ coming down, - climbing), so the
// framing pitch is measured from the slope, not the horizon.
export function setSurfSpeed(speed01, tilt = 0) {
  surf.speed = speed01
  surf.tilt = tilt
}
export function shake(amount) {
  trauma = Math.min(1, trauma + amount)
}

// Cheap smooth noise in -1..1: three detuned sines.
const wobble = (t, k) => (Math.sin(t * 13.1 + k) * 0.5 + Math.sin(t * 21.7 + k * 2.3) * 0.3 + Math.sin(t * 34.3 + k * 4.1) * 0.2)
function applyShake(camera, dt) {
  shakeTime += dt
  const floor = surf.on ? 0.22 * surf.eased * surf.eased : 0 // a steady rumble at speed
  trauma = Math.max(0, trauma - 1.4 * dt)
  const k = Math.max(trauma, floor) ** 2 * SURF.camera.shake
  if (k < 1e-4) return
  camera.position.x += wobble(shakeTime, 1) * k
  camera.position.y += wobble(shakeTime, 2) * k * 0.8
  camera.position.z += wobble(shakeTime, 3) * k
  camera.rotateZ(wobble(shakeTime, 4) * k * 0.09)
}

export function getYaw() {
  return state.yaw
}

// Snaps the orbit to sit directly behind the player.
export function syncYawToPlayer() {
  state.yaw = player.facing + Math.PI
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export function update(camera, dt) {
  state.yaw -= inputState.look.dx * CAMERA.lookSensitivity * sensitivity
  state.pitch += inputState.look.dy * CAMERA.lookSensitivity * sensitivity
  inputState.look.dx = 0
  inputState.look.dy = 0

  if (inputState.zoom !== 0) {
    zoomTarget = clamp(zoomTarget + inputState.zoom * CAMERA.zoomStep, CAMERA.minDistance, CAMERA.maxDistance)
    inputState.zoom = 0
  }
  state.pitch = clamp(state.pitch, CAMERA.minPitch, CAMERA.maxPitch)

  const p = player.position
  const jump = Math.hypot(p.x - lastPlayerPos.x, p.y - lastPlayerPos.y, p.z - lastPlayerPos.z)
  const teleported = initialised && jump > TELEPORT_DISTANCE
  lastPlayerPos.x = p.x
  lastPlayerPos.y = p.y
  lastPlayerPos.z = p.z
  if (teleported) {
    state.yaw = player.facing + Math.PI
    state.pitch = CAMERA.startPitch
  }

  if (!initialised || teleported) {
    followed.x = p.x
    followed.y = p.y
    followed.z = p.z
    initialised = true
  } else {
    const t = dt > 0 ? 1 - Math.exp(-CAMERA.followLerp * dt) : 1
    followed.x += (p.x - followed.x) * t
    followed.y += (p.y - followed.y) * t
    followed.z += (p.z - followed.z) * t
  }

  // Speed framing: pulling back has to lag the speed change or every stop punches the camera in.
  const speed = Math.hypot(player.velocity.x, player.velocity.z)
  // Against the normal paddling speed: player.moveSpeed is 0 when the climb runs out of stamina
  // (0 / 0 here made the whole camera NaN and the screen went black).
  const targetRush = clamp(speed / PHYSICS.moveSpeed, 0, 1)
  rush += (targetRush - rush) * (1 - Math.exp(-CAMERA.speedEase * dt))
  zoomEased += (zoomTarget - zoomEased) * (1 - Math.exp(-CAMERA.zoomEase * dt))
  // Surfing: swing in behind the heading (the mouse can look around; it drifts back) and lower.
  surf.eased += ((surf.on ? surf.speed : 0) - surf.eased) * (1 - Math.exp(-4 * dt))
  if (surf.on) {
    const toward = (1 - Math.exp(-SURF.camera.yawEase * dt))
    state.yaw += Math.atan2(Math.sin(player.facing + Math.PI - state.yaw), Math.cos(player.facing + Math.PI - state.yaw)) * toward
    state.pitch += (SURF.camera.pitch + surf.tilt - state.pitch) * toward
  }

  const distance = Math.max(1, zoomEased + CAMERA.speedDistance * rush + SURF.camera.speedDistance * surf.eased)
  const fov = CAMERA.fov + CAMERA.speedFov * rush + SURF.camera.fov * surf.eased
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }

  look.x = followed.x
  look.y = followed.y + player.dims.height * CAMERA.targetHeight
  look.z = followed.z

  const cp = Math.cos(state.pitch)
  const px = look.x + Math.sin(state.yaw) * cp * distance
  const pz = look.z + Math.cos(state.yaw) * cp * distance
  const py = Math.max(look.y + Math.sin(state.pitch) * distance, floorAt(px, pz) + FLOOR_MARGIN)

  camera.position.set(px, py, pz)
  camera.lookAt(look.x, look.y, look.z)
  applyShake(camera, dt)
}
