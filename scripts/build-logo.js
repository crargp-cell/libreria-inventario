// Uso: node scripts/build-logo.js  -> regenera public/logo.svg (blanco) y public/logo-dark.svg (azul marino)
// Generador del logo "Tu Librería Líder". Todas las letras son formas RELLENAS con la misma geometría
// (altura de mayúscula H, grosor vertical S, grosor horizontal a) y comparten la línea base y=0 de su grupo.
const fs = require('fs');
const path = require('path');
const TAN = Math.tan((12 * Math.PI) / 180); // inclinación cursiva
const f = (n) => +n.toFixed(2);

function makeGlyphs(H, S, a) {
  const Y = (y) => f(y - H); // y medido desde arriba -> línea base en 0
  // polígono con orientación fija (horario) para que las uniones con regla nonzero no se anulen
  const poly = (pts) => {
    let area = 0;
    pts.forEach(([x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; area += x1 * y2 - x2 * y1; });
    const p = area < 0 ? [...pts].reverse() : pts;
    return 'M' + p.map(([x, y]) => `${f(x)} ${Y(y)}`).join('L') + 'Z';
  };

  // "D" y bowls: contorno con curva derecha de radio R y contraforma interior (regla evenodd)
  const dShape = (w, h, y0, R) => {
    const rix = Math.max(R - S, 0.1), riy = Math.max(R - a, 0.1);
    const outer = `M0 ${Y(y0)}H${f(w - R)}A${f(R)} ${f(R)} 0 0 1 ${f(w)} ${Y(y0 + R)}V${Y(y0 + h - R)}A${f(R)} ${f(R)} 0 0 1 ${f(w - R)} ${Y(y0 + h)}H0Z`;
    const inner = `M${f(S)} ${Y(y0 + a)}H${f(w - R)}A${f(rix)} ${f(riy)} 0 0 1 ${f(w - S)} ${Y(y0 + a + riy)}V${Y(y0 + h - a - riy)}A${f(rix)} ${f(riy)} 0 0 1 ${f(w - R)} ${Y(y0 + h - a)}H${f(S)}Z`;
    return outer + inner;
  };

  const g = {};
  g.I = { w: S, d: [poly([[0, 0], [S, 0], [S, H], [0, H]])] };
  g.L = (w) => ({ w, d: [poly([[0, 0], [S, 0], [S, H - a], [w, H - a], [w, H], [0, H]])] });
  g.T = (w) => ({ w, d: [poly([[0, 0], [w, 0], [w, a], [w / 2 + S / 2, a], [w / 2 + S / 2, H], [w / 2 - S / 2, H], [w / 2 - S / 2, a], [0, a]])] });
  g.E = (w) => ({ w, d: [poly([[0, 0], [w, 0], [w, a], [S, a], [S, H / 2 - a / 2], [w * 0.9, H / 2 - a / 2], [w * 0.9, H / 2 + a / 2], [S, H / 2 + a / 2], [S, H - a], [w, H - a], [w, H], [0, H]])] });
  g.U = (w) => {
    const Ro = w / 2, rix = Ro - S, riy = Ro - a;
    return { w, d: [`M0 ${Y(0)}H${f(S)}V${Y(H - a - riy)}A${f(rix)} ${f(riy)} 0 0 0 ${f(S + rix)} ${Y(H - a)}H${f(w - S - rix)}A${f(rix)} ${f(riy)} 0 0 0 ${f(w - S)} ${Y(H - a - riy)}V${Y(0)}H${f(w)}V${Y(H - Ro)}A${f(Ro)} ${f(Ro)} 0 0 1 ${f(w - Ro)} ${Y(H)}H${f(Ro)}A${f(Ro)} ${f(Ro)} 0 0 1 0 ${Y(H - Ro)}Z`], rule: 'nonzero' };
  };
  g.D = (w) => ({ w, d: [dShape(w, H, 0, Math.min(0.44 * H, w / 2))], rule: 'evenodd' });
  // B: un solo contorno con "cintura" entre las dos panzas (la de arriba un poco más angosta) y dos contraformas
  g.B = (w) => {
    const wt = w * 0.94, m = 0.5 * H;
    const Rt = 0.28 * H, Rw = 0.08 * H, Rb = 0.3 * H, ri = 0.12 * H;
    const outer = `M0 ${Y(0)}H${f(wt - Rt)}A${f(Rt)} ${f(Rt)} 0 0 1 ${f(wt)} ${Y(Rt)}V${Y(m - Rw)}A${f(Rw)} ${f(Rw)} 0 0 1 ${f(wt - Rw)} ${Y(m)}H${f(w - Rw)}A${f(Rw)} ${f(Rw)} 0 0 1 ${f(w)} ${Y(m + Rw)}V${Y(H - Rb)}A${f(Rb)} ${f(Rb)} 0 0 1 ${f(w - Rb)} ${Y(H)}H0Z`;
    const bowl = (xr, ya, yb) => `M${f(S)} ${Y(ya)}H${f(xr - ri)}A${f(ri)} ${f(ri)} 0 0 1 ${f(xr)} ${Y(ya + ri)}V${Y(yb - ri)}A${f(ri)} ${f(ri)} 0 0 1 ${f(xr - ri)} ${Y(yb)}H${f(S)}Z`;
    return { w, d: [outer + bowl(wt - S, a, m - a / 2) + bowl(w - S, m + a / 2, H - a)], rule: 'evenodd' };
  };
  g.R = (w) => {
    const bh = 0.58 * H, Rb = bh / 2;
    const lx2 = w * 0.5 + S * 0.8, lx1 = lx2 - S * 1.0, lw = S * 1.15;
    const outer = `M0 ${Y(0)}H${f(w - Rb)}A${f(Rb)} ${f(Rb)} 0 0 1 ${f(w)} ${Y(Rb)}V${Y(bh - Rb)}A${f(Rb)} ${f(Rb)} 0 0 1 ${f(w - Rb)} ${Y(bh)}H${f(lx2)}L${f(w)} ${Y(H)}H${f(w - lw)}L${f(lx1)} ${Y(bh)}H${f(S)}V${Y(H)}H0Z`;
    const rix = Rb - S, riy = Rb - a;
    const inner = `M${f(S)} ${Y(a)}H${f(w - Rb)}A${f(rix)} ${f(riy)} 0 0 1 ${f(w - S)} ${Y(Rb)}V${Y(bh - Rb)}A${f(rix)} ${f(riy)} 0 0 1 ${f(w - Rb)} ${Y(bh - a)}H${f(S)}Z`;
    return { w, d: [outer + inner], rule: 'evenodd' };
  };
  g.A = (w) => {
    const ta = S * 0.95, legW = S * 1.05;
    const lo = (y) => (w / 2 - ta / 2) * (1 - y / H), li = (y) => w / 2 + (legW - w / 2) * (y / H);
    const yb = 0.6 * H;
    const left = poly([[w / 2 - ta / 2, 0], [w / 2, 0], [legW, H], [0, H]]);
    const right = poly([[w / 2, 0], [w / 2 + ta / 2, 0], [w, H], [w - legW, H]]);
    const x1 = (lo(yb) + li(yb)) / 2, x2 = w - x1;
    const bar = poly([[x1, yb], [x2, yb], [x2, yb + a], [x1, yb + a]]);
    return { w, d: [left + right + bar], rule: 'nonzero' };
  };
  return { g, Y, poly };
}

// Compone una palabra: devuelve {paths, width} con cada glifo ya trasladado en x
function word(chars, gl, gap, space) {
  let x = 0; const out = [];
  for (const c of chars) {
    if (c === ' ') { x += space; continue; }
    const gd = typeof gl[c.glyph] === 'function' ? gl[c.glyph](c.w) : gl[c.glyph];
    out.push(`<path transform="translate(${f(x)} 0)" fill-rule="${gd.rule || 'nonzero'}" d="${gd.d.join('')}"/>`);
    x += gd.w + gap;
    c._end = x;
  }
  return { svg: out.join(''), width: x - gap };
}

function build(fill) {
  const Hb = 70, Sb = 0.27 * Hb, ab = 0.2 * Hb;
  const big = makeGlyphs(Hb, Sb, ab);
  const bigChars = [
    { glyph: 'L', w: 0.64 * Hb }, { glyph: 'I' }, { glyph: 'D', w: 0.8 * Hb }, { glyph: 'E', w: 0.6 * Hb }, { glyph: 'R', w: 0.76 * Hb },
  ];
  const gapB = 0.09 * Hb;
  const bw = word(bigChars, big.g, gapB, 0);

  const Hs = 18, Ss = 0.205 * Hs, as = 0.15 * Hs;
  const sm = makeGlyphs(Hs, Ss, as);
  const sp = [
    { glyph: 'T', w: 0.7 * Hs }, { glyph: 'U', w: 0.7 * Hs }, ' ',
    { glyph: 'L', w: 0.6 * Hs }, { glyph: 'I' }, { glyph: 'B', w: 0.72 * Hs }, { glyph: 'R', w: 0.72 * Hs },
    { glyph: 'E', w: 0.62 * Hs }, { glyph: 'R', w: 0.72 * Hs }, { glyph: 'I' }, { glyph: 'A', w: 0.82 * Hs },
  ].map((c) => (c === ' ' ? ' ' : c));
  const gapS = 0.17 * Hs;
  // acento agudo sobre la Í pequeña: se calcula la posición de esa I
  let xs = 0, accentX = 0, idx = 0;
  for (const c of sp) {
    if (c === ' ') { xs += 0.55 * Hs; continue; }
    const gd = typeof sm.g[c.glyph] === 'function' ? sm.g[c.glyph](c.w) : sm.g[c.glyph];
    idx++;
    if (idx === 9) accentX = xs; // novena letra = la segunda I (Í)
    xs += gd.w + gapS;
  }
  const sw = word(sp, sm.g, gapS, 0.55 * Hs);
  return { big, bw, sm, sw, accentX, Hb, Hs, Ss, bigChars, gapB };
}

function svgFor(fill) {
  const { bw, sw, accentX, Hb, Hs, Ss } = build(fill);
  const baseB = 6, Yb = 108, Yt = Yb - Hb;
  const topRightBig = baseB + bw.width + TAN * Hb;
  const smallBaseX = topRightBig - (sw.width + TAN * Hs);
  const Ys = Yt - 11;
  // posición de la I grande para ubicar el triángulo verde (lado izquierdo de la I, arriba)
  const bigIx = baseB + (0.64 * Hb + 0.09 * Hb) + TAN * Hb;
  const A = [bigIx - 11, Yt - 3], B = [bigIx + 27, Yt - 26], C = [bigIx - 11, Yt - 19];
  const accent = `M${f(accentX + Ss * 0.1)} ${f(-Hs - 2.4)}L${f(accentX + Ss * 0.1 + 4)} ${f(-Hs - 6.8)}H${f(accentX + Ss * 0.1 + 7.4)}L${f(accentX + Ss * 0.1 + 3.4)} ${f(-Hs - 2.4)}Z`;
  const W = Math.ceil(topRightBig + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 116" role="img" aria-label="Tu Librería Líder">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1E9E45"/><stop offset="1" stop-color="#3FD068"/></linearGradient></defs>
  <g transform="translate(${baseB} ${Yb}) skewX(-12)" fill="${fill}">${bw.svg}</g>
  <path d="M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}L${f(C[0])} ${f(C[1])}Z" fill="url(#g)"/>
  <g transform="translate(${f(smallBaseX)} ${Ys}) skewX(-12)" fill="${fill}">${sw.svg}<path d="${accent}"/></g>
</svg>
`;
}

fs.writeFileSync(path.join(__dirname, '..', 'public', 'logo.svg'), svgFor('#FFFFFF'));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'logo-dark.svg'), svgFor('#0B1B4D'));
console.log('logos generados');
