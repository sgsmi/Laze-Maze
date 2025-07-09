import { createGrid }  from './grid.js';
import { syncCanvasSize, traceBeam, onResize, animateBeam} from './beam.js';
import { debounce }    from './utils.js';
import { levels }      from './levels.js';

let currentLevel = 0;

function loadLevel(idx) {
    const { rows, cols, layout } = levels[idx];
    const gridEl    = document.getElementById('grid');
    gridEl.innerHTML = '';             // clear old
    createGrid(gridEl, rows, cols, layout);

    // canvas setup:
    const beamCanvas = document.getElementById('beamCanvas');
    const ctx        = beamCanvas.getContext('2d');
    syncCanvasSize(beamCanvas);
    traceBeam(ctx, rows, cols);
}

document.addEventListener('DOMContentLoaded', () => {
    const { rows, cols } = levels[currentLevel];
    const beamCanvas = document.getElementById('beamCanvas');
    const ctx        = beamCanvas.getContext('2d');

    // Create the grid
    loadLevel(currentLevel);

    // Initial draw
    syncCanvasSize(beamCanvas);
    animateBeam(ctx, rows, cols);

    // Single resize listener
    window.addEventListener(
        'resize',
        debounce(() => onResize(ctx, rows, cols), 100)
    );

    // Click handler re-draws beam
    document.getElementById('grid').addEventListener('click', e => {
        // …update your cell.dataset.type…
        traceBeam(ctx, rows, cols);
    });
});