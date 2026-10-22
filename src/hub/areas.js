// The areas the slide climbs through past the lake (layout.js SLIDE_AREAS). Their terraces are
// land blocks (terrain.js buildLands, via AREA_LANDS) and their pines are props.js; this builds the
// arch that opens each area (rock with a glowing ring, snow-capped in Frosty Peaks, cloud-white
// with puffs at the summit) with the area's name floating over it, and the cloud bank the summit
// climbs out of.
import { ExtrudeGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Shape, SphereGeometry, TorusGeometry, CylinderGeometry } from 'three'
import { HUB_COLORS } from '../config.js'
import { addBox } from '../colliders.js'
import { mulberry32 } from '../textures.js'
import { AREA_GATES, CLOUD_BANK, LAKE, slideSurfaceAt } from './layout.js'
import { neon, plastic } from './materials.js'
import { nearInstances } from './batch.js'
import { labelSprite } from './signs.js'

const GATE_LOOK = {
  canyon: { face: 'maroon', ring: 'archGold' },
  peaks: { face: 'rockBlue', ring: 'archIce', cap: 'snow' },
  summit: { face: 'archCloud', ring: 'archGold', puffs: true },
}

const cloudMat = () => new MeshStandardMaterial({ color: HUB_COLORS.cloud, emissive: '#dff4ff', emissiveIntensity: 0.55, roughness: 1 })

function shadow(mesh) {
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Upright arch in the XY plane: a half ring (radii ri..ro, centre at the origin) on straight legs
// running `legs` metres down, extruded `depth` along Z and centred on z = 0.
function archGeometry(ri, ro, legs, depth) {
  const s = new Shape()
  s.moveTo(ro, -legs)
  s.lineTo(ro, 0)
  s.absarc(0, 0, ro, 0, Math.PI, false)
  s.lineTo(-ro, -legs)
  s.lineTo(-ri, -legs)
  s.lineTo(-ri, 0)
  s.absarc(0, 0, ri, Math.PI, 0, true)
  s.lineTo(ri, -legs)
  const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.5, bevelSegments: 2, curveSegments: 40 })
  geo.translate(0, 0, -depth / 2)
  return geo
}

// Snow lying along the crown of an arch (just the top of the outer curve).
function crownCapGeometry(ro, depth) {
  const s = new Shape()
  s.absarc(0, 0, ro + 0.9, 0.3, Math.PI - 0.3, false)
  s.absarc(0, 0, ro - 0.1, Math.PI - 0.3, 0.3, true)
  const geo = new ExtrudeGeometry(s, { depth: depth + 1.4, bevelEnabled: false, curveSegments: 32 })
  geo.translate(0, 0, -(depth + 1.4) / 2)
  return geo
}

function buildGate(group, gate, puffGeo, puffMat) {
  const look = GATE_LOOK[gate.id]
  const ri = gate.inner
  const ro = ri + gate.thick
  const legs = gate.y - LAKE.bed
  const arch = shadow(new Mesh(archGeometry(ri, ro, legs, gate.depth), plastic(HUB_COLORS[look.face], { flatShading: true })))
  arch.position.set(0, gate.y, gate.z)
  group.add(arch)
  for (const side of [-1, 1]) {
    const [x0, x1] = side < 0 ? [-ro, -ri] : [ri, ro]
    addBox(x0, x1, LAKE.bed, gate.y, gate.z - gate.depth / 2, gate.z + gate.depth / 2)
  }

  // Glowing ring set into the downhill face, running on down the legs to the slide's walls.
  const front = gate.z + gate.depth / 2 + 0.45
  const ringMat = neon(HUB_COLORS[look.ring], 0.6)
  const tube = 0.7
  const ringR = ri + tube + 0.3
  const ring = new Mesh(new TorusGeometry(ringR, tube, 10, 48, Math.PI), ringMat)
  ring.position.set(0, gate.y, front)
  group.add(ring)
  const legDrop = gate.y - (slideSurfaceAt(gate.z) - 1)
  for (const side of [-1, 1]) {
    const leg = new Mesh(new CylinderGeometry(tube, tube, legDrop, 10), ringMat)
    leg.position.set(side * ringR, gate.y - legDrop / 2, front)
    group.add(leg)
  }

  if (look.cap) {
    const cap = shadow(new Mesh(crownCapGeometry(ro, gate.depth), plastic(HUB_COLORS[look.cap], { flatShading: true })))
    cap.position.set(0, gate.y, gate.z)
    group.add(cap)
  }
  if (look.puffs) {
    const rand = mulberry32(9)
    for (let i = 0; i < 9; i++) {
      const a = 0.25 + (i / 8) * (Math.PI - 0.5)
      const r = 2.2 + rand() * 1.6
      const p = new Mesh(puffGeo, puffMat)
      p.scale.set(r, r * 0.75, r)
      p.position.set(Math.cos(a) * (ro + 0.6), gate.y + Math.sin(a) * (ro + 0.6), gate.z + (rand() - 0.5) * gate.depth)
      group.add(p)
    }
  }

  const label = labelSprite([{ text: gate.name.toUpperCase(), gradient: gate.text, px: 96, stroke: '#14080a' }], 5)
  label.position.set(0, gate.y + ro + 4.5, gate.z)
  group.add(label)
}

// Puffs filling the summit's run on both sides and under the slide, their tops a little under it.
function buildCloudBank(group, puffGeo, puffMat) {
  const rand = mulberry32(31)
  const { z0, z1, below, density, chunk } = CLOUD_BANK
  const puffs = []
  for (let i = Math.round((z0 - z1) * density); i > 0; i--) {
    const z = z0 + (z1 - z0) * rand()
    const x = (rand() * 2 - 1) * 110
    const r = 7 + rand() * 9
    const y = slideSurfaceAt(z) - below - r * 0.4 + (rand() - 0.5) * 4
    puffs.push(new Matrix4().makeScale(r * 1.4, r * 0.55, r).setPosition(x, y, z))
  }
  group.add(nearInstances(puffGeo, puffMat, puffs, { chunk }))
}

export function createAreas() {
  const group = new Group()
  const puffGeo = new SphereGeometry(1, 18, 12)
  const puffMat = cloudMat()
  for (const gate of AREA_GATES) buildGate(group, gate, puffGeo, puffMat)
  buildCloudBank(group, puffGeo, puffMat)
  return { group }
}
