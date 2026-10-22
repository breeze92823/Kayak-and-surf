// The emotes in the Kayak Shop's Emotes tab (config KAYAK_SHOP.emotes): a trophy collection
// (collection.js); none is owned or equipped at the start. G plays the equipped one (main.js ->
// animator.playEmote, motions in avatar/emotes.js).
import { KAYAK_SHOP } from './config.js'
import { createCollection } from './collection.js'

export const emotes = createCollection(KAYAK_SHOP.emotes)
