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
 * Capture a JPEG poster frame from a local video File.
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
