import { getCellDimensions } from './utils.js';

export function syncCanvasSize(canvas) {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
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

    // Beam starts at middle column, just above the first row
    const midCol   = Math.floor(cols / 2);
    let endRow     = rows;  // default to off-canvas if no wall is hit

    // March down each grid row until a wall blocks the beam
    for (let r = 0; r < rows; r++) {
        const cell = document.querySelector(
        `.cell[data-row="${r}"][data-col="${midCol}"]`
        );
        const selector = `.cell[data-row="${r}"][data-col="${midCol}"]`;
        console.log('Looking for', selector, '→', document.querySelector(selector));
        console.log(r, selector, cell);
        
        if (!cell) {
            // nothing to check—skip to next row
            continue;
        }
        if (cell.dataset.type === 'wall') {
            endRow = r;
            break;
        }
    }

    // Convert grid coords to canvas pixels, centering in each cell
    const startX = (midCol + 0.5) * cellWidth;
    const startY = 0.5 * cellHeight;
    const endX   = startX;
    const endY   = (endRow + 0.5) * cellHeight;

    // Draw the beam segment
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth   = 2;
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
