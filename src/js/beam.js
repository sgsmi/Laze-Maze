// beam.js

import { getCellDimensions }    from './utils.js';
import { currentLevels,
         currentLevel,
         nearMissCount,
         updateSidebarMetrics }         from './index.js';
import { getLevelDims }        from './levels.js';


// Beam travel speed in pixels per millisecond
const BEAM_SPEED = 0.4;

const nearMissesSeen = new Set();

let segmentsCache = null;
let travelDist    = 0;
let lastTimestamp = 0;
let animating     = true;

// rebuild this each frame to only include the cells under the beam
const visitedCells = new Set();

export function setAnimating(val) {
  animating = val;
}

export function resetBeam() {
  segmentsCache = null;
  travelDist    = 0;
  lastTimestamp = 0;
  visitedCells.clear();
  nearMissesSeen.clear();
}

export function getVisitedCells() {
  return new Set(visitedCells);
}

export function syncCanvasSize(canvas) {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

// trace one straight‐line segment (unchanged)
function traceOneSegment(r, c, dr, dc, rows, cols, cw, ch, canvas) {
  const sx = (c + 0.5) * cw, sy = (r + 0.5) * ch;
  let hr = r, hc = c, type = 'empty';

  while (hr >= 0 && hr < rows && hc >= 0 && hc < cols) {
    const cell = document.querySelector(
      `#grid .cell[data-row="${hr}"][data-col="${hc}"]`
    );
    type = cell ? cell.dataset.type : 'empty';
    if (type !== 'empty' && type !== 'start') break;
    hr += dr; hc += dc;
  }

  let ex, ey, er = hr, ec = hc;
  if (type === 'empty') {
    er = hr - dr; ec = hc - dc;
    if (dr ===  1)      { ex = sx;           ey = canvas.height; }
    else if (dr === -1) { ex = sx;           ey = 0;            }
    else if (dc ===  1) { ex = canvas.width; ey = sy;           }
    else                { ex = 0;            ey = sy;           }
  } else if (type === 'wall') {
    if (dr ===  1)      { ex = sx;            ey = er * ch;    }
    else if (dr === -1) { ex = sx;            ey = (er+1)*ch;  }
    else if (dc ===  1) { ex = ec * cw;       ey = sy;         }
    else                { ex = (ec+1)*cw;     ey = sy;         }
  } else {
    // mirror, portal, bomb, target, filter
    ex = (ec + 0.5) * cw;
    ey = (er + 0.5) * ch;
  }

  const length = Math.hypot(ex - sx, ey - sy);
  return { sx, sy, ex, ey, length, type, er, ec, triggered: false };
}

// compute the full path including mirrors & portals (unchanged)
function computeSegments(ctx, rows, cols) {
  const canvas = ctx.canvas;
  const { cellWidth: cw, cellHeight: ch } = getCellDimensions(canvas, cols, rows);
  const startEl = document.querySelector('#grid .cell[data-type="start"]');
  if (!startEl) return [];

  let r = +startEl.dataset.row, c = +startEl.dataset.col;
  let dr = 0, dc = 0;
  switch (startEl.dataset.direction) {
    case 'D': dr =  1; break;
    case 'U': dr = -1; break;
    case 'R': dc =  1; break;
    case 'L': dc = -1; break;
    default:  dr =  1;
  }

  const segs = [];
  let overrideStart = null;
  const maxBounces = rows * cols;
  for (let i = 0; i < maxBounces; i++) {
    const seg = traceOneSegment(r, c, dr, dc, rows, cols, cw, ch, canvas);

    if (overrideStart) {
      seg.sx     = overrideStart.x;
      seg.sy     = overrideStart.y;
      const dx   = seg.ex - seg.sx, dy = seg.ey - seg.sy;
      seg.length = Math.hypot(dx, dy);
      overrideStart = null;
    }

    segs.push(seg);

    // mirror?
    if (seg.type === 'mirror-slash' || seg.type === 'mirror-backslash') {
      [dr, dc] = seg.type === 'mirror-slash'
        ? [-dc, -dr]
        : [ dc,  dr ];
      overrideStart = { x: seg.ex, y: seg.ey };
      r = seg.er + dr; c = seg.ec + dc;
      continue;
    }

    // portal?
    if (seg.type === 'portal') {
      const thisId = document
        .querySelector(
          `#grid .cell[data-row="${seg.er}"][data-col="${seg.ec}"]`
        )
        .dataset.portalId;
      const other = Array.from(
        document.querySelectorAll(
          `#grid .cell[data-type="portal"][data-portal-id="${thisId}"]`
        )
      ).find(el =>
        +el.dataset.row !== seg.er ||
        +el.dataset.col !== seg.ec
      );
      if (other) {
        const or = +other.dataset.row, oc = +other.dataset.col;
        const cx = (oc + 0.5) * cw, cy = (or + 0.5) * ch;
        overrideStart = { x: cx, y: cy };
        r = or + dr; c = oc + dc;
        continue;
      }
      break;
    }

    // stop on wall, target, bomb, filter…
    break;
  }

  return segs;
}

// computeCommonLength and updateBeamOnMapChange unchanged…
function computeCommonLength(oldSegs, newSegs) {
  let acc = 0, n = Math.min(oldSegs.length, newSegs.length);
  for (let i = 0; i < n; i++) {
    const o    = oldSegs[i], nseg = newSegs[i];
    const dxo  = o.ex - o.sx, dyo = o.ey - o.sy;
    const dxn  = nseg.ex - nseg.sx, dyn = nseg.ey - nseg.sy;
    if (Math.sign(dxo)!==Math.sign(dxn) || Math.sign(dyo)!==Math.sign(dyn))
      break;
    acc += Math.min(o.length, nseg.length);
  }
  return acc;
}

export function updateBeamOnMapChange() {
  if (!segmentsCache) return resetBeam();
  const newSegs = computeSegments(
    segmentsCache.ctx, segmentsCache.rows, segmentsCache.cols
  );
  const common  = computeCommonLength(segmentsCache.list, newSegs);
  travelDist    = common;
  segmentsCache = { ...segmentsCache, list: newSegs };
}

// ——— main animation loop ———
export function animateBeam(ctx) {
  // 1) resize canvas
  syncCanvasSize(ctx.canvas);

  // 2) figure out which level & its dimensions
  const { rows, cols } = getLevelDims(currentLevels[currentLevel]);
  const canvas = ctx.canvas;
  const { cellWidth: cw, cellHeight: ch } = getCellDimensions(canvas, cols, rows);

  // 3) clear out old visited cells & recompute segments
  visitedCells.clear();
  const fresh = computeSegments(ctx, rows, cols);
  if (!segmentsCache ||
      fresh.length !== segmentsCache.list.length ||
      fresh.some((s,i) =>
        Math.abs(s.length - segmentsCache.list[i].length) > 0.1
      )
  ) {
    segmentsCache = { ctx, rows, cols, list: fresh };
    travelDist    = 0;
  }

  // 4) advance beam
  const now = performance.now();
  const dt  = lastTimestamp ? now - lastTimestamp : 0;
  lastTimestamp = now;
  travelDist += BEAM_SPEED * dt;

  // 5) draw preview (faint)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.lineWidth   = 2;
  ctx.strokeStyle = 'rgba(0,200,255,0.2)';
  for (const s of segmentsCache.list) {
    ctx.moveTo(s.sx, s.sy);
    ctx.lineTo(s.ex, s.ey);
  }
  ctx.stroke();

  // 6) draw actual beam with moving “bumps”
  if (animating) {
    let acc = 0;
    ctx.save();
    ctx.lineWidth   = 6;
    ctx.strokeStyle = '#0ff';
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#0ff';
    ctx.beginPath();
    for (const seg of segmentsCache.list) {
      if (travelDist <= acc) break;
      const drawLen = Math.min(seg.length, travelDist - acc);
      const f       = drawLen / seg.length;
      const mx      = seg.sx + (seg.ex - seg.sx) * f;
      const my      = seg.sy + (seg.ey - seg.sy) * f;
      ctx.moveTo(seg.sx, seg.sy);
      ctx.lineTo(mx, my);

      const sampleStep = Math.min(cw, ch) * 0.5;
      const samples    = Math.ceil(drawLen / sampleStep);
      for (let i = 0; i <= samples; i++) {
        const t2 = (i / samples) * f;
        const x2 = seg.sx + (seg.ex - seg.sx) * t2;
        const y2 = seg.sy + (seg.ey - seg.sy) * t2;
        const r  = Math.floor(y2 / ch),
              c  = Math.floor(x2 / cw);
        visitedCells.add(`${r},${c}`);
      }

      // check neighbors for near-miss bombs
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = rows + dr, nc = cols + dc;
          const neighbor = document.querySelector(
            `#grid .cell[data-row="${nr}"][data-col="${nc}"]`
          );
          if (neighbor?.dataset.type === 'bomb') {
            const key = `${nr},${nc}`;
            if (!nearMissesSeen.has(key)) {
              nearMissCount++;
              nearMissesSeen.add(key);
              updateSidebarMetrics();
            }
          }
        }
      }

      // trigger hits
      if (!seg.triggered && travelDist >= acc + seg.length - 1e-3) {
        seg.triggered = true;
        window.dispatchEvent(new CustomEvent('cell-hit', {
          detail: { type: seg.type, row: seg.er, col: seg.ec }
        }));
      }
      acc += seg.length;
    }
    ctx.stroke();
    ctx.restore();

    // moving bumps (unchanged)
    const totalLen = segmentsCache.list.reduce((sum, s) => sum + s.length, 0);
    const count    = 4;
    const spacing  = totalLen / count;
    const radius   = 3;
    for (let i = 0; i < count; i++) {
      let dist = (travelDist + i * spacing) % totalLen;
      let a = 0;
      for (const s of segmentsCache.list) {
        if (dist <= a + s.length) {
          const f  = (dist - a) / s.length;
          const px = s.sx + (s.ex - s.sx) * f;
          const py = s.sy + (s.ey - s.sy) * f;
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, 2*Math.PI);
          ctx.fillStyle   = '#0ff';
          ctx.shadowBlur  = 8;
          ctx.shadowColor = '#0ff';
          ctx.fill();
          ctx.restore();
          break;
        }
        a += s.length;
      }
    }
  }

  // 7) draw the “dark curtain” and punch out holes
  drawLightOverlay(rows, cols);

  // loop
  requestAnimationFrame(() => animateBeam(ctx));
}


// punch‐holes‐only overlay
function drawLightOverlay(rows, cols) {
  const lightCanvas = document.getElementById('lightCanvas');
  const lctx        = lightCanvas.getContext('2d');

  // resize
  syncCanvasSize(lightCanvas);

  // 1) darken entire board
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
  lctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  lctx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

  // 2) punch out circular “spotlights”
  lctx.globalCompositeOperation = 'destination-out';
  const { cellWidth, cellHeight } = getCellDimensions(lightCanvas, cols, rows);
  const radius = Math.max(cellWidth, cellHeight) * 2;  // bright area radius

  for (const key of visitedCells) {
    const [r, c] = key.split(',').map(Number);
    const x = (c + 0.5) * cellWidth;
    const y = (r + 0.5) * cellHeight;
    const grad = lctx.createRadialGradient(x, y, 0, x, y, radius);
    // centre = full knock‐out, edge = no punch
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = grad;
    lctx.beginPath();
    lctx.arc(x, y, radius, 0, 2 * Math.PI);
    lctx.fill();
  }

  // restore normal compositing
  lctx.globalCompositeOperation = 'source-over';
}
