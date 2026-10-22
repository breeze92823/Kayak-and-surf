import { Clock, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { CAMERA, LANE_REWARD, LIGHT, PHYSICS, RIDE_PERKS, SPAWN, SPAWN_FACING, VIP_LANE } from './config.js'
import * as bloxity from './bloxity.js'
import { inputState, install as installInput } from './input.js'
import { installViewport, isTouch } from './device.js'
import { createTouchControls } from './touch.js'
import { player, resetPlayer, step as stepPlayer } from './player.js'
import { syncYawToPlayer, update as updateCamera } from './camera.js'
import { createFog, createLights, createSky } from './world.js'
import { createHub } from './hub/index.js'
import { LANES, SLIDE } from './hub/layout.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { createLoading, markLoaded } from './loading.js'
import { createRaft } from './raft.js'
import { createRipples } from './ripples.js'
import { createHud, formatNum } from './hud/index.js'
import { createSpray } from './spray.js'
import { createSpeedLines } from './speedlines.js'
import { createSurf } from './surf.js'
import { createClimb } from './climb.js'
import { createStamina } from './stamina.js'
import { createStaminaBoost } from './staminaBoost.js'
import { createCoach } from './coach.js'
import { createIndexWindow } from './hud/petIndex.js'
import { createPetsWindow } from './hud/pets.js'
import { inventory } from './petInventory.js'
import { createSpinWheel } from './spinWheel.js'
import { createShop } from './shop.js'
import { createEggs } from './eggs.js'
import { createMutate } from './mutate.js'
import { createDaily } from './daily.js'
import { createPetFollowers } from './petFollowers.js'
import { createTradeWindow } from './hud/trade.js'
import { createLoginButton } from './hud/login.js'
import { initNet, net, onNet, roster, sendPose } from './net.js'
import { kayaks } from './kayaks.js'
import { trails } from './trails.js'
import { emotes } from './emotes.js'
import { createBoatTrail } from './boatTrail.js'
import { boosts } from './boosts.js'
import { createRidePerks } from './ridePerks.js'
import { createEndTrophy } from './endTrophy.js'
import { createVipLane } from './vipLane.js'
import { createTeleport } from './teleport.js'
import { createRemotePlayers } from './remotePlayers.js'

installViewport()

// --- Bloxity + player state -----------------------------------------------
createLoading()
bloxity.init()
resetPlayer(SPAWN, SPAWN_FACING)
syncYawToPlayer()

// --- Renderer / scene -------------------------------------------------------
const GRAPHICS_PRESETS = {
  Low: { shadows: false, antialias: false, dpr: 1 },
  Medium: { shadows: true, antialias: false, dpr: 1.5 },
  High: { shadows: true, antialias: true, dpr: 2 },
  Ultra: { shadows: true, antialias: true, dpr: 2 },
}
const basePreset = GRAPHICS_PRESETS[bloxity.settings.graphics_quality] ?? GRAPHICS_PRESETS.High
const preset = isTouch ? { ...basePreset, antialias: false, dpr: Math.min(basePreset.dpr, 1.5) } : basePreset

const renderer = new WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' })
renderer.outputColorSpace = SRGBColorSpace
renderer.shadowMap.enabled = preset.shadows
renderer.shadowMap.type = PCFSoftShadowMap
renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.dpr))
document.body.appendChild(renderer.domElement)
installInput(bloxity.showMenu, renderer.domElement)
const hud = createHud() // DOM overlay (hud/); counters and the distance bar update through hud.set
if (import.meta.env.DEV) hud.set(RIDE_PERKS.devStart) // enough wins and coins to try Double Speed and AFK
createLoginButton(hud) // "Log in with Bloxity" in the top-right row while signed out
createTouchControls({ hud, showMenu: bloxity.showMenu }) // phones/tablets: stick, drag-look, pinch, JUMP / EMOTE, menu
const BLUE_LANE = LANES.find((l) => l.id === 'blue') // entering it puts the HUD in ride mode
const VIP_RIDE = LANES.find((l) => l.id === 'vip') // so does this one once bought (vipLane.js), at x2

const scene = new Scene()
scene.fog = createFog()
const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
camera.position.set(0, 8, 18)

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

const sky = createSky()
const lights = createLights(isTouch ? LIGHT.touchShadowMapSize : LIGHT.shadowMapSize)
const hub = createHub()
scene.add(sky, hub.group, lights.hemi, lights.sun, lights.sun.target)

