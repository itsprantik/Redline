import { getVenue, type VenueId, type Weather } from '../data/venues';
import { venueSprite } from './sprites';

/** Height of the scenery above the barrier line. */
export const SKY = 112;
/** Height of the advertising hoardings along the wall. */
export const WALL = 17;
export const KERB = 7;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Building {
  x: number;
  w: number;
  h: number;
  antenna: boolean;
  seed: number;
}
interface Stand {
  x: number;
  w: number;
  h: number;
  seed: number;
}
interface Tree {
  x: number;
  h: number;
  seed: number;
}
interface Cloud {
  x: number;
  y: number;
  s: number;
}
interface Tower {
  x: number;
  h: number;
}

const BRANDS: { text: string; bg: string; fg: string }[] = [
  { text: 'APEX', bg: '#e10600', fg: '#ffffff' },
  { text: 'VOLT', bg: '#ffd400', fg: '#14151a' },
  { text: 'NOVA OIL', bg: '#0b6bff', fg: '#ffffff' },
  { text: 'TURBO', bg: '#14151a', fg: '#ff7a00' },
  { text: 'HELIX', bg: '#f4f4f6', fg: '#14151a' },
  { text: 'KINETIC', bg: '#00a98f', fg: '#ffffff' },
  { text: 'ORBIT', bg: '#6a2bdc', fg: '#ffffff' },
  { text: 'FLUX', bg: '#ff3d7f', fg: '#ffffff' },
];
const PANEL = 100;
const CROWD = ['#ff5a5a', '#ffd60a', '#4fd1ff', '#f2f2f7', '#7cf29a', '#ff9f43'];

/**
 * Everything behind and under the cars: sky, parallax scenery, barrier with
 * hoardings, kerbs and tarmac. It scrolls with the player's speed.
 */
export class Backdrop {
  private w = 0;
  private readonly far: Building[] = [];
  private readonly near: Building[] = [];
  private readonly stands: Stand[] = [];
  private readonly trees: Tree[] = [];
  private readonly peaks: { x: number; h: number; w: number }[] = [];
  private readonly clouds: Cloud[] = [];
  private readonly towers: Tower[] = [];
  private readonly stars: { x: number; y: number; r: number }[] = [];
  private readonly period = 1800;

  constructor(
    readonly venue: VenueId,
    readonly lanes: number,
    readonly laneH: number,
  ) {
    const r = rng(venue.length * 977 + 13);
    let x = 0;
    while (x < this.period) {
      const w = 28 + r() * 44;
      this.far.push({ x, w, h: 26 + r() * 40, antenna: r() < 0.2, seed: Math.floor(r() * 1e6) });
      x += w + 2 + r() * 6;
    }
    x = 0;
    while (x < this.period) {
      const w = 26 + r() * 40;
      this.near.push({ x, w, h: 18 + r() * 30, antenna: r() < 0.1, seed: Math.floor(r() * 1e6) });
      x += w + 6 + r() * 20;
    }
    x = 0;
    while (x < this.period) {
      const w = 90 + r() * 120;
      this.stands.push({ x, w, h: 16 + r() * 16, seed: Math.floor(r() * 1e6) });
      x += w + 20 + r() * 80;
    }
    x = 0;
    while (x < this.period) {
      this.trees.push({ x, h: 22 + r() * 22, seed: Math.floor(r() * 1e6) });
      x += 16 + r() * 34;
    }
    x = 0;
    while (x < this.period) {
      const w = 120 + r() * 160;
      this.peaks.push({ x, h: 28 + r() * 40, w });
      x += w * 0.7;
    }
    for (let i = 0; i < 7; i++) this.clouds.push({ x: (i / 7) * this.period, y: 8 + r() * 34, s: 0.7 + r() * 0.9 });
    for (let i = 0; i < 5; i++) this.towers.push({ x: (i / 5) * this.period + r() * 120, h: 52 + r() * 12 });
    for (let i = 0; i < 60; i++) this.stars.push({ x: r(), y: r() * 0.7, r: 0.3 + r() * 1.1 });
  }

  get height(): number {
    return SKY + KERB * 2 + this.lanes * this.laneH + 4;
  }

