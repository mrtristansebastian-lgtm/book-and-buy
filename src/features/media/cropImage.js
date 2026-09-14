import { resolveFrameAspect, resolveImagePreset } from './imagePresets';

/**
 * Load an image from a File, Blob, or URL (including data URLs).
 */
export function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    let objectUrl = '';

    image.onload = () => {
      const finish = () => resolve(image);
      if (typeof image.decode === 'function') {
        image.decode().then(finish).catch(finish);
      } else {
        finish();
      }
      if (objectUrl) {
        const toRevoke = objectUrl;
        objectUrl = '';
        setTimeout(() => URL.revokeObjectURL(toRevoke), 0);
      }
    };
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image'));
    };

    if (typeof source === 'string') {
      if (/^https?:/i.test(source) && !source.startsWith(window.location.origin)) {
        image.crossOrigin = 'anonymous';
      }
      image.src = source;
      return;
    }

    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      image.src = objectUrl;
      return;
    }

    reject(new Error('Unsupported image source'));
  });
}

/**
 * Create a local object URL for modal preview (caller should revoke).
 */
export function createPreviewUrl(source) {
  if (typeof source === 'string') return { url: source, revoke: () => {} };
  if (source instanceof Blob) {
    const url = URL.createObjectURL(source);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }
  throw new Error('Unsupported image source');
}

/**
 * Read an upload's natural size and the frame shape it should post in.
 */
export async function readImageFrame(source, presetOrId = 'socialPost') {
  const image = await loadImageSource(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!(width > 0 && height > 0)) throw new Error('Could not read image size');
  const naturalAspect = width / height;
  return {
    width,
    height,
    naturalAspect,
    frameAspect: resolveFrameAspect(naturalAspect, presetOrId)
  };
}

/**
 * Size the photo so it always covers the frame (Instagram behaviour — never letterboxed).
 */
export function getCoverSize({ naturalAspect, viewportW, viewportH, zoom = 1 }) {
  const z = Math.max(1, zoom);
  const frameAspect = viewportW / viewportH;
  const aspect = Number.isFinite(naturalAspect) && naturalAspect > 0 ? naturalAspect : frameAspect;
  if (aspect >= frameAspect) {
    const height = viewportH * z;
    return { width: height * aspect, height };
  }
  const width = viewportW * z;
  return { width, height: width / aspect };
}

/**
 * Keep the photo covering the frame while panning.
 */
export function clampImagePan(pan, displayW, displayH, viewportW, viewportH) {
  const minX = Math.min(0, viewportW - displayW);
  const minY = Math.min(0, viewportH - displayH);
  const maxX = Math.max(0, viewportW - displayW);
  const maxY = Math.max(0, viewportH - displayH);
  return {
    x: Math.min(maxX, Math.max(minX, pan.x)),
    y: Math.min(maxY, Math.max(minY, pan.y))
  };
}

function canvasToFile(canvas, preset) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Could not encode image'));
          return;
        }
        const ext = (preset.mime || 'image/jpeg').includes('png') ? 'png' : 'jpg';
        const fileName = `${preset.id || 'image'}-${Date.now()}.${ext}`;
        resolve(new File([result], fileName, { type: result.type || preset.mime }));
      },
      preset.mime || 'image/jpeg',
      preset.quality ?? 0.92
    );
  });
}

/**
 * Export what the frame shows — cropped only, never padded.
 * Output keeps the frame's aspect and caps the long edge at the preset size.
 *
 * @param {HTMLImageElement|string|Blob} source original upload
 * @param {{ zoom: number, pan: {x: number, y: number}, viewportW: number, viewportH: number }} view
 */
export async function exportFramedImage(source, view, presetOrId = 'socialPost') {
  const preset = resolveImagePreset(presetOrId);
  const image =
    typeof source === 'object' && source?.tagName === 'IMG'
      ? source
      : await loadImageSource(source);

  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  const viewportW = Math.max(1, view.viewportW || 1);
  const viewportH = Math.max(1, view.viewportH || 1);
  const zoom = Math.max(1, Number(view.zoom) || 1);
  const display = getCoverSize({
    naturalAspect: naturalW / naturalH,
    viewportW,
    viewportH,
    zoom
  });
  const pan = clampImagePan(
    view.pan || { x: 0, y: 0 },
    display.width,
    display.height,
    viewportW,
    viewportH
  );

  const scaleX = naturalW / display.width;
  const scaleY = naturalH / display.height;
  const sx = Math.max(0, -pan.x * scaleX);
  const sy = Math.max(0, -pan.y * scaleY);
  const sw = Math.max(1, Math.min(viewportW * scaleX, naturalW - sx));
  const sh = Math.max(1, Math.min(viewportH * scaleY, naturalH - sy));

  const frameAspect = viewportW / viewportH;
  const maxEdge = Math.max(preset.width, preset.height);
  let outW;
  let outH;
  if (frameAspect >= 1) {
    outW = Math.max(1, Math.round(Math.min(maxEdge, sw)));
    outH = Math.max(1, Math.round(outW / frameAspect));
  } else {
    outH = Math.max(1, Math.round(Math.min(maxEdge, sh)));
    outW = Math.max(1, Math.round(outH * frameAspect));
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  canvas.width = outW;
  canvas.height = outH;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

  return canvasToFile(canvas, preset);
}
