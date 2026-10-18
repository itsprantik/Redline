import type { ClassifiedCar, Difficulty, RaceConfig, RaceResult } from '../types';
import type { Passage } from '../data/passages';
import { getLivery, LIVERIES, TYRES, type Livery, type Tyre } from '../data/liveries';
import { SpeedModel, targetSpeed } from './physics';
import { TypingSession } from './session';

export interface Car {
  id: string;
  name: string;
  color: string;
  accent: string;
  livery: Livery;
  tyre: Tyre;
  /** DRS flap open. */
  drs: boolean;
  /** 0..1, decays after a locked-up brake. */
  brake: number;
  isPlayer: boolean;
  chars: number;
  progress: number;
  speed: number;
  /** Seconds after lights out, or null while still racing. */
  finishTime: number | null;
  baseWpm: number;
  phase: number;
  freq: number;
}

export type RaceEvent =
  | { type: 'lights'; lit: number }
  | { type: 'go' }
  | { type: 'jumpstart' }
  | { type: 'ok' }
  | { type: 'error' }
  | { type: 'overtake'; passed: string }
  | { type: 'overtaken'; by: string }
  | { type: 'drs'; on: boolean }
  | { type: 'egg'; id: string }
  | { type: 'segment'; index: number }
  | { type: 'finish'; position: number };

/** Typing speed of the computer drivers for each difficulty (words per minute). */
const AI_BASE: Record<Difficulty, number> = { rookie: 30, pro: 55, legend: 85 };
const AI_SPREAD = [0.9, 1.0, 1.1];

/** Made-up drivers so nobody real is put on the grid. */
const AI_DRIVERS = ['M. Okafor', 'T. Lindqvist', 'J. Marchetti'];
const TYRE_LIST: Tyre[] = ['soft', 'medium', 'hard'];
/** Chars in a row needed to open the DRS flap. */
const DRS_STREAK = 20;
const DRS_BOOST = 1.04;

const POINTS = [25, 18, 15, 12];
const LIGHT_GAP = 0.8;

export class Race {
  phase: 'countdown' | 'racing' | 'finished' = 'countdown';
  readonly cars: Car[] = [];
  readonly player: Car;
  readonly session: TypingSession;
  readonly speed = new SpeedModel();
  readonly total: number;

  /** Seconds since the screen opened. */
  time = 0;
  /** Seconds since lights out. */
  raceTime = 0;
  lit = 0;
  jumpStart = false;
  /** Rolling typing speed that drives the car. */
  wpm = 0;
  position = 1;

  private readonly goAt: number;
  private lockedUntil = 0;
  private segIndex = 0;
  private fired = new Set<string>();
  private wasLast = false;
  private ahead = new Set<string>();
  private summary: RaceResult | null = null;
  private drsOn = false;

  constructor(
    readonly config: RaceConfig,
    private readonly passage: Passage,
    private readonly emit: (e: RaceEvent) => void,
  ) {
    this.total = passage.text.length;
    this.session = new TypingSession(passage.text, config.caseSensitive);
    const mine = getLivery(config.livery);
    this.player = {
      id: 'you',
      name: 'YOU',
      color: mine.primary,
      accent: mine.secondary,
      livery: mine,
      tyre: config.tyre,
      drs: false,
      brake: 0,
      isPlayer: true,
      chars: 0,
      progress: 0,
      speed: 0,
      finishTime: null,
      baseWpm: 0,
      phase: 0,
      freq: 0,
    };
    if (config.mode === 'competition') {
      const pool = LIVERIES.filter((l) => l.id !== mine.id).sort(() => Math.random() - 0.5);
      AI_DRIVERS.forEach((name, i) => {
        const lv = pool[i % pool.length];
        this.cars.push({
          id: `ai${i}`,
          name,
          color: lv.primary,
          accent: lv.secondary,
          livery: lv,
          tyre: TYRE_LIST[Math.floor(Math.random() * 3)],
          drs: false,
          brake: 0,
          isPlayer: false,
          chars: 0,
          progress: 0,
          speed: 0,
          finishTime: null,
          baseWpm: AI_BASE[config.difficulty] * AI_SPREAD[i] * (0.95 + Math.random() * 0.1),
          phase: Math.random() * Math.PI * 2,
          freq: 0.4 + Math.random() * 0.5,
        });
      });
    }
    this.cars.push(this.player);
    // Five lights, then a random hold before they go out.
    this.goAt = LIGHT_GAP * 5 + 0.5 + Math.random() * 1.2;
  }