  laneTop(i: number): number {
    return SKY + KERB + i * this.laneH;
  }

  resize(w: number): void {
    this.w = w;
  }

  /** Calls draw for each repeat of a layer that is visible. `x` is in layer space. */
  private tiles(scroll: number, factor: number, draw: (offset: number) => void): void {
    const off = (scroll * factor) % this.period;
    const reps = Math.ceil(this.w / this.period) + 1;
    for (let rep = -1; rep < reps; rep++) draw(rep * this.period - off);
  }

  draw(c: CanvasRenderingContext2D, scroll: number, time: number, weather: Weather): void {
    this.drawSky(c, time, weather);
    if (this.drawVenueImage(c, scroll)) {
      this.drawWall(c, scroll, time);
      this.drawRoad(c, scroll, weather);
      return;
    }
    switch (this.venue) {
      case 'dusk':
        this.drawHills(c, scroll, 0.04, '#2a1738', 30, 0.9);
        this.drawStands(c, scroll, 0.3, '#1c1626', 0.75);
        this.drawTowers(c, scroll, 0.3, false);
        break;
      case 'night':
        this.drawSkyline(c, scroll, this.far, 0.05, '#0a1230', 0.18, time);
        this.drawSkyline(c, scroll, this.near, 0.12, '#060a1c', 0.55, time);
        this.drawStands(c, scroll, 0.3, '#0c0f1c', 0.45);
        this.drawTowers(c, scroll, 0.3, true);
        break;
      case 'day':
        this.drawClouds(c, scroll, time, 1);
        this.drawDunes(c, scroll);
        this.drawStands(c, scroll, 0.3, '#8c93a3', 1);
        this.drawPalms(c, scroll);
        break;
      case 'alpine':
        this.drawClouds(c, scroll, time, 0.65);
        this.drawPeaks(c, scroll);
        this.drawPines(c, scroll, 0.2, '#16352c', 1);
        this.drawStands(c, scroll, 0.3, '#5a4a3c', 0.9);
        this.drawPines(c, scroll, 0.34, '#0f2a22', 0.8);
        break;
    }
    this.drawWall(c, scroll, time);
    this.drawRoad(c, scroll, weather);
  }

  /** Draws the player's own scenery image (if one exists for this circuit) as a slowly scrolling strip. */
  private drawVenueImage(c: CanvasRenderingContext2D, scroll: number): boolean {
    const img = venueSprite(this.venue);
    if (!img) return false;
    const k = SKY / img.height;
    const w = img.width * k;
    let x = -((scroll * 0.08) % w);
    for (; x < this.w; x += w) c.drawImage(img, x, 0, w + 1, SKY);
    return true;
  }

  /* ---------- sky ---------- */

