import type { AudioSnapshot } from '@/audio/analyser.ts'
import {
  cycleBeats,
  framesFor,
  idlePose,
  lerpPose,
  MOVE_LABEL,
  nextMove,
  sampleFrames,
  type MoveId,
  type Pose,
} from '@/dance/moves.ts'

export type DanceState = {
  move: MoveId
  moveStarted: number
  beats: number
  pose: Pose
  hit: number
  lastTime: number
  sawAudio: boolean
}

export type DanceFrame = {
  pose: Pose
  moveLabel: string | null
  dancing: boolean
  hit: number
}

export function createDance(now: number): DanceState {
  return {
    move: 'bounce',
    moveStarted: now,
    beats: 0,
    pose: idlePose(now),
    hit: 0,
    lastTime: now,
    sawAudio: false,
  }
}

export function stepDance(state: DanceState, audio: AudioSnapshot, now: number): DanceFrame {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000)
  state.lastTime = now
  state.hit = Math.max(0, state.hit - dt * 2.4)

  const drive = clamp((audio.level - 0.045) / 0.22, 0, 1)
  const dancing = audio.active && drive > 0.28

  if (audio.beat && dancing) {
    state.hit = 1
    state.beats += 1
    if (!state.sawAudio || state.beats >= 4) {
      const picked = state.sawAudio
        ? nextMove(state.move, audio.bass, audio.mid, audio.high)
        : 'bounce'
      state.move = picked
      state.moveStarted = now
      state.beats = 0
      state.sawAudio = true
    }
  }

  if (!audio.active) state.sawAudio = false

  const span = audio.interval * cycleBeats(state.move) * 1000
  let phase = ((((now - state.moveStarted) % span) + span) % span) / span
  if (state.move === 'robot') {
    phase = Math.floor(phase * 4) / 4
  }

  const choreo = emphasize(sampleFrames(framesFor(state.move), phase), audio)
  const idle = idlePose(now)
  const target = lerpPose(idle, choreo, dancing ? 0.42 + drive * 0.58 : drive * 0.55)
  const blend = state.move === 'robot' && dancing ? 0.42 : 0.2
  state.pose = lerpPose(state.pose, target, 1 - Math.pow(1 - blend, dt * 60))

  return {
    pose: state.pose,
    moveLabel: dancing ? MOVE_LABEL[state.move] : null,
    dancing,
    hit: state.hit,
  }
}

function emphasize(pose: Pose, audio: AudioSnapshot): Pose {
  const bass = 0.55 + audio.bass * 0.9
  const mid = 0.62 + audio.mid * 0.7
  const high = 0.4 + audio.high * 1.15
  return {
    ...pose,
    crouch: pose.crouch * bass,
    hop: pose.hop * (0.45 + audio.bass * 1.25),
    chest: pose.chest * bass,
    hipX: pose.hipX * (0.7 + audio.bass * 0.45),
    lArm: pose.lArm * mid,
    rArm: pose.rArm * mid,
    lElbow: pose.lElbow * mid,
    rElbow: pose.rElbow * mid,
    headNod: pose.headNod * high,
    headTilt: pose.headTilt * (0.55 + audio.high),
    lWrist: pose.lWrist * high,
    rWrist: pose.rWrist * high,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
