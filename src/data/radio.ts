/**
 * Easter eggs.
 *
 * Every egg is something you can discover: some trigger during a race, some are
 * secret words typed on the menu, some are hidden in the UI. Eggs that have a
 * `text` can also be typed in "Team Radio" mode, which unlocks after you have
 * found a few of them.
 *
 * `text` is plain ASCII on purpose so it is typeable on any keyboard.
 */
export interface Egg {
  id: string;
  title: string;
  /** Vague clue shown in the garage until the egg is found. */
  hint: string;
  /** The line you type in Team Radio mode. */
  text?: string;
  by: string;
  context: string;
  /** Secret words you can type on the menu screens to trigger it. */
  codes?: string[];
}

export const RADIO_UNLOCK_AT = 3;

export const EGGS: Egg[] = [
  {
    id: 'croft',
    title: 'Lights Out',
    hint: 'Every race begins with the same few words.',
    text: 'Lights out and away we go!',
    by: 'David Croft, Sky Sports F1',
    context: 'The start-of-race call that fans know by heart.',
    codes: ['lights'],
  },
  {
    id: 'kimi',
    title: 'The Iceman',
    hint: 'Sometimes a driver just wants to be left alone while leading.',
    text: "Leave me alone, I know what I'm doing.",
    by: 'Kimi Räikkönen',
    context: 'Abu Dhabi 2012. Said to his race engineer during a race he went on to win for Lotus.',
    codes: ['kimi', 'iceman', 'bwoah'],
  },
  {
    id: 'fernando',
    title: 'Team Orders',
    hint: 'Somebody faster is right behind you in the race.',
    text: 'Fernando is faster than you. Can you confirm you understood that message?',
    by: 'Rob Smedley to Felipe Massa',
    context: 'Ferrari, German GP 2010. Team orders were banned at the time, and the team was fined by the stewards.',
  },
  {
    id: 'valtteri',
    title: 'Let Him Through',
    hint: 'A polite first name, then a very serious second one. Trail the field.',
    text: "Valtteri, it's James.",
    by: 'James Vowles to Valtteri Bottas',
    context: 'Mercedes, Russian GP 2018. A short radio call that told Bottas to let his team mate by.',
  },
  {
    id: 'glock',
    title: 'Is That Glock?',
    hint: 'Last lap, last corner. Make a late pass.',
    text: 'Is that Glock?',
    by: 'Lewis Hamilton',
    context: 'Brazil 2008. He passed Timo Glock on the final lap and won his first world title by a single point.',
    codes: ['glock'],
  },
  {
    id: 'multi21',
    title: 'Multi 21',
    hint: 'The logo is more clickable than it looks. Five times.',
    text: 'Multi 21, Seb. Multi 21.',
    by: 'Red Bull pit wall',
    context: 'Malaysia 2013. A team order that Sebastian Vettel famously ignored.',
  },
  {
    id: 'simply',
    title: 'Simply Lovely',
    hint: 'Do not make a single mistake for forty keys in a row.',
    text: 'Simply lovely.',
    by: 'Max Verstappen',
    context: 'His trademark compliment over the radio after a lap or a move that went exactly right.',
    codes: ['simply'],
  },
  {
    id: 'tyres',
    title: 'Tyres Are Gone',
    hint: 'Mash enough wrong keys in a short time and the grip vanishes.',
    text: 'Bono, my tyres are gone.',
    by: 'Lewis Hamilton to Peter Bonnington',
    context: 'One of the most quoted radio lines in the sport, and the all-time go-to meme for fading tyres.',
    codes: ['bono'],
  },
  {
    id: 'hammer',
    title: 'Hammer Time',
    hint: 'Type like you mean it and the pit wall will shout.',
    text: "It's hammer time!",
    by: 'Peter Bonnington',
    context: "The call from Hamilton's race engineer to push flat out for the rest of the stint.",
    codes: ['hammer'],
  },
  {
    id: 'sainz',
    title: 'Smooth Operator',
    hint: 'Finish with almost no mistakes.',
    text: 'Smooth operator.',
    by: 'Carlos Sainz',
    context: 'His famous nickname, a nod to the Sade song, which suits a driver known for tidy laps.',
    codes: ['smooth', 'sainz'],
  },
  {
    id: 'webber',
    title: 'Number Two',
    hint: 'Be dead last at some point, then win the race.',
    text: 'Not bad for a number two driver.',
    by: 'Mark Webber',
    context: 'Silverstone 2010. A pointed remark over the radio after winning for Red Bull.',
    codes: ['webber'],
  },
  {
    id: 'getin',
    title: 'Get In There',
    hint: 'Win a Grand Prix against Pro or Legend rivals.',
    text: 'Get in there, Lewis!',
    by: 'Peter Bonnington',
    context: "The classic victory call from Hamilton's race engineer.",
  },
  {
    id: 'ricciardo',
    title: 'Honey Badger',
    hint: 'Say his name. Or his nickname. Or what he drinks champagne from.',
    by: 'Daniel Ricciardo',
    context:
      'Eight grand prix wins, a thousand smiles and the shoey. His last race start came at Singapore 2024, where he set the fastest lap.',
    codes: ['ricciardo', 'danny', 'danielricciardo', 'honeybadger', 'shoey', 'dannyric'],
  },
  {
    id: 'konami',
    title: 'Safety Car',
    hint: 'An old gamer secret. On the main menu.',
    by: 'Race Control',
    context: 'Safety car, safety car. Team Radio mode is now unlocked for good.',
  },
];

export function getEgg(id: string): Egg | undefined {
  return EGGS.find((e) => e.id === id);
}

/** Eggs that can be typed in Team Radio mode. */
export const TYPEABLE_EGGS: Egg[] = EGGS.filter((e): e is Egg & { text: string } => typeof e.text === 'string');