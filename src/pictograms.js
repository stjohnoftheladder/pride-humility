// Small hand-drawn silhouettes shared by the satchel and the city map.
// Paths use a 24 × 24 grid; no fonts, downloads or image decoding are needed.
const SHAPES = {
  bread: [['M3 15C3 7 21 5 21 14V18H3Z', '#bb8247'], ['M8 10L6 13M13 9L11 12M18 10L16 13']],
  gold: [['M4 14H15V20H4ZM7 9H18V15H7ZM10 4H21V10H10Z', '#c9a227'], ['M11 7H17M8 12H14M5 17H11']],
  shoes: [['M4 4H10V13L14 16V20H3V14H4ZM14 5H20V13L22 16V19H17', '#967149'], ['M5 8H9M15 9H19']],
  swiftShoes: [['M3 6H9V14L13 17V21H2V15H3ZM13 8H19V14L22 17V20H16', '#967149'], ['M12 3H21L17 7H21L17 11']],
  basket: [['M3 12H21L18 21H6Z', '#967149'], ['M6 12C6 2 18 2 18 12M8 15L9 19M12 15V19M16 15L15 19']],
  parcelBread: [['M4 12V9C4 3 20 3 20 9V12', '#bb8247'], ['M3 12H21L18 21H6Z', '#967149'], ['M8 7L7 10M13 6L12 9M8 16H16']],
  parcelCups: [['M3 9H21V21H3Z', '#967149'], ['M7 11H14V16H7ZM14 12H17V15H14M3 18H21M6 9V5H10V9M14 9V4H18V9']],
  fruit: [['M4 10C4 4 11 4 12 8C16 3 22 7 20 13L17 20H7Z', '#b65b43'], ['M12 8V3L17 2M7 12L9 16M16 11L15 15']],
  silk: [['M4 5Q9 2 12 5T21 5V20Q16 17 12 20T4 20Z', '#855f7b'], ['M8 6V17M16 8V18']],
  pots: [['M8 3H16V7L20 12V19Q12 23 4 19V12L8 7Z', '#b86e43'], ['M8 7H16M7 15H17']],
  olives: [['M6 21L17 3'], ['M11 12C2 12 3 4 10 7ZM13 9C19 2 24 8 16 13ZM9 16C1 16 3 22 8 20Z', '#859461']],
  wreaths: [['M9 21C0 16 2 6 8 3M15 21C24 16 22 6 16 3'], ['M5 14L2 12M6 8L3 6M19 14L22 12M18 8L21 6M9 21L12 18L15 21']],
  perfume: [['M9 2H15V6H9ZM7 9H17L20 20H4Z', '#859aa0'], ['M10 6V9M14 6V9M8 15H16']],
  ink: [['M4 13H13V21H4Z', '#60718a'], ['M8 13V10H11M13 15L21 3L18 2L10 14M3 21H15']],
  grain: [['M12 22V3M12 9L7 5M12 13L6 9M12 17L6 13M12 9L17 5M12 13L18 9M12 17L18 13']],
  iron: [['M5 8H19L22 17H2Z', '#89929a'], ['M5 8L8 14H18L19 8M8 14L7 17']],
  water: [['M12 2C10 7 4 11 4 16A8 7 0 0 0 20 16C20 11 14 7 12 2Z', '#6894a3'], ['M8 15Q7 18 11 19']],
  fish: [['M3 12Q10 2 17 9L22 5V19L17 15Q10 22 3 12Z', '#799b9b'], ['M8 10V11M16 10V14']],
  lanterns: [['M6 7H18L20 20H4Z', '#a78343'], ['M8 7V4H16V7M8 10L16 18M16 10L8 18M3 21H21']],
  glass: [['M6 3H18L16 14H8ZM12 14V21M7 21H17', '#6b9797'], ['M8 7H16']],
  rope: [['M8 3C18 0 23 11 15 14C8 17 3 11 6 7C9 3 16 5 16 9C16 15 7 15 5 19L8 22M16 14L20 21']],
  soup: [['M3 12H21C20 23 4 23 3 12Z', '#b78352'], ['M7 9C3 5 10 6 7 2M13 9C9 5 16 6 13 2M19 9C15 5 22 6 19 2M2 12H22']],
  herbs: [['M12 22V6'], ['M12 12C1 12 2 3 10 7ZM12 17C22 17 23 7 14 11ZM12 7C8 1 16 0 16 4Z', '#859461']],
  pigments: [['M3 12H10V21H3ZM14 12H21V21H14Z', '#ac704b'], ['M4 8L8 3L11 8ZM14 7L18 2L21 7Z', '#7d839e'], ['M5 16H8M16 16H19']],
  books: [['M2 4L12 7L22 4V20L12 23L2 20Z', '#866747'], ['M12 7V23M5 9L9 10M15 10L19 9M5 13L9 14M15 14L19 13']],
  work: [['M3 8H21V21H3Z', '#967149'], ['M8 8V4H16V8M3 13H21M10 12H14V15H10']],
  church: [['M3 12H21V22H3ZM5 12A7 7 0 0 1 19 12', '#b39357'], ['M12 1V6M9 3H15M10 22V16H14V22M6 15V18M18 15V18']],
  aqueduct: [['M2 5H22V21H19V13A3 3 0 0 0 13 13V21H11V13A3 3 0 0 0 5 13V21H2Z', '#b39357'], ['M2 8H22']],
  arena: [['M8 3H16A5 5 0 0 1 21 8V16A5 5 0 0 1 16 21H8A5 5 0 0 1 3 16V8A5 5 0 0 1 8 3Z'], ['M9 7H15A2 2 0 0 1 17 9V15A2 2 0 0 1 15 17H9A2 2 0 0 1 7 15V9A2 2 0 0 1 9 7ZM12 9V15']],
  ship: [['M2 15H22L18 20H6ZM12 3V14M10 4L4 13H10ZM14 5L20 13H14Z', '#b39357'], ['M2 23Q5 20 8 23Q11 20 14 23Q17 20 22 23']],
  column: [['M9 7H15V20H9ZM6 3H18V7H6ZM5 20H19V23H5', '#b39357']],
  gate: [['M3 3H21V22H16V12A4 4 0 0 0 8 12V22H3Z', '#b39357'], ['M3 7H21']],
  mosaic: [['M12 2L22 12L12 22L2 12ZM12 7L17 12L12 17L7 12ZM2 12H7M17 12H22M12 2V7M12 17V22']],
  ladder: [['M6 23V2M18 23V2M6 5H18M6 10H18M6 15H18M6 20H18']],
  person: [['M8 5A4 4 0 1 0 16 5A4 4 0 1 0 8 5ZM5 22V17A7 7 0 0 1 19 17V22Z', '#b39357']],
  heart: [['M12 21L3 12C-1 4 8 0 12 7C16 0 25 4 21 12Z', '#b65b43']],
  flag: [['M5 23V2L20 4L17 10L5 9']],
  eye: [['M1 12Q12 0 23 12Q12 24 1 12ZM8 12A4 4 0 1 0 16 12A4 4 0 1 0 8 12']],
};
const ALIASES = { provision: 'bread', 'parcel:bread': 'parcelBread', 'parcel:cups': 'parcelCups', 'parcel:fruit': 'fruit', monastery: 'church', basilica: 'church', hippodrome: 'arena', forum: 'column', court: 'mosaic', mosaicCourt: 'mosaic', tetrapylon: 'gate', peristyle: 'water', cistern: 'water' };
const shapes = kind => SHAPES[ALIASES[kind] || kind] || SHAPES.basket;

