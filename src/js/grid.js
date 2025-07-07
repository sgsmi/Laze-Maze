export function createGrid(containerEl, rows, cols) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        containerEl.append(cell);
        }
    }
    containerEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    containerEl.style.gridTemplateRows    = `repeat(${rows}, 1fr)`;
    console.log(`Grid created with ${rows} rows and ${cols} columns.`);
}
