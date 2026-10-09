export type Pose = {
  lean: number
  crouch: number
  hop: number
  hipX: number
  chest: number
  twist: number
  headNod: number
  headTilt: number
  lArm: number
  lElbow: number
  lWrist: number
  rArm: number
  rElbow: number
  rWrist: number
  lLeg: number
  lKnee: number
  rLeg: number
  rKnee: number
}

export type MoveId = 'bounce' | 'wave' | 'robot' | 'kick' | 'roll'

export const MOVE_LABEL: Record<MoveId, string> = {
  bounce: 'Bounce',
  wave: 'Wave',
  robot: 'Robot',
  kick: 'Kick-step',
  roll: 'Body roll',
}

const neutral: Pose = {
  lean: 0.02,
  crouch: 0.08,
  hop: 0,
  hipX: 0,
  chest: 0,
  twist: 0,
  headNod: 0,
  headTilt: 0,
  lArm: -0.22,
  lElbow: 0.18,
  lWrist: 0.1,
  rArm: 0.22,
  rElbow: -0.18,
  rWrist: -0.1,
  lLeg: -0.06,
  lKnee: -0.12,
  rLeg: 0.06,
  rKnee: 0.12,
}

export function pose(partial: Partial<Pose>): Pose {
  return { ...neutral, ...partial }
}

const KEYS = Object.keys(neutral) as (keyof Pose)[]

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const next = { ...a }
  for (const key of KEYS) next[key] = a[key] + (b[key] - a[key]) * t
  return next
}

function smooth(t: number) {
  return t * t * (3 - 2 * t)
}

export function sampleFrames(frames: Pose[], phase: number) {
  const span = phase * frames.length
  const index = Math.floor(span) % frames.length
  const next = (index + 1) % frames.length
  const local = smooth(span - Math.floor(span))
  return lerpPose(frames[index], frames[next], local)
}

const bounce: Pose[] = [
  pose({
    crouch: 0.95,
    hop: 0,
    hipX: -0.65,
    chest: 1,
    lean: -0.08,
    headNod: 0.35,
    headTilt: -0.12,
    lArm: -0.55,
    lElbow: 0.7,
    rArm: 0.9,
    rElbow: -0.35,
    lLeg: -0.18,
    lKnee: -0.85,
    rLeg: 0.22,
    rKnee: 0.7,
  }),
  pose({
    crouch: 0.12,
    hop: 1,
    hipX: -0.2,
    chest: 0.05,
    lean: -0.02,
    headNod: -0.25,
    lArm: -0.25,
    lElbow: 0.15,
    rArm: 0.3,
    rElbow: -0.2,
    lLeg: -0.08,
    lKnee: -0.15,
    rLeg: 0.08,
    rKnee: 0.15,
  }),
  pose({
    crouch: 0.95,
    hop: 0,
    hipX: 0.7,
    chest: 1,
    lean: 0.1,
    headNod: 0.4,
    headTilt: 0.14,
    lArm: -0.95,
    lElbow: 0.4,
    rArm: 0.5,
    rElbow: -0.75,
    lLeg: -0.22,
    lKnee: -0.7,
    rLeg: 0.18,
    rKnee: 0.9,
  }),
  pose({
    crouch: 0.16,
    hop: 0.85,
    hipX: 0.15,
    chest: 0.1,
    headNod: -0.2,
    lArm: -0.3,
    rArm: 0.28,
    lLeg: -0.06,
    rLeg: 0.06,
    lKnee: -0.12,
    rKnee: 0.12,
  }),
]

const wave: Pose[] = [
  pose({
    hipX: -0.25,
    crouch: 0.25,
    rArm: 0.35,
    rElbow: -0.2,
    rWrist: -1.1,
    lArm: -0.3,
    lElbow: 0.2,
    headTilt: 0.08,
  }),
  pose({
    hipX: -0.1,
    rArm: 1.15,
    rElbow: -0.15,
    rWrist: 0.8,
    lArm: -0.25,
    chest: 0.2,
  }),
  pose({
    rArm: 2.2,
    rElbow: -0.9,
    rWrist: -0.4,
    chest: 0.55,
    twist: 0.35,
    lean: 0.12,
    headTilt: 0.16,
  }),
  pose({
    lArm: -1.2,
    lElbow: 0.2,
    lWrist: 0.7,
    rArm: 2.5,
    rElbow: -0.3,
    chest: 0.7,
    twist: 0.05,
    lean: 0.02,
  }),
  pose({
    lArm: -2.15,
    lElbow: 0.85,
    lWrist: -0.6,
    rArm: 0.4,
    rElbow: -0.2,
    chest: 0.4,
    twist: -0.3,
    lean: -0.12,
    hipX: 0.2,
  }),
  pose({
    lArm: -0.4,
    lElbow: 0.25,
    lWrist: 0.2,
    rArm: 0.3,
    hipX: 0.35,
    crouch: 0.3,
    headNod: 0.2,
  }),
]

const robot: Pose[] = [
  pose({
    lArm: -1.55,
    lElbow: 0,
    rArm: 1.55,
    rElbow: 0,
    lWrist: 0,
    rWrist: 0,
    headTilt: 0.28,
    lean: 0,
    crouch: 0.2,
    chest: 0.3,
  }),
  pose({
    lArm: -2.7,
    lElbow: 0.05,
    rArm: 0.15,
    rElbow: 0,
    headTilt: -0.32,
    hipX: 0.45,
    lean: 0.16,
    crouch: 0.05,
    lLeg: -0.1,
    rLeg: 0.35,
    rKnee: 0.2,
  }),
  pose({
    lArm: -0.9,
    lElbow: 1.45,
    rArm: 0.9,
    rElbow: -1.45,
    lWrist: 0.4,
    rWrist: -0.4,
    chest: 1,
    headNod: 0.15,
    headTilt: 0,
    crouch: 0.35,
  }),
  pose({
    lArm: -0.2,
    lElbow: 0.1,
    rArm: 2.6,
    rElbow: -0.1,
    headTilt: 0.22,
    lean: -0.18,
    hipX: -0.4,
    lLeg: -0.9,
    lKnee: -0.35,
    rLeg: 0.12,
    rKnee: 0.45,
    crouch: 0.4,
    hop: 0.35,
  }),
]

const kick: Pose[] = [
  pose({
    lLeg: -1.25,
    lKnee: -0.25,
    rLeg: 0.18,
    rKnee: 0.85,
    crouch: 0.45,
    hop: 0.25,
    hipX: -0.45,
    lean: -0.14,
    lArm: -2.1,
    lElbow: 0.45,
    rArm: 0.35,
    rElbow: -0.9,
    headTilt: -0.1,
    chest: 0.4,
  }),
  pose({
    crouch: 0.7,
    hop: 0,
    hipX: -0.1,
    chest: 0.8,
    lArm: -0.5,
    rArm: 0.55,
    lLeg: -0.12,
    lKnee: -0.55,
    rLeg: 0.12,
    rKnee: 0.55,
    headNod: 0.25,
  }),
  pose({
    rLeg: 1.25,
    rKnee: 0.25,
    lLeg: -0.18,
    lKnee: -0.85,
    crouch: 0.45,
    hop: 0.25,
    hipX: 0.5,
    lean: 0.16,
    rArm: 2.1,
    rElbow: -0.45,
    lArm: -0.35,
    lElbow: 0.9,
    headTilt: 0.12,
    chest: 0.4,
  }),
  pose({
    crouch: 0.55,
    hipX: 0.1,
    hop: 0.15,
    lArm: -0.7,
    lElbow: 0.8,
    rArm: 0.7,
    rElbow: -0.8,
    chest: 0.35,
    headNod: -0.1,
    lLeg: -0.1,
    rLeg: 0.1,
    lKnee: -0.4,
    rKnee: 0.4,
  }),
]

const roll: Pose[] = [
  pose({
    lean: -0.22,
    hipX: -0.55,
    twist: 0.55,
    chest: 0.15,
    crouch: 0.35,
    headTilt: -0.2,
    lArm: -0.45,
    rArm: 0.7,
    lElbow: 0.3,
    rElbow: -0.45,
  }),
  pose({
    lean: -0.05,
    hipX: -0.2,
    twist: 0.15,
    chest: 0.85,
    crouch: 0.5,
    headNod: 0.35,
    headTilt: -0.05,
    lArm: -0.3,
    rArm: 0.35,
  }),
  pose({
    lean: 0.2,
    hipX: 0.45,
    twist: -0.5,
    chest: 0.25,
    crouch: 0.3,
    headTilt: 0.22,
    lArm: -0.75,
    rArm: 0.4,
    lElbow: 0.5,
  }),
  pose({
    lean: 0.02,
    hipX: 0.1,
    twist: -0.1,
    chest: 0.2,
    crouch: 0.2,
    hop: 0.45,
    headNod: -0.3,
    lArm: -0.4,
    rArm: 0.4,
    lElbow: 0.6,
    rElbow: -0.6,
  }),
]

const idle: Pose[] = [
  pose({
    hipX: -0.28,
    lean: -0.05,
    headTilt: -0.08,
    lArm: -0.28,
    rArm: 0.38,
    crouch: 0.12,
  }),
  pose({
    hipX: 0.28,
    lean: 0.05,
    headTilt: 0.08,
    lArm: -0.4,
    rArm: 0.26,
    crouch: 0.18,
    headNod: 0.08,
  }),
]

const MOVES: Record<MoveId, Pose[]> = {
  bounce,
  wave,
  robot,
  kick,
  roll,
}

export function cycleBeats(move: MoveId) {
  if (move === 'wave' || move === 'roll') return 4
  return 2
}

export function framesFor(move: MoveId) {
  return MOVES[move]
}

export function idlePose(now: number) {
  const phase = (now / 2400) % 1
  return sampleFrames(idle, phase)
}

export function nextMove(current: MoveId, bass: number, mid: number, high: number): MoveId {
  if (high > bass && high > mid && high > 0.18) {
    return current === 'robot' ? 'bounce' : 'robot'
  }
  if (mid > bass * 1.05 && mid >= high) {
    return current === 'wave' ? 'roll' : 'wave'
  }
  if (current === 'bounce') return 'kick'
  if (current === 'kick') return 'bounce'
  return bass >= mid ? 'bounce' : 'wave'
}
