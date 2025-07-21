import { createGrid } from './grid.js';
import { inMode,
         modeToggle } from './index.js'
import { playerLevels,
         getPlayerLevels,
         builtIn } from './playerLevels.js';
import { saveCustomLevels, 
         loadCustomLevels } from './utils.js';

const CELL_TYPES = [
  { key: 'start',  name: 'Start',        multiple: false,  codePrefix: 'S', iconType: 'start',        variants: ['U','R','D','L'], limit: 1 },
  { key: 'wall',   name: 'Wall',         multiple: true,   codePrefix: '#', iconType: 'wall',         variants: [],         limit: Infinity },
  { key: 'portal', name: 'Portal',       multiple: true,   codePrefix: 'P', iconType: 'portal',       variants: ['A','B','C'], limit: 3 },
  { key: 'filter', name: 'Filter',       multiple: true,   codePrefix: 'F', iconType: 'filter',       variants: ['R','G','B'], limit: 3 },
  { key: 'bomb',   name: 'Bomb',         multiple: true,   codePrefix: 'B', iconType: 'bomb',         variants: [],         limit: Infinity },
  { key: 'target', name: 'Target',       multiple: false,  codePrefix: 'T', iconType: 'target',       variants: [],         limit: 1 },
];

export function initLevelCreator({
  aside, createContainer, maxRows = 10, maxCols = 10,
  saveLevel, loadLevel
}) {

  // --- inject name/desc inputs + save button ---
  const form = document.createElement('div');
  form.className = 'lc-save-form';
  form.innerHTML = `
    <input id="lc-name" placeholder="Enter level name" />
    <textarea id="lc-desc" placeholder="Enter description (optional)"></textarea>
    <button id="lc-save-btn">Save Level</button>
  `;
  aside.prepend(form);

  const btnMyLevels      = aside.querySelector('#btnMyLevels');
  const myLevelsPanel    = aside.querySelector('#myLevelsContainer');
  const myLevelsList     = aside.querySelector('#myLevelsList');
  const closeMyLevelsBtn = aside.querySelector('#closeMyLevels');

  function refreshMyLevels() {
    myLevelsList.innerHTML = '';
    getPlayerLevels().forEach((lvl, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="ml-name">${lvl.name}</span>
        <button class="ml-load" data-i="${i}">Load</button>
        <button class="ml-del"  data-i="${i}">Delete</button>
      `;
      myLevelsList.append(li);
    });
  }

  // Open panel
  btnMyLevels.addEventListener('click', () => {
    refreshMyLevels();
    myLevelsPanel.classList.remove('hidden');
  });

  // Close panel
  closeMyLevelsBtn.addEventListener('click', () => {
    myLevelsPanel.classList.add('hidden');
  });

  // Delegate clicks inside the list
  myLevelsList.addEventListener('click', e => {
    const idx = parseInt(e.target.dataset.i, 10);
    if (e.target.matches('.ml-load')) {
      const lvl = playerLevels[idx];
      // wipe current working layout, then:
      nameInput.value = lvl.name;
      descInput.value = lvl.description;
      layout = JSON.parse(JSON.stringify(lvl.layout)); // deep copy
      rows = layout.length;
      cols = layout[0].length;
      controls.querySelector('#row-count').textContent = rows;
      controls.querySelector('#col-count').textContent = cols;
      redraw();
      updateCounts();  // recalculate “used/limit” for each CELL_TYPE
      myLevelsPanel.classList.add('hidden');
    }
    if (e.target.matches('.ml-del')) {
      const allLevels = getPlayerLevels();
      const customStart = builtIn.length;
      if (!confirm(`Delete “${allLevels[idx].name}”? This can’t be undone.`)) return;

      // 1) Remove from the custom slice only
      const customs = loadCustomLevels();
      const customIdx = idx - customStart;
      if (customIdx < 0) {
        // trying to delete a built-in level? Bail.
        alert("Cannot delete built-in levels.");
        return;
      }
      customs.splice(customIdx, 1);
      saveCustomLevels(customs);

      // 2) Refresh the panel
      refreshMyLevels();
    }
  });

  const nameInput = form.querySelector('#lc-name');
  const descInput = form.querySelector('#lc-desc');
  const saveBtn   = form.querySelector('#lc-save-btn');

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();

    // 1) Validations
    if (name.length < 4) {
      return alert('Name must be at least 4 characters');
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
      return alert('Name may only contain letters, numbers, spaces, hyphens and underscores');
    }
    if (playerLevels.some(l=>l.name.toLowerCase()===name.toLowerCase())) {
      return alert('Name already taken, please choose another');
    }

    // 2) Confirm dialog
    if (!confirm(`Save level?\n\nName: ${name}\nDescription: ${desc||'(none)'}`)) {
      return;
    }

    // 3) Build level data
    const layoutCopy = layout.map(row => row.slice());
    const newLevel = { name, description: desc, layout: layoutCopy };

    // 4) Call app‐level save
    saveLevel(newLevel);

    alert('Level saved!');
  });
  
  let rows = 10, cols = 10;
  let layout = createEmptyLayout(rows, cols);
  let selectedType = null;
  let selectedVariant = null;
  const variantMap = {};  // remembers last selected variant for each type
  const counts = {}
  

  // 1) Build the aside palette
  const palette = document.createElement('ul');
  palette.className = 'creator-palette';
  aside.append(palette);

  const variantBar = document.createElement('div');
  variantBar.className = 'variant-bar hidden';

  // Populate palette items
  CELL_TYPES.forEach(type => {
    const li = document.createElement('li');
    li.className = 'creator-item';
    li.dataset.key = type.key;
    // tooltip on hover
    li.title = type.name + (type.variants.length ? ` (${type.variants.join(',')})` : '');
    li.innerHTML = `
      <div class="preview-cell cell" data-type="${type.iconType}"></div>
      <span class="label">${type.name}</span>
      <span class="count">0 / ${type.limit}</span>
    `;
    li.addEventListener('click', () => selectType(type.key, li));
    palette.append(li);
  });

  // 2) Seed the default “start” variant
  variantMap['start'] = 'U';

  // 3) Auto-select the Start tool
  const startLi = palette.querySelector('li[data-key="start"]');
  if (startLi) {
    selectType('start', startLi);
  }

  // Ensure the variant bar stays hidden on load
  variantBar.classList.add('hidden');

  // Exit button
  const exitBtn = document.getElementById('exitCreator');
  exitBtn.onclick = () => {
    modeToggle('main');
  };
  const btnBack = document.getElementById('btnBackToCreator');
  const btnTest = document.createElement('button');
  btnTest.textContent = '▶ Test this level';
  btnTest.addEventListener('click', () => {
    // 1) validate there is exactly one start
    let startCount = 0;
    layout.forEach(row => row.forEach(cell => { if (cell.startsWith('S-')) startCount++; }));
    if (startCount !== 1) {
      return alert('You must place exactly one Start cell to test.');
    }
    btnBack.classList.remove('hidden');
    // 2) deep‐copy layout matrix so creator edits don’t bleed
    const testLayout = layout.map(r => [...r]);
    // 3) hand off to playing mode
    modeToggle('playing', {
      customLevel: {
        name:        'Testing Level',
        description: '',
        layout:      testLayout
      }});
  });
  aside.append(btnTest);

  
  btnBack.addEventListener('click', () => {
    modeToggle('creator');
    btnBack.classList.add('hidden');
  });

  const btnClear = document.createElement('button');
  btnClear.textContent = '🗑 Clear Grid';
  btnClear.addEventListener('click', () => {
    if (!confirm('Erase every cell from your design? This cannot be undone.')) return;
    // reset layout array to all “.” 
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        layout[r][c] = '.';
      }
    }
    redraw();
    updateCounts();
  });
  aside.append(btnClear);

  // 2) Variant-picker logic + live preview update
  function selectType(key, li) {
    const hasVariants = CELL_TYPES.find(t => t.key === key).variants.length > 0;

    // 1) If clicking the same type and the variant bar is visible, just hide it
    if (selectedType?.key === key && !variantBar.classList.contains('hidden')) {
      variantBar.classList.add('hidden');
      return;
    }

    // 2) Highlight the clicked <li>, un-highlight siblings
    aside.querySelectorAll('.creator-item').forEach(item => {
      item.classList.toggle('active', item === li);
    });

    // 3) Update selectedType
    selectedType = CELL_TYPES.find(t => t.key === key);

    // 4) Re-build the variantBar
    if (variantBar.parentElement) variantBar.parentElement.removeChild(variantBar);
    variantBar.innerHTML = '';

    if (hasVariants) {
      // 5) Create one button per variant
      selectedType.variants.forEach(v => {
        const btn = document.createElement('button');
        btn.textContent = v;
        btn.addEventListener('click', e => {
          e.stopPropagation(); // don’t bubble up to the <li>
          // un-highlight all
          variantBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedVariant = v;
          variantMap[key] = v;               // remember it
          updatePalettePreview(li, key, v);
        });
        variantBar.append(btn);
      });

      // 6) Restore last variant or default to first
      const saved = variantMap[key];
      if (saved && selectedType.variants.includes(saved)) {
        selectedVariant = saved;
      } else {
        selectedVariant = selectedType.variants[0];
        variantMap[key] = selectedVariant;
      }

      // 7) Highlight that variant button
      variantBar.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.textContent === selectedVariant);
      });

      // 8) Show the bar beneath this <li>
      variantBar.classList.remove('hidden');
      li.append(variantBar);

    } else {
      // no variants → clear
      selectedVariant = null;
      variantBar.classList.add('hidden');
    }

    // 9) Update the little preview icon
    updatePalettePreview(li, key, selectedVariant);
  }

  // helper to sync the preview icon inside a palette <li>
  function updatePalettePreview(li, typeKey, variant) {
    const preview = li.querySelector('.preview-cell');
    // set base type
    preview.dataset.type = typeKey;

    // clear all variant attrs
    delete preview.dataset.direction;
    delete preview.dataset.portalId;
    delete preview.dataset.color;

    // if there is a variant, set the correct data-attr
    if (variant) {
      if (typeKey === 'start') {
        preview.dataset.direction = variant;
      } else if (typeKey === 'portal') {
        preview.dataset.portalId = variant;
      } else if (typeKey === 'filter') {
        preview.dataset.color = variant;
      }
    }
  }



  // 3) Rows/Cols rockers
  const controls = document.createElement('div');
  controls.className = 'creator-controls';
  function setupRowColControls(r, c) {
    controls.innerHTML = `
      Rows: <button id="row-minus">–</button>
            <span id="row-count">${r}</span>
            <button id="row-plus">+</button>
      Cols: <button id="col-minus">–</button>
            <span id="col-count">${c}</span>
            <button id="col-plus">+</button>`
  
  controls.querySelector('#row-plus').onclick = () => resize(rows+1, cols);
  controls.querySelector('#row-minus').onclick = () => resize(rows-1, cols);
  controls.querySelector('#col-plus').onclick = () => resize(rows, cols+1);
  controls.querySelector('#col-minus').onclick = () => resize(rows, cols-1);
  };

  setupRowColControls(rows, cols);
  aside.append(controls);
  // 4) Draw initial grid
  const gridEl = createContainer.querySelector('#creator-grid');
  if (!gridEl) {
    console.error('initLevelCreator: no #creator-grid found');
    return;
  }
  redraw();
  console.log(`initial redraw()`)


  // 5) Cell‐click handler
  gridEl.addEventListener('click', e => {
    if (inMode !== 'creator') return;
    const cell = e.target.closest('.cell');
    if (!cell || !selectedType) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;

    const code = selectedType.codePrefix
            + (selectedVariant ? '-' + selectedVariant : '');

    const isAdding = layout[r][c] !== code;
    
    // block if trying to add a cell that exceeds its limit
    // allow replacing existing cells with variants of the same type
    if (isAdding && counts[selectedType.key] >= selectedType.limit && cell.dataset.type !== selectedType.key) {
      // e.g. flash the button red, or just alert
      alert(`You may only place up to ${selectedType.limit} ${selectedType.name}(s).`);
      return;       // <-- bail out, no change
    }

    // toggle
    layout[r][c] = (layout[r][c] === code) ? '.' : code;


    updateCounts();
    redraw();
    console.log(`gridEl eventListener redraw()`)
  });

  function redraw() {
    gridEl.innerHTML = '';
    console.log(`CREATE GRID CALLED FROM redraw()`)
    createGrid(gridEl, rows, cols, layout);
  }

  function resize(r, c) {
    if (r < 1 || c < 1 || r > maxRows || c > maxCols) return;
    // if shrinking and cells would be lost, confirm:
    if ((r<rows || c<cols) && hasPlacementsInCutoff(r,c)) {
      if (!confirm('This will delete placed cells in the trimmed rows/cols. Continue?')) {
        return;
      }
    }
    // rebuild layout:
    const newL = createEmptyLayout(r,c);
    for (let y=0; y<r && y<rows; y++) {
      for (let x=0; x<c && x<cols; x++) {
        newL[y][x] = layout[y][x];
      }
    }
    rows = r; cols = c;c
    layout = newL;
    controls.querySelector('#row-count').textContent = rows;
    controls.querySelector('#col-count').textContent = cols;
    redraw();
  console.log(`resize() redraw()`)

  }

  function hasPlacementsInCutoff(r,c) {
    for (let y=r; y<rows; y++) if (layout[y].some(v=>v!=='.')) return true;
    for (let y=0; y<r; y++) for (let x=c; x<cols; x++) if (layout[y][x]!=='.') return true;
    return false;
  }

  function updateCounts() {
    CELL_TYPES.forEach(type => {
      const count = layout.flat().filter(cell => cell.startsWith(type.codePrefix)).length;
      counts[type.key] = count;
      aside.querySelectorAll('.creator-item').forEach(li => {
        if (li.querySelector('.preview-cell').dataset.type === type.key) {
          li.querySelector('.count').textContent = `${count}/${type.limit}`;
        }
      });
    });
  }

  function createEmptyLayout(r,c) {
    return Array.from({length:r},()=>Array.from({length:c},()=>'.'));
  }
  updateCounts();

}

