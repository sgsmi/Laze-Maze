export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getCellDimensions(el, cols, rows) {
  const width  = el.clientWidth  / cols;
  const height = el.clientHeight / rows;
  return { cellWidth: width, cellHeight: height };
}

export function animateKeyCells() {
  // Start‐cell rotation every 1s through D→R→U→L
  const startCell = document.querySelector('#innerBody .key-item[data-type="start"] .cell');
  const dirs      = ['D','R','U','L'];
  let di = 0;
  setInterval(() => {
    di = (di + 1) % dirs.length;
    startCell.dataset.direction = dirs[di];
  }, 1500);

  // Mirror toggle between slash/backslash every 2s
  const mirrorCell = document.querySelector('#innerBody .key-item[data-type="mirror-slash"] .cell');
  let isSlash = true;
  setInterval(() => {
    isSlash = !isSlash;
    mirrorCell.dataset.type = isSlash ? 'mirror-slash' : 'mirror-backslash';
  }, 1500);

  // Filter cycles R→G→B every 1s
  const filterCell = document.querySelector('#innerBody .key-item[data-type="filter"] .cell');
  const colors     = ['R','G','B'];
  let ci = 0;
  setInterval(() => {
    ci = (ci + 1) % colors.length;
    filterCell.dataset.color = colors[ci];
  }, 1500);

  const portalCell = document.querySelector('#innerBody .key-item[data-type="portal"] .cell');
  const portalIds = ['A','B'];
  let portalIndex = 0;
  setInterval(() => {
    portalIndex = (portalIndex + 1) % portalIds.length;
    portalCell.dataset.portalId = portalIds[portalIndex];
  }, 1500);
}