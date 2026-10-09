import type { Pose } from '@/dance/moves.ts'

type Point = { x: number; y: number }

function polar(x: number, y: number, angle: number, length: number): Point {
  return {
    x: x + Math.sin(angle) * length,
    y: y + Math.cos(angle) * length,
  }
}

export function drawStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pose: Pose,
  hit: number,
) {
  ctx.clearRect(0, 0, width, height)

  const backdrop = ctx.createLinearGradient(0, 0, 0, height)
  backdrop.addColorStop(0, '#17141f')
  backdrop.addColorStop(0.55, '#100e16')
  backdrop.addColorStop(1, '#09080c')
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, width, height)

  const unit = Math.min(width, height)
  const cx = width * 0.5
  const ground = height * 0.78
  const spot = ctx.createRadialGradient(cx, ground - unit * 0.22, unit * 0.02, cx, ground - unit * 0.05, unit * 0.48)
  spot.addColorStop(0, `rgba(255, 183, 3, ${0.16 + hit * 0.12})`)
  spot.addColorStop(0.45, 'rgba(255, 77, 109, 0.05)')
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(246, 241, 231, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width * 0.12, ground)
  ctx.lineTo(width * 0.88, ground)
  ctx.stroke()

  const shadow = 1 + pose.crouch * 0.35 - pose.hop * 0.25
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(cx + pose.hipX * unit * 0.04, ground + 6, unit * 0.11 * shadow, unit * 0.018, 0, 0, Math.PI * 2)
  ctx.fill()

  if (hit > 0.02) {
    ctx.strokeStyle = `rgba(255, 183, 3, ${hit * 0.7})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(
      cx,
      ground + 6,
      unit * (0.12 + (1 - hit) * 0.1),
      unit * 0.02,
      0,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  }

  const thigh = unit * 0.145
  const shin = unit * 0.14
  const torso = unit * 0.2
  const upper = unit * 0.115
  const fore = unit * 0.1
  const hand = unit * 0.04
  const foot = unit * 0.038
  const headR = unit * 0.048
  const pop = 1 + hit * 0.035

  const hipX = cx + pose.hipX * unit * 0.07
  const hipY = ground - thigh - shin + pose.crouch * thigh * 0.55 - pose.hop * unit * 0.07

  ctx.save()
  ctx.translate(hipX, hipY)
  ctx.scale(pop, pop)
  ctx.translate(-hipX, -hipY)

  const neck = polar(hipX, hipY, pose.lean + Math.PI, torso)
  const shoulderY = neck.y + unit * 0.03
  const leftShoulder = { x: neck.x - unit * 0.055 + pose.twist * unit * 0.03, y: shoulderY }
  const rightShoulder = { x: neck.x + unit * 0.055 + pose.twist * unit * 0.03, y: shoulderY }

  const leftElbow = polar(leftShoulder.x, leftShoulder.y, pose.lArm, upper)
  const leftHand = polar(leftElbow.x, leftElbow.y, pose.lArm + pose.lElbow, fore)
  const leftFingers = polar(leftHand.x, leftHand.y, pose.lArm + pose.lElbow + pose.lWrist, hand)

  const rightElbow = polar(rightShoulder.x, rightShoulder.y, pose.rArm, upper)
  const rightHand = polar(rightElbow.x, rightElbow.y, pose.rArm + pose.rElbow, fore)
  const rightFingers = polar(rightHand.x, rightHand.y, pose.rArm + pose.rElbow + pose.rWrist, hand)

  const leftKnee = polar(hipX, hipY, pose.lLeg, thigh)
  const leftAnkle = polar(leftKnee.x, leftKnee.y, pose.lLeg + pose.lKnee, shin)
  const leftToe = {
    x: leftAnkle.x - foot,
    y: leftAnkle.y + unit * 0.01,
  }

  const rightKnee = polar(hipX, hipY, pose.rLeg, thigh)
  const rightAnkle = polar(rightKnee.x, rightKnee.y, pose.rLeg + pose.rKnee, shin)
  const rightToe = {
    x: rightAnkle.x + foot,
    y: rightAnkle.y + unit * 0.01,
  }

  const head = {
    x: neck.x + Math.sin(pose.headTilt) * headR * 0.35,
    y: neck.y - headR * 1.15 + pose.headNod * unit * 0.03,
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#f6f1e7'
  ctx.lineWidth = Math.max(3, unit * 0.012)

  strokePath(ctx, [
    [leftToe, leftAnkle, leftKnee, { x: hipX, y: hipY }, rightKnee, rightAnkle, rightToe],
  ])
  strokePath(ctx, [[{ x: hipX, y: hipY }, neck]])
  strokePath(ctx, [[leftShoulder, rightShoulder]])
  strokePath(ctx, [[leftShoulder, leftElbow, leftHand, leftFingers]])
  strokePath(ctx, [[rightShoulder, rightElbow, rightHand, rightFingers]])
  strokePath(ctx, [[neck, { x: head.x, y: head.y + headR * 0.15 }]])

  ctx.beginPath()
  ctx.arc(head.x, head.y, headR, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(head.x - headR * 0.2, head.y - headR * 0.9)
  ctx.lineTo(head.x - headR * 1.15, head.y - headR * 0.55)
  ctx.stroke()

  const joints = [
    neck,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    { x: hipX, y: hipY },
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
  ]
  ctx.fillStyle = '#ffb703'
  for (const joint of joints) {
    ctx.beginPath()
    ctx.arc(joint.x, joint.y, Math.max(2.2, unit * 0.007), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#1a1203'
  const eyeY = head.y - headR * 0.05 + pose.headNod * 2
  const eyeSpread = headR * 0.32
  ctx.beginPath()
  ctx.arc(head.x - eyeSpread, eyeY, headR * 0.08, 0, Math.PI * 2)
  ctx.arc(head.x + eyeSpread, eyeY, headR * 0.08, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function strokePath(ctx: CanvasRenderingContext2D, chains: Point[][]) {
  ctx.beginPath()
  for (const chain of chains) {
    ctx.moveTo(chain[0].x, chain[0].y)
    for (let i = 1; i < chain.length; i++) ctx.lineTo(chain[i].x, chain[i].y)
  }
  ctx.stroke()
}
