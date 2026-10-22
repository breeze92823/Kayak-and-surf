// Pictures for the Index window (hud/petIndex.js), rendered with the game's renderer the same way
// as coachPortraits.js: each model posed alone in a tiny studio scene, rendered offscreen at twice
// the output size and drawn down onto a canvas (smooth edges without MSAA), transparent behind.
//   pet(entry)  - a petIndex.js pet: hub/petFigure.js look or the hub/pets.js showcase species,
//                 framed to its bounds, turned a little toward the camera
//   egg(id)     - the egg it hatches from (hub/eggs.js showcase eggs, else a spotted egg)
//   area(id)    - a snapshot of the slide area in the live world ("Found in:")
//   emote(id)   - the player figure (coachFigure 'player') frozen mid Kayak Shop emote
//   boat(id)    - a Kayak Shop boat (hub/kayakModels.js, or raft.js's log raft), seen from above
//                 with its bow up to the right (hud/shop.js)
// Every call returns a PNG data URL; the window queues them a few per frame as pages come up.
import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderTarget,
} from 'three'
import { petFigure } from './hub/petFigure.js'
import { createPet } from './hub/pets.js'
import { creamEgg, pixelEgg, rainbowEgg, spottedEgg, stoneEgg } from './hub/eggs.js'
import { SLIDE, SLIDE_AREAS, slideSurfaceAt } from './hub/layout.js'
import { petIndex } from './petIndex.js'
import { kayakModel } from './hub/kayakModels.js'
import { raftHull } from './raft.js'
import { coachFigure } from './hub/coachFigure.js'
import { emotePose, emoteStill } from './avatar/emotes.js'

const PET_SIZE = 112 // css px the card shows it at (x2 for crisp screens)
const BOAT_SIZE = 224
const EMOTE_SIZE = 160
const AREA_W = 300
const AREA_H = 120

