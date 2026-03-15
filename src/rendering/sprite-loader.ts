import * as PIXI from 'pixi.js';

/**
 * FFT Sprite Sheet Loader
 *
 * Uses HARDCODED frame coordinates for each sprite sheet.
 * Auto-detection was unreliable with these irregularly-laid-out ripped sheets.
 * Manually verified coordinates guarantee exactly 1 sprite per direction per job.
 */

export type SpriteDirection = 'south' | 'west' | 'east' | 'north';

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DirectionFrames = Record<SpriteDirection, FrameRect>;

/**
 * Hardcoded idle frame coordinates per sprite sheet.
 * Extracted by pixel-level analysis of each PNG.
 */
const HARDCODED_FRAMES: Record<string, DirectionFrames> = {
  'archer': {
    south: { x: 41, y: 3, w: 19, h: 35 },
    west:  { x: 106, y: 3, w: 18, h: 34 },
    east:  { x: 168, y: 3, w: 17, h: 33 },
    north: { x: 202, y: 3, w: 14, h: 33 },
  },
  'black-mage': {
    south: { x: 39, y: 3, w: 22, h: 38 },
    west:  { x: 104, y: 6, w: 21, h: 35 },
    east:  { x: 167, y: 2, w: 22, h: 37 },
    north: { x: 199, y: 2, w: 22, h: 37 },
  },
  'knight': {
    south: { x: 40, y: 4, w: 19, h: 36 },
    west:  { x: 103, y: 4, w: 20, h: 35 },
    east:  { x: 168, y: 4, w: 21, h: 32 },
    north: { x: 200, y: 4, w: 20, h: 33 },
  },
  'ramza': {
    south: { x: 40, y: 6, w: 18, h: 37 },
    west:  { x: 104, y: 6, w: 18, h: 36 },
    east:  { x: 167, y: 6, w: 20, h: 34 },
    north: { x: 200, y: 6, w: 18, h: 35 },
  },
  'squire': {
    south: { x: 41, y: 5, w: 18, h: 36 },
    west:  { x: 105, y: 5, w: 18, h: 34 },
    east:  { x: 168, y: 5, w: 16, h: 32 },
    north: { x: 201, y: 5, w: 15, h: 33 },
  },
  'white-mage': {
    south: { x: 38, y: 4, w: 20, h: 33 },
    west:  { x: 103, y: 4, w: 19, h: 33 },
    east:  { x: 166, y: 4, w: 20, h: 32 },
    north: { x: 198, y: 4, w: 20, h: 33 },
  },
};

// ─── State ───

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
  return idleFrameTextures.get(`${jobName}:${direction}`) || null;
}

export async function loadJobSpriteSheet(jobName: string): Promise<boolean> {
  if (loadedJobs.has(jobName)) return true;
  if (loadingPromises.has(jobName)) return loadingPromises.get(jobName)!;

  const filename = jobNameToFilename(jobName);

  // Must have hardcoded frame data
  const frameData = HARDCODED_FRAMES[filename];
  if (!frameData) return false;

  const path = `/sprites/jobs/${filename}.png`;

  const promise = (async () => {
    try {
      const texture = await PIXI.Assets.load<PIXI.Texture>(path);
      if (!texture?.source) return false;

      texture.source.scaleMode = 'nearest';

      // Convert white background to transparent
      const fixedTex = await makeTransparent(texture);
      if (!fixedTex) return false;

      // Extract exactly 4 idle frames using hardcoded coordinates
      const directions: SpriteDirection[] = ['south', 'west', 'east', 'north'];
      for (const dir of directions) {
        const f = frameData[dir];
        const rect = new PIXI.Rectangle(f.x, f.y, f.w, f.h);
        const frameTex = new PIXI.Texture({ source: fixedTex.source, frame: rect });
        frameTex.source.scaleMode = 'nearest';
        idleFrameTextures.set(`${jobName}:${dir}`, frameTex);
      }

      loadedJobs.add(jobName);
      console.log(`[sprite-loader] ${jobName}: 4 idle frames loaded`);
      return true;
    } catch {
      return false;
    }
  })();

  loadingPromises.set(jobName, promise);
  const result = await promise;
  loadingPromises.delete(jobName);
  return result;
}

// ─── Background Removal ───

async function makeTransparent(texture: PIXI.Texture): Promise<PIXI.Texture | null> {
  const w = texture.source.width;
  const h = texture.source.height;

  const img = await loadImage(texture);
  if (!img) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];
    if (a < 10 || (r > 240 && g > 240 && b > 240)) {
      data[i * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const fixedTex = PIXI.Texture.from(canvas);
  fixedTex.source.scaleMode = 'nearest';
  return fixedTex;
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

export async function preloadAllSprites(): Promise<string[]> {
  // Only try jobs that have hardcoded frame data
  const jobNames = Object.keys(HARDCODED_FRAMES).map(filename =>
    filename.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  );
  // Also add exact capitalized names used in game
  const allNames = [...new Set([...jobNames, 'Ramza', 'Squire', 'Knight', 'Archer', 'White Mage', 'Black Mage'])];

  const loaded: string[] = [];
  const promises = allNames.map(async (job) => {
    const success = await loadJobSpriteSheet(job);
    if (success) loaded.push(job);
  });
  await Promise.all(promises);

  console.log(
    loaded.length > 0
      ? `[sprite-loader] Loaded: ${loaded.join(', ')}`
      : '[sprite-loader] No sprite sheets found — using fallback'
  );
  return loaded;
}

function jobNameToFilename(jobName: string): string {
  return jobName.toLowerCase().replace(/\s+/g, '-');
}
