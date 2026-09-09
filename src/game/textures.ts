const PALETTE = {
  emberCore: '#ffcf4a',
  emberEdge: '#ff6b35',
  emberDeep: '#c9431a',
  tideCore: '#8fedff',
  tideEdge: '#1a7ba8',
  tideDeep: '#0c4a73',
  gold: '#ffb84d',
  grassLight: '#6bbf59',
  grassDark: '#2f6b34',
  stoneLight: '#8a7f99',
  stoneDark: '#4a4058',
  sanctumLight: '#4a3a75',
  sanctumDark: '#241a3d',
  crystalCyan: '#7de3ff',
  crystalMagenta: '#e37dff',
  lavaCore: '#ffdd55',
  lavaEdge: '#ff5a1f',
  waterCore: '#6fe3e0',
  waterEdge: '#1a6b6b',
  wood: '#6b4a2f',
};

function canvasTex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

function drawSpiritBody(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string, flicker: boolean): void {
  const cx = w / 2;
  const topY = h * 0.08;
  const bottomY = h * 0.82;
  const wideY = h * 0.55;
  const wideX = w * 0.34;

  ctx.beginPath();
  ctx.ellipse(cx, h * 0.92, w * 0.28, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,5,20,0.35)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.bezierCurveTo(cx + wideX * 0.5, topY + (wideY - topY) * 0.2, cx + wideX, wideY - (wideY - topY) * 0.1, cx + wideX, wideY);
  ctx.bezierCurveTo(cx + wideX, wideY + (bottomY - wideY) * 0.75, cx + wideX * 0.55, bottomY, cx, bottomY);
  ctx.bezierCurveTo(cx - wideX * 0.55, bottomY, cx - wideX, wideY + (bottomY - wideY) * 0.75, cx - wideX, wideY);
  ctx.bezierCurveTo(cx - wideX, wideY - (wideY - topY) * 0.1, cx - wideX * 0.5, topY + (wideY - topY) * 0.2, cx, topY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fill();

  if (flicker) {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * wideX * 0.15, topY + 6);
      ctx.quadraticCurveTo(cx + dir * wideX * 0.55, topY - 8, cx + dir * wideX * 0.32, topY + 20);
      ctx.quadraticCurveTo(cx + dir * wideX * 0.1, topY + 14, cx + dir * wideX * 0.15, topY + 6);
      ctx.closePath();
      ctx.fillStyle = bottom;
      ctx.fill();
    }
  }

  const hl = ctx.createRadialGradient(
    cx - wideX * 0.35,
    wideY - (wideY - topY) * 0.6,
    2,
    cx - wideX * 0.35,
    wideY - (wideY - topY) * 0.6,
    wideX * 0.9,
  );
  hl.addColorStop(0, 'rgba(255,255,255,0.5)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fill();

  const eyeY = wideY - (wideY - topY) * 0.05;
  const eyeDX = wideX * 0.38;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + dir * eyeDX, eyeY, w * 0.075, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1230';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + dir * eyeDX + dir * 1.6, eyeY - 2, w * 0.022, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, eyeY + h * 0.1, w * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.strokeStyle = 'rgba(26,18,48,0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

function drawRadialSoft(ctx: CanvasRenderingContext2D, size: number, color = '255,255,255'): void {
  const r = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${color},1)`);
  grad.addColorStop(0.4, `rgba(${color},0.5)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, light: string, dark: string): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? light : dark;
    ctx.beginPath();
    ctx.ellipse(x, y, 1.5 + Math.random() * 2.5, 1 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

const TILE_TEX_SIZE = 512;

function mottle(ctx: CanvasRenderingContext2D, size: number, count: number, colors: string[], minR: number, maxR: number): void {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = minR + Math.random() * (maxR - minR);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = colors[Math.floor(Math.random() * colors.length)];
    gr.addColorStop(0, c);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrassTile(ctx: CanvasRenderingContext2D): void {
  const size = TILE_TEX_SIZE;
  ctx.fillStyle = '#4a9450';
  ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, 26, ['rgba(130,206,110,0.55)'], 40, 100);
  mottle(ctx, size, 16, ['rgba(47,107,52,0.45)'], 30, 70);
  speckle(ctx, size, size, 220, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.08)');
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = 'rgba(20,50,20,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 3, y - 8, x + 1, y - 14);
    ctx.stroke();
  }
}

function drawStoneTile(ctx: CanvasRenderingContext2D): void {
  const size = TILE_TEX_SIZE;
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, 18, ['rgba(138,127,153,0.4)'], 50, 110);
  ctx.strokeStyle = 'rgba(20,15,30,0.3)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 64 + 32 * (i % 2));
    ctx.lineTo(size, i * 64 + 20 - 32 * (i % 2));
    ctx.stroke();
  }
  speckle(ctx, size, size, 220, 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.15)');
}

function drawSanctumTile(ctx: CanvasRenderingContext2D): void {
  const size = TILE_TEX_SIZE;
  ctx.fillStyle = PALETTE.sanctumDark;
  ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, 16, ['rgba(74,58,117,0.55)'], 60, 130);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 64, 0);
    ctx.lineTo(i * 64, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 64);
    ctx.lineTo(size, i * 64);
    ctx.stroke();
  }
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const c = Math.random() > 0.5 ? PALETTE.crystalCyan : PALETTE.crystalMagenta;
    const rgb = c === PALETTE.crystalCyan ? '125,227,255' : '227,125,255';
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 4);
    gr.addColorStop(0, `rgba(${rgb},0.9)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLavaTile(ctx: CanvasRenderingContext2D): void {
  const size = TILE_TEX_SIZE;
  ctx.fillStyle = '#7a1f0a';
  ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, 20, ['rgba(255,90,31,0.55)'], 40, 100);
  for (let i = 0; i < 16; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = 'rgba(255,221,85,0.45)';
    ctx.lineWidth = 3 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size / 4, y + (Math.random() - 0.5) * 60, (size * 3) / 4, y + (Math.random() - 0.5) * 60, size, y);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, 14);
    g2.addColorStop(0, 'rgba(255,221,85,0.85)');
    g2.addColorStop(1, 'rgba(255,221,85,0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaterTile(ctx: CanvasRenderingContext2D): void {
  const size = TILE_TEX_SIZE;
  ctx.fillStyle = '#0c3a4a';
  ctx.fillRect(0, 0, size, size);
  mottle(ctx, size, 20, ['rgba(26,107,107,0.5)'], 40, 100);
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = 'rgba(143,237,255,0.4)';
    ctx.lineWidth = 2 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size / 4, y + (Math.random() - 0.5) * 40, (size * 3) / 4, y + (Math.random() - 0.5) * 40, size, y);
    ctx.stroke();
  }
  speckle(ctx, size, size, 60, 'rgba(255,255,255,0.15)', 'rgba(0,0,0,0.1)');
}

function drawTree(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  ctx.beginPath();
  ctx.ellipse(cx, h - 6, w * 0.28, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.fillStyle = PALETTE.wood;
  ctx.beginPath();
  ctx.moveTo(cx - 6, h - 10);
  ctx.lineTo(cx - 4, h * 0.55);
  ctx.lineTo(cx + 4, h * 0.55);
  ctx.lineTo(cx + 6, h - 10);
  ctx.closePath();
  ctx.fill();
  const canopyY = h * 0.4;
  const blobs: [number, number, number][] = [
    [-16, 2, 26],
    [16, -3, 27],
    [0, -20, 30],
  ];
  for (const [dx, dy, r] of blobs) {
    const g = ctx.createRadialGradient(cx + dx - r * 0.3, canopyY + dy - r * 0.3, 1, cx + dx, canopyY + dy, r);
    g.addColorStop(0, '#7fcf6a');
    g.addColorStop(1, '#2f6b34');
    ctx.beginPath();
    ctx.arc(cx + dx, canopyY + dy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function drawBush(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, w * 0.36, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  const blobs: [number, number, number][] = [
    [-11, 3, 14],
    [11, 3, 15],
    [0, -8, 16],
    [0, 7, 13],
  ];
  for (const [dx, dy, r] of blobs) {
    const g = ctx.createRadialGradient(w / 2 + dx - r * 0.3, h * 0.55 + dy - r * 0.3, 1, w / 2 + dx, h * 0.55 + dy, r);
    g.addColorStop(0, '#7fcf6a');
    g.addColorStop(1, '#356b38');
    ctx.beginPath();
    ctx.arc(w / 2 + dx, h * 0.55 + dy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, w: number, h: number, petal: string, center: string): void {
  ctx.strokeStyle = '#3d7a3d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, h * 0.45);
  ctx.stroke();
  const cx = w / 2;
  const cy = h * 0.3;
  const pr = 7;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr, 6, 4, a, 0, Math.PI * 2);
    ctx.fillStyle = petal;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = center;
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 5, w * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.7);
  ctx.lineTo(w * 0.05, h * 0.4);
  ctx.lineTo(w * 0.35, h * 0.1);
  ctx.lineTo(w * 0.7, h * 0.15);
  ctx.lineTo(w * 0.9, h * 0.5);
  ctx.lineTo(w * 0.75, h * 0.85);
  ctx.lineTo(w * 0.3, h * 0.9);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, PALETTE.stoneLight);
  g.addColorStop(1, PALETTE.stoneDark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.1);
  ctx.lineTo(w * 0.4, h * 0.5);
  ctx.lineTo(w * 0.3, h * 0.9);
  ctx.stroke();
}

function drawPillar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 6, w * 0.42, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, PALETTE.sanctumDark);
  g.addColorStop(0.5, PALETTE.sanctumLight);
  g.addColorStop(1, PALETTE.sanctumDark);
  ctx.fillStyle = g;
  ctx.fillRect(w * 0.22, h * 0.12, w * 0.56, h * 0.8);
  ctx.fillStyle = PALETTE.sanctumDark;
  ctx.fillRect(w * 0.1, h * 0.02, w * 0.8, h * 0.12);
  ctx.fillRect(w * 0.1, h * 0.88, w * 0.8, h * 0.1);
  for (let i = 0; i < 3; i++) {
    const y = h * 0.28 + i * h * 0.2;
    const gr = ctx.createRadialGradient(w / 2, y, 0, w / 2, y, 5);
    gr.addColorStop(0, 'rgba(125,227,255,0.85)');
    gr.addColorStop(1, 'rgba(125,227,255,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(w / 2, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrystalShape(ctx: CanvasRenderingContext2D, w: number, h: number, a: string, b: string): void {
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 4);
  ctx.lineTo(w * 0.82, h * 0.38);
  ctx.lineTo(w * 0.62, h - 6);
  ctx.lineTo(w * 0.38, h - 6);
  ctx.lineTo(w * 0.18, h * 0.38);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, 4);
  ctx.lineTo(cx, h - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.38);
  ctx.lineTo(w * 0.82, h * 0.38);
  ctx.stroke();
}

function drawTorch(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(w / 2 - 4, h * 0.35, 8, h * 0.6);
  const cx = w / 2;
  const topY = 2;
  const wideY = h * 0.32;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.bezierCurveTo(cx + 14, topY + 16, cx + 12, wideY, cx, wideY + 6);
  ctx.bezierCurveTo(cx - 12, wideY, cx - 14, topY + 16, cx, topY);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, topY, 0, wideY);
  g.addColorStop(0, PALETTE.lavaCore);
  g.addColorStop(1, PALETTE.emberEdge);
  ctx.fillStyle = g;
  ctx.fill();
}

function drawReed(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = '#3d7a3d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h);
  ctx.quadraticCurveTo(w * 0.65, h * 0.5, w * 0.5, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h);
  ctx.quadraticCurveTo(w * 0.2, h * 0.5, w * 0.3, h * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#8b6b4a';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 10, 4, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlate(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.47, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.37, h * 0.32, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.37);
  g.addColorStop(0, '#a89ebb');
  g.addColorStop(1, PALETTE.stoneLight);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#37324a';
  ctx.fill();
}

function drawLeverBase(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 8, w * 0.42, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.fillStyle = PALETTE.stoneDark;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h - 10);
  ctx.lineTo(w * 0.38, h * 0.35);
  ctx.lineTo(w * 0.62, h * 0.35);
  ctx.lineTo(w * 0.78, h - 10);
  ctx.closePath();
  ctx.fill();
}

function drawLeverHandle(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(w / 2 - 4, 6, 8, h - 14);
  ctx.beginPath();
  ctx.arc(w / 2, h - 8, 9, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.gold;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, 12, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#c94a2a';
  ctx.fill();
}

function drawBoulder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.ellipse(cx, h - 8, w * 0.42, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  const g = ctx.createRadialGradient(cx - w * 0.15, cy - h * 0.2, 4, cx, cy, w * 0.5);
  g.addColorStop(0, '#a39bb0');
  g.addColorStop(1, '#5c5468');
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * w * 0.32;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
  }
}

export function generateTextures(scene: Phaser.Scene): void {
  canvasTex(scene, 'tex-glow', 128, 128, (ctx) => drawRadialSoft(ctx, 128));
  canvasTex(scene, 'tex-spark', 24, 24, (ctx) => drawRadialSoft(ctx, 24));

  canvasTex(scene, 'tex-ember-body', 64, 88, (ctx) => drawSpiritBody(ctx, 64, 88, PALETTE.emberCore, PALETTE.emberEdge, true));
  canvasTex(scene, 'tex-tide-body', 64, 88, (ctx) => drawSpiritBody(ctx, 64, 88, PALETTE.tideCore, PALETTE.tideEdge, false));

  canvasTex(scene, 'tex-tile-grass', TILE_TEX_SIZE, TILE_TEX_SIZE, drawGrassTile);
  canvasTex(scene, 'tex-tile-stone', TILE_TEX_SIZE, TILE_TEX_SIZE, drawStoneTile);
  canvasTex(scene, 'tex-tile-sanctum', TILE_TEX_SIZE, TILE_TEX_SIZE, drawSanctumTile);
  canvasTex(scene, 'tex-lava', TILE_TEX_SIZE, TILE_TEX_SIZE, drawLavaTile);
  canvasTex(scene, 'tex-water', TILE_TEX_SIZE, TILE_TEX_SIZE, drawWaterTile);

  canvasTex(scene, 'tex-tree', 64, 96, (ctx) => drawTree(ctx, 64, 96));
  canvasTex(scene, 'tex-bush', 52, 44, (ctx) => drawBush(ctx, 52, 44));
  canvasTex(scene, 'tex-flower-a', 24, 40, (ctx) => drawFlower(ctx, 24, 40, '#ff9fc7', '#ffe066'));
  canvasTex(scene, 'tex-flower-b', 24, 40, (ctx) => drawFlower(ctx, 24, 40, '#ffb84d', '#fff2b0'));
  canvasTex(scene, 'tex-rock', 56, 46, (ctx) => drawRock(ctx, 56, 46));
  canvasTex(scene, 'tex-torch', 28, 72, (ctx) => drawTorch(ctx, 28, 72));
  canvasTex(scene, 'tex-reed', 30, 60, (ctx) => drawReed(ctx, 30, 60));
  canvasTex(scene, 'tex-pillar', 46, 110, (ctx) => drawPillar(ctx, 46, 110));

  canvasTex(scene, 'tex-crystal-decor', 42, 60, (ctx) => drawCrystalShape(ctx, 42, 60, PALETTE.crystalCyan, PALETTE.tideDeep));
  canvasTex(scene, 'tex-crystal-shard', 34, 46, (ctx) => drawCrystalShape(ctx, 34, 46, '#fff6d6', PALETTE.gold));

  canvasTex(scene, 'tex-plate', 84, 66, (ctx) => drawPlate(ctx, 84, 66));
  canvasTex(scene, 'tex-lever-base', 40, 58, (ctx) => drawLeverBase(ctx, 40, 58));
  canvasTex(scene, 'tex-lever-handle', 22, 60, (ctx) => drawLeverHandle(ctx, 22, 60));
  canvasTex(scene, 'tex-boulder', 80, 80, (ctx) => drawBoulder(ctx, 80, 80));

  canvasTex(scene, 'tex-vignette', 1280, 720, (ctx) => {
    const g = ctx.createRadialGradient(640, 360, 420, 640, 360, 820);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 720);
  });
}