  private drawSky(c: CanvasRenderingContext2D, time: number, weather: Weather): void {
    const w = this.w;
    const g = c.createLinearGradient(0, 0, 0, SKY);
    const stops: Record<VenueId, [number, string][]> = {
      dusk: [[0, '#090c22'], [0.45, '#2c1b4d'], [0.78, '#a3405b'], [1, '#ffa05f']],
      night: [[0, '#01020a'], [0.6, '#0a1233'], [1, '#18214d']],
      day: [[0, '#2c86f5'], [0.6, '#8fd0ff'], [1, '#e6f5ff']],
      alpine: [[0, '#56687d'], [0.6, '#a6b5c4'], [1, '#dfe6ec']],
    };
    for (const [o, col] of stops[this.venue]) g.addColorStop(o, col);
    c.fillStyle = g;
    c.fillRect(0, 0, w, SKY);

    if (this.venue === 'dusk') {
      const sx = w * 0.7;
      const glow = c.createRadialGradient(sx, SKY - 14, 2, sx, SKY - 14, 110);
      glow.addColorStop(0, 'rgba(255,200,120,0.75)');
      glow.addColorStop(1, 'rgba(255,120,80,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, w, SKY);
      c.fillStyle = '#ffe0aa';
      c.beginPath();
      c.arc(sx, SKY - 14, 17, 0, Math.PI * 2);
      c.fill();
    }
    if (this.venue === 'dusk' || this.venue === 'night') {
      c.fillStyle = '#ffffff';
      for (const s of this.stars) {
        c.globalAlpha = (this.venue === 'night' ? 0.4 : 0.22) + 0.3 * Math.sin(time * 2 + s.x * 40);
        c.beginPath();
        c.arc(s.x * w, s.y * SKY * 0.7, s.r, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    if (this.venue === 'night') {
      const mx = w * 0.82;
      const glow = c.createRadialGradient(mx, 26, 2, mx, 26, 60);
      glow.addColorStop(0, 'rgba(200,220,255,0.5)');
      glow.addColorStop(1, 'rgba(200,220,255,0)');
      c.fillStyle = glow;
      c.fillRect(mx - 70, 0, 140, 90);
      c.fillStyle = '#e8f0ff';
      c.beginPath();
      c.arc(mx, 26, 8, 0, Math.PI * 2);
      c.fill();
    }
    if (this.venue === 'day') {
      const sx = w * 0.18;
      const glow = c.createRadialGradient(sx, 18, 2, sx, 18, 90);
      glow.addColorStop(0, 'rgba(255,250,220,0.95)');
      glow.addColorStop(1, 'rgba(255,250,220,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, w, SKY);
    }
    if (weather === 'wet') {
      c.fillStyle = 'rgba(20,26,40,0.42)';
      c.fillRect(0, 0, w, SKY);
    }
  }

  private drawClouds(c: CanvasRenderingContext2D, scroll: number, time: number, alpha: number): void {
    c.fillStyle = `rgba(255,255,255,${(0.7 * alpha).toFixed(2)})`;
    this.tiles(scroll + time * 14, 0.02, (off) => {
      for (const cl of this.clouds) {
        const x = cl.x + off;
        c.beginPath();
        c.ellipse(x, cl.y, 46 * cl.s, 9 * cl.s, 0, 0, Math.PI * 2);
        c.ellipse(x - 26 * cl.s, cl.y + 3, 28 * cl.s, 7 * cl.s, 0, 0, Math.PI * 2);
        c.ellipse(x + 28 * cl.s, cl.y + 2, 32 * cl.s, 7 * cl.s, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  /* ---------- far layers ---------- */

  private drawHills(c: CanvasRenderingContext2D, scroll: number, factor: number, color: string, amp: number, alpha: number): void {
    c.fillStyle = color;
    c.globalAlpha = alpha;
    const off = scroll * factor;
    c.beginPath();
    c.moveTo(0, SKY);
    for (let x = 0; x <= this.w; x += 6) {
      const u = x + off;
      const y = SKY - 14 - amp * (0.5 + 0.28 * Math.sin(u * 0.012) + 0.18 * Math.sin(u * 0.031 + 1.7) + 0.08 * Math.sin(u * 0.07));
      c.lineTo(x, y);
    }
    c.lineTo(this.w, SKY);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  private drawDunes(c: CanvasRenderingContext2D, scroll: number): void {
    this.drawHills(c, scroll, 0.03, '#d6a56d', 34, 1);
    this.drawHills(c, scroll, 0.07, '#c58b57', 24, 1);
    const haze = c.createLinearGradient(0, SKY - 30, 0, SKY);
    haze.addColorStop(0, 'rgba(255,240,210,0)');
    haze.addColorStop(1, 'rgba(255,240,210,0.45)');
    c.fillStyle = haze;
    c.fillRect(0, SKY - 30, this.w, 30);
  }

  private drawPeaks(c: CanvasRenderingContext2D, scroll: number): void {
    const draw = (factor: number, col: string, snow: string, scale: number) => {
      this.tiles(scroll, factor, (off) => {
        for (const p of this.peaks) {
          const x = p.x + off;
          if (x > this.w + p.w || x + p.w < 0) continue;
          const h = p.h * scale + 20;
          const top = SKY - 8 - h;
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(x - p.w * 0.5, SKY);
          c.lineTo(x - p.w * 0.08, top + 6);
          c.lineTo(x, top);
          c.lineTo(x + p.w * 0.12, top + 8);
          c.lineTo(x + p.w * 0.5, SKY);
          c.closePath();
          c.fill();
          c.fillStyle = snow;
          c.beginPath();
          c.moveTo(x - p.w * 0.1, top + 11);
          c.lineTo(x - p.w * 0.08, top + 6);
          c.lineTo(x, top);
          c.lineTo(x + p.w * 0.12, top + 8);
          c.lineTo(x + p.w * 0.07, top + 15);
          c.lineTo(x + p.w * 0.02, top + 10);
          c.lineTo(x - p.w * 0.03, top + 16);
          c.closePath();
          c.fill();
        }
      });
    };
    draw(0.03, '#6f7f93', '#e9eef4', 1);
    draw(0.07, '#566679', '#d4dce6', 0.7);
    const mist = c.createLinearGradient(0, SKY - 40, 0, SKY);
    mist.addColorStop(0, 'rgba(223,230,236,0)');
    mist.addColorStop(1, 'rgba(223,230,236,0.7)');
    c.fillStyle = mist;
    c.fillRect(0, SKY - 40, this.w, 40);
  }

  private drawSkyline(
    c: CanvasRenderingContext2D,
    scroll: number,
    list: Building[],
    factor: number,
    color: string,
    lit: number,
    time: number,
  ): void {
    this.tiles(scroll, factor, (off) => {
      for (const b of list) {
        const x = b.x + off;
        if (x > this.w || x + b.w < 0) continue;
        const top = SKY - 4 - b.h;
        c.fillStyle = color;
        c.fillRect(x, top, b.w, b.h + 4);
        const r = rng(b.seed);
        for (let wy = top + 4; wy < SKY - 6; wy += 5) {
          for (let wx = x + 3; wx < x + b.w - 3; wx += 5) {
            if (r() > lit) continue;
            c.fillStyle = r() > 0.8 ? '#7fe3ff' : '#ffd98a';
            c.globalAlpha = 0.75;
            c.fillRect(wx, wy, 2, 2.4);
          }
        }
        c.globalAlpha = 1;
        if (b.antenna) {
          c.fillStyle = color;
          c.fillRect(x + b.w / 2 - 0.5, top - 10, 1, 10);
          c.fillStyle = Math.sin(time * 3 + b.seed) > 0 ? '#ff4040' : '#5a1010';
          c.fillRect(x + b.w / 2 - 1, top - 11, 2, 2);
        }
      }
    });
  }

  /* ---------- mid layers ---------- */

  private drawStands(c: CanvasRenderingContext2D, scroll: number, factor: number, base: string, alpha: number): void {
    this.tiles(scroll, factor, (off) => {
      for (const st of this.stands) {
        const x = st.x + off;
        if (x > this.w || x + st.w < 0) continue;
        const top = SKY - WALL - 16 - st.h * 0.4;
        const h = SKY - WALL - 2 - top;
        c.fillStyle = base;
        c.fillRect(x, top, st.w, h);
        // Roof.
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(x - 3, top - 3, st.w + 6, 4);
        // Crowd.
        const r = rng(st.seed);
        c.globalAlpha = 0.6 * alpha;
        for (let dy = 4; dy < h - 2; dy += 5) {
          for (let dx = 3; dx < st.w - 2; dx += 5) {
            c.fillStyle = CROWD[Math.floor(r() * CROWD.length)];
            c.fillRect(x + dx, top + dy, 2.2, 2.4);
          }
        }
        c.globalAlpha = 1;
      }
    });
  }

  private drawTowers(c: CanvasRenderingContext2D, scroll: number, factor: number, cones: boolean): void {
    this.tiles(scroll, factor, (off) => {
      for (const t of this.towers) {
        const x = t.x + off;
        if (x > this.w + 40 || x < -40) continue;
        const top = SKY - t.h;
        c.fillStyle = '#0d0e14';
        c.fillRect(x - 1.2, top + 8, 2.4, t.h - 8);
        c.fillStyle = '#1a1c26';
        c.fillRect(x - 12, top, 24, 9);
        if (cones) {
          const cone = c.createLinearGradient(0, top + 8, 0, SKY);
          cone.addColorStop(0, 'rgba(255,245,210,0.2)');
          cone.addColorStop(1, 'rgba(255,245,210,0)');
          c.fillStyle = cone;
          c.beginPath();
          c.moveTo(x - 10, top + 9);
          c.lineTo(x + 10, top + 9);
          c.lineTo(x + 46, SKY);
          c.lineTo(x - 46, SKY);
          c.closePath();
          c.fill();
        }
        c.fillStyle = '#fff6d8';
        for (let i = 0; i < 4; i++) c.fillRect(x - 10 + i * 5.5, top + 2, 3.5, 4);
        const glow = c.createRadialGradient(x, top + 4, 1, x, top + 4, 26);
        glow.addColorStop(0, 'rgba(255,240,200,0.55)');
        glow.addColorStop(1, 'rgba(255,240,200,0)');
        c.fillStyle = glow;
        c.fillRect(x - 28, top - 22, 56, 52);
      }
    });
  }

  private drawPalms(c: CanvasRenderingContext2D, scroll: number): void {
    this.tiles(scroll, 0.42, (off) => {
      for (let i = 0; i < this.trees.length; i += 4) {
        const t = this.trees[i];
        const x = t.x + off;
        if (x > this.w + 30 || x < -30) continue;
        const base = SKY - WALL - 1;
        const topY = base - t.h - 6;
        c.strokeStyle = '#6b4a2b';
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(x, base);
        c.quadraticCurveTo(x + 3, base - t.h * 0.6, x + 1, topY);
        c.stroke();
        c.strokeStyle = '#2f7a3a';
        c.lineWidth = 1.6;
        for (let a = 0; a < 7; a++) {
          const ang = -Math.PI * 0.95 + (a / 6) * Math.PI * 0.9;
          c.beginPath();
          c.moveTo(x + 1, topY);
          c.quadraticCurveTo(x + 1 + Math.cos(ang) * 8, topY + Math.sin(ang) * 9 - 3, x + 1 + Math.cos(ang) * 15, topY + Math.sin(ang) * 6 + 7);
          c.stroke();
        }
      }
    });
  }

  private drawPines(c: CanvasRenderingContext2D, scroll: number, factor: number, color: string, alpha: number): void {
    c.globalAlpha = alpha;
    this.tiles(scroll, factor, (off) => {
      for (const t of this.trees) {
        const x = t.x + off;
        if (x > this.w + 20 || x < -20) continue;
        const base = SKY - WALL - 1;
        c.fillStyle = color;
        for (let k = 0; k < 3; k++) {
          const y = base - (t.h * (k + 1)) / 3.2;
          const wdt = 12 - k * 3;
          c.beginPath();
          c.moveTo(x - wdt, y + t.h / 3.4);
          c.lineTo(x, y - t.h / 4);
          c.lineTo(x + wdt, y + t.h / 3.4);
          c.closePath();
          c.fill();
        }
      }
    });
    c.globalAlpha = 1;
  }

  /* ---------- wall, hoardings ---------- */

  private drawWall(c: CanvasRenderingContext2D, scroll: number, time: number): void {
    const w = this.w;
    const v = getVenue(this.venue);
    const top = SKY - WALL;

    // Catch fencing.
    c.strokeStyle = 'rgba(210,220,235,0.2)';
    c.lineWidth = 1;
    const fy = top - 22;
    for (let x = -((scroll * 1) % 9); x < w; x += 9) {
      c.beginPath();
      c.moveTo(x, fy);
      c.lineTo(x, top);
      c.stroke();
    }
    c.fillStyle = 'rgba(210,220,235,0.3)';
    c.fillRect(0, fy, w, 1.5);
    c.fillRect(0, fy + 11, w, 0.8);

    // Hoardings.
    c.fillStyle = v.wall;
    c.fillRect(0, top, w, WALL);
    const off = scroll % (PANEL * BRANDS.length);
    const first = Math.floor(off / PANEL);
    c.font = '800 10px "Chakra Petch", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = -1; i * PANEL < w + PANEL; i++) {
      const x = i * PANEL - (off % PANEL);
      const b = BRANDS[(((first + i) % BRANDS.length) + BRANDS.length) % BRANDS.length];
      c.fillStyle = b.bg;
      c.fillRect(x + 2, top + 1.5, PANEL - 4, WALL - 4);
      c.fillStyle = b.fg;
      c.fillText(b.text, x + PANEL / 2, top + WALL / 2 - 0.5);
      if (this.venue === 'night') {
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillRect(x + 2, top + 1.5, PANEL - 4, 3);
      }
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(0, top - 1, w, 1.5);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, SKY - 3, w, 3);

    // Marshal post with a waving flag.
    const gap = 2600;
    const px = gap - (scroll % gap) - 60;
    if (px > -60 && px < w + 60) {
      c.fillStyle = '#d9d9de';
      c.fillRect(px - 14, top - 15, 28, 15);
      c.fillStyle = '#e8541f';
      c.fillRect(px - 14, top - 15, 28, 3);
      c.fillStyle = '#11121a';
      c.fillRect(px - 8, top - 11, 10, 7);
      c.fillStyle = '#ffd400';
      const sway = Math.sin(time * 5) * 3;
      c.beginPath();
      c.moveTo(px + 8, top - 15);
      c.lineTo(px + 8, top - 31);
      c.lineTo(px + 22 + sway, top - 28);
      c.lineTo(px + 8, top - 23);
      c.closePath();
      c.fill();
      c.fillRect(px + 7.4, top - 32, 1.2, 18);
    }
  }

  /* ---------- road ---------- */

  private drawRoad(c: CanvasRenderingContext2D, scroll: number, weather: Weather): void {
    const w = this.w;
    const v = getVenue(this.venue);
    const roadH = KERB * 2 + this.lanes * this.laneH;
    const g = c.createLinearGradient(0, SKY, 0, SKY + roadH);
    g.addColorStop(0, v.road[0]);
    g.addColorStop(1, v.road[1]);
    c.fillStyle = g;
    c.fillRect(0, SKY, w, roadH);

    // Rubbered racing line in each lane and tarmac seams.
    for (let i = 0; i < this.lanes; i++) {
      const y = this.laneTop(i) + this.laneH * 0.58;
      const band = c.createLinearGradient(0, y - 9, 0, y + 9);
      band.addColorStop(0, 'rgba(0,0,0,0)');
      band.addColorStop(0.5, 'rgba(0,0,0,0.22)');
      band.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = band;
      c.fillRect(0, y - 9, w, 18);
    }
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    for (let x = -(scroll % 260); x < w; x += 260) {
      c.beginPath();
      c.moveTo(x, SKY + KERB);
      c.lineTo(x + 6, SKY + roadH - KERB);
      c.stroke();
    }

    // Kerbs.
    const blk = 26;
    const o = scroll % (blk * 2);
    for (let x = -o; x < w; x += blk) {
      const idx = Math.round((x + o) / blk);
      c.fillStyle = idx % 2 === 0 ? '#ecedf2' : '#e10600';
      c.fillRect(x, SKY, blk, KERB);
      c.fillRect(x, SKY + roadH - KERB, blk, KERB);
    }
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(0, SKY + KERB, w, 1.2);
    c.fillRect(0, SKY + roadH - KERB - 1.2, w, 1.2);

    // Lane dashes.
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.16)';
    c.lineWidth = 2;
    c.setLineDash([18, 22]);
    c.lineDashOffset = scroll;
    for (let i = 1; i < this.lanes; i++) {
      const y = SKY + KERB + i * this.laneH;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.restore();

    if (weather === 'wet') {
      const sheen = c.createLinearGradient(0, SKY, 0, SKY + roadH);
      sheen.addColorStop(0, 'rgba(150,180,230,0.20)');
      sheen.addColorStop(1, 'rgba(150,180,230,0.05)');
      c.fillStyle = sheen;
      c.fillRect(0, SKY + KERB, w, roadH - KERB * 2);
      // Smeared reflections of the lights.
      c.fillStyle = 'rgba(255,240,210,0.07)';
      for (let x = -(scroll * 0.6 % 330); x < w; x += 330) {
        c.fillRect(x, SKY + KERB, 5, roadH - KERB * 2);
      }
    }
  }
}