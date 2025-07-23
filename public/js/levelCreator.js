import { createGrid } from './grid.js';
import { inMode,
         modeToggle } from './index.js'
import { playerLevels,
         getPlayerLevels,
         builtIn } from './playerLevels.js';
import { saveCustomLevels, 
         loadCustomLevels } from './utils.js';

const CELL_TYPES = [
  { key: 'empty',     name: 'Empty',        multiple: true,   codePrefix: '.',  iconType: 'empty',       variants: ['', 'L'],             limit: Infinity },
  { key: 'start',     name: 'Start',        multiple: false,  codePrefix: 'S', iconType: 'start',        variants: ['U','R','D','L'], limit: 1 },
  { key: 'wall',      name: 'Wall',         multiple: true,   codePrefix: '#', iconType: 'wall',         variants: [],                limit: Infinity },
  { key: 'portal',    name: 'Portal',       multiple: true,   codePrefix: 'P', iconType: 'portal',       variants: ['A','B','C'],     limit: 3 },
  { key: 'converter', name: 'Converter',    multiple: true,   codePrefix: 'C', iconType: 'converter',    variants: ['R','G','B'],     limit: Infinity },
  { key: 'filter',    name: 'Filter',       multiple: true,   codePrefix: 'F', iconType: 'filter',       variants: ['R','G','B'],     limit: 3 },
  { key: 'bomb',      name: 'Bomb',         multiple: true,   codePrefix: 'B', iconType: 'bomb',         variants: [],                limit: Infinity },
  { key: 'target',    name: 'Target',       multiple: false,  codePrefix: 'T', iconType: 'target',       variants: ['', 'R', 'G', 'B'],                limit: 1 },
  { key: 'alarm',     name: 'Alarm',        multiple: true,   codePrefix: 'A', iconType: 'alarm',        variants: ['10','15','20'],  limit: Infinity },
];  

const VARIANT_LABELS = {
  empty:     { '': 'Unlit', L: 'Lit' },
  start:     { U: 'Up', R: 'Right', D: 'Down', L: 'Left' },
  wall:      {},
  portal:    { A: 'Portal A', B: 'Portal B', C: 'Portal C' },
  converter: { R: 'Red', G: 'Green', B: 'Blue' },
  filter:    { R: 'Red', G: 'Green', B: 'Blue' },
  bomb:      {},
  target:    { '': 'Any', R: 'Red', G: 'Green', B: 'Blue' },
  alarm:     { '10': '10s', '15': '15s', '20': '20s' }
};

const TIP_TEXTS = {
  empty:     "Empty cells do nothing—beams pass straight through.",
  start:     "Start emits your beam in the chosen direction.",
  wall:      "Wall blocks beams completely.",
  portal:    "Portals teleport a beam from one matching letter to the other.",
  converter: "Converters recolour your beam (R/G/B) so you can hit coloured targets.",
  filter:    "Filters only let through the matching color—others are blocked.",
  bomb:      "Bombs explode on contact—avoid touching them!",
  target:    "Targets are your goal—redirect the beam here to win. Coloured variants only accept a matching beam from a beam converter.",
  alarm:     "Alarms trigger a countdown when hit. Beat the clock!"
};

function getVariantLabel(typeKey, variant) {
  const map = VARIANT_LABELS[typeKey];
  return map
    ? (map[variant] || variant || '—')
    : (variant || '—');
}

let maxMirrors = 10; // default to 10

// Utility: Serialize a level object into JS code string
function serializeLevel(level) {
  const layoutLines = level.layout.map(row => {
    const cells = row.map(cell => `'${cell}'`).join(', ');
    return `    [${cells}]`;
  });
  const layoutString = `[
${layoutLines.join(',\n')}
  ]`;

  return `{
  name: "${level.name}",
  description: "${level.description}",
  maxMirrors: ${level.maxMirrors},
  layout: ${layoutString}
},`;
}




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

  const warningEl = document.createElement('div');
  warningEl.id = 'lc-warning';
  warningEl.className = 'lc-warning hidden';
  aside.append(warningEl);


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
    const newLevel = { name, description: desc, maxMirrors: maxMirrors, layout: layoutCopy };

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

  CELL_TYPES.forEach(type => {
    // if this type has variants, use the first one; otherwise blank
    variantMap[type.key] = type.variants.length
      ? type.variants[0]
      : '';
  });

  // show a temporary toast message that fades out
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'lc-toast';
    toast.textContent = msg;
    aside.append(toast);

    // auto-fade after 1.5s
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 1500);
  }
  

  // 1) Build the aside palette
  const palette = document.createElement('ul');
  palette.className = 'creator-palette';
  aside.append(palette);

  // create one floating info‐popup
  const infoPopup = document.createElement('div');
  infoPopup.id = 'lc-info-popup';
  infoPopup.className = 'lc-info-popup hidden';
  aside.append(infoPopup);


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
    palette.append(li);
    updatePalettePreview(li, type.key, variantMap[type.key]);
    li.addEventListener('click', () => selectType(type.key, li));

        // ---- INFO BUTTON ----
    const infoBtn = document.createElement('button');
    infoBtn.className = 'info-btn';
    infoBtn.textContent = 'ℹ';
    infoBtn.title = `What is a ${type.name}?`;
    // stop this click from selecting the tool
    infoBtn.addEventListener('click', e => {
      e.stopPropagation();
      // fill and position the popup
      infoPopup.textContent = TIP_TEXTS[type.key] || '';
      const rect = li.getBoundingClientRect();
      // position below the li
      infoPopup.style.top  = `${rect.bottom + window.scrollY + 4}px`;
      infoPopup.style.left = `${rect.left + window.scrollX}px`;
      infoPopup.classList.remove('hidden');
      // auto‐hide on the next click anywhere
      document.addEventListener('click', () => {
        infoPopup.classList.add('hidden');
      }, { once: true });
    });
    li.append(infoBtn);

    
  });

  // 2) Seed the default “start” variant
  variantMap['Empty'] = '';

  // 3) Auto-select the Start tool
  const startLi = palette.querySelector('li[data-key="empty"]');
  if (startLi) {
    selectType('empty', startLi);
  }

  // Ensure the variant bar stays hidden on load
  variantBar.classList.add('hidden');

  // Exit button
  const exitBtn = document.getElementById('exitCreator');
  exitBtn.onclick = () => {
    modeToggle('main');
    document.getElementById('pauseBtn')?.classList.remove('hidden');
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
    // hide the pause button:
    document.getElementById('pauseBtn')?.classList.add('hidden');
    // 2) deep‐copy layout matrix so creator edits don’t bleed
    const testLayout = layout.map(r => [...r]);
    // 3) hand off to playing mode
    modeToggle('playing', {
      customLevel: {
        name:        'Testing Level',
        description: '',
        maxMirrors: maxMirrors || rows * cols, // default to no limit
        layout:      testLayout
      }
    });
    console.log(`Custom level created with max mirrors: ${maxMirrors}`);  
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

  // Add a "Copy Level to Clipboard" button
  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Copy Level to Clipboard';
  btnCopy.className = 'creator-control';
  btnCopy.addEventListener('click', () => {
    // Gather current level data
    const name = document.getElementById('lc-name').value.trim();
    const description = document.getElementById('lc-desc').value.trim();
    // `maxMirrors` and `layout` are the variables used throughout this file
    const levelObj = { name, description, maxMirrors, layout };

    // Serialize and copy
    const codeSnippet = serializeLevel(levelObj);
    navigator.clipboard.writeText(codeSnippet)
      .then(() => alert('Level structure copied! Paste into levels.js.'))
      .catch(err => alert('Copy failed: ' + err));
  });
  aside.append(btnCopy);

  // 2) Variant-picker logic + live preview update
 function selectType(key, li) {
  const typeDef = CELL_TYPES.find(t => t.key === key);
  const hasVariants = typeDef.variants.length > 0;

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
  selectedType = typeDef;

  // 4) Remove any existing variantBar from the DOM and clear it
  if (variantBar.parentElement) {
    variantBar.parentElement.removeChild(variantBar);
  }
  variantBar.innerHTML = '';

  if (hasVariants) {
    // 5) Ensure there's always a selected variant (default to first if none saved)
    if (!variantMap[key] || !typeDef.variants.includes(variantMap[key])) {
      variantMap[key] = typeDef.variants[0];
    }
    selectedVariant = variantMap[key];

    // 6) Create one button per variant
    typeDef.variants.forEach(v => {
      const btn = document.createElement('button');
      btn.textContent = getVariantLabel(key, v);
      btn.dataset.variant = v;
      btn.classList.toggle('active', v === selectedVariant);

      btn.addEventListener('click', e => {
        e.stopPropagation(); // don’t bubble up to the <li>
        // update selection
        variantMap[key] = v;
        selectedVariant = v;
        // refresh active states
        variantBar.querySelectorAll('button').forEach(b => {
          b.classList.toggle('active', b.dataset.variant === v);
        });
        updatePalettePreview(li, key, v);
      });

      variantBar.appendChild(btn);
    });

    // 7) Show the bar beneath this <li>
    variantBar.classList.remove('hidden');
    li.appendChild(variantBar);

  } else {
    // no variants → clear
    selectedVariant = null;
    variantBar.classList.add('hidden');
  }

  // 8) Update the little preview icon
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
    delete preview.dataset.variant;

    // if there is a variant, set the correct data-attr
    if (variant) {
      switch (typeKey) {
        case 'start':
          preview.dataset.direction = variant;
          break;
        case 'portal':
          preview.dataset.portalId = variant;
          break;
        case 'filter':
          preview.dataset.color = variant;
          break;
        case 'converter':          // <— now handles converter!
          preview.dataset.color = variant;
          break;
        case 'target':
          preview.dataset.color = variant;
          break;
        case 'empty':
          preview.dataset.variant = variant;
          break;
      }
    }
  }



  // 3) Rows/Cols rockers
  const controls = document.createElement('div');
  controls.className = 'creator-controls';
  function setupRowColControls(r, c) {
    controls.innerHTML = `
    <div class="creator-controls-header">Grid Size</div>
      <div class="creator-controls-body">
        Rows: <button id="row-minus">–</button>
              <span id="row-count">${r}</span>
              <button id="row-plus">+</button>
        Cols: <button id="col-minus">–</button>
              <span id="col-count">${c}</span>
              <button id="col-plus">+</button>
      </div>
      <div class="creator-controls-footer">
        Max Mirrors:
        <input type="number" id="max-mirrors" placeholder="Max Mirrors" value="${maxMirrors}" min="0"/> 
      </div>`

    // 1) Update maxMirrors on input change
    const maxMirrorsInput = controls.querySelector('#max-mirrors');
    maxMirrorsInput.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (val === '') {
        maxMirrors = rows * cols; // reset to no limit
      } else {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0) {
          alert('Please enter a valid number for max mirrors');
          return;
        }
        maxMirrors = num;
      }
      console.log(`Max mirrors set to: ${maxMirrors}`);
    });
  
    controls.querySelector('#row-plus').onclick = () => resize(rows+1, cols);
    controls.querySelector('#row-minus').onclick = () => resize(rows-1, cols);
    controls.querySelector('#col-plus').onclick = () => resize(rows, cols+1);
    controls.querySelector('#col-minus').onclick = () => resize(rows, cols-1)
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
  // helper to count occurrences of a code in layout
  function countCode(code) {
    return layout.flat().filter(ch => ch === code).length;
  }

  // compute all warnings from the current layout
  function computeWarnings() {
    const msgs = [];
    // 1) Lonely portals
    CELL_TYPES.find(t => t.key === 'portal').variants.forEach(v => {
      const cnt = countCode(`P-${v}`);
      if (cnt === 1) {
        msgs.push(`Portals get lonely—add a matching “P-${v}” pair to complete it.`);
      }
    });

    // 2) Missing converters for filters & targets
    ['filter','target'].forEach(typeKey => {
      CELL_TYPES.find(t => t.key === typeKey).variants.forEach(v => {
        const code = (typeKey === 'filter' ? 'F' : 'T') + '-' + v;
        if (countCode(code) > 0 && countCode(`C-${v}`) === 0) {
          msgs.push(
            `${getVariantLabel(typeKey, v)} ${CELL_TYPES.find(t => t.key === typeKey).name} placed ` +
            `but no ${getVariantLabel('converter', v)} converter exists.`
          );
        }
      });
    });

    return msgs;
  }

  // click handler
  gridEl.addEventListener('click', e => {
    if (inMode !== 'creator') return;
    const cell = e.target.closest('.cell');
    if (!cell || !selectedType) return;
    const r = +cell.dataset.row, c = +cell.dataset.col;

    const existing = layout[r][c];
    const existingPrefix = existing.split('-')[0];
    const isReplacing = existing !== '.' && existingPrefix === selectedType.codePrefix;
    const code = selectedType.codePrefix + (selectedVariant ? '-' + selectedVariant : '');
    const isAdding = existing !== code;

    // PRE-CHECK TOASTS only when truly adding something new (not just swapping variants)
    if (isAdding && !isReplacing) {
      // a) Portal limit
      if (selectedType.key === 'portal' && countCode(code) >= 2) {
        showToast(`Only 2 portals of type ${selectedVariant} allowed.`);
        return;
      }
      // b) Other type limits
      if (selectedType.key !== 'portal' && counts[selectedType.key] >= selectedType.limit) {
        showToast(`Only ${selectedType.limit} ${selectedType.name}(s) allowed.`);
        return;
      }
    }

    // TOGGLE (add / remove / replace)
    layout[r][c] = isAdding ? code : '.';
    updateCounts();
    redraw();

    // RE-COMPUTE persistent warnings
    warningEl.classList.add('hidden');
    warningEl.innerHTML = '';
    const allWarnings = computeWarnings();
    if (allWarnings.length) {
      warningEl.innerHTML = allWarnings.map(w => `<p>${w}</p>`).join('');
      warningEl.classList.remove('hidden');
    }
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

