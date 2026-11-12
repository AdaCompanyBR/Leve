// Ilustrações da aba Líquidos: uma pessoa de corpo inteiro, de frente, de camiseta, shorts e tênis.
// Desenho próprio em vetor, na linguagem de uma ilustração editorial: contorno azul-acinzentado
// fino, roupas brancas, cabelo grafite, sombras leves. Feminina e masculina têm corpo, roupa e
// cabelo próprios, com a mesma espessura de linha e o mesmo acabamento.
//
// Coordenadas num quadro de 240 × 600. Cada parte é { d, kind, fill? }:
//   kind: skin | cloth | shoe | hair | line (traço de detalhe) | shade (sombra)
//   fill: true quando a parte entra na área que o líquido preenche.

export const W = 240, H = 600, TOP = 12, BOTTOM = 590;
const C = W / 2;
const r = n => +n.toFixed(1);
const mx = x => r(W - x);

/** Espelha um caminho desenhado do lado esquerdo para o direito. */
export const mirror = d => d.replace(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${mx(parseFloat(x))} ${y}`);

/**
 * Caminho simétrico: começa na linha do centro, desce pelo lado esquerdo (segmentos [x,y] ou
 * curvas [c1x,c1y,c2x,c2y,x,y]) até voltar ao centro, e o lado direito é o espelho.
 */
function sym(start, segs) {
  let d = `M${start[0]} ${start[1]}`;
  const pts = [start];
  for (const s of segs) { d += s.length === 2 ? ` L${s[0]} ${s[1]}` : ` C${s.join(' ')}`; pts.push(s.slice(-2)); }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i], from = pts[i];
    d += s.length === 2 ? ` L${mx(from[0])} ${from[1]}` : ` C${mx(s[2])} ${s[3]} ${mx(s[0])} ${s[1]} ${mx(from[0])} ${from[1]}`;
  }
  return d + ' Z';
}
const pair = (d, kind, fill = true) => [{ d, kind, fill }, { d: mirror(d), kind, fill }];
const line = (...ds) => ds.map(d => ({ d, kind: 'line' }));
const both = (...ds) => ds.flatMap(d => [d, mirror(d)]);

// ---------------------------------------------------------------------------
// Feminina: cabelo na altura dos ombros com risca de lado, camiseta solta por dentro
// de um shorts de cintura alta com barra dobrada, tênis baixos.

const F = {};
F.hairBack = sym([C, 11], [[98, 11, 87, 27, 86, 49], [85, 68, 85, 86, 83, 102], [82, 110, 86, 116, 94, 116], [100, 116, 104, 112, 106, 104], [107, 96, 108, 90, 109, 86], [C, 86]]);
F.head = sym([C, 18], [[104, 18, 95, 31, 95, 49], [95, 65, 99, 77, 106, 85], [110, 89, 115, 91, C, 91]]);
F.neck = sym([C, 80], [[111, 80], [111, 90, 111, 98, 110, 103], [108, 108, 104, 111, 99, 114], [C, 114]]);
F.torso = sym([C, 116], [[113, 116, 108.5, 112, 107.5, 105], [97, 108, 83, 112, 73, 117], [70, 130, 74, 142, 79, 152], [82, 180, 86, 206, 87.5, 234], [88, 252], [C, 252]]);
F.sleeve = 'M75 115 C64 119 58 129 56.5 143 C55.5 153 55.5 163 56 171 C64 175 74 177 84.5 176 C83.5 166 82 156 80 146 C78 132 77 122 75 115 Z';
F.arm = 'M60 152 C57.5 176 56 198 56.5 222 C57 232 57.5 238 58.5 245 C59 266 60.5 290 63 314 C61 326 59.5 338 60.5 350 C61.5 361 64.5 369 69.5 370 C74.5 371 77.5 366 77 357 C76.5 346 76 336 75.5 326 C75 321 74.5 317 74 313 C73.5 292 73 266 73.5 246 C73.5 222 75 196 78 160 Z';
F.shorts = sym([C, 240], [[87.5, 240], [83, 258, 78.5, 273, 76.5, 290], [75.5, 303, 75, 313, 75, 324], [86, 328, 104, 327, 117, 321], [118, 312, 119, 306, C, 300]]);
F.leg = 'M78 302 C77.5 338 80.5 377 86.5 408 C85.5 424 82.5 440 83.5 457 C84.5 481 90 507 94 530 L109.5 530 C110.5 507 112.5 483 113.5 459 C114.5 441 112.5 425 112.5 411 C114.5 381 117 343 119 306 Z';
F.shoe = 'M93.5 524 C90 540 86 555 86 569 C86 580 92 586 101 586 C110 586 116.5 581 116.5 571 C116.5 556 112.5 540 110 524 Z';
F.hairFront = 'M110 14 C97 15 89 26 88.5 43 C88 62 90 80 93 96 C95.5 86 97 72 99 60 C100 50 103 44 109 42 C119 39 131 40 140 47 C143 52 145 66 146 80 C146.5 86 147 92 147.5 96 C150 90 152 80 152.5 66 C153 46 149 31 141 23 C133 15 122 13 110 14 Z';

const female = [
  { d: 'M70 588 C70 581 170 581 170 588 C170 595 70 595 70 588 Z', kind: 'ground' },
  { d: F.hairBack, kind: 'hair' },
  ...pair(F.arm, 'skin'),
  ...pair(F.leg, 'skin'),
  ...pair(F.shoe, 'shoe'),
  { d: F.neck, kind: 'skin', fill: true },
  { d: F.torso, kind: 'cloth', fill: true },
  ...pair(F.sleeve, 'cloth'),
  { d: F.shorts, kind: 'cloth', fill: true },
  { d: F.head, kind: 'skin', fill: true },
  // Sombras: sob a manga, nas laterais da camiseta, sob o shorts e no pescoço.
  ...both('M56 171 C64 175 74 177 84.5 176 C83 184 74 186 59 183 Z', 'M79 152 C82 180 86 206 87.5 234 L94 234 C92 206 89 178 85 154 Z', 'M75 324 C86 328 104 327 117 321 C117 327 104 333 77 331 Z').map(d => ({ d, kind: 'shade' })),
  ...line(
    'M107.5 105 C111 116 129 116 132.5 105', 'M104.5 107 C109 121 131 121 135.5 107', // gola
    ...both('M56 164 C64 168 74 170 83.5 169'), // barra da manga
    'M96 182 C101 198 105 216 103 234', 'M144 188 C139 204 137 220 139 236', 'M106 226 C108 233 110 238 113 242', 'M134 226 C132 233 130 238 127 242', // dobras
    'M87 252.5 C100 254.5 140 254.5 153 252.5', // cós
    ...both('M93 240 L93 253', 'M88 257 C94.5 259 99 264 100.5 272', 'M75.3 315 C87 319 104 318 117.5 312'), // passantes, bolsos, barra dobrada
    'M124 253 C124.5 270 124 283 120 293', // braguilha
    ...both('M93 402 C97 406 102 406.5 106 403.5', 'M75.5 330 C72 335 71 342 72.5 348 C73.5 351 75.5 352 76.8 351', 'M64.5 355 C65 360 66 364 67.5 367.5', 'M69.5 357 C70 362 71 365.5 72 368.5', 'M96.5 541 L107 541', 'M95.5 547 L108 547', 'M88.5 560 C95 556.5 108 556.5 114.5 560', 'M86.5 573 C92 579 110 579 116 573', 'M94 533 C99 536.5 105.5 536.5 109.5 533'), // joelho, polegar, dedo, sola, gola do tênis
  ),
];
const femaleTop = [
  { d: F.hairFront, kind: 'hair' },
  ...line('M110 14 C106 22 102 31 100 42', 'M116 15 C126 21 134 30 139 42', 'M92 52 C91.5 64 92 76 93.5 88', 'M149 52 C149.5 64 149 76 148 88').map(p => ({ ...p, kind: 'strand' })),
];

// ---------------------------------------------------------------------------
// Masculina: cabelo curto com risca, orelhas, ombros largos, camiseta por fora de um shorts
// mais comprido, pernas e tênis mais largos.

const M = {};
M.head = sym([C, 19], [[103, 19, 93.5, 31, 93.5, 49], [93.5, 63, 95.5, 75, 100.5, 83], [105, 90, 112, 94, C, 94]]);
M.ear = 'M95 50 C89.5 48.5 88 56 90 62.5 C91.5 67 94 68 96 66 Z';
M.neck = sym([C, 82], [[108.5, 82], [108.5, 92, 108, 100, 107, 105], [104, 111, 99, 115, 94, 117], [C, 117]]);
M.torso = sym([C, 117], [[113, 117, 108, 113, 107, 107], [96, 109, 80, 113, 66, 119], [63.5, 131, 66, 145, 70, 157], [71, 191, 72, 231, 72, 264], [90, 268, 108, 268.5, C, 268.5]]);
M.sleeve = 'M68 117 C58 121 52 133 50.5 149 C49.5 161 49.5 171 50 181 C58 185 68 187 78.5 185 C77.5 175 75 165 72.5 153 C71 137 70 127 68 117 Z';
M.arm = 'M54 162 C51 188 49.5 212 49.5 236 C49.5 244 50 250 51 256 C52.5 278 54 302 56.5 324 C54 336 52.5 350 53.5 362 C54.5 372 58 380 63.5 381 C69 382 72 376 71.5 367 C71 356 70.5 344 70 332 C69.5 326 69 321 68.5 317 C67.5 294 66.5 270 66.5 250 C66.5 226 68 202 70.5 178 Z';
M.shorts = sym([C, 254], [[74, 254], [73.5, 280, 74, 302, 75, 322], [75.5, 334, 76, 344, 77, 354], [90, 357, 106, 357, 117.5, 352], [118.5, 332, 119.5, 318, C, 309]]);
M.leg = 'M78.5 332 C78.5 367 82 399 87.5 425 C86.5 441 83.5 456 84.5 471 C85.5 494 90 514 94 532 L110.5 532 C111.5 510 114.5 488 115.5 467 C116.5 447 114.5 433 113.5 425 C115.5 393 117.5 361 119 334 Z';
M.shoe = 'M93 526 C89 542 84 557 84 571 C84 582 91 588 101 588 C111 588 118 582 118 572 C118 558 114 542 111.5 526 Z';
M.hair = 'M92.5 52 C89.5 31 100 13 121 13 C141 13 151.5 28 148 52 C146.5 44 145 38 141 34 C134 30.5 124 31.5 115 29.5 C106 28.5 99.5 33 96.5 40 C94.5 44 93.5 48 92.5 52 Z';

const male = [
  { d: 'M68 590 C68 583 172 583 172 590 C172 597 68 597 68 590 Z', kind: 'ground' },
  ...pair(M.arm, 'skin'),
  ...pair(M.leg, 'skin'),
  ...pair(M.shoe, 'shoe'),
  { d: M.neck, kind: 'skin', fill: true },
  { d: M.shorts, kind: 'cloth', fill: true },
  { d: M.torso, kind: 'cloth', fill: true },
  ...pair(M.sleeve, 'cloth'),
  ...pair(M.ear, 'skin'),
  { d: M.head, kind: 'skin', fill: true },
  ...both('M50 181 C58 185 68 187 78.5 185 C77 193 68 195 53 192 Z', 'M70 157 C71 191 72 231 72 264 L80 265 C79 230 77.5 190 75.5 158 Z', 'M77 354 C90 357 106 357 117.5 352 C117 358 104 363 79 361 Z', 'M72 264 C90 268 108 268.5 120 268.5 L120 274 C104 274 88 273 74 270 Z').map(d => ({ d, kind: 'shade' })),
  ...line(
    'M107 107 C111 118.5 129 118.5 133 107', 'M104 109 C109 123 131 123 136 109', // gola
    ...both('M50 173 C58 177 68 179 77.5 178'), // barra da manga
    'M98 190 C102 210 104 232 102 258', 'M143 196 C139 216 137 238 139 260', 'M72.5 256 C90 260 150 260 167.5 256', // dobras e barra da camiseta
    ...both('M76.2 343 C90 347 106 346.5 117.7 341.5', 'M77 276 C82 284 86 292 88 302', 'M92.5 413 C96.5 417 102 417.5 107 414.5', 'M69.5 338 C65.5 344 64.5 352 66 358 C67 361 69 362 70.5 361', 'M57.5 368 C58 373 59 377 60.5 380', 'M63 370 C63.5 375 64.5 378 65.5 380.5', 'M96 543 L108.5 543', 'M95 549 L109.5 549', 'M86.5 562 C93 558.5 110 558.5 116 562', 'M84.5 575 C92 581 110 581 117.5 575', 'M93.5 535 C99 538.5 105.5 538.5 110.5 535'), // barra, bolso, joelho, polegar, dedo, sola, tênis
    'M120 276 C121 290 121 300 118 309', // costura do shorts
    ...both('M92 57 C91 59 91.5 62 93 63.5'), // orelha
  ),
];
const maleTop = [
  { d: M.hair, kind: 'hair' },
  ...line('M110 17 C114 21 117 25 118.5 30', 'M127 15 C134 18 140 23 143.5 30', 'M100 22 C98 27 96.5 33 96 39').map(p => ({ ...p, kind: 'strand' })),
];

export const PEOPLE = { f: { base: female, top: femaleTop }, m: { base: male, top: maleTop } };
