import type { Nav, RaceConfig, Screen } from '../types';
import { buildPassage } from '../data/passages';
import { getEgg } from '../data/radio';
import { Race, type RaceEvent } from '../game/race';
import { gearFor, MAX_KMH, rpmFor } from '../game/physics';
import { Scene } from '../render/scene';
import { audio } from '../audio';
import { TYRES } from '../data/liveries';
import { recordResult } from '../storage';
import { h, setText } from './dom';
import { revealEgg, showRadio, toast } from './eggs';

/** Pick a few words of context to keep the cursor in view on small screens. */
function buildChars(text: string, host: HTMLElement): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = [];
  const words = text.split(' ');
  words.forEach((word, wi) => {
    const wordEl = h('span', { class: 'word' });
    for (const ch of word) {
      const s = h('span', { class: 'ch' }, ch);
      spans.push(s);
      wordEl.append(s);
    }
    if (wi < words.length - 1) {
      const sp = h('span', { class: 'ch space' }, ' ');
      spans.push(sp);
      wordEl.append(sp);
    }
    host.append(wordEl);
  });
  return spans;
}

export function raceScreen(nav: Nav, config: RaceConfig): Screen {
  const passage = buildPassage(config.style, config.length);
  const found: string[] = [];
  let finished = false;
  let leaving = false;
  let raf = 0;
  let last = performance.now();
  let lastTick = 0;
  let prevLit = -1;
  let cursorIdx = 0;
  let lastTower = 0;

  const onEvent = (e: RaceEvent): void => {
    switch (e.type) {
      case 'lights':
        setLights(e.lit);
        if (e.lit > 0) audio.light();
        break;
      case 'go':
        audio.go();
        banner.textContent = 'GO GO GO';
        banner.classList.add('show');
        window.setTimeout(() => banner.classList.remove('show'), 900);
        audio.startEngine();
        break;
      case 'jumpstart':
        toast('Jump start! 1.2 second penalty');
        audio.error();
        break;
      case 'ok': {
        const now = performance.now();
        if (now - lastTick > 45) {
          audio.tick();
          lastTick = now;
        }
        break;
      }
      case 'error':
        audio.error();
        flash();
        break;
      case 'drs':
        drsCell.classList.toggle('on', e.on);
        if (e.on) toast('DRS open: keep the streak alive');
        break;
      case 'overtake':
        toast(`You passed ${e.passed}`);
        break;
      case 'overtaken':
        toast(`${e.by} got past`);
        break;
      case 'egg': {
        const isNew = revealEgg(e.id);
        if (isNew) found.push(e.id);
        break;
      }
      case 'segment': {
        const egg = passage.segments[e.index]?.egg;
        if (egg) {
          const isNew = revealEgg(egg.id);
          if (isNew) found.push(egg.id);
        }
        break;
      }
      case 'finish':
        finishRace();
        break;
    }
  };

  const race = new Race(config, passage, onEvent);

  /* --- DOM --- */
  const lampEls = Array.from({ length: 5 }, () => h('span', { class: 'lamp' }));
  const lights = h('div', { class: 'lights' }, ...lampEls);
  const banner = h('div', { class: 'banner' }, '');
  const canvas = h('canvas', { class: 'scene', 'aria-hidden': 'true' });

  const vSpeed = h('div', { class: 'hud-val speed' }, '0');
  const vGear = h('div', { class: 'hud-val' }, 'N');
  const vWpm = h('div', { class: 'hud-val' }, '0');
  const vAcc = h('div', { class: 'hud-val' }, '100%');
  const vPos = h('div', { class: 'hud-val' }, 'P1');
  const hudCell = (label: string, val: HTMLElement) => h('div', { class: 'hud-cell' }, val, h('div', { class: 'hud-label' }, label));

  const drsCell = h('div', { class: 'hud-cell drs-cell' }, h('div', { class: 'hud-val drs-val' }, 'DRS'), h('div', { class: 'hud-label' }, 'FLAP'));
  const tyreInfo = TYRES[config.tyre];
  const tyreCell = h(
    'div',
    { class: 'hud-cell' },
    h('div', { class: 'tyre-badge', style: `--c:${tyreInfo.color}` }, tyreInfo.letter),
    h('div', { class: 'hud-label' }, tyreInfo.label.toUpperCase()),
  );

  const hud = h(
    'div',
    { class: 'hud' },
    hudCell('KM/H', vSpeed),
    hudCell('GEAR', vGear),
    hudCell('WPM', vWpm),
    hudCell('ACC', vAcc),
    config.mode === 'competition' ? hudCell('POS', vPos) : null,
    tyreCell,
    drsCell,
  );
  const leds = Array.from({ length: 15 }, (_, i) => h('span', { class: `led ${i < 5 ? 'g' : i < 10 ? 'r' : 'b'}` }));
  const rpm = h('div', { class: 'shift', 'aria-hidden': 'true' }, ...leds);

  // Compact timing tower (competition only).
  const tower = h('div', { class: 'tower', 'aria-label': 'Race order' });
  const towerRows = new Map<string, { row: HTMLElement; pos: HTMLElement; gap: HTMLElement }>();
  if (config.mode === 'competition') {
    race.cars.forEach((car) => {
      const pos = h('span', { class: 't-pos' }, '');
      const gap = h('span', { class: 't-gap' }, '');
      const short = car.isPlayer ? 'YOU' : (car.name.split(' ').pop() ?? car.name).slice(0, 3).toUpperCase();
      const row = h(
        'div',
        { class: car.isPlayer ? 't-row me' : 't-row' },
        pos,
        h('span', { class: 't-chip', style: `background:${car.livery.primary}` }),
        h('span', { class: 't-name' }, short),
        h('span', { class: 't-tyre', style: `background:${TYRES[car.tyre].color}` }),
        gap,
      );
      towerRows.set(car.id, { row, pos, gap });
      tower.append(row);
    });
  }

  const textBox = h('div', { class: 'typebox', tabindex: '0', 'aria-label': 'Typing text' });
  const spans = buildChars(passage.text, textBox);
  spans[0]?.classList.add('cur');
  const prog = h('div', { class: 'prog-fill' });
  const hint = h('div', { class: 'type-hint' }, 'Wait for the lights to go out, then start typing. Wrong keys lock your brakes.');

  const mobileInput = h('input', {
    class: 'ghost-input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    'aria-label': 'Type here',
  }) as HTMLInputElement;

  const el = h(
    'main',
    { class: 'screen race' },
    h(
      'div',
      { class: 'race-head' },
      h('button', { class: 'btn ghost small', onclick: () => leave(() => nav.home()) }, 'Quit'),
      lights,
      h('button', { class: 'btn ghost small', onclick: () => leave(() => nav.race({ ...config })) }, 'Restart'),
    ),
    banner,
    h('div', { class: 'scene-wrap' }, canvas),
    hud,
    rpm,
    config.mode === 'competition' ? tower : null,
    h('div', { class: 'prog' }, prog),
    textBox,
    hint,
    mobileInput,
  );

  const scene = new Scene(canvas, race.cars.length, config.venue, config.weather);

  function setLights(n: number): void {
    if (n === prevLit) return;
    prevLit = n;
    lampEls.forEach((l, i) => l.classList.toggle('on', i < n));
  }

    function flash(): void {
    textBox.classList.remove('bad');
    void textBox.offsetWidth;
    textBox.classList.add('bad');
    const missed = spans[race.session.pos];
    if (missed) {
      missed.classList.add('err');
      window.setTimeout(() => missed.classList.remove('err'), 160);
    }
  }

  function leave(go: () => void): void {
    if (leaving) return;
    leaving = true;
    go();
  }

  function finishRace(): void {
    if (finished) return;
    finished = true;
    audio.finish();
    banner.textContent = 'CHEQUERED FLAG';
    banner.classList.add('show', 'flag');
    window.setTimeout(() => {
      const r = race.result;
      if (!r || leaving) return;
      r.eggsFound = [...found];
      const { newBestWpm } = recordResult(r);
      leaving = true;
      nav.results(r, newBestWpm);
    }, 1900);
  }

  /* --- input --- */
  const onKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      leave(() => nav.home());
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      leave(() => nav.race({ ...config }));
      return;
    }
    if (e.key.length !== 1) return;
    // Stop the focused hidden input from also firing an input event for this key (it would count twice).
    e.preventDefault();
    race.press(e.key);
    updateText();
  };
  window.addEventListener('keydown', onKey);

  // Soft keyboards do not always send reliable keydown events, so also listen for input.
  mobileInput.addEventListener('input', () => {
    const v = mobileInput.value;
    mobileInput.value = '';
    for (const ch of v) race.press(ch);
    updateText();
  });
  const focusInput = (): void => mobileInput.focus({ preventScroll: true });
  textBox.addEventListener('pointerdown', focusInput);
  window.setTimeout(focusInput, 50);

  const onResize = (): void => scene.resize();
  window.addEventListener('resize', onResize);
  window.setTimeout(onResize, 0);

    function updateText(): void {
    const pos = race.session.pos;
    while (cursorIdx < pos) {
      spans[cursorIdx].classList.remove('cur');
      spans[cursorIdx].classList.add('ok');
      cursorIdx++;
    }
    const cur = spans[pos];
    if (cur) {
      cur.classList.add('cur');
      followCursor(cur);
    }
    prog.style.width = `${(race.session.progress * 100).toFixed(1)}%`;
    if (race.phase === 'racing' && hint.textContent) hint.textContent = '';
  }

  /** Keeps the current letter on the middle of the three visible lines. */
  function followCursor(cur: HTMLElement): void {
    if (textBox.scrollHeight <= textBox.clientHeight) return;
    const box = textBox.getBoundingClientRect();
    const c = cur.getBoundingClientRect();
    const style = getComputedStyle(textBox);
    const padTop = parseFloat(style.paddingTop) || 0;
    const lineH = parseFloat(style.lineHeight) || c.height || 32;
    // Position of the cursor line inside the scrolling content, and inside the visible window.
    const absTop = c.top - box.top + textBox.scrollTop - padTop;
    const visibleTop = absTop - textBox.scrollTop;
    if (visibleTop > lineH * 1.5 || visibleTop < -1) {
      textBox.scrollTop = Math.max(0, absTop - lineH);
    }
  }

  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    race.update(dt);
    scene.render(race, dt);

    const sp = race.speed.speed;
    const gear = race.phase === 'countdown' ? 0 : gearFor(sp);
    setText(vSpeed, String(Math.round(sp)));
    setText(vGear, gear === 0 || sp < 2 ? 'N' : String(gear));
    setText(vWpm, String(Math.round(race.phase === 'racing' ? race.wpm : race.session.avgWpm(race.raceTime * 1000))));
    setText(vAcc, `${Math.round(race.session.accuracy)}%`);
    setText(vPos, `P${race.position}`);
    const r = race.phase === 'countdown' ? 0.12 : rpmFor(sp);
    const lit = race.phase === 'countdown' ? 0 : Math.round(r * 15);
    for (let i = 0; i < leds.length; i++) leds[i].classList.toggle('on', i < lit);
    rpm.classList.toggle('flash', r > 0.93 && race.phase === 'racing');
    if (config.mode === 'competition' && now - lastTower > 120) {
      lastTower = now;
      const order = race.ranking();
      const leader = order[0];
      order.forEach((car, i) => {
        const t = towerRows.get(car.id);
        if (!t) return;
        setText(t.pos, String(i + 1));
        setText(t.gap, i === 0 ? 'LEAD' : `+${race.gapToLeader(car, leader).toFixed(1)}`);
        if (tower.children[i] !== t.row) tower.insertBefore(t.row, tower.children[i] ?? null);
      });
    }
    audio.setEngine(r, Math.min(1, sp / MAX_KMH));

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // A quote egg could also be revealed straight away when its radio is the first line.
  void getEgg;
  void showRadio;

  return {
    el,
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      audio.stopEngine();
    },
  };
}