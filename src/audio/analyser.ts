export type AudioSource = 'idle' | 'beat' | 'mic' | 'file'

export type AudioSnapshot = {
  bass: number
  mid: number
  high: number
  level: number
  beat: boolean
  interval: number
  active: boolean
  source: AudioSource
}

const SILENT: AudioSnapshot = {
  bass: 0,
  mid: 0,
  high: 0,
  level: 0,
  beat: false,
  interval: 60 / 92,
  active: false,
  source: 'idle',
}

type Stoppable = { stop: (when?: number) => void }

export class Listener {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private master: GainNode | null = null
  private freq = new Uint8Array(0)
  private stream: MediaStream | null = null
  private mic: MediaStreamAudioSourceNode | null = null
  private element: HTMLAudioElement | null = null
  private elementSource: MediaElementAudioSourceNode | null = null
  private objectUrl: string | null = null
  private noise: AudioBuffer | null = null
  private timer = 0
  private nextStep = 0
  private stepIndex = 0
  private live: Stoppable[] = []
  private mode: AudioSource = 'idle'
  private op = 0
  private prevBass = 0
  private bassEnv = 0
  private lastBeat = 0
  private interval = 60 / 92

  get source() {
    return this.mode
  }

  private async ensure() {
    if (!this.ctx) {
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.42
      const master = ctx.createGain()
      master.gain.value = 0.85
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -14
      compressor.knee.value = 8
      compressor.ratio.value = 3
      compressor.attack.value = 0.003
      compressor.release.value = 0.12
      master.connect(compressor)
      compressor.connect(ctx.destination)
      this.ctx = ctx
      this.analyser = analyser
      this.master = master
      this.freq = new Uint8Array(analyser.frequencyBinCount)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  private haltSources() {
    if (this.timer) {
      window.clearTimeout(this.timer)
      this.timer = 0
    }
    for (const node of this.live) {
      try {
        node.stop()
      } catch {
        /* already stopped */
      }
    }
    this.live = []
    this.stepIndex = 0

    if (this.element) {
      this.element.pause()
      this.element.removeAttribute('src')
      this.element.load()
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }

    this.mic?.disconnect()
    this.mic = null
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    this.mode = 'idle'
  }

  stop() {
    this.op += 1
    this.haltSources()
  }

  async startBeat() {
    const op = ++this.op
    await this.ensure()
    if (op !== this.op) return
    this.haltSources()
    this.mode = 'beat'
    const ctx = this.ctx!
    this.nextStep = ctx.currentTime + 0.05
    this.schedule()
  }

  async startMic() {
    const op = ++this.op
    await this.ensure()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false },
    })
    if (op !== this.op) {
      for (const track of stream.getTracks()) track.stop()
      return
    }
    this.haltSources()
    const mic = this.ctx!.createMediaStreamSource(stream)
    mic.connect(this.analyser!)
    this.stream = stream
    this.mic = mic
    this.mode = 'mic'
  }

  async playFile(file: File) {
    const op = ++this.op
    await this.ensure()
    if (op !== this.op) return
    this.haltSources()
    const ctx = this.ctx!
    if (!this.element) {
      const element = new Audio()
      element.loop = true
      element.crossOrigin = 'anonymous'
      this.element = element
      this.elementSource = ctx.createMediaElementSource(element)
      this.elementSource.connect(this.analyser!)
      this.elementSource.connect(this.master!)
    }
    this.objectUrl = URL.createObjectURL(file)
    this.element!.src = this.objectUrl
    await this.element!.play()
    if (op !== this.op) {
      this.element!.pause()
      return
    }
    this.mode = 'file'
  }

  close() {
    this.op += 1
    this.haltSources()
    void this.ctx?.close()
    this.ctx = null
    this.analyser = null
    this.master = null
    this.element = null
    this.elementSource = null
    this.noise = null
  }

  sample(now: number): AudioSnapshot {
    if (!this.analyser || !this.ctx || this.mode === 'idle') {
      return { ...SILENT, interval: this.interval }
    }

    this.analyser.getByteFrequencyData(this.freq)
    const nyquist = this.ctx.sampleRate / 2
    const hzPer = nyquist / this.freq.length
    const bass = this.peak(30, 160, hzPer)
    const mid = this.average(180, 1800, hzPer)
    const high = this.average(2000, 8000, hzPer)
    const level = bass * 0.5 + mid * 0.35 + high * 0.15

    this.bassEnv = this.bassEnv * 0.9 + bass * 0.1
    const rising = bass - this.prevBass
    const gap = this.lastBeat ? now - this.lastBeat : Infinity
    const minGap = Math.min(0.45, Math.max(0.22, this.interval * 0.55))
    let beat = false
    if (
      bass > 0.22 &&
      rising > 0.035 &&
      bass > this.bassEnv * 1.12 &&
      gap > minGap
    ) {
      if (this.lastBeat && gap > 0.28 && gap < 1.15) {
        this.interval = clamp(this.interval * 0.55 + gap * 0.45, 0.32, 1)
      }
      this.lastBeat = now
      beat = true
    }
    this.prevBass = bass

    return {
      bass,
      mid,
      high,
      level,
      beat,
      interval: this.interval,
      active: true,
      source: this.mode,
    }
  }

  private peak(lo: number, hi: number, hzPer: number) {
    const i0 = Math.max(1, Math.floor(lo / hzPer))
    const i1 = Math.min(this.freq.length - 1, Math.ceil(hi / hzPer))
    let max = 0
    for (let i = i0; i <= i1; i++) max = Math.max(max, this.freq[i])
    return max / 255
  }

  private average(lo: number, hi: number, hzPer: number) {
    const i0 = Math.max(1, Math.floor(lo / hzPer))
    const i1 = Math.min(this.freq.length - 1, Math.ceil(hi / hzPer))
    if (i1 < i0) return 0
    let sum = 0
    for (let i = i0; i <= i1; i++) sum += this.freq[i]
    return sum / (i1 - i0 + 1) / 255
  }

  private schedule = () => {
    const ctx = this.ctx
    if (!ctx || this.mode !== 'beat') return
    const step = 60 / 92 / 4
    while (this.nextStep < ctx.currentTime + 0.16) {
      const i = this.stepIndex % 16
      if (i === 0 || i === 8 || i === 10) this.kick(this.nextStep)
      if (i === 4 || i === 12) this.snare(this.nextStep)
      if (i % 2 === 0) this.hat(this.nextStep, i % 4 === 0 ? 0.16 : 0.09)
      if (i === 0 || i === 8) this.bassNote(this.nextStep, i === 0 ? 55 : 49)
      this.nextStep += step
      this.stepIndex++
    }
    this.timer = window.setTimeout(this.schedule, 30)
  }

  private bus(node: AudioNode) {
    node.connect(this.analyser!)
    node.connect(this.master!)
  }

  private track(node: Stoppable) {
    this.live.push(node)
    const drop = () => {
      this.live = this.live.filter((item) => item !== node)
    }
    if ('onended' in node) {
      ;(node as OscillatorNode).onended = drop
    }
  }

  private kick(time: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(168, time)
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.09)
    gain.gain.setValueAtTime(1, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32)
    osc.connect(gain)
    this.bus(gain)
    osc.start(time)
    osc.stop(time + 0.34)
    this.track(osc)
  }

  private bassNote(time: number, freq: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)
    gain.gain.setValueAtTime(0.28, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22)
    osc.connect(gain)
    this.bus(gain)
    osc.start(time)
    osc.stop(time + 0.24)
    this.track(osc)
  }

  private snare(time: number) {
    const ctx = this.ctx!
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1400
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.55, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16)
    noise.connect(filter)
    filter.connect(gain)
    this.bus(gain)
    noise.start(time)
    noise.stop(time + 0.18)
    this.track(noise)

    const body = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    body.type = 'triangle'
    body.frequency.setValueAtTime(196, time)
    body.frequency.exponentialRampToValueAtTime(120, time + 0.08)
    bodyGain.gain.setValueAtTime(0.35, time)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    body.connect(bodyGain)
    this.bus(bodyGain)
    body.start(time)
    body.stop(time + 0.12)
    this.track(body)
  }

  private hat(time: number, amount: number) {
    const ctx = this.ctx!
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer()
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 7000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(amount, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045)
    noise.connect(filter)
    filter.connect(gain)
    this.bus(gain)
    noise.start(time)
    noise.stop(time + 0.05)
    this.track(noise)
  }

  private noiseBuffer() {
    if (this.noise && this.ctx) return this.noise
    const ctx = this.ctx!
    const length = Math.floor(ctx.sampleRate * 0.25)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function describeMicError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Microphone is blocked. Drop a beat or play a track instead.'
    }
    if (error.name === 'NotFoundError') {
      return 'No microphone found. Drop a beat or play a track instead.'
    }
  }
  return 'Could not open the microphone. Drop a beat or play a track instead.'
}
