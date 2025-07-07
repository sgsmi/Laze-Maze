import { createGrid } from './grid.js';

document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.getElementById('grid');
  const ROWS = 10, COLS = 10;
  createGrid(gridEl, ROWS, COLS);

  gridEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    // mirror-placement logic will go here
  });
});
