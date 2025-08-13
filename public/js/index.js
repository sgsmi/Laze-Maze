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
export let tutorialsActive = getCookie('tutorialsActive') !== 'false';
export let briefingsActive = getCookie('briefingsActive') !== 'false';
export let tutorialLockGrid    = false;
export let tutorialLockOverlay = false;
let mirrorsLeft = 10; // default to 10 mirrors
let alarmActive = false;
let alarmTimer = null
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
export async function modeToggle(mode, opts = {}) {
  `mode: main | playing | creator`
  setMode(mode);
  clearAlarm()
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

      
      await startLevel(lvls, idx);
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
let placementKeyHandler = null; 

// Mirror‐placement helpers
export let placingCell = null, previewType = null;

export function exitPlacement() {
  if (placingCell) {
    placingCell.classList.remove('selected','preview-slash','preview-backslash');
  }
  placingCell = null;
  previewType = null;

  overlay.classList.add('hidden');
  cancelBtn.classList.add('hidden');

  overlay.removeEventListener('mousemove', onMouseMove);
  overlay.removeEventListener('click',    confirmPlacement);

  // remove the exact handler we added
  if (placementKeyHandler) {
    document.removeEventListener('keydown', placementKeyHandler);
    placementKeyHandler = null;
  }
}

function enterPlacement(cell) {
  placingCell = cell;
  previewType = null;

  if (mirrorsLeft <= 0) { 
    alert("No mirrors left!"); 
    exitPlacement(); 
    return; 
  }

  cell.classList.add('selected');
  overlay.classList.remove('hidden');
  cancelBtn.classList.remove('hidden');

  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('click',     confirmPlacement);

  // attach one stable keydown handler and remember it
  placementKeyHandler = (e) => {
    if (e.key === '/') {
      previewType = 'mirror-slash';
      confirmPlacement();
    } else if (e.key === '\\') {
      previewType = 'mirror-backslash';
      confirmPlacement();
    } else if (e.key === 'Escape') {
      // behave like clicking 'Cancel'
      exitPlacement();
      window.dispatchEvent(new CustomEvent('tutorial:placement-cancelled'));
      console.log(`dispatched cancel event`);
    }
  };
  document.addEventListener('keydown', placementKeyHandler);

  window.dispatchEvent(new CustomEvent('tutorial:placement-started'));
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
  if (tutorialLockOverlay) return;
  console.log(`previewType: ${previewType}`)
  if (previewType === 'mirror-backslash') {
    window.dispatchEvent(new CustomEvent('tutorial:backslash-confirmed'));
  }
  window.dispatchEvent(new CustomEvent('tutorial:placement-confirmed'));
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
export async function startLevel(lvls = currentLevels, levelIndex = currentLevel) {
  // Ensure no previous intro is still waiting for an event
  endAllIntros();

  // Abort any in‐flight placement
  exitPlacement();

  // Reset mirrors, stats, and UI
  mirrorsLeft   = (typeof lvls[levelIndex].maxMirrors === 'number')
                   ? lvls[levelIndex].maxMirrors
                   : Infinity;
  movesUsed     = 0;
  nearMissCount = 0;
  updateSidebarMetrics();

  console.log(`startLevel(${levelIndex}) called with ${lvls.length} levels`);
  console.log(`Level dictionary:`, lvls);

  // Point at the new level
  currentLevels = lvls;
  currentLevel  = levelIndex;

  // Build the grid & canvas size
  loadLevel(levelIndex, lvls);
  syncCanvasSize(beamCanvas);
  ({ rows: beamRows, cols: beamCols } = getLevelDims(currentLevels[currentLevel]));

  // Reset all beam state (segments, travelDist, etc.)
  resetBeam();
  // Re‐enable the renderer
  setAnimating(true);

  // Show briefing if any
  const lvl = currentLevels[currentLevel];
  if (lvl.briefing?.length) {
    await runBriefing(lvl.briefing);
  }
  // Allow one frame for the DOM to settle before tutorial
  await new Promise(requestAnimationFrame);

  // Run tutorial if enabled
  if (lvl.tutorial && tutorialsActive) {
    await runTutorial(lvl.tutorial);
  }  
}

function endAllIntros() {
  // Remove existing overlays if still around
  const t = document.getElementById('tutorialOverlay');
  if (t) t.remove();
  const b = document.getElementById('briefingOverlay');
  if (b) b.remove();

  // Hide the shared controls bar
  if (staticControls) hideStaticControls();

  // Fire skip events so any listeners resolve and clean themselves up
  window.dispatchEvent(new Event('tutorial:skip'));
  window.dispatchEvent(new Event('briefing:skip'));
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
// STATIC TUTORIAL CONTROLS
const staticControls       = document.getElementById('tutorialStaticControls');
const btnStaticSkip        = document.getElementById('staticSkip');
const btnStaticDisableTut  = document.getElementById('staticDisableTutorials');
const btnStaticDisableBrf  = document.getElementById('staticDisableBriefings');

function showStaticControls(mode) {
  // always show the bar itself
  staticControls.classList.remove('hidden');

  // 1) update skip button label
  btnStaticSkip.textContent = mode === 'briefing'
    ? 'Skip Briefing'
    : mode === 'tutorial'
      ? 'Skip Tutorial'
      : 'Skip';

  // 2) only show the disable-tutorials button if we're in a tutorial and tutorials are still active
  if (mode === 'tutorial' && tutorialsActive) {
    btnStaticDisableTut.classList.remove('hidden');
  } else {
    btnStaticDisableTut.classList.add('hidden');
  }

  // 3) only show the disable-briefings button if we're in a briefing and briefings are still active
  if (mode === 'briefing' && briefingsActive) {
    btnStaticDisableBrf.classList.remove('hidden');
  } else {
    btnStaticDisableBrf.classList.add('hidden');
  }
}

function hideStaticControls() {
  staticControls.classList.add('hidden');
}

let beamLoopStarted = false;

document.addEventListener('DOMContentLoaded', () => {

  overlay    = document.getElementById('overlay');
  cancelBtn  = document.getElementById('cancelPlacement');
  beamCanvas = document.getElementById('beamCanvas');
  beamCtx    = beamCanvas.getContext('2d');
  btnStaticSkip.addEventListener('click', skipIntros);

  btnStaticDisableTut.addEventListener('click', () => {
    tutorialsActive = false;
    setCookie('tutorialsActive', 'false');
    document.querySelectorAll('#chkTutorials').forEach(cb => cb.checked = false);
    window.dispatchEvent(new Event('tutorial:skip'));
  });

  btnStaticDisableBrf.addEventListener('click', () => {
    briefingsActive = false;
    setCookie('briefingsActive', 'false');
    document.querySelectorAll('#chkBriefings').forEach(cb => cb.checked = false);
    window.dispatchEvent(new Event('briefing:skip'));
  });
  

  // initialize dims for level 0
  ({ rows: beamRows, cols: beamCols } = getLevelDims(levels[currentLevel]));
  // kick off the very first animation
  resetBeam()
  if (!beamLoopStarted) {
    beamLoopStarted = true;
    setAnimating(true);        // allow drawing
    animateBeam(beamCtx);      // kick off the single-master loop
  }

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
    onSettings() {
      const settingsModal         = document.getElementById('settingsModal');
      const settingsWrapper       = document.getElementById('settingsContentWrapper');
      const settingsTemplate      = document.getElementById('settingsTemplate');
      const settingsCloseBtn      = document.getElementById('closeSettings');

      settingsWrapper.innerHTML = ''; // Clear only the injected part
      settingsWrapper.appendChild(settingsTemplate.content.cloneNode(true));

      const chk = settingsWrapper.querySelector('#chkTutorials');
      if (chk) {
        chk.checked = getCookie('tutorialsActive') !== 'false';
        chk.onchange = () => {
          const val = chk.checked;
          setCookie('tutorialsActive', val);
          window.tutorialsActive = val;
        };
      }
      const chkBriefings = settingsWrapper.querySelector('#chkBriefings');
      if (chkBriefings) {
        chkBriefings.checked = getCookie('briefingsActive') !== 'false';
        chkBriefings.onchange = () => {
          const val = chkBriefings.checked;
          setCookie('briefingsActive', val);
          briefingsActive = val;   
        };
      }


      settingsCloseBtn.onclick = () => {
        settingsModal.classList.add('hidden');
      };

      settingsModal.classList.remove('hidden');

      settingsModal.onclick = (e) => {
        if (e.target === settingsModal) {
          settingsModal.classList.add('hidden');
        }
      };
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
          skipIntros();
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

  window.addEventListener('briefings:toggle', e => {
    briefingsActive = e.detail;
  });



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
  
  window.addEventListener('resize',
    debounce(() => {
      syncCanvasSize(beamCanvas);
      syncCanvasSize(lightCanvas);
    }, 100)
  );

  // CLICK on cancel aborts
  cancelBtn.addEventListener('click', () => {
    exitPlacement();
    window.dispatchEvent(new CustomEvent('tutorial:placement-cancelled'));
    console.log(`dispatched cancel event`)
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
      window.dispatchEvent(new CustomEvent('tutorial:mirror-removed'));
      console.log(`mirror removed`)
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
    if (tutorialLockGrid) return; 
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
    const { type, row, col, color: beamColor } = e.detail;
    switch (type) {
      case 'bomb':
        // stop the animation loop
        setAnimating(false);
        clearAlarm();
        // darken board
        overlay.classList.remove('hidden');
        // show game over
        gameOverModal.classList.remove('hidden');
        break;

      case 'alarm':
        // only trigger once
        if (!alarmActive) {
          startAlarm(e.detail.time);
          console.log(`alarm started with ${e.detail.time} seconds`)
          // Highlight all alarm cells on the grid
          document.querySelectorAll('#grid .cell[data-type="alarm"]').forEach(cell => {
            cell.classList.add('active');
          });
          const cell = document.querySelector(`#grid .cell[data-row="${row}"][data-col="${col}"]`);
          if (cell) cell.classList.add('active');
        }
        break;

      case 'converter':
        window.dispatchEvent(new Event('tutorial:converter'));
        highlightCell(row, col, 'converter');
        break;

      case 'filter':
        highlightCell(row, col, 'filter');
        break;

      case 'target':
        // To-do: add handling for playerLevels and testing from creator mode
        // To-do: add win animation
        if (document.getElementById('btnBackToCreator').classList.contains('hidden')) {
          // unlockedUpTo = Math.max(unlockedUpTo, currentLevel + 1);
          // setCookie('unlockedUpTo', unlockedUpTo);
          // stop the animation loop
          // enforce coloured targets
          const tgt = document.querySelector(
            `#grid .cell[data-row="${row}"][data-col="${col}"]`
          );
          const req = tgt.dataset.color;
          if (req && req !== beamColor) {console.log(`req: ${req}, beamColor: ${beamColor}`);return;}
          setAnimating(false);
          overlay.classList.remove('hidden');
          winModal.classList.remove('hidden');
          clearAlarm();

          const { rows, cols } = getLevelDims(currentLevels[currentLevel]);
          const totalCells = rows*cols;
          const visited    = getVisitedCells().size;
          const litPct     = visited / totalCells;

          // compute a simple “style” score
          const basePoints     = 1000;
          const score          = Math.floor(basePoints * (1 + nearMissCount/10) * litPct);

          
          // if campaign level, update stats object
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
        window.dispatchEvent(new Event('tutorial:portal'));
        // teleport logic held in beam.js
        break;

      case 'cake':
      // 1) replace the cake cell with a blob
      const cakeEl = document.querySelector(
        `#grid .cell[data-row="${row}"][data-col="${col}"]`
      );
      if (cakeEl) cakeEl.dataset.type = 'blob';

      // 2) optionally dispatch an event if you want to hook a tutorial step
      window.dispatchEvent(new CustomEvent('tutorial:cake'));

      // 3) you can also highlight it briefly
      highlightCell(row, col, 'cake');
      break;

    }
  });
  // animateBeam(beamCanvas.getContext('2d'), rows, cols);
});

function clearAlarm() {
  if (alarmTimer !== null) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }
  alarmActive = false;
  // hide alarm div

  const ao = document.getElementById('alarmOverlay');
  if (ao) ao.classList.replace('active', 'hidden');
  const alarmDiv = document.getElementById('alarmCountdown');
  if (alarmDiv) {
    alarmDiv.classList.add('hidden');
  }
}

function startAlarm(seconds) {
  // avoid double-starting
  if (alarmActive) return;
  alarmActive = true;

  // show the overlay
  const ao = document.getElementById('alarmOverlay');
  if (ao) ao.classList.replace('hidden','active');

  // clear any old timer
  if (alarmTimer !== null) {
    clearInterval(alarmTimer);
  }

  let remaining = seconds;
  alarmTimer = setInterval(() => {
    remaining--;
    updateAlarmUI(remaining);
    if (remaining <= 0) {
      clearAlarm(); // hide & clear
      // then trigger game over
      setAnimating(false);
      overlay.classList.remove('hidden');
      gameOverModal.classList.remove('hidden');
    }
  }, 1000);
}

function updateAlarmUI(remaining) {
  const alarmDiv = document.getElementById('alarmCountdown');
  if (alarmDiv) {
    alarmDiv.textContent = `Alarm: ${remaining}s`;
    alarmDiv.classList.toggle('hidden', remaining <= 0);
  }
}

function highlightCell(r, c, cls) {
  const cell = document.querySelector(`#grid .cell[data-row="${r}"][data-col="${c}"]`);
  cell.classList.add('active');
  setTimeout(() => cell.classList.remove('active'), 200);
}

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
  const windowsPerRow   = 8;  
  const progressArr     = campaignProgressArray(levelCount);
  renderBuilding("building-container", windowsPerRow, progressArr);
}


// BRIEFING & TUTORIAL

async function runBriefing(lines) {
  if (!briefingsActive) return;
  showStaticControls('briefing');

  return new Promise(resolve => {
    // 1) Build and insert the overlay
    const overlay = document.createElement('div');
    overlay.id = 'briefingOverlay';
    overlay.innerHTML = `
      <div id="briefingBox">
        <div id="briefingText"></div>
        <button id="briefingNext" class="hidden">Next</button>
      </div>`;
    document.body.append(overlay);

    const txtContainer = overlay.querySelector('#briefingText');
    const nextBtn      = overlay.querySelector('#briefingNext');

    let idx    = 0;
    let char   = 0;
    let typing = null;

    // 2) Skip handler
    function onSkipBrief() {
      cleanup();
      resolve();
    }
    window.addEventListener('tutorial:skip', onSkipBrief);
    window.addEventListener('briefing:skip', onSkipBrief);

    // 3) Helper to update button label
    function updateButtonLabel() {
      nextBtn.textContent = idx < lines.length - 1
        ? 'Next'
        : 'Start Level';
    }

    // 4) Type one line into its own <p>
    function typeLine() {
      const p = document.createElement('p');
      p.className = 'briefing-line';
      txtContainer.append(p);
      char = 0;
      updateButtonLabel();
      typing = setInterval(() => {
        p.textContent += lines[idx][char++] || '';
        if (char >= lines[idx].length) {
          clearInterval(typing);
          typing = null;
          nextBtn.classList.remove('hidden');
        }
      }, 30);
    }

    // 5) Advance either by finishing typing or moving to next line
    function advance() {
      if (typing) {
        clearInterval(typing);
        typing = null;
        const p = txtContainer.lastElementChild;
        p.textContent = lines[idx];
        nextBtn.classList.remove('hidden');
      } else {
        idx++;
        if (idx < lines.length) {
          nextBtn.classList.add('hidden');
          typeLine();
        } else {
          cleanup();
          resolve();
        }
      }
    }

    // 6) Spacebar also advances
    function onKey(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        advance();
      }
    }

    // 7) Teardown
    function cleanup() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('tutorial:skip', onSkipBrief);
      window.removeEventListener('briefing:skip', onSkipBrief);
      // Hide the shared Skip/Disable bar again
      if (staticControls) hideStaticControls();
    }

    // 8) Wire events
    overlay.addEventListener('click', advance);
    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      advance();
    });
    document.addEventListener('keydown', onKey);

    // 9) Start first line
    typeLine();
  });
}



async function runTutorial(steps) {
  // allow global skip if the user disables tutorials
  if (!tutorialsActive) return;
  let skipAll = false;

  // build overlay if needed
  let overlay = document.getElementById('tutorialOverlay');
  staticControls.classList.remove('hidden');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.innerHTML = `
      <div id="tutorialBox">
        <div id="tutorialText"></div>
        <button id="tutorialBtn" class="hidden">Next</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  const txt  = overlay.querySelector('#tutorialText');
  const btn  = overlay.querySelector('#tutorialBtn');
  const box  = overlay.querySelector('#tutorialBox');
  const grid = document.getElementById('grid');

  showStaticControls('tutorial');
  overlay.classList.remove('hidden');

  for (const step of steps) {
    if (skipAll) break;

    if (step.pauseUntil) {
      // hide tutorial UI completely
      hideStaticControls();
      overlay.classList.add('hidden');
      grid.classList.remove('tutorial-restrict');

      // wait either for the event OR for a skip
      await new Promise((resolve) => {
        let done = false;

        const onEvent = () => {
          if (done) return;
          done = true;
          window.removeEventListener(step.pauseUntil, onEvent);
          window.removeEventListener('tutorial:skip', onSkip);
          resolve();
        };

        const onSkip = () => {
          if (done) return;
          done = true;
          window.removeEventListener(step.pauseUntil, onEvent);
          window.removeEventListener('tutorial:skip', onSkip);
          resolve();
        };

        window.addEventListener(step.pauseUntil, onEvent);
        window.addEventListener('tutorial:skip', onSkip);
      });

      // restore tutorial UI (but leave grid unlocked)
      showStaticControls('tutorial');
      overlay.classList.remove('hidden');
      continue;
    }

    // a) highlight
    let hiliteEl = null;
    if (step.selector) {
      hiliteEl = document.querySelector(step.selector);
      if (hiliteEl) hiliteEl.classList.add('tutorial-highlight');
    }

    // b) position box
    if (hiliteEl) {
      const rect = hiliteEl.getBoundingClientRect();
      box.style.top  = `${rect.bottom + 8}px`;
      box.style.left = `${rect.left}px`;
      box.style.transform = '';
    } else {
      box.style.top       = `50%`;
      box.style.left      = `50%`;
      box.style.transform = `translate(-50%, -50%)`;
    }

    // c) fill text & button
    txt.innerHTML   = (step.text || '').replace(/\n/g,'<br>');
    btn.textContent = step.waitFor ? 'Waiting…' : 'Next';
    btn.classList.toggle('hidden', !!step.waitFor);

    // d) pointer-events: allow click-through on certain waitFor
    if (
      step.waitFor === 'tutorial:placement-started' ||
      step.waitFor === 'tutorial:placement-confirmed' ||
      step.waitFor === 'tutorial:backslash-confirmed' ||
      step.waitFor === 'tutorial:converter'
    ) {
      overlay.style.pointerEvents = 'none';
    } else {
      overlay.style.pointerEvents = 'auto';
    }

    // e) lock grid by default
    grid.classList.add('tutorial-restrict');
    if (hiliteEl) hiliteEl.classList.add('tutorial-allow');
    (step.allow || []).forEach(sel =>
      document.querySelectorAll(sel).forEach(el =>
        el.classList.add('tutorial-allow')
      )
    );
    btn.classList.add('tutorial-allow');

    // f) await user interaction or event
    await new Promise(resolve => {
      const cleanups = [];

      // 1) if no waitFor, clicking anywhere advances
      if (!step.waitFor) {
        const onAny = () => finish();
        overlay.addEventListener('click', onAny);
        cleanups.push(() => overlay.removeEventListener('click', onAny));
        const onKey = e => { if (e.code === 'Space') finish(); };
        window.addEventListener('keydown', onKey);
        cleanups.push(() => window.removeEventListener('keydown', onKey));
      }

      // 2) Next button always works
      const onBtn = e => { e.stopPropagation(); finish(); };
      btn.addEventListener('click', onBtn);
      cleanups.push(() => btn.removeEventListener('click', onBtn));

      // 3) if waiting for a custom event…
      if (step.waitFor) {
        const onEvt = () => finish();
        window.addEventListener(step.waitFor, onEvt);
        cleanups.push(() => window.removeEventListener(step.waitFor, onEvt));
      }

      // 4) skip handler
      const onSkip = () => {
        skipAll = true;
        finish();
      };
      window.addEventListener('tutorial:skip', onSkip);
      cleanups.push(() => window.removeEventListener('tutorial:skip', onSkip));

      function finish() {
        cleanups.forEach(fn => fn());
        if (hiliteEl) hiliteEl.classList.remove('tutorial-highlight');
        document.querySelectorAll('.tutorial-allow')
                .forEach(el => el.classList.remove('tutorial-allow'));
        grid.classList.remove('tutorial-restrict');
        overlay.style.pointerEvents = 'auto';
        resolve();
      }
    });
  }

  // tear down
  hideStaticControls();
  overlay.remove();
}

function skipIntros() {
  window.dispatchEvent(new Event('tutorial:skip'));
  window.dispatchEvent(new Event('briefing:skip'));
}
