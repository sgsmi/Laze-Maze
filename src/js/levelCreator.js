import { createGrid } from './grid.js';
import { inMode,
         modeToggle } from './index.js'

const CELL_TYPES = [
  { key: 'start',  name: 'Start',        multiple: false,  iconType: 'start',        variants: ['U','R','D','L'], limit: 1 },
  { key: 'wall',   name: 'Wall',         multiple: true,   iconType: 'wall',         variants: [],         limit: Infinity },
  { key: 'mirror', name: 'Mirror',       multiple: true,   iconType: 'mirror-slash', variants: ['/','\\'], limit: 5 },
  { key: 'portal', name: 'Portal',       multiple: true,   iconType: 'portal',       variants: ['A','B','C'], limit: 3 },
  { key: 'filter', name: 'Filter',       multiple: true,   iconType: 'filter',       variants: ['R','G','B'], limit: 3 },
  { key: 'bomb',   name: 'Bomb',         multiple: true,   iconType: 'bomb',         variants: [],         limit: 5 },
  { key: 'target', name: 'Target',       multiple: false,  iconType: 'target',       variants: [],         limit: 1 },
];

export function initLevelCreator({
  aside, createContainer, maxRows = 10, maxCols = 10,
  saveLevel, loadLevel
}) {
  
  let rows = 10, cols = 10;
  let layout = createEmptyLayout(rows, cols);
  let selectedType = 'wall';
  let selectedVariant = null;
  

  // 1) Build the aside palette
  const palette = document.createElement('ul');
  palette.className = 'creator-palette';
  
  CELL_TYPES.forEach(type => {
    const li = document.createElement('li');
    li.className = 'creator-item';
    li.innerHTML = `
      <div class="icon cell" data-type="${type.iconType}"></div>
      <span class="label">${type.name}</span>
      <span class="count">0 / ${type.limit}</span>
    `;
    li.onclick = () => selectType(type.key);
    palette.append(li);
  });
  aside.append(palette);


  // Exit button
  const exitBtn = document.getElementById('exitCreator');
  exitBtn.onclick = () => {
    modeToggle('main');
  };


  // 2) Variant-picker popup
  const variantBar = document.createElement('div');
  variantBar.className = 'variant-bar hidden';
  aside.append(variantBar);

  function selectType(key) {
    // highlight
    aside.querySelectorAll('.creator-item').forEach(li => {
      li.classList.toggle('active', li.querySelector('.icon').dataset.type === key);
    });
    selectedType = CELL_TYPES.find(t=>t.key===key);
    selectedVariant = null;

    // if this type has variants, show below
    if (selectedType.variants.length) {
      variantBar.innerHTML = '';
      selectedType.variants.forEach(v => {
        const btn = document.createElement('button');
        btn.textContent = v;
        btn.onclick = () => {
          selectedVariant = v;
          variantBar.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
        };
        variantBar.append(btn);
      });
      variantBar.classList.remove('hidden');
    } else {
      variantBar.classList.add('hidden');
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

    // compute the canonical code for this type+variant
    const code = selectedType.codePrefix
              + (selectedVariant ? '-' + selectedVariant : '');

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
      const count = layout.flat().filter(cell => cell.startsWith(type.iconType)).length;
      aside.querySelectorAll('.creator-item').forEach(li => {
        if (li.querySelector('.icon').dataset.type === type.key) {
          li.querySelector('.count').textContent = `${count}/${type.limit}`;
        }
      });
    });
  }

  function createEmptyLayout(r,c) {
    return Array.from({length:r},()=>Array.from({length:c},()=>'.'));
  }
}

