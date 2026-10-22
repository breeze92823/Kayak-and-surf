// Timed boosts won on the spin wheel (spinWheel.js): +pct% on 'speed' | 'stamina' | 'win' until
// they run out. Winning one that is still running adds its time on top. stamina.js reads
// mult('speed') and mult('stamina'); mult('win') waits for wins. The HUD's Double Speed button
// (ridePerks.js) runs its own kind, 'double', so it stacks with a wheel speed boost. The HUD chips (hud/spinWheel.js)
// show list(). Real time (keeps counting while the tab is hidden). In memory until net.js saves.
const active = new Map() // kind -> { pct, until (ms, performance.now) }

export const boosts = {
  add(kind, pct, seconds) {
    const now = performance.now()
    const b = active.get(kind)
    const from = b && b.until > now ? b.until : now
    active.set(kind, { pct: Math.max(pct, b && b.until > now ? b.pct : 0), until: from + seconds * 1000 })
  },
  // Seconds left, 0 when off.
  left(kind) {
    const b = active.get(kind)
    return b ? Math.max(0, (b.until - performance.now()) / 1000) : 0
  },
  mult(kind) {
    return boosts.left(kind) > 0 ? 1 + active.get(kind).pct / 100 : 1
  },
  // The running ones: [{ kind, pct, left }].
  list() {
    return [...active.entries()].map(([kind, b]) => ({ kind, pct: b.pct, left: boosts.left(kind) })).filter((b) => b.left > 0)
  },
}