// --- Player avatar ----------------------------------------------------------
// Always the game's own character (player.glb, or the procedural fallback). A signed-in
// player's equipped Bloxity cosmetics are attached to it and the customizer's body
// proportions applied; it rebuilds on customizer edits and sign-in/out.
const playerGroup = new Group()
scene.add(playerGroup)
const ripples = createRipples() // paddle splashes and wake rings on the lake (world space)
scene.add(ripples.mesh)
const raft = createRaft(ripples) // the player always sits on the raft, paddling (raft.js); lives in the player group
playerGroup.add(raft.group)
playerGroup.rotation.order = 'YXZ' // yaw, then the surf tilt (pitch/roll on the slide)
const spray = createSpray() // water thrown off the surfing raft (world space)
scene.add(spray.points)
const speedLines = createSpeedLines()
const surf = createSurf({ spray, ripples, raft: raft.group }) // the silver lane ride (surf.js)
const climb = createClimb({ spray, raft: raft.group }) // paddling up the slide: raft rocking, effort, sounds (climb.js)
const perks = createRidePerks({ hud, surf }) // Surf! (pays the climb's coins), Double Speed, AFK Auto-Play
const stamina = createStamina() // blue-lane climb: drains with height, slows the paddling when empty
const staminaBoost = createStaminaBoost({ hud, camera, stamina }) // the 4 s tap-for-stamina button over the climbing raft
const coach = createCoach({ hud, camera, scene, renderer, rig: hub.coach }) // E by the Coach: the Coach window
const petIndex = createIndexWindow({ hud, renderer, scene, sky }) // HUD Index tile: the pet collection book
const pets = createPetsWindow({ hud, renderer }) // HUD Pet tile: owned pets and the pet team
const spinWheel = createSpinWheel({ hud, camera, renderer, rig: hub.spin, index: petIndex, bag: pets }) // E by the SPIN pad or the HUD wheel button: the Spin window
const shop = createShop({ hud, camera, scene, renderer }) // E by the shop stall or the HUD Shop tile: the Kayak Shop
const trade = createTradeWindow({ hud, renderer }) // HUD Trade tile: players in the room, requests and the pet trade window
const eggs = createEggs({ hud, camera, renderer, index: petIndex, bag: pets }) // E by an egg, a pet pod or the bee: the egg window and hatching
const mutate = createMutate({ hud, camera, scene, renderer, index: petIndex }) // E on the Mutate pad: turn a pet Rainbow for coins
hud.on('offer', () => eggs.open('bee')) // the HUD's bee offer card: the bee's window
const daily = createDaily({ hud, renderer, spinWheel, index: petIndex, bag: pets }) // HUD check-list button (top right): the 7-day Daily Rewards calendar
const followers = createPetFollowers() // the pet team flying after the raft
scene.add(followers.group)
kayaks.onEquip((id) => raft.setBoat(id)) // the equipped boat replaces the log raft under the player
const boatTrail = createBoatTrail() // the equipped Trails Shop trail streaming off the stern
scene.add(boatTrail.mesh)
const endTrophy = createEndTrophy({ hud, scene }) // the one-time wins trophy at the top of the slide
const vipLane = createVipLane({ hud, camera, scene, gate: hub.vip }) // E by the VIP rope or pad: buy VIP lane access for wins
const teleport = createTeleport({ hud, camera }) // by the Teleport portal: "Need 100 Wins"
const remotes = createRemotePlayers({ ripples, camera, onAvatar: () => (cold = true) }) // everyone else in the room, on their boats
scene.add(remotes.group)
let hudClock = 0
let laneBest = 0 // highest metres reached this ride-lane visit, paid out as "You earned:"
let lastRideLane = null // the lane that visit is in (blue or VIP)

// Distance-bar racers: everyone else in the room at their metres up the slide (inside the lane
// channel, else 0), from the poses net.js relays; repainted only on whole-metre changes.
let racersKey = ''
function updateRacers() {
  const racers = roster().map((p) => {
    const up = Math.min(SLIDE.run, SLIDE.footZ - p.z)
    return { id: p.id, distance: Math.abs(p.x) <= SLIDE.innerHalf && up > 0 ? up : 0, pfp: p.pfp }
  })
  const key = racers.map((r) => `${r.id}:${Math.floor(r.distance)}:${r.pfp}`).join()
  if (key === racersKey) return
  racersKey = key
  hud.set({ racers })
}
onNet('roster', updateRacers)
onNet('connection', updateRacers)

