/** Made-up teams, so no real livery or driver is copied. */
export interface Livery {
  id: string;
  team: string;
  primary: string;
  secondary: string;
  accent: string;
  helmet: string;
  number: string;
}

export const LIVERIES: Livery[] = [
  { id: 'crimson', team: 'Crimson Works', primary: '#d8101f', secondary: '#f3f3f6', accent: '#14151a', helmet: '#f3f3f6', number: '7' },
  { id: 'argent', team: 'Argent Motorsport', primary: '#c3c8d4', secondary: '#1a1c23', accent: '#14d4c0', helmet: '#14d4c0', number: '12' },
  { id: 'ember', team: 'Ember Racing', primary: '#ff7a00', secondary: '#14151a', accent: '#1aa6ff', helmet: '#14151a', number: '21' },
  { id: 'tempest', team: 'Tempest Dynamics', primary: '#1c2f78', secondary: '#101a47', accent: '#ffd400', helmet: '#ffd400', number: '3' },
  { id: 'verdant', team: 'Verdant GP', primary: '#0c6a50', secondary: '#07382b', accent: '#d2b866', helmet: '#d2b866', number: '15' },
  { id: 'lumen', team: 'Lumen Racing', primary: '#3da8ff', secondary: '#f1f6fb', accent: '#ff4fa3', helmet: '#ff4fa3', number: '38' },
  { id: 'obsidian', team: 'Obsidian Classic', primary: '#15161b', secondary: '#23252c', accent: '#dcb24e', helmet: '#dcb24e', number: '66' },
  { id: 'nova', team: 'Nova Works', primary: '#6a2bdc', secondary: '#e9e3ff', accent: '#00e3a4', helmet: '#00e3a4', number: '52' },
];

export const DEFAULT_LIVERY = 'crimson';

export function getLivery(id: string): Livery {
  return LIVERIES.find((l) => l.id === id) ?? LIVERIES[0];
}

export type Tyre = 'soft' | 'medium' | 'hard';

export interface TyreInfo {
  label: string;
  letter: string;
  color: string;
  /** Multiplier on top speed. */
  speed: number;
  /** Speed kept after a wrong key (lower means harsher). */
  lock: number;
  note: string;
}

export const TYRES: Record<Tyre, TyreInfo> = {
  soft: { label: 'Soft', letter: 'S', color: '#ff2f3f', speed: 1.04, lock: 0.76, note: '+4% pace, mistakes hurt more' },
  medium: { label: 'Medium', letter: 'M', color: '#ffd23f', speed: 1.0, lock: 0.82, note: 'Balanced' },
  hard: { label: 'Hard', letter: 'H', color: '#f2f2f6', speed: 0.97, lock: 0.89, note: '-3% pace, forgiving' },
};