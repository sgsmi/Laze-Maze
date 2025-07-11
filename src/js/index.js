import { createGrid } from './grid.js';
import { syncCanvasSize, 
         traceBeam, 
         onResize, 
         animateBeam,
         setAnimating } from './beam.js';
import { debounce } from './utils.js';
import { levels } from './levels.js';

let currentLevel = 0;

function loadLevel(idx) {
  const { rows, cols, layout } = levels[idx];
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  createGrid(gridEl, rows, cols, layout);
}

document.addEventListener('DOMContentLoaded', () => {
  const { rows, cols } = levels[currentLevel];
  const gridEl    = document.getElementById('grid');
  const beamCanvas= document.getElementById('beamCanvas');
  const ctx       = beamCanvas.getContext('2d');
  const overlay   = document.getElementById('overlay');
  const cancelBtn = document.getElementById('cancelPlacement');
  const gameOverModal = document.getElementById('gameOverModal');
  const restartBtn    = document.getElementById('restartBtn');
  const winModal     = document.getElementById('winModal');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const replayBtn    = document.getElementById('replayBtn');
  const levelsBtn    = document.getElementById('levelsBtn');

  // INITIAL SETUP
  loadLevel(currentLevel);
  syncCanvasSize(beamCanvas);
  animateBeam(ctx, rows, cols);
  window.addEventListener('resize', debounce(() => onResize(ctx, rows, cols), 100));


  // MIRROR PLACEMENT STATE
  let placingCell = null;
  let previewType = null;

  // Show overlay & cancel only during placement
  function enterPlacement(cell) {
    placingCell = cell;
    previewType = null;
    cell.classList.add('selected');
    overlay.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('click', confirmPlacement);
  }
  function exitPlacement() {
    if (placingCell) placingCell.classList.remove('selected','preview-slash','preview-backslash');
    placingCell = null;
    previewType = null;
    overlay.classList.add('hidden');
    cancelBtn.classList.add('hidden');
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('click', confirmPlacement);
  }

  // MOUSEMOVE over overlay to update preview
  function onMouseMove(e) {
    if (!placingCell) return;
    const rect = placingCell.getBoundingClientRect();
    const xRel = e.clientX - rect.left, yRel = e.clientY - rect.top;
    const slash = (xRel < rect.width/2 && yRel < rect.height/2)
               || (xRel > rect.width/2 && yRel > rect.height/2);
    const type = slash ? 'mirror-slash' : 'mirror-backslash';
    if (type !== previewType) {
        placingCell.classList.toggle('preview-slash', slash);
        placingCell.classList.toggle('preview-backslash', !slash);
        previewType = type;
    }
  }

  // CLICK on overlay confirms placement
  function confirmPlacement() {
    if (!placingCell || !previewType) return;
    placingCell.dataset.type = previewType;
    exitPlacement();
    traceBeam(ctx, rows, cols);
  }

  // CLICK on cancel aborts
  cancelBtn.addEventListener('click', exitPlacement);

  // CLICK on grid: either start placement or just redraw beam
  gridEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;

    // If in placement, ignore grid clicks (overlay is above)
    if (placingCell) return;

    if (cell.dataset.type === 'mirror-slash' || cell.dataset.type === 'mirror-backslash') {
      cell.dataset.type = 'empty';
      traceBeam(ctx, rows, cols);
      return;
    }

    // Only start placement on empty cells
    if (cell.dataset.type === 'empty') {
      enterPlacement(cell);
    } else {
      // just redraw beam on non-empty clicks
      traceBeam(ctx, rows, cols);
    }
  });

  window.addEventListener('cell-hit', e => {
    switch (e.detail.type) {
      case 'bomb':
        // stop the animation loop
        setAnimating(false);
        // darken board
        overlay.classList.remove('hidden');
        // show game over
        gameOverModal.classList.remove('hidden');
        break;
      case 'target':
        // stop the animation loop
        setAnimating(false);
        overlay.classList.remove('hidden');
        winModal.classList.remove('hidden');
        break;
      case 'portal':
        // teleport logic
        break;
      // etc…
    }
  });


  restartBtn.addEventListener('click', () => {
    // hide everything
    overlay.classList.add('hidden');
    gameOverModal.classList.add('hidden');

    // reload this level from scratch
    loadLevel(currentLevel);

    // re‐start the beam animation
    const beamCanvas = document.getElementById('beamCanvas');
    const ctx        = beamCanvas.getContext('2d');
    syncCanvasSize(beamCanvas);
    setAnimating(true); // re-enable animation
    animateBeam(ctx, rows, cols);
  });

  nextLevelBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    winModal.classList.add('hidden');
    if (currentLevel < levels.length - 1) {
      currentLevel++;
      startLevel();
    }
  });

  replayBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    winModal.classList.add('hidden');
    startLevel();  // reload same level
  });

  levelsBtn.addEventListener('click', () => {
    // TODO: show levels selector screen
    showLevelsScreen();
  });

  function startLevel() {
    exitPlacement();      // clear any mirror state
    gameOverModal.classList.add('hidden');
    winModal.classList.add('hidden');
    overlay.classList.remove('active');
    loadLevel(currentLevel);
    setAnimating(true); // re-enable animation
    syncCanvasSize(beamCanvas);
    animateBeam(ctx, rows, cols);
  }
});