// The hub's TOP 100 boards (COIN / WINS / PLAYTIME): the server's `leaderboard` rows (net.js;
// dashes while solo) and the player's own row ("#n You" when in the top ten). Wins are trophies.
// Repainted on each broadcast, at most once a second while the counters change, and every 30 s
// for the playtime; unchanged faces are skipped (signs.js).
const playtimeText = (s) => (s < 3600 ? `${Math.floor(s / 60)}m` : `${formatNum(Math.floor(s / 3600))}h ${Math.floor((s % 3600) / 60)}m`)
function paintBoards() {
  const own = { coins: hud.get('coins'), trophies: hud.get('trophies'), playtime: net.playtime }
  for (const [stat, board] of Object.entries(hub.boards)) {
    const fmt = stat === 'playtime' ? playtimeText : formatNum
    const rows = net.leaderboard?.[stat] ?? []
    const rank = rows.findIndex((r) => r.id === net.sessionId) + 1
    board.set(
      rows.map((r) => ({ name: r.name, value: fmt(r.value) })),
      { rank, value: fmt(own[stat] ?? 0) },
    )
  }
}
let boardsTimer = 0
hud.onSet((next) => {
  if (!('coins' in next || 'trophies' in next) || boardsTimer) return
  boardsTimer = setTimeout(() => {
    boardsTimer = 0
    paintBoards()
  }, 1000)
})
onNet('leaderboard', paintBoards)
setInterval(paintBoards, 30_000)
paintBoards()

let avatar = null
let animator = null
emotes.onEquip((id) => id && animator?.playEmote(id)) // equipping an emote shows it off once
let generation = 0

// three compiles a material's shader and uploads its textures and vertex buffers the first time
// it is drawn, so every object first coming into view (turning round, zooming out) froze a
// frame for 100-300 ms. warmUp() does it all at once: programs and textures for
// everything, then one draw with culling off and the avatar shown (buffers, shadow pass). The
// next render overwrites that frame, so it never shows.
let cold = true // set again when a new avatar lands
function warmUp() {
  renderer.compile(scene, camera)
  const culled = []
  scene.traverse((o) => {
    if (o.frustumCulled) culled.push(o)
    for (const m of [].concat(o.material ?? [])) {
      for (const value of Object.values(m)) if (value?.isTexture) renderer.initTexture(value)
      for (const u of Object.values(m.uniforms ?? {})) if (u.value?.isTexture) renderer.initTexture(u.value)
    }
  })
  for (const o of culled) o.frustumCulled = false
  playerGroup.visible = true
  renderer.render(scene, camera)
  for (const o of culled) o.frustumCulled = true
  cold = false
}

function setAvatar(next) {
  if (avatar) playerGroup.remove(avatar)
  disposeAnimator(animator)
  avatar = next
  playerGroup.add(avatar)
  animator = makeAnimator(avatar)
  cold = true
}

setAvatar(buildDefaultCharacter()) // visible immediately; replaced once the rig loads

async function loadAvatar() {
  // The SDK fires twice per change (optimistic + confirmed); only the newest load may land.
  const mine = ++generation
  try {
    const group = await loadBaseCharacter()
    if (mine !== generation) return
    const equipped = bloxity.authState.user ? bloxity.getEquippedAvatar() : null
    await attachEquippedAccessories(group, equipped, { skinTextureUrl: bloxity.getSkinTextureUrl() })
    if (mine !== generation) return
    applyProportions(group, bloxity.getProportions())
    setAvatar(group)
  } finally {
    if (mine === generation) markLoaded('avatar')
  }
}

let signedIn = null
bloxity.subscribeAuth((s) => {
  hud.set({ pfp: bloxity.getPfp() }) // the "You" head on the distance bar
  const now = !!s.user
  if (now !== signedIn) {
    signedIn = now
    loadAvatar() // also runs once at start to swap in the real rig
  }
})
bloxity.onAvatarChanged(loadAvatar)
bloxity.onProportionsChanged(() => applyProportions(avatar, bloxity.getProportions()))
bloxity.onSetting((key, value) => {
  if (key === 'graphics_quality') renderer.shadowMap.enabled = (GRAPHICS_PRESETS[value] ?? GRAPHICS_PRESETS.High).shadows
})

