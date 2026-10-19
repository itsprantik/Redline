import type { ClassifiedCar } from '../types';
import { getLivery } from '../data/liveries';
import { drawHelmet, shade } from './car';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec - m * 60).toFixed(2).padStart(5, '0')}`;
}

/** Draws the top three on a podium, with spotlights and confetti. Static image. */
export function drawPodium(canvas: HTMLCanvasElement, cls: ClassifiedCar[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || cls.length < 3) return;
  const W = 720;
  const H = 280;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d0f18');
  bg.addColorStop(1, '#171a27');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Spotlight beams on each step.
  const order = [cls[1], cls[0], cls[2]];
  const xs = [W * 0.2, W * 0.5, W * 0.8];
  const heights = [84, 118, 62];
  xs.forEach((x) => {
    const beam = ctx.createLinearGradient(0, 0, 0, H);
    beam.addColorStop(0, 'rgba(255,245,220,0.22)');
    beam.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 10, 0);
    ctx.lineTo(x + 10, 0);
    ctx.lineTo(x + 90, H);
    ctx.lineTo(x - 90, H);
    ctx.closePath();
    ctx.fill();
  });

  // Confetti, placed with a fixed pseudo-random sequence so it never flickers.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = order.map((c) => getLivery(c.livery).accent).concat(['#ffd23f', '#ffffff', '#e10600']);
  for (let i = 0; i < 90; i++) {
    ctx.save();
    ctx.translate(rnd() * W, rnd() * (H - 40));
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.55 + rnd() * 0.4;
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.restore();
  }

  // Steps, helmets and names.
  const stepW = 190;
  const base = H - 8;
  order.forEach((car, i) => {
    const place = i === 1 ? 1 : i === 0 ? 2 : 3;
    const x = xs[i] - stepW / 2;
    const top = base - heights[i];
    const lv = getLivery(car.livery);
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, '#2d3142');
    g.addColorStop(1, '#171a26');
    ctx.fillStyle = g;
    ctx.fillRect(x, top, stepW, heights[i]);
    ctx.fillStyle = lv.primary;
    ctx.fillRect(x, top, stepW, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, top + 4, stepW, 2);

    ctx.fillStyle = shade(lv.primary, -0.1);
    ctx.font = '800 54px "Chakra Petch", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 0.9;
    ctx.fillText(String(place), xs[i], top + 56);
    ctx.globalAlpha = 1;

    ctx.fillStyle = car.isPlayer ? '#ffd23f' : '#e9ecf5';
    ctx.font = '700 15px "Chakra Petch", system-ui, sans-serif';
    ctx.fillText(car.name, xs[i], top + heights[i] - 24 < top + 70 ? top + 72 : top + heights[i] - 24);
    ctx.fillStyle = '#8f95a8';
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(place === 1 ? fmt(car.time) : `+${(car.time - cls[0].time).toFixed(2)}s`, xs[i], top + heights[i] - 8 < top + 88 ? top + 88 : top + heights[i] - 8);

    // Helmet and, for the winner, a trophy.
    drawHelmet(ctx, xs[i], top - 22, 17, lv);
    if (place === 1) {
      const tx = xs[i] + 44;
      const ty = top - 8;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(tx - 12, ty - 30);
      ctx.lineTo(tx + 12, ty - 30);
      ctx.quadraticCurveTo(tx + 12, ty - 8, tx, ty - 6);
      ctx.quadraticCurveTo(tx - 12, ty - 8, tx - 12, ty - 30);
      ctx.fill();
      ctx.fillRect(tx - 2, ty - 8, 4, 8);
      ctx.fillRect(tx - 9, ty - 1, 18, 3);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx - 13, ty - 24, 5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(tx + 13, ty - 24, 5, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();
    }
  });
}