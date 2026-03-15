import * as PIXI from 'pixi.js';

/**
 * FFT Sprite Sheet Loader
 *
 * Loads ripped FFT sprite sheets (from Spriters Resource etc.) and
 * extracts idle frames for each facing direction.
 *
 * These sheets have:
 * - White backgrounds (no alpha channel)
 * - Multiple palette/color variants side by side
 * - Disconnected body parts (hands, weapons, feet) that must NOT be treated as separate sprites
 * - First palette section (top-left ~1/3 of sheet) is the default
 * - First row of each section has idle + walk frames for 4 directions
 *
 * We use column-density analysis to find contiguous content spans, then filter
 * to only keep full character sprites (not body part fragments).
 */

export type SpriteDirection = 'south' | 'west' | 'east' | 'north';

interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpriteFrameWithContent extends SpriteFrame {
  contentPixels: number;
}

// ─── Constants ───

const MIN_FRAME_HEIGHT = 35;
const MIN_FRAME_WIDTH = 20;
const MIN_CONTENT_FOR_FULL_SPRITE = 200;

// ─── State ───

const fixedSheets = new Map<string, PIXI.Texture>();
const idleFrameTextures = new Map<string, PIXI.Texture>();
const loadedJobs = new Set<string>();
const loadingPromises = new Map<string, Promise<boolean>>();

// ─── Public API ───

export function hasJobSpriteSheet(jobName: string): boolean {
  return loadedJobs.has(jobName);
}

export function getIdleFrame(
  jobName: string,
  direction: SpriteDirection
): PIXI.Texture | null {
  const key = `${jobName}:${direction}`;
  return idleFrameTextures.get(key) || null;
}

export async function loadJobSpriteSheet(jobName: string): Promise<boolean> {
  if (loadedJobs.has(jobName)) return true;
  if (loadingPromises.has(jobName)) return loadingPromises.get(jobName)!;

  const filename = jobNameToFilename(jobName);
  const path = `/sprites/jobs/${filename}.png`;

  const promise = (async () => {
    try {
      const texture = await PIXI.Assets.load<PIXI.Texture>(path);
      if (!texture?.source) {
        console.warn(`[sprite-loader] ${jobName}: texture load returned null/no source`);
        return false;
      }

      texture.source.scaleMode = 'nearest';
      await processSheet(jobName, texture);
      return loadedJobs.has(jobName);
    } catch (e) {
      console.warn(`[sprite-loader] ${jobName}: failed to load sprite sheet:`, e);
      return false;
    }
  })();

  loadingPromises.set(jobName, promise);
  const result = await promise;
  loadingPromises.delete(jobName);
  return result;
}

// ─── Sheet Processing ───

async function processSheet(jobName: string, texture: PIXI.Texture): Promise<void> {
  const w = texture.source.width;
  const h = texture.source.height;

  // Get image as canvas to read pixels
  const img = await loadImage(texture);
  if (!img) {
    console.warn(`[sprite-loader] ${jobName}: could not load image from texture`);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Build background mask: white or near-white or transparent = background
  const isBg = (i: number) => {
    const a = data[i * 4 + 3];
    if (a < 10) return true;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return r > 240 && g > 240 && b > 240;
  };

  // Make background transparent in the image data
  for (let i = 0; i < w * h; i++) {
    if (isBg(i)) {
      data[i * 4 + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Store the fixed (transparent bg) texture
  const fixedTex = PIXI.Texture.from(canvas);
  fixedTex.source.scaleMode = 'nearest';
  fixedSheets.set(jobName, fixedTex);

  // ─── Column-density frame extraction ───
  // Scan the first palette section (left ~1/3 of the sheet, top portion)
  const sectionW = Math.min(Math.floor(w / 2.5), 320);
  const scanH = Math.min(150, h);

  // Find content spans using column density analysis
  const allFrames = findFramesByColumnDensity(data, w, h, sectionW, scanH, isBg);

  // Filter to only full character sprites (not body part fragments)
  const fullSprites = allFrames.filter(
    f => f.height >= MIN_FRAME_HEIGHT &&
         f.width >= MIN_FRAME_WIDTH &&
         f.contentPixels >= MIN_CONTENT_FOR_FULL_SPRITE
  );

  if (fullSprites.length === 0) {
    console.warn(`[sprite-loader] ${jobName}: no full sprite frames found (${allFrames.length} candidates rejected)`);
    return;
  }

  // Sort by x-position and take exactly the first 4
  fullSprites.sort((a, b) => a.x - b.x);
  const idleFrames = fullSprites.slice(0, 4);

  assignDirectionFrames(jobName, idleFrames, fixedTex);
}

/**
 * Find frames by analyzing column content density.
 * Finds spans of columns with significant content, which naturally groups
 * full sprites together. Body parts are narrower spans with less content.
 */
function findFramesByColumnDensity(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  sectionW: number,
  scanH: number,
  isBg: (i: number) => boolean
): SpriteFrameWithContent[] {
  // Build a column content profile
  const colContentCount = new Uint16Array(sectionW);
  for (let x = 0; x < sectionW; x++) {
    for (let y = 0; y < scanH; y++) {
      if (!isBg(y * imgW + x)) {
        colContentCount[x]++;
      }
    }
  }

  // Find spans of columns with significant content (>=5 pixels of content)
  const threshold = 5;
  const spans: Array<{ startX: number; endX: number }> = [];
  let spanStart = -1;
  let gapLen = 0;
  const maxGap = 4; // Allow small gaps (internal to a sprite)

  for (let x = 0; x < sectionW; x++) {
    if (colContentCount[x] >= threshold) {
      if (spanStart === -1) spanStart = x;
      gapLen = 0;
    } else if (spanStart !== -1) {
      gapLen++;
      if (gapLen > maxGap) {
        const endX = x - gapLen;
        if (endX - spanStart >= 10) {
          spans.push({ startX: spanStart, endX });
        }
        spanStart = -1;
        gapLen = 0;
      }
    }
  }
  if (spanStart !== -1) {
    const endX = sectionW - 1 - gapLen;
    if (endX - spanStart >= 10) {
      spans.push({ startX: spanStart, endX });
    }
  }

  // For each span, get tight bounding box
  const frames: SpriteFrameWithContent[] = [];
  for (const span of spans) {
    const spanW = span.endX - span.startX + 1;
    const bbox = getCellBoundingBox(data, imgW, imgH, span.startX, 0, spanW, scanH, isBg);
    if (bbox) {
      frames.push(bbox);
    }
  }

  return frames;
}

/**
 * Get the tight bounding box of content within a cell region.
 */
function getCellBoundingBox(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  isBg: (i: number) => boolean
): SpriteFrameWithContent | null {
  let minX = cellW, maxX = 0, minY = cellH, maxY = 0;
  let count = 0;

  const maxCellX = Math.min(cellX + cellW, imgW);
  const maxCellY = Math.min(cellY + cellH, imgH);

  for (let y = cellY; y < maxCellY; y++) {
    for (let x = cellX; x < maxCellX; x++) {
      if (!isBg(y * imgW + x)) {
        const lx = x - cellX;
        const ly = y - cellY;
        if (lx < minX) minX = lx;
        if (lx > maxX) maxX = lx;
        if (ly < minY) minY = ly;
        if (ly > maxY) maxY = ly;
        count++;
      }
    }
  }

  if (count === 0) return null;

  return {
    x: cellX + minX,
    y: cellY + minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    contentPixels: count,
  };
}

/**
 * Assign direction frames from a list of detected frames.
 * FFT direction order: South, West, East, North.
 * Expects exactly 4 frames (or fewer, in which case duplicates fill gaps).
 */
function assignDirectionFrames(
  jobName: string,
  frames: SpriteFrame[],
  fixedTex: PIXI.Texture
): void {
  const directions: SpriteDirection[] = ['south', 'west', 'east', 'north'];

  // Map each of the (up to) 4 frames to a direction
  for (let d = 0; d < 4; d++) {
    const frame = frames[Math.min(d, frames.length - 1)];
    storeIdleFrame(jobName, directions[d], frame, fixedTex);
  }

  loadedJobs.add(jobName);
  const found = directions.filter(d => idleFrameTextures.has(`${jobName}:${d}`)).length;
  console.log(`[sprite-loader] ${jobName}: extracted ${frames.length} idle frames, ${found}/4 directions assigned`);
}

function storeIdleFrame(
  jobName: string,
  direction: SpriteDirection,
  frame: SpriteFrame,
  sheet: PIXI.Texture
): void {
  // Add a small padding around the frame for safety
  const pad = 1;
  const x = Math.max(0, frame.x - pad);
  const y = Math.max(0, frame.y - pad);
  const fw = Math.min(frame.width + pad * 2, sheet.source.width - x);
  const fh = Math.min(frame.height + pad * 2, sheet.source.height - y);

  const rect = new PIXI.Rectangle(x, y, fw, fh);
  const tex = new PIXI.Texture({ source: sheet.source, frame: rect });
  tex.source.scaleMode = 'nearest';

  idleFrameTextures.set(`${jobName}:${direction}`, tex);
}

// ─── Image Loading ───

function loadImage(texture: PIXI.Texture): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const source = texture.source;

    if (source.resource instanceof HTMLImageElement) {
      const img = source.resource;
      if (img.complete) return resolve(img);
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      return;
    }

    if (source.resource instanceof HTMLCanvasElement) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = source.resource.toDataURL();
      return;
    }

    // Try getting the URL from the source
    const url = (source as any).label || (source as any)._sourceOrigin || (source as any).src;
    if (typeof url === 'string' && url.length > 0) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
      return;
    }

    resolve(null);
  });
}

// ─── Preloading ───

const ALL_JOBS = [
  'Squire', 'Knight', 'Archer', 'White Mage', 'Black Mage',
  'Chemist', 'Monk', 'Thief', 'Time Mage', 'Summoner',
  'Geomancer', 'Dragoon', 'Samurai', 'Ninja', 'Calculator',
  'Dancer', 'Bard', 'Mime', 'Oracle', 'Mediator',
  'Ramza', 'Delita', 'Agrias',
];

export async function preloadAllSprites(): Promise<string[]> {
  const loaded: string[] = [];
  const promises = ALL_JOBS.map(async (job) => {
    const success = await loadJobSpriteSheet(job);
    if (success) loaded.push(job);
  });
  await Promise.all(promises);
  console.log(
    loaded.length > 0
      ? `[sprite-loader] Sprite sheets loaded: ${loaded.join(', ')}`
      : '[sprite-loader] No sprite sheets found — using procedural fallback sprites'
  );
  return loaded;
}

function jobNameToFilename(jobName: string): string {
  return jobName.toLowerCase().replace(/\s+/g, '-');
}
