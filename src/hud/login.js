// "Log in with Bloxity" button (after Paper-plane's login.js): shown only while nobody is signed
// in, hidden once auth.user exists. Also hidden until auth has settled (so it doesn't flash during
// loading), in VITE_DEV_MODE (no SDK) and while a centre window is open (login.css). Sits first in
// the top-right row, left of the Daily Rewards / Spin buttons.
import { DEV_MODE } from '../config.js'
import { showLogin, subscribeAuth } from '../bloxity.js'
import './login.css'

export function createLoginButton(hud) {
  if (DEV_MODE) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'hud-login hud-txt'
  btn.hidden = true
  btn.addEventListener('click', showLogin)
  hud.root.querySelector('.hud-tr').prepend(btn)

  const label = () => (btn.textContent = document.documentElement.classList.contains('compact') ? 'Log in' : 'Log in with Bloxity')
  label()
  window.addEventListener('resize', label)
  subscribeAuth((s) => {
    btn.hidden = !s.ready || !!s.user
  })
}
