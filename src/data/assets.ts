/**
 * Your own artwork goes here.
 *
 * Drop PNG files into /public/assets/... (see public/assets/README.md for sizes), then make sure the paths below
 * match your file names. A missing file is simply ignored and the built-in vector art is drawn instead, so you
 * can add images one at a time.
 *
 * Paths are relative to the site root (no leading slash) so they also work when the app is hosted in a sub folder.
 */
export const ASSETS = {
  cars: {
    /** Used for every livery that has no entry in `byLivery`. */
    fallback: 'assets/cars/car.png',
    /** One image per team: keys are livery ids from src/data/liveries.ts. */
    byLivery: {
      crimson: 'assets/cars/crimson.png',
      argent: 'assets/cars/argent.png',
      ember: 'assets/cars/ember.png',
      tempest: 'assets/cars/tempest.png',
      verdant: 'assets/cars/verdant.png',
      lumen: 'assets/cars/lumen.png',
      obsidian: 'assets/cars/obsidian.png',
      nova: 'assets/cars/nova.png',
    } as Record<string, string>,
    /**
     * Optional. If your car PNG has NO wheels painted on it, provide a wheel image here and the game spins it at
     * both axles. Leave the file out if the wheels are already part of the car image.
     */
    wheel: 'assets/cars/wheel.png',
  },
  ui: {
    /** Menu logo. Falls back to the built-in text logo. */
    logo: 'assets/ui/logo.png',
  },
  /** Optional wide background strip per circuit (drawn as the scrolling scenery behind the barriers). */
  venues: {
    dusk: 'assets/venues/dusk.png',
    night: 'assets/venues/night.png',
    day: 'assets/venues/day.png',
    alpine: 'assets/venues/alpine.png',
  } as Record<string, string>,
} as const;

/**
 * How a car PNG is placed. The game's car is 174 units long (a unit is about 3.5 cm), facing right.
 * If your image does not line up, change these numbers; nothing else needs touching.
 */
export const CAR_SPRITE = {
  /** On-screen length of the whole image, in car units. */
  length: 174,
  /** Where the tyres touch the ground, as a fraction of image height measured from the TOP (1 = bottom edge). */
  groundY: 0.97,
  /** Horizontal centre of the car in the image, as a fraction of image width (0.5 = middle). */
  centerX: 0.5,
  /** Axle positions in car units from the centre, and wheel radius. Only used when `cars.wheel` exists. */
  frontAxleX: 52,
  rearAxleX: -50,
  axleHeight: 10.4,
  wheelRadius: 10.4,
} as const;