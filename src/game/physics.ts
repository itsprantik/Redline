/** km/h at which the speed curve flattens out. */
export const MAX_KMH = 340;

/** Gear change points in km/h. Eight gears, like the real thing. */
const BOUNDS = [0, 45, 90, 135, 180, 220, 258, 296, 340];

/** Typing speed (words per minute) to target car speed (km/h). Soft cap near 340. */
export function targetSpeed(wpm: number): number {
  return MAX_KMH * (1 - Math.exp(-Math.max(0, wpm) / 55));
}

export function gearFor(speed: number): number {
  for (let i = BOUNDS.length - 2; i >= 0; i--) {
    if (speed >= BOUNDS[i]) return i + 1;
  }
  return 1;
}

/** 0..1 engine speed, dropping after each upshift like a real gearbox. */
export function rpmFor(speed: number): number {
  const g = gearFor(speed);
  const lo = BOUNDS[g - 1];
  const hi = BOUNDS[g];
  const f = Math.min(1, Math.max(0, (speed - lo) / (hi - lo)));
  return g === 1 ? 0.12 + 0.88 * f : 0.4 + 0.6 * f;
}

/** Car with inertia: it gains speed quickly and bleeds it off more slowly. */
export class SpeedModel {
  speed = 0;
  top = 0;

  step(dt: number, target: number): number {
    const k = target > this.speed ? 2.4 : 1.1;
    this.speed += (target - this.speed) * (1 - Math.exp(-k * dt));
    this.top = Math.max(this.top, this.speed);
    return this.speed;
  }

  /** A wrong key locks the brakes. */
  lockUp(keep = 0.82): void {
    this.speed *= keep;
  }
}