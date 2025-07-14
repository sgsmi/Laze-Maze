// TODO: update beam to slow animation path, ensure the user can see the beam path progress, 
// if a user interrupts the beam path animation, it should reset to the start of the path 
// (e.g. if a mirror is placed/removed, the beam path should recalculate from the start and resume animation
// from furthest common point pre and post interruption i.e. if the beam is affected by 3 mirrors, and the user removes the middle mirror
// the beam should resume from where the middle mirror was removed as all path previous to this point is unchanged)

// 1. ensure beam path is recalculated on mirror placement/removal
// 2. implement a way to pause/resume beam animation and remove segements that are no longer valid


import { getCellDimensions } from './utils.js';

export function syncCanvasSize(canvas) {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

let t = 0;
function reflectSlash(dr, dc) {
  return [-dc, -dr];
}
function reflectBackslash(dr, dc) {
  return [dc, dr];
}

// --- single‐segment tracer ---
function traceOneSegment(r, c, dr, dc, rows, cols, cellW, cellH, canvas) {
  const sx = (c + 0.5) * cellW;
  const sy = (r + 0.5) * cellH;

  let hr = r, hc = c, type = 'empty';
  while (hr >= 0 && hr < rows && hc >= 0 && hc < cols) {
    const cell = document.querySelector(`.cell[data-row="${hr}"][data-col="${hc}"]`);
    type = cell ? cell.dataset.type : 'empty';
    if (type !== 'empty' && type !== 'start') break;
    hr += dr; hc += dc;
  }

  let ex, ey, er = hr, ec = hc;
  if (type === 'empty') {
    // ran off-board → back up one
    er = hr - dr; ec = hc - dc;
    if (dr ===  1 && dc === 0)      { ex = sx;            ey = canvas.height; }
    else if (dr === -1 && dc === 0) { ex = sx;            ey = 0;             }
    else if (dc ===  1 && dr === 0) { ex = canvas.width;  ey = sy;            }
    else if (dc === -1 && dr === 0) { ex = 0;             ey = sy;            }
    else { ex = (ec+.5)*cellW; ey = (er+.5)*cellH; }
  } else if (type === 'wall') {
    // hit a wall → stop at its edge
    if (dr ===  1)      { ex = sx;               ey = er * cellH;     }
    else if (dr === -1) { ex = sx;               ey = (er+1)*cellH;   }
    else if (dc ===  1) { ex = ec * cellW;       ey = sy;             }
    else                { ex = (ec+1)*cellW;     ey = sy;             }
  } else {
    // mirror or other → center
    ex = (ec + .5)*cellW;
    ey = (er + .5)*cellH;
  }

  return { sx, sy, ex, ey, type, er, ec };
}

// --- build the full path segments ---
function computeSegments(ctx, rows, cols) {
  const canvas      = ctx.canvas;
  const { cellWidth, cellHeight } = getCellDimensions(canvas, cols, rows);
  const startEl     = document.querySelector('.cell[data-type="start"]');
  if (!startEl) return [];

  let r   = +startEl.dataset.row;
  let c   = +startEl.dataset.col;
  let dr  = 0, dc = 0;
  switch (startEl.dataset.direction) {
    case 'D': dr =  1; break;
    case 'U': dr = -1; break;
    case 'R': dc =  1; break;
    case 'L': dc = -1; break;
    default:  dr =  1; 
  }

  const segments = [];
  for (let i = 0; i < 10; i++) {
    const seg = traceOneSegment(r, c, dr, dc, rows, cols,
                                cellWidth, cellHeight, canvas);
    segments.push(seg);
    if (seg.type === 'mirror-slash') {
      [dr, dc] = reflectSlash(dr, dc);
      r = seg.er + dr; c = seg.ec + dc;
      continue;
    }
    if (seg.type === 'mirror-backslash') {
      [dr, dc] = reflectBackslash(dr, dc);
      r = seg.er + dr; c = seg.ec + dc;
      continue;
    }
    // ** Portal teleport **
    if (seg.type === 'portal') {
      const id = seg.er !== undefined
        ? document
            .querySelector(`.cell[data-row="${seg.er}"][data-col="${seg.ec}"]`)
            .dataset.portalId
        : null;
      if (id) {
        // find the paired portal
        const all = Array.from(
          document.querySelectorAll(`.cell[data-type="portal"][data-portal-id="${id}"]`)
        );
        // remove the one we’re on:
        const destEl = all.find(el => 
          Number(el.dataset.row) !== seg.er || Number(el.dataset.col) !== seg.ec
        );
        if (destEl) {
          // teleport just outside that cell, preserving dr,dc
          const destR = Number(destEl.dataset.row);
          const destC = Number(destEl.dataset.col);
          r = destR + dr;
          c = destC + dc;
          continue;
        }
      }
    }
    if (seg.type === 'bomb' || seg.type === 'target') {
      window.dispatchEvent(new CustomEvent('cell-hit', { detail: {type: seg.type} }));
      break;
    }
    break;
  }
  return segments;
}

// --- draw static beam path ---
export function traceBeam(ctx, rows, cols) {
  const segs = computeSegments(ctx, rows, cols);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.beginPath();
  ctx.lineWidth   = 2;
  ctx.strokeStyle = 'rgba(255,255,0,0.75)';
  for (const { sx, sy, ex, ey } of segs) {
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
  }
  ctx.stroke();
}

// --- animated pulses rolling along the beam ---
let animating = true;
export function setAnimating(val) { animating = val; }

export function animateBeam(ctx, rows, cols) {
  // 1) Resize
  syncCanvasSize(ctx.canvas);

  // 2) Advance animation ticker
  t += 2;

  // 3) Only draw if animating is true
  if (animating) {
    // --- static beam ---
    const segs = computeSegments(ctx, rows, cols);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.lineWidth   = 2;
    ctx.strokeStyle = 'rgba(255,255,0,0.75)';
    for (const { sx, sy, ex, ey } of segs) {
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();

    // --- moving bumps ---
    let totalLen = 0;
    for (const s of segs) {
      totalLen += Math.hypot(s.ex - s.sx, s.ey - s.sy);
    }
    const count   = 4;
    const radius  = 4;
    const spacing = totalLen / count;

    for (let i = 0; i < count; i++) {
      let dist = (t + i * spacing) % totalLen;
      let acc  = 0;
      for (const { sx, sy, ex, ey } of segs) {
        const dx  = ex - sx, dy = ey - sy;
        const len = Math.hypot(dx, dy);
        if (dist <= acc + len) {
          const f  = (dist - acc) / len;
          const px = sx + dx * f, py = sy + dy * f;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255,255,0,0.9)';
          ctx.fill();
          break;
        }
        acc += len;
      }
    }
  }

  // 4) Queue up the next frame unconditionally
  requestAnimationFrame(() => animateBeam(ctx, rows, cols));
}


export function onResize(ctx, rows, cols) {
  syncCanvasSize(ctx.canvas);
  traceBeam(ctx, rows, cols);
}
