/**
 * Read duration (seconds) from a local video File.
 */
export function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error('Invalid video file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const duration = Number(video.duration) || 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video duration'));
    };
    video.src = url;
  });
}

/**
 * Read a video's natural frame size / aspect (same idea as image crop frames).
 */
export function readVideoFrame(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    let objectUrl = '';

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      cleanup();
      if (!(width > 0 && height > 0)) {
        reject(new Error('Could not read video size'));
        return;
      }
      resolve({
        width,
        height,
        aspect: width / height,
        duration: Number(video.duration) || 0
      });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video'));
    };

    if (typeof source === 'string') {
      video.src = source;
      return;
    }
    if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
      return;
    }
    reject(new Error('Unsupported video source'));
  });
}

function canvasToJpegFile(canvas, name, quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not capture frame'));
          return;
        }
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Grab a JPEG still from a video element that is already loaded and seeked.
 * Throws on cross-origin taint, which callers treat as "frame picking unavailable".
 */
export async function captureFrameFromVideoElement(video, options = {}) {
  const width = video?.videoWidth || 0;
  const height = video?.videoHeight || 0;
  if (!(width > 0 && height > 0)) throw new Error('Video frame not ready');

  const maxEdge = Number(options.maxEdge) > 0 ? Number(options.maxEdge) : 0;
  const quality =
    Number(options.quality) > 0 && Number(options.quality) <= 1
      ? Number(options.quality)
      : 0.9;
  const scale = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(width, height)) : 1;
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(video, 0, 0, outW, outH);

  return canvasToJpegFile(
    canvas,
    options.name || `frame-${Date.now()}.jpg`,
    quality
  );
}

function seekVideo(video, seconds) {
  const target = Math.max(0, Number(seconds) || 0);
  if (Math.abs((video.currentTime || 0) - target) < 0.03) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    const onSeeked = () => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => finish());
      } else {
        finish();
      }
    };
    video.addEventListener('seeked', onSeeked);
    try {
      if (typeof video.fastSeek === 'function') video.fastSeek(target);
      else video.currentTime = target;
    } catch {
      video.currentTime = target;
    }
    window.setTimeout(finish, 700);
  });
}

/**
 * Capture a JPEG poster from a File or playable URL at a given timestamp.
 */
export async function captureVideoPoster(source, atSeconds = 0.15) {
  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : '';
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    if (!objectUrl) video.crossOrigin = 'anonymous';
    video.src = objectUrl || String(source);

    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not load video'));
    });

    const target = Math.min(
      Math.max(0, atSeconds),
      Math.max(0, (Number(video.duration) || 1) - 0.05)
    );
    if (Number.isFinite(target)) {
      await seekVideo(video, target);
    }

    return captureFrameFromVideoElement(video);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Capture several stills in one video load — used for thumbnail suggestions
 * and the Arrange filmstrip.
 *
 * @param {File|string} source local file or same-origin/CORS-enabled URL
 * @param {number[]} fractions positions through the video, 0–1
 * @param {{ maxEdge?: number, quality?: number, onFrame?: Function }} [options]
 * @returns {Promise<Array<{ seconds: number, file: File }>>}
 */
export async function captureVideoFrames(source, fractions = [0.1, 0.5, 0.8], options = {}) {
  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : '';
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  if (!objectUrl) video.crossOrigin = 'anonymous';

  const maxEdge = Number(options.maxEdge) > 0 ? Number(options.maxEdge) : 0;
  const quality = Number(options.quality) > 0 ? Number(options.quality) : 0.9;
  const onFrame = typeof options.onFrame === 'function' ? options.onFrame : null;

  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not load video'));
      video.src = objectUrl || String(source);
    });

    const duration = Number(video.duration) || 0;
    const results = [];

    for (let index = 0; index < fractions.length; index += 1) {
      const fraction = fractions[index];
      const seconds = Math.min(
        Math.max(0, duration * fraction),
        Math.max(0, duration - 0.05)
      );
      if (Number.isFinite(seconds)) {
        await seekVideo(video, seconds);
      }
      try {
        const file = await captureFrameFromVideoElement(video, {
          maxEdge: maxEdge || undefined,
          quality,
          name: `strip-${index}.jpg`
        });
        const entry = { seconds, file };
        results.push(entry);
        onFrame?.(entry, index);
      } catch {
        /* skip frames the browser refuses to paint */
      }
    }

    return results;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** Draw video frame cover-cropped into a destination rect (Instagram filmstrip tiles). */
function drawVideoCover(ctx, video, dx, dy, dw, dh) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (!(vw > 0 && vh > 0) || !(dw > 0 && dh > 0)) return;
  const scale = Math.max(dw / vw, dh / vh);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Instagram-style continuous filmstrip: one retina canvas of seamless cover tiles.
 * Much sharper than a grid of low-res JPEGs, and no chunky seams.
 *
 * @param {File|string} source
 * @param {{
 *   frameCount?: number,
 *   tileWidth?: number,
 *   tileHeight?: number,
 *   quality?: number,
 *   onProgress?: (payload: { file: File, done: number, total: number }) => void
 * }} [options]
 * @returns {Promise<{ file: File, frameCount: number, duration: number } | null>}
 */
export async function captureVideoFilmstrip(source, options = {}) {
  const frameCount = Math.max(2, Math.round(Number(options.frameCount) || 12));
  const tileWidth = Math.max(24, Math.round(Number(options.tileWidth) || 80));
  const tileHeight = Math.max(24, Math.round(Number(options.tileHeight) || 128));
  const quality =
    Number(options.quality) > 0 && Number(options.quality) <= 1
      ? Number(options.quality)
      : 0.88;
  const onProgress =
    typeof options.onProgress === 'function' ? options.onProgress : null;

  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : '';
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  if (!objectUrl) video.crossOrigin = 'anonymous';

  try {
    await new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not load video'));
      video.src = objectUrl || String(source);
    });

    const duration = Number(video.duration) || 0;
    if (!(duration > 0) || !(video.videoWidth > 0)) return null;

    const canvas = document.createElement('canvas');
    canvas.width = frameCount * tileWidth;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let lastFile = null;

    for (let index = 0; index < frameCount; index += 1) {
      const fraction = frameCount <= 1 ? 0 : index / (frameCount - 1);
      const seconds = Math.min(
        Math.max(0, duration * fraction),
        Math.max(0, duration - 0.04)
      );
      await seekVideo(video, seconds);
      drawVideoCover(ctx, video, index * tileWidth, 0, tileWidth, tileHeight);

      // Seed the rest of the strip with the first tile so the bar looks sharp immediately
      if (index === 0 && frameCount > 1) {
        for (let i = 1; i < frameCount; i += 1) {
          ctx.drawImage(
            canvas,
            0,
            0,
            tileWidth,
            tileHeight,
            i * tileWidth,
            0,
            tileWidth,
            tileHeight
          );
        }
      }

      const shouldEmit =
        onProgress &&
        (index === 0 ||
          index === frameCount - 1 ||
          (index + 1) % 3 === 0);
      if (shouldEmit) {
        lastFile = await canvasToJpegFile(
          canvas,
          `filmstrip-${Date.now()}.jpg`,
          quality
        );
        onProgress({ file: lastFile, done: index + 1, total: frameCount });
      }
    }

    if (!lastFile) {
      lastFile = await canvasToJpegFile(
        canvas,
        `filmstrip-${Date.now()}.jpg`,
        quality
      );
    }

    return { file: lastFile, frameCount, duration };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** CSS-friendly aspect value for inline styles */
export function aspectStyle(aspect, fallback) {
  const value =
    Number.isFinite(aspect) && aspect > 0
      ? aspect
      : Number.isFinite(fallback) && fallback > 0
        ? fallback
        : null;
  if (!value) return undefined;
  return { aspectRatio: String(value) };
}
