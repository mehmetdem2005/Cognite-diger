// Web Audio API tabanlı ses efektleri — harici dosya gerektirmez

class SoundManager {
  private ctx: AudioContext | null = null

  private get enabled() {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('cognita_sound') !== 'false'
  }

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      return this.ctx
    } catch { return null }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.25,
    delay = 0,
    freqEnd?: number,
  ) {
    if (!this.enabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = type
      const t = ctx.currentTime + delay
      osc.frequency.setValueAtTime(freq, t)
      if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t + duration)
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration)
    } catch {}
  }

  /** Genel buton tıklaması */
  tap() { this.tone(480, 0.07, 'sine', 0.12) }

  /** Başarılı işlem (kitap ekleme, kaydetme) */
  success() {
    this.tone(523, 0.1, 'sine', 0.18)
    this.tone(659, 0.15, 'sine', 0.18, 0.1)
  }

  /** Hata */
  error() { this.tone(220, 0.18, 'sawtooth', 0.14, 0, 180) }

  /** Beğeni */
  like() { this.tone(600, 0.1, 'sine', 0.16, 0, 540) }

  /** Yer imi */
  bookmark() { this.tone(700, 0.08, 'sine', 0.14) }

  /** Takip et */
  follow() {
    this.tone(440, 0.08, 'sine', 0.15)
    this.tone(550, 0.12, 'sine', 0.15, 0.09)
  }

  /** Silme */
  remove() { this.tone(300, 0.12, 'triangle', 0.12, 0, 250) }

  /** Swipe / geçiş */
  swipe() { this.tone(380, 0.06, 'sine', 0.1, 0, 320) }

  /** Bildirim geldi */
  notification() {
    this.tone(880, 0.08, 'sine', 0.2)
    this.tone(1100, 0.12, 'sine', 0.18, 0.09)
  }

  /** Level up */
  levelUp() {
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, 'sine', 0.22, i * 0.13))
  }

  /** Başarım / rozet */
  achievement() {
    ;[523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.2, i * 0.1))
  }

  /** Okuma seansı tamamlandı */
  sessionComplete() {
    ;[440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.2, i * 0.15))
  }
}

export const sounds = new SoundManager()
