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