  /** Final numbers, available once the player has crossed the line. */
  get result(): RaceResult | null {
    return this.summary;
  }

  /** Cars sorted by race position. */
  ranking(): Car[] {
    return [...this.cars].sort((a, b) => {
      if (a.finishTime !== null || b.finishTime !== null) {
        if (a.finishTime === null) return 1;
        if (b.finishTime === null) return -1;
        return a.finishTime - b.finishTime;
      }
      return b.progress - a.progress;
    });
  }

  update(dt: number): void {
    this.time += dt;
    if (this.phase === 'countdown') {
      this.tickCountdown();
      return;
    }
    this.raceTime += dt;
    this.moveAi(dt);
    if (this.phase === 'racing') {
      this.wpm = this.session.rollingWpm(this.raceTime * 1000);
      const wet = this.config.weather === 'wet' ? 0.97 : 1;
      const boost = this.drsOn ? DRS_BOOST : 1;
      this.speed.step(dt, targetSpeed(this.wpm) * TYRES[this.config.tyre].speed * wet * boost);
    } else {
      // Cool-down lap after the flag.
      this.speed.step(dt, 150);
    }
    this.player.speed = this.speed.speed;
    this.player.brake = Math.max(0, this.player.brake - dt * 2.5);
    this.checkPositions();
    this.checkEggs();
  }

  press(key: string): void {
    if (key.length !== 1) return;
    if (this.phase === 'countdown') {
      if (this.time > 0.4 && !this.jumpStart) {
        this.jumpStart = true;
        this.emit({ type: 'jumpstart' });
      }
      return;
    }
    if (this.phase !== 'racing' || this.raceTime < this.lockedUntil) return;

    const nowMs = this.raceTime * 1000;
    const res = this.session.press(key, nowMs);
    if (res === 'ignored') return;

    if (res === 'error') {
      const wetGrip = this.config.weather === 'wet' ? 0.96 : 1;
      this.speed.lockUp(TYRES[this.config.tyre].lock * wetGrip);
      this.player.brake = 1;
      this.setDrs(false);
      this.emit({ type: 'error' });
      if (this.session.recentErrors(nowMs) >= 4) this.fire('tyres');
      if (this.config.mode === 'competition' && this.position === 1 && this.raceTime > 3) this.fire('kimi');
      return;
    }

    this.player.chars = this.session.pos;
    this.player.progress = this.session.progress;
    this.emit({ type: 'ok' });
    if (this.session.streak >= DRS_STREAK) this.setDrs(true);

    const segs = this.passage.segments;
    while (this.segIndex < segs.length && this.session.pos >= segs[this.segIndex].end) {
      this.emit({ type: 'segment', index: this.segIndex });
      this.segIndex++;
    }
    if (this.session.streak >= 40) this.fire('simply');
    if (this.session.done) this.finishPlayer(nowMs);
  }

  private tickCountdown(): void {
    const lit = Math.min(5, Math.floor(this.time / LIGHT_GAP));
    if (lit !== this.lit) {
      this.lit = lit;
      this.emit({ type: 'lights', lit });
    }
    if (this.time >= this.goAt) {
      this.phase = 'racing';
      this.lit = 0;
      this.raceTime = 0;
      this.session.begin(0);
      if (this.jumpStart) this.lockedUntil = 1.2;
      this.emit({ type: 'lights', lit: 0 });
      this.emit({ type: 'go' });
      this.fire('croft');
    }
  }

  private moveAi(dt: number): void {
    for (const c of this.cars) {
      if (c.isPlayer) continue;
      if (c.finishTime !== null) {
        c.speed = 150;
        continue;
      }
      const wob =
        1 + 0.14 * Math.sin(this.raceTime * c.freq + c.phase) + 0.05 * Math.sin(this.raceTime * 1.7 + c.phase * 2);
      const wpm = c.baseWpm * wob;
      c.chars = Math.min(this.total, c.chars + ((wpm * 5) / 60) * dt);
      c.progress = c.chars / this.total;
      c.speed = targetSpeed(wpm);
      c.drs = wob > 1.1;
      if (c.chars >= this.total) c.finishTime = this.raceTime;
    }
  }

