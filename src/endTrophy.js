// The trophy waiting at the top of the 75 km slide (hub/layout.js END_TROPHY_SPOT, config
// END_TROPHY): a gold cup with handles on a dark two-step base, floating and turning over the blue
// lane in a glow of twinkling motes, "+15 Wins" floating above it. Reaching it (anywhere across the
// lane channel, within `range` m along the slide) pays the wins once and it disappears: a gold burst
// at the raft, a fanfare, the wins counter jolts. In memory like the wins themselves (no net.js
// save yet), so a reload puts it back. Updated every frame from main.js.
import { CylinderGeometry, Group, LatheGeometry, Mesh, TorusGeometry, Vector2 } from 'three'
import { END_TROPHY, HUB_COLORS } from './config.js'
import { END_TROPHY_SPOT, SLIDE } from './hub/layout.js'
import { neon, plastic } from './hub/materials.js'
import { particles, rimGlow } from './hub/particles.js'
import { labelSprite } from './hub/signs.js'
import { createBurst } from './coach.js'
import { player } from './player.js'
import { sfx } from './sfx.js'

// Feet at the origin, `h` metres tall. Profile points are fractions of h.
function trophyModel(h) {
  const group = new Group()
  const gold = neon(HUB_COLORS.pedestalGold, 0.4)
  const dark = plastic(HUB_COLORS.signBoard)
  const part = (geo, mat, y) => {
    const m = new Mesh(geo, mat)
    m.position.y = y * h
    m.castShadow = true
    group.add(m)
    return m
  }
  part(new CylinderGeometry(0.3 * h, 0.34 * h, 0.1 * h, 8), dark, 0.05)
  part(new CylinderGeometry(0.22 * h, 0.26 * h, 0.1 * h, 8), dark, 0.15)
  part(new CylinderGeometry(0.2 * h, 0.2 * h, 0.03 * h, 24), gold, 0.215) // gold band on the base
  part(new CylinderGeometry(0.05 * h, 0.1 * h, 0.2 * h, 16), gold, 0.32)
  // Cup: outer wall up to the lip, then the inner wall back down (open top).
  const cup = [
    [0, 0.42], [0.1, 0.43], [0.17, 0.5], [0.24, 0.62], [0.29, 0.78], [0.32, 0.92], [0.34, 1],
    [0.31, 1], [0.28, 0.91], [0.24, 0.76], [0.17, 0.64], [0, 0.6],
  ].map(([r, y]) => new Vector2(r * h, y * h))
  const cupGeo = new LatheGeometry(cup, 40)
  part(cupGeo, gold, 0)
  group.add(rimGlow(cupGeo, '#fff2a0', { power: 3, strength: 1.2 }))
  for (const side of [-1, 1]) {
    const handle = part(new TorusGeometry(0.12 * h, 0.025 * h, 8, 20, Math.PI), gold, 0.76)
    handle.rotation.z = -side * (Math.PI / 2) // the half ring bulges out sideways
    handle.position.x = side * 0.27 * h
  }
  return group
}

export function createEndTrophy({ hud, scene }) {
  const { x, y, z } = END_TROPHY_SPOT
  const h = END_TROPHY.height
  const root = new Group()
  root.position.set(x, y, z)
  const cup = trophyModel(h)
  const motes = particles({ mode: 'twinkle', shape: 'spark', count: 28, color: '#fff2a0', color2: '#ffc21a', size: 0.4, radius: h * 0.75, height: h * 1.2, seed: 75 })
  motes.position.y = -0.2
  const label = labelSprite([{ text: `+${END_TROPHY.wins} Wins`, gradient: ['#fff27a', '#ff9d2e'], px: 96, stroke: '#14080a' }], 1.2)
  label.position.y = h + 0.9
  root.add(cup, motes, label)
  scene.add(root)
  const burst = createBurst(scene)
  const trophyEl = hud.root.querySelector('.hud-counter-trophy')
  let claimed = false
  let t = 0

  function claim() {
    if (claimed) return
    claimed = true
    root.removeFromParent()
    hud.set({ trophies: hud.get('trophies') + END_TROPHY.wins })
    trophyEl?.classList.remove('spend')
    void trophyEl?.offsetWidth
    trophyEl?.classList.add('spend')
    burst.fire(player.position.x, player.position.y, player.position.z)
    sfx.fanfare(true)
    sfx.levelUp(5)
  }

  return {
    get claimed() {
      return claimed
    },
    claim,
    update(dt) {
      burst.update(dt)
      if (claimed) return
      t += dt
      cup.rotation.y = t * END_TROPHY.spin
      cup.position.y = Math.sin(t * 2) * 0.15
      const p = player.position
      if (Math.abs(p.x) <= SLIDE.innerHalf && p.z <= z + END_TROPHY.range) claim()
    },
  }
}
