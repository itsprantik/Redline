import { getStats } from './storage';

type AudioCtor = typeof AudioContext;

/**
 * Tiny synthesized sound kit: an engine whose pitch follows RPM,
 * plus a few UI blips. No audio files needed.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private running = false;

  private ensure(): AudioContext | null {
    if (!getStats().sound) return null;
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user gesture so the browser allows audio later. */
  unlock(): void {
    this.ensure();
  }

  startEngine(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.running) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const engineGain = ctx.createGain();
    const second = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    filter.type = 'lowpass';
    filter.Q.value = 4;
    engineGain.gain.value = 0;
    second.gain.value = 0.35;
    osc1.connect(filter);
    osc2.connect(second);
    second.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(this.master);
    osc1.start();
    osc2.start();
    this.osc1 = osc1;
    this.osc2 = osc2;
    this.filter = filter;
    this.engineGain = engineGain;
    this.running = true;
    this.setEngine(0.1, 0);
  }

  /** rpm01 and load are both 0..1 */
  setEngine(rpm01: number, load: number): void {
    if (!this.ctx || !this.running || !this.osc1 || !this.osc2 || !this.filter || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const f = 48 + rpm01 * 260;
    this.osc1.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f * 1.5 * 1.004, t, 0.05);
    this.filter.frequency.setTargetAtTime(350 + rpm01 * 1800 + load * 600, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.05 + load * 0.09 + rpm01 * 0.04, t, 0.08);
  }

  stopEngine(): void {
    if (!this.running || !this.ctx || !this.engineGain) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    const o1 = this.osc1;
    const o2 = this.osc2;
    window.setTimeout(() => {
      try {
        o1?.stop();
        o2?.stop();
      } catch {
        /* already stopped */
      }
    }, 400);
    this.running = false;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.engineGain = null;
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  tick(): void {
    this.blip(900 + Math.random() * 120, 0.04, 'square', 0.02);
  }
  error(): void {
    this.blip(140, 0.16, 'sawtooth', 0.08, 70);
  }
  light(): void {
    this.blip(660, 0.12, 'sine', 0.08);
  }
  go(): void {
    this.blip(990, 0.35, 'sine', 0.1);
  }
  radio(): void {
    this.blip(1400, 0.05, 'square', 0.035);
    window.setTimeout(() => this.blip(1100, 0.06, 'square', 0.035), 70);
  }
  finish(): void {
    [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => this.blip(f, 0.22, 'triangle', 0.08), i * 110));
  }
}

export const audio = new AudioEngine();  