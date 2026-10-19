import type { Livery, Tyre } from '../data/liveries';
import type { VenueId, Weather } from '../data/venues';
import { Backdrop, KERB, SKY } from './backdrop';
import { drawCar } from './car';
import { drawSpray, Rain } from './weather';

export interface ShowcaseConfig {
  livery: Livery;
  tyre: Tyre;
  venue: VenueId;
  weather: Weather;
}

/**
 * A live preview of one car on a circuit: used as the menu hero and as the
 * preview in race setup, so every choice is visible straight away.
 */
export class Showcase {
  private ctx: CanvasRenderingContext2D;
  private backdrop: Backdrop;
  private rain: Rain;
  private w = 0;
  private raf = 0;
  private last = 0;
  private time = 0;
  private scroll = 0;
  private wheel = 0;
  private flap = 0;
  private resizeObs: ResizeObserver | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private cfg: ShowcaseConfig,
    private readonly height: number,
    private readonly cruise = 170,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser');
    this.ctx = ctx;
    this.backdrop = this.makeBackdrop();
    this.rain = new Rain(cfg.weather);
    canvas.style.height = `${this.backdrop.height}px`;
  }

  private makeBackdrop(): Backdrop {
    const laneH = Math.max(60, this.height - SKY - KERB * 2 - 4);
    return new Backdrop(this.cfg.venue, 1, laneH);
  }

  set(cfg: Partial<ShowcaseConfig>): void {
    const venueChanged = cfg.venue !== undefined && cfg.venue !== this.cfg.venue;
    const weatherChanged = cfg.weather !== undefined && cfg.weather !== this.cfg.weather;
    this.cfg = { ...this.cfg, ...cfg };
    if (venueChanged) {
      this.backdrop = this.makeBackdrop();
      this.backdrop.resize(this.w);
    }
    if (weatherChanged) {
      this.rain = new Rain(this.cfg.weather);
      this.rain.resize(this.w, this.backdrop.height);
    }
  }

  start(): void {
    this.resize();
    if ('ResizeObserver' in window) {
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.canvas);
    }
    this.last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(260, Math.floor(rect.width));
    const h = this.backdrop.height;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.backdrop.resize(this.w);
    this.rain.resize(this.w, h);
  }

  private frame(dt: number): void {
    if (this.w === 0) return;
    const c = this.ctx;
    this.time += dt;
    // Gentle surge so the car feels alive.
    const speed = this.cruise + Math.sin(this.time * 0.8) * 18;
    this.scroll += speed * dt * 1.5;
    this.wheel += speed * dt * 0.06;
    const drsTarget = Math.sin(this.time * 0.55) > 0.55 ? 1 : 0;
    this.flap += (drsTarget - this.flap) * Math.min(1, dt * 8);

    const h = this.backdrop.height;
    c.clearRect(0, 0, this.w, h);
    this.backdrop.draw(c, this.scroll, this.time, this.cfg.weather);

    // Speed streaks.
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.13)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const y = SKY + KERB + 6 + ((i * 53) % Math.max(20, this.backdrop.laneH - 12));
      const x = this.w - (((this.scroll * (1.4 + (i % 3) * 0.5) + i * 197) % (this.w + 120)) - 60);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 40 + (i % 4) * 14, y);
      c.stroke();
    }
    c.restore();

    const laneH = this.backdrop.laneH;
    const s = Math.min(laneH / 44, this.w / 330, 2.4);
    const cx = this.w * 0.5;
    const gy = this.backdrop.laneTop(0) + laneH * 0.86 + Math.sin(this.time * 9) * 0.25;
    if (this.cfg.weather === 'wet') drawSpray(c, cx - 50 * s, gy - 4 * s, speed, s);
    c.save();
    c.translate(cx, gy);
    c.scale(s, s);
    drawCar(c, this.cfg.livery, this.cfg.tyre, { wheel: this.wheel, speed, drs: this.flap, brake: 0, flame: 0.55 }, { glow: true });
    c.restore();

    this.rain.update(dt, speed, SKY + KERB, SKY + KERB + laneH);
    this.rain.draw(c, speed);

    const v = c.createLinearGradient(0, 0, this.w, 0);
    v.addColorStop(0, 'rgba(0,0,0,0.4)');
    v.addColorStop(0.15, 'rgba(0,0,0,0)');
    v.addColorStop(0.85, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = v;
    c.fillRect(0, 0, this.w, h);
  }
}