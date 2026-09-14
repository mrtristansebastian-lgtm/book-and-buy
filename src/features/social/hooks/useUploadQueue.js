import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeImageForUpload } from '../../media/imageNormalize';
import {
  UploadCanceledError,
  isUploadCanceled,
  uploadPublicImage,
  uploadPublicVideo
} from '../../../shared/firebase/integrations';

const DEFAULT_CONCURRENCY = 2;

/** Share of a clip's progress bar given to the video itself; the rest is its poster. */
const VIDEO_SHARE = 0.9;

export const UPLOAD_IDLE = { status: 'queued', progress: 0, error: '' };

/**
 * Roll per-item upload state into the numbers the footer needs.
 *
 * @param {Record<string, {status: string, progress: number}>} uploads
 * @param {string[]} ids items currently in the composer, in display order
 */
export function summarizeUploads(uploads, ids) {
  const tracked = ids
    .map((id) => uploads[id])
    .filter((entry) => entry && entry.status !== 'canceled');

  const inFlight = tracked.filter(
    (entry) => entry.status === 'preparing' || entry.status === 'uploading'
  );
  const failed = tracked.filter((entry) => entry.status === 'error');
  const total = tracked.length;
  const progress = total
    ? tracked.reduce(
        (sum, entry) => sum + (entry.status === 'done' ? 1 : entry.progress || 0),
        0
      ) / total
    : 1;

  return {
    total,
    activeCount: inFlight.length,
    failedCount: failed.length,
    busy: inFlight.length > 0,
    progress,
    allReady: total > 0 && inFlight.length === 0 && failed.length === 0
  };
}

/**
 * Background upload queue for composer media. Media starts transferring the
 * moment it is picked, so publishing only writes the resulting URLs.
 *
 * Jobs are `{ id, kind: 'image'|'video', file, posterFile?, preset?, skipNormalize? }`.
 */
