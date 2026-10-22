// Anime speed lines over the screen edges while surfing fast, like the reference shot: white
// streaks pointing at the middle, which stays clear. Two canvases are painted once with different
// random streaks; each frame shows one of them at a fresh random spin so the lines flicker, and the
// overlay fades in with speed. No per-frame drawing, just a CSS opacity and transform.
const STREAKS = 90

function paint(seed) {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const mid = size / 2
  for (let i = 0; i < STREAKS; i++) {
    const a = rand() * Math.PI * 2
    const inner = mid * (0.55 + rand() * 0.35) // where the streak's point stops short of the centre
    const outer = mid * 1.45
    const w = (0.004 + rand() * 0.012) * Math.PI
    g.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.5})`
    g.beginPath()
    g.moveTo(mid + Math.cos(a) * inner, mid + Math.sin(a) * inner)
    g.lineTo(mid + Math.cos(a - w) * outer, mid + Math.sin(a - w) * outer)
    g.lineTo(mid + Math.cos(a + w) * outer, mid + Math.sin(a + w) * outer)
    g.closePath()
    g.fill()
  }
  c.className = 'speedlines-layer'
  return c
}

export function createSpeedLines() {
  const root = document.createElement('div')
  root.className = 'speedlines'
  Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', overflow: 'hidden', opacity: '0', zIndex: '1' })
  const layers = [paint(1234567), paint(7654321)]
  for (const l of layers) {
    // A square that covers the screen's diagonal, centred.
    Object.assign(l.style, { position: 'absolute', left: '50%', top: '50%', width: '150vmax', height: '150vmax', marginLeft: '-75vmax', marginTop: '-75vmax', willChange: 'transform' })
    root.appendChild(l)
  }
  document.body.appendChild(root)

  let shown = 0
  let clock = 0
  let level = 0
  return {
    // amount 0..1 (speed); dt for the flicker clock.
    update(dt, amount) {
      level += (amount - level) * (1 - Math.exp(-6 * dt))
      const o = level < 0.02 ? 0 : level
      root.style.opacity = o.toFixed(3)
      if (o === 0) return
      clock -= dt
      if (clock > 0) return
      clock = 0.05
      shown ^= 1
      layers[shown].style.display = ''
      layers[shown ^ 1].style.display = 'none'
      layers[shown].style.transform = `rotate(${(Math.random() * 360).toFixed(1)}deg) scale(${(1 + 0.12 * (1 - level) + Math.random() * 0.05).toFixed(3)})`
    },
  }
}
