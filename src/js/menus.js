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
 * @param {{onPlay:Function, onLevels:Function, onHowTo:Function}} cfg
 */
export function setupMainMenu({onPlay, onLevels, onHowTo}) {
    // Main menu elements
    const mainMenu          = document.getElementById('mainMenu');
    const btnPlay           = document.getElementById('btnPlay');
    const levelsBtnMain     = document.getElementById('btnLevelsMain');
    const howToBtn          = document.getElementById('btnHowTo');

    // 1) MAIN MENU  
    function hideMainMenu() { mainMenu.classList.add('hidden'); }
    btnPlay.onclick = () => {
        hideMainMenu();
        onPlay(); // start the first level
    };
    levelsBtnMain.onclick = () => {
        onLevels(); // show level select modal
    };
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
    const tabs        = pauseMenu.querySelectorAll('.tabs button');
    const panels      = pauseMenu.querySelectorAll('.panel');
    const pauseLevels = document.getElementById('pauseLevelList');
    const pauseBtn   = document.getElementById('pauseBtn');

    let currentTab = 'general';
    let lastTab    = 'general';

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
        // clear out whatever you put in there (optional)
        innerBody.innerHTML = '';
        activateTab(lastTab);
    });

    pauseBtn.addEventListener('click', () => {
        pauseMenu.classList.toggle('hidden');
        if (!pauseMenu.classList.contains('hidden')) {
            activateTab('general');
        }
    });

    // ESC toggles pause
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            pauseMenu.classList.toggle('hidden');
            if (!pauseMenu.classList.contains('hidden')) {
                activateTab('general');
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