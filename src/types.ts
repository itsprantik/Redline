import type { Tyre } from './data/liveries';
import type { VenueId, Weather } from './data/venues';

export type Mode = 'practice' | 'competition';
export type TextStyle = 'prose' | 'words' | 'radio';
export type LengthKey = 'short' | 'medium' | 'long';
export type Difficulty = 'rookie' | 'pro' | 'legend';

export interface RaceConfig {
  mode: Mode;
  style: TextStyle;
  length: LengthKey;
  difficulty: Difficulty;
  caseSensitive: boolean;
  livery: string;
  tyre: Tyre;
  venue: VenueId;
  weather: Weather;
}

export interface ClassifiedCar {
  name: string;
  color: string;
  isPlayer: boolean;
  livery: string;
  tyre: Tyre;
  /** Seconds from lights out. For cars still running when the player finished this is an estimate. */
  time: number;
  position: number;
}

export interface RaceResult {
  config: RaceConfig;
  wpm: number;
  accuracy: number;
  seconds: number;
  errors: number;
  chars: number;
  topSpeed: number;
  position: number;
  fieldSize: number;
  points: number;
  classification: ClassifiedCar[];
  eggsFound: string[];
  jumpStart: boolean;
}

export interface HistoryEntry {
  date: number;
  wpm: number;
  accuracy: number;
  mode: Mode;
  position: number;
}

export interface Stats {
  races: number;
  wins: number;
  podiums: number;
  points: number;
  bestWpm: number;
  bestAccuracy: number;
  topSpeed: number;
  eggs: string[];
  history: HistoryEntry[];
  sound: boolean;
  caseSensitive: boolean;
}

export interface Screen {
  el: HTMLElement;
  dispose?: () => void;
}

export interface Nav {
  home(): void;
  setup(mode: Mode): void;
  race(config: RaceConfig): void;
  results(result: RaceResult, newBest: boolean): void;
  garage(): void;
  stats(): void;
}