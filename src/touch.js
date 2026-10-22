// Touch controls (phones/tablets, after Paper-plane's touch.js): a floating move stick on the left of
// the world (paddle / steer up the lane / carve and tuck on the surf), drag-to-look and pinch-to-zoom
// on the right, JUMP and EMOTE (only once an emote is equipped) buttons bottom right, menu and
// fullscreen top left, and a "rotate your phone" screen in portrait. The E prompts (Coach, Shop,
// eggs, VIP...) are tappable buttons already. Everything feeds inputState, exactly like the
// keyboard and mouse do, so the rest of the game does not know the difference. While a centre
// window is open (hud.root's *-open classes) the stick and the action buttons step aside.
import { inputState } from './input.js'
import { isTouch } from './device.js'
import { emotes } from './emotes.js'

const STICK_R = 56 // px of travel for full speed
const DEAD = 0.12
const LOOK_GAIN = 1.5 // finger travel is shorter than a mouse sweep
const PINCH_GAIN = 0.03 // zoom notches per px of pinch
const SPLIT = 0.45 // fraction of the width: left of it is the stick, right of it looks
// hud.root classes of the windows that take the screen (hud/*.js).
const WINDOWS = ['coach-open', 'index-open', 'pets-open', 'spin-open', 'shop-open', 'eggs-open', 'eggs-hatching', 'mut-open', 'trade-open', 'daily-open']

// Real px, kept clear of notches by the safe-area insets. Under the HUD (z-index 10), so its
// windows cover the buttons.
const STYLE = `
html.touch,html.touch body{-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;overscroll-behavior:none}
html.touch canvas{touch-action:none}
.tc{--pad:16px;position:fixed;inset:0;z-index:9;pointer-events:none;touch-action:none;font-family:Fredoka,system-ui,sans-serif}
.tc.win-open>:not(.tc-menu):not(.tc-full){display:none}
.tc-btn{position:absolute;display:grid;place-items:center;pointer-events:auto;touch-action:none;border:4px solid #0b1d3f;border-radius:50%;
  color:#fff;padding:0;font:inherit;font-weight:700;background:rgba(15,23,42,.6);
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.25),0 4px 0 rgba(0,0,0,.3);transition:transform .06s ease,background .1s}
.tc-btn svg{width:55%;height:55%;display:block}
.tc-btn span{position:absolute;bottom:9px;font-size:12px;letter-spacing:.5px;-webkit-text-stroke:3px #0b1d3f;paint-order:stroke fill}
.tc-btn.on{transform:scale(.92);background:rgba(255,210,26,.85)}
.tc-btn[hidden]{display:none}
.tc-jump{right:calc(var(--pad) + env(safe-area-inset-right));bottom:calc(var(--pad) + env(safe-area-inset-bottom));width:78px;height:78px;
  border-color:#0d2a5a;background:rgba(40,150,255,.72)}
.tc-jump svg{margin-top:-8px}
.tc-emote{right:calc(var(--pad) + 88px + env(safe-area-inset-right));bottom:calc(var(--pad) + 6px + env(safe-area-inset-bottom));width:60px;height:60px;
  border-color:#3a0a5a;background:rgba(160,70,230,.72)}
.tc-emote svg{width:58%;height:58%}
.tc-menu,.tc-full{top:calc(10px + env(safe-area-inset-top));width:44px;height:44px;border-width:3px}
.tc-menu{left:calc(10px + env(safe-area-inset-left))}
.tc-full{left:calc(62px + env(safe-area-inset-left))}

/* Floating stick: rests faintly bottom-left, then jumps under the thumb. */
.tc-stick{position:absolute;left:var(--x,calc(96px + env(safe-area-inset-left)));top:var(--y,calc(100% - 92px - env(safe-area-inset-bottom)));
  width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:4px solid rgba(255,255,255,.55);background:rgba(20,20,24,.3);transition:opacity .15s}
.tc-stick.idle{opacity:.3}
.tc-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.8);border:4px solid #0b1d3f}

/* Portrait: ask for landscape (the HUD and the slide run across the screen). On the body, over the HUD and the loading screen. */
.tc-rotate{display:none;position:fixed;inset:0;z-index:2000;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  text-align:center;color:#fff;font-family:Fredoka,system-ui,sans-serif;font-weight:700;pointer-events:auto;background:linear-gradient(#5fb4f0,#1f78d0)}
.tc-rotate div{font-size:90px;line-height:1;animation:tc-turn 2.4s ease-in-out infinite}
.tc-rotate p{margin:0;font-size:32px;-webkit-text-stroke:5px #0b1d3f;paint-order:stroke fill}
.tc-rotate small{font-size:16px;opacity:.9}
@keyframes tc-turn{0%,30%{transform:rotate(0)}70%,100%{transform:rotate(-90deg)}}
@media (orientation:portrait) and (max-width:900px){.tc-rotate{display:flex}}
@media (max-height:400px){
  .tc-jump{width:66px;height:66px}
  .tc-emote{width:52px;height:52px;right:calc(var(--pad) + 76px + env(safe-area-inset-right))}
  .tc-stick{top:var(--y,calc(100% - 80px - env(safe-area-inset-bottom)))}
}
`

