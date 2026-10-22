// The VIP lane's DOM (vipLane.js): the "E  Buy for 25K Wins / VIP Access" prompt by the rope (coach.css
// prompt; a click buys like E) and a toast (coach.css toast). teleport.js reuses it with its own `title`.
import './vipLane.css'

export function createVipPrompt(root, { onBuy, title = 'VIP Access' }) {
  const el = document.createElement('div')
  el.className = 'vip'
  el.innerHTML = `
<button class="coach-prompt vip-prompt"><span class="coach-key">E</span><span class="coach-prompt-txt"><small></small><b>${title}</b></span></button>
<div class="coach-toast vip-toast"><b class="hud-txt"></b><span class="hud-txt"></span></div>`
  root.appendChild(el)

  const promptEl = el.querySelector('.vip-prompt')
  const smallEl = promptEl.querySelector('small')
  const toastEl = el.querySelector('.vip-toast')
  promptEl.addEventListener('click', () => onBuy())

  const replay = (node, cls) => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  return {
    // Screen position (px) for the prompt, or null to hide it.
    prompt(x, y, small = '') {
      promptEl.classList.toggle('show', x != null)
      if (x == null) return
      if (smallEl.textContent !== small) smallEl.textContent = small
      promptEl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    },
    refuse: () => replay(promptEl, 'is-no'),
    toast(title, sub = '') {
      toastEl.querySelector('b').textContent = title
      toastEl.querySelector('span').textContent = sub
      replay(toastEl, 'show')
    },
  }
}
