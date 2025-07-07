import { createGrid }      from './grid.js';
import { syncCanvasSize, onResize, drawBeam } from './beam.js';
import { debounce } from './utils.js';

window.addEventListener('resize', debounce(onResize, 100));

document.addEventListener('DOMContentLoaded', () => {

    const gridEl    = document.getElementById('grid');
    const ROWS      = 11, COLS = 11;
    createGrid(gridEl, ROWS, COLS);

    const beamCanvas = document.getElementById('beamCanvas');
    const bctx       = beamCanvas.getContext('2d');

    syncCanvasSize(beamCanvas);
    drawBeam( bctx, beamCanvas.width / 2, beamCanvas.height, beamCanvas.width / 2, beamCanvas.height / 2);

    gridEl.addEventListener('click', e => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        // mirror-placement logic will go here
    });
});
