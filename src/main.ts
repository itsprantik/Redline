import './style.css';
import type { Nav, Screen } from './types';
import { attachSecrets } from './ui/eggs';
import { garageScreen, menuScreen, resultsScreen, setupScreen, statsScreen } from './ui/screens';
import { raceScreen } from './ui/raceScreen';
import { preloadAssets } from './render/sprites';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

let current: Screen | null = null;
let stopSecrets: (() => void) | null = null;

function show(screen: Screen, secrets = false): void {
  current?.dispose?.();
  stopSecrets?.();
  stopSecrets = null;
  current = screen;
  app!.replaceChildren(screen.el);
  if (secrets) stopSecrets = attachSecrets();
  window.scrollTo(0, 0);
}

const nav: Nav = {
  home: () => show(menuScreen(nav), true),
  setup: (mode) => show(setupScreen(nav, mode)),
  race: (config) => show(raceScreen(nav, config)),
  results: (result, newBest) => show(resultsScreen(nav, result, newBest)),
  garage: () => show(garageScreen(nav), true),
  stats: () => show(statsScreen(nav)),
};

preloadAssets();
nav.home(); 