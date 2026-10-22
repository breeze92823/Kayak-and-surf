// The pet team following the raft (config PET_FOLLOW), after Paper-plane's petFollowers.js: each
// equipped pet (petInventory.js team) as its own model (hub/petFigure.js look or the hub/pets.js
// showcase species) sized to `size` (Big / Huge bigger), flying in an arc behind the raft, easing
// after it, bobbing and turning the way it goes. World space, not parented to the raft, so they lag
// and swing round on turns and follow it up the slide. Rebuilt only when the team changes.
import { Box3, Group, Vector3 } from 'three'
import { PET_FOLLOW as F } from './config.js'
import { inventory } from './petInventory.js'
import { petFigure } from './hub/petFigure.js'
import { createPet } from './hub/pets.js'

const TAU = Math.PI * 2
const box = new Box3()
const size = new Vector3()
const centre = new Vector3()

// One pet's model: centred on its bounds, longest side `size` m.
function model(p) {
  const info = inventory.info(p)
  const pet = info.species ? createPet(info.species) : { group: petFigure(info.look), update: null }
  pet.group.updateMatrixWorld(true)
  box.makeEmpty()
  pet.group.traverse((o) => {
    if (o.isPoints || o.isSprite) o.visible = false // world-sized effects, too big on a little follower
    else if (o.isMesh) {
      o.castShadow = true
      box.expandByObject(o, true)
    }
  })
  box.getSize(size)
  box.getCenter(centre)
  const s = (F.size * (F.variantSize[p.variant] ?? 1)) / Math.max(size.x, size.y, size.z, 0.01)
  const holder = new Group()
  pet.group.position.sub(centre)
  holder.add(pet.group)
  holder.scale.setScalar(s)
  return { holder, update: pet.update }
}

export function createPetFollowers() {
  const group = new Group()
  group.name = 'petFollowers'
  let pets = [] // { holder, update, phase, placed }
  let key = ''
  let t = 0

  function sync() {
    const team = inventory.team
    const next = team.map((p) => `${p.uid}:${p.variant}`).join(',') // a mutated pet is rebuilt too
    if (next === key) return
    key = next
    for (const p of pets) group.remove(p.holder)
    pets = team.map((p, i) => ({ ...model(p), phase: i * 1.7, placed: false }))
    for (const p of pets) group.add(p.holder)
  }
  inventory.onChange(sync)
  sync()

  return {
    group,
    // anchor: the raft's { x, y, z } and `facing` yaw (local +Z forward).
    update(dt, anchor) {
      t += dt
      const n = pets.length
      const k = 1 - Math.exp(-F.followHz * Math.min(dt, 0.1))
      pets.forEach((p, slot) => {
        const g = p.holder
        const angle = anchor.facing + Math.PI + (slot - (n - 1) / 2) * F.spread
        const tx = anchor.x + Math.sin(angle) * F.radius
        const tz = anchor.z + Math.cos(angle) * F.radius
        const ty = anchor.y + F.height + Math.sin(t * 2.6 + p.phase) * F.bob
        if (!p.placed) {
          g.position.set(tx, ty, tz)
          g.rotation.y = anchor.facing
          p.placed = true
        }
        const dx = tx - g.position.x
        const dz = tz - g.position.z
        g.position.x += dx * k
        g.position.y += (ty - g.position.y) * k
        g.position.z += dz * k
        // Face the way it is flying; settled, the raft's heading.
        const want = dx * dx + dz * dz > 0.04 ? Math.atan2(dx, dz) : anchor.facing
        const turn = Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y))
        g.rotation.y = (g.rotation.y + turn * k) % TAU
        g.rotation.z = Math.sin(t * 2 + p.phase) * 0.08
        p.update?.(t + p.phase)
      })
    },
  }
}
