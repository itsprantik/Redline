import type { RaceResult, Stats } from './types';

const KEY = 'redline.v1';

function defaults(): Stats {
  return {
    races: 0,
    wins: 0,
    podiums: 0,
    points: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    topSpeed: 0,
    eggs: [],
    history: [],
    sound: true,
    caseSensitive: false,
  };
}

let cache: Stats | null = null;

export function getStats(): Stats {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...defaults(), ...(JSON.parse(raw) as Partial<Stats>) } : defaults();
  } catch {
    cache = defaults();
  }
  return cache;
}

export function saveStats(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getStats()));
  } catch {
    /* storage unavailable (private mode etc.), progress just won't persist */
  }
}

export function recordResult(r: RaceResult): { newBestWpm: boolean } {
  const s = getStats();
  const newBestWpm = r.wpm > s.bestWpm && s.races > 0;
  s.races += 1;
  if (r.config.mode === 'competition') {
    if (r.position === 1) s.wins += 1;
    if (r.position <= 3) s.podiums += 1;
    s.points += r.points;
  }
  s.bestWpm = Math.max(s.bestWpm, r.wpm);
  s.bestAccuracy = Math.max(s.bestAccuracy, r.accuracy);
  s.topSpeed = Math.max(s.topSpeed, r.topSpeed);
  s.history.push({
    date: Date.now(),
    wpm: r.wpm,
    accuracy: r.accuracy,
    mode: r.config.mode,
    position: r.position,
  });
  if (s.history.length > 50) s.history.splice(0, s.history.length - 50);
  saveStats();
  return { newBestWpm };
}

/** Returns true when the egg was not found before. */
export function markEgg(id: string): boolean {
  const s = getStats();
  if (s.eggs.includes(id)) return false;
  s.eggs.push(id);
  saveStats();
  return true;
}

export function eggCount(): number {
  return getStats().eggs.length;
}

export function resetStats(): void {
  const keepSound = getStats().sound;
  cache = defaults();
  cache.sound = keepSound;
  saveStats();
}