// Canvas-painted hub signs: the RAPIDS AHEAD! billboard, the VIP ACCESS floating label, the
// hanging sign's gold frame, surfboard stripes, and `labelSprite` for every
// floating BillboardGui-style label (pets, shop, Coach, rules...).
// Text uses Fredoka (index.html); each texture is painted at once with the fallback font and
// repainted when Fredoka arrives, so the world never waits on the network.
import { Sprite, SpriteMaterial } from 'three'
import { HUB_COLORS } from '../config.js'
import { canvas, toTexture } from '../textures.js'

const FONT = 'Fredoka, "Arial Rounded MT Bold", "Arial Black", sans-serif'

// Floating labels draw after every other transparent surface (lake, lanes, ripples at 2,
// particles at 4). They don't write depth, so anything transparent drawn after them — the lake,
// whose centre often sorts nearer than the label — would paint straight over the letters.
export const LABEL_RENDER_ORDER = 5

function painted(w, h, paint) {
  const c = canvas(w, h)
  const tex = toTexture(c)
  const draw = () => {
    const g = c.getContext('2d')
    g.clearRect(0, 0, w, h)
    paint(g, w, h)
    tex.needsUpdate = true
  }
  draw()
  document.fonts?.load(`700 64px Fredoka`).then(draw, () => {})
  tex.userData.repaint = draw // for faces whose content changes (leaderboards)
  return tex
}

// The longest prefix of `text` (plus "...") that fits `max` px in the current font.
function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text
  let s = text
  while (s.length > 1 && g.measureText(`${s}...`).width > max) s = s.slice(0, -1)
  return `${s}...`
}

function outlined(g, text, x, y, px, fill, stroke = '#1a0c0c', width = 0.16) {
  g.font = `700 ${px}px ${FONT}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = px * width
  g.strokeStyle = stroke
  g.strokeText(text, x, y)
  g.fillStyle = fill
  g.fillText(text, x, y)
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

// Black screen: warning triangle + coin "20" on top, RAPIDS / AHEAD! below.
export const billboardTexture = () =>
  painted(1024, 512, (g, w, h) => {
    g.fillStyle = HUB_COLORS.screen
    g.fillRect(0, 0, w, h)
    // warning triangle
    const tx = w * 0.47
    const ty = 40
    g.fillStyle = '#ffd21a'
    g.strokeStyle = '#1a1a1a'
    g.lineWidth = 8
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(tx, ty)
    g.lineTo(tx + 70, ty + 118)
    g.lineTo(tx - 70, ty + 118)
    g.closePath()
    g.fill()
    g.stroke()
    outlined(g, '!', tx, ty + 72, 80, '#1a1a1a', '#1a1a1a', 0)
    // coin + 20
    const cx = tx + 30
    const cy = ty + 112
    g.fillStyle = '#ffb20f'
    g.beginPath()
    g.arc(cx, cy, 26, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffd84a'
    g.beginPath()
    g.arc(cx, cy, 17, 0, Math.PI * 2)
    g.fill()
    outlined(g, '20', cx + 66, cy + 2, 50, '#ffffff', '#1a1a1a', 0.18)
    outlined(g, 'RAPIDS', w / 2, h * 0.56, 150, '#ffffff', '#ffffff', 0)
    outlined(g, 'AHEAD!', w / 2, h * 0.84, 150, '#ffffff', '#ffffff', 0)
  })

// Floating "VIP ACCESS / ⚡X2 🏆X2" label with the little rainbow arc and hex badge behind it;
// `price` (vipLane.js, while the lane is locked) adds a third row, making the canvas taller.
export const vipTexture = (price = '') =>
  painted(512, price ? 380 : 300, (g, w) => {
    const arcs = ['#5fe03a', '#ff4a4a', '#ffd21a']
    arcs.forEach((col, i) => {
      g.strokeStyle = col
      g.lineWidth = 18
      g.beginPath()
      g.arc(110, 150, 70 - i * 18, Math.PI, Math.PI * 2)
      g.stroke()
    })
    // hexagon badge
    g.save()
    g.translate(w / 2 + 10, 44)
    g.fillStyle = '#2e8f4a'
    g.strokeStyle = '#163d22'
    g.lineWidth = 5
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 22, Math.sin(a) * 22)
    }
    g.closePath()
    g.fill()
    g.stroke()
    g.restore()
    outlined(g, 'VIP ACCESS', w / 2, 128, 74, '#ffd23a', '#2a1600', 0.2)
    outlined(g, '⚡X2  🏆X2', w / 2, 220, 70, '#ffffff', '#1a1a1a', 0.2)
    if (price) outlined(g, price, w / 2, 322, 64, '#5cff4a', '#0d3006', 0.2)
  })

// Dark board with an inset gold frame and WELCOME HOME (the sign hanging from the tree).
export const hangingSignTexture = () =>
  painted(512, 220, (g, w, h) => {
    g.fillStyle = HUB_COLORS.signBoard
    g.fillRect(0, 0, w, h)
    g.strokeStyle = HUB_COLORS.signGold
    g.lineWidth = 12
    roundRect(g, 26, 26, w - 52, h - 52, 6)
    g.stroke()
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(0, h - 18, w, 18)
    outlined(g, 'WELCOME HOME', w / 2, h / 2 + 4, 70, '#ffffff', '#1a0606', 0.2)
  })

// Surfboard deck in its own UV square (tail at v = 0, nose at v = 1): dark tail, chevrons
// climbing the deck.
export const surfboardTexture = ({ base = HUB_COLORS.surfWhite, stripe = HUB_COLORS.surfBlue, tail = HUB_COLORS.surfDark } = {}) =>
  painted(256, 1024, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    g.fillStyle = tail
    g.fillRect(0, h * 0.8, w, h * 0.2) // tail (canvas y grows downward = toward v = 0)
    g.fillStyle = stripe
    for (let i = 0; i < 7; i++) {
      const y = h * 0.74 - i * h * 0.095
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w / 2, y - h * 0.05)
      g.lineTo(w, y)
      g.lineTo(w, y + h * 0.04)
      g.lineTo(w / 2, y - h * 0.01)
      g.lineTo(0, y + h * 0.04)
      g.closePath()
      g.fill()
    }
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fillRect(w / 2 - 3, h * 0.06, 6, h * 0.74) // stringer
  })

// Floating label: rows of outlined text centred on a transparent canvas, shown as a sprite
// `height` metres tall. Row: { text, color, px, stroke, gradient, icon, tag }: `gradient` (colour
// list) fills the text left to right instead of `color`; `icon` ('robux' | 'coin' | 'bolt') draws
// the green Robux hexagon, a gold coin or a lightning bolt before the text; `tag` (e.g. 'OP!')
// puts a tilted yellow-to-red sticker in front of it all.
export function labelSprite(rows, height) {
  const sizes = rows.map((r) => r.px ?? 64)
  const H = Math.ceil(sizes.reduce((sum, px) => sum + px * 1.2, 0) + 24)
  const W = Math.ceil(Math.max(...rows.map((r, i) => [...r.text].length * sizes[i] * 0.64 + (r.icon ? sizes[i] * 1.4 : 0) + (r.tag ? [...r.tag].length * sizes[i] * 0.72 + sizes[i] * 0.3 : 0))) + 48)
  const tex = painted(W, H, (g, w) => {
    let y = 12
    rows.forEach((r, i) => {
      const px = sizes[i]
      const cy = y + px * 0.6
      g.font = `700 ${px}px ${FONT}`
      const tw = g.measureText(r.text).width
      const iw = r.icon ? px * 1.25 : 0
      g.font = `700 ${px * 0.9}px ${FONT}`
      const gw = r.tag ? g.measureText(r.tag).width + px * 0.3 : 0
      g.font = `700 ${px}px ${FONT}`
      const x0 = w / 2 - (tw + iw + gw) / 2 + gw
      if (r.tag) tagSticker(g, r.tag, x0 - gw / 2 - px * 0.1, cy - px * 0.08, px * 0.9)
      if (r.icon) labelIcon(g, r.icon, x0 + px * 0.5, cy, px * 0.52)
      const tx = x0 + iw + tw / 2
      let fill = r.color ?? '#ffffff'
      if (r.gradient) {
        fill = g.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0)
        r.gradient.forEach((c, k) => fill.addColorStop(k / (r.gradient.length - 1), c))
      }
      outlined(g, r.text, tx, cy, px, fill, r.stroke ?? '#1a1a1a', 0.2)
      y += px * 1.2
    })
  })
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  sprite.scale.set((height * W) / H, height, 1)
  sprite.renderOrder = LABEL_RENDER_ORDER
  return sprite
}

// Tilted "OP!"-style sticker: yellow running into orange-red at the bottom, thick dark outline.
function tagSticker(g, text, x, y, px) {
  g.save()
  g.translate(x, y)
  g.rotate(-0.22)
  const fill = g.createLinearGradient(0, -px * 0.4, 0, px * 0.4)
  fill.addColorStop(0, '#fff45a')
  fill.addColorStop(0.55, '#ffc21a')
  fill.addColorStop(1, '#ff3a1a')
  outlined(g, text, 0, 0, px, fill, '#1a0a0a', 0.24)
  g.restore()
}

function labelIcon(g, kind, x, y, r) {
  g.save()
  g.translate(x, y)
  g.lineJoin = 'round'
  if (kind === 'bolt') {
    g.beginPath()
    ;[[0.25, -1], [-0.55, 0.15], [-0.02, 0.15], [-0.3, 1], [0.6, -0.25], [0.05, -0.25], [0.35, -1]].forEach(([px, py], i) => g[i ? 'lineTo' : 'moveTo'](px * r, py * r))
    g.closePath()
    g.strokeStyle = '#1a1a1a'
    g.lineWidth = r * 0.3
    g.stroke()
    g.fillStyle = '#ffd21a'
    g.fill()
    g.restore()
    return
  }
  const poly = (rr, sides, rot) => {
    g.beginPath()
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + rot
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
  }
  if (kind === 'robux') {
    poly(r, 6, Math.PI / 6)
    g.fillStyle = '#4fd36a'
    g.strokeStyle = '#123a1c'
    g.lineWidth = r * 0.28
    g.stroke()
    g.fill()
    poly(r * 0.66, 6, Math.PI / 6)
    g.fillStyle = '#2f9e47'
    g.fill()
    g.fillStyle = '#123a1c'
    g.fillRect(-r * 0.22, -r * 0.22, r * 0.44, r * 0.44)
  } else {
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fillStyle = '#ffb20f'
    g.strokeStyle = '#3a2200'
    g.lineWidth = r * 0.2
    g.stroke()
    g.fill()
    g.beginPath()
    g.arc(0, 0, r * 0.72, 0, Math.PI * 2)
    g.fillStyle = '#ffd84a'
    g.fill()
    g.fillStyle = '#e8961a'
    g.beginPath()
    g.moveTo(-r * 0.3, r * 0.35)
    g.lineTo(r * 0.05, -r * 0.4)
    g.lineTo(r * 0.3, -r * 0.1)
    g.lineTo(r * 0.02, r * 0.35)
    g.closePath()
    g.fill()
  }
  g.restore()
}

// Neon square frame painted on the band round each pet pod: rainbow gradient running round
// the square, with a soft glow either side of the line.
export const rainbowFrameTexture = () =>
  painted(256, 256, (g, w) => {
    const c = w / 2
    const grad = g.createConicGradient(-Math.PI / 4, c, c)
    ;['#ffffff', '#3cff6a', '#2ff0ff', '#ffe11a', '#ff9a1a', '#ff2d6a', '#ff4dff', '#ffffff'].forEach((col, i, a) => grad.addColorStop(i / (a.length - 1), col))
    g.strokeStyle = grad
    g.lineJoin = 'round'
    g.shadowColor = 'rgba(255,255,255,0.9)'
    g.shadowBlur = 14
    g.lineWidth = 16
    roundRect(g, 26, 26, w - 52, w - 52, 10)
    g.stroke()
    g.shadowBlur = 0
    g.lineWidth = 10
    g.stroke()
  })

// Soft purple floor paint for the pet band: violet with lighter round blotches (tileable).
export const petBandTexture = () =>
  painted(256, 256, (g, w) => {
    g.fillStyle = '#a526ff'
    g.fillRect(0, 0, w, w)
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 14; i++) {
      const x = rand() * w
      const y = rand() * w
      const r = 14 + rand() * 30
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, w], [0, -w]]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
        grad.addColorStop(0, 'rgba(214,120,255,0.55)')
        grad.addColorStop(0.7, 'rgba(214,120,255,0.35)')
        grad.addColorStop(1, 'rgba(214,120,255,0)')
        g.fillStyle = grad
        g.beginPath()
        g.ellipse(x + dx, y + dy, r * 1.4, r, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
  })

// Leaderboard face: red header with "TOP 100" over the big `title` in `color`, then ten numbered
// rows and the viewer's own row at the bottom. `board.set(rows, you)` repaints it: rows
// [{ name, value }] already formatted (the server's `leaderboard` message, via main.js; empty
// rows show a dash while solo or before the first one arrives), `you` { rank, value } (rank 0 =
// not in the top ten).
export function leaderboardTexture(title, color) {
  let rows = []
  let you = { rank: 0, value: '0' }
  const tex = painted(512, 720, (g, w, h) => {
    g.fillStyle = '#b3121f'
    g.fillRect(0, 0, w, h)
    outlined(g, 'TOP 100', w / 2, 44, 52, '#ffffff', '#2a0505', 0.16)
    outlined(g, title, w / 2, 112, 92, color, '#2a0505', 0.16)
    g.fillStyle = '#101216'
    g.fillRect(18, 162, w - 36, h - 180)
    g.font = `700 24px ${FONT}`
    g.textBaseline = 'middle'
    for (let i = 0; i < 10; i++) {
      const y = 196 + i * 48
      const row = rows[i]
      g.fillStyle = i % 2 ? '#1a1d22' : '#22262d'
      g.fillRect(28, y - 20, w - 56, 40)
      g.textAlign = 'right'
      g.fillStyle = color
      const value = row ? row.value : '-'
      g.fillText(value, w - 40, y)
      g.textAlign = 'left'
      g.fillStyle = i < 3 ? ['#ffd21a', '#d9e2ea', '#e0904a'][i] : '#ffffff'
      g.fillText(`${i + 1}  ${row ? fit(g, row.name, w - 120 - g.measureText(value).width) : ''}`, 40, y)
    }
    g.textAlign = 'left'
    g.fillStyle = color
    g.fillText(you.rank ? `#${you.rank}  You` : 'You', 40, h - 36)
    g.textAlign = 'right'
    g.fillText(you.value, w - 40, h - 36)
  })
  let key = ''
  return {
    tex,
    set(nextRows, nextYou) {
      const next = JSON.stringify([nextRows, nextYou])
      if (next === key) return // unchanged: skip the repaint and upload
      key = next
      rows = nextRows
      you = nextYou
      tex.userData.repaint()
    },
  }
}

// Portal swirl: purple-to-blue spiral arms on a deep violet disc.
export const portalTexture = () =>
  painted(256, 256, (g, w) => {
    const c = w / 2
    const grad = g.createRadialGradient(c, c, 4, c, c, c)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.25, '#b78bff')
    grad.addColorStop(0.7, '#4b1fb5')
    grad.addColorStop(1, '#22115e')
    g.fillStyle = grad
    g.fillRect(0, 0, w, w)
    g.lineCap = 'round'
    for (let arm = 0; arm < 4; arm++) {
      g.strokeStyle = arm % 2 ? 'rgba(120,200,255,0.8)' : 'rgba(220,170,255,0.8)'
      g.lineWidth = 10
      g.beginPath()
      for (let t = 0; t <= 1; t += 0.02) {
        const a = arm * (Math.PI / 2) + t * Math.PI * 2.2
        const r = 8 + t * (c - 14)
        const px = c + Math.cos(a) * r
        const py = c + Math.sin(a) * r
        if (t === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
    }
  })

// Yellow shop-counter front with a big outlined SHOP.
export const shopCounterTexture = () =>
  painted(512, 180, (g, w, h) => {
    g.fillStyle = '#ffd21a'
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(0,0,0,0.12)'
    g.fillRect(0, h - 14, w, 14)
    outlined(g, 'SHOP', w / 2, h / 2, 120, '#ffffff', '#1a1a1a', 0.2)
  })

// Rounded banner sign: `bg` pill with white-edged `text` (the Shop banner over the stall).
export const bannerTexture = (text, bg, fg) =>
  painted(512, 166, (g, w, h) => {
    g.fillStyle = bg
    roundRect(g, 6, 6, w - 12, h - 12, 60)
    g.fill()
    g.lineWidth = 8
    g.strokeStyle = '#ffffff'
    g.stroke()
    outlined(g, text, w / 2, h / 2 + 4, 100, fg, '#7a0a14', 0.12)
  })
