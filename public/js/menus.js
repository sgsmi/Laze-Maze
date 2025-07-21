import { inMode,
         modeToggle,
         setMode } from './index.js'
// TODO: Create master menu file that includes all menu-related functions
// and handles the display of different menus like main menu, pause menu, etc.

// Aim to centralize menu logic to avoid duplication and improve maintainability
// Refactor to one master menu which functions as the main menu, pause menu etc, 
// pause menu is closest to this with master innerModal to display different content

// 1. shift all menu-related functions to this file
// 2. work on master menu that can display different content based on context (currently innerModal)
// 3. ensure all menu interactions are handled through this master menu
// 4. remove any redundant menu code from other files
// 5. test thoroughly to ensure all menu interactions work as expected
// 6. document the new menu structure and how to add new menu items or content
// 7. consider adding a menu state manager to handle transitions between different menus
// 8. implement a consistent styling for all menus to ensure a cohesive user experience, possible classes for different menu types (highlightable, selectable, info based etc.)

// Add padding around game grid for II pause button and other UI elements (e.g. mirrors available, move count, etc.)

/**
 * Main Menu (title screen) wiring.
 * @param {{onPlay:Function, onLevels:Function, onLevelCreator:Function, onPlayerLevels:Function, onHowTo:Function}} cfg
 */
export function setupMainMenu({onPlay, onLevels, onLevelCreator, onPlayerLevels, onHowTo}) {
    // Main menu elements
    const mainMenu          = document.getElementById('mainMenu');
    const btnPlay           = document.getElementById('btnPlay');
    const levelsBtnMain     = document.getElementById('btnLevelsMain');
    const howToBtn          = document.getElementById('btnHowTo');
    const btnLevelCreator   = document.getElementById('btnLevelCreator')
    const btnPlayerLevels   = document.getElementById('btnPlayerLevels');

    // Level creator setup:
    const creatorAside = document.querySelector('#creator-aside');
    const createContainer = document.querySelector('#create-container');

    // 1) MAIN MENU  
    btnPlay.onclick = () => {
        onPlay(); // start the first level
    };
    levelsBtnMain.onclick = () => {
        onLevels(); // show level select modal
    };
    // Levels tab buttons
    btnLevelCreator.onclick = () => {
        onLevelCreator();
    };
    btnPlayerLevels.onclick = () => {
        // to-do: show player levels modal
        onPlayerLevels();
    }
    howToBtn.onclick = () => {
        onHowTo(); // show how-to modal
    };
}

/**
 * Pause Menu (in‐game) wiring with tabs.
 * @param {{onResume:Function,onRestart:Function,onOpenKey:Function,onSelectLevel:Function}} cfg
 */
export function setupPauseMenu({ onResume, onRestart, onOpenKey, onSelectLevel }) {

    const pauseMenu   = document.getElementById('pauseMenu');
    const btnResume   = document.getElementById('btnResume');
    const btnRestart  = document.getElementById('btnRestart');
    const btnKey      = document.getElementById('openKeyModal');
    const btnToMainMenu = document.getElementById('btnToMainMenu');
    const tabs        = pauseMenu.querySelectorAll('.tabs button');
    const panels      = pauseMenu.querySelectorAll('.panel');
    const pauseLevels = document.getElementById('pauseLevelList');
    const pauseBtn   = document.getElementById('pauseBtn');

    let currentTab = 'general';
    let lastTab    = 'general';

    function setPaused(on) {
        // to-do: this is not reliable, implement 'paused' mode to handle pause state
        // e.g. does not work if returning to main menu or pressing resume
        pauseBtn.innerHTML = on ? '▶' : '❚❚';
        pauseMenu.classList.toggle('hidden', !on);
        if (!on) {
            activateTab('general');
        }
    }

    // Inner Modal
    // (used for displaying key, how-to, and other info)
    // grab inner modal pieces
    const innerModal = document.getElementById('panel-inner');
    const innerBody  = document.getElementById('innerBody');
    const innerClose = document.getElementById('innerClose');

    // openInnerModal(contentHtml)
    function openInnerModal(html) {
        lastTab = currentTab;
        activateTab('inner')
        innerBody.innerHTML = html;
        innerModal.classList.remove('hidden');
    }

    innerBack.addEventListener('click', () => {
        innerBody.innerHTML = '';
        activateTab(lastTab);
    });

    pauseBtn.addEventListener('click', () => {
        if (inMode !== 'playing') return;
        setPaused(pauseMenu.classList.contains('hidden'));
    });

    // ESC toggles pause
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (inMode === 'playing') {
                setPaused(pauseMenu.classList.contains('hidden'));
            }
            if (inMode === 'creator') {
                // add a yes/no prompt here
                // if (confirm('Exit level creator? Any unsaved changes will be lost.')) 
                modeToggle('main');
            }
        }
    });

    // Tab switching
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
        if (btn.dataset.tab === 'levels') {
            onSelectLevel(pauseLevels);
        }
        });
    });
    function activateTab(name) {
        currentTab = name;
        tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
        panels.forEach(p => p.classList.toggle('hidden', p.id !== `panel-${name}`));
    }

    // General tab buttons
    btnResume.addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        onResume();
    });
    btnRestart.addEventListener('click', () => {
        pauseMenu.classList.add('hidden');
        onRestart();
    });
    btnKey.addEventListener('click', () => {
        openInnerModal(document.getElementById('keyModal').innerHTML);
        innerModal.classList.add('key-modal')
        onOpenKey();
    });
    btnToMainMenu.addEventListener('click', () => {
        // add a yes/no prompt here
        // if (!confirm('Return to main menu? Any unsaved progress will be lost.')) {
        //     return;
        // }
        modeToggle('main');
        setPaused(pauseMenu.classList.contains('hidden'));
    });
}

/**
 * Win & Lose modal wiring
 * @param {{onLevels:Function,onReplay:Function,onNext:Function,onRestart:Function}} cfg
 */
export function setupWinLoseModals ({ onLevels, onReplay, onNext, onRestart}) {
    // Win modal
    const winModal     = document.getElementById('winModal');
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    const replayBtn    = document.getElementById('replayBtn');
    const levelsBtn    = document.getElementById('levelsBtn');
    const closeLS      = document.getElementById('closeLevelSelect');
    const overlay      = document.getElementById('overlay');

    levelsBtn.addEventListener('click', () => {
        onLevels();
    });

    closeLS.addEventListener('click', () => {
        levelSelectModal.classList.add('hidden');
    });

    replayBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        winModal.classList.add('hidden');
        onReplay();
    });

    nextLevelBtn.addEventListener('click', () => {
        onNext();
    });


    // Game over modal
    document.getElementById('restartBtn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        onRestart();
    });
}

export function openWinModal() {
    // TODO
}