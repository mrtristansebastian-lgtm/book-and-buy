import { isHeicFile } from '../../media/imageNormalize';
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  formatBytes
} from '../../../shared/firebase/integrations';
import { formatDurationLabel, POST_CLIP_MAX_SECONDS } from './socialPostType';
import { captureVideoPoster, readVideoFrame } from './videoMedia';

/** Slides allowed in one carousel post. */
export const MAX_MEDIA = 10;

function fileLabel(file, index) {
  const name = String(file?.name || '').trim();
  return name || `File ${index + 1}`;
}

function skip(file, index, reason) {
  return { name: fileLabel(file, index), reason };
}

/**
 * Classify and validate picked files for a carousel post, measuring each one so
 * rejections can quote real numbers instead of restating the rule.
 *
 * @param {File[]} files
 * @param {{ existingCount?: number, maxMedia?: number }} options
 * @returns {Promise<{ accepted: Array<object>, skipped: Array<{name: string, reason: string}> }>}
 */
export async function intakePostMedia(files, options = {}) {
  const list = [...(files || [])];
  const maxMedia = options.maxMedia ?? MAX_MEDIA;
  const existingCount = options.existingCount ?? 0;
  const room = Math.max(0, maxMedia - existingCount);

  const accepted = [];
  const skipped = [];

  if (!list.length) return { accepted, skipped };

  if (room === 0) {
    return {
      accepted,
      skipped: [
        {
          name: list.length === 1 ? fileLabel(list[0], 0) : `${list.length} files`,
          reason: `This post already holds the maximum of ${maxMedia} slides.`
        }
      ]
    };
  }

  for (let index = 0; index < list.length; index += 1) {
    const file = list[index];

    if (accepted.length >= room) {
      skipped.push(
        skip(file, index, `Over the ${maxMedia}-slide limit for one post.`)
      );
      continue;
    }

    if (!file || file.size === 0) {
      skipped.push(skip(file, index, 'The file is empty.'));
      continue;
    }

    const type = String(file.type || '').toLowerCase();
    const isImage = type.startsWith('image/') || isHeicFile(file);
    const isVideo = type.startsWith('video/');

    if (!isImage && !isVideo) {
      skipped.push(skip(file, index, 'Not a photo or video.'));
      continue;
    }

    if (isImage) {
      // Oversized photos are downscaled later, so only reject the truly extreme.
      if (file.size > MAX_IMAGE_BYTES * 8) {
        skipped.push(
          skip(
            file,
            index,
            `${formatBytes(file.size)} is too large to process in the browser.`
          )
        );
        continue;
      }
      accepted.push({
        kind: 'image',
        file,
        url: URL.createObjectURL(file),
        needsNormalize: true
      });
      continue;
    }

    let frame = null;
    try {
      frame = await readVideoFrame(file);
    } catch {
      skipped.push(
        skip(file, index, 'This video format cannot play in the browser.')
      );
      continue;
    }

    const seconds = frame.duration || 0;
    if (seconds > POST_CLIP_MAX_SECONDS + 0.25) {
      skipped.push(
        skip(
          file,
          index,
          `${formatDurationLabel(seconds)} long — posts allow clips up to ${formatDurationLabel(
            POST_CLIP_MAX_SECONDS
          )}. Add it under Videos instead.`
        )
      );
      continue;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      skipped.push(
        skip(
          file,
          index,
          `${formatBytes(file.size)} — the limit is ${formatBytes(MAX_VIDEO_BYTES)}.`
        )
      );
      continue;
    }

    let posterFile = null;
    let posterUrl = '';
    try {
      posterFile = await captureVideoPoster(file);
      posterUrl = URL.createObjectURL(posterFile);
    } catch {
      posterFile = null;
    }

    accepted.push({
      kind: 'video',
      file,
      url: URL.createObjectURL(file),
      posterFile,
      posterUrl,
      durationSeconds: seconds,
      durationLabel: formatDurationLabel(seconds),
      aspectRatio: frame.aspect || 0
    });
  }

  return { accepted, skipped };
}

/**
 * Validate a single file for the long-form Videos flow, where length is free but
 * transfer size is not.
 *
 * @returns {Promise<{ ok: boolean, reason?: string, frame?: object }>}
 */
export async function intakeLongVideo(file) {
  if (!file) return { ok: false, reason: 'Choose a video file.' };
  if (!String(file.type || '').toLowerCase().startsWith('video/')) {
    return { ok: false, reason: 'That is not a video file.' };
  }
  if (file.size === 0) return { ok: false, reason: 'The file is empty.' };
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      reason: `That video is ${formatBytes(file.size)} — the limit is ${formatBytes(
        MAX_VIDEO_BYTES
      )}. Trim it or export at a lower resolution.`
    };
  }

  try {
    const frame = await readVideoFrame(file);
    return { ok: true, frame };
  } catch {
    return { ok: false, reason: 'This video format cannot play in the browser.' };
  }
}

/** One-line summary of a skipped batch for the error banner. */
export function summarizeSkips(skipped) {
  if (!skipped?.length) return '';
  if (skipped.length === 1) return `${skipped[0].name}: ${skipped[0].reason}`;
  return `${skipped.length} files were skipped.`;
}
