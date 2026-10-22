// Waist-up portraits of the roster coaches for the Coach window: each coachFigure look is posed in a
// tiny studio scene, rendered with the game's renderer into an offscreen target at twice the
// output size and drawn down onto a canvas (smooth edges without MSAA), transparent behind so the card's rarity colour
// shows through. Rendered once, the first time the window opens; returns { [look]: dataURL }.
import { DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Color, WebGLRenderTarget } from 'three'
import { coachFigure } from './hub/coachFigure.js'

const SIZE = 192 // css px the card shows it at (x2 for crisp screens)

export function renderCoachPortraits(renderer, looks) {
  const px = SIZE * 4
  const rt = new WebGLRenderTarget(px, px)
  rt.texture.colorSpace = SRGBColorSpace
  const scene = new Scene()
  scene.add(new HemisphereLight('#ffffff', '#6a7a8a', 1.6))
  const key = new DirectionalLight('#ffffff', 2.6)
  key.position.set(2, 3, 4)
  const rim = new DirectionalLight('#bfe8ff', 1.4)
  rim.position.set(-3, 2, -2)
  scene.add(key, rim)
  const camera = new PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.set(0.35, 1.58, 2.3)
  camera.lookAt(0, 1.42, 0)

  const pixels = new Uint8Array(px * px * 4)
  const raw = document.createElement('canvas')
  raw.width = raw.height = px
  const rawCtx = raw.getContext('2d')
  const out = document.createElement('canvas')
  out.width = out.height = SIZE * 2
  const outCtx = out.getContext('2d')
  outCtx.imageSmoothingQuality = 'high'

  const prevTarget = renderer.getRenderTarget()
  const prevClear = renderer.getClearColor(new Color())
  const prevAlpha = renderer.getClearAlpha()
  const prevShadows = renderer.shadowMap.enabled
  renderer.shadowMap.enabled = false
  renderer.setClearColor(0x000000, 0)
  const urls = {}
  for (const look of looks) {
    const rig = coachFigure(look)
    rig.root.rotation.y = -0.3
    rig.head.rotation.y = 0.15
    rig.armR.rotation.z = -0.12
    rig.armL.rotation.z = 0.12
    scene.add(rig.root)
    renderer.setRenderTarget(rt)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.readRenderTargetPixels(rt, 0, 0, px, px, pixels)
    scene.remove(rig.root)
    rig.root.traverse((o) => o.geometry?.dispose())
    // WebGL rows run bottom-up.
    const img = rawCtx.createImageData(px, px)
    for (let y = 0; y < px; y++) img.data.set(pixels.subarray((px - 1 - y) * px * 4, (px - y) * px * 4), y * px * 4)
    rawCtx.putImageData(img, 0, 0)
    outCtx.clearRect(0, 0, out.width, out.height)
    outCtx.drawImage(raw, 0, 0, out.width, out.height)
    urls[look] = out.toDataURL('image/png')
  }
  renderer.setRenderTarget(prevTarget)
  renderer.setClearColor(prevClear, prevAlpha)
  renderer.shadowMap.enabled = prevShadows
  rt.dispose()
  return urls
}