// --- Loop -------------------------------------------------------------------
const clock = new Clock()

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1) // clamp huge frames (tab switch, breakpoint)
  if (surf.active) surf.step(dt)
  else stepPlayer(dt)

  const speed = surf.active ? 0 : Math.hypot(player.velocity.x, player.velocity.z)
  const body = surf.active ? surf.body : null
  animator?.update(dt, { grounded: player.grounded, speed, surf: body, climb: !surf.active && climb.climbing ? climb.body : null })
  const lift = raft.update(dt, { feetY: player.position.y, stroke: animator?.stroke, stand: Math.max(animator?.stand ?? 0, animator?.emoteWeight ?? 0), sliding: surf.sliding })
  const pose = surf.active ? surf.pose : climb.pose // climb.pose is flat off the slide
  playerGroup.position.set(player.position.x, player.position.y + lift + pose.lift, player.position.z)
  playerGroup.rotation.set(pose.pitch, player.facing + (pose.yaw ?? 0), pose.roll)
  // Others' distance bars and their copy of this raft (remotePlayers.js).
  sendPose({
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    yaw: player.facing + (pose.yaw ?? 0),
    pitch: pose.pitch,
    roll: pose.roll,
    pose: surf.active ? 'surf' : climb.climbing ? 'climb' : '',
    speed01: surf.active ? surf.speed01 : Math.min(1, speed / PHYSICS.moveSpeed),
  })
  raft.splash(dt, { speed, stroke: animator?.stroke })
  boatTrail.update(dt, raft.group) // the player group is placed for this frame
  followers.update(dt, { x: playerGroup.position.x, y: playerGroup.position.y, z: playerGroup.position.z, facing: player.facing })
  surf.effects(dt)
  if (!surf.active) climb.effects(dt)
  spray.update(dt, camera, renderer)
  speedLines.update(dt, surf.sliding ? surf.speed01 : 0)
  ripples.update(dt)
  hudClock -= dt
  if (surf.active && hudClock <= 0) {
    hudClock = 0.2
    hud.set({ distance: Math.round(surf.best) })
  }

  remotes.update(dt)
  hub.update(dt)
  coach.update(dt)
  spinWheel.update(dt)
  shop.update(dt)
  eggs.update()
  mutate.update(dt)
  daily.update(dt)
  endTrophy.update(dt)
  vipLane.update(dt)
  teleport.update()
  if (inputState.emote && emotes.equipped) animator?.playEmote(emotes.equipped) // G
  inputState.emote = false
  inputState.interact = false // an E press nothing near wanted
  // Distance bar: metres climbed north of the slide's foot while inside its lane channel, 0 elsewhere
  // (a silver-lane surf feeds its own best height above). In a ride lane (blue, or VIP once bought)
  // the HUD switches to ride mode; the VIP lane climbs and pays x VIP_LANE.speed / .coins.
  const climbed = Math.min(SLIDE.run, SLIDE.footZ - player.position.z)
  const onSlide = Math.abs(player.position.x) <= SLIDE.innerHalf && climbed > 0
  const inLane = (l) => Math.abs(player.position.x - l.x) <= SLIDE.lane / 2 + SLIDE.rail
  const rideLane = surf.active || !onSlide ? null : inLane(BLUE_LANE) ? BLUE_LANE : vipLane.owned && inLane(VIP_RIDE) ? VIP_RIDE : null
  const inRideLane = !!rideLane
  const vip = rideLane === VIP_RIDE
  if (!surf.active) hud.set({ distance: onSlide ? climbed : 0 })
  stamina.update(climbed, { onSlide, climbing: inRideLane, laneX: rideLane?.x, lane: vip ? VIP_LANE.speed : 1 }) // sets player.moveSpeed for the next step
  staminaBoost.update(dt, { climbing: inRideLane && climbed < SLIDE.run - 1, afk: perks.afk }) // a click tops up stamina.value
  climb.update(dt, { stroke: animator?.stroke, stamina: stamina.value, climbingLane: inRideLane, surfing: surf.active }) // pulses it per stroke
  hud.set({ lane: inRideLane, stamina: stamina.value })
  // "You earned:" grows with the height reached this visit, LANE_REWARD.coinsPerMetre all the way up.
  // Leaving the lane (or switching lanes) starts a new visit.
  laneBest = rideLane && rideLane === lastRideLane ? Math.max(laneBest, climbed) : rideLane ? climbed : 0
  lastRideLane = rideLane
  // The pet team's coin multipliers add up (petInventory.js bonus('coin'), x1 with no team).
  const earned = Math.floor(laneBest * LANE_REWARD.coinsPerMetre * inventory.bonus('coin') * (vip ? VIP_LANE.coins : 1))
  if (inRideLane && earned !== hud.get('earned')) hud.set({ earned })
  perks.update({ surfing: surf.active, inLane: inRideLane, laneX: rideLane?.x, climbed, stamina: stamina.value }) // AFK steers the next step
  updateCamera(camera, dt)
  if (cold) warmUp()
  sky.position.copy(camera.position)
  lights.follow(player.position.x, player.position.z, player.position.y)
  renderer.render(scene, camera)
  markLoaded('scene')
}
renderer.setAnimationLoop(frame)

window.addEventListener('beforeunload', bloxity.teardown)
initNet({ hud }) // Colyseus (net.js): progress saves, the room roster and trades; solo play when there is no server

// Dev-only console hook, e.g. __game.teleport(10, 0, -5); __game.frame() steps one frame while the tab is hidden
if (import.meta.env.DEV) {
  window.__game = { player, camera, scene, renderer, frame, hud, surf, climb, stamina, staminaBoost, perks, coach, petIndex, pets, inventory, spinWheel, shop, eggs, mutate, daily, followers, remotes, kayaks, trails, emotes, boosts, spray, ripples, trade, net, endTrophy, vipLane, portal: teleport, teleport: (x, y, z, facing = player.facing) => { resetPlayer({ x, y, z }, facing); syncYawToPlayer() } }
}
