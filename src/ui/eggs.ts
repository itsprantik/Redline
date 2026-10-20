import { EGGS, getEgg, type Egg } from '../data/radio';
import { audio } from '../audio';
import { markEgg } from '../storage';
import { h } from './dom';

let layer: HTMLElement | null = null;
let radioTimer = 0;
let toastTimer = 0;

function ensureLayer(): HTMLElement {
  if (!layer) {
    layer = h('div', { class: 'overlay-layer' });
    document.body.append(layer);
  }
  return layer;
}

/** Small message at the bottom of the screen. */
export function toast(message: string): void {
  const l = ensureLayer();
  l.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast' }, message);
  l.append(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), 2600);
}

/** The "team radio" popup in the top right corner. */
export function showRadio(egg: Egg, isNew: boolean): void {
  const l = ensureLayer();
  l.querySelector('.radio')?.remove();
  const el = h(
    'div',
    { class: isNew ? 'radio radio-new' : 'radio' },
    h(
      'div',
      { class: 'radio-head' },
      h('span', { class: 'radio-dot' }),
      'TEAM RADIO',
      isNew ? h('span', { class: 'radio-tag' }, 'EASTER EGG FOUND') : null,
    ),
    h('div', { class: 'radio-quote' }, egg.text ? `"${egg.text}"` : egg.title),
    h('div', { class: 'radio-by' }, egg.by),
    h('div', { class: 'radio-ctx' }, egg.context),
  );
  l.append(el);
  audio.radio();
  window.clearTimeout(radioTimer);
  radioTimer = window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 400);
  }, 6000);
}

/** Marks an egg as found and shows its radio message. Returns true if it was new. */
export function revealEgg(id: string): boolean {
  const egg = getEgg(id);
  if (!egg) return false;
  const isNew = markEgg(id);
  showRadio(egg, isNew);
  return isNew;
}

function shake(): void {
  document.body.classList.add('shake');
  window.setTimeout(() => document.body.classList.remove('shake'), 650);
}

function onEscape(close: () => void): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

/** A simple racing boot drawn as SVG, used for the shoey rain. */
function bootIcon(): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M9 3h9v12c0 3 2 4 5 5l6 2c2 .7 3 1.7 3 3.5V28H3V3z');
  path.setAttribute('fill', '#ffd23f');
  path.setAttribute('stroke', '#0b0c10');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linejoin', 'round');
  const sole = document.createElementNS(ns, 'rect');
  sole.setAttribute('x', '3');
  sole.setAttribute('y', '26');
  sole.setAttribute('width', '29');
  sole.setAttribute('height', '3');
  sole.setAttribute('fill', '#0b0c10');
  svg.append(path, sole);
  return svg;
}

/** Full screen thank-you for Daniel Ricciardo, with raining shoeys. */
function tribute(isNew: boolean): void {
  const l = ensureLayer();
  if (l.querySelector('.tribute')) return;
  const boots = Array.from({ length: 26 }, () =>
    h(
      'span',
      {
        class: 'boot',
        style:
          `left:${(Math.random() * 100).toFixed(1)}%;` +
          `animation-delay:${(Math.random() * 2.5).toFixed(2)}s;` +
          `animation-duration:${(3 + Math.random() * 2.5).toFixed(2)}s;` +
          `font-size:${Math.round(22 + Math.random() * 22)}px`,
      },
      bootIcon(),
    ),
  );
  let stopEsc = () => {};
  const close = () => {
    stopEsc();
    box.remove();
  };
  const box = h(
    'div',
    { class: 'tribute', role: 'dialog', 'aria-label': 'Tribute to Daniel Ricciardo' },
    ...boots,
    h(
      'div',
      { class: 'tribute-card' },
      h('div', { class: 'tribute-kicker' }, isNew ? 'EASTER EGG FOUND' : 'EASTER EGG'),
      h('h2', {}, 'Thank you, Danny Ric'),
      h('p', {}, 'The Honey Badger. Eight grand prix wins, countless overtakes and one very questionable drinking habit.'),
      h(
        'p',
        {},
        'Singapore 2024 was his last race start. He finished 18th and still set the fastest lap of the race. ' +
          'What a way to sign off.',
      ),
      h('p', { class: 'tribute-sign' }, 'Keep smiling, mate.'),
      h('button', { class: 'btn primary', onclick: close }, 'Back to the grid'),
    ),
  );
  l.append(box);
  stopEsc = onEscape(close);
  audio.finish();
}

/** Yellow flag screen for the Konami code. */
function safetyCar(isNew: boolean): void {
  const l = ensureLayer();
  l.querySelector('.safety')?.remove();
  const el = h(
    'div',
    { class: 'safety' },
    h('div', { class: 'safety-title' }, 'SAFETY CAR'),
    h('div', { class: 'safety-sub' }, isNew ? 'Konami code accepted. Team Radio mode unlocked.' : 'Konami code accepted.'),
  );
  l.append(el);
  audio.radio();
  window.setTimeout(() => el.classList.add('out'), 3200);
  window.setTimeout(() => el.remove(), 3700);
}

/** Five red lights, then lights out. */
function lightsSequence(egg: Egg, isNew: boolean): void {
  const l = ensureLayer();
  if (l.querySelector('.lights-egg')) return;
  const lamps = Array.from({ length: 5 }, () => h('span', { class: 'lamp' }));
  const el = h('div', { class: 'lights-egg' }, h('div', { class: 'lamps' }, ...lamps));
  l.append(el);
  lamps.forEach((lamp, i) =>
    window.setTimeout(() => {
      lamp.classList.add('on');
      audio.light();
    }, 400 + i * 500),
  );
  window.setTimeout(() => {
    lamps.forEach((lamp) => lamp.classList.remove('on'));
    audio.go();
    showRadio(egg, isNew);
  }, 400 + 5 * 500 + 700);
  window.setTimeout(() => el.remove(), 400 + 5 * 500 + 1400);
}

/** Runs an egg from the menu, including its special effect. */
export function runEgg(id: string): void {
  const egg = getEgg(id);
  if (!egg) return;
  const isNew = markEgg(id);
  switch (id) {
    case 'ricciardo':
      tribute(isNew);
      break;
    case 'konami':
      safetyCar(isNew);
      break;
    case 'croft':
      lightsSequence(egg, isNew);
      break;
    case 'hammer':
      shake();
      showRadio(egg, isNew);
      break;
    default:
      showRadio(egg, isNew);
  }
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Listens for secret words and the Konami code. Returns a cleanup function. */
export function attachSecrets(): () => void {
  let buffer = '';
  let konamiIdx = 0;
  const onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        runEgg('konami');
      }
    } else {
      konamiIdx = key === KONAMI[0] ? 1 : 0;
    }

    if (e.key.length !== 1) return;
    buffer = (buffer + key).slice(-24);
    for (const egg of EGGS) {
      for (const code of egg.codes ?? []) {
        if (buffer.endsWith(code)) {
          buffer = '';
          runEgg(egg.id);
          return;
        }
      }
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}