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

function canvasToJpegFile(canvas, name) {
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
      0.9
    );
  });
}

/**
 * Grab a JPEG still from a video element that is already loaded and seeked.
 * Throws on cross-origin taint, which callers treat as "frame picking unavailable".
 */
export async function captureFrameFromVideoElement(video) {
  const width = video?.videoWidth || 0;
  const height = video?.videoHeight || 0;
  if (!(width > 0 && height > 0)) throw new Error('Video frame not ready');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(video, 0, 0, width, height);

  return canvasToJpegFile(canvas, `frame-${Date.now()}.jpg`);
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
      video.currentTime = target;
      await new Promise((resolve) => {
        video.onseeked = () => resolve();
      });
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
 * @returns {Promise<Array<{ seconds: number, file: File }>>}
 */
export async function captureVideoFrames(source, fractions = [0.1, 0.5, 0.8]) {
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
    const results = [];

    for (const fraction of fractions) {
      const seconds = Math.min(
        Math.max(0, duration * fraction),
        Math.max(0, duration - 0.05)
      );
      if (Number.isFinite(seconds)) {
        await new Promise((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = seconds;
        });
      }
      try {
        const file = await captureFrameFromVideoElement(video);
        results.push({ seconds, file });
      } catch {
        /* skip frames the browser refuses to paint */
      }
    }

    return results;
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
