/**
 * Procedural world map art generator.
 * Draws an FFT-style parchment/medieval map with terrain, roads, and location markers.
 * Rendered to a canvas element for use as the world map background.
 */

// Seeded random for deterministic terrain
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface WorldMapNode {
  id: string;
  name: string;
  type: string;
  x: number; // 0-100 percentage
  y: number;
}

/**
 * Generate the world map canvas with terrain, roads, and location markers.
 */
export function generateWorldMapCanvas(
  width: number,
  height: number,
  nodes: WorldMapNode[],
  connections: Array<[string, string]>
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Parchment background
  drawParchmentBackground(ctx, width, height);

  // 2. Terrain features
  drawTerrain(ctx, width, height);

  // 3. Roads between connected nodes
  drawRoads(ctx, width, height, nodes, connections);

  // 4. Location markers
  drawLocationMarkers(ctx, width, height, nodes);

  // 5. Map border and compass
  drawMapBorder(ctx, width, height);
  drawCompass(ctx, width, height);

  // 6. Title cartouche
  drawTitle(ctx, width, height);

  return canvas;
}

function drawParchmentBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Base parchment color
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, '#d4c5a0');
  gradient.addColorStop(0.6, '#c8b890');
  gradient.addColorStop(1, '#a89870');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Parchment texture noise
  const rand = seeded(42);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < w * h; i++) {
    const noise = (rand() - 0.5) * 20;
    data[i * 4] = Math.max(0, Math.min(255, data[i * 4] + noise));
    data[i * 4 + 1] = Math.max(0, Math.min(255, data[i * 4 + 1] + noise));
    data[i * 4 + 2] = Math.max(0, Math.min(255, data[i * 4 + 2] + noise * 0.8));
  }
  ctx.putImageData(imgData, 0, 0);

  // Age stains
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 8; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    const sr = 30 + rand() * 80;
    const stainGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    stainGrad.addColorStop(0, '#8a7050');
    stainGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = stainGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rand = seeded(123);

  // Mountains (top portion of map)
  ctx.strokeStyle = '#8a7860';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(100, 85, 65, 0.15)';

  for (let i = 0; i < 12; i++) {
    const mx = w * 0.1 + rand() * w * 0.8;
    const my = h * 0.05 + rand() * h * 0.3;
    const size = 15 + rand() * 25;
    drawMountain(ctx, mx, my, size);
  }

  // Forests (small tree clusters)
  for (let i = 0; i < 20; i++) {
    const fx = w * 0.05 + rand() * w * 0.9;
    const fy = h * 0.15 + rand() * h * 0.7;
    drawTreeCluster(ctx, fx, fy, 3 + Math.floor(rand() * 4), rand);
  }

  // Rivers
  ctx.strokeStyle = '#7090a8';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h * 0.05);
  ctx.bezierCurveTo(w * 0.65, h * 0.25, w * 0.55, h * 0.35, w * 0.5, h * 0.5);
  ctx.bezierCurveTo(w * 0.45, h * 0.65, w * 0.35, h * 0.75, w * 0.2, h * 0.95);
  ctx.stroke();

  // River label
  ctx.globalAlpha = 0.4;
  ctx.font = 'italic 10px serif';
  ctx.fillStyle = '#506878';
  ctx.save();
  ctx.translate(w * 0.48, h * 0.48);
  ctx.rotate(-0.3);
  ctx.fillText('Burgoss River', 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Sea/coast on the left edge
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#708898';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.05, 0);
  ctx.bezierCurveTo(w * 0.08, h * 0.3, w * 0.03, h * 0.5, w * 0.06, h * 0.8);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Coast waves
  ctx.strokeStyle = '#708898';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  for (let y = 20; y < h - 20; y += 30) {
    ctx.beginPath();
    const startX = w * 0.02 + Math.sin(y * 0.05) * 5;
    ctx.moveTo(startX, y);
    ctx.quadraticCurveTo(startX + 8, y - 5, startX + 16, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawMountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y + size * 0.3);
  ctx.lineTo(x - size * 0.1, y - size * 0.4);
  ctx.lineTo(x, y - size * 0.5);
  ctx.lineTo(x + size * 0.1, y - size * 0.35);
  ctx.lineTo(x + size * 0.5, y + size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Snow cap
  ctx.fillStyle = 'rgba(220, 210, 190, 0.4)';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.08, y - size * 0.35);
  ctx.lineTo(x, y - size * 0.5);
  ctx.lineTo(x + size * 0.08, y - size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(100, 85, 65, 0.15)';
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, rand: () => number): void {
  ctx.fillStyle = 'rgba(70, 90, 50, 0.3)';
  ctx.strokeStyle = 'rgba(60, 75, 45, 0.5)';
  ctx.lineWidth = 1;

  for (let i = 0; i < count; i++) {
    const tx = x + (rand() - 0.5) * 20;
    const ty = y + (rand() - 0.5) * 15;
    const ts = 4 + rand() * 5;

    // Simple tree: triangle + trunk
    ctx.beginPath();
    ctx.moveTo(tx, ty - ts);
    ctx.lineTo(tx - ts * 0.6, ty + ts * 0.3);
    ctx.lineTo(tx + ts * 0.6, ty + ts * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawRoads(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  nodes: WorldMapNode[],
  connections: Array<[string, string]>
): void {
  ctx.strokeStyle = '#9a8868';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.5;

  for (const [fromId, toId] of connections) {
    const from = nodes.find(n => n.id === fromId);
    const to = nodes.find(n => n.id === toId);
    if (!from || !to) continue;

    const x1 = (from.x / 100) * w;
    const y1 = (from.y / 100) * h;
    const x2 = (to.x / 100) * w;
    const y2 = (to.y / 100) * h;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    // Slight curve for visual interest
    const mx = (x1 + x2) / 2 + (Math.sin(x1 + y1) * 15);
    const my = (y1 + y2) / 2 + (Math.cos(x1 + y1) * 10);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawLocationMarkers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  nodes: WorldMapNode[]
): void {
  for (const node of nodes) {
    const x = (node.x / 100) * w;
    const y = (node.y / 100) * h;

    switch (node.type) {
      case 'story_battle':
        drawBattleMarker(ctx, x, y);
        break;
      case 'town':
        drawTownMarker(ctx, x, y);
        break;
      case 'random_encounter':
        drawEncounterMarker(ctx, x, y);
        break;
      default:
        drawDefaultMarker(ctx, x, y);
    }

    // Location name
    ctx.fillStyle = '#3a3020';
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.name, x, y + 16);
    ctx.textAlign = 'left';
  }
}

function drawBattleMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Crossed swords icon
  ctx.strokeStyle = '#6a3020';
  ctx.fillStyle = '#c84040';
  ctx.lineWidth = 2;

  // Circle background
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2018';
  ctx.stroke();

  // Cross
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 3);
  ctx.lineTo(x + 3, y + 3);
  ctx.moveTo(x + 3, y - 3);
  ctx.lineTo(x - 3, y + 3);
  ctx.stroke();
}

function drawTownMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // House icon
  ctx.fillStyle = '#c8a050';
  ctx.strokeStyle = '#6a5030';
  ctx.lineWidth = 1.5;

  // House body
  ctx.fillRect(x - 5, y - 2, 10, 8);
  ctx.strokeRect(x - 5, y - 2, 10, 8);

  // Roof
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 2);
  ctx.lineTo(x, y - 8);
  ctx.lineTo(x + 7, y - 2);
  ctx.closePath();
  ctx.fillStyle = '#a06030';
  ctx.fill();
  ctx.stroke();
}

function drawEncounterMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Small dot
  ctx.fillStyle = '#808060';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#605840';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDefaultMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawMapBorder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Double border
  ctx.strokeStyle = '#6a5a40';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.strokeStyle = '#8a7a58';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Corner ornaments
  const corners = [[15, 15], [w - 15, 15], [15, h - 15], [w - 15, h - 15]];
  ctx.fillStyle = '#6a5a40';
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCompass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w - 50;
  const cy = h - 50;
  const size = 20;

  ctx.globalAlpha = 0.6;

  // Compass circle
  ctx.strokeStyle = '#6a5a40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();

  // North arrow
  ctx.fillStyle = '#8a3030';
  ctx.beginPath();
  ctx.moveTo(cx, cy - size + 2);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx + 4, cy);
  ctx.closePath();
  ctx.fill();

  // South arrow
  ctx.fillStyle = '#3a3020';
  ctx.beginPath();
  ctx.moveTo(cx, cy + size - 2);
  ctx.lineTo(cx - 4, cy);
  ctx.lineTo(cx + 4, cy);
  ctx.closePath();
  ctx.fill();

  // E/W lines
  ctx.strokeStyle = '#6a5a40';
  ctx.beginPath();
  ctx.moveTo(cx - size + 2, cy);
  ctx.lineTo(cx + size - 2, cy);
  ctx.stroke();

  // N label
  ctx.fillStyle = '#6a3020';
  ctx.font = 'bold 8px serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - size - 4);
  ctx.textAlign = 'left';

  ctx.globalAlpha = 1;
}

function drawTitle(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
  // Title banner
  ctx.fillStyle = 'rgba(60, 50, 35, 0.7)';
  const bannerW = 180;
  const bannerH = 28;
  const bx = w / 2 - bannerW / 2;
  ctx.fillRect(bx, 16, bannerW, bannerH);

  // Border
  ctx.strokeStyle = '#8a7a58';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, 16, bannerW, bannerH);

  // Text
  ctx.fillStyle = '#d4c5a0';
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('IVALICE', w / 2, 35);
  ctx.textAlign = 'left';
}
