import { ASSETS } from '../data/assets';

type Entry = { img: HTMLImageElement; state: 'loading' | 'ok' | 'fail' };

const cache = new Map<string, Entry>();

/** Returns the image once it has loaded, otherwise null. Starts loading on first request. Never throws. */
export function getImage(url: string | undefined): HTMLImageElement | null {
  if (!url) return null;
  let entry = cache.get(url);
  if (!entry) {
    const img = new Image();
    entry = { img, state: 'loading' };
    const e = entry;
    img.onload = () => {
      e.state = 'ok';
    };
    img.onerror = () => {
      e.state = 'fail';
    };
    img.src = url;
    cache.set(url, entry);
  }
  return entry.state === 'ok' ? entry.img : null;
}

/** Car body image for a livery, falling back to the shared car image. Null means "use vector art". */
export function carSprite(liveryId: string): HTMLImageElement | null {
  return getImage(ASSETS.cars.byLivery[liveryId]) ?? getImage(ASSETS.cars.fallback);
}

export function wheelSprite(): HTMLImageElement | null {
  return getImage(ASSETS.cars.wheel);
}

export function venueSprite(venueId: string): HTMLImageElement | null {
  return getImage(ASSETS.venues[venueId]);
}

export function logoSprite(): HTMLImageElement | null {
  return getImage(ASSETS.ui.logo);
}

/** Start loading everything early so images are ready by the time a race begins. */
export function preloadAssets(): void {
  getImage(ASSETS.cars.fallback);
  getImage(ASSETS.cars.wheel);
  getImage(ASSETS.ui.logo);
  Object.values(ASSETS.cars.byLivery).forEach(getImage);
  Object.values(ASSETS.venues).forEach(getImage);
}