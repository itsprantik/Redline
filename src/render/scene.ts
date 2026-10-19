import type { Race } from '../game/race';
import { MAX_KMH } from '../game/physics';
import { TYRES } from '../data/liveries';
import type { VenueId, Weather } from '../data/venues';
import { Backdrop, KERB, SKY } from './backdrop';
import { drawCar } from './car';
import { drawSmoke, drawSpray, Rain } from './weather';

interface Streak {
  x: number;
  y: number;
  len: number;
  v: number;
}

/** Y of the wheels' contact patch inside a lane, as a fraction of the lane height. */
const GROUND = 0.84;

/**
 * Draws the race: scenery, one lane per car, cars, weather and the lane labels.
 * Everything scrolls with YOUR speed, so typing faster makes the world rush by.
 */
export class Scene {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private readonly h: number;
  private readonly laneH: number;
  private readonly backdrop: Backdrop;
  private readonly rain: Rain;
  private scroll = 0;
  private time = 0;
  private streaks: Streak[] = [];
  private wheels = new Map<string, number>();
  private flaps = new Map<string, number>();

  constructor(
    private canvas: HTMLCanvasElement,
    private lanes: number,
    venue: VenueId,
    weather: Weather,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported in this browser');
    this.ctx = ctx;
    this.laneH = lanes === 1 ? 92 : 58;
    this.backdrop = new Backdrop(venue, lanes, this.laneH);
    this.rain = new Rain(weather);
    this.h = this.backdrop.height;
    this.weather = weather;
    canvas.style.height = `${this.h}px`;
    for (let i = 0; i < 34; i++) this.streaks.push({ x: 0, y: 0, len: 20, v: 1 });
  }

  private readonly weather: Weather;

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(280, Math.floor(rect.width));
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.backdrop.resize(this.w);
    this.rain.resize(this.w, this.h);
    for (const s of this.streaks) this.respawn(s, true);
  }

  render(race: Race, dt: number): void {
    if (this.w === 0) this.resize();
    const c = this.ctx;
    const sp = race.speed.speed;
    this.time += dt;
    this.scroll += sp * dt * 1.5;
    c.clearRect(0, 0, this.w, this.h);

    this.backdrop.draw(c, this.scroll, this.time, this.weather);
    this.drawStartFinish();
    this.drawStreaks(sp, dt);
    this.drawCars(race, dt);
    this.rain.update(dt, sp, SKY + KERB, SKY + KERB + this.lanes * this.laneH);
    this.rain.draw(c, sp);
    this.drawVignette();
  }

  private geom() {
    const g = this.w < 560 ? 34 : 112;
    const s = Math.min(this.laneH / 50, (this.w - g) / 560);
    const startX = g + 10;
    return { g, s, startX, cx0: startX + 87 * s, cx1: this.w - 26 - 87 * s };
  }

  private respawn(s: Streak, anywhere: boolean): void {
    s.x = anywhere ? Math.random() * this.w : this.w + Math.random() * 120;
    s.y = SKY + KERB + 4 + Math.random() * (this.lanes * this.laneH - 8);
    s.len = 18 + Math.random() * 50;
    s.v = 0.7 + Math.random() * 0.7;
  }

  private drawStartFinish(): void {
    const c = this.ctx;
    const { startX } = this.geom();
    const laneArea = this.lanes * this.laneH;
    const top = SKY + KERB;
    // Start line scrolls away as the race begins.
    const x = startX - Math.max(0, this.scroll - 0);
    if (x > -10) {
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fillRect(x, top, 3, laneArea);
    }
    const sq = 7;
    for (let row = 0; row * sq < laneArea; row++) {
      for (let col = 0; col < 2; col++) {
        c.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
        c.fillRect(this.w - 26 - sq * (2 - col) + 14, top + row * sq, sq, Math.min(sq, laneArea - row * sq));
      }
    }
  }

  private drawStreaks(sp: number, dt: number): void {
    const c = this.ctx;
    const f = Math.min(1, sp / MAX_KMH);
    c.save();
    c.lineWidth = 1.5;
    c.lineCap = 'round';
    for (const s of this.streaks) {
      s.x -= (60 + sp * s.v * 3.2) * dt;
      if (s.x + s.len < 0) this.respawn(s, false);
      if (f < 0.05) continue;
      c.strokeStyle = `rgba(255,255,255,${(0.05 + f * 0.28).toFixed(3)})`;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(s.x + s.len * (0.4 + f), s.y);
      c.stroke();
    }
    c.restore();
  }

  private drawCars(race: Race, dt: number): void {
    const c = this.ctx;
    const { g, s, cx0, cx1 } = this.geom();
    const ranking = race.ranking();
    const wet = this.weather === 'wet';

    race.cars.forEach((car, i) => {
      const laneTop = this.backdrop.laneTop(i);
      const mid = laneTop + this.laneH / 2;

      if (car.isPlayer && race.cars.length > 1) {
        c.fillStyle = 'rgba(255,60,60,0.08)';
        c.fillRect(0, laneTop, this.w, this.laneH);
      }

      const cx = cx0 + car.progress * (cx1 - cx0);
      const gy = laneTop + this.laneH * GROUND;

      const wheel = (this.wheels.get(car.id) ?? 0) + car.speed * dt * 0.06;
      this.wheels.set(car.id, wheel);
      const flap = (this.flaps.get(car.id) ?? 0) + ((car.drs ? 1 : 0) - (this.flaps.get(car.id) ?? 0)) * Math.min(1, dt * 9);
      this.flaps.set(car.id, flap);
      const flame = car.speed > 25 ? 0.2 + 0.8 * Math.min(1, car.speed / MAX_KMH) : 0;

      if (wet) drawSpray(c, cx - 50 * s, gy - 4 * s, car.speed, s);
      drawSmoke(c, cx + 48 * s, gy - 4 * s, car.brake, s);

      c.save();
      c.translate(cx, gy);
      c.scale(s, s);
      drawCar(c, car.livery, car.tyre, { wheel, speed: car.speed, drs: flap, brake: car.brake, flame }, { glow: car.isPlayer && race.cars.length > 1 });
      c.restore();

      // Lane label gutter.
      c.fillStyle = 'rgba(6,7,10,0.62)';
      c.fillRect(0, laneTop, g, this.laneH);
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.font = '700 13px "Chakra Petch", system-ui, sans-serif';
      c.fillStyle = car.isPlayer ? '#ffd23f' : '#aab0c2';
      c.fillText(`P${ranking.indexOf(car) + 1}`, 8, mid);
      if (g > 60) {
        c.fillStyle = car.livery.primary;
        c.fillRect(36, mid - 12, 4, 24);
        c.fillStyle = TYRES[car.tyre].color;
        c.beginPath();
        c.arc(g - 12, mid, 3.6, 0, Math.PI * 2);
        c.fill();
        c.font = '600 11px "Chakra Petch", system-ui, sans-serif';
        c.fillStyle = car.isPlayer ? '#ffffff' : '#8e94a8';
        c.fillText(car.name.length > 11 ? car.name.slice(0, 11) : car.name, 46, mid);
      }
    });
  }

  private drawVignette(): void {
    const c = this.ctx;
    const g = c.createLinearGradient(0, 0, this.w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.12, 'rgba(0,0,0,0)');
    g.addColorStop(0.88, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
  }
}