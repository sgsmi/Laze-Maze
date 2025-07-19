/* MAIN TO-DOS
Render a simple skyscraper = to the number of campaign levels
  light each floor as new levels are unlocked
  
Game narrative: breaching a building, 
  targets are mirrors which lead to the next floor
  each level should start from the same cell as the last target

New cell types:
  Alarm cell - once tripped, the player has x amount of time to finish the level

Some sort of points system for style, e.g. multipliers for longest beam 
without intervention (i.e. if the user plans out their route beforehand 
and then places the final mirror and lets it run, points for near misses
on bombs etc)
*/



//////
/// TODO: Fix beam not generating on returning from level creator to game mode (it works if exiting to menu from game mode and returning
/// but never after level creator, even if the game was initialised first with a functioning beam)
/// Level creator keeps board, add a reset button, warn on refresh or exit if level creator has unsaved changes
/// implement level creator save button properly
/// add default types for portal, start & filter cell placement for levelCreator & jazz up the UI
/// cells are not showing in creatorAside, have the selection panel appear below the chosen cell type 
/// with the correct version clearly highlighted, make sure the cell showing on the main dropdown is the
/// selected type, and let the user close the dropdown if desired




import { syncCanvasSize, 
         traceBeam, 
         onResize, 
         animateBeam,
         setAnimating,
         resetBeam,
         updateBeamOnMapChange }   from './beam.js';
import { createGrid }     from './grid.js';
import { debounce,
         setCookie,
         getCookie }       from './utils.js';
import { setupMainMenu,
         setupPauseMenu, 
         setupWinLoseModals} from './menus.js';
import { levels,
         getLevelDims }   from './levels.js';
import { initLevelCreator } from './levelCreator.js';


// FURTHER TODOs:
// - Add delay & animations so win & lose mechanics
// - Consider a move counter, max mirrors, and a timed mode 

// initialize unlockedUpTo from cookie (or zero)
export let unlockedUpTo = parseInt(getCookie('unlockedUpTo')) || 0, currentLevel = 0;
export let inMode = 'main'; // 'main' | 'playing' | 'creator'
export function setMode(mode) {
  inMode = mode
}
export function modeToggle(mode) {
  `mode: main | playing | creator`
  setMode(mode);
  console.log(`============ ${mode} mode activated!`)

  mainMenu      .classList.toggle('hidden', mode !== 'main');

  playBoard     .classList.toggle('hidden', mode !== 'playing');
  sidebar       .classList.toggle('hidden', mode !== 'playing');
  gameWrapper   .classList.toggle('hidden', mode !== 'playing');

  createBoard   .classList.toggle('hidden', mode !== 'creator');
  creatorAside  .classList.toggle('hidden', mode !== 'creator');
  creatorGrid   .classList.toggle('hidden', mode !== 'creator');
  creatorWrapper.classList.toggle('hidden', mode !== 'creator');

  switch (mode) {
    case 'main':
      break;
    case 'playing':
      // to-do - move beam logic here to ensure it is always reset
      resetBeam();
      const dims = getLevelDims(levels[currentLevel]);
      animateBeam( beamCanvas.getContext('2d'), dims.rows, dims.cols);
      // possibly also load level, grid generation if it doesn't exist/isn't correct, etc.
      break;
    case 'creator':
      syncCanvasSize(creatorGrid)
      // only init level creator if it does not already exist
      if (creatorGrid.children.length === 0) {
        initLevelCreator({
          aside:            creatorAside,
          createContainer:  createContainer,
          maxRows:          20,
          maxCols:          20,
          saveLevel:        lvl => { /* … */ },
          loadLevel:        lvl => {
            // e.g. loadLevelFromData(lvl);
          }
        });
      }
      break;
    default:
      console.warn(`Unknown mode ${mode}`);
  }
}

const mainMenu = document.getElementById('mainMenu')
const playBoard = document.getElementById('board-play')
const createBoard = document.getElementById('board-create')
const creatorAside = document.getElementById('creator-aside')
const createContainer = document.querySelector('#create-container');
const creatorGrid = createContainer.querySelector('#creator-grid');
const pauseMenu = document.getElementById('pauseMenu')
const sidebar = document.getElementById('sidebar');

const gameWrapper = document.getElementById('game-wrapper');
const creatorWrapper = document.getElementById('creator-wrapper');


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
  
  // Level creator
  if (!creatorGrid) {
    creatorGrid = document.createElement('div');
    creatorGrid.id = 'creator-grid';
    createContainer.append(creatorGrid);
  }


  // Main menu setup
  setupMainMenu({
    onPlay()    {  
      modeToggle('playing')
      startLevel();
      
     },
    onLevels()  {
      // open level‐select modal (or master modal tab)
      // TODO: update this to use the new universal modal system
      refreshLevelList(levelList, levelSelectModal);
      levelSelectModal.classList.remove('hidden');
    },
    onLevelCreator()  {
      modeToggle('creator');
      // show creator aside and creator grid
      
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
    },
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
          mainMenu.classList.add('hidden');
          currentLevel = i;
          startLevel(i);
          if (inMode !== 'playing') {
            modeToggle('playing');
          }
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
  resetBeam();
  // animateBeam(ctx, rows, cols);
  
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
    exitPlacement();
    const { rows, cols } = getLevelDims(levels[currentLevel]);
    loadLevel(currentLevel);
    resetBeam();
    setAnimating(true);
    syncCanvasSize(beamCanvas);
    animateBeam(ctx, rows, cols);
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
    updateBeamOnMapChange();
  }

  // CLICK on cancel aborts
  cancelBtn.addEventListener('click', exitPlacement);

  /* =====================
      GRID CLICK HANDLING
     ===================== */

  function handleMirrorPlacement(cell) {
    if (!cell) return;

    // If in placement, ignore grid clicks (overlay is above)
    if (placingCell) return;

    // If mirror in clicked cell, clear and re-calculate beam
    if (cell.dataset.type === 'mirror-slash' || cell.dataset.type === 'mirror-backslash') {
      cell.dataset.type = 'empty';
      updateBeamOnMapChange();
      return;
    }

    // Only start placement on empty cells
    if (cell.dataset.type === 'empty')  enterPlacement(cell);
  }

  function handleCreatorPlacement(cell) {
    if (inMode !== 'creator') return;
    if (!cell || !selectedType) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;

    const code = selectedType.codePrefix
            + (selectedVariant ? '-' + selectedVariant : '');

    const isAdding = layout[r][c] !== code;

    if (isAdding && counts[selectedType.key] >= selectedType.limit) {
      // e.g. flash the button red, or just alert
      alert(`You may only place up to ${selectedType.limit} ${selectedType.name}(s).`);
      return;       // <-- bail out, no change
    }

    // toggle
    layout[r][c] = (layout[r][c] === code) ? '.' : code;


    updateCounts();
    redraw();
    console.log(`handleCreatorPlacement() redraw()`)

  };

   function onGridClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (inMode === 'playing')       return handleMirrorPlacement(cell);
    else if (inMode === 'creator')  return handleCreatorPlacement(cell);
  }

  // CLICK on grid: either start placement or just redraw beam
  gridEl.addEventListener('click', e => onGridClick(e));

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