  private checkPositions(): void {
    if (this.phase !== 'racing') return;
    const order = this.ranking();
    const idx = order.indexOf(this.player);
    this.position = idx + 1;
    if (this.cars.length < 2) return;

    const nowAhead = new Set(order.slice(0, idx).map((c) => c.id));
    if (this.raceTime > 1.5) {
      for (const id of this.ahead) {
        if (nowAhead.has(id)) continue;
        const car = this.cars.find((c) => c.id === id);
        if (car) {
          this.emit({ type: 'overtake', passed: car.name });
          if (this.player.progress > 0.8) this.fire('glock');
        }
        break;
      }
      for (const id of nowAhead) {
        if (this.ahead.has(id)) continue;
        const car = this.cars.find((c) => c.id === id);
        if (car) {
          this.emit({ type: 'overtaken', by: car.name });
          if (this.raceTime > 3 && this.player.progress > 0.12) this.fire('fernando');
        }
        break;
      }
    }
    this.ahead = nowAhead;
  }

  private checkEggs(): void {
    if (this.phase !== 'racing') return;
    if (this.wpm >= 90 && this.raceTime > 3) this.fire('hammer');
    if (this.cars.length > 1 && this.position === this.cars.length) {
      if (this.player.progress > 0.2) this.wasLast = true;
      if (this.player.progress >= 0.5 && this.raceTime > 5) this.fire('valtteri');
    }
  }

  private finishPlayer(nowMs: number): void {
    this.player.finishTime = this.raceTime;
    this.phase = 'finished';
    this.position = this.ranking().indexOf(this.player) + 1;

    if (this.session.accuracy >= 98 && this.total >= 20) this.fire('sainz');
    if (this.config.mode === 'competition' && this.position === 1) {
      if (this.wasLast) this.fire('webber');
      if (this.config.difficulty !== 'rookie') this.fire('getin');
    }
    this.summary = this.buildResult(nowMs);
    this.emit({ type: 'finish', position: this.position });
  }

  private buildResult(nowMs: number): RaceResult {
    const classification: ClassifiedCar[] = this.cars.map((c) => {
      let time = c.finishTime;
      if (time === null) {
        // Still running when the player finished: estimate from their average pace.
        const rate = Math.max((c.baseWpm * 5) / 60, 0.1);
        time = this.raceTime + (this.total - c.chars) / rate;
      }
      return { name: c.name, color: c.color, isPlayer: c.isPlayer, livery: c.livery.id, tyre: c.tyre, time, position: 0 };
    });
    classification.sort((a, b) => a.time - b.time);
    classification.forEach((c, i) => {
      c.position = i + 1;
    });
    const position = classification.findIndex((c) => c.isPlayer) + 1;

    return {
      config: this.config,
      wpm: Math.round(this.session.avgWpm(nowMs) * 10) / 10,
      accuracy: Math.round(this.session.accuracy * 10) / 10,
      seconds: this.raceTime,
      errors: this.session.errors,
      chars: this.total,
      topSpeed: Math.round(this.speed.top),
      position,
      fieldSize: this.cars.length,
      points: this.config.mode === 'competition' ? (POINTS[position - 1] ?? 0) : 0,
      classification,
      eggsFound: [],
      jumpStart: this.jumpStart,
    };
  }

  private setDrs(on: boolean): void {
    if (this.drsOn === on) return;
    this.drsOn = on;
    this.player.drs = on;
    this.emit({ type: 'drs', on });
  }

  /** Approximate gap to the leader in seconds, for the timing tower. */
  gapToLeader(car: Car, leader: Car): number {
    if (car === leader) return 0;
    const rate = Math.max(((car.isPlayer ? this.session.pos : car.chars) / Math.max(this.raceTime, 1)) || 1.5, 1.5);
    const behind = Math.max(0, (leader.isPlayer ? this.session.pos : leader.chars) - (car.isPlayer ? this.session.pos : car.chars));
    return behind / rate;
  }

  private fire(id: string): void {
    if (this.fired.has(id)) return;
    this.fired.add(id);
    this.emit({ type: 'egg', id });
  }
}