// Inline SVG art for the HUD, drawn to match the reference shot (Roblox-style: flat fills, dark
// outlines). Every icon is a 100x100 viewBox string; size it with CSS.

const O = '#2b1706' // the shared dark outline
const svg = (body, vb = '0 0 100 100') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`

const GOLD = `<linearGradient id="hud-gold" x1="0" x2="1"><stop offset="0" stop-color="#ffe266"/><stop offset=".55" stop-color="#ffc21f"/><stop offset="1" stop-color="#e8990c"/></linearGradient>`

// One canoe paddle standing up (grip on top, blade at the bottom), turned `deg` about (50, 40).
const paddle = (deg) => `<g transform="rotate(${deg} 50 40)" fill="#f08718" stroke="#a54c05" stroke-width="1.5">
  <rect x="47.8" y="17" width="4.4" height="34" rx="2"/><rect x="44.5" y="14" width="11" height="4.5" rx="2"/>
  <path d="M50 44c5 0 6.5 5 6.5 9.5S54 64 50 64s-6.5-6-6.5-10.5S45 44 50 44z"/></g>`

export const trophy = svg(`<defs>${GOLD}</defs>
  <path d="M24 20H9c-1 18 8 28 20 30M76 20h15c1 18-8 28-20 30" fill="none" stroke="${O}" stroke-width="11" stroke-linecap="round"/>
  <path d="M24 20H9c-1 18 8 28 20 30M76 20h15c1 18-8 28-20 30" fill="none" stroke="#f7b51e" stroke-width="4.5" stroke-linecap="round"/>
  <g stroke="${O}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M43 64h14l3 19H40z" fill="#f0a51a"/>
    <path d="M33 92l3-10h28l3 10z" fill="#f2aa1c"/>
    <rect x="26" y="89" width="48" height="8" rx="2" fill="#de8c10"/>
    <path d="M20 12h60v26c0 22-14 31-30 31S20 60 20 38z" fill="url(#hud-gold)"/>
    <rect x="15" y="5" width="70" height="10" rx="3" fill="#ffd84a"/>
  </g>
  <path d="M27 20v18c0 8 3 15 8 20" fill="none" stroke="#fff6c0" stroke-width="4" stroke-linecap="round" opacity=".7"/>
  ${paddle(38)}${paddle(-38)}`)

export const coin = svg(`<circle cx="50" cy="53" r="44" fill="#c9780a" stroke="${O}" stroke-width="3.5"/>
  <circle cx="50" cy="48" r="44" fill="#ffc928" stroke="${O}" stroke-width="3.5"/>
  <circle cx="50" cy="48" r="34" fill="#f9aa1c" stroke="#e48a0a" stroke-width="3"/>
  <g fill="#e6800c">
    <path d="M33 25l36 46" stroke="#e6800c" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="68" cy="70" rx="4.5" ry="8" transform="rotate(-38 68 70)"/>
    <path d="M47 57V22c10 8 18 20 21 33z"/>
    <path d="M25 60h50c-4 9-14 13-25 13s-21-4-25-13z"/>
  </g>
  <path d="M19 40a32 32 0 0 1 21-23" fill="none" stroke="#fff3b0" stroke-width="4" stroke-linecap="round" opacity=".85"/>`)

export const gift = svg(`<g transform="rotate(-14 50 58)" stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <path d="M18 46h64v42H18z" fill="#ffd93a"/>
    <path d="M62 46h20v42H62z" fill="#f4b81f"/>
    <path d="M26 46h7v42h-7zM67 46h7v42h-7z" fill="#ff4f7a"/>
    <path d="M13 32h74v15H13z" fill="#ffe45c"/>
    <path d="M44 32h12v56H44z" fill="#ff4f7a"/>
    <path d="M50 33c-7-15-26-19-28-8s15 11 28 8z" fill="#ff62a6"/>
    <path d="M50 33c7-15 26-19 28-8s-15 11-28 8z" fill="#ff62a6"/>
    <circle cx="50" cy="32" r="5.5" fill="#e8337c"/>
  </g>`)

function gearPath(cx, cy, rOut, rIn, teeth) {
  const pts = []
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    const step = Math.PI / teeth
    for (const [da, r] of [[-step * 0.95, rIn], [-step * 0.45, rOut], [step * 0.45, rOut], [step * 0.95, rIn]]) {
      pts.push(`${(cx + Math.cos(a + da) * r).toFixed(1)} ${(cy + Math.sin(a + da) * r).toFixed(1)}`)
    }
  }
  return `M${pts.join('L')}Z`
}

export const gear = svg(`<path d="${gearPath(50, 50, 44, 33, 8)}" fill="#f6962a" stroke="#6e3402" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="50" cy="50" r="13" fill="#232326" stroke="#6e3402" stroke-width="4"/>
  <path d="M27 36a26 26 0 0 1 14-12" fill="none" stroke="#ffc57a" stroke-width="4" stroke-linecap="round"/>`)

// The Daily Rewards button: a check-list with a big green tick.
export const daily = svg(`<g transform="rotate(-10 50 50)" stroke="${O}" stroke-width="3.5" stroke-linejoin="round">
    <rect x="22" y="14" width="56" height="72" rx="5" fill="#fff"/>
    <path d="M22 19a5 5 0 0 1 5-5h46a5 5 0 0 1 5 5v11H22z" fill="#e8343a"/>
    <path d="M30 40h40M30 50h28M30 60h34M30 70h22" stroke="#e7ddd6" stroke-width="3"/>
  </g>
  <path d="M30 56l12 12 28-30" fill="none" stroke="#1d4a0a" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M30 56l12 12 28-30" fill="none" stroke="#5ce23c" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>`)

