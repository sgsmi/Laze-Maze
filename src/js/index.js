import { syncCanvasSize, 
         animateBeam,
         setAnimating,
         resetBeam,
         updateBeamOnMapChange,
         getVisitedCells  }   from './beam.js';
import { createGrid }     from './grid.js';
import { debounce,
         setCookie,
         getCookie,
         saveCustomLevels,
         loadCustomLevels }       from './utils.js';
import { setupMainMenu,
         setupPauseMenu, 
         setupWinLoseModals} from './menus.js';
import { levels,
         getLevelDims }   from './levels.js';
import { initLevelCreator } from './levelCreator.js';
import { playerLevels,
         builtIn } from './playerLevels.js';


// initialize unlockedUpTo from cookie (or zero)
export let currentLevels = levels; 
export let currentLevel = 0;
let mirrorsLeft = 10; // default to 10 mirrors
let levelStats = JSON.parse(getCookie('levelStats') || '{}');
const campaignProgress = levels.map((lvl, i) => levelStats[i]?.litPct || 0);
console.log('campaignProgress:', campaignProgress);
let movesUsed = 0;
export let nearMissCount = 0;
export let unlockedUpTo = Math.max(
  0,
  ...Object.keys(levelStats)
    .filter(k => levelStats[k].unlocked)
    .map(k => Number(k) + 1)
);

export let inMode = 'main'; // 'main' | 'playing' | 'creator'
export function setMode(mode) {
  inMode = mode
}
export function modeToggle(mode, opts = {}) {
  `mode: main | playing | creator`
  setMode(mode);
  console.log(`============ modeToggle() called!\n============ ${mode} mode activated!`)

  mainMenu      .classList.toggle('hidden', mode !== 'main');

  playBoard     .classList.toggle('hidden', mode !== 'playing');
  sidebar       .classList.toggle('hidden', mode !== 'playing');
  gameWrapper   .classList.toggle('hidden', mode !== 'playing');

  createBoard   .classList.toggle('hidden', mode !== 'creator');
  creatorAside  .classList.toggle('hidden', mode !== 'creator');
  creatorGrid   .classList.toggle('hidden', mode !== 'creator');
  creatorWrapper.classList.toggle('hidden', mode !== 'creator');

  gameOverModal.classList.add('hidden');
  winModal.classList.add('hidden');

  switch (mode) {
    case 'main':

      break;
    case 'playing':

      // default to campaign if no custom levels provided
      let lvls = levels;
      let idx  = opts.levelIndex ?? currentLevel;

      // if they passed a customLevel, wrap it in a one‐element array
      if (opts.customLevel) {
        lvls = [ {
          name:        opts.customLevel.name,
          description: opts.customLevel.description || '',
          maxMirrors:  opts.customLevel.maxMirrors,
          layout:      opts.customLevel.layout
        } ];
        idx = 0;
      }

      // if user passed playerLevels, use those instead
      if (opts.customLevels) { 
        lvls = opts.customLevels;
        idx = opts.levelIndex ?? 0;
      }

      startLevel(lvls, idx);
      animateBeam(beamCtx)
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
          saveLevel(newLvl) {
            // 1) append to localStorage
            const customs = loadCustomLevels();
            customs.push(newLvl);
            saveCustomLevels(customs);

            // 2) update runtime array
            playerLevels.push(newLvl);  
            // save playerlevels.js
            // saveCustomLevels(playerLevels, 'playerLevels.js');
            // to-do: add 'edit level' functionality with UI and save to playerLevels.js


          },
          // loadLevel:        lvl => {
          //   // e.g. loadLevelFromData(lvl);
          // }
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
const sidebar = document.getElementById('sidebar');
const btnCloseLevelSelect = document.getElementById('closeLevelSelect');

const gameWrapper = document.getElementById('game-wrapper');
const creatorWrapper = document.getElementById('creator-wrapper');

let beamCtx, beamRows, beamCols;

// Mirror‐placement helpers
let placingCell = null, previewType = null;
export function exitPlacement() {
  if (placingCell) {
    placingCell.classList.remove('selected','preview-slash','preview-backslash');
  }
  placingCell = null; previewType = null;
  overlay.classList.add('hidden');
  cancelBtn.classList.add('hidden');
  overlay.removeEventListener('mousemove', onMouseMove);
  overlay.removeEventListener('click', confirmPlacement);
}
function enterPlacement(cell) {
  placingCell = cell; previewType = null;
  if (mirrorsLeft <= 0) { alert("No mirrors left!"); exitPlacement(); return; }
  cell.classList.add('selected');
  overlay.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('click', confirmPlacement);
}
function onMouseMove(e) {
  if (!placingCell) return;
  const rect = placingCell.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const slash = (x < rect.width/2 && y < rect.height/2)
             || (x > rect.width/2 && y > rect.height/2);
  const t = slash ? 'mirror-slash' : 'mirror-backslash';
  if (t !== previewType) {
    placingCell.classList.toggle('preview-slash', slash);
    placingCell.classList.toggle('preview-backslash', !slash);
    previewType = t;
  }
}
function confirmPlacement() {
  if (!placingCell || !previewType) return;
  
  mirrorsLeft--;
  movesUsed++;
  updateSidebarMetrics();

  placingCell.dataset.type = previewType;
  exitPlacement();

  updateBeamOnMapChange();
}
// Level loading & starting
export function loadLevel(level, lvls = currentLevels) {
  console.log(`loadLevel(${level}) called with ${lvls.length} levels`);
  console.log(`Level dictionary:`, lvls);
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  const { rows, cols } = getLevelDims(lvls[level]);
  createGrid(gridEl, rows, cols, lvls[level].layout);
  console.log(`loadLevel(${level}) called, grid created with ${rows} rows and ${cols} cols`);
}
export function startLevel(lvls = currentLevels, levelIndex = currentLevel) {
  exitPlacement();
  mirrorsLeft = (typeof lvls[levelIndex].maxMirrors === 'number') ? lvls[levelIndex].maxMirrors : Infinity;
  movesUsed = 0;
  nearMissCount = 0;
  updateSidebarMetrics();
  console.log(`startLevel(${levelIndex}) called with ${lvls.length} levels`);
  console.log(`Level dictionary:`, lvls);
  currentLevels = lvls;
  currentLevel  = levelIndex;
  loadLevel(levelIndex, lvls);
  syncCanvasSize(beamCanvas);
  ({ rows: beamRows, cols: beamCols } = getLevelDims(currentLevels[currentLevel]));
  resetBeam();
  setAnimating(true);
  
}

export function updateSidebarMetrics() {
  document.getElementById('movesUsed').textContent        = `moves used ${movesUsed}`;
  document.getElementById('nearMissCount').textContent    = `near misses ${nearMissCount}`;
  document.getElementById('mirrorsRemaining').textContent = mirrorsLeft === Infinity ? `Mirrors left: ∞` : `Mirrors left: ${mirrorsLeft}`;
}

renderBuilding(
  'building-container',
  8,                     // windows per floor
  campaignProgress
);

// placeholders
let overlay, cancelBtn, beamCanvas;

document.addEventListener('DOMContentLoaded', () => {

  overlay    = document.getElementById('overlay');
  cancelBtn  = document.getElementById('cancelPlacement');
  beamCanvas = document.getElementById('beamCanvas');
  beamCtx    = beamCanvas.getContext('2d');
  
  // initialize dims for level 0
  ({ rows: beamRows, cols: beamCols } = getLevelDims(levels[currentLevel]));
  // kick off the very first animation
  resetBeam();
  setAnimating(true);
  animateBeam(beamCtx);

  // grab level elements
  const { rows, cols }  = getLevelDims(levels[currentLevel]);
  const gridEl          = document.getElementById('grid');

  /* ====================
      MENU & MODAL SETUP 
     ==================== */

  const gameOverModal     = document.getElementById('gameOverModal');
  const winModal          = document.getElementById('winModal');
  const levelSelectModal  = document.getElementById('levelSelectModal');
  const levelList         = document.getElementById('levelList');
  const levelTabs             = document.querySelectorAll('#levelSelectTabs button');

  levelTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // highlight
      levelTabs.forEach(b => b.classList.toggle('active', b === btn));
      // refresh list
      if (btn.dataset.type === 'campaign') {
        refreshLevelList(levelList, levelSelectModal, levels);
      } else {
        refreshLevelList(levelList, levelSelectModal, playerLevels);
      }
    });
  });

  // 2) “Levels” button in main menu should open modal on Campaign tab:
  document.getElementById('btnLevelsMain').onclick = () => {
    levelSelectModal.classList.remove('hidden');
    // simulate campaign‐tab click
    document.querySelector('#levelSelectTabs button[data-type="campaign"]').click();
  };

  // Level creator
  if (!creatorGrid) {
    creatorGrid = document.createElement('div');
    creatorGrid.id = 'creator-grid';
    createContainer.append(creatorGrid);
  }


  // Main menu setup
  setupMainMenu({
    onPlay()    {  
      // If unlockedUpTo has been set, start campaign from latest unlocked level
      if (unlockedUpTo > 0 && unlockedUpTo < levels.length) {
        currentLevel = unlockedUpTo;
      }
      modeToggle('playing')
     },
    onLevels()  {
      // open level‐select modal (or master modal tab)
      // TODO: update this to use the new universal modal system
      refreshLevelList(levelList, levelSelectModal, levels);
      levelSelectModal.classList.remove('hidden');
      // ensure campaign tab is active
      document.querySelector('#levelSelectTabs button[data-type="campaign"]').click();
    },
    onLevelCreator()  {
      modeToggle('creator');
      // show creator aside and creator grid
      
    },
    // onPlayerLevels() {
    //   // show player levels modal
    //   refreshLevelList(levelList, levelSelectModal, playerLevels);
    //   levelSelectModal.classList.remove('hidden');
    // },
    onHowTo()   { alert("TODO: show how-to screen");  } // show “how to play”—for now a simple alert
  });  

  // Pause menu setup
  setupPauseMenu({
    onResume()     { setAnimating(true); },
    onRestart()    { modeToggle('playing'); },
    onOpenKey()    {},
    onSelectLevel(container) {
      refreshLevelList(container, document.getElementById('pauseMenu'));
    },
  });
  // setup level select tabs in pause menu
  const pauseTabs     = document.querySelectorAll('#pauseLevelSelectTabs button');
  const pauseLevelList= document.getElementById('pauseLevelList');
  pauseTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      pauseTabs.forEach(b => b.classList.toggle('active', b === btn));
      if (btn.dataset.type === 'campaign') {
        refreshLevelList(pauseLevelList, document.getElementById('pauseMenu'), levels);
      } else {
        refreshLevelList(pauseLevelList, document.getElementById('pauseMenu'), playerLevels);
      }
    });
  });
  // ensure that when the user clicks the “Levels” tab, we default to campaign:
  document.querySelector('#pauseMenu [data-tab="levels"]').addEventListener('click', () => {
    document.querySelector('#pauseLevelSelectTabs button[data-type="campaign"]').click();
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
      console.log(`onRestart() called, reloading level ${currentLevel}`);
      setAnimating(true);       // re-enable animation
    }
  });

  // populate level list within specified container
  function refreshLevelList(levelContainer, parentModal, lvls = currentLevels) {
    levelContainer.innerHTML = '';
    lvls.forEach((lvl, i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${lvl.name} — ${lvl.description}`;
      if (i <= unlockedUpTo || lvls !== levels) {
        li.classList.add('unlocked');
        li.addEventListener('click', () => {
          parentModal.classList.add('hidden');
          if (parentModal === document.getElementById('pauseMenu')) {
            pauseBtn.innerHTML = '❚❚';
          }
          currentLevel = i;
          
          if (inMode !== 'playing') {
            modeToggle('playing', {
              customLevels: lvls,
              levelIndex:   i
            });
          } else {
            startLevel(lvls, i);
          }
          winModal.classList.add('hidden');
          gameOverModal.classList.add('hidden');
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

  // Close level select modal on button click
  btnCloseLevelSelect.addEventListener('click', () => {
    levelSelectModal.classList.add('hidden');
  });


  /* ===================
      END OF MENU SETUP
     =================== */


  /* ====================
      GRID SETUP
     ==================== */
  
  window.addEventListener('resize', debounce(() => syncCanvasSize(ctx.canvas), 100));

  // CLICK on cancel aborts
  cancelBtn.addEventListener('click', () => {
    exitPlacement();
  });
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
      mirrorsLeft ++;  
      movesUsed++;
      updateSidebarMetrics();
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
        // To-do: add handling for playerLevels and testing from creator mode
        // To-do: add win animation
        if (document.getElementById('btnBackToCreator').classList.contains('hidden')) {
          // unlockedUpTo = Math.max(unlockedUpTo, currentLevel + 1);
          // setCookie('unlockedUpTo', unlockedUpTo);
          // stop the animation loop
          setAnimating(false);
          overlay.classList.remove('hidden');
          winModal.classList.remove('hidden');

          const { rows, cols } = getLevelDims(currentLevels[currentLevel]);
          const totalCells = rows*cols;
          const visited    = getVisitedCells().size;
          const litPct     = visited / totalCells;

          // compute a simple “style” score
          const basePoints     = 1000;
          const score          = Math.floor(basePoints * (1 + nearMissCount/10) * litPct);

          
          // if campaign level, update our stats object
          if (currentLevels === levels) {
            levelStats[currentLevel] = {
              unlocked:       true,
              movesUsed,
              nearMissCount,
              litPct,
              score
            };

            unlockedUpTo = Math.max(unlockedUpTo, currentLevel + 1);

            // save to cookie
            setCookie('levelStats', JSON.stringify(levelStats));
            console.log('cookie is now', getCookie('levelStats'));
            refreshBuilding();
          }
          if (currentLevel === currentLevels.length - 1) {
            // Last level completed, keep next level button hidden
            document.getElementById('nextLevelBtn').classList.add('hidden');
          }
        }
        break;
      case 'portal':
        // teleport logic held in beam.js
        break;
      // etc…
    }
  });
  // animateBeam(beamCanvas.getContext('2d'), rows, cols);
});



/**
 * @param {string} containerId   – wrapper div
 * @param {number} windowsPerRow – how many windows per floor
 * @param {number[]} progress    – array[floorCount] of fractions in [0,1]
 */
export function renderBuilding(containerId, windowsPerRow, progress) {
  const container  = document.getElementById(containerId);
  const floorCount = levels.length;
  const MIN_BRIGHT = 0.3;  // 50% minimum for any unlocked floor

  container.innerHTML = '';
  const building = document.createElement('div');
  building.className = 'building';
  container.append(building);

  ['left','right'].forEach(faceName => {
    const face = document.createElement('div');
    face.className = `face ${faceName}`;
    face.style.gridTemplateRows    = `repeat(${floorCount}, 1fr)`;
    face.style.gridTemplateColumns = `repeat(${windowsPerRow}, 1fr)`;
    building.append(face);

    // build from bottom floor up
    for (let floor = floorCount - 1; floor >= 0; floor--) {
      const rawPct = progress[floor] || 0;
      const pct    = Math.max(0, Math.min(1, rawPct));

      let brightnessArr;
      // only for unlocked floors
      if (pct > 0) {
        // ensure stats[floor] exists
        if (!levelStats[floor]) levelStats[floor] = {};

        // generate + cache if needed
        if (
          !Array.isArray(levelStats[floor].windowBrightness) ||
          levelStats[floor].windowBrightness.length !== windowsPerRow
        ) {
          // map [0…1]→[MIN_BRIGHT…1]
          const baseB = MIN_BRIGHT + pct * (1 - MIN_BRIGHT);
          const arr = Array.from({ length: windowsPerRow }, () =>
            Number((baseB * Math.random()).toFixed(3))
          );
          levelStats[floor].windowBrightness = arr;
          // persist for next session
          setCookie('levelStats', JSON.stringify(levelStats));
        }

        brightnessArr = levelStats[floor].windowBrightness;
      } else {
        // locked → all dark
        brightnessArr = new Array(windowsPerRow).fill(0);
      }

      // now append that floor’s windows
      for (let col = 0; col < windowsPerRow; col++) {
        const win = document.createElement('div');
        win.className = 'window';
        win.style.setProperty('--b', brightnessArr[col]);
        face.append(win);
      }
    }
  });
}

function campaignProgressArray(levelCount) {
  return Array.from({length: levelCount}, (_, i) =>
    (levelStats[i] && levelStats[i].litPct) || 0
  );
}

function refreshBuilding() {
  const levelCount      = levels.length;
  const windowsPerRow   = 8;   // or whatever your design uses
  const progressArr     = campaignProgressArray(levelCount);
  renderBuilding("building-container", windowsPerRow, progressArr);
}