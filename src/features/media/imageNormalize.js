import { loadImageSource } from './cropImage';
import { resolveImagePreset } from './imagePresets';

/** Long edge every upload is capped to — above the 1080 display target so crops stay sharp. */
export const NORMALIZE_MAX_EDGE = 2048;

/** Re-encode until the result lands under this, keeping headroom below the 6MB storage ceiling. */
const TARGET_BYTES = 3.5 * 1024 * 1024;

/** Files this small with sane dimensions are passed through untouched. */
const PASSTHROUGH_BYTES = 1.2 * 1024 * 1024;

const QUALITY_LADDER = [0.92, 0.82, 0.72];

const PASSTHROUGH_TYPES = new Set(['image/jpeg', 'image/webp']);

let webpSupport = null;

function supportsWebp() {
  if (webpSupport != null) return webpSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

export function isHeicFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    /\.(heic|heif)$/.test(name)
  );
}

/**
 * Browsers outside Safari cannot decode HEIC, and the failure is a silent blank
 * canvas — so say what to do about it instead.
 */
export const HEIC_MESSAGE =
  'This browser cannot read HEIC photos. On iPhone set Settings › Camera › Formats to "Most Compatible", or export as JPEG first.';

/**
 * Decode a file honouring EXIF orientation, which a bare <img> draw does not.
 * @returns {Promise<{ source: ImageBitmap|HTMLImageElement, width: number, height: number, close: () => void }>}
 */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.()
      };
    } catch {
      /* fall through to the <img> path below */
    }
  }

  const image = await loadImageSource(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!(width > 0 && height > 0)) throw new Error('Could not read image size');
  return { source: image, width, height, close: () => {} };
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      mime,
      quality
    );
  });
}

function renamed(file, mime) {
  const ext = mime === 'image/webp' ? 'webp' : 'jpg';
  const base = String(file?.name || 'photo')
    .replace(/\.[^.]+$/, '')
    .slice(0, 60) || 'photo';
  return `${base}.${ext}`;
}

/**
 * Bring any picked image inside upload limits: EXIF-corrected, downscaled to at
 * most NORMALIZE_MAX_EDGE on its long edge, and re-encoded down a quality ladder
 * until it fits. Small, already-web-ready files are returned as-is. Never upscales.
 *
 * @param {File} file
 * @param {string|object} presetOrId preset whose max edge acts as a floor for the cap
 * @returns {Promise<File>}
 */
export async function normalizeImageForUpload(file, presetOrId = 'socialPost') {
  if (!(file instanceof Blob)) throw new Error('Choose an image file.');
  if (file.size === 0) throw new Error('That file is empty.');
  if (isHeicFile(file) && typeof createImageBitmap !== 'function') {
    throw new Error(HEIC_MESSAGE);
  }

  const preset = resolveImagePreset(presetOrId);
  const maxEdge = Math.max(
    NORMALIZE_MAX_EDGE,
    Math.max(preset.width || 0, preset.height || 0)
  );

  let decoded;
  try {
    decoded = await decodeImage(file);
  } catch (error) {
    if (isHeicFile(file)) throw new Error(HEIC_MESSAGE);
    throw error;
  }

  try {
    const { source, width, height } = decoded;
    const longEdge = Math.max(width, height);
    const scale = Math.min(1, maxEdge / longEdge);

    const alreadyWebReady =
      scale === 1 &&
      file.size <= PASSTHROUGH_BYTES &&
      PASSTHROUGH_TYPES.has(String(file.type).toLowerCase());
    if (alreadyWebReady) return file;

    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, outW, outH);

    const mime = supportsWebp() ? 'image/webp' : 'image/jpeg';
    let best = null;
    for (const quality of QUALITY_LADDER) {
      const blob = await canvasToBlob(canvas, mime, quality);
      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!best) throw new Error('Could not encode image');

    // Re-encoding a small graphic can inflate it; keep whichever is smaller.
    if (scale === 1 && best.size >= file.size && file.type.startsWith('image/')) {
      return file;
    }

    return new File([best], renamed(file, mime), {
      type: best.type || mime,
      lastModified: Date.now()
    });
  } finally {
    decoded.close();
  }
}
