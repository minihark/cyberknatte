// Web Audio API Cyberpunk Sound Engine + Pre-generated Neural Swedish/English Voice Player

export type Language = 'sv' | 'en';

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private bgmInterval: number | null = null;
  private bgmPlaying: boolean = false;
  private bgmStyle: number = 0;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopVoice();
      this.stopBgm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stopVoice() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public speak(text: string, lang: Language = 'sv', clipId?: string, onEnd?: () => void) {
    if (this.isMuted) {
      onEnd?.();
      return;
    }

    this.stopVoice();

    if (clipId) {
      const audio = new Audio(`/audio/voices/${clipId}.mp3`);
      audio.volume = 1.0;
      this.currentAudio = audio;
      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onEnd?.();
      };
      audio.onerror = () => {
        this.speakFallback(text, lang, onEnd);
      };
      audio.play().catch(() => {
        this.speakFallback(text, lang, onEnd);
      });
      return;
    }

    this.speakFallback(text, lang, onEnd);
  }

  private speakFallback(text: string, lang: Language, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === 'sv' ? 'sv-SE' : 'en-US';
      utter.rate = 0.96;
      utter.pitch = 1.06;
      utter.onend = () => onEnd?.();
      window.speechSynthesis.speak(utter);
    } catch {
      onEnd?.();
    }
  }

  // Cute Bulten droid chirp (expressive R2/Glottis style)
  public playDroidChirp(happy: boolean = true) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = happy ? [520, 780, 1040, 880, 1180] : [420, 310, 240];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      osc.frequency.exponentialRampToValueAtTime(freq * (happy ? 1.12 : 0.88), now + idx * 0.055 + 0.05);

      gain.gain.setValueAtTime(0.12, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.055 + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.06);
    });
  }

  // Tap footstep / cyber target ping
  public playTapPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.09);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  // Inventory item pickup fanfare
  public playItemPickup() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.16, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.3);
    });
  }

  // Power Core unlocked grand synthwave fanfare
  public playCoreUnlocked() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now + i * 0.08);

      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.14, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.48);
    });
  }

  // Full Throttle style Hover-Bike revving / turbo boost sound
  public playHoverRev() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'square';

    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.7);

    sub.frequency.setValueAtTime(42.5, now);
    sub.frequency.exponentialRampToValueAtTime(120, now + 0.35);
    sub.frequency.exponentialRampToValueAtTime(65, now + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.7);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.78);
    sub.stop(now + 0.78);
  }

  // Magnetic Crane / Laser Wrench zap
  public playLaserZap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Silly / Wrong combination boing
  public playSillyBoing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.12);
    osc.frequency.linearRampToValueAtTime(360, now + 0.24);
    osc.frequency.linearRampToValueAtTime(220, now + 0.36);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Scanner pulse effect
  public playScannerPulse() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.35);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Jukebox synthwave loop toggle
  public cycleJukebox(): boolean {
    if (this.bgmPlaying) {
      this.bgmStyle = (this.bgmStyle + 1) % 3;
      if (this.bgmStyle === 0) {
        this.stopBgm();
        return false;
      }
      return true;
    } else {
      this.bgmStyle = 1;
      this.startBgm();
      return true;
    }
  }

  public startBgm() {
    if (this.isMuted || this.bgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;
    this.bgmPlaying = true;
    let step = 0;
    const groove1 = [220, 261.63, 329.63, 392.0, 329.63, 261.63, 293.66, 349.23];
    const groove2 = [196, 246.94, 293.66, 392.0, 440.0, 392.0, 293.66, 246.94];

    this.bgmInterval = window.setInterval(() => {
      if (this.isMuted || !this.bgmPlaying) return;
      const c = this.getContext();
      if (!c) return;
      const now = c.currentTime;
      const notes = this.bgmStyle === 2 ? groove2 : groove1;
      const freq = notes[step % notes.length];
      step++;

      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }, 260);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const cyberAudio = new CyberAudioEngine();
