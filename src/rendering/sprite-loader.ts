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
 * - Irregular spacing between frames
 * - First palette section (top-left ~1/3 of sheet) is the default
 * - First row of each section has idle + walk frames for 4 directions
 *
 * We use column-gap scanning to detect frame boundaries, which is
 * much faster than flood-fill on these large sheets.
 */

export type SpriteDirection = 'south' | 'west' | 'east' | 'north';

interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
      if (!texture?.source) return false;

      texture.source.scaleMode = 'nearest';
      await processSheet(jobName, texture);
      return loadedJobs.has(jobName);
    } catch {
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
  if (!img) return;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Build background mask: white or transparent = background
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

  // ─── Find idle frames in first palette section ───
  // Scan only the top-left portion (first ~1/3 width, first ~1/2 height for regular jobs,
  // or first ~1/2 width + ~full height for story characters like Ramza)
  const sectionW = Math.min(Math.floor(w / 2.5), 300);
  const scanH = Math.min(Math.floor(h / 3), 200); // Only scan first ~3 rows of sprites

  // Find individual frame columns using vertical gap scanning
  const frames = findFramesInRegion(data, w, h, 0, 0, sectionW, scanH, isBg);

  if (frames.length === 0) {
    console.log(`No frames found for ${jobName}`);
    return;
  }

  // The first row of frames contains idle + walk poses in direction order.
  // FFT direction order: South, West, East, North
  // Each direction has ~2-4 frames (idle, walk1, walk2, etc.)
  // The idle frame for each direction is the FIRST frame in each direction group.
  //
  // Strategy: Take the first row of tall frames and divide into 4 direction groups.
  const firstRowY = frames[0].y;
  const firstRow = frames.filter(f => Math.abs(f.y - firstRowY) < 15 && f.height >= 25);

  // Sort by x position
  firstRow.sort((a, b) => a.x - b.x);

  const directions: SpriteDirection[] = ['south', 'west', 'east', 'north'];

  if (firstRow.length >= 4) {
    // Divide the first row into 4 roughly equal direction groups
    const groupSize = Math.ceil(firstRow.length / 4);
    for (let d = 0; d < 4; d++) {
      const groupStart = d * groupSize;
      if (groupStart < firstRow.length) {
        const frame = firstRow[groupStart]; // First frame of each group = idle
        storeIdleFrame(jobName, directions[d], frame, fixedTex);
      }
    }
  } else {
    // Fewer than 4 frames: use what we have, duplicate for missing directions
    for (let d = 0; d < 4; d++) {
      const frame = firstRow[Math.min(d, firstRow.length - 1)];
      storeIdleFrame(jobName, directions[d], frame, fixedTex);
    }
  }

  loadedJobs.add(jobName);
  const found = directions.filter(d => idleFrameTextures.has(`${jobName}:${d}`)).length;
  console.log(`${jobName}: extracted ${frames.length} frames, ${found}/4 idle directions`);
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
  const fw = frame.width + pad * 2;
  const fh = frame.height + pad * 2;

  const rect = new PIXI.Rectangle(x, y, fw, fh);
  const tex = new PIXI.Texture({ source: sheet.source, frame: rect });
  tex.source.scaleMode = 'nearest';

  idleFrameTextures.set(`${jobName}:${direction}`, tex);
}

// ─── Frame Detection ───

/**
 * Find individual sprite frames in a region using column-gap scanning.
 * This is much faster than flood-fill and handles the irregular FFT layouts.
 *
 * Approach:
 * 1. For each column in the region, check if it has any non-bg pixels
 * 2. Find contiguous runs of non-empty columns → horizontal frame spans
 * 3. For each horizontal span, find the vertical extent (top/bottom of content)
 * 4. Split tall spans into separate frames if there are vertical gaps
 */
function findFramesInRegion(
  data: Uint8ClampedArray,
  imgW: number,
  _imgH: number,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  isBg: (i: number) => boolean
): SpriteFrame[] {
  // Step 1: Column content profile
  const colHasContent = new Uint8Array(regionW);
  for (let cx = 0; cx < regionW; cx++) {
    const absX = regionX + cx;
    for (let cy = 0; cy < regionH; cy++) {
      const absY = regionY + cy;
      if (!isBg(absY * imgW + absX)) {
        colHasContent[cx] = 1;
        break;
      }
    }
  }

  // Step 2: Find horizontal spans of non-empty columns
  const hSpans: Array<{ startX: number; endX: number }> = [];
  let spanStart = -1;
  let gapCount = 0;
  const maxGap = 2; // Allow up to 2px gaps within a sprite (anti-aliasing)

  for (let cx = 0; cx < regionW; cx++) {
    if (colHasContent[cx]) {
      if (spanStart === -1) spanStart = cx;
      gapCount = 0;
    } else {
      if (spanStart !== -1) {
        gapCount++;
        if (gapCount > maxGap) {
          hSpans.push({ startX: spanStart, endX: cx - gapCount });
          spanStart = -1;
          gapCount = 0;
        }
      }
    }
  }
  if (spanStart !== -1) {
    hSpans.push({ startX: spanStart, endX: regionW - 1 - gapCount });
  }

  // Step 3: For each horizontal span, find vertical content bounds
  // and split into rows if there are vertical gaps
  const frames: SpriteFrame[] = [];

  for (const span of hSpans) {
    const spanW = span.endX - span.startX + 1;
    if (spanW < 5) continue; // too narrow

    // Find row profile for this span
    const rowHasContent = new Uint8Array(regionH);
    for (let cy = 0; cy < regionH; cy++) {
      const absY = regionY + cy;
      for (let cx = span.startX; cx <= span.endX; cx++) {
        const absX = regionX + cx;
        if (!isBg(absY * imgW + absX)) {
          rowHasContent[cy] = 1;
          break;
        }
      }
    }

    // Find vertical runs of non-empty rows within this span
    let rowStart = -1;
    let rowGap = 0;
    const maxRowGap = 3;

    for (let cy = 0; cy < regionH; cy++) {
      if (rowHasContent[cy]) {
        if (rowStart === -1) rowStart = cy;
        rowGap = 0;
      } else {
        if (rowStart !== -1) {
          rowGap++;
          if (rowGap > maxRowGap) {
            const frameH = cy - rowGap - rowStart + 1;
            if (frameH >= 8) {
              frames.push({
                x: regionX + span.startX,
                y: regionY + rowStart,
                width: spanW,
                height: frameH,
              });
            }
            rowStart = -1;
            rowGap = 0;
          }
        }
      }
    }
    if (rowStart !== -1) {
      const endY = regionH - 1 - rowGap;
      const frameH = endY - rowStart + 1;
      if (frameH >= 8) {
        frames.push({
          x: regionX + span.startX,
          y: regionY + rowStart,
          width: spanW,
          height: frameH,
        });
      }
    }
  }

  return frames;
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
      ? `Sprite sheets loaded: ${loaded.join(', ')}`
      : 'No sprite sheets found — using procedural fallback sprites'
  );
  return loaded;
}

function jobNameToFilename(jobName: string): string {
  return jobName.toLowerCase().replace(/\s+/g, '-');
}
