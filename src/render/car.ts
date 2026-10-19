import { TYRES, type Livery, type Tyre } from '../data/liveries';
import { CAR_SPRITE } from '../data/assets';
import { carSprite, wheelSprite } from './sprites';

/**
 * A modern (ground effect era) Formula 1 car in side profile, facing right.
 *
 * Units: 1 unit is roughly 3.5 cm, so the 3.6 m wheelbase is about 102 units.
 * The origin is on the ground, halfway between the axles. Negative y is up.
 * Everything is drawn from code so the car can be recoloured for any livery.
 */
export const CAR_HALF_LENGTH = 87;
export const CAR_HEIGHT = 30;

export interface CarState {
  /** Wheel rotation in radians. */
  wheel: number;
  /** Car speed in km/h, used for motion blur on the wheels. */
  speed: number;
  /** DRS flap opening, 0 closed to 1 open. */
  drs: number;
  /** Brake intensity 0..1 (brake light, glowing discs). */
  brake: number;
  /** Exhaust flame length 0..1. */
  flame: number;
}

export interface CarOptions {
  shadow?: boolean;
  glow?: boolean;
}

const FRONT = { x: 52, y: -10, r: 10 };
const REAR = { x: -50, y: -10.5, r: 10.6 };

/* ---------------- colour helpers ---------------- */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${k(r)}${k(g)}${k(b)}`;
}

/** amount > 0 lightens towards white, amount < 0 darkens towards black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return toHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}

function luminance(hex: string): number {
  const [r, g, b] = parse(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function polygon(c: CanvasRenderingContext2D, pts: [number, number][]): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

/* ---------------- body shapes ---------------- */

function bodyPath(): Path2D {
  const p = new Path2D();
  p.moveTo(79.5, -6.2); // nose tip, bottom
  p.lineTo(80.2, -11.6); // blunt nose tip
  p.bezierCurveTo(70, -12.4, 54, -13, 39, -14.2); // nose rising to the scuttle
  p.bezierCurveTo(34, -14.4, 29.5, -15.9, 24, -16.5); // front hoop
  p.lineTo(5, -16.1); // cockpit rim
  p.bezierCurveTo(2, -16.8, 0.2, -18.8, -1.2, -21.6); // headrest and roll structure
  p.bezierCurveTo(-2.2, -24.4, -3.6, -26.4, -7.2, -27); // airbox top
  p.bezierCurveTo(-16, -26.6, -30, -22.6, -44, -17.6); // engine cover
  p.bezierCurveTo(-55, -14.2, -66, -12.8, -73.5, -12.4); // gearbox
  p.lineTo(-74.2, -8.8);
  p.lineTo(-60, -5.2);
  p.lineTo(-8, -4.6);
  p.lineTo(52, -4.9);
  p.lineTo(66, -6.4);
  p.closePath();
  return p;
}

function sidepodPath(): Path2D {
  const p = new Path2D();
  p.moveTo(21.5, -6.4);
  p.lineTo(20.8, -12.8);
  p.bezierCurveTo(12, -14.4, 0, -14.6, -12, -13.5);
  p.bezierCurveTo(-26, -12.4, -36, -10.2, -47.5, -7.2);
  p.lineTo(-47.5, -5.6);
  p.lineTo(-30, -5.1);
  p.lineTo(10, -5.3);
  p.closePath();
  return p;
}

/* ---------------- parts ---------------- */

function drawFloor(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#0c0d11';
  c.fillRect(-62, -4.9, 112, 1.5);
  polygon(c, [
    [-50, -4.9],
    [-77, -10.8],
    [-77, -8.2],
    [-62, -3.5],
  ]);
  c.fill();
  // Floor edge detail.
  c.fillStyle = '#1b1d25';
  c.fillRect(-40, -4.3, 70, 0.6);
}

function drawFrontWing(c: CanvasRenderingContext2D, l: Livery): void {
  c.fillStyle = '#16171c';
  c.fillRect(70, -5.6, 1.4, 2.4);
  c.fillRect(76.5, -5.2, 1.4, 2.2);
  // Stacked elements behind the near endplate.
  const elem = [
    [66, -4.6, 22, 1.1],
    [69, -6.1, 19, 1.0],
    [72, -7.4, 16, 0.9],
    [75, -8.5, 13, 0.9],
  ];
  c.fillStyle = l.accent;
  for (const [x, y, w, h] of elem) c.fillRect(x, y, w, h);
  // Near endplate.
  polygon(c, [
    [63.5, -3.1],
    [88.5, -2.9],
    [89.3, -6.2],
    [86.8, -9.8],
    [77, -10.6],
    [67, -8.4],
  ]);
  c.fillStyle = l.primary;
  c.fill();
  c.lineWidth = 0.5;
  c.strokeStyle = shade(l.primary, -0.45);
  c.stroke();
  c.fillStyle = l.accent;
  c.fillRect(63.5, -3.7, 25.5, 0.9);
  // Livery flash on the endplate.
  c.fillStyle = l.secondary;
  polygon(c, [
    [70, -4.9],
    [86.6, -4.9],
    [86, -7.2],
    [72.6, -7.2],
  ]);
  c.fill();
}

function drawRearWing(c: CanvasRenderingContext2D, l: Livery, drs: number): void {
  // Pylon and beam wing.
  c.fillStyle = '#17181d';
  c.fillRect(-68.2, -23.6, 2.8, 10.4);
  c.fillStyle = l.accent;
  c.fillRect(-83, -12.9, 17, 1.2);
  c.fillRect(-83, -14.7, 14, 0.8);

  // Near endplate.
  polygon(c, [
    [-58.5, -26.6],
    [-66, -28.5],
    [-80.5, -28.9],
    [-84.4, -28],
    [-84.4, -22.5],
    [-80, -16.6],
    [-70, -15.4],
    [-62.5, -17.4],
    [-59.6, -21.2],
  ]);
  c.fillStyle = l.primary;
  c.fill();
  c.lineWidth = 0.5;
  c.strokeStyle = shade(l.primary, -0.45);
  c.stroke();
  // Stripe across the endplate.
  c.save();
  c.clip();
  c.fillStyle = l.secondary;
  polygon(c, [
    [-62, -29],
    [-68, -29],
    [-80, -15],
    [-74, -15],
  ]);
  c.fill();
  c.restore();

  // Main plane visible through the slot when the flap is open.
  c.fillStyle = '#101116';
  c.fillRect(-82, -27.6, 21, 1.2);

  // DRS flap: hinged at the trailing edge, leading edge lifts when open.
  c.save();
  c.translate(-83.8, -28.9);
  c.rotate(-drs * 0.3);
  c.fillStyle = l.accent;
  c.fillRect(0, -1.4, 21.5, 1.6);
  c.fillStyle = shade(l.accent, 0.35);
  c.fillRect(0, -1.4, 21.5, 0.4);
  c.restore();
}

function drawHalo(c: CanvasRenderingContext2D): void {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Central pillar and the arch over the driver.
  c.strokeStyle = '#2c2f38';
  c.lineWidth = 2.1;
  c.beginPath();
  c.moveTo(26.5, -15.9);
  c.lineTo(19.8, -22.6);
  c.bezierCurveTo(12, -25.4, 4.5, -23.6, 1.2, -18.6);
  c.stroke();
  c.strokeStyle = '#6b7080';
  c.lineWidth = 0.6;
  c.beginPath();
  c.moveTo(26, -16.6);
  c.lineTo(19.6, -23.3);
  c.bezierCurveTo(12, -26.1, 4.8, -24.3, 1.8, -19.4);
  c.stroke();
}

function drawWheel(
  c: CanvasRenderingContext2D,
  w: { x: number; y: number; r: number },
  tyre: Tyre,
  angle: number,
  speed: number,
  brake: number,
): void {
  const { x, y, r } = w;
  const blur = Math.min(1, speed / 200);
  c.save();
  c.translate(x, y);

  // Tyre.
  c.fillStyle = '#0b0b0e';
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  // Tread edge highlight.
  c.strokeStyle = '#1d1e25';
  c.lineWidth = 0.6;
  c.beginPath();
  c.arc(0, 0, r - 0.3, 0, Math.PI * 2);
  c.stroke();
  // Compound ring on the sidewall.
  c.strokeStyle = TYRES[tyre].color;
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.arc(0, 0, r * 0.73, 0, Math.PI * 2);
  c.stroke();

  // Wheel cover.
  const g = c.createRadialGradient(-r * 0.15, -r * 0.2, r * 0.05, 0, 0, r * 0.62);
  g.addColorStop(0, '#3a3d48');
  g.addColorStop(1, '#16171d');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#a3a9ba';
  c.lineWidth = 0.55;
  c.beginPath();
  c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  c.stroke();

  // Brake disc glow seen through the cover.
  if (brake > 0.05) {
    c.strokeStyle = `rgba(255,120,30,${(0.85 * brake).toFixed(2)})`;
    c.lineWidth = r * 0.12;
    c.beginPath();
    c.arc(0, 0, r * 0.44, 0, Math.PI * 2);
    c.stroke();
  }

  // Rotating details: vents and a marker, fading out as the wheel blurs.
  c.save();
  c.rotate(angle);
  c.globalAlpha = 1 - blur * 0.75;
  c.fillStyle = '#08090c';
  for (let i = 0; i < 5; i++) {
    c.save();
    c.rotate((i * Math.PI * 2) / 5);
    c.beginPath();
    c.ellipse(r * 0.36, 0, r * 0.1, r * 0.055, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.strokeStyle = '#f2f4fa';
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.arc(0, 0, r * 0.53, -0.18, 0.18);
  c.stroke();
  c.restore();

  // Spin blur disc.
  if (blur > 0.1) {
    c.fillStyle = `rgba(190,196,212,${(0.14 * blur).toFixed(3)})`;
    c.beginPath();
    c.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    c.fill();
  }

  // Centre nut.
  c.fillStyle = '#d9dcea';
  c.beginPath();
  c.arc(0, 0, r * 0.1, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawFlame(c: CanvasRenderingContext2D, amount: number): void {
  if (amount <= 0.02) return;
  const len = 6 + amount * 22 * (0.75 + Math.random() * 0.5);
  const x = -76;
  const y = -11.4;
  const g = c.createLinearGradient(x, 0, x - len, 0);
  g.addColorStop(0, 'rgba(255,248,210,0.95)');
  g.addColorStop(0.35, 'rgba(255,170,50,0.85)');
  g.addColorStop(1, 'rgba(255,60,10,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x, y - 1.7);
  c.lineTo(x - len, y - 0.4 + (Math.random() - 0.5));
  c.lineTo(x, y + 1.7);
  c.closePath();
  c.fill();
}

/* ---------------- main entry ---------------- */

/** Draws the player's own PNG instead of the vector car. Returns false when no image is available. */
function drawSpriteCar(c: CanvasRenderingContext2D, livery: Livery, st: CarState, opts: CarOptions): boolean {
  const img = carSprite(livery.id);
  if (!img) return false;
  const k = CAR_SPRITE.length / img.width;
  const w = img.width * k;
  const h = img.height * k;
  const x = -w * CAR_SPRITE.centerX;
  const y = -h * CAR_SPRITE.groundY;

  c.save();
  if (opts.shadow !== false) {
    const sh = c.createRadialGradient(0, 0.5, 4, 0, 0.5, 78);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath();
    c.ellipse(0, 0.6, 80, 3.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  drawFlame(c, st.flame);

  if (opts.glow) {
    c.shadowColor = livery.primary;
    c.shadowBlur = 16;
  }
  c.drawImage(img, x, y, w, h);
  c.shadowBlur = 0;

  const wheel = wheelSprite();
  if (wheel) {
    const r = CAR_SPRITE.wheelRadius;
    for (const ax of [CAR_SPRITE.rearAxleX, CAR_SPRITE.frontAxleX]) {
      c.save();
      c.translate(ax, -CAR_SPRITE.axleHeight);
      c.rotate(st.wheel);
      c.drawImage(wheel, -r, -r, r * 2, r * 2);
      c.restore();
    }
  }

  if (st.brake > 0.05) {
    c.fillStyle = `rgba(255,40,40,${(0.35 + st.brake * 0.5).toFixed(2)})`;
    c.beginPath();
    c.arc(x + w * 0.04, y + h * 0.42, 3 + st.brake * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  return true;
}

export function drawCar(
  c: CanvasRenderingContext2D,
  livery: Livery,
  tyre: Tyre,
  st: CarState,
  opts: CarOptions = {},
): void {
  if (drawSpriteCar(c, livery, st, opts)) return;
  const l = livery;
  const body = bodyPath();
  c.save();

  if (opts.shadow !== false) {
    const sh = c.createRadialGradient(0, 0.5, 4, 0, 0.5, 78);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath();
    c.ellipse(0, 0.6, 80, 3.6, 0, 0, Math.PI * 2);
    c.fill();
  }

  drawFlame(c, st.flame);
  drawFloor(c);

  if (opts.glow) {
    c.save();
    c.shadowColor = l.primary;
    c.shadowBlur = 16;
    c.fillStyle = l.primary;
    c.fill(body);
    c.restore();
  }

  // Driver helmet sits behind the cockpit rim.
  c.fillStyle = l.helmet;
  c.beginPath();
  c.arc(11, -18.9, 3.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0d0e12';
  c.beginPath();
  c.ellipse(13, -19.2, 1.9, 1.35, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(12.2, -19.9, 1.3, 0.35);

  // Chassis and engine cover with livery clipped inside.
  const gloss = c.createLinearGradient(0, -27, 0, -4);
  gloss.addColorStop(0, shade(l.primary, 0.18));
  gloss.addColorStop(0.5, l.primary);
  gloss.addColorStop(1, shade(l.primary, -0.4));
  c.fillStyle = gloss;
  c.fill(body);

  c.save();
  c.clip(body);
  // Painted nose.
  c.fillStyle = l.accent;
  polygon(c, [
    [74, -16],
    [90, -16],
    [90, -2],
    [74, -2],
  ]);
  c.fill();
  c.fillStyle = l.secondary;
  polygon(c, [
    [66, -16],
    [70, -16],
    [70, -2],
    [66, -2],
  ]);
  c.fill();
  // Diagonal band over the engine cover.
  c.fillStyle = l.secondary;
  polygon(c, [
    [-34, -30],
    [-27, -30],
    [-39, -2],
    [-46, -2],
  ]);
  c.fill();
  c.fillStyle = l.accent;
  polygon(c, [
    [-26, -30],
    [-23.8, -30],
    [-35.8, -2],
    [-38, -2],
  ]);
  c.fill();
  // Top light and underside shadow for volume.
  const vol = c.createLinearGradient(0, -27, 0, -4);
  vol.addColorStop(0, 'rgba(255,255,255,0.22)');
  vol.addColorStop(0.35, 'rgba(255,255,255,0)');
  vol.addColorStop(1, 'rgba(0,0,0,0.3)');
  c.fillStyle = vol;
  c.fillRect(-80, -30, 170, 30);
  c.restore();

  // Cockpit rim, airbox intake, onboard camera pod.
  c.strokeStyle = '#101116';
  c.lineWidth = 1.4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(24, -16.4);
  c.lineTo(5, -16);
  c.stroke();
  c.fillStyle = '#08090c';
  polygon(c, [
    [-2.8, -21.6],
    [-3.9, -25.5],
    [-6.4, -25.9],
    [-5.5, -21.9],
  ]);
  c.fill();
  c.fillStyle = '#17181d';
  c.fillRect(-9.2, -29.2, 3.8, 1.9);
  c.fillRect(-8, -28, 1.4, 1.2);
  c.fillStyle = l.accent;
  c.fillRect(-9.2, -29.2, 3.8, 0.5);

  // Front suspension arms, then sidepod over the rear arms.
  c.strokeStyle = '#15161b';
  c.lineWidth = 0.9;
  for (const [x1, y1, x2, y2] of [
    [46, -10.8, 29, -13.2],
    [46, -9.2, 29, -7.4],
    [48, -13.4, 31, -14.6],
  ]) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(-44, -11.8);
  c.lineTo(-33, -14.2);
  c.moveTo(-44, -9.2);
  c.lineTo(-33, -6.6);
  c.stroke();

  // Sidepod with inlet, swoosh and number.
  const pod = sidepodPath();
  const podGrad = c.createLinearGradient(0, -14.6, 0, -5);
  podGrad.addColorStop(0, shade(l.secondary, 0.1));
  podGrad.addColorStop(1, shade(l.secondary, -0.35));
  c.fillStyle = podGrad;
  c.fill(pod);
  c.save();
  c.clip(pod);
  c.strokeStyle = l.accent;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(22, -6.6);
  c.bezierCurveTo(6, -8, -14, -12, -48, -11.5);
  c.stroke();
  c.strokeStyle = l.primary;
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(22, -8.8);
  c.bezierCurveTo(6, -9.8, -14, -13.6, -48, -13.4);
  c.stroke();
  c.restore();
  c.fillStyle = '#08090c';
  polygon(c, [
    [21.4, -12.3],
    [24.6, -11.4],
    [25, -7.7],
    [21.8, -7.2],
  ]);
  c.fill();
  c.strokeStyle = shade(l.secondary, 0.25);
  c.lineWidth = 0.5;
  c.stroke();

  // Race number on the engine cover, in a contrasting colour.
  c.fillStyle = luminance(l.primary) > 0.55 ? '#14151a' : '#ffffff';
  c.font = '800 7.2px "Chakra Petch", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.save();
  c.translate(-17.5, -18.6);
  c.rotate(-0.3);
  c.fillText(l.number, 0, 0);
  c.restore();

  // Mirror and halo.
  c.fillStyle = '#16171c';
  c.fillRect(22.3, -18.2, 0.8, 1.8);
  c.fillStyle = l.accent;
  c.beginPath();
  c.roundRect(20.3, -19.8, 4.2, 1.9, 0.8);
  c.fill();
  drawHalo(c);

  drawRearWing(c, l, st.drs);
  drawFrontWing(c, l);

  // Brake light and rain light.
  c.save();
  c.shadowColor = '#ff2020';
  c.shadowBlur = 3 + st.brake * 10;
  c.fillStyle = st.brake > 0.1 ? '#ff4040' : '#a01818';
  c.beginPath();
  c.arc(-81.4, -17.8, 1.15, 0, Math.PI * 2);
  c.fill();
  c.restore();

  drawWheel(c, REAR, tyre, st.wheel, st.speed, st.brake);
  drawWheel(c, FRONT, tyre, st.wheel * 1.0, st.speed, st.brake);

  c.restore();
}

/** Small helmet icon used on the podium. */
export function drawHelmet(c: CanvasRenderingContext2D, x: number, y: number, r: number, l: Livery): void {
  c.save();
  c.translate(x, y);
  c.fillStyle = l.helmet;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = l.primary;
  c.beginPath();
  c.arc(0, 0, r, Math.PI * 1.1, Math.PI * 1.9);
  c.lineTo(0, -r * 0.1);
  c.closePath();
  c.fill();
  c.fillStyle = '#0d0e12';
  c.beginPath();
  c.ellipse(r * 0.38, -r * 0.1, r * 0.62, r * 0.36, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(r * 0.1, -r * 0.3, r * 0.45, r * 0.08);
  c.restore();
}