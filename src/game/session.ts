export type PressResult = 'ok' | 'error' | 'ignored';

/**
 * The typing part of the game. A wrong key does not advance the cursor, it only
 * counts as a mistake, so your speed always reflects correct characters.
 */
export class TypingSession {
  pos = 0;
  errors = 0;
  keystrokes = 0;
  streak = 0;
  bestStreak = 0;
  finishAt: number | null = null;

  private startAt = 0;
  private stamps: number[] = [];
  private errStamps: number[] = [];

  constructor(
    readonly text: string,
    private readonly caseSensitive: boolean,
  ) {}

  /** `now` is race time in milliseconds. */
  begin(now: number): void {
    this.startAt = now;
  }

  get done(): boolean {
    return this.pos >= this.text.length;
  }

  get progress(): number {
    return this.text.length === 0 ? 1 : this.pos / this.text.length;
  }

  press(key: string, now: number): PressResult {
    if (this.done || key.length !== 1) return 'ignored';
    this.keystrokes++;
    const want = this.text[this.pos];
    const ok = this.caseSensitive ? key === want : key.toLowerCase() === want.toLowerCase();
    if (!ok) {
      this.errors++;
      this.streak = 0;
      this.errStamps.push(now);
      return 'error';
    }
    this.pos++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.stamps.push(now);
    if (this.done) this.finishAt = now;
    return 'ok';
  }

  recentErrors(now: number, windowMs = 6000): number {
    let n = 0;
    for (let i = this.errStamps.length - 1; i >= 0; i--) {
      if (now - this.errStamps[i] > windowMs) break;
      n++;
    }
    return n;
  }

  /** Speed over the last few seconds. This is what drives the car. */
  rollingWpm(now: number, windowMs = 4000): number {
    const elapsed = now - this.startAt;
    if (elapsed <= 0) return 0;
    const win = elapsed < windowMs ? Math.max(elapsed, 2000) : windowMs;
    let n = 0;
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      if (now - this.stamps[i] > win) break;
      n++;
    }
    return n / 5 / (win / 60000);
  }

  /** Average speed for the whole race so far (or until the finish). */
  avgWpm(now: number): number {
    const end = this.finishAt ?? now;
    const minutes = (end - this.startAt) / 60000;
    return minutes > 0 ? this.pos / 5 / minutes : 0;
  }

  get accuracy(): number {
    return this.keystrokes > 0 ? ((this.keystrokes - this.errors) / this.keystrokes) * 100 : 100;
  }
}