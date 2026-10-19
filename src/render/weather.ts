import type { Weather } from '../data/venues';

interface Drop {
  x: number;
  y: number;
  len: number;
  v: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
}

/** Rain: slanted by the car's speed, with splashes on the tarmac. */
export class Rain {
  private drops: Drop[] = [];
  private ripples: Ripple[] = [];
  private w = 0;
  private h = 0;

  constructor(private readonly weather: Weather) {}

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.drops = [];
    const n = this.weather === 'wet' ? Math.round(Math.min(220, w / 5)) : 0;
    for (let i = 0; i < n; i++) this.drops.push(this.fresh(true));
  }

  private fresh(anywhere: boolean): Drop {
    return {
      x: Math.random() * (this.w + 120),
      y: anywhere ? Math.random() * this.h : -20,
      len: 8 + Math.random() * 14,
      v: 0.8 + Math.random() * 0.5,
    };
  }

  update(dt: number, speed: number, roadTop: number, roadBottom: number): void {
    if (this.weather !== 'wet') return;
    const wind = 90 + speed * 1.1;
    for (const d of this.drops) {
      d.x -= wind * d.v * dt;
      d.y += 620 * d.v * dt;
      if (d.y > this.h || d.x < -30) {
        if (Math.random() < 0.5 && d.y > roadTop) {
          this.ripples.push({ x: d.x, y: roadTop + Math.random() * (roadBottom - roadTop), age: 0 });
        }
        Object.assign(d, this.fresh(false));
      }
    }
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < 0.4).slice(-40);
  }

  draw(c: CanvasRenderingContext2D, speed: number): void {
    if (this.weather !== 'wet') return;
    const slant = (90 + speed * 1.1) / 620;
    c.save();
    c.lineCap = 'round';
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(200,220,255,0.38)';
    c.beginPath();
    for (const d of this.drops) {
      c.moveTo(d.x, d.y);
      c.lineTo(d.x + d.len * slant, d.y - d.len);
    }
    c.stroke();
    c.strokeStyle = 'rgba(220,235,255,0.35)';
    for (const r of this.ripples) {
      const k = r.age / 0.4;
      c.globalAlpha = 1 - k;
      c.beginPath();
      c.ellipse(r.x, r.y, 2 + k * 8, 0.8 + k * 2.2, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }
}

/** Soft mist thrown up behind a wheel. Stateless: jitter gives it life. */
export function drawSpray(c: CanvasRenderingContext2D, x: number, y: number, speed: number, scale: number): void {
  const k = Math.min(1, Math.max(0, (speed - 60) / 220));
  if (k <= 0) return;
  c.save();
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const px = x - (8 + t * 70 * k) * scale + (Math.random() - 0.5) * 6;
    const py = y - (4 + t * 18 * k) * scale + (Math.random() - 0.5) * 5;
    c.fillStyle = `rgba(215,228,245,${(0.2 * (1 - t) * (0.4 + k)).toFixed(3)})`;
    c.beginPath();
    c.arc(px, py, (4 + t * 11) * scale, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Grey smoke from locked front tyres. */
export function drawSmoke(c: CanvasRenderingContext2D, x: number, y: number, amount: number, scale: number): void {
  if (amount <= 0.05) return;
  c.save();
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const px = x - (4 + t * 34) * scale + (Math.random() - 0.5) * 4;
    const py = y - (3 + t * 14) * scale + (Math.random() - 0.5) * 4;
    c.fillStyle = `rgba(230,230,235,${(0.28 * amount * (1 - t)).toFixed(3)})`;
    c.beginPath();
    c.arc(px, py, (3 + t * 8) * scale, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}