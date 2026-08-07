import { resolveImagePreset } from './imagePresets';

/**
 * Load an image from a File, Blob, or URL (including data URLs).
 */
export function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    let objectUrl = '';

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Could not load image'));
    };

    if (typeof source === 'string') {
      // Cross-origin URLs need CORS for canvas export when possible.
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
 * Export pixels from react-easy-crop area into a File at preset size.
 * @param {HTMLImageElement|string|Blob} source
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {string|object} presetOrId
 * @param {{ fitMode?: 'fill' | 'fit' }} options
 */
export async function exportCroppedImage(
  source,
  pixelCrop,
  presetOrId = 'socialPost',
  options = {}
) {
  const preset = resolveImagePreset(presetOrId);
  const fitMode = options.fitMode === 'fit' ? 'fit' : 'fill';
  const image = typeof source === 'object' && source?.tagName === 'IMG'
    ? source
    : await loadImageSource(source);

  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  // Soft letterbox background for Fit mode
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cropX = Math.max(0, pixelCrop.x);
  const cropY = Math.max(0, pixelCrop.y);
  const cropW = Math.max(1, pixelCrop.width);
  const cropH = Math.max(1, pixelCrop.height);

  if (fitMode === 'fit') {
    // Draw the cropped region scaled to fit inside the canvas (letterbox).
    const scale = Math.min(canvas.width / cropW, canvas.height / cropH);
    const drawW = cropW * scale;
    const drawH = cropH * scale;
    const dx = (canvas.width - drawW) / 2;
    const dy = (canvas.height - drawH) / 2;
    ctx.drawImage(image, cropX, cropY, cropW, cropH, dx, dy, drawW, drawH);
  } else {
    // Fill: stretch crop exactly to output (react-easy-crop already frames the ratio).
    ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Could not encode image'));
      },
      preset.mime || 'image/jpeg',
      preset.quality ?? 0.92
    );
  });

  const ext = (preset.mime || 'image/jpeg').includes('png') ? 'png' : 'jpg';
  const fileName = `${preset.id || 'image'}-${Date.now()}.${ext}`;
  return new File([blob], fileName, { type: blob.type || preset.mime });
}
