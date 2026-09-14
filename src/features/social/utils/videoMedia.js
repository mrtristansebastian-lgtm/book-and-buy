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

/**
 * Capture a JPEG poster frame from a local video File (native aspect, no padding).
 */
export async function captureVideoPoster(file, atSeconds = 0.15) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

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

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, video.videoWidth || 1280);
    canvas.height = Math.max(1, video.videoHeight || 720);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Could not capture poster'));
        },
        'image/jpeg',
        0.9
      );
    });

    return new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
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