export function createPortraitStudio(renderer) {
  const studio = new Scene()
  studio.add(new HemisphereLight('#ffffff', '#6a7a8a', 1.6))
  const key = new DirectionalLight('#ffffff', 2.6)
  key.position.set(2, 3, 4)
  const rim = new DirectionalLight('#bfe8ff', 1.4)
  rim.position.set(-3, 2, -2)
  studio.add(key, rim)
  const cam = new PerspectiveCamera(30, 1, 0.05, 200)
  const box = new Box3()
  const centre = new Vector3()
  const size = new Vector3()

  // Renders `scene` from `camera` at w x h css px (x4 offscreen, drawn down to x2).
  function capture(scene, camera, w, h, clear = [0x000000, 0]) {
    const rt = new WebGLRenderTarget(w * 4, h * 4)
    rt.texture.colorSpace = SRGBColorSpace
    const prevTarget = renderer.getRenderTarget()
    const prevClear = renderer.getClearColor(new Color())
    const prevAlpha = renderer.getClearAlpha()
    renderer.setClearColor(clear[0], clear[1])
    renderer.setRenderTarget(rt)
    renderer.clear()
    renderer.render(scene, camera)
    const px = new Uint8Array(w * 4 * h * 4 * 4)
    renderer.readRenderTargetPixels(rt, 0, 0, w * 4, h * 4, px)
    renderer.setRenderTarget(prevTarget)
    renderer.setClearColor(prevClear, prevAlpha)
    rt.dispose()
    const raw = document.createElement('canvas')
    raw.width = w * 4
    raw.height = h * 4
    const rawCtx = raw.getContext('2d')
    const img = rawCtx.createImageData(raw.width, raw.height)
    const row = raw.width * 4
    // WebGL rows run bottom-up.
    for (let y = 0; y < raw.height; y++) img.data.set(px.subarray((raw.height - 1 - y) * row, (raw.height - y) * row), y * row)
    rawCtx.putImageData(img, 0, 0)
    const out = document.createElement('canvas')
    out.width = w * 2
    out.height = h * 2
    const ctx = out.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(raw, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  }

  // Frames a model by the bounds of its meshes and shoots it. Particles and glow sprites are sized
  // for the world, not a close-up, so they stay out, and so does anything marked `userData.fx`.
  function shoot(model, { turn = -0.45, fill = 1, lift = 0.28, px = PET_SIZE } = {}) {
    model.rotation.y = turn
    model.updateMatrixWorld(true)
    box.makeEmpty()
    model.traverse((o) => {
      if (o.isPoints || o.isSprite || o.userData.fx) o.visible = false
      else if (o.isMesh) box.expandByObject(o, true)
    })
    box.getCenter(centre)
    box.getSize(size)
    const r = size.length() / 2
    const dist = (r / Math.sin((cam.fov * Math.PI) / 360)) * 0.92 / fill
    cam.position.set(centre.x + dist * 0.1, centre.y + dist * lift, centre.z + dist * 0.95)
    cam.lookAt(centre)
    studio.add(model)
    const url = capture(studio, cam, px, px)
    studio.remove(model)
    return url
  }

  return {
    pet(entry) {
      const model = entry.species ? createPet(entry.species).group : petFigure(entry.look)
      return shoot(model, { turn: entry.species ? -0.35 : -0.45 })
    },
    egg(id) {
      const egg = petIndex.eggs[id]
      const model = egg.model === 'stone' ? stoneEgg() : egg.model === 'cream' ? creamEgg() : egg.model === 'rainbow' ? rainbowEgg() : egg.model === 'pixel' ? pixelEgg().group : spottedEgg(egg.colors)
      return shoot(model, { turn: 0.3, fill: 1.08 })
    },
    emote(id) {
      const fig = coachFigure('player')
      const e = emotePose(id, emoteStill(id))
      fig.torso.rotation.set(...e.torso)
      fig.head.rotation.set(...e.head)
      fig.armL.rotation.set(...e.armL)
      fig.armR.rotation.set(...e.armR)
      fig.legL.rotation.set(...e.legL)
      fig.legR.rotation.set(...e.legR)
      return shoot(fig.root, { turn: -0.3, lift: 0.12, fill: 1.05, px: EMOTE_SIZE })
    },
    boat(id) {
      const round = id === 'raft' || id === 'watermelon' // the long boats fill the frame corner to corner already
      return shoot(id === 'raft' ? raftHull() : kayakModel(id), { turn: 2.3, lift: 0.85, fill: round ? 1.4 : 1.32, px: BOAT_SIZE })
    },
    // The live world from a spot looking up the slide into the area. `sky` follows the camera.
    area(id, scene, sky) {
      const area = SLIDE_AREAS.find((a) => a.id === id) ?? SLIDE_AREAS[0]
      const camera = new PerspectiveCamera(55, AREA_W / AREA_H, 0.5, 1400)
      if (area.from === 0) {
        // Splash Lake: from over the deck, the pool and the slide climbing away.
        camera.position.set(16, 14, SLIDE.footZ + 30)
        camera.lookAt(-2, 3, SLIDE.footZ - 30)
      } else {
        const z = SLIDE.footZ - area.from - 22
        camera.position.set(9, slideSurfaceAt(z) + 9, z)
        const ahead = z - 45
        camera.lookAt(-1, slideSurfaceAt(ahead) + 3, ahead)
      }
      camera.updateMatrixWorld()
      const skyAt = sky?.position.clone()
      sky?.position.copy(camera.position)
      const url = capture(scene, camera, AREA_W, AREA_H, [0x87ceeb, 1])
      if (skyAt) sky.position.copy(skyAt)
      return url
    },
  }
}

// One studio and one picture per pet species for every window that shows pets (Index, Pet).
let shared = null
const petUrls = {}
export function petPortrait(renderer, id) {
  shared ??= createPortraitStudio(renderer)
  return (petUrls[id] ??= shared.pet(petIndex.pet(id)))
}
export const hasPetPortrait = (id) => !!petUrls[id]
