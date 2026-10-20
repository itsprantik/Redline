import type { Difficulty, LengthKey, Mode, Nav, RaceConfig, RaceResult, Screen, TextStyle } from '../types';
import { EGGS, RADIO_UNLOCK_AT } from '../data/radio';
import { audio } from '../audio';
import { ASSETS } from '../data/assets';
import { logoSprite } from '../render/sprites';
import { DEFAULT_LIVERY, getLivery, LIVERIES, TYRES, type Tyre } from '../data/liveries';
import { VENUES, type VenueId, type Weather } from '../data/venues';
import { drawPodium } from '../render/podium';
import { Showcase } from '../render/showcase';
import { eggCount, getStats, resetStats, saveStats } from '../storage';
import { fmtTime, h, ordinal } from './dom';
import { runEgg, toast } from './eggs';

const LAST_KEY = 'redline.lastConfig';

function loadConfig(mode: Mode): RaceConfig {
  const base: RaceConfig = {
    mode,
    style: 'prose',
    length: 'medium',
    difficulty: 'pro',
    caseSensitive: getStats().caseSensitive,
    livery: DEFAULT_LIVERY,
    tyre: 'medium',
    venue: 'dusk',
    weather: 'dry',
  };
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as Partial<RaceConfig>;
      return { ...base, ...prev, mode, caseSensitive: getStats().caseSensitive };
    }
  } catch {
    /* ignore */
  }
  return base;
}

export function saveConfig(c: RaceConfig): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function radioUnlocked(): boolean {
  return eggCount() >= RADIO_UNLOCK_AT || getStats().eggs.includes('konami');
}

function topBar(nav: Nav, title: string): HTMLElement {
  return h(
    'header',
    { class: 'topbar' },
    h('button', { class: 'btn ghost', onclick: () => nav.home() }, 'Menu'),
    h('h2', { class: 'topbar-title' }, title),
    h('span', {}),
  );
}

/* ------------------------------------------------------------------ */
/* Main menu                                                           */
/* ------------------------------------------------------------------ */

export function menuScreen(nav: Nav): Screen {
  const s = getStats();
  let logoClicks = 0;
  let logoTimer = 0;

  const logo = h(
    'div',
    {
      class: 'logo',
      title: 'REDLINE',
      onclick: () => {
        logoClicks++;
        window.clearTimeout(logoTimer);
        logoTimer = window.setTimeout(() => (logoClicks = 0), 1500);
        if (logoClicks >= 5) {
          logoClicks = 0;
          runEgg('multi21');
        }
      },
    },
    h('span', { class: 'logo-mark' }),
    h('span', { class: 'logo-text' }, 'RED', h('b', {}, 'LINE')),
  );

  // Optional custom logo: replaces the text logo once the PNG has loaded (see src/data/assets.ts).
  const logoImg = logoSprite();
  if (logoImg) {
    logo.replaceChildren(h('img', { class: 'logo-img', src: logoImg.src, alt: 'REDLINE' }));
  } else {
    const probe = new Image();
    probe.onload = () => logo.replaceChildren(h('img', { class: 'logo-img', src: probe.src, alt: 'REDLINE' }));
    probe.src = ASSETS.ui.logo;
  }

  const card = (cls: string, kicker: string, title: string, text: string, on: () => void) =>
    h(
      'button',
      { class: `menu-card ${cls}`, onclick: () => (audio.unlock(), on()) },
      h('span', { class: 'menu-kicker' }, kicker),
      h('span', { class: 'menu-title' }, title),
      h('span', { class: 'menu-text' }, text),
    );

  const soundBtn = h('button', { class: 'btn ghost small', 'aria-label': 'Toggle sound' }, s.sound ? 'Sound: on' : 'Sound: off');
  soundBtn.addEventListener('click', () => {
    s.sound = !s.sound;
    saveStats();
    soundBtn.textContent = s.sound ? 'Sound: on' : 'Sound: off';
    if (s.sound) audio.unlock();
  });

  const last = loadConfig('practice');
  const heroCanvas = h('canvas', { class: 'hero-canvas', 'aria-hidden': 'true' });
  const hero = new Showcase(
    heroCanvas,
    { livery: getLivery(last.livery), tyre: last.tyre, venue: last.venue, weather: last.weather },
    236,
    175,
  );
  window.setTimeout(() => hero.start(), 0);

  const el = h(
    'main',
    { class: 'screen menu' },
    h('div', { class: 'menu-top' }, logo, soundBtn),
    h('p', { class: 'tagline' }, 'Type fast. Race faster. Your fingers are the engine.'),
    h('div', { class: 'hero' }, heroCanvas, h('div', { class: 'hero-tag' }, `${getLivery(last.livery).team}  |  Car ${getLivery(last.livery).number}`)),
    h(
      'div',
      { class: 'menu-grid' },
      card('c-practice', 'FREE RUN', 'Practice', 'Solo laps. Pick the text, chase your best speed, no pressure.', () => nav.setup('practice')),
      card('c-comp', 'RACE DAY', 'Competition', 'Take on three rivals on the grid. Win points and the podium.', () => nav.setup('competition')),
      card('c-garage', 'EASTER EGGS', 'Garage', `${eggCount()} of ${EGGS.length} secrets found. Famous F1 moments and radio calls.`, () => nav.garage()),
      card('c-stats', 'CAREER', 'Stats', `Best ${s.bestWpm ? s.bestWpm.toFixed(0) : '--'} WPM. ${s.races} races, ${s.wins} wins.`, () => nav.stats()),
    ),
    h('p', { class: 'menu-foot' }, 'Tip: some words do something when you type them on this screen. Go on, try an F1 name.'),
  );
  return { el, dispose: () => hero.stop() };
}