export function createTouchControls({ hud, showMenu }) {
  if (!isTouch) return
  document.documentElement.classList.add('touch')

  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.appendChild(style)

  const root = document.createElement('div')
  root.className = 'tc'
  root.innerHTML = `
    <div class="tc-stick idle"><div class="tc-knob"></div></div>
    <button class="tc-btn tc-menu" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
    <button class="tc-btn tc-full" aria-label="Fullscreen" hidden><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <button class="tc-btn tc-emote" aria-label="Emote" hidden><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#ffd23a" stroke="#3a0a5a" stroke-width="2.2"/><circle cx="9" cy="10" r="1.4" fill="#3a0a5a"/><circle cx="15" cy="10" r="1.4" fill="#3a0a5a"/><path d="M7.5 14q4.5 4.5 9 0" fill="none" stroke="#3a0a5a" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    <button class="tc-btn tc-jump" aria-label="Jump"><svg viewBox="0 0 24 24"><path d="M12 19V6M6 11l6-6 6 6" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>JUMP</span></button>`
  document.body.appendChild(root)
  const rotate = document.createElement('div')
  rotate.className = 'tc-rotate'
  rotate.innerHTML = '<div>&#8635;</div><p>Rotate your phone</p><small>Kayak &amp; Surf plays in landscape</small>'
  document.body.appendChild(rotate)
  const stick = root.querySelector('.tc-stick')
  const knob = root.querySelector('.tc-knob')

  const buzz = (ms) => navigator.vibrate?.(ms)
  const windowOpen = () => root.classList.contains('win-open')
  new MutationObserver(() => {
    const open = WINDOWS.some((c) => hud.root.classList.contains(c))
    if (open !== windowOpen()) root.classList.toggle('win-open', open)
  }).observe(hud.root, { attributes: true, attributeFilter: ['class'] })

  // Fullscreen where the browser has it (not iPhone Safari), then try to pin landscape.
  const el = document.documentElement
  const reqFs = el.requestFullscreen ?? el.webkitRequestFullscreen
  if (reqFs) {
    const full = root.querySelector('.tc-full')
    full.hidden = false
    full.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement ?? document.webkitFullscreenElement) await (document.exitFullscreen ?? document.webkitExitFullscreen).call(document)
        else {
          await reqFs.call(el)
          await screen.orientation?.lock?.('landscape')
        }
      } catch {
        // Refused (iframe / policy): the game plays fine windowed.
      }
    })
  }
  root.querySelector('.tc-menu').addEventListener('click', () => showMenu())

  // --- Buttons ----------------------------------------------------------------
  const hold = (btn, onDown) => {
    btn.addEventListener('pointerdown', (e) => {
      btn.setPointerCapture?.(e.pointerId)
      btn.classList.add('on')
      onDown()
      buzz(8)
      e.preventDefault()
      e.stopPropagation()
    })
    const end = () => btn.classList.remove('on')
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, end)
  }
  hold(root.querySelector('.tc-jump'), () => (inputState.jump = true))
  // G on a keyboard: plays the equipped Kayak Shop emote (main.js), so the button shows only with one.
  const emoteBtn = root.querySelector('.tc-emote')
  hold(emoteBtn, () => (inputState.emote = true))
  const showEmote = () => (emoteBtn.hidden = !emotes.equipped)
  emotes.onEquip(showEmote)
  showEmote()

  // --- World touches: left = stick, right = look / pinch ------------------------------
  let stickId = null
  const sc = { x: 0, y: 0 } // stick centre
  const looks = new Map() // pointerId -> { x, y, d } (d = last pinch distance)

  const showStick = (x, y) => {
    stick.classList.remove('idle')
    stick.style.setProperty('--x', `${x}px`)
    stick.style.setProperty('--y', `${y}px`)
  }
  const releaseStick = () => {
    stickId = null
    inputState.move.x = 0
    inputState.move.z = 0
    stick.classList.add('idle')
    stick.style.removeProperty('--x')
    stick.style.removeProperty('--y')
    knob.style.transform = ''
  }
  const pinchDist = () => {
    const [a, b] = [...looks.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || e.target.tagName !== 'CANVAS' || windowOpen()) return
    if (e.clientX < window.innerWidth * SPLIT) {
      if (stickId !== null) return
      stickId = e.pointerId
      sc.x = e.clientX
      sc.y = e.clientY
      knob.style.transform = ''
      showStick(sc.x, sc.y)
    } else if (looks.size < 2) {
      looks.set(e.pointerId, { x: e.clientX, y: e.clientY, d: 0 })
      if (looks.size === 2) {
        const d = pinchDist()
        looks.forEach((v) => (v.d = d))
      }
    }
  })
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') return
    if (e.pointerId === stickId) {
      let dx = e.clientX - sc.x
      let dy = e.clientY - sc.y
      const len = Math.hypot(dx, dy)
      if (len > STICK_R) {
        // Drag the base along so a long swipe never leaves the stick behind the thumb.
        sc.x += (dx / len) * (len - STICK_R)
        sc.y += (dy / len) * (len - STICK_R)
        showStick(sc.x, sc.y)
        dx = (dx / len) * STICK_R
        dy = (dy / len) * STICK_R
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      const m = Math.min(1, Math.hypot(dx, dy) / STICK_R)
      const live = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD)
      const a = Math.atan2(dy, dx)
      inputState.move.x = Math.cos(a) * live
      inputState.move.z = -Math.sin(a) * live
      return
    }
    const l = looks.get(e.pointerId)
    if (!l) return
    if (looks.size === 2) {
      l.x = e.clientX
      l.y = e.clientY
      const d = pinchDist()
      inputState.zoom += (l.d - d) * PINCH_GAIN
      looks.forEach((v) => (v.d = d))
    } else {
      inputState.look.dx += (e.clientX - l.x) * LOOK_GAIN
      inputState.look.dy += (e.clientY - l.y) * LOOK_GAIN
      l.x = e.clientX
      l.y = e.clientY
    }
  })
  const lift = (e) => {
    if (e.pointerType !== 'touch') return
    if (e.pointerId === stickId) releaseStick()
    looks.delete(e.pointerId)
  }
  window.addEventListener('pointerup', lift)
  window.addEventListener('pointercancel', lift)
  // A window opening mid-drag must not leave the raft paddling on by itself.
  setInterval(() => {
    if (!windowOpen()) return
    if (stickId !== null) releaseStick()
    looks.clear()
  }, 250)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    releaseStick()
    looks.clear()
  })
  // iOS pinch/double-tap page zoom ignores the viewport lock.
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault())
}
