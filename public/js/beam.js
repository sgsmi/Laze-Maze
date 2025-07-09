import { getCellDimensions } from './utils.js';

export function syncCanvasSize(canvas) {
    canvas.width = canvas.clientWidth;
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
   * Trace and draw the laser beam, stopping at the first obstacle.
   *
   * @param {CanvasRenderingContext2D} ctx  - the 2D drawing context
   * @param {number} rows                   - number of grid rows
   * @param {number} cols                   - number of grid columns
   */
export function traceBeam(ctx, rows, cols) {
    // Determine each cell’s pixel dimensions
    const { cellWidth, cellHeight } = getCellDimensions(ctx.canvas, cols, rows);

    // Find the start cell
    const startEl = document.querySelector('.cell[data-type="start"]');
    if (!startEl) {
        console.warn('No start cell found!');
        return;
    }
    const startRow = Number(startEl.dataset.row);
    const startCol = Number(startEl.dataset.col);

    // Determine direction vector
    let dr = 0, dc = 0;
    switch (startEl.dataset.direction) {
        case 'D': dr = 1; break;
        case 'U': dr = -1; break;
        case 'R': dc = 1; break;
        case 'L': dc = -1; break;
        default:  dr = 1;
    }

    // March cell by cell until an obstacle
    let r = startRow, c = startCol;
    let endRow = r, endCol = c;  // initialize end coords
    while (r >= 0 && r < rows && c >= 0 && c < cols) {
        const cell = document.querySelector(
            `.cell[data-row="${r}"][data-col="${c}"]`
        );

        if (cell && cell.dataset.type !== 'empty' && cell.dataset.type !== 'start') {
            endRow = r;
            endCol = c;
            break;
        }

        if (!cell) {
            r += dr;
            c += dc;
            continue;
        }


        const type = cell?.dataset.type ?? 'empty';

        switch (type) {
            case 'wall':
                endRow = r;
                endCol = c;
                break;

            case 'mirror-slash':
                endRow = r;
                endCol = c;
                console.log('Slash mirror at', r, c);
                break;

            case 'mirror-backslash':
                endRow = r;
                endCol = c;
                console.log('Backslash mirror at', r, c);
                break;

            case 'target':
                endRow = r;
                endCol = c;
                console.log('Target at', r, c);
                break;

            case 'portal':
                endRow = r;
                endCol = c;
                console.log('Portal at', r, c);
                break;

            case 'filter':
                endRow = r;
                endCol = c;
                console.log('Filter at', r, c);
                break;

            case 'bomb':
                endRow = r;
                endCol = c;
                console.log('Bomb at', r, c);
                break;

            default:
                // empty or start: advance the beam and continue looping
                r += dr;
                c += dc;
                endRow = r;
                endCol = c;
                continue;
        }
        // once any case above hits, we break out of the while loop
        break;
    }

    

    // Convert grid coords to canvas pixels, centering in each cell
    const startX = (startCol + 0.5) * cellWidth;
    const startY = (startRow + 0.5) * cellHeight;
    const endX   = (endCol + 0.5) * cellWidth;
    const endY   = (endRow + 0.5) * cellHeight;

    // Draw the beam segment
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

  /**
   * Handle window resize: sync canvas size then redraw beam.
   */
export function onResize(ctx, rows, cols) {
    syncCanvasSize(ctx.canvas);
    traceBeam(ctx, rows, cols);
}