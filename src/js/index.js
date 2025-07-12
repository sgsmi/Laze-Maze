import { syncCanvasSize, 
         traceBeam, 
         onResize, 
         animateBeam,
         setAnimating }   from './beam.js';
import { createGrid }     from './grid.js';
import { debounce }       from './utils.js';
import { levels,
         getLevelDims }   from './levels.js';

let currentLevel = 0;
// keep track of which levels are unlocked
let unlockedUpTo = 0; // index of highest-unlocked level

function loadLevel(idx) {
  const { rows, cols } = getLevelDims(levels[idx]), layout = levels[idx].layout;
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  createGrid(gridEl, rows, cols, layout);
}

document.addEventListener('DOMContentLoaded', () => {
  const { rows, cols } = getLevelDims(levels[currentLevel]);
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
  const levelsBtn2   = document.getElementById('levelsBtn2');
  const levelSelectModal = document.getElementById('levelSelectModal');
  const levelList        = document.getElementById('levelList');
  const closeLS          = document.getElementById('closeLevelSelect');
  // Key modal
  const openKey      = document.getElementById('openKeyModal');
  const keyModal     = document.getElementById('keyModal');
  const closeKey     = document.getElementById('closeKeyModal');

  // populate level list
  function refreshLevelList() {
    levelList.innerHTML = '';
    levels.forEach((lvl, i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${lvl.name} — ${lvl.description}`;
      if (i <= unlockedUpTo) {
        li.classList.add('unlocked');
        li.addEventListener('click', () => {
          levelSelectModal.classList.add('hidden');
          currentLevel = i;
          startLevel(i);
        });
      } else {
        li.classList.add('locked');
      }
      levelList.append(li);
    });
  }

  closeLS.addEventListener('click', () => {
    levelSelectModal.classList.add('hidden');
  });

  document.getElementById('levelsBtn').addEventListener('click', () => {
    refreshLevelList();
    levelSelectModal.classList.remove('hidden');
  });

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
        unlockedUpTo = Math.max(unlockedUpTo, currentLevel + 1);
        // stop the animation loop
        setAnimating(false);
        overlay.classList.remove('hidden');
        winModal.classList.remove('hidden');
        if (currentLevel === levels.length - 1) {
          // Last level completed, keep next level button hidden
          nextLevelBtn.classList.add('hidden');
        }
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
    } else {
      // No more levels, show end screen or reset
      overlay.classList.remove('hidden');
      // Show levels selector or reset
      levelSelectModal.classList.remove('hidden');
      refreshLevelList();
    }
  });

  replayBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    winModal.classList.add('hidden');
    startLevel();  // reload same level
  });

  levelsBtn.addEventListener('click', () => {
    levelSelectModal.classList.remove('hidden');
    refreshLevelList();
  });

  levelsBtn2.addEventListener('click', () => {
    levelSelectModal.classList.remove('hidden');
    refreshLevelList();
  });

  levelSelectModal.addEventListener('click', e => {
    if (e.target === levelSelectModal) {
      levelSelectModal.classList.add('hidden');
    }
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
  openKey.addEventListener('click', () => {
    document.getElementById('keyModal').classList.remove('hidden');
  });
  closeKey.addEventListener('click', () => {
    document.getElementById('keyModal').classList.add('hidden');
  });

  keyModal.addEventListener('click', e => {
    if (e.target === keyModal) {
      keyModal.classList.add('hidden');
    }
  });

  function animateKeyCells() {
    // Start‐cell rotation every 1s through D→R→U→L
    const startCell = document.querySelector('#keyModal .key-item[data-type="start"] .cell');
    const dirs      = ['D','R','U','L'];
    let di = 0;
    setInterval(() => {
      di = (di + 1) % dirs.length;
      startCell.dataset.direction = dirs[di];
    }, 1500);

    // Mirror toggle between slash/backslash every 2s
    const mirrorCell = document.querySelector('#keyModal .key-item[data-type="mirror-slash"] .cell');
    let isSlash = true;
    setInterval(() => {
      isSlash = !isSlash;
      mirrorCell.dataset.type = isSlash ? 'mirror-slash' : 'mirror-backslash';
    }, 1500);

    // Filter cycles R→G→B every 1s
    const filterCell = document.querySelector('#keyModal .key-item[data-type="filter"] .cell');
    const colors     = ['R','G','B'];
    let ci = 0;
    setInterval(() => {
      ci = (ci + 1) % colors.length;
      filterCell.dataset.color = colors[ci];
    }, 1500);

    const portalCell = document.querySelector('#keyModal .key-item[data-type="portal"] .cell');
    const portalIds = ['A','B'];
    let portalIndex = 0;
    setInterval(() => {
      portalIndex = (portalIndex + 1) % portalIds.length;
      portalCell.dataset.portalId = portalIds[portalIndex];
    }, 1500);
  }
  animateKeyCells();
});
