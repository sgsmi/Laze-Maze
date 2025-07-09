import { getCellDimensions } from './utils.js';

export function syncCanvasSize(canvas) {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

let t = 0;
export function animateBeam(ctx, rows, cols) {
  t += 0.05;
  // pulse between 1px and 4px:
  ctx.lineWidth = 2 + Math.sin(t) * 1.5;
  // cycle hue:
  const hue = (t * 20) % 360;
  ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
  traceBeam(ctx, rows, cols);
  requestAnimationFrame(() => animateBeam(ctx, rows, cols));
}


/**
     * Trace and draw the laser beam, stopping at the first wall cell.
     *
     * @param {CanvasRenderingContext2D} ctx    - the 2D drawing context
     * @param {number} rows                     - number of grid rows
     * @param {number} cols                     - number of grid columns
     */
    export function traceBeam(ctx, rows, cols) {
    // Determine each cell’s pixel dimensions
    const { cellWidth, cellHeight } = getCellDimensions(ctx.canvas, cols, rows);

    const startEl = document.querySelector('.cell[data-type="start"]');
      if (!startEl) {
        console.warn('No start cell found!');
        return;
      }
      const startRow = Number(startEl.dataset.row);
      const startCol = Number(startEl.dataset.col);
      
      let dr = 0, dc = 0;
      switch (startEl.dataset.direction) {
        case 'D': dr = 1; break;
        case 'U': dr = -1; break;
        case 'R': dc = 1; break;
        case 'L': dc = -1; break;
        default: dr = 1;
      }

    // March down each grid row until a wall blocks the beam
    let r = startRow, c = startCol;
      while (r >= 0 && r < rows && c >= 0 && c < cols) {
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        const selector = `.cell[data-row="${r}"][data-col="${c}"]`;
        console.log('Looking for', selector, '→', document.querySelector(selector));
        console.log(r, selector, cell);

        if (!cell) {
            r += dr;
            c += dc;
            continue;
        }

        switch (cell.dataset.type) {
            case 'wall':
                endRow = r;
                break;
            case 'mirror-slash':
                endRow = r;
                // TODO: reflect direction via slash‐mirror logic
                console.log('Slash mirror hit at row', r, 'column', c);
                break;
            case 'mirror-backslash':
                endRow = r;
                // TODO: reflect direction via backslash‐mirror logic
                console.log('Backslash mirror hit at row', r, 'column', c);
                break;
            case 'target':
                // If we hit a target, we can stop here 
                endRow = r;
                // to-do: handle win condition, e.g. show a message / advance level
                console.log('Target hit at row', r, 'column', c);
                break;
            case 'portal':
                // If we hit a portal, we can stop here
                endRow = r;
                // to-do: handle portal logic, e.g. teleport beam to another location
                console.log('Portal hit at row', r, 'column', c);
                break;
            case 'filter':
                // If we hit a filter, continue down the beam
                // to-do: handle filter logic, e.g. change beam color
                console.log('Filter hit at row', r, 'column', c);
                break;
            case 'bomb':
                // If we hit a bomb, we can stop here
                endRow = r;
                // to-do: handle bomb logic, e.g. show explosion effect
                console.log('Bomb hit at row', r, 'column', c);
                break;
          }
          r += dr;
          c += dc;
      }

    

    // Convert grid coords to canvas pixels, centering in each cell
    const startX = (startCol + 0.5) * cellWidth;
    const startY = (startRow + 0.5) * cellHeight;
    const endX   = (c + 0.5) * cellWidth;
    const endY   = (r + 0.5) * cellHeight;

    // Draw the beam segment
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    }

    /**
     * Helper to handle window resize: sync canvas size then redraw beam.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} rows
     * @param {number} cols
     */
    export function onResize(ctx, rows, cols) {
    syncCanvasSize(ctx.canvas);
    traceBeam(ctx, rows, cols);
}
