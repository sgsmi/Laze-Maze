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

// simple cookie getter/setter
export function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

export function getCookie(name) {
  return document.cookie.split('; ').reduce((r, c) => {
    const [k, v] = c.split('=');
    return k === name ? decodeURIComponent(v) : r;
  }, '');
}

export function loadCustomLevels() {
  try {
    return JSON.parse(localStorage.getItem('customLevels') || '[]');
  } catch {
    return [];
  }
}

export function saveCustomLevels(levels) {
  localStorage.setItem('customLevels', JSON.stringify(levels));
}