/* ------------------------------------------------------------------ */
/* Race setup                                                          */
/* ------------------------------------------------------------------ */

interface Option<T> {
  value: T;
  label: string;
  sub?: string;
  locked?: boolean;
  /** Small colour dot shown before the label. */
  dot?: string;
}

function segmented<T extends string>(label: string, options: Option<T>[], initial: T, onPick: (v: T) => void, cls = 'seg'): HTMLElement {
  const wrap = h('div', { class: 'field' }, h('div', { class: 'field-label' }, label));
  const row = h('div', { class: cls, role: 'radiogroup', 'aria-label': label });
  const buttons: HTMLButtonElement[] = [];
  const mark = (v: T) => options.forEach((o, i) => buttons[i].classList.toggle('on', o.value === v));
  options.forEach((o) => {
    const b = h(
      'button',
      {
        class: o.locked ? 'seg-btn locked' : 'seg-btn',
        role: 'radio',
        disabled: !!o.locked,
        onclick: () => {
          mark(o.value);
          onPick(o.value);
        },
      },
      h('span', { class: 'seg-main' }, o.dot ? h('i', { class: 'dot', style: `background:${o.dot}` }) : null, o.label),
      o.sub ? h('span', { class: 'seg-sub' }, o.sub) : null,
    );
    buttons.push(b);
    row.append(b);
  });
  mark(initial);
  wrap.append(row);
  return wrap;
}

export function setupScreen(nav: Nav, mode: Mode): Screen {
  const cfg = loadConfig(mode);
  const unlocked = radioUnlocked();
  if (cfg.style === 'radio' && !unlocked) cfg.style = 'prose';

  const styles: Option<TextStyle>[] = [
    { value: 'prose', label: 'Racing prose', sub: 'Full sentences' },
    { value: 'words', label: 'Race words', sub: 'Random terms' },
    {
      value: 'radio',
      label: unlocked ? 'Team radio' : 'Team radio (locked)',
      sub: unlocked ? 'Famous quotes' : `Find ${RADIO_UNLOCK_AT} eggs`,
      locked: !unlocked,
    },
  ];
  const lengths: Option<LengthKey>[] = [
    { value: 'short', label: 'Sprint', sub: '~25 words' },
    { value: 'medium', label: 'Grand Prix', sub: '~50 words' },
    { value: 'long', label: 'Endurance', sub: '~90 words' },
  ];
  const diffs: Option<Difficulty>[] = [
    { value: 'rookie', label: 'Rookie', sub: 'Rivals ~30 WPM' },
    { value: 'pro', label: 'Pro', sub: 'Rivals ~55 WPM' },
    { value: 'legend', label: 'Legend', sub: 'Rivals ~85 WPM' },
  ];

  const caseBox = h('input', { type: 'checkbox', id: 'case' }) as HTMLInputElement;
  caseBox.checked = cfg.caseSensitive;
  caseBox.addEventListener('change', () => {
    cfg.caseSensitive = caseBox.checked;
    getStats().caseSensitive = caseBox.checked;
    saveStats();
  });

  const tyres: Option<Tyre>[] = (Object.keys(TYRES) as Tyre[]).map((k) => ({ value: k, label: TYRES[k].label, sub: TYRES[k].note, dot: TYRES[k].color }));
  const venues: Option<VenueId>[] = VENUES.map((v) => ({ value: v.id, label: v.name, sub: v.note }));
  const weathers: Option<Weather>[] = [
    { value: 'dry', label: 'Dry', sub: 'Full grip' },
    { value: 'wet', label: 'Wet', sub: 'Rain: mistakes cost more' },
  ];

  const previewCanvas = h('canvas', { class: 'preview-canvas', 'aria-hidden': 'true' });
  const preview = new Showcase(previewCanvas, { livery: getLivery(cfg.livery), tyre: cfg.tyre, venue: cfg.venue, weather: cfg.weather }, 200, 150);
  window.setTimeout(() => preview.start(), 0);
  const teamLabel = h('div', { class: 'preview-tag' }, '');
  const syncPreview = (): void => {
    const lv = getLivery(cfg.livery);
    preview.set({ livery: lv, tyre: cfg.tyre, venue: cfg.venue, weather: cfg.weather });
    teamLabel.textContent = `${lv.team}  |  Car ${lv.number}`;
  };
  syncPreview();

  const liveryRow = h('div', { class: 'liveries', role: 'radiogroup', 'aria-label': 'Livery' });
  const liveryBtns: HTMLButtonElement[] = [];
  LIVERIES.forEach((lv) => {
    const b = h(
      'button',
      {
        class: 'livery' + (lv.id === cfg.livery ? ' on' : ''),
        role: 'radio',
        title: lv.team,
        'aria-label': lv.team,
        onclick: () => {
          cfg.livery = lv.id;
          liveryBtns.forEach((x, i) => x.classList.toggle('on', LIVERIES[i].id === lv.id));
          syncPreview();
        },
      },
      h('span', { class: 'swatch', style: `background:linear-gradient(115deg, ${lv.primary} 0 55%, ${lv.secondary} 55% 80%, ${lv.accent} 80%)` }),
    );
    liveryBtns.push(b);
    liveryRow.append(b);
  });

  const start = h('button', { class: 'btn primary big', onclick: () => (audio.unlock(), saveConfig(cfg), nav.race({ ...cfg })) }, 'Go to the grid');

  const el = h(
    'main',
    { class: 'screen setup' },
    topBar(nav, mode === 'practice' ? 'Practice' : 'Competition'),
    h(
      'div',
      { class: 'panel' },
      h('p', { class: 'panel-lead' }, mode === 'practice' ? 'Warm up alone on track. Your car is as quick as your fingers.' : 'Three rivals, one chequered flag. Finish top three for the podium.'),
      h('div', { class: 'preview' }, previewCanvas, teamLabel),
      h('div', { class: 'field' }, h('div', { class: 'field-label' }, 'Livery'), liveryRow),
      segmented('Tyres', tyres, cfg.tyre, (v) => ((cfg.tyre = v), syncPreview())),
      segmented('Circuit', venues, cfg.venue, (v) => ((cfg.venue = v), syncPreview()), 'seg four'),
      segmented('Weather', weathers, cfg.weather, (v) => ((cfg.weather = v), syncPreview()), 'seg two'),
      segmented('Text', styles, cfg.style, (v) => (cfg.style = v)),
      segmented('Length', lengths, cfg.length, (v) => (cfg.length = v)),
      mode === 'competition' ? segmented('Rivals', diffs, cfg.difficulty, (v) => (cfg.difficulty = v)) : null,
      h('label', { class: 'check', for: 'case' }, caseBox, h('span', {}, 'Case sensitive (capital letters must match)')),
      start,
    ),
  );
  return { el, dispose: () => preview.stop() };
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function verdict(r: RaceResult): { title: string; sub: string } {
  if (r.config.mode === 'practice') {
    if (r.wpm >= 100) return { title: 'Blistering pace', sub: 'That would worry most of the grid.' };
    if (r.wpm >= 70) return { title: 'Quick lap', sub: 'Clean and fast. Keep going.' };
    if (r.wpm >= 40) return { title: 'Solid stint', sub: 'Good rhythm. Speed comes with practice.' };
    return { title: 'Out lap', sub: 'Warm the tyres up and try again.' };
  }
  if (r.position === 1) return { title: 'Victory', sub: 'Chequered flag. Take a bow.' };
  if (r.position === 2) return { title: 'P2', sub: 'So close. One more push next time.' };
  if (r.position === 3) return { title: 'Podium', sub: 'Third place and a trophy.' };
  return { title: 'Points missed', sub: 'Back to the garage and try again.' };
}

export function resultsScreen(nav: Nav, r: RaceResult, newBest: boolean): Screen {
  const v = verdict(r);
  const stat = (label: string, value: string, cls = '') =>
    h('div', { class: `stat ${cls}` }, h('div', { class: 'stat-val' }, value), h('div', { class: 'stat-label' }, label));

  const rows = r.config.mode === 'competition' ? r.classification : [];
  let podium: HTMLCanvasElement | null = null;
  if (rows.length >= 3) {
    podium = h('canvas', { class: 'podium', role: 'img', 'aria-label': `Podium: ${rows.slice(0, 3).map((c) => c.name).join(', ')}` });
    drawPodium(podium, rows);
  }
  const table = rows.length
    ? h(
        'div',
        { class: 'classification' },
        h('h3', {}, 'Classification'),
        ...rows.map((c, i) =>
          h(
            'div',
            { class: c.isPlayer ? 'class-row me' : 'class-row' },
            h('span', { class: 'class-pos' }, c.position),
            h('span', { class: 'class-dot', style: `background:${c.color}` }),
            h('span', { class: 'class-name' }, c.name),
            h('span', { class: 'class-time' }, i === 0 ? fmtTime(c.time) : `+${(c.time - rows[0].time).toFixed(2)}s`),
            h('span', { class: 'class-pts' }, c.position <= 4 ? `+${[25, 18, 15, 12][c.position - 1]}` : ''),
          ),
        ),
      )
    : null;

  const el = h(
    'main',
    { class: 'screen results' },
    h(
      'div',
      { class: 'panel result-panel' },
      h('div', { class: 'result-kicker' }, r.config.mode === 'competition' ? `${ordinal(r.position)} of ${r.fieldSize}` : 'Practice run'),
      h('h1', { class: 'result-title' }, v.title),
      h('p', { class: 'result-sub' }, v.sub),
      r.jumpStart ? h('p', { class: 'penalty' }, 'Jump start: your launch was delayed by 1.2 seconds.') : null,
      newBest ? h('p', { class: 'newbest' }, 'New personal best speed') : null,
      podium,
      h(
        'div',
        { class: 'stats-row' },
        stat('WPM', r.wpm.toFixed(0), 'big'),
        stat('Accuracy', `${r.accuracy.toFixed(1)}%`),
        stat('Top speed', `${r.topSpeed} km/h`),
        stat('Time', fmtTime(r.seconds)),
        stat('Mistakes', String(r.errors)),
      ),
      table,
      r.eggsFound.length
        ? h(
            'div',
            { class: 'found' },
            h('h3', {}, 'Easter eggs found this race'),
            ...r.eggsFound.map((id) => {
              const egg = EGGS.find((e) => e.id === id);
              return egg ? h('div', { class: 'found-row' }, h('b', {}, egg.title), ` - ${egg.by}`) : null;
            }),
          )
        : null,
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn primary', onclick: () => nav.race({ ...r.config }) }, 'Race again'),
        h('button', { class: 'btn', onclick: () => nav.setup(r.config.mode) }, 'Change settings'),
        h('button', { class: 'btn ghost', onclick: () => nav.home() }, 'Menu'),
      ),
    ),
  );
  return { el };
}

/* ------------------------------------------------------------------ */
/* Garage (easter egg collection)                                      */
/* ------------------------------------------------------------------ */

export function garageScreen(nav: Nav): Screen {
  const found = getStats().eggs;
  const list = h('div', { class: 'egg-grid' });
  EGGS.forEach((egg) => {
    const have = found.includes(egg.id);
    list.append(
      h(
        'div',
        { class: have ? 'egg-card found' : 'egg-card' },
        h('div', { class: 'egg-title' }, have ? egg.title : '???'),
        have
          ? h(
              'div',
              {},
              egg.text ? h('div', { class: 'egg-quote' }, `"${egg.text}"`) : null,
              h('div', { class: 'egg-by' }, egg.by),
              h('div', { class: 'egg-ctx' }, egg.context),
            )
          : h('div', { class: 'egg-hint' }, egg.hint),
      ),
    );
  });
  const el = h(
    'main',
    { class: 'screen garage' },
    topBar(nav, 'Garage'),
    h('p', { class: 'panel-lead center' }, `${found.length} of ${EGGS.length} found. Hints tell you how. Find ${RADIO_UNLOCK_AT} to unlock Team Radio mode.`),
    list,
  );
  return { el };
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

function spark(values: number[]): SVGElement {
  const w = 320;
  const ht = 90;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
  svg.setAttribute('class', 'spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Recent WPM trend');
  if (values.length < 2) return svg;
  const max = Math.max(...values, 10);
  const min = Math.min(...values, max - 10);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 10) + 5).toFixed(1)},${(ht - 8 - ((v - min) / (max - min || 1)) * (ht - 16)).toFixed(1)}`);
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', pts.join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#ff3b30');
  line.setAttribute('stroke-width', '2.5');
  line.setAttribute('stroke-linejoin', 'round');
  svg.append(line);
  return svg;
}

export function statsScreen(nav: Nav): Screen {
  const s = getStats();
  const stat = (label: string, value: string) =>
    h('div', { class: 'stat' }, h('div', { class: 'stat-val' }, value), h('div', { class: 'stat-label' }, label));

  const recent = s.history.slice(-20);
  const reset = h('button', { class: 'btn ghost small danger' }, 'Reset career');
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Tap again to erase stats and eggs';
      window.setTimeout(() => {
        armed = false;
        reset.textContent = 'Reset career';
      }, 3000);
      return;
    }
    resetStats();
    toast('Career reset');
    nav.stats();
  });

  const el = h(
    'main',
    { class: 'screen stats' },
    topBar(nav, 'Career'),
    h(
      'div',
      { class: 'panel' },
      h(
        'div',
        { class: 'stats-row' },
        stat('Races', String(s.races)),
        stat('Wins', String(s.wins)),
        stat('Podiums', String(s.podiums)),
        stat('Points', String(s.points)),
      ),
      h(
        'div',
        { class: 'stats-row' },
        stat('Best WPM', s.bestWpm ? s.bestWpm.toFixed(0) : '--'),
        stat('Best accuracy', s.bestAccuracy ? `${s.bestAccuracy.toFixed(1)}%` : '--'),
        stat('Top speed', s.topSpeed ? `${s.topSpeed} km/h` : '--'),
        stat('Eggs', `${s.eggs.length}/${EGGS.length}`),
      ),
      h('h3', {}, 'Last races (WPM)'),
      recent.length > 1 ? spark(recent.map((r) => r.wpm)) : h('p', { class: 'muted' }, 'Race a few times to see your trend.'),
      reset,
    ),
  );
  return { el };
}