export function pictogram(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('pictogram');
  for (const [d, fill] of shapes(kind)) {
    const path = document.createElementNS(ns, 'path');
    for (const [key, value] of Object.entries({ d, fill: fill || 'none', stroke: '#f3d276', 'stroke-width': '1.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })) path.setAttribute(key, value);
    svg.appendChild(path);
  }
  return svg;
}

/** The same simple head and tunic used by the street's instanced citizens. */
export function citizenPortrait(tunic, skin) {
  const svg = pictogram('person');
  svg.classList.add('citizen-portrait');
  svg.replaceChildren();
  for (const [d, fill] of [['M4 24V18Q4 12 12 12Q20 12 20 18V24Z', tunic], ['M8 7A4 4 0 1 0 16 7A4 4 0 1 0 8 7Z', skin], ['M9 15L12 19L15 15', 'none']]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [key, value] of Object.entries({ d, fill, stroke: '#f3d276', 'stroke-width': '.65', 'stroke-linejoin': 'round' })) path.setAttribute(key, value);
    svg.appendChild(path);
  }
  return svg;
}

// Map icons are deliberately monochrome and painted only with the static plan.
const canvasPaths = new Map();
export function drawPictogram(ctx, kind, x, y, size = 16) {
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = '#f3d276'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const [d, fill] of shapes(kind)) {
    if (!canvasPaths.has(d)) canvasPaths.set(d, new Path2D(d));
    const path = canvasPaths.get(d);
    if (fill) { ctx.fillStyle = '#78623b'; ctx.fill(path); }
    ctx.stroke(path);
  }
  ctx.restore();
}
