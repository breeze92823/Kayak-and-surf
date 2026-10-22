// The hub: the lake, island and shores (terrain.js), the water slide with its pool (slide.js),
// the areas it climbs through (areas.js: gates, cloud bank; their terraces are terrain.js), the island's fixtures (island.js), the scenery (props.js) and the filler set dressing
// (decor.js). Layout lives in layout.js; colours in config.js HUB_COLORS.
import { Group } from 'three'
import { createTerrain } from './terrain.js'
import { createSlide } from './slide.js'
import { createAreas } from './areas.js'
import { createIslandFixtures } from './island.js'
import { createProps } from './props.js'
import { createDecor } from './decor.js'
import { mergeStatic } from './batch.js'

export function createHub() {
  const group = new Group()
  const terrain = createTerrain()
  const slide = createSlide()
  const areas = createAreas()
  const island = createIslandFixtures()
  const props = createProps()
  const decor = createDecor()
  // Static parts share materials heavily: merge them into one draw per material.
  for (const g of [terrain.group, slide.group, areas.group, island.group, props.group]) mergeStatic(g)
  group.add(terrain.group, slide.group, areas.group, island.group, props.group, decor.group)
  terrain.bakeWater() // the lake's shore/depth map, once every collider exists
  return {
    group,
    coach: island.coach, // the Coach's rig (coach.js animates it)
    spin: island.spin, // the prize wheel (spinWheel.js turns it)
    vip: slide.vip, // the VIP lane's rope gate (vipLane.js unlocks it)
    update(dt) {
      terrain.update(dt)
      slide.update(dt)
      island.update(dt)
      props.update(dt)
      decor.update(dt)
    },
  }
}
