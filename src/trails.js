// The trails in the Kayak Shop's Trails tab (config KAYAK_SHOP.trails): a trophy collection
// (collection.js); none is owned or equipped at the start. boatTrail.js draws the equipped one behind
// the boat.
import { KAYAK_SHOP } from './config.js'
import { createCollection } from './collection.js'

export const trails = createCollection(KAYAK_SHOP.trails)
trails.trail = trails.item
