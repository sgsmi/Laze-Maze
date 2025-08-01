import { getCellDimensions } from './utils.js';

function parseCellCode(code) {
  // e.g. code = 'P-A' or 'F-R' or '#'
  const [prefix, suffix] = code.split('-');
  switch (prefix) {
    case 'T': return { type: 'target' };                // no suffix needed
    case 'P': return { type: 'portal', id: suffix };    // e.g. 'P-A' for portal A, 'P-B' for portal B
    case 'F': return { type: 'filter', color: suffix }; // e.g. 'F-R' for red filter, 'F-G' for green filter
    case 'B': return { type: 'bomb' };                  // no suffix needed
    case '#': return { type: 'wall' };                  // wall cell, no suffix needed
    case 'M':                                           // e.g. 'M-/' for / mirror, 'M-\\ for \ mirror
      if (suffix === '/') 
        return { type: 'mirror-slash' };
      if (suffix === '\\') 
        return { type: 'mirror-backslash' };
      // if no suffix, fall back:
      return { type: 'mirror-slash' };
    case 'S':                                           // e.g. 'S-D' for start down, 'S-L' for start left
      if (suffix) return { type: 'start', direction: suffix };
      // if no suffix, fall back:
      return { type: 'start', direction: 'D' }; // default to down
    default:  return { type: 'empty' };
  }
}

export function createGrid(containerEl, rows, cols, layout) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      const code = layout[r][c];                // e.g. '#', '.', 'T'
      const { type, id, color, direction} = parseCellCode(code);
      cell.dataset.type = type;
      if (id)    cell.dataset.portalId = id;
      if (color) cell.dataset.color = color;
      if (direction) cell.dataset.direction = direction; // e.g. 'M-/' or 'M-\'
      containerEl.append(cell);
      }
    }
    containerEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    containerEl.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;

    const { cellHeight } = getCellDimensions(containerEl, cols, rows);

    Array.from(containerEl.children).forEach(cell => {  cell.style.minHeight = `${cellHeight}px`; });
    
    console.log(`Grid created with ${rows} rows and ${cols} columns.`);
    console.log(`Created ${containerEl.children.length} cells (expected ${rows*cols})`);
}

export function initGrid({container, rows, cols, layout, onClick}) {
  container.innerHTML = '';
  createGrid(container, rows, cols, layout);
  if (onClick) {
    container.onclick = e => {
      const cell = e.target.closest('.cell');
      if (cell) onClick(cell);
    };
  }
}
