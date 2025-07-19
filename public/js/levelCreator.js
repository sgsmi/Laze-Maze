import { createGrid } from './grid.js';
import { inMode,
         modeToggle } from './index.js'

const CELL_TYPES = [
  { key: 'start',  name: 'Start',        multiple: false,  codePrefix: 'S', iconType: 'start',        variants: ['U','R','D','L'], limit: 1 },
  { key: 'wall',   name: 'Wall',         multiple: true,   codePrefix: '#', iconType: 'wall',         variants: [],         limit: Infinity },
  { key: 'portal', name: 'Portal',       multiple: true,   codePrefix: 'P', iconType: 'portal',       variants: ['A','B','C'], limit: 3 },
  { key: 'filter', name: 'Filter',       multiple: true,   codePrefix: 'F', iconType: 'filter',       variants: ['R','G','B'], limit: 3 },
  { key: 'bomb',   name: 'Bomb',         multiple: true,   codePrefix: 'B', iconType: 'bomb',         variants: [],         limit: 5 },
  { key: 'target', name: 'Target',       multiple: false,  codePrefix: 'T', iconType: 'target',       variants: [],         limit: 1 },
];

export function initLevelCreator({
  aside, createContainer, maxRows = 10, maxCols = 10,
  saveLevel, loadLevel
}) {
  
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
  controls.innerHTML = `
    Rows: <button id="row-minus">–</button>
           <span id="row-count">${rows}</span>
           <button id="row-plus">+</button>
    Cols: <button id="col-minus">–</button>
           <span id="col-count">${cols}</span>
           <button id="col-plus">+</button>
    <button id="save-level">Save</button>
  `;
  aside.append(controls);

  controls.querySelector('#row-plus').onclick = () => resize(rows+1, cols);
  controls.querySelector('#row-minus').onclick = () => resize(rows-1, cols);
  controls.querySelector('#col-plus').onclick = () => resize(rows, cols+1);
  controls.querySelector('#col-minus').onclick = () => resize(rows, cols-1);
  controls.querySelector('#save-level').onclick = () => saveLevel({ rows, cols, layout });

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

    if (isAdding && counts[selectedType.key] >= selectedType.limit) {
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

