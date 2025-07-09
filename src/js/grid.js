import { levels } from './levels.js';
import { getCellDimensions } from './utils.js';


function parseCellCode(code) {
  // e.g. code = 'P-A' or 'F-R' or '#'
  if (code === '#') return { type: 'wall' };
  const [prefix, suffix] = code.split('-');
  switch (prefix) {
    case 'T': return { type: 'target' };
    case 'P': return { type: 'portal', id: suffix };
    case 'F': return { type: 'filter', color: suffix };
    case 'B': return { type: 'bomb' };  // no suffix needed
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
        const { type, id, color } = parseCellCode(code);
        cell.dataset.type = type;
        if (id)    cell.dataset.portalId = id;
        if (color) cell.dataset.color = color;
        containerEl.append(cell);
        if (r === 0 && c === 5) {
        console.log('Cell[0,5] code =', code, 'dataset →', cell.dataset);
}

        }
    }
    containerEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    containerEl.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;

    const { cellHeight } = getCellDimensions(containerEl, cols, rows);
    containerEl.style.rowGap = '1px';  // keep your gap if desired
    Array.from(containerEl.children).forEach(cell => {
    cell.style.minHeight = `${cellHeight}px`;
    });
    
    console.log(`Grid created with ${rows} rows and ${cols} columns.`);
    console.log(`Created ${containerEl.children.length} cells (expected ${rows*cols})`);

}