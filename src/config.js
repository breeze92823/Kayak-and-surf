// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'kayak-and-surf' // slug registered on bloxity.io
export const GAME_TITLE = 'Kayak & Surf'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// Colyseus server (../Kayak-and-surf -backend), one URL per Bloxity Legion channel: `npm run dev` /
// `build:dev` use _DEV (dev defaults to ws://localhost:2567), `npm run build` _MAIN. Empty = the
// Bloxity SDK resolves the channel's endpoint; neither = solo play (net.js).
const SERVER_URL_DEV = import.meta.env.VITE_SERVER_URL_DEV || (import.meta.env.DEV ? 'ws://localhost:2567' : '')
const SERVER_URL_MAIN = import.meta.env.VITE_SERVER_URL_MAIN || ''
export const SERVER_URL = import.meta.env.MODE === 'production' ? SERVER_URL_MAIN : SERVER_URL_DEV
export const NET = {
  saveDebounce: 1.5, // s of quiet after a change before saving
  saveMaxWait: 8, // s: a stream of changes still saves this often
  retry: 10, // s between connection attempts while the server is unreachable
  poseEvery: 0.1, // s between `pose` messages while moving (others' distance bars read them)
}

// --- World (metres: +X east, +Z south, +Y up) -------------------------------
export const GROUND_Y = -1.6 // the lake bed; the hub island's deck is y = 0 (hub/layout.js)
// The lake around the hub island (hub/layout.js HUB_SCALE). The slide runs on north past it, through
// its areas, to `northZ` (the player's north limit: just inside hub/layout.js SLIDE.endZ, -75013.6,
// so the raft stops at the slide's end instead of paddling off it).
export const WORLD_BOUNDS = { minX: -90, maxX: 90, minZ: -215, maxZ: 115, northZ: -75013 }
export const SPAWN = { x: 0, y: 0, z: 10 } // the red cross junction on the island, looking north up the slide (hub/layout.js)
export const SPAWN_FACING = Math.PI // yaw the character faces on spawn (PI = toward -Z)

// --- Physics feel (player.js) -----------------------------------------------
export const PHYSICS = {
  moveSpeed: 10, // m/s on flat ground
  accel: 75, // m/s^2 toward the target velocity
  decel: 69, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  gravity: -22, // m/s^2
  jumpSpeed: 7.5, // m/s
  killY: -30, // fell this far below the ground: respawn
}
export const PLAYER_DIMS = { radius: 0.4, height: 1.8 }

// --- Look ------------------------------------------------------------------
export const COLORS = {
  horizon: '#c4f6ff', // pale cyan horizon (also the fog colour)
  zenith: '#00b9f7', // the saturated Roblox-style sky
  sand: '#e2c07a',
  sandDark: '#c9a35c',
  sandLight: '#f1d9a0',
}
export const FOG = { near: 130, far: 470 }
export const LIGHT = {
  sunColor: '#fff6e0',
  sunIntensity: 2.4,
  sunPosition: [-25, 70, 35], // high and behind-left
  shadowMapSize: 2048,
  touchShadowMapSize: 1024, // phones and tablets (device.js isTouch): a quarter of the texels, same coverage
  shadowRange: 60, // half-width of the shadow frustum around the player
  hemiSky: '#eaf5ff',
  hemiGround: '#e6c77e', // warm bounce light off the sand
  hemiIntensity: 1.7,
}

// Default (signed-out / fallback) character look.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#d9822b', hair: '#5a3a22' }

// Per-surface PBR defaults, spread into MeshStandardMaterial.
export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 1, metalness: 0 },
  PLASTIC: { roughness: 0.75, metalness: 0 }, // Roblox SmoothPlastic look for hub parts
  NEON: { roughness: 0.4, metalness: 0 },
  ROCK: { roughness: 0.9, metalness: 0 },
  WATER: { roughness: 0.25, metalness: 0 },
}
export const WATER_COLOR = '#2f9fe0'

// Splash-park hub palette (hub/), sampled from the reference shot.
export const HUB_COLORS = {
  maroon: '#9b4448', // cliffs, slide body and walls
  maroonDark: '#82393d', // upper cliff tiers
  grass: '#3cd43a',
  grassDark: '#2fb52f', // drips under the grass caps
  snow: '#f2f7ff', // Frosty Peaks caps (slide areas)
  snowShade: '#cfe0f2', // drips under the snow caps
  rockBlue: '#7d8fa8', // Frosty Peaks cliffs
  rockBlueDark: '#6b7d96',
  archGold: '#ffc93a', // the glowing ring inside each area gate
  archIce: '#7fe8ff',
  archCloud: '#fff4e0', // Cloud Summit gate
  deck: '#6a564c', // plank floor of the hub island
  deckSide: '#3d2a20',
  sand: '#f4c6a4', // beaches and the island's waterline skirt
  lake: '#0ab9f5',
  lakeDeep: '#0794e6', // open water away from the shores (hub/lake.js)
  lakeShallow: '#4fe3e6', // turquoise over the sand skirts and beaches
  lakeLine: '#bff4ff',
  foam: '#ffffff', // shore foam, sun glints and raft ripples
  carpet: '#e22b3e', // the red cross and the south stairs
  carpetChevron: '#ffe4e8',
  chevronVip: '#ffa21a',
  petRing: '#a43dff', // purple band under the pet pedestals
  petRingLine: '#d08bff',
  petRingLip: '#ff4dff', // glowing deck-side edge of the purple band
  bandSide: '#1e1719', // near-black step faces of both rim bands
  counterLip: '#ffb21a',
  pedestal: '#1f1b1d',
  pedestalGold: '#ffc21a',
  counterTop: '#ffcf2e',
  counterFront: '#8a4216',
  awning: '#e8283a',
  padBlue: '#22c6ff',
  padPurple: '#9a3dff',
  wallFrame: '#e01b2c',
  wallPanel: '#3a2b26',
  domeCyan: '#22f2ff',
  donateWhite: '#f6f6f8',
  donatePink: '#e22bd6',
  spinRed: '#ff2b3b',
  pier: '#8c6a4e',
  dragonGold: '#ffa51c',
  surfGreen: '#3ad13a',
  surfYellow: '#ffe11a',
  trunk: '#8a4a1c',
  leaves: '#62c91c',
  leavesDark: '#4aa915',
  signBoard: '#3a1013',
  signGold: '#e3a51f',
  fence: '#7b4b2a',
  poolRim: '#ffffff',
  pool: '#0bbcf5',
  poolShallow: '#3fe0f5', // the pool's lighter rim water
  poolLine: '#c8f6ff',
  arrow: '#ff1f2e',
  chevron: '#ffb612',
  vipPad: '#ffc21a',
  vipRope: '#ff4aa8',
  vipPost: '#ff9a1a',
  bezel: '#5d6a75',
  screen: '#05080a',
  surfWhite: '#f4fdff',
  surfBlue: '#2f6fc0',
  surfDark: '#14233d',
  stone: '#9aa3ab',
  gem: '#3fb6ff',
  kayak: '#ff7a1a',
  kayakDeck: '#ffd21a',
  paddle: '#ffd31a',
  jacket: '#1c1f26',
  shirt: '#2d6cff',
  statueHead: '#e9e9e9',
  statueHair: '#d9822b',
  orb: '#2a7dff',
  cloud: '#ffffff',
}
// Slide lanes west to east: water, the white flow lines on it, and the rails either side.
// Water: `deep` down the middle channel, `mid` body, `light` toward the rails, `foam` streaks and rim.
export const LANE_COLORS = {
  silver: { deep: '#6f8798', mid: '#a9bfcc', light: '#d3e3ec', foam: '#ffffff', rail: '#ffbd70' },
  blue: { deep: '#1663e0', mid: '#3a98ff', light: '#86d0ff', foam: '#e6f7ff', rail: '#2f62f5' },
  vip: { deep: '#ff9417', mid: '#ffcf1f', light: '#fff06b', foam: '#fffbe2', rail: '#ffa21a' },
}
export const WATER_FLOW = { lane: 9 } // m/s the lane streaks race downhill

// Lake shader (hub/lake.js). The shore map is baked once from the colliders, `texel` m per pixel,
// over WORLD_BOUNDS grown by `margin`; foam reaches `shoreRange` m out from land.
export const LAKE_FX = {
  texel: 1,
  margin: 20,
  shoreRange: 5,
  causticScale: [6.2, 9.5], // m per tile of the two crossing caustic webs
  foamRollSpeed: 0.45, // foam bands per second rolling in toward the shore
  foamBands: 2.6, // bands across the foam range (fewer = wider, further apart)
  froth: 0.14, // lumpiness of the foam line along the shore
  sparkle: 1, // sun glint strength
  // The island's splash pool (poolWater): larger, calmer webs, foam `rimRange` m in from its rim
  // and churn spreading `footRange` m out from where the slide pours in; wider bands and a
  // lumpier foam line so they read against the white rim.
  pool: { causticScale: [8, 12], rimRange: 3, footRange: 6, foamBands: 1.7, froth: 0.4, glow: 0.3 },
}

// Raft ripples (ripples.js): paddle splashes, the wake behind a moving raft, idle lapping.
export const RIPPLES = {
  max: 64, // instance pool (one draw call)
  wakeEvery: 0.09, // s between wake rings at full speed
  idleEvery: 1.6, // s between lapping rings while drifting
}

// Surfing down the silver lane (surf.js), only from the HUD's Surf! button (its foot is walled off):
// the raft hops into the lane, spins round as the player stands, surfs down and slams to a halt on
// the flat (within `stopDistance`). Slope physics along the lane: gravity, `friction` (x normal
// force) and quadratic `drag`; W tucks (less drag), S brakes. A/D carve across the lane.
export const SURF = {
  fullSpeed: 45, // m/s counted as full speed for the effects (spray, camera, sound)
  friction: 0.02,
  drag: 0.003, // per metre: terminal speed ~49 m/s down the 20 degree slope
  // A long way up (km), the ride down is sped up (surf.js `warp`: the raft covers `warp` x the
  // metres its speed says) so no descent takes much over `longRide` s; the effects keep the real speed.
  longRide: 30, // s
  tuckDrag: 0.6, // drag multiplier holding W on the way down
  brakeDrag: 2.4, // holding S
  carveAccel: 16, // m/s^2 across the lane from A/D
  carveDamping: 2.2, // 1/s the sideways speed dies away
  wobble: 1.3, // m/s^2 of drift the water pushes the raft around with at full speed
  raftHalfWidth: 0.95, // keeps the raft inside the lane's rails
  railBounce: 0.35, // sideways speed kept off a rail
  turnTime: 1, // s to spin round at the top (the player stands up meanwhile)
  shiftHop: 1.2, // m the raft hops over the rails when Surf! moves it across into the silver lane
  stopDistance: 4.6, // m the raft skids on the flat after touching down (inside the 5 m limit)
  settleTime: 1.1, // s after stopping before the player sits back down and paddles again
  chatter: 0.018, // rad of slide vibration at full speed
  spray: { max: 900, rate: 340, life: [0.55, 1.1], size: [0.35, 0.95] }, // spray.js pool + particles/s at full speed
  camera: { distance: 6.5, speedDistance: 2.5, pitch: 0.22, fov: 20, yawEase: 3.5, shake: 0.55 }, // chase framing while surfing (pitch above the slope)
  sound: { volume: 0.8 },
}

// --- Blue-lane coins (main.js -> HUD "You earned:") -----------------------------
// Coins for the height reached this blue-lane visit: `coinsPerMetre` for every metre up the slide,
// all the way to the 75 km top (93,750 coins there), times the pet team's coin multiplier
// (petInventory.js bonus('coin')). Surf! (by hand or AFK) pays the visit's total into the coin
// counter (main.js).
export const LANE_REWARD = {
  coinsPerMetre: 1.25, // the old 500 coins at 400 m, now uncapped
}

// --- Trophy at the top of the slide (endTrophy.js, hub/layout.js END_TROPHY_SPOT) ----------------
// Reaching it (anywhere across the lane channel, within `range` m of it along the slide) pays `wins`
// (trophies) once and it disappears. In memory like the wins counter: a reload puts it back.
export const END_TROPHY = {
  wins: 15,
  range: 3,
  height: 2.4, // m, cup and base
  spin: 1.2, // rad/s it turns while waiting
}

// --- Blue-lane ride buttons (ridePerks.js) --------------------------------------------
// Double Speed: `wins` (trophies) a go for `time` s of x(1 + pct/100) climb speed (boosts.js kind
// 'double'; buying while it runs adds the time on top). AFK Auto-Play: bought once for `coins`,
// then toggles: the raft climbs, surfs down once stamina is spent (or at the top), paddles back
// into the blue lane and goes again; any steering key turns it off. `devStart`: the wins and coins
// a dev build starts with, so both can be tried.
export const RIDE_PERKS = {
  doubleSpeed: { wins: 10, time: 5 * 60, pct: 100 },
  afk: { coins: 50000 },
  devStart: { trophies: 100, coins: 100000 },
}

// --- VIP lane access (vipLane.js, hub/layout.js VIP) ----------------------------------
// The VIP lane is roped off (slide.js walls off its foot) until bought once for `wins` (trophies):
// E within `promptRange` m of the rope or the gold pad buys it, the rope drops and the lane opens.
// In memory like the wins counter: a reload ropes it off again. Once open it rides like the blue
// lane (auto-climb, stamina, "You earned:", Surf!, AFK) with the label's perks: x`speed` climb
// speed (on top of every other bonus) and x`coins` the climb's coin payout.
export const VIP_LANE = {
  wins: 25000,
  promptRange: 4.5,
  speed: 2,
  coins: 2,
}

// --- Teleport portal (teleport.js, hub/layout.js PORTAL) ---------------------------------
// The portal on the portal isle needs `wins` (trophies, not spent) to use: within `promptRange` m
// an "E  Need 100 Wins / Teleport" prompt hangs over it while short. It has nowhere to go yet.
export const TELEPORT = {
  wins: 100,
  promptRange: 6,
}

// --- Blue-lane stamina (stamina.js) ---------------------------------------------
// Entering the blue lane the raft paddles itself up the slide. Full at the foot, the bar empties
// after `drainTime` s of climbing (coach / wheel stamina bonuses stretch it), whatever the speed,
// so every speed upgrade carries the raft proportionally further up the 75 km slide. Climb speed
// follows the stamina left: `climbSpeed` when full, falling toward `emptySpeed` as it drains; empty,
// the raft keeps climbing at `emptySpeed` (until Surf! or the top). Both are multiplied by the
// speed bonuses (boat up to x10, coaches, wheel, Double Speed). Unboosted, a full bar lasts about
// (climbSpeed + emptySpeed) / 2 x drainTime = 140 m (Grass Canyon); the boost button's taps
// (STAMINA_BOOST, ~1.5 points/s at best) stretch it but can't outpace the drain. Refills off the slide.
export const STAMINA = {
  max: 100,
  drainTime: 40, // s of climbing from full to empty (2.5 points/s)
  climbSpeed: 5, // m/s up the lane at full stamina
  emptySpeed: 2, // m/s up the lane once stamina is spent (it never stops)
  // A/D steer by turning the bow (the raft only goes where it points): up to `steerAngle` off
  // straight up, easing at `steerEase`; the blue lane's rails knock it back (`railBounce` of the
  // sideways speed kept) and straighten it.
  steerAngle: 0.35, // rad (20 degrees)
  steerEase: 3, // 1/s
  raftHalfWidth: 0.95,
  railBounce: 0.3,
}

// --- Stamina boost button (staminaBoost.js, hud/staminaBoost.js) -----------------------
// While climbing the blue lane (not on AFK, stamina under full) a round button pops up over the
// raft `firstAfter` s into the climb and then every `every` s (random in the range); it stays
// `showFor` s, counting down, and goes. Only a click or tap (with the mouse captured, a click
// anywhere) gives back `refill` stamina points (capped at STAMINA.max); no key does.
export const STAMINA_BOOST = {
  showFor: 4, // s on screen
  firstAfter: 3, // s of climbing before the first one
  every: [10, 15], // s between one going and the next appearing
  refill: 25, // stamina points per tap
  above: 3.2, // m above the raft the button floats
}

// --- Spin wheel (spinWheel.js, hud/spinWheel.js) --------------------------------------
// Paddle up to the SPIN pad and press E (or click the HUD's wheel button) to open the Spin window
// (laid out off the user's reference shot). Each spin costs one spin: the player starts with
// `startSpins`, earns one free spin every `freeEvery` seconds, and the +1 / +10 buttons sell spins
// for `prices` coins (`tenWas` is the struck-out price on the +10 button). The wheel turns `turns` full times over
// `spinTime` s ("Skip Animation": `skipTime`) and stops on a prize picked by `weight`. `prizes`
// run clockwise from the top: boosts add `pct`% to speed / stamina / win for `time` s (boosts.js),
// coins add `amount` to the counter, the pet goes into the Index. `colors` paint the wedge edge to
// edge ('rainbow' for the pet's); `potion` is the bottle colour.
export const SPIN_WHEEL = {
  promptRange: 7, // m from the wheel where the E prompt shows and E opens the window
  closeRange: 10, // m: paddling further away closes the window (unless it was opened from the HUD)
  startSpins: 1,
  freeEvery: 24 * 3600, // s between free spins
  prices: { one: 25e3, ten: 200e3, tenWas: 250e3 }, // coins
  spinTime: 5,
  skipTime: 0.6,
  turns: 5,
  prizes: [
    { id: 'win', kind: 'boost', boost: 'win', pct: 100, time: 300, label: '+100% Win for 5min', potion: '#ff9a2a', colors: ['#c8f25a', '#6ee86a'], weight: 16 },
    { id: 'speed', kind: 'boost', boost: 'speed', pct: 50, time: 300, label: '+50% Speed for 5min', potion: '#38b8ff', colors: ['#e04ae8', '#ff2a5a'], weight: 22 },
    { id: 'coinsBig', kind: 'coins', amount: 103e3, label: 'Coins +103K', colors: ['#2aa2ff', '#5ae0ff'], weight: 8 },
    { id: 'wolf', kind: 'pet', pet: 'spiritwolf', label: 'Spirit Wolf', colors: 'rainbow', weight: 2 },
    { id: 'coins', kind: 'coins', amount: 10e3, label: 'Coins +10K', colors: ['#ff9a1a', '#ffe23a'], weight: 30 },
    { id: 'stamina', kind: 'boost', boost: 'stamina', pct: 50, time: 300, label: '+50% Stamina for 5min', potion: '#ff3a4a', colors: ['#a64af0', '#ff6ab8'], weight: 22 },
  ],
}

// --- Daily rewards (daily.js, hud/daily.js) ---------------------------------------------
// The HUD's top-right check-list button opens a 7-day calendar (after Paper-plane's): Day N opens
// N - 1 days after the week starts and stays claimable until claimed (in any order); claiming the
// last one starts the next week a week after this one began (or now, if that is later). A signed-in
// player's week lives on the server (backend src/daily.ts, whose DAILY_REWARDS must match `days`:
// it decides each claim and sends the reward); a guest's in this browser (localStorage
// `storageKey`). `dayMs` is the guest calendar's (the server's comes with its week, backend
// DAILY_DAY_MS). Rewards by `kind`: coins
// (`amount`), trophies (`amount`), spins (`amount` spin-wheel spins), boost (boosts.js `boost`, `pct`
// for `time` s, shown as a chip under the counters), pet (petIndex.js `pet`; refused while the Pet
// window's storage is full). VITE_DAILY_DAY_MS shortens a "day" for testing.
export const DAILY_REWARDS = {
  dayMs: Number(import.meta.env.VITE_DAILY_DAY_MS) > 0 ? Number(import.meta.env.VITE_DAILY_DAY_MS) : 24 * 3600 * 1000,
  storageKey: 'kayakSurf.daily',
  days: [
    { kind: 'coins', amount: 5e3 },
    { kind: 'spins', amount: 1 },
    { kind: 'boost', boost: 'speed', pct: 50, time: 600 },
    { kind: 'coins', amount: 25e3 },
    { kind: 'trophies', amount: 15 },
    { kind: 'spins', amount: 3 },
    { kind: 'pet', pet: 'pegasus' },
  ],
}

// --- Lunar New Year event (hub/island.js) ----------------------------------------------
// The gate's sign counts down to `start` (the player's local time), then shows the event is on.
export const LUNAR_EVENT = { start: '2026-10-24T00:00:00' }

// --- Pet team (petInventory.js, hud/pets.js) ------------------------------------------
// The HUD's Pet tile opens the Pet window: every pet the player owns (petIndex.js species, each in
// a variant), at most `storage` of them, and the team of up to `team` equipped pets. Every pet has a
// coin multiplier: its rarity's `power` range, spread low -> high down that rarity's list in
// petIndex.js, times its variant's `variantMult`; the team's multipliers add up (petInventory.js
// bonus('coin'), waiting for coin earnings). The green + (one more team slot, up to `maxTeam`) is a
// Robux buy: dev builds only until bloxity.js has a purchase call. `start` is the inventory a new
// player begins with (also discovered in the Index): none, pets come from eggs, the wheel and prizes.
export const PET_TEAM = {
  team: 3,
  maxTeam: 6,
  storage: 50,
  power: {
    common: [1.2, 4],
    uncommon: [5, 9],
    rare: [10, 22],
    epic: [25, 45],
    legendary: [60, 120],
    secret: [150, 300],
    limited: [40, 175],
    exclusive: [150, 500],
  },
  variantMult: { normal: 1, big: 1.5, huge: 3, shiny: 2, rainbow: 2.5 },
  start: [],
}

// --- Eggs and hatching (eggs.js, hatch.js, hud/eggs.js) ----------------------------------
// Paddle up to an egg on the island and press E for its window: the egg's pets with their odds,
// Open 1 (E) / Open 3 (R) / Auto (T). Every egg costs coins (`prices`, by petIndex.js EGGS id). The
// pods on the purple band and the bee on the yellow band sell their pet outright (`pets`, coins, no
// roll). A hatch first picks a rarity by `odds` (only the rarities the egg holds count), then one of
// the egg's pets of that rarity evenly; then a variant: each of `variants` is tried in order at its
// chance x the Index luck bonus (petIndex.js bonus('luck')), else Normal (Rainbow is not hatched).
// Hatched pets go into the Pet window (petInventory.js) and the Index.
export const EGG_HATCH = {
  promptRange: 4.5, // m from an egg where the E prompt shows and E opens its window
  closeRange: 7, // m: paddling further away closes the window (unless it was opened from the HUD)
  openMany: 3, // eggs per Open 3
  autoDelay: 0.35, // s between Auto's hatches
  time: { shake: 1.6, reveal: 1.8, auto: 0.55 }, // s: eggs shaking, cards shown; Auto plays at x`auto`
  odds: { common: 70, uncommon: 22, rare: 6, epic: 1.8, legendary: 0.2, secret: 0.0001, limited: 90, exclusive: 10 },
  variants: { huge: 1 / 400, big: 1 / 40, shiny: 1 / 100 },
  prices: { basic: 20, canyon: 150, frost: 2500, rainbow: 15e3, lunar: 25e3, cloud: 75e3, cream: 500e3, stone: 2.5e6 },
  pets: { bee: 9e3, griffin: 5e6, phoenix: 25e6, hydra: 60e6, dragon: 150e6 },
}

// --- Mutate machine (mutate.js, hud/mutate.js) -------------------------------------------
// Paddle onto the Mutate pad and press E: pick one of your pets and pay its rarity's `cost` in coins
// to turn it `variant` (same pet, same team slot). Only pets whose variant is worth less than it
// (PET_TEAM.variantMult) can go in, so a Huge pet is never made weaker.
export const MUTATE_MACHINE = {
  promptRange: 4, // m from the pad where the E prompt shows and E opens the window
  closeRange: 7, // m: paddling further away closes the window
  variant: 'rainbow',
  cost: { common: 5e3, uncommon: 25e3, rare: 100e3, epic: 500e3, legendary: 2.5e6, secret: 25e6, limited: 10e6, exclusive: 50e6 },
}

// Equipped pets following the raft (petFollowers.js): an arc behind it, easing after it, bobbing.
export const PET_FOLLOW = {
  radius: 3.4, // m behind the player
  spread: 0.55, // rad between neighbours in the arc
  height: 1.7, // m over the raft
  bob: 0.15, // m
  followHz: 4, // how quickly they ease after the raft
  size: 0.85, // m: the longest side of a normal pet's model
  variantSize: { big: 1.25, huge: 1.6 },
}

// --- Coaches (training.js, coach.js, hud/coach.js) ----------------------------------
// Paddle up to the Coach on the deck and press E (or click the HUD's Coach tile) to open the
// Coach window: the roster below (from the user's reference shots), each bought with coins; none
// is owned or equipped at the start (the Wooden Raft is the only free thing). A coach marked `locked` would be
// always on, outside the slots (none is now). Any number can be bought, but only as many equipped at once as the
// equipped boat's `coaches` (KAYAK_SHOP: none up to the Cross Canoe, 1 from the Cloud Kayak), and
// every equipped coach adds its `effects` (% each): speed (blue-lane climb speed) and stamina (how high the climb goes
// before tiring) are read by stamina.js; coin waits for coin earnings. The figure for each id is in
// hub/coachFigure.js; `rarity` colours the portrait (common green, rare blue, epic purple, legendary
// yellow, mythic pink, event rainbow). Prices use the HUD's suffixes (formatNum): Qa 1e15, Qi 1e18,
// Sx 1e21, Sp 1e24, Oc 1e27, No 1e30, Dc 1e33.
export const COACH_TRAINING = {
  promptRange: 7, // m from the Coach where the E prompt shows and E opens the window
  closeRange: 10, // m: paddling further away closes the window (unless it was opened from the tile)
  coaches: [
    { id: 'duck', name: 'Coach Little Duck', effects: { speed: 5 }, price: 500, rarity: 'common' },
    { id: 'watermelon', name: 'Coach Watermelon', effects: { coin: 5 }, price: 1.2e3, rarity: 'common' },
    { id: 'energy', name: 'Energy Man', effects: { stamina: 10 }, price: 4e3, rarity: 'common' },
    { id: 'beard', name: 'Uncle Beard', effects: { coin: 10 }, price: 12e3, rarity: 'common' },
    { id: 'handsome', name: 'Handsome Guy', effects: { speed: 10 }, price: 30e3, rarity: 'rare' },
    { id: 'sped', name: 'I show sped', effects: { stamina: 18 }, price: 85e3, rarity: 'rare' },
    { id: 'tump', name: 'Tump', effects: { coin: 13, speed: 18 }, price: 2.5e6, rarity: 'rare' },
    { id: 'purple', name: 'Purple Speed', effects: { speed: 15, stamina: 15 }, price: 35e6, rarity: 'rare' },
    { id: 'shark', name: 'Coach Black Shark', effects: { coin: 25, stamina: 15 }, price: 280e6, rarity: 'epic' },
    { id: 'domineering', name: 'Domineering Guy', effects: { stamina: 26 }, price: 800e6, rarity: 'epic' },
    { id: 'torrent', name: 'Coach Torrent', effects: { speed: 27, coin: 20 }, price: 1e12, rarity: 'legendary' },
    { id: 'boxing', name: 'Boxing Champion', effects: { coin: 40 }, price: 15e12, rarity: 'legendary' },
    { id: 'wrestling', name: 'Wrestling Champion', effects: { speed: 34, coin: 25 }, price: 40e12, rarity: 'legendary' },
    { id: 'girl', name: 'Girl Power', effects: { speed: 16, coin: 16, stamina: 13 }, price: 6e18, rarity: 'mythic' },
    { id: 'supreme', name: 'Supreme', effects: { speed: 18, coin: 20, stamina: 14 }, price: 27e18, rarity: 'mythic' },
    { id: 'temple', name: 'Temple Guide', effects: { speed: 30, coin: 30 }, price: 135e18, rarity: 'legendary' },
    { id: 'dancer', name: 'Fire Dancer', effects: { speed: 21, coin: 20, stamina: 15 }, price: 540e18, rarity: 'mythic' },
    { id: 'reef', name: 'Reef Explorer', effects: { stamina: 28 }, price: 4.32e21, rarity: 'legendary' },
    { id: 'mountain', name: 'Mountain Watcher', effects: { speed: 22, coin: 21, stamina: 16 }, price: 12.96e21, rarity: 'mythic' },
    { id: 'choir', name: 'Choir Spirit', effects: { speed: 31, coin: 31 }, price: 58.32e21, rarity: 'legendary' },
    { id: 'bristle', name: 'Bristlebeard', effects: { speed: 22, coin: 22, stamina: 17 }, price: 291.6e21, rarity: 'mythic' },
    { id: 'holly', name: 'Holly the Giftrunner', effects: { stamina: 29 }, price: 1.17e24, rarity: 'legendary' },
    { id: 'cookie', name: 'Cookie Captain', effects: { speed: 23, coin: 24, stamina: 17 }, price: 233.1e24, rarity: 'mythic' },
    { id: 'spaceman', name: 'Spaceman Neil', effects: { coin: 35, speed: 30 }, price: 17.5e27, rarity: 'legendary' },
    { id: 'zoidreg', name: 'Zoidreg', effects: { speed: 19, coin: 27, stamina: 16 }, price: 37e27, rarity: 'mythic' },
    { id: 'martian', name: 'Bearded Martian', effects: { speed: 24, coin: 25, stamina: 18 }, price: 90e27, rarity: 'mythic' },
    { id: 'dino', name: 'Dino Man', effects: { coin: 36, stamina: 28 }, price: 6e30, rarity: 'mythic' },
    { id: 'rodzilla', name: 'Rodzilla', effects: { speed: 25, coin: 26, stamina: 19 }, price: 35e30, rarity: 'mythic' },
    { id: 'pixie', name: 'Fire Pixie', effects: { speed: 26, coin: 27, stamina: 20 }, price: 50e33, rarity: 'legendary' },
    { id: 'devil', name: 'Halloween Devil', effects: { coin: 10, stamina: 16 }, price: 100e33, rarity: 'event' }, // an event reward in the reference; sold for coins here
  ],
  volume: 1, // the Coach's sounds (whistle, claps, coins, clipboard) on top of the SURF volume
}

// --- Kayak Shop (kayaks.js, shop.js, hud/shop.js) ------------------------------------
// Paddle up to the shop stall (or onto the SHOP pad in front of it) and press E, or click the HUD's
// Shop tile, to open the Kayak Shop (laid out off the user's reference shots). Boats are bought with
// coins in list order: only the next one can be bought, the rest show locked. The Wooden Raft is
// owned and equipped from the start. One boat is equipped at a time and the player paddles it
// (raft.js swaps the model, hub/kayakModels.js). `speed` (the lightning) adds `speedPct`% blue-lane
// climb speed per point (stamina.js); `coaches` (the strongman) is how many coaches can be equipped
// while paddling it (training.js); switching to a boat with fewer takes the extras off. The Trails and Emotes tabs sell trails and
// emotes (below).
// Rainbow Horse and Toucan speeds aren't in the shots (only their prices): they sit between their
// neighbours. Prices before the Summer Kayak's 360K aren't in the shots either.
export const KAYAK_SHOP = {
  promptRange: 6, // m from the SHOP pad or the stall where the E prompt shows and E opens the window
  dragonRange: 4, // m from the Golden Dragon Kayak on the magenta pad (its own prompt; the cloud egg is 8.6 m off)
  closeRange: 12, // m: paddling further away closes the window (unless it was opened from the tile)
  speedPct: 0.5, // % climb speed per speed point (612 -> +306%)
  boats: [
    { id: 'raft', name: 'Wooden Raft', speed: 0, coaches: 0, price: 0 },
    { id: 'canoe', name: 'Wooden Canoe', speed: 8, coaches: 0, price: 150 },
    { id: 'kayak', name: 'Kayak', speed: 25, coaches: 0, price: 900 },
    { id: 'rainbow', name: 'Rainbow Canoe', speed: 36, coaches: 0, price: 3e3 },
    { id: 'wave', name: 'Wave Canoe', speed: 55, coaches: 0, price: 9e3 },
    { id: 'surge', name: 'Surge Canoe', speed: 108, coaches: 0, price: 24e3 },
    { id: 'cross', name: 'Cross Canoe', speed: 175, coaches: 0, price: 55e3 },
    { id: 'cloud', name: 'Cloud Kayak', speed: 250, coaches: 1, price: 110e3 },
    { id: 'hotdog', name: 'Hot Dog Kayak', speed: 390, coaches: 1, price: 180e3 },
    { id: 'plane', name: 'Plane Kayak', speed: 440, coaches: 1, price: 240e3 },
    { id: 'penguin', name: 'Penguin Kayak', speed: 555, coaches: 1, price: 300e3 },
    { id: 'watermelon', name: 'Summer Kayak', speed: 612, coaches: 1, price: 360e3 },
    { id: 'duck', name: 'Little Duck Kayak', speed: 750, coaches: 1, price: 700e3 },
    { id: 'horse', name: 'Rainbow Horse Kayak', speed: 900, coaches: 1, price: 950e3 },
    { id: 'toucan', name: 'Toucan Kayak', speed: 1050, coaches: 1, price: 1.8e6 },
    { id: 'shadow', name: 'Shadow Canoe', speed: 1230, coaches: 1, price: 2.5e6 },
    // `featured`: outside the list order, for sale from the start (never locked). Also shown on the
    // magenta pad (hub/layout.js DRAGON_KAYAK), whose E prompt opens the shop on it. The price
    // carries on the curve above (Summer ⚡612 360K -> Shadow ⚡1230 2.5M, price ~ speed^2.8).
    { id: 'dragon', name: 'Golden Dragon Kayak', speed: 1800, coaches: 1, price: 7.5e6, featured: true },
  ],
  // Trails tab ("Trails Shop", trails.js, boatTrail.js): bought with trophies in list order like the
  // boats (only the next is for sale; later ones show just a padlock). None is owned or equipped at
  // the start; the basic Red Trail costs 15 wins (trophies). Any owned trail can be equipped or
  // taken off (UnEquip), at most one at a time. The equipped trail streams off the boat's stern as a glowing ribbon on the water:
  // `colors` run head to tail ('rainbow' cycles the hue along it). Prices after the Blue Trail's 45
  // aren't in the shot.
  trails: [
    { id: 'red', name: 'Red Trail', colors: ['#ff2a2a', '#ff8a6a'], price: 15 },
    { id: 'blue', name: 'Blue Trail', colors: ['#1a8aff', '#7ad8ff'], price: 45 },
    { id: 'green', name: 'Green Trail', colors: ['#2aff4a', '#b8ff6a'], price: 120 },
    { id: 'yellow', name: 'Yellow Trail', colors: ['#ffd21a', '#fff6a0'], price: 250 },
    { id: 'purple', name: 'Purple Trail', colors: ['#9a3aff', '#e08aff'], price: 500 },
    { id: 'pink', name: 'Pink Trail', colors: ['#ff3ab8', '#ffaae0'], price: 900 },
    { id: 'fire', name: 'Fire Trail', colors: ['#ffe23a', '#ff3a0a'], price: 1.5e3 },
    { id: 'ice', name: 'Ice Trail', colors: ['#ffffff', '#3ad8ff'], price: 2.5e3 },
    { id: 'shadow', name: 'Shadow Trail', colors: ['#2a0a4a', '#8a3ad8'], price: 4e3 },
    { id: 'rainbow', name: 'Rainbow Trail', colors: 'rainbow', price: 7.5e3 },
  ],
  // The ribbon: `width` m at the stern tapering to nothing, `life` s a point lasts, a new point every
  // `spacing` m travelled, starting `sternZ` m behind the player (raft local -Z), `lift` m over the
  // boat's bottom.
  trail: { width: 1.1, life: 1.4, spacing: 0.3, sternZ: -1.7, lift: 0.16, opacity: 0.85 },
  // Emotes tab ("Emotes Shop", emotes.js, avatar/emotes.js for the motions): bought with trophies in
  // list order like the trails; none is owned or equipped at the start (the basic Slitherin costs 15
  // wins); UnEquip leaves none. G plays the equipped emote for `emoteTime` s (seated: upper body only, the paddle laid
  // down; paddling off, surfing or climbing cuts it short); equipping one plays it once. Prices
  // after Hype's 45 aren't in the shot.
  emotes: [
    { id: 'slitherin', name: 'Slitherin', price: 15 },
    { id: 'hype', name: 'Hype', price: 45 },
    { id: 'wave', name: 'Wave', price: 90 },
    { id: 'clap', name: 'Clap', price: 150 },
    { id: 'flex', name: 'Flex', price: 250 },
    { id: 'dab', name: 'Dab', price: 400 },
    { id: 'robot', name: 'Robot', price: 650 },
    { id: 'floss', name: 'Floss', price: 1e3 },
    { id: 'cheer', name: 'Cheer', price: 1.5e3 },
  ],
  emoteTime: 3, // s one play of an emote lasts
  // Titles comes back as a tab once it has items.
  tabs: [
    { id: 'kayaks', name: 'Kayaks' },
    { id: 'trails', name: 'Trails' },
    { id: 'emotes', name: 'Emotes' },
  ],
}

// Paddling up the slide (climb.js): the raft lies on the slope and answers every stroke (rolls
// toward the paddle as the blade bites, the bow swings away from it and lifts, the raft lunges on
// the pull and sags back on the recovery); the bow pushes a small wave against the lane's flow.
export const CLIMB = {
  rock: 0.16, // raft roll toward the paddle side per radian of blade dip
  yaw: 0.13, // bow swing away from the stroke per radian of blade dip
  bowLift: 0.035, // rad the nose lifts on each pull
  heave: 0.04, // m the raft rises on each pull
  surge: 0.22, // share of the climb speed the pull adds and the recovery takes away
  tiredBelow: 40, // stamina points under which the paddler starts to tire
  bowSpray: 70, // droplets/s of bow wave at full climb speed
  bank: 0.07, // rad the raft banks into a full steer
  volume: 0.9, // climb sounds (sfx.js)
}

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 1400,
  startPitch: 0.62, // radians above the horizon (third person; the reference third-person shot)
  minPitch: -0.1,
  maxPitch: 1.45, // nearly straight down (the top-down reference view)
  distance: 10, // start boom length, m
  minDistance: 3, // closest wheel zoom, m
  maxDistance: 35, // farthest wheel zoom, m
  followLerp: 10, // 1/s: the ONE smoothing stage, on the point the camera follows
  targetHeight: 0.6, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of right-drag
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedDistance: 0.8, // m the boom pulls back at full speed
  speedFov: 4, // degrees the FOV widens at full speed
  speedEase: 3, // 1/s the speed framing eases in and out
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: 'High', type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js). The player is always seated on the raft
// (raft.js) holding the paddle; moving drives a paddle stroke instead of a walk. Rotations are
// radians in CHARACTER space: +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  airborneDelay: 0.07, // s off the ground before a jump counts (and paddling pauses)
  // Seated on the raft's front bench, knees up, both hands forward on the paddle shaft.
  // bobY drops the hips onto the bench (RAFT.seatY).
  seated: {
    basePose: {
      LegL1: { x: deg(-100), y: deg(5) },
      LegR1: { x: deg(-100), y: deg(-5) },
      LegL2: { x: deg(55) },
      LegR2: { x: deg(55) },
      ArmL1: { x: deg(-72), z: deg(-28) },
      ArmR1: { x: deg(-72), z: deg(28) },
      Spine1: { x: deg(3) },
    },
    bobY: -0.045,
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
  },
  // One-bladed stroke on the player's right: the blade swings forward (catch), rolls down into
  // the water and sweeps back (pull), then lifts and swings forward again (recovery).
  paddle: {
    idleSpeed: 0.6, // m/s below which the paddle rests across the body
    fullSpeed: 6, // m/s at which the stroke reaches full depth
    distancePerStroke: 5, // m travelled per stroke
    minFrequency: 0.5, // strokes per second
    maxFrequency: 1.4,
    sweep: deg(32), // paddle yaw either side of rest
    dip: deg(30), // blade-side roll down into the water during the pull
    lift: deg(8), // blade raised on the recovery
    armReach: 0.68, // hand offset from the shaft centre / arm length: paddle motion -> arm pitch
    torsoTwist: 0.35, // fraction of the paddle yaw the torso follows
    torsoLean: 0.3, // fraction of the paddle roll the torso leans with
    ease: 6, // 1/s the stroke depth eases in and out
  },
  // Surf stance (standing on the raft deck, surf.js): body turned side-on to the raft, wide knees-
  // bent stance, arms out for balance, head turned to look down the slide. bobY lifts the feet onto
  // the deck; `crouch` (speed, tuck) bends deeper, `lean` (carving) banks the body and swings the arms.
  surf: {
    basePose: {
      Rig1: { y: deg(-72) },
      Spine1: { x: deg(14), y: deg(10) },
      Neck1: { x: deg(-8), y: deg(58) },
      LegL1: { x: deg(-28), z: deg(18) },
      LegR1: { x: deg(-28), z: deg(-18) },
      LegL2: { x: deg(46) },
      LegR2: { x: deg(46) },
      ArmL1: { x: deg(-12), z: deg(68) },
      ArmR1: { x: deg(-12), z: deg(-68) },
      ArmL2: { x: deg(-18) },
      ArmR2: { x: deg(-18) },
    },
    bobY: 0.17,
    crouch: { LegL1: deg(-18), LegR1: deg(-18), LegL2: deg(34), LegR2: deg(34), Spine1: deg(12), bob: -0.12 },
    lean: deg(16), // body bank at full carve
    armSwing: deg(22), // arms see-saw against the bank
    standEase: 4, // 1/s standing up / sitting down
    brace: deg(14), // seated lean back while climbing
  },
  // Paddling up the slide (climb.js passes `climb`): lean forward into the slope and look up it with
  // effort; tiring, the back rounds, the head drops between strokes, the stroke shortens and the
  // breathing deepens and quickens until the shoulders heave.
  climb: {
    lean: deg(13),
    lookUp: deg(11),
    slump: deg(10),
    droop: deg(20),
    strokeGain: 0.2, // stroke grows with effort
    strokeLoss: 0.35, // and shrinks when tired
    breathRate: 1.8, // breathing speeds up to (1 + this) x when tired
    breathDepth: 3.5, // and deepens to (1 + this) x
    heave: deg(5), // shoulders rising with each breath when tired
    // Steering (`steer`, -1 left .. 1 right; the paddle is on the right): turning left is a wide
    // forward sweep (longer swing, shallower blade), turning right a draw (short swing, blade
    // planted deep beside the raft); the body leans and the head looks into the turn.
    sweepWide: 0.7,
    sweepShort: 0.45,
    drawDip: 0.45,
    sweepDip: 0.25,
    steerLean: deg(9),
    steerTwist: deg(12),
    steerLook: deg(18),
  },
}

// The log raft the player always sits on (raft.js). Local space: +Z forward, origin at the
// player's feet; the player sits on the front bench with the paddle held across the body.
export const RAFT = {
  logs: 14,
  logRadius: 0.13,
  logLength: 1.8,
  front: 1.44, // z of the raft's front edge
  bandX: 0.72, // rope bands near each log end
  seatY: 0.465, // top of the benches
  benchZ: [-0.05, -1.45], // seat (front) and rear bench
  paddle: { x: 0, y: 1.12, z: 0.75, handle: 0.6, shaftEnd: -1.55, blade: 0.7, bladeWidth: 0.24 },
  floatDepth: 0.1, // raft bottom below the lake surface when afloat
  colors: { log: '#c98f5a', logEnd: '#f0c890', band: '#3c6f9e', bench: '#6b3f24', shaft: '#d9a37a', blade: '#4a2c1e', bladeRim: '#b07a55' },
}

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true'
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}
