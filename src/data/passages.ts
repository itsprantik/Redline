import type { LengthKey, TextStyle } from '../types';
import { TYPEABLE_EGGS, type Egg } from './radio';

export interface Segment {
  start: number;
  end: number;
  egg: Egg;
}

export interface Passage {
  text: string;
  /** Only used by Team Radio mode: where each quote starts and ends. */
  segments: Segment[];
}

const TARGET_WORDS: Record<LengthKey, number> = { short: 25, medium: 50, long: 90 };
const RADIO_COUNT: Record<LengthKey, number> = { short: 2, medium: 4, long: 6 };

/** Original racing sentences. Plain ASCII so every keyboard can type them. */
const SENTENCES: string[] = [
  'The lights go out and the whole grid roars into the first corner.',
  'Smooth hands win races, because every wasted movement costs a few thousandths of a second.',
  'Brake late, turn in early, and hold the throttle steady through the long right hander.',
  'A perfect lap is built from a hundred small decisions made at three hundred kilometers an hour.',
  'The engineer says the tyres are fading, but the driver finds another gear inside his mind.',
  'Rain starts to fall on the back straight and every strategy on the pit wall changes at once.',
  'Under the floodlights the cars look like sparks racing around a black ribbon of asphalt.',
  'Pit crews practice the stop until four wheels change in less time than a single deep breath.',
  'The slipstream pulls him closer, and the gap to the leader shrinks with every passing corner.',
  'A late dive down the inside is brave, but only if the exit is clean.',
  'Qualifying is a game of nerves, and the pole sitter always has the quietest garage.',
  'Chasing the checkered flag means ignoring the cramp in your hands and the roar in your ears.',
  'Every driver remembers the first time they felt the car dance on the very edge of grip.',
  'Fuel, tyres, and timing decide the result long before the final lap begins.',
  'The crowd rises as the leaders appear over the hill, side by side and still fighting.',
  'Keep your eyes far ahead, because the car will only go where you are already looking.',
  'Champions are made on dark early mornings, long before anyone is watching the race.',
  'A yellow flag waves, the field slows down, and the pack closes up like a coiled spring.',
  'Heat shimmers over the tarmac while mechanics wipe their foreheads and check the gauges.',
  'The final corner is the quickest way to lose a race or to win one.',
  'Smooth is fast, fast is smooth, and a calm mind is faster than both.',
  'He sets the fastest lap of the day and the whole garage erupts in applause.',
  'Downforce pins the car to the road, and the driver feels every bump through his spine.',
  'Turn one is a lottery, and anyone who says otherwise has never started from the middle of the grid.',
  'The mechanic tightens the last nut, steps back, and nods because the car is ready.',
  'In the tunnel the engine noise bounces off the walls and the world becomes one long scream.',
  'Weather radar shows a storm ten minutes away, and every team has a different plan.',
  'Tyre wear is a quiet enemy that eats away at your lead one lap at a time.',
  'At the hairpin he feathers the brakes, rotates the car, and rockets away in a shower of sparks.',
  'The marshal steps aside, the engines scream, and for a moment nobody breathes.',
  'Sunset paints the circuit orange while the last stint of the race begins.',
  'A clean overtake looks effortless, but it takes years of practice to make it look that easy.',
  'Never lift in the fast corners, never panic in the slow ones, and never stop pushing.',
  'The data says he is half a second quicker, but the driver says the car feels alive.',
  'Rivals share a handshake in the paddock, then spend two hours trying to beat each other.',
  'Overtaking at this track means braking later than feels sensible.',
  'Gravel traps wait for anyone who gets greedy, and the marshals are always ready.',
  'Every lap is a conversation between the driver, the car, and the road.',
  'The last ten laps feel like a hundred, and every gap on the timing screen matters.',
  'A rolling start tests patience, a standing start tests courage, and both test your reflexes.',
  'He watches the mirrors, watches the gap, and keeps his breathing calm.',
  'Pit lane speed limits are strict, but the clock still ticks as loudly as an engine.',
  'Cold tyres are slippery, hot tyres are sticky, and the best drivers know the moment between.',
  'The safety car leads the field around while the engineers argue about tyres and strategy.',
];

const WORDS: string[] = (
  'apex brake throttle clutch gearbox pit tyre grid pole lap sector chicane hairpin straight kerb paddock garage ' +
  'marshal flag podium trophy champagne qualifying strategy undercut overcut slipstream downforce wing diffuser ' +
  'halo cockpit steering engine turbo hybrid battery fuel tank radio engineer mechanic driver rookie veteran ' +
  'champion rival team sponsor livery helmet gloves visor harness seat pedal camber traction grip slide spin skid ' +
  'drift corner bend curve exit entry line racing overtake defend attack pressure tempo rhythm pace speed sprint ' +
  'finish start lights siren safety yellow green blue black checkered penalty steward protest appeal timing split ' +
  'delta gap interval leader lapped restart formation warmup softs mediums hards intermediate wet dry puddle ' +
  'spray mist sunset floodlight tunnel harbour bridge desert forest alpine coastal boost brake balance bounce ' +
  'cooling cabin carbon aero ground effect floor plank ride height stall flutter vortex kerbstone runoff gravel'
).split(' ');

function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const wordCount = (s: string): number => s.trim().split(/\s+/).length;

function buildProse(length: LengthKey): Passage {
  const target = TARGET_WORDS[length];
  const out: string[] = [];
  let count = 0;
  for (const s of shuffle(SENTENCES)) {
    if (count >= target) break;
    out.push(s);
    count += wordCount(s);
  }
  return { text: out.join(' '), segments: [] };
}

function buildWords(length: LengthKey): Passage {
  const target = TARGET_WORDS[length];
  const out: string[] = [];
  let previous = '';
  while (out.length < target) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (w === previous) continue;
    out.push(w);
    previous = w;
  }
  return { text: out.join(' '), segments: [] };
}

function buildRadio(length: LengthKey): Passage {
  const want = RADIO_COUNT[length];
  const pool: Egg[] = [];
  while (pool.length < want) pool.push(...shuffle(TYPEABLE_EGGS));
  const picked = pool.slice(0, want);
  let text = '';
  const segments: Segment[] = [];
  picked.forEach((egg, i) => {
    if (i > 0) text += ' ';
    const start = text.length;
    text += egg.text ?? '';
    segments.push({ start, end: text.length, egg });
  });
  return { text, segments };
}

export function buildPassage(style: TextStyle, length: LengthKey): Passage {
  if (style === 'words') return buildWords(length);
  if (style === 'radio') return buildRadio(length);
  return buildProse(length);
}