import { useEffect, useRef, useState } from 'react'
import { Listener, describeMicError, type AudioSnapshot } from '@/audio/analyser.ts'
import { Button } from '@/components/ui/button.tsx'
import { createDance, stepDance, type DanceState } from '@/dance/driver.ts'
import type { Pose } from '@/dance/moves.ts'
import { drawStage } from '@/dance/stickman.ts'

type UiState = {
  source: AudioSnapshot['source']
  move: string | null
  dancing: boolean
  bass: number
  mid: number
  high: number
  error: string | null
  pending: string | null
  fileName: string | null
}

const INITIAL: UiState = {
  source: 'idle',
  move: null,
  dancing: false,
  bass: 0,
  mid: 0,
  high: 0,
  error: null,
  pending: null,
  fileName: null,
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const listenerRef = useRef<Listener | null>(null)
  const danceRef = useRef<DanceState | null>(null)
  const fileNameRef = useRef<string | null>(null)
  const [ui, setUi] = useState<UiState>(INITIAL)

  function getListener() {
    listenerRef.current ??= new Listener()
    return listenerRef.current
  }

  useEffect(() => {
    const listener = getListener()
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let raf = 0
    const loop = (now: number) => {
      if (!danceRef.current) danceRef.current = createDance(now)
      const audio = listener.sample(now)
      const danced = stepDance(danceRef.current, audio, now)
      paint(canvas, stage, context, danced.pose, danced.hit)
      frame += 1
      if (frame % 4 === 0) {
        setUi((current) => {
          const next: UiState = {
            source: audio.source,
            move: danced.moveLabel,
            dancing: danced.dancing,
            bass: audio.bass,
            mid: audio.mid,
            high: audio.high,
            error: current.error,
            pending: current.pending,
            fileName: audio.source === 'file' ? fileNameRef.current : null,
          }
          if (
            current.source === next.source &&
            current.move === next.move &&
            current.dancing === next.dancing &&
            current.error === next.error &&
            current.pending === next.pending &&
            current.fileName === next.fileName &&
            Math.abs(current.bass - next.bass) < 0.03 &&
            Math.abs(current.mid - next.mid) < 0.03 &&
            Math.abs(current.high - next.high) < 0.03
          ) {
            return current
          }
          return next
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    return () => getListener().close()
  }, [])

  async function dropBeat() {
    const listener = getListener()
    if (listener.source === 'beat') {
      listener.stop()
      fileNameRef.current = null
      setUi((current) => ({ ...current, error: null, pending: null, fileName: null }))
      return
    }
    setUi((current) => ({ ...current, error: null, pending: 'Counting in…' }))
    try {
      await listener.startBeat()
      fileNameRef.current = null
      setUi((current) => ({ ...current, pending: null, fileName: null }))
    } catch {
      setUi((current) => ({
        ...current,
        pending: null,
        error: 'The beat could not start. Try again.',
      }))
    }
  }

  async function listen() {
    const listener = getListener()
    if (listener.source === 'mic') {
      listener.stop()
      fileNameRef.current = null
      setUi((current) => ({ ...current, error: null, pending: null, fileName: null }))
      return
    }
    setUi((current) => ({ ...current, error: null, pending: 'Asking for the microphone…' }))
    try {
      await listener.startMic()
      fileNameRef.current = null
      setUi((current) => ({ ...current, pending: null, error: null, fileName: null }))
    } catch (error) {
      listener.stop()
      setUi((current) => ({
        ...current,
        pending: null,
        error: describeMicError(error),
      }))
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUi((current) => ({ ...current, error: null, pending: 'Loading track…' }))
    try {
      await getListener().playFile(file)
      fileNameRef.current = file.name
      setUi((current) => ({ ...current, pending: null, error: null, fileName: file.name }))
    } catch {
      getListener().stop()
      fileNameRef.current = null
      setUi((current) => ({
        ...current,
        pending: null,
        fileName: null,
        error: 'That file would not play. Try another audio track.',
      }))
    }
  }

  function stop() {
    getListener().stop()
    fileNameRef.current = null
    setUi((current) => ({ ...current, error: null, pending: null, fileName: null }))
  }

  const status = statusLine(ui)

  return (
    <main className="flex h-svh flex-col">
      <header className="flex shrink-0 items-end justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Live floor
          </p>
          <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
            The Floor
          </h1>
        </div>
        <p className="max-w-56 text-right text-sm text-foreground/70 sm:max-w-xs">{status}</p>
      </header>

      <div
        ref={stageRef}
        className="relative mx-4 mt-4 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 sm:mx-8"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={
            ui.dancing && ui.move
              ? `Stick figure dancing ${ui.move}`
              : 'Stick figure waiting for music'
          }
        />
        <div className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6">
          <p className="text-[11px] tracking-[0.18em] text-foreground/50 uppercase">
            {ui.dancing ? 'Now' : 'Idle'}
          </p>
          <p className="font-display text-5xl leading-none sm:text-6xl">
            {ui.move ?? 'Sway'}
          </p>
        </div>
        {ui.error ? (
          <p className="absolute right-4 bottom-4 left-4 text-sm text-[#ff8fa3] sm:right-auto sm:max-w-md">
            {ui.error}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-wrap gap-2">
          <Button variant={ui.source === 'beat' ? 'default' : 'outline'} onClick={() => void dropBeat()}>
            {ui.source === 'beat' ? 'Stop the beat' : 'Drop a beat'}
          </Button>
          <Button variant={ui.source === 'mic' ? 'default' : 'outline'} onClick={() => void listen()}>
            {ui.source === 'mic' ? 'Stop listening' : 'Listen'}
          </Button>
          <Button variant={ui.source === 'file' ? 'default' : 'outline'} onClick={() => fileRef.current?.click()}>
            Play a track
          </Button>
          {ui.source !== 'idle' ? (
            <Button variant="secondary" onClick={stop}>
              Stop
            </Button>
          ) : null}
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="audio/*"
            aria-label="Choose an audio track"
            onChange={(event) => void onFile(event)}
          />
        </div>
        <div className="flex items-end gap-3" aria-hidden="true">
          <Meter label="Bass" value={ui.bass} />
          <Meter label="Mid" value={ui.mid} />
          <Meter label="High" value={ui.high} />
        </div>
      </footer>
    </main>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  const height = `${Math.round(Math.min(1, value) * 100)}%`
  return (
    <div className="flex w-10 flex-col items-center gap-1">
      <div className="flex h-12 w-1.5 items-end overflow-hidden rounded-full bg-white/10">
        <div className="w-full rounded-full bg-primary" style={{ height }} />
      </div>
      <span className="text-[10px] tracking-wide text-foreground/50 uppercase">{label}</span>
    </div>
  )
}

function statusLine(ui: UiState) {
  if (ui.pending) return ui.pending
  if (ui.source === 'beat') return 'Playing a built-in boom-bap loop.'
  if (ui.source === 'mic') return 'Listening through the microphone.'
  if (ui.source === 'file') return ui.fileName ? `Playing ${ui.fileName}.` : 'Playing a track.'
  return 'No music yet. Drop a beat, open the mic, or play a track.'
}

function paint(
  canvas: HTMLCanvasElement,
  stage: HTMLDivElement,
  context: CanvasRenderingContext2D,
  pose: Pose,
  hit: number,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = stage.clientWidth
  const height = stage.clientHeight
  const pixelWidth = Math.max(1, Math.floor(width * dpr))
  const pixelHeight = Math.max(1, Math.floor(height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  drawStage(context, width, height, pose, hit)
}
