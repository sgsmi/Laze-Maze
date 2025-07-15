import { syncCanvasSize, 
         traceBeam, 
         onResize, 
         animateBeam,
         setAnimating }   from './beam.js';
import { createGrid }     from './grid.js';
import { debounce }       from './utils.js';
import { setupMainMenu,
         setupPauseMenu, 
         setupWinLoseModals} from './menus.js';
import { levels,
         getLevelDims }   from './levels.js';

// TODO: SYSTEMATICALLY REMOVE/REPLACE ANY UNUSED/UNNEEDED FUNCTIONS (namely menu-related)
// IMPLEMENT NEW UNIVERSAL MENU SYSTEM, DO AWAY WITH OLD MODAL SYSTEM
// -- continue implementation of universal inner modal system


// FURTHER TODOs:
// - Add delay & animations so win & lose mechanics
// - Consider a move counter, max mirrors, and a timed mode 

// simple cookie getter/setter
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((r, c) => {
    const [k, v] = c.split('=');
    return k === name ? decodeURIComponent(v) : r;
  }, '');
}

// initialize unlockedUpTo from cookie (or zero)
export let unlockedUpTo = parseInt(getCookie('unlockedUpTo')) || 0, currentLevel = 0;


document.addEventListener('DOMContentLoaded', () => {

  // grab level elements
  const { rows, cols }  = getLevelDims(levels[currentLevel]);
  const gridEl          = document.getElementById('grid');
  const beamCanvas      = document.getElementById('beamCanvas');
  const ctx             = beamCanvas.getContext('2d');
  const overlay         = document.getElementById('overlay');

  /* ====================
      MENU & MODAL SETUP 
     ==================== */

  const cancelBtn         = document.getElementById('cancelPlacement');
  const gameOverModal     = document.getElementById('gameOverModal');
  const winModal          = document.getElementById('winModal');
  const levelSelectModal  = document.getElementById('levelSelectModal');
  const levelList         = document.getElementById('levelList');

  // Main menu setup
  setupMainMenu({
    onPlay()    {  startLevel(); },
    onLevels()  {
      // open level‐select modal (or master modal tab)
      // TODO: update this to use the new universal modal system
      refreshLevelList(levelList, levelSelectModal);
      levelSelectModal.classList.remove('hidden');
    },
    onHowTo()   { alert("TODO: show how-to screen");  } // show “how to play”—for now a simple alert
  });  

  // Pause menu setup
  setupPauseMenu({
    onResume()     { setAnimating(true); },
    onRestart()    { startLevel(); },
    onOpenKey()    {},
    onSelectLevel(container) {
      refreshLevelList(container, document.getElementById('pauseMenu'));
    }
  });

  // Win / Lose modal setup
  setupWinLoseModals({
    onLevels() {
      refreshLevelList(levelList, levelSelectModal);
      levelSelectModal.classList.remove('hidden');
    },
    onReplay() {  startLevel();  },
    onNext()  {
      winModal.classList.add('hidden');
      if (currentLevel < levels.length - 1) {
        overlay.classList.add('hidden');
        currentLevel++;
        startLevel();
      } else {
      // Show levels selector or reset
      levelSelectModal.classList.remove('hidden');
      refreshLevelList(levelList, levelSelectModal);
      }
    },
    onRestart() { // hide everything
      gameOverModal.classList.add('hidden');
      loadLevel(currentLevel);  // reload this level from scratch
      setAnimating(true);       // re-enable animation
    }
  });

  // populate level list within specified container
  function refreshLevelList(levelContainer, parentModal) {
    levelContainer.innerHTML = '';
    levels.forEach((lvl, i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${lvl.name} — ${lvl.description}`;
      if (i <= unlockedUpTo) {
        li.classList.add('unlocked');
        li.addEventListener('click', () => {
          parentModal.classList.add('hidden');
          currentLevel = i;
          startLevel(i);
        });
      } else {
        li.classList.add('locked');
      }
      levelContainer.append(li);
    });
  }

  // Close level select modal on click outside
    levelSelectModal.addEventListener('click', e => {
        if (e.target === levelSelectModal) {
        levelSelectModal.classList.add('hidden');
        }
    });

  /* ===================
      END OF MENU SETUP
     =================== */


  /* ====================
       GRID SETUP
     ==================== */
  // loadLevel(currentLevel);
  syncCanvasSize(beamCanvas);
  animateBeam(ctx, rows, cols);
  window.addEventListener('resize', debounce(() => onResize(ctx, rows, cols), 100));


  // MIRROR PLACEMENT STATE
  let placingCell = null;
  let previewType = null;

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

  // Load grid from given level
  function loadLevel(level) {
    const layout = levels[level].layout;
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    createGrid(gridEl, rows, cols, layout);
  }
  // clear any mirror state, load level and ensure animations are active
  function startLevel() {
    exitPlacement();      // clear any mirror state
    loadLevel(currentLevel);
    setAnimating(true); // re-enable animation
  }
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
  // CLICK on overlay confirms placement
  function confirmPlacement() {
    if (!placingCell || !previewType) return;
    placingCell.dataset.type = previewType;
    exitPlacement();
    traceBeam(ctx, rows, cols);
  }

  // CLICK on cancel aborts
  cancelBtn.addEventListener('click', exitPlacement);

  /* =====================
      GRID CLICK HANDLING
     ===================== */

  // CLICK on grid: either start placement or just redraw beam
  gridEl.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;

    // If in placement, ignore grid clicks (overlay is above)
    if (placingCell) return;

    // If mirror in clicked cell, clear and re-calculate beam
    if (cell.dataset.type === 'mirror-slash' || cell.dataset.type === 'mirror-backslash') {
      cell.dataset.type = 'empty';
      traceBeam(ctx, rows, cols);
      return;
    }

    // Only start placement on empty cells
    if (cell.dataset.type === 'empty')  enterPlacement(cell);
  });

  /* ========================= 
      BEAM COLLISION HANDLING 
     ========================= */

  // Handle collision events
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
        setCookie('unlockedUpTo', unlockedUpTo);
        // stop the animation loop
        setAnimating(false);
        overlay.classList.remove('hidden');
        winModal.classList.remove('hidden');
        if (currentLevel === levels.length - 1) {
          // Last level completed, keep next level button hidden
          document.getElementById('nextLevelBtn').classList.add('hidden');
        }
        break;
      case 'portal':
        // teleport logic held in beam.js
        break;
      // etc…
    }
  });
});