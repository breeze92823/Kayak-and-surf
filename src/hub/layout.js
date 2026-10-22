// The hub, in metres (+X east, +Z south, +Y up). A round plank island (deck at y = 0) sits in a
// lake (bed at config GROUND_Y, surface at LAKE.y). The player spawns on the junction of the red
// cross (config SPAWN) looking north: three red chevron lanes lead to the round splash pool on
// the island's north edge, where the three-lane water slide climbs out of the lake.
//   West rim: yellow item band (NW), shop stall, purple pet band with four pedestals (SW).
//   On the deck: SHOP pad, egg, Mutate pad (with the machine behind it), Coach pad, SPIN pad.
//   East rim: spin wheel, Lunar New Year gate, magenta pad (Golden Dragon Kayak), three TOP 100 leaderboards (SE).
//   Water: portal isle (S), tree islet (NW), long bridge (E). The Golden Dragon Kayak stands on the magenta pad.
//
// Plan positions are measured off the user's top-down reference shot (1920 x 987, the spawn at
// pixel (960, 490), north up) with `plan()`. The shot reads 22.2 px per metre at reference scale
// (island radius 18 m); HUB_SCALE enlarges the whole hub around the spawn. Placements not taken
// from the shot are written at reference scale and mapped with `ref()` / `refLen()`, so changing
// HUB_SCALE moves everything together. Props (pedestals, figures, pets) keep their real size.
import { GROUND_Y, HUB_COLORS, KAYAK_SHOP, SPAWN, WORLD_BOUNDS } from '../config.js'
import { mulberry32 } from '../textures.js'

export const HUB_SCALE = 1.5
const S = HUB_SCALE
const deg = (d) => (d * Math.PI) / 180

const PX_PER_M = 22.2 / S
const plan = (px, py) => ({ x: (px - 960) / PX_PER_M, z: SPAWN.z + (py - 490) / PX_PER_M })
const planLen = (px) => px / PX_PER_M
// Reference-scale position / length -> world.
const refX = (x) => x * S
const refZ = (z) => SPAWN.z + (z - SPAWN.z) * S
const ref = (x, z) => ({ x: refX(x), z: refZ(z) })
const refLen = (l) => l * S
const refBox = (b) => ({ ...b, x0: refX(b.x0), x1: refX(b.x1), z0: refZ(b.z0), z1: refZ(b.z1) })
// Things that grow with the hub, but less than the floor plan (structures, not characters).
const grow = (l) => l * (1 + (S - 1) / 2)

export const LAKE = { y: -0.9, bed: GROUND_Y }

// Island: dark deck `sides`-gon of radius r centred at (x, z), plus raised rim bands outside it
// on the west (out to `rimR`). Angles around it (`a` below) follow atan2(dz, dx) in degrees:
// 0 = east, 90 = south, 180 = west, 270 = north.
const centre = plan(985, 530)
export const ISLAND = { ...centre, r: planLen(400), rimR: planLen(515), sides: 40, skirt: refLen(2.5) }
export const onIsland = (r, a) => [ISLAND.x + Math.cos(deg(a)) * r, ISLAND.z + Math.sin(deg(a)) * r]
const NORTH = ISLAND.z - ISLAND.r // z of the deck's north edge
const NORTH_REF = SPAWN.z + (NORTH - SPAWN.z) / S // the same edge at reference scale

// Raised bands on the rim: yellow (display slots) north-west, purple (pet pedestals) south-west.
// Each is faceted into `segments` straight runs, with a glowing `lip` along its deck-side edge.
export const RIM_BANDS = [
  { id: 'items', a0: 196, a1: 238, h: 0.35, color: 'counterTop', edge: 'counterFront', lip: 'counterLip', segments: 5 },
  { id: 'pets', a0: 104, a1: 196, h: 0.35, color: 'petRing', edge: 'petRingLine', lip: 'petRingLip', segments: 9 },
]
// Radius of the island's edge at angle a (deck, or the outside of a rim band).
export function islandEdgeAt(a) {
  const aa = ((a % 360) + 360) % 360
  return RIM_BANDS.some((b) => aa >= b.a0 && aa <= b.a1) ? ISLAND.rimR : ISLAND.r
}

// The slide: flat at the foot (the pool's north edge), then one straight climb at `angle` for
// `run` metres north to its end, through the SLIDE_AREAS below. Cross-section west to east:
// wall | silver | blue | VIP | wall.
const angle = deg(20)
const pool = plan(955, 140)
export const SLIDE = {
  footZ: pool.z,
  run: 75000, // horizontal length of the climb (75 km; config WORLD_BOUNDS.northZ stops the player at its end)
  angle,
  slope: Math.tan(angle),
  lane: refLen(3.3), // water bed width
  rail: refLen(0.4), // coloured rail either side of each bed
  railHeight: grow(0.4),
  divider: refLen(0.5), // maroon strip between lanes
  dividerHeight: grow(0.25),
  innerHalf: refLen(6.65), // half-width of the lane channel (3 x (lane + 2 rails) + 2 dividers)
  wallWidth: refLen(0.75),
  wallHeight: grow(1.1), // above the lane bed: taller than a step, so riders stay in
  skirtHalf: refLen(8.6), // the sloped outer flank meets the lake bed here
}
SLIDE.endZ = SLIDE.footZ - SLIDE.run
SLIDE.height = SLIDE.run * SLIDE.slope
const laneSpan = SLIDE.lane + SLIDE.rail * 2
export const LANES = [
  { id: 'silver', x: -(laneSpan + SLIDE.divider) },
  { id: 'blue', x: 0 },
  { id: 'vip', x: laneSpan + SLIDE.divider },
]

// Lane-bed height at z (0 in front of the foot).
export function slideSurfaceAt(z) {
  if (z >= SLIDE.footZ) return 0
  return (SLIDE.footZ - Math.max(z, SLIDE.endZ)) * SLIDE.slope
}

// Areas the slide climbs through, by run (`from`/`to`: horizontal metres north of the foot).
// Splash Lake is open water; Grass Canyon and Frosty Peaks are banked by stepped terraces
// (AREA_LANDS, `cap`/`face`/`drip` colours) whose inner tier sits just under the slide's walls with
// higher tiers behind; Cloud Summit rises out of a cloud bank. Every area after the lake opens
// with a themed arch over the slide (AREA_GATES).
export const SLIDE_AREAS = [
  { id: 'lake', name: 'Splash Lake', from: 0 },
  { id: 'canyon', name: 'Grass Canyon', from: SLIDE.footZ - refZ(-60), cap: 'grass', face: 'maroon', faceDark: 'maroonDark', drip: 'grassDark', pine: '#2f9a3a', text: ['#9dff5a', '#ffe14a'] },
  { id: 'peaks', name: 'Frosty Peaks', from: 240, cap: 'snow', face: 'rockBlue', faceDark: 'rockBlueDark', drip: 'snowShade', pine: '#1f7a4a', snow: true, text: ['#ffffff', '#7fe8ff'] },
  { id: 'summit', name: 'Cloud Summit', from: 370, text: ['#fff27a', '#ff9d2e'] },
].map((a, i, all) => ({ ...a, to: all[i + 1]?.from ?? SLIDE.run }))
export const slideAreaAt = (z) => SLIDE_AREAS.findLast((a) => SLIDE.footZ - z >= a.from) ?? SLIDE_AREAS[0]

// Terrace tiers out from the slide's flank: width (the last runs to the world's edge), step length
// along the slide, and the step's top relative to the slide surface at its downhill end.
const TIERS = [
  { w: refLen(10), step: 10, rise: [-1.2, -0.5] },
  { w: refLen(17), step: 30, rise: [4, 10], pines: 2 },
  { w: Infinity, step: 45, rise: [14, 26], hills: true },
]
const terraceRand = mulberry32(404)
const between = ([a, b]) => a + (b - a) * terraceRand()
export const AREA_PINES = []
export const AREA_LANDS = []
for (const area of SLIDE_AREAS.filter((a) => a.cap)) {
  for (const side of [-1, 1]) {
    let xa = SLIDE.skirtHalf
    TIERS.forEach((tier, t) => {
      const xb = Math.min(xa + tier.w, WORLD_BOUNDS.maxX)
      for (let d = area.from; d < area.to - 1; d += tier.step) {
        const z1 = SLIDE.footZ - d
        const z0 = SLIDE.footZ - Math.min(d + tier.step, area.to)
        const h = slideSurfaceAt(z1) + between(tier.rise)
        const [x0, x1] = side < 0 ? [-xb, -xa] : [xa, xb]
        AREA_LANDS.push({ kind: 'cliff', x0, x1, z0, z1, h, cap: area.cap, face: t ? area.faceDark : area.face, drip: area.drip, snow: area.snow, hills: tier.hills && terraceRand() < 0.6 })
        for (let i = 0; i < (tier.pines ?? 0); i++) {
          const height = grow(9 + terraceRand() * 6)
          AREA_PINES.push({ x: x0 + 3 + (x1 - x0 - 6) * terraceRand(), z: z1 - 4 - (z1 - z0 - 8) * terraceRand(), base: h + 0.1, height, radius: height * 0.25, color: area.pine, snow: area.snow })
        }
      }
      xa = xb
    })
  }
}

// One arch over the slide a little way into each area after the lake. Its legs stand on the
// inner terrace tier (or sink into the summit's clouds); the label floats above its crown.
export const AREA_GATES = SLIDE_AREAS.filter((a) => a.from > 0).map((a) => {
  const z = SLIDE.footZ - a.from - 8
  return { id: a.id, name: a.name, text: a.text, z, y: slideSurfaceAt(z) + 2.5, inner: SLIDE.skirtHalf + 1.6, thick: grow(4), depth: grow(5) }
})
// Cloud bank the summit climbs out of: `density` puffs per metre over the area's run, `below` m
// under the slide, built in `chunk`-metre pieces that only draw near the camera (areas.js).
const summit = SLIDE_AREAS.find((a) => a.id === 'summit')
export const CLOUD_BANK = { z0: SLIDE.footZ - summit.from + 25, z1: SLIDE.endZ - 40, below: 14, density: 1.2, chunk: 400 }

// The trophy waiting at the top of the slide (endTrophy.js, config END_TROPHY): floating over the
// blue lane 5 m short of the end (AFK surfs down 1 m short of it), 1.4 m over the lane bed.
const trophyZ = SLIDE.endZ + 5
export const END_TROPHY_SPOT = { x: LANES[1].x, z: trophyZ, y: slideSurfaceAt(trophyZ) + 1.4 }

// Round splash pool centred on the slide foot; its south half lies in the deck.
export const POOL = { x: 0, z: pool.z, rx: planLen(180), rz: planLen(180), rim: refLen(0.8), rimHeight: 0.2, waterY: 0.08 }

// Red cross. Three chevron lanes (one per slide lane) run from the pool to the junction block
// around the spawn; the east-west arm crosses there and the stem runs south to the stairs.
export const CROSS = {
  lanes: LANES.map((l) => ({ x: l.x, width: refLen(3), chevron: l.id === 'vip' ? HUB_COLORS.chevronVip : HUB_COLORS.carpetChevron })),
  lanesZ0: POOL.z + POOL.rz + POOL.rim - 0.2,
  lanesZ1: plan(0, 415).z,
  chevronZ: [3, 4.3, 5.6].map((d) => POOL.z + POOL.rz + refLen(d)),
  block: { x0: plan(800, 0).x, x1: plan(1120, 0).x, z0: plan(0, 415).z, z1: plan(0, 470).z },
  arm: { x0: plan(680, 0).x, x1: ISLAND.x + ISLAND.r - 0.3, z0: plan(0, 465).z, z1: plan(0, 560).z },
  stem: { x0: plan(900, 0).x, x1: plan(1020, 0).x, z0: plan(0, 560).z, z1: ISLAND.z + ISLAND.r },
}
// Portal isle: an octagonal sand platform out in the water south of the stem, a little below deck
// height, reached by short wooden stairs; its sides slope away under the water so swimmers can
// walk back up. The Teleport portal stands on it facing the island.
const southEdge = ISLAND.z + ISLAND.r
const stemX = (CROSS.stem.x0 + CROSS.stem.x1) / 2
const isleR = refLen(3.4)
export const PORTAL_ISLE = { x: stemX, z: southEdge + refLen(2.6) + isleR, r: isleR, top: -0.4, slope: 3 }
export const SOUTH_STAIRS = { x: stemX, width: refLen(2.8), z0: southEdge - 0.3, z1: PORTAL_ISLE.z - PORTAL_ISLE.r + 0.4, steps: 6, from: 0, to: PORTAL_ISLE.top }
export const PORTAL = { x: stemX, z: PORTAL_ISLE.z + 0.6, r: grow(2.1), y: PORTAL_ISLE.top + 0.5 }
// Little yellow flower clumps and leafy plants dotted on the isle (offsets from its centre).
export const ISLE_PLANTS = [
  [-2.2, -1.6, 'flower'], [2.3, -1.2, 'flower'], [-2.4, 1.4, 'leaf'], [2.1, 1.9, 'flower'], [0.4, 2.6, 'leaf'], [-1, -2.6, 'leaf'],
].map(([dx, dz, kind]) => [refLen(dx), refLen(dz), kind])

// West rim.
const ITEM_R = planLen(450)
// `egg` (petIndex.js EGGS id) or `pet` (sold outright) is what E opens there (eggs.js); prices are
// config EGG_HATCH; `label` adds rows under the price.
export const BAND_ITEMS = [
  { a: 200, kind: 'bee', pet: 'bee', label: ['Stinging Bee', 'x70'] },
  { a: 210, kind: 'cream', egg: 'cream' },
  { a: 220, kind: 'rainbow', egg: 'rainbow' },
  { a: 231.5, kind: 'pixel', egg: 'basic' },
].map((i) => ({ label: [], ...i, r: ITEM_R, slot: grow(1.25) }))
// Pet pods: `h` is the whole pod height; the pet inside is scaled by `scale`, nudged along its
// length by `offset` (to centre it) and turned `turn` from the window's facing. `pet` is the
// petIndex.js pet E buys there (eggs.js; price in config EGG_HATCH.pets).
export const PEDESTALS = [
  { a: 170, name: 'Griffin', stock: '889/1000', bonus: 'x600', species: 'griffin', pet: 'griffin', scale: 1.75, offset: 0.2, turn: 0.75 },
  { a: 155.5, name: 'Phoenix', stock: '480/500', bonus: 'x300%', species: 'phoenix', pet: 'phoenix', scale: 1.7, offset: 0.1, turn: 0.6 },
  { a: 141.5, name: 'Hydra', stock: '246/250', bonus: 'x450%', species: 'hydra', pet: 'hydra', scale: 1.55, offset: 0, turn: 0.7 },
  { a: 127, name: 'Celestial Dragon', stock: '130/150', bonus: 'x700%', species: 'dragon', pet: 'dragon', best: true, scale: 1.35, offset: 0.25, turn: 0.75 },
].map((p) => ({ ...p, r: planLen(458), h: 5.2, radius: 1.45 }))
export const SHOP = { a: 186, r: planLen(475), pad: { ...plan(630, 490), r: planLen(42) } }
export const EGG = plan(780, 600) // the stone egg on its magenta stand
// Area eggs on the south-east deck, east of the stem: one per slide area past the lake (petIndex.js
// EGGS ids), each on a small stand facing the spawn.
export const EGG_ROW = [
  { egg: 'canyon', ...plan(1060, 735) },
  { egg: 'frost', ...plan(1150, 760) },
  { egg: 'cloud', ...plan(1240, 735) },
]
export const MUTATE = { pad: { ...plan(875, 860), r: planLen(42) }, machine: { ...ref(-4.6, 28.4), scale: 1.3 } }

// East rim and deck.
export const COACH = { ...plan(1130, 600), r: planLen(40), scale: 1.6 }
// The wheel stands on the back (rim side) of its pad, facing the spawn.
// `lift`: the wheel's lowest point above the pad (the A-frame shows under it).
export const SPIN = { pad: { ...plan(1280, 335), r: planLen(46) }, wheel: { back: refLen(1.2), radius: grow(2), lift: 0.7 } }
// Lunar New Year gate at the east end of the arm, facing in, balloon bunches either side.
export const LANTERNS = { ...plan(1320, 470), size: grow(8) }
export const MAGENTA_PAD = { ...plan(1325, 640), r: planLen(46) }
export const LEADERBOARDS = [
  // Angles from the first-person south view (the top-down shot shows only their leaning tops).
  { a: 45, title: 'COIN', color: '#ffd21a', icon: 'coin' },
  { a: 62, title: 'ROBUX', color: '#3dff6a', icon: 'robux' },
  { a: 79.5, title: 'PLAYTIME', color: '#5fd7ff', icon: 'clock' },
].map((b) => ({ ...b, r: ISLAND.r + 0.2, w: grow(6.6), h: grow(9.6), tilt: 0.22 }))
// Rests keel down on the magenta pad, side-on to the deck with the dragon's head rearing up at the
// bow (the first-person east shot); `height` is the top of its horns, which makes it about as long
// as the pad is wide. Its `price` and `speed` are the Kayak Shop's (KAYAK_SHOP 'dragon').
const { price, speed } = KAYAK_SHOP.boats.find((b) => b.id === 'dragon')
export const DRAGON_KAYAK = { x: MAGENTA_PAD.x, z: MAGENTA_PAD.z, height: grow(3.2), price, speed }
export const GREEN_SURFBOARD = { ...plan(1420, 380), base: GROUND_Y, length: grow(9), width: grow(1.8), lean: 0.35, yaw: -1.2 }

// Across the water: maroon cliffs (grass caps, drips, `hills` on top) and low green meadows.
// Written at reference scale (NORTH_REF = the deck's north edge) and mapped out with refBox.
const EAST_HILL = refBox({ kind: 'cliff', x0: 21, x1: 60, z0: -60, z1: NORTH_REF - 7, h: 5 }) // kayak statue; the long bridge starts here
export const LANDS = [
  { kind: 'meadow', x0: -60, x1: -16, z0: -60, z1: NORTH_REF - 9, h: 0.4 }, // north-west, holds the billboard
  { kind: 'cliff', x0: -60, x1: -38, z0: NORTH_REF - 9, z1: 16, h: 9 }, // west
  { kind: 'meadow', x0: -60, x1: -24, z0: 22, z1: 60, h: 0.4 }, // south-west (second big tree)
  { kind: 'meadow', x0: -40, x1: -31, z0: 8, z1: 24, h: 0.4 }, // west shore under the third big tree
  { kind: 'cliff', x0: -36, x1: 40, z0: 82, z1: 96, h: 10 }, // far south wall of the lake (waterfall, pine on top)
  { kind: 'meadow', x0: 8, x1: 40, z0: 50, z1: 70, h: 0.4 }, // sandy point south-east of the portal (pink boulder)
  { kind: 'cliff', x0: -64, x1: -36, z0: 30, z1: 64, h: 12, dark: true }, // south-west tier (second waterfall)
  { kind: 'cliff', x0: 26, x1: 60, z0: 28, z1: 60, h: 5 }, // south-east (the long bridge lands here)
  { kind: 'cliff', x0: 36, x1: 60, z0: NORTH_REF - 7, z1: 28, h: 7 }, // east wall behind the long bridge (pines on top)
]
  .map(refBox)
  .concat([EAST_HILL], AREA_LANDS) // north of the lake the slide's own terraces take over
// Grassy islet off the north-west rim carrying the big tree (and a pink boulder).
export const TREE_ISLET = { ...plan(470, 250), r: refLen(3.6), h: 0.4 }
export const BOULDERS = [{ ...ref(11, 52.5), r: grow(1.6) }] // pink rock on the sandy point

// Long level bridge east of the island, from the east hill south to the south-east cliff.
export const LONG_BRIDGE = { ax: refX(31), az: EAST_HILL.z1 - 1.2, bx: refX(31), bz: refZ(29.2), width: grow(3), y0: EAST_HILL.h + 0.1, y1: EAST_HILL.h + 0.1 }

// Short railing over the water west of the slide foot.
export const FENCES = [{ ax: -SLIDE.skirtHalf - 0.3, az: NORTH - refLen(1.2), bx: -SLIDE.skirtHalf - refLen(4.5), bz: NORTH + refLen(0.4) }]

const faceSpawn = (x, z) => Math.atan2(SPAWN.x - x, SPAWN.z - z) // yaw that turns local +Z toward the spawn
const tree = (x, z, t) => ({ ...ref(x, z), ...t, lean: t.lean.map(refLen) })

// The tree leans in from its islet; its long branch carries the hanging sign out toward the slide.
const sign = ref(-10.8, -6.8)
const branch = ref(-10.5, -6.6)
export const TREE = { x: TREE_ISLET.x, z: TREE_ISLET.z, base: TREE_ISLET.h, height: 16, lean: [3, -3].map(refLen), scale: 2.5, branchTo: [branch.x, 15.6, branch.z] }
export const SW_TREE = tree(-27, 38, { base: 0.4, height: 16, lean: [2, -1.5], scale: 2.6 })
export const W_TREE = tree(-36, 16, { base: 0.4, height: 16, lean: [1, 0.5], scale: 2.2 }) // behind the shop
export const E_TREE = { ...tree(31, -17, { height: 15, lean: [-1.5, 1], scale: 2.3 }), base: EAST_HILL.h + 0.1 } // on the east hill
// Tall pines standing on the cliff tops (base = the cliff height).
export const PINES = [
  [-14, 88, 10.1, 11, 3.2], // far south cliff
  [-42, 5, 9.1, 13, 3.4], // west cliff
  [-44, -3, 9.1, 11, 3],
  [-41, 34, 12.1, 14, 3.6], // south-west tier
  [-26, -20, 0.5, 7, 2.2], // north-west meadow, by the billboard
  [39, 7, 7.1, 13, 3.2], // east wall
  [41, -8, 7.1, 11, 3],
  [39, 19, 7.1, 12, 3],
  [47, 12, 7.1, 14, 3.4],
  [44, 25, 7.1, 10, 2.8],
].map(([x, z, base, height, radius]) => ({ ...ref(x, z), base, height: grow(height), radius: grow(radius) }))
// Waterfalls pouring off the cliffs into the lake: (x, z) is the foot of the fall on the cliff
// face, `yaw` turns its face (local +Z) toward the lake.
export const WATERFALLS = [
  { ...ref(-4, 81.9), width: refLen(6), top: 10, yaw: Math.PI },
  { ...ref(-35.9, 40), width: refLen(6), top: 12, yaw: Math.PI / 2 },
]
// Far-off grey-blue peaks (south and east) and the rainbow arching over the south-west.
export const MOUNTAINS = [
  { ...ref(107, 202), r: refLen(70), h: refLen(95) },
  { ...ref(-130, 240), r: refLen(80), h: refLen(110) },
  { ...ref(240, 110), r: refLen(60), h: refLen(80) },
]
const rbA = ref(-90, -40)
const rbB = ref(-60, 110)
export const RAINBOW = { from: [rbA.x, rbA.z], to: [rbB.x, rbB.z], width: refLen(9) }
export const HANGING_SIGN = { ...sign, y: 12.6, w: grow(6.4), h: grow(2.6), yaw: faceSpawn(sign.x, sign.z) + 0.35 }
const bill = { x: refX(-21), z: NORTH - refLen(13) }
export const BILLBOARD = { ...bill, base: 0.4, w: grow(11), h: grow(5.6), bottom: 0.2, yaw: faceSpawn(bill.x, bill.z) }
const surf = plan(1190, 70)
export const SURFBOARD = { ...surf, base: GROUND_Y, length: grow(10), width: grow(1.6), lean: -0.1, yaw: faceSpawn(surf.x, surf.z) }
export const KAYAK_STATUE = { x: EAST_HILL.x0 + refLen(3), z: EAST_HILL.z1 - refLen(4), y: EAST_HILL.h + 0.65, yaw: 0.3, scale: grow(2.4) }
export const VIP = {
  postsX: [LANES[2].x - refLen(2.1), LANES[2].x + refLen(2.1)],
  z: SLIDE.footZ + 0.35,
  ropeY: 1.3,
  pad: { ...plan(1070, 180), r: planLen(40) },
  label: { ...plan(1070, 170), y: 2.6, w: grow(5), h: grow(2.8) },
}
export const ARROW = { x: LANES[1].x, z: SLIDE.footZ - refLen(1.8), height: grow(2.1) }
// Gold arrow lying on the silver lane's foot, pointing downhill (that lane is only ever surfed down).
export const SILVER_ARROW = { x: LANES[0].x, z: SLIDE.footZ - refLen(2.1), length: refLen(2.6) }