// A square yellow emoji head with a cheeky grin on a blue shirt.
const face = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${O}" stroke-width="3" stroke-linejoin="round">
  <rect x="2" y="40" width="44" height="10" rx="3" fill="#2f7cff"/>
  <rect x="2" y="2" width="44" height="42" rx="7" fill="#ffd41a"/>
  <path d="M10 15l9 4M38 15l-9 4" stroke-linecap="round"/>
  <rect x="13" y="20" width="5" height="6" rx="1" fill="${O}" stroke="none"/><rect x="30" y="20" width="5" height="6" rx="1" fill="${O}" stroke="none"/>
  <path d="M11 30h26c0 6-6 9-13 9s-13-3-13-9z" fill="#fff"/></g>`
export const friends = svg(`${face(44, 10, 0.9)}${face(10, 32, 1)}`)

const spokes = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return `<path d="M50 50L${(50 + Math.cos(a) * 33).toFixed(1)} ${(50 + Math.sin(a) * 33).toFixed(1)}"/>`
}).join('')
export const wheel = svg(`<circle cx="50" cy="50" r="44" fill="#ffc72a" stroke="${O}" stroke-width="3.5"/>
  <circle cx="50" cy="50" r="34" fill="#de3cc6" stroke="#6e0a5e" stroke-width="2.5"/>
  <path d="M50 50L50 17A33 33 0 0 1 73 26Z" fill="#f064d8"/>
  <g stroke="#ff9ae8" stroke-width="2">${spokes}</g>
  <path d="M50 30c5 6 5 12 0 18-5-6-5-12 0-18z" fill="#ff8a1a" stroke="#a83a00" stroke-width="2"/>
  <circle cx="50" cy="52" r="4" fill="#ffd84a"/>`)

export const chest = svg(`<g stroke="#2a0a3a" stroke-width="3" stroke-linejoin="round">
    <path d="M20 30h60v54H20z" fill="#7424d2"/>
    <path d="M20 30q30-14 60 0v12H20z" fill="#9548f0"/>
    <path d="M12 12l18 12v62H16z" fill="#ffc425"/>
    <path d="M88 12L70 24v62h14z" fill="#ffc425"/>
    <path d="M30 46h40v12H30z" fill="#ffc425"/>
    <circle cx="50" cy="52" r="9" fill="#ffc425"/>
  </g>
  <circle cx="50" cy="51" r="5" fill="#5a18a6"/><circle cx="48" cy="50" r="1.3" fill="#ffc425"/><circle cx="52" cy="50" r="1.3" fill="#ffc425"/>`)

// The Pet window's storage counter: a brown leather backpack.
export const backpack = svg(`<g stroke="${O}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M36 22q0-12 14-12t14 12" fill="none" stroke-width="9"/>
    <path d="M36 22q0-12 14-12t14 12" fill="none" stroke="#a8692a" stroke-width="3.5"/>
    <path d="M14 46q0-24 36-24t36 24v34q0 10-10 10H24q-10 0-10-10z" fill="#c98a3a"/>
    <path d="M14 46q36 14 72 0v8q-36 14-72 0z" fill="#a8692a"/>
    <path d="M28 62h44v20q0 4-4 4H32q-4 0-4-4z" fill="#e0a554"/>
    <rect x="44" y="56" width="12" height="12" rx="2" fill="#ffd23a"/>
  </g>
  <path d="M22 40q8-10 22-12" fill="none" stroke="#f2c47a" stroke-width="4" stroke-linecap="round" opacity=".8"/>`)

export const robux = svg(`<path d="M50 8l36 21v42L50 92 14 71V29z" fill="none" stroke="#000" stroke-width="18" stroke-linejoin="round"/>
  <path d="M50 8l36 21v42L50 92 14 71V29z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>
  <rect x="37" y="37" width="26" height="26" rx="3" fill="#fff" stroke="#000" stroke-width="4"/>`)

export const bee = svg(`<g stroke="#111" stroke-width="2.5" stroke-linejoin="round">
    <ellipse cx="30" cy="30" rx="16" ry="24" transform="rotate(-28 30 30)" fill="#33333d"/>
    <ellipse cx="70" cy="30" rx="16" ry="24" transform="rotate(28 70 30)" fill="#33333d"/>
    <ellipse cx="30" cy="30" rx="9" ry="15" transform="rotate(-28 30 30)" fill="#c99a3c" stroke="none"/>
    <ellipse cx="70" cy="30" rx="9" ry="15" transform="rotate(28 70 30)" fill="#c99a3c" stroke="none"/>
    <ellipse cx="50" cy="66" rx="12" ry="19" fill="#ffcc22"/>
    <path d="M39 61h22M38 69h24M41 77h18" stroke-width="4.5"/>
    <circle cx="50" cy="44" r="10" fill="#2a2a30"/>
    <circle cx="43" cy="40" r="6" fill="#f2f2f2"/><circle cx="57" cy="40" r="6" fill="#f2f2f2"/>
  </g>
  <circle cx="46" cy="46" r="1.8" fill="#ff3030"/><circle cx="54" cy="46" r="1.8" fill="#ff3030"/>`)

export const medallion = svg(`<defs><radialGradient id="hud-copper" cx=".4" cy=".35"><stop offset="0" stop-color="#ffc08a"/><stop offset="1" stop-color="#d9733a"/></radialGradient></defs>
  <circle cx="50" cy="50" r="47" fill="#e98a48" stroke="#5a2408" stroke-width="2.5"/>
  <circle cx="50" cy="50" r="41" fill="url(#hud-copper)" stroke="#a84c1a" stroke-width="2.5" stroke-dasharray="1.5 3"/>
  <path d="M26 58c3-8 11-12 21-11l11-1c2-6 4-12 10-16l4-4 2 4 4 2 2 5-4 1-4-2c-2 6-4 10-6 14 2 6 0 10-4 12l4 8-4 2-4-8c-6 0-12 0-18-1l-6 9-4-2 4-8c-4 0-8 4-12 2 2-2 4-4 4-6z" fill="#b34a1a"/>
  <path d="M60 34c-4 2-8 6-9 10M24 58c-6 0-9 4-10 8" fill="none" stroke="#b34a1a" stroke-width="3" stroke-linecap="round"/>
  <path d="M20 76q6-4 12 0t12 0M58 78q6-4 12 0t10-1M24 30q5-4 10 0" fill="none" stroke="#c4602a" stroke-width="2" stroke-linecap="round"/>`)

export const pet = svg(`<g stroke="#4a2406" stroke-width="3" stroke-linejoin="round">
    <path d="M20 32l4-24 18 14z" fill="#ee8a20"/><path d="M80 32l-4-24-18 14z" fill="#ee8a20"/>
    <rect x="14" y="18" width="72" height="64" rx="12" fill="#f5952a"/>
    <path d="M72 20h2a12 12 0 0 1 12 12v38a12 12 0 0 1-12 12h-2z" fill="#df7a18" stroke="none"/>
    <circle cx="36" cy="48" r="11" fill="#6a3410"/><circle cx="64" cy="48" r="11" fill="#6a3410"/>
    <ellipse cx="50" cy="66" rx="11" ry="8" fill="#ffd39a"/>
    <path d="M46 61h8l-4 4z" fill="#5a2a08"/>
  </g>
  <rect x="22" y="23" width="48" height="6" rx="3" fill="#ffb658"/>
  <circle cx="39" cy="44" r="3.5" fill="#fff"/><circle cx="67" cy="44" r="3.5" fill="#fff"/>
  <path d="M46 69q4 3 8 0" fill="none" stroke="#5a2a08" stroke-width="2" stroke-linecap="round"/>`)

const SKIN = '#f4c69c'
export const coach = svg(`<g stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <path d="M26 98V62c0-14 10-22 24-22s24 8 24 22v36z" fill="${SKIN}"/>
    <path d="M30 56c-12-1-19-10-17-22 1-9 8-14 14-12 5 2 5 8 2 13-2 6 2 10 9 10z" fill="${SKIN}"/>
    <circle cx="22" cy="17" r="8" fill="${SKIN}"/>
    <path d="M70 52c10 3 15 14 13 30h-9c0-10-2-17-6-21z" fill="${SKIN}"/>
    <rect x="28" y="86" width="44" height="12" fill="#1f4fc8"/>
    <circle cx="50" cy="30" r="12" fill="${SKIN}"/>
    <path d="M37 28c0-10 6-16 13-16s13 6 13 16z" fill="#1f4fc8"/>
    <rect x="39" y="27" width="22" height="7" rx="3" fill="#9ae8ff"/>
    <path d="M45 38q5 4 10 0z" fill="#fff" stroke-width="2"/>
  </g>
  <path d="M38 60q12 6 24 0M50 62v20M42 70h16M42 78h16" fill="none" stroke="#c98a5c" stroke-width="2.5" stroke-linecap="round"/>`)

const AWNING = ['#e8303a', '#fff3e6', '#ffc21a', '#e8303a', '#fff3e6']
export const shop = svg(`<g stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <rect x="18" y="36" width="6" height="30" fill="#b86a2a"/><rect x="76" y="36" width="6" height="30" fill="#b86a2a"/>
    ${AWNING.map((c, i) => `<path d="M${10 + i * 16} ${20 - (i === 2 ? 4 : i % 4 ? 3 : 0)}L${26 + i * 16} ${20 - (i === 2 ? 4 : (i + 1) % 4 && i !== 4 ? 3 : 0)}L${26 + i * 16} 38H${10 + i * 16}z" fill="${c}"/>`).join('')}
    ${AWNING.map((c, i) => `<path d="M${10 + i * 16} 38a8 8 0 0 0 16 0z" fill="${c}"/>`).join('')}
    <rect x="16" y="60" width="68" height="28" fill="#ffcf3a"/>
    <rect x="42" y="60" width="13" height="28" fill="#3cc23a"/><rect x="55" y="60" width="13" height="28" fill="#e83a3a"/>
    <rect x="12" y="55" width="76" height="8" rx="2" fill="#e8343a"/>
  </g>`)

export const lion = svg(`<g stroke="${O}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M84 30v10" fill="none"/>
    <ellipse cx="84" cy="54" rx="9" ry="13" fill="#e8202a"/>
    <path d="M77 44h14M77 64h14" stroke="#ffc21a" stroke-width="3"/>
    <path d="M84 67v10" fill="none" stroke="#e8202a" stroke-width="2.5"/>
    <path d="M14 82h22l-3 9H17zM34 86h22l-3 9H37zM54 82h22l-3 9H57z" fill="#ffc21a"/>
    <circle cx="44" cy="46" r="31" fill="#f6efe2"/>
    <circle cx="20" cy="38" r="8" fill="#fff"/><circle cx="68" cy="38" r="8" fill="#fff"/><circle cx="22" cy="62" r="8" fill="#fff"/><circle cx="66" cy="62" r="8" fill="#fff"/>
    <path d="M24 40q20-16 40 0v16q-20 14-40 0z" fill="#e8302a"/>
    <path d="M24 30q20-12 40 0" fill="none" stroke="#ffc21a" stroke-width="5"/>
    <path d="M40 18l4-12 4 12z" fill="#ffc21a"/>
    <circle cx="35" cy="44" r="8" fill="#fff"/><circle cx="53" cy="44" r="8" fill="#fff"/>
    <circle cx="36" cy="45" r="4" fill="#111"/><circle cx="52" cy="45" r="4" fill="#111"/>
    <path d="M32 60q12 14 24 0z" fill="#7a0e0e"/>
  </g>
  <path d="M36 61h16" stroke="#fff" stroke-width="3"/>`)

const dollar = (x, y, deg) => `<text x="${x}" y="${y}" transform="rotate(${deg} ${x} ${y})" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="#3cd23a" stroke="#0e3a06" stroke-width="4" paint-order="stroke">$</text>`
export const trade = svg(`<g stroke="${O}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M14 18h44V7l30 21-30 21V38H14z" fill="#ffd21a"/>
    <path d="M86 62H42V51L12 72l30 21V82h44z" fill="#ffd21a"/>
  </g>
  <path d="M18 22h42M84 66H42" stroke="#ffe878" stroke-width="2.5"/>
  ${dollar(58, 40, 0)}${dollar(46, 84, 20)}`)

export const book = svg(`<g stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <path d="M28 22l54-10 6 60-54 12z" fill="#f2deb0"/>
    <path d="M30 76l54-11M30 80l54-11" fill="none" stroke="#d6bc84" stroke-width="2"/>
    <path d="M14 28l56-12 6 62-56 12z" fill="#8c2a1c"/>
    <path d="M14 28l8-2 6 62-8 2z" fill="#5a160c"/>
    <path d="M60 18l10-2 1 11zM70 66l6 12-10 2zM22 26l10-2-8 10z" fill="#f0b428"/>
    <path d="M38 38l18-4 1 7-11 2 1 5 9-2 1 6-9 2 1 5 11-2 1 7-18 4z" fill="#f0b428"/>
  </g>`)

export const badge = svg(`<path d="M14 2h12l12 12v12L26 38H14L2 26V14z" fill="#ec2230" stroke="#ffd8d8" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="20" y="30" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="27" fill="#fff">!</text>`, '0 0 40 40')

// Fast-forward double arrow on the Skip button: chunky yellow wedges with a shaded lower facet.
const wedge = (x) => `<path d="M${x} 18L${x + 38} 50L${x} 82z" fill="#ffe81a"/><path d="M${x} 50h38L${x} 82z" fill="#e8c200" stroke="none"/>`
export const fastForward = svg(`<g stroke="${O}" stroke-width="4" stroke-linejoin="round">${wedge(10)}${wedge(48)}</g>
  <g fill="none" stroke="${O}" stroke-width="4" stroke-linejoin="round"><path d="M10 18L48 50L10 82zM48 18L86 50L48 82z"/></g>
  <path d="M16 30l18 15M54 30l18 15" stroke="#fff9b0" stroke-width="4" stroke-linecap="round"/>`)

// Lunar red envelope (hongbao) with the gold 福 seal and a tassel.
export const envelope = svg(`<g transform="rotate(-12 50 50)" stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <rect x="22" y="10" width="56" height="76" rx="5" fill="#e3201f"/>
    <path d="M22 15a5 5 0 0 1 5-5h46a5 5 0 0 1 5 5v14q-28 18-56 0z" fill="#c4100f"/>
    <path d="M25 31q25 15 50 0" fill="none" stroke="#ffc21a" stroke-width="3"/>
    <circle cx="50" cy="44" r="13" fill="#ffc21a"/>
    <circle cx="50" cy="44" r="9" fill="#e3201f" stroke="#ffc21a" stroke-width="1.5"/>
    <path d="M26 80l-8 10M26 80l-3 12" stroke="#c4100f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="26" cy="78" r="4" fill="#ffc21a"/>
  </g>
  <text x="50" y="49" transform="rotate(-12 50 50)" text-anchor="middle" font-size="12" font-weight="700" fill="#ffd84a" font-family="serif">福</text>`)

export const sparkle = svg(`<path d="M50 0q6 44 50 50-44 6-50 50-6-44-50-50 44-6 50-50z" fill="#fff"/>`)

export const menu = svg(`<path d="M24 30h52M24 50h52M24 70h52" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`)
export const chat = svg(`<path d="M18 22h64v44H54l-8 10-8-10H18z" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
  <path d="M32 38h36M32 50h24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`)

// A racer's round headshot on the distance bar: blocky Roblox head, optional hair/beard/shades.
export function avatar({ bg = '#fff', skin = '#f2c79a', hair, beard, shades, smirk } = {}) {
  return svg(`<circle cx="50" cy="50" r="50" fill="${bg}"/>
    <rect x="24" y="28" width="52" height="54" rx="20" fill="${skin}"/>
    ${hair ? `<path d="M20 52c-4-26 10-38 30-38s36 12 30 38c-4-10-10-16-14-16-10 6-26 6-36 0-4 0-8 6-10 16z" fill="${hair}"/>` : ''}
    ${beard ? `<path d="M26 60c4 18 14 24 24 24s20-6 24-24c-6 6-14 8-24 8s-18-2-24-8z" fill="${beard}"/>` : ''}
    ${shades
      ? `<rect x="30" y="46" width="17" height="10" rx="4" fill="${shades}"/><rect x="53" y="46" width="17" height="10" rx="4" fill="${shades}"/><path d="M47 50h6" stroke="#222" stroke-width="2"/>`
      : `<ellipse cx="41" cy="51" rx="3" ry="4" fill="#222"/><ellipse cx="59" cy="51" rx="3" ry="4" fill="#222"/>`}
    <path d="${smirk ? 'M40 66q12 6 22-4' : 'M40 64q10 8 20 0'}" fill="none" stroke="#222" stroke-width="3" stroke-linecap="round"/>`)
}

// A round potion bottle (spin wheel boosts): cork, glass, `color` liquid in the lower half.
export const potion = (color) => svg(`<g stroke="${O}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M43 20h14v12c13 4 22 15 22 29 0 17-13 30-29 30S21 78 21 61c0-14 9-25 22-29z" fill="#eef8ff"/>
    <path d="M23 58h54c0 18-12 30-27 30S23 76 23 58z" fill="${color}"/>
    <rect x="39" y="6" width="22" height="15" rx="3" fill="#c98446"/>
  </g>
  <path d="M27 66c3 10 10 16 20 18" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="6" stroke-linecap="round"/>
  <path d="M32 46c-4 4-5 9-5 14" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="58" cy="66" r="3.5" fill="#fff" opacity=".75"/><circle cx="50" cy="74" r="2.2" fill="#fff" opacity=".6"/>
  <path d="M44 10h4" stroke="#f2c48a" stroke-width="3" stroke-linecap="round"/>`)

// The spin wheel's pointer: a red faceted gem pointing down.
export const gem = svg(`<g stroke="#4a060c" stroke-width="3" stroke-linejoin="round">
    <path d="M14 6h36l12 24L32 92 2 30z" fill="#d81a2a"/>
    <path d="M14 6h36l12 24H2z" fill="#ff4a4a"/>
    <path d="M32 30v62L2 30z" fill="#ff2a3a"/>
  </g>
  <path d="M22 6l-8 24M42 6l8 24M22 6l10 24 10-24" fill="none" stroke="#4a060c" stroke-width="2"/>
  <path d="M9 27l8-17" stroke="#ffd0d0" stroke-width="3" stroke-linecap="round"/>`, '0 0 64 96')

// Kayak Shop stats: the yellow lightning (speed) and the flexing strongman (power).
export const bolt = svg(`<path d="M60 4 18 56h26l-10 40 46-56H54z" fill="#ffd21a" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M55 14 28 50" stroke="#fff6a0" stroke-width="4" stroke-linecap="round"/>`)
export const muscle = svg(`<g stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <path d="M22 50c-8-6-12-16-8-24 3-6 10-6 13 0l4 10c5-3 11-4 19-4s14 1 19 4l4-10c3-6 10-6 13 0 4 8 0 18-8 24-3 3-8 4-11 3v6H33v-6c-3 1-8 0-11-3z" fill="#f2c79a"/>
    <path d="M33 59h34l-2 18H35z" fill="#3a6ae8"/>
    <path d="M35 77h30l2 17H33z" fill="#1f3a8a"/>
    <circle cx="50" cy="22" r="13" fill="#f2c79a"/>
    <path d="M37 21c0-9 6-14 13-14s13 5 13 14z" fill="#1f4fc8"/>
    <rect x="39" y="19" width="22" height="6" rx="3" fill="#9ae8ff"/>
  </g>
  <path d="M40 44q10 5 20 0M50 46v10" fill="none" stroke="#c98a5c" stroke-width="2.5" stroke-linecap="round"/>`)
// Kayak Shop cards: the gold padlock over a locked boat and the green check on the equipped one.
export const padlock = svg(`<g stroke="${O}" stroke-width="4" stroke-linejoin="round">
    <path d="M30 44V32a20 20 0 0 1 40 0v12" fill="none" stroke-width="13"/>
    <path d="M30 44V32a20 20 0 0 1 40 0v12" fill="none" stroke="#d8d8de" stroke-width="6"/>
    <rect x="16" y="42" width="68" height="52" rx="9" fill="#ffc21a"/>
    <path d="M50 58a8 8 0 0 0-4 15l-2 10h12l-2-10a8 8 0 0 0-4-15z" fill="#e8283a"/>
  </g>
  <path d="M22 50h18" stroke="#fff3a0" stroke-width="5" stroke-linecap="round"/>`)
export const check = svg(`<path d="M12 52l26 26 50-56" fill="none" stroke="#0d3006" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 52l26 26 50-56" fill="none" stroke="#3ae82a" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`)

// Trails Shop: a glossy comet swoosh in the trail's colours (head `a`, tail `b`; an array of more
// stops for a rainbow), curling from the round head at the top right down to a point at the left.
export function trail(a, b, id) {
  const stops = (Array.isArray(a) ? a : [a, b]).map((c, i, all) => `<stop offset="${i / (all.length - 1)}" stop-color="${c}"/>`).join('')
  return svg(`<defs><linearGradient id="hud-trail-${id}" x1="1" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>
  <path d="M8 88C10 52 34 22 66 12c18-5 30 6 26 22-3 13-17 20-30 16C40 44 20 62 8 88z" fill="url(#hud-trail-${id})" stroke="rgba(0,0,0,.35)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M66 20c10-3 18 1 18 8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75"/>`)
}

// Stamina boost button (hud/staminaBoost.js): a flexed arm gripping a paddle, a lightning bolt
// beside it, on a deep blue disc; and the white pointing hand that taps at it.
export const staminaBoost = svg(`<defs><radialGradient id="hud-sboost" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#3f7bf0"/><stop offset="1" stop-color="#132a6e"/></radialGradient></defs>
  <circle cx="50" cy="50" r="46" fill="url(#hud-sboost)" stroke="${O}" stroke-width="4"/>
  <g stroke="${O}" stroke-width="3" stroke-linejoin="round">
    <path d="M54 6l6-4 36 34-5 5z" fill="#a54c05"/>
    <path d="M60 2c-6-4-16-2-20 4s-2 14 4 18l10-8z" fill="#f08718"/>
    <path d="M20 46l-14 18h11l-5 18 20-24H21l7-12z" fill="#ffd21a"/>
    <path d="M18 84c-3-10 3-20 14-22 3-10 15-14 24-8l5 3 5-18c1-6 7-10 13-8s9 8 7 14l-8 28c-3 10-12 16-23 16H26c-4 0-7-2-8-5z" fill="#f6a54a"/>
    <circle cx="78" cy="30" r="11" fill="#f6a54a"/>
  </g>
  <path d="M36 66c6-6 16-6 20 0M72 26c4-2 8 0 9 3" fill="none" stroke="#ffd29a" stroke-width="3.5" stroke-linecap="round"/>`)
export const pointer = svg(`<path d="M40 8c5 0 8 4 8 9v26c2-2 5-3 8-2 3 1 4 3 5 5 2-2 6-2 8 0 2 1 3 3 3 5 3-1 6 0 8 2 2 2 2 5 2 8v14c0 14-10 25-24 25H52c-9 0-15-4-20-11L18 66c-3-4-2-9 2-11 4-2 8-1 11 2l1 1V17c0-5 3-9 8-9z" fill="#fff" stroke="#111" stroke-width="4" stroke-linejoin="round"/>
  <path d="M48 46v14M61 50v11M74 54v9" stroke="#c8ccd4" stroke-width="3" stroke-linecap="round"/>`)
