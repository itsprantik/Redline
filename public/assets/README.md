# Your artwork

Put PNG files in these folders. Every file is optional: if one is missing, the built-in vector art is used.
File names are listed in `src/data/assets.ts`; change them there if you name your files differently.

## cars/

- `car.png` (shared by all teams) or one file per team: `crimson.png`, `argent.png`, `ember.png`, `tempest.png`,
  `verdant.png`, `lumen.png`, `obsidian.png`, `nova.png`.
- Side view, car facing RIGHT, transparent background, cropped tightly to the car.
- Suggested size: 1200 px wide (any size works, it is scaled to 174 units on screen).
- Tyres should touch the bottom of the image, a few pixels of margin is fine. If the car floats or sinks,
  change `CAR_SPRITE.groundY` in `src/data/assets.ts`.
- `wheel.png` (optional): a square, transparent image of just the wheel. Use it only if your car PNG has no wheels
  painted on. The game spins it at the front and rear axle. Adjust axle positions in `CAR_SPRITE` if needed.

## ui/

- `logo.png`: menu logo, any width, around 120 px tall is plenty. Transparent background.

## venues/

- `dusk.png`, `night.png`, `day.png`, `alpine.png`: wide scenery strips (skyline, stands, hills).
  They are drawn 112 px tall and tile horizontally, so make the left and right edges match.
  Suggested size: 2400 x 224.