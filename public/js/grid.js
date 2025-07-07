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
  console.log(`Grid created with ${rows} rows and ${cols} columns.`);
}
