// Emote motions (config KAYAK_SHOP.emotes), shared by the seated player (animator.js playEmote:
// torso, head and arms over the seated pose) and the standing figure in the Emotes Shop pictures
// (petPortraits.js emote(): the whole body at the emote's `still` moment). emotePose(id, t, out)
// fills out.{ torso, head, armL, armR, legL, legR } with [x, y, z] radians in character space:
// -X swings a limb forward, armL +Z / armR -Z lift the arms out to the side, the figure facing +Z.
// Arms are absolute (from hanging straight down); torso and head add to the pose underneath.
const s = Math.sin
const pulse = (t, f) => Math.abs(s(t * f))

const MOVES = {
  // A snake wave rolling out along both arms while the body sways.
  slitherin: {
    still: 0.4,
    pose(t, o) {
      const w = s(t * 4)
      o.armL = [-0.25 + 0.25 * s(t * 4 + 1), 0, 1.45 + 0.4 * w]
      o.armR = [-0.25 + 0.25 * s(t * 4 + 2.6), 0, -1.45 + 0.4 * w]
      o.torso = [0, 0.25 * s(t * 2), 0.14 * s(t * 2)]
      o.head = [0, -0.2 * s(t * 2), -0.18 * s(t * 2 + 0.6)]
      o.legL = [0, 0, 0.12 + 0.08 * s(t * 2)]
      o.legR = [0, 0, -0.12 + 0.08 * s(t * 2)]
    },
  },
  // Both fists pumping overhead, head banging.
  hype: {
    still: 0.1,
    pose(t, o) {
      const p = pulse(t, 5)
      o.armL = [-2.75 + 0.55 * p, 0, 0.3]
      o.armR = [-2.75 + 0.55 * pulse(t + 0.1, 5), 0, -0.3]
      o.torso = [-0.08 + 0.08 * p, 0, 0]
      o.head = [-0.25 + 0.3 * p, 0, 0]
      o.legL = [-0.2 * p, 0, 0.1]
      o.legR = [-0.2 * p, 0, -0.1]
    },
  },
  // Right hand up, waving.
  wave: {
    still: 0.15,
    pose(t, o) {
      o.armR = [-0.2, 0, -2.6 + 0.4 * s(t * 10)]
      o.armL = [0.05, 0, 0.12]
      o.torso = [0, 0, 0.06]
      o.head = [0, 0.15, 0.12 + 0.05 * s(t * 5)]
    },
  },
  // Clapping in front of the chest.
  clap: {
    still: 0,
    pose(t, o) {
      const p = pulse(t, 6)
      o.armL = [-1.3, 0, -0.18 + 0.4 * p]
      o.armR = [-1.3, 0, 0.18 - 0.4 * p]
      o.torso = [0.05 * p, 0, 0]
      o.head = [-0.1 + 0.1 * p, 0, 0]
    },
  },
  // Both arms out and up, chest puffed, pulsing.
  flex: {
    still: 0.2,
    pose(t, o) {
      const p = pulse(t, 3)
      o.armL = [-0.15, 0, 2.05 + 0.2 * p]
      o.armR = [-0.15, 0, -2.05 - 0.2 * p]
      o.torso = [-0.12, 0.12 * s(t * 3), 0]
      o.head = [-0.15, -0.2 * s(t * 3), 0]
      o.legL = [0, 0, 0.18]
      o.legR = [0, 0, -0.18]
    },
  },
  // Left arm flung out and up, face buried in the right elbow.
  dab: {
    still: 0.5,
    pose(t, o) {
      const b = 0.06 * s(t * 4)
      o.armL = [-0.5, 0, 2.2 + b]
      o.armR = [-1.9, 0, 1.0 + b]
      o.torso = [0.12, 0.3, -0.12]
      o.head = [0.45, 0.5, 0.2]
    },
  },
  // Stiff 90-degree arm moves on the beat, the head snapping round.
  robot: {
    still: 0.6,
    pose(t, o) {
      const beat = Math.floor(t * 2.5) % 4
      o.armL = [beat % 2 ? -1.57 : 0, 0, beat === 2 ? 1.57 : 0.1]
      o.armR = [beat % 2 ? 0 : -1.57, 0, beat === 0 ? -1.57 : -0.1]
      o.torso = [0, beat < 2 ? 0.25 : -0.25, 0]
      o.head = [0, beat % 2 ? 0.5 : -0.5, 0]
    },
  },
  // Arms swinging side to side together while the hips go the other way.
  floss: {
    still: 0.35,
    pose(t, o) {
      const w = s(t * 6)
      o.armL = [0.35 * s(t * 12), 0, 0.3 + 0.55 * w]
      o.armR = [-0.35 * s(t * 12), 0, -0.3 + 0.55 * w]
      o.torso = [0, 0, -0.12 * w]
      o.head = [0, 0, 0.1 * w]
      o.legL = [0, 0, 0.1 - 0.15 * w]
      o.legR = [0, 0, -0.1 - 0.15 * w]
    },
  },
  // Arms up in a V, shaking with joy.
  cheer: {
    still: 0.05,
    pose(t, o) {
      o.armL = [-0.2, 0, 2.45 + 0.15 * s(t * 14)]
      o.armR = [-0.2, 0, -2.45 - 0.15 * s(t * 14 + 1)]
      o.torso = [-0.1, 0, 0.05 * s(t * 7)]
      o.head = [-0.3, 0, 0.1 * s(t * 7)]
      o.legL = [-0.1 * pulse(t, 7), 0, 0.12]
      o.legR = [-0.1 * pulse(t, 7 + 0.5), 0, -0.12]
    },
  },
}

const ZERO = [0, 0, 0]

// out.{ torso, head, armL, armR, legL, legR } for emote `id` at t s (zeros for parts it leaves alone).
export function emotePose(id, t, out = {}) {
  out.torso = out.head = out.armL = out.armR = out.legL = out.legR = ZERO
  MOVES[id]?.pose(t, out)
  return out
}

// The moment the shop picture freezes (s into the emote).
export const emoteStill = (id) => MOVES[id]?.still ?? 0