export function useUploadQueue({
  concurrency = DEFAULT_CONCURRENCY,
  onUploaded,
  onFailed
} = {}) {
  const [uploads, setUploads] = useState({});

  const jobsRef = useRef(new Map());
  const genRef = useRef(new Map());
  const pendingRef = useRef([]);
  const activeRef = useRef(new Set());
  const tasksRef = useRef(new Map());
  const canceledRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const mountedRef = useRef(true);
  const runRef = useRef(null);
  const pumpRef = useRef(null);

  const callbacksRef = useRef({ onUploaded, onFailed });
  callbacksRef.current = { onUploaded, onFailed };

  const setUpload = useCallback((id, patch) => {
    if (!mountedRef.current) return;
    setUploads((prev) => ({
      ...prev,
      [id]: { ...UPLOAD_IDLE, ...(prev[id] || {}), ...patch }
    }));
  }, []);

  /** Object URLs created for previews, revoked together on unmount. */
  const trackUrl = useCallback((url) => {
    if (url && String(url).startsWith('blob:')) objectUrlsRef.current.add(url);
    return url;
  }, []);

  const releaseUrl = useCallback((url) => {
    if (!url || !String(url).startsWith('blob:')) return;
    objectUrlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  const pump = useCallback(() => {
    while (activeRef.current.size < concurrency && pendingRef.current.length) {
      const id = pendingRef.current.shift();
      const job = jobsRef.current.get(id);
      if (!job || canceledRef.current.has(id)) continue;
      activeRef.current.add(id);
      runRef.current?.(id, job);
    }
  }, [concurrency]);
  pumpRef.current = pump;

  runRef.current = async (id, job) => {
    // A replaced job (same id, new file) must not let the old run write state.
    const stale = () => genRef.current.get(id) !== job.gen;
    const guardCancel = () => {
      if (stale() || canceledRef.current.has(id)) throw new UploadCanceledError();
    };

    try {
      guardCancel();

      if (job.kind === 'image') {
        setUpload(id, { status: 'preparing', progress: 0, error: '' });
        const file = job.skipNormalize
          ? job.file
          : await normalizeImageForUpload(job.file, job.preset || 'socialPost');
        guardCancel();

        setUpload(id, { status: 'uploading', progress: 0, bytesTotal: file.size });
        const result = await uploadPublicImage(file, 'social', {
          onProgress: (fraction) => setUpload(id, { progress: fraction }),
          onTask: (task) => tasksRef.current.set(id, task)
        });
        guardCancel();

        setUpload(id, { status: 'done', progress: 1, error: '' });
        callbacksRef.current.onUploaded?.(id, {
          url: result.url,
          localOnly: Boolean(result.localOnly)
        });
        return;
      }

      setUpload(id, { status: 'uploading', progress: 0, error: '', bytesTotal: job.file?.size });
      const video = await uploadPublicVideo(job.file, 'social', {
        onProgress: (fraction) => setUpload(id, { progress: fraction * VIDEO_SHARE }),
        onTask: (task) => tasksRef.current.set(id, task)
      });
      guardCancel();

      let posterUrl = '';
      if (job.posterFile) {
        try {
          const poster = await uploadPublicImage(job.posterFile, 'social', {
            onProgress: (fraction) =>
              setUpload(id, { progress: VIDEO_SHARE + fraction * (1 - VIDEO_SHARE) }),
            onTask: (task) => tasksRef.current.set(id, task)
          });
          posterUrl = poster.url || '';
        } catch (error) {
          if (isUploadCanceled(error)) throw error;
          // A missing poster is recoverable — the player falls back to frame one.
        }
      }
      guardCancel();

      setUpload(id, { status: 'done', progress: 1, error: '' });
      callbacksRef.current.onUploaded?.(id, {
        url: video.url,
        posterUrl,
        localOnly: Boolean(video.localOnly)
      });
    } catch (error) {
      if (stale()) return;
      if (isUploadCanceled(error)) {
        setUpload(id, { status: 'canceled', progress: 0, error: '' });
      } else {
        const message = error?.message || 'Upload failed.';
        setUpload(id, { status: 'error', error: message });
        callbacksRef.current.onFailed?.(id, message);
      }
    } finally {
      if (!stale()) {
        tasksRef.current.delete(id);
        activeRef.current.delete(id);
      }
      if (mountedRef.current) pumpRef.current?.();
    }
  };

  const enqueue = useCallback(
    (jobs) => {
      const list = Array.isArray(jobs) ? jobs : [jobs];
      list.forEach((entry) => {
        if (!entry?.id) return;
        const { id } = entry;

        // Replacing a job (recrop, new video) stops the previous transfer first.
        pendingRef.current = pendingRef.current.filter((pending) => pending !== id);
        const running = tasksRef.current.get(id);
        if (running) {
          try {
            running.cancel();
          } catch {
            /* already settled */
          }
          tasksRef.current.delete(id);
        }
        activeRef.current.delete(id);

        const gen = (genRef.current.get(id) || 0) + 1;
        genRef.current.set(id, gen);
        jobsRef.current.set(id, { ...entry, gen });
        canceledRef.current.delete(id);
        pendingRef.current.push(id);
        setUpload(id, { status: 'queued', progress: 0, error: '' });
      });
      pumpRef.current?.();
    },
    [setUpload]
  );

  const retry = useCallback(
    (id) => {
      const job = jobsRef.current.get(id);
      if (!job) return;
      canceledRef.current.delete(id);
      if (activeRef.current.has(id) || pendingRef.current.includes(id)) return;
      pendingRef.current.push(id);
      setUpload(id, { status: 'queued', progress: 0, error: '' });
      pumpRef.current?.();
    },
    [setUpload]
  );

  const cancel = useCallback(
    (id) => {
      canceledRef.current.add(id);
      pendingRef.current = pendingRef.current.filter((entry) => entry !== id);
      const task = tasksRef.current.get(id);
      if (task) {
        try {
          task.cancel();
        } catch {
          /* already settled */
        }
      }
      if (!activeRef.current.has(id)) {
        setUpload(id, { status: 'canceled', progress: 0, error: '' });
      }
    },
    [setUpload]
  );

  /** Drop a job entirely — used when the slide is removed from the post. */
  const forget = useCallback((id) => {
    canceledRef.current.add(id);
    pendingRef.current = pendingRef.current.filter((entry) => entry !== id);
    const task = tasksRef.current.get(id);
    if (task) {
      try {
        task.cancel();
      } catch {
        /* already settled */
      }
    }
    tasksRef.current.delete(id);
    jobsRef.current.delete(id);
    // Bump the generation so an in-flight run cannot write state for a dropped slide.
    genRef.current.set(id, (genRef.current.get(id) || 0) + 1);
    if (!mountedRef.current) return;
    setUploads((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    [...jobsRef.current.keys()].forEach((id) => {
      canceledRef.current.add(id);
      const task = tasksRef.current.get(id);
      if (task) {
        try {
          task.cancel();
        } catch {
          /* already settled */
        }
      }
    });
    [...jobsRef.current.keys()].forEach((id) =>
      genRef.current.set(id, (genRef.current.get(id) || 0) + 1)
    );
    jobsRef.current.clear();
    tasksRef.current.clear();
    activeRef.current.clear();
    pendingRef.current = [];
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    if (mountedRef.current) setUploads({});
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch {
          /* already settled */
        }
      });
      tasksRef.current.clear();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  return {
    uploads,
    enqueue,
    retry,
    cancel,
    forget,
    reset,
    trackUrl,
    releaseUrl
  };
}
