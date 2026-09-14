import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  Film,
  GripVertical,
  ImagePlus,
  Layers,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { ImageCropModal } from '../../media/ImageCropModal';
import { useUploadQueue, summarizeUploads } from '../hooks/useUploadQueue';
import {
  MAX_MEDIA,
  intakeLongVideo,
  intakePostMedia
} from '../utils/mediaIntake';
import {
  formatDurationLabel,
  getPostMediaItems,
  POST_CLIP_MAX_SECONDS,
  tabToPostType
} from '../utils/socialPostType';
import {
  aspectStyle,
  captureVideoPoster,
  readVideoFrame
} from '../utils/videoMedia';
import { VideoThumbnailPicker } from './VideoThumbnailPicker';
import { VideoClipTrimmer } from './VideoClipTrimmer';

const TEXT_SOFT_LIMIT = 280;
const CAPTION_SOFT_LIMIT = 2200;

const VIDEO_JOB_ID = 'primary-video';
const POSTER_JOB_ID = 'primary-poster';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const META = {
  posts: {
    eyebrowCreate: 'New post',
    eyebrowEdit: 'Edit post',
    titleCreate: 'New post'
  },
  videos: {
    eyebrowCreate: 'New video',
    eyebrowEdit: 'Edit video',
    titleCreate: 'New video'
  },
  text: {
    eyebrowCreate: 'New text update',
    eyebrowEdit: 'Edit text update',
    titleCreate: 'New update'
  }
};

const POST_STEPS = [
  { id: 'select', label: 'Select' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'caption', label: 'Caption' }
];

const VIDEO_STEPS = [
  { id: 'source', label: 'Source' },
  { id: 'details', label: 'Details' },
  { id: 'thumbnail', label: 'Thumbnail' }
];

function isBlobUrl(url) {
  return String(url || '').startsWith('blob:');
}

function draftKey(kind, postId) {
  return `bb-composer-draft:${kind}:${postId || 'new'}`;
}

function newMediaItem(partial = {}) {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'image',
    url: '',
    remoteUrl: '',
    file: null,
    posterUrl: '',
    remotePosterUrl: '',
    posterFile: null,
    durationSeconds: 0,
    sourceDurationSeconds: 0,
    durationLabel: '',
    trimStart: 0,
    trimEnd: 0,
    aspectRatio: 0,
    alt: '',
    ...partial
  };
}

function hasFiles(event) {
  const types = [...(event.dataTransfer?.types || [])];
  return types.includes('Files');
}

function StepRail({ steps, index }) {
  return (
    <ol className="bb-composer-steps" aria-label="Composer steps">
      {steps.map((step, i) => (
        <li
          key={step.id}
          className={`bb-composer-step${i === index ? ' is-active' : ''}${
            i < index ? ' is-done' : ''
          }`}
          aria-current={i === index ? 'step' : undefined}
        >
          <span className="bb-composer-step-index">
            {i < index ? <Check size={12} strokeWidth={3} /> : i + 1}
          </span>
          <span className="bb-composer-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Circular progress used on thumbnails and next to character counts. */
function ProgressRing({ value = 0, size = 30, tone = 'upload', children }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span
      className={`bb-composer-ring bb-composer-ring--${tone}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="bb-composer-ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="bb-composer-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      {children ? <span className="bb-composer-ring-label">{children}</span> : null}
    </span>
  );
}

function CharacterCount({ value, limit }) {
  const ratio = limit > 0 ? value / limit : 0;
  const tone = ratio > 1 ? 'over' : ratio > 0.9 ? 'warn' : 'calm';
  const remaining = limit - value;
  return (
    <span className={`bb-composer-count bb-composer-count--${tone}`}>
      <ProgressRing value={Math.min(1, ratio)} size={22} tone={tone} />
      <span>{ratio > 0.8 ? remaining : value}</span>
    </span>
  );
}

function uploadStatusLabel(status) {
  if (status === 'preparing') return 'Preparing';
  if (status === 'uploading') return 'Uploading';
  if (status === 'queued') return 'Waiting';
  if (status === 'done') return 'Ready';
  if (status === 'error') return 'Failed';
  return '';
}

/**
 * Full-panel upload screen so picking media never feels like a black box.
 * Crossfades between preparing → uploading → brief “All set”.
 */
function UploadOverlay({
  open = false,
  phase = 'idle',
  progress = 0,
  activeCount = 0,
  total = 0,
  rows = []
}) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const title =
    phase === 'ready'
      ? 'All set'
      : phase === 'preparing'
        ? 'Preparing media…'
        : total > 1
          ? `Uploading ${activeCount} of ${total}`
          : 'Uploading…';
  const detail =
    phase === 'ready'
      ? 'Your media is ready to publish'
      : phase === 'preparing'
        ? 'Reading files and building previews'
        : `${pct}% complete`;

  return (
    <div
      className={`bb-composer-upload-screen${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-live="polite"
    >
      <div className="bb-composer-upload-screen-card">
        <div className="bb-composer-upload-screen-hero">
          {phase === 'ready' ? (
            <span className="bb-composer-upload-screen-done" aria-hidden="true">
              <Check size={28} strokeWidth={2.6} />
            </span>
          ) : (
            <ProgressRing value={phase === 'preparing' ? 0.12 : progress} size={72} tone="screen">
              {phase === 'preparing' ? (
                <Loader2 size={22} className="bb-spin" aria-hidden="true" />
              ) : (
                <span className="bb-composer-upload-screen-pct">{pct}%</span>
              )}
            </ProgressRing>
          )}
          <div className="bb-composer-upload-screen-copy">
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        </div>

        <div
          className={`bb-composer-upload-screen-track${
            phase === 'preparing' ? ' is-indeterminate' : ''
          }`}
        >
          <span
            style={
              phase === 'preparing'
                ? undefined
                : { width: phase === 'ready' ? '100%' : `${pct}%` }
            }
          />
        </div>

        {rows.length ? (
          <ul className="bb-composer-upload-screen-list">
            {rows.map((row) => (
              <li key={row.id} className={`is-${row.status || 'queued'}`}>
                <div className="bb-composer-upload-screen-row">
                  <span className="bb-composer-upload-screen-thumb" aria-hidden="true">
                    {row.thumb ? (
                      <img src={row.thumb} alt="" />
                    ) : row.kind === 'video' ? (
                      <Film size={14} strokeWidth={2.2} />
                    ) : (
                      <ImagePlus size={14} strokeWidth={2.2} />
                    )}
                  </span>
                  <div className="bb-composer-upload-screen-meta">
                    <strong>{row.label}</strong>
                    <span>{uploadStatusLabel(row.status)}</span>
                  </div>
                  <span className="bb-composer-upload-screen-row-pct">
                    {row.status === 'done'
                      ? '100%'
                      : row.status === 'error'
                        ? '!'
                        : `${Math.round((row.progress || 0) * 100)}%`}
                  </span>
                </div>
                <div className="bb-composer-upload-screen-row-track">
                  <span
                    style={{
                      width: `${Math.round(
                        (row.status === 'done' ? 1 : row.progress || 0) * 100
                      )}%`
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

const MIN_CLIP_FALLBACK = 0.5;

function clampSeek(time, start, end) {
  const clipStart = Math.max(0, Number(start) || 0);
  const clipEnd = Number(end) > clipStart ? Number(end) : clipStart + MIN_CLIP_FALLBACK;
  return Math.min(
    Math.max(Number(time) || clipStart, clipStart),
    Math.max(clipStart, clipEnd - 0.05)
  );
}

function MediaPreview({
  item,
  onAspect,
  trimStart,
  trimEnd,
  seekRequest = null,
  onTime,
  onSeekHandled
}) {
  if (!item?.url) {
    return <span className="bb-composer-arrange-empty">Nothing selected</span>;
  }

  const reportAspect = (w, h) => {
    if (!(w > 0 && h > 0)) return;
    onAspect?.(w / h);
  };

  const start =
    Number.isFinite(trimStart) && trimStart >= 0
      ? trimStart
      : Number(item.trimStart) || 0;
  const endRaw =
    Number.isFinite(trimEnd) && trimEnd > 0
      ? trimEnd
      : Number(item.trimEnd) > 0
        ? Number(item.trimEnd)
        : Number(item.sourceDurationSeconds || item.durationSeconds) || 0;

  if (item.kind === 'video') {
    return (
      <TrimmedVideoPreview
        key={item.id}
        url={item.url}
        posterUrl={item.posterUrl}
        start={start}
        end={endRaw}
        seekRequest={seekRequest}
        onAspect={reportAspect}
        onTime={onTime}
        onSeekHandled={onSeekHandled}
      />
    );
  }

  return (
    <img
      src={item.url}
      alt={item.alt || ''}
      onLoad={(event) => {
        const img = event.currentTarget;
        reportAspect(img.naturalWidth, img.naturalHeight);
      }}
    />
  );
}

function TrimmedVideoPreview({
  url,
  posterUrl,
  start = 0,
  end = 0,
  seekRequest = null,
  onAspect,
  onTime,
  onSeekHandled
}) {
  const videoRef = useRef(null);
  const rangeRef = useRef({ start, end });
  const onTimeRef = useRef(onTime);
  rangeRef.current = { start, end };
  onTimeRef.current = onTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, start);
    if (video.paused && Math.abs((video.currentTime || 0) - target) > 0.12) {
      video.currentTime = target;
      onTimeRef.current?.(target);
    }
  }, [start, url]);

  useEffect(() => {
    if (seekRequest == null || !Number.isFinite(seekRequest.time)) return;
    const video = videoRef.current;
    if (!video) return;
    const { start: clipStart, end: clipEnd } = rangeRef.current;
    const target = clampSeek(seekRequest.time, clipStart, clipEnd);
    video.currentTime = target;
    onTimeRef.current?.(target);
    onSeekHandled?.(seekRequest.id);
  }, [seekRequest, onSeekHandled]);

  const emitTime = (video) => {
    onTimeRef.current?.(video.currentTime || 0);
  };

  const enforceClipBounds = (video, { pauseAtEnd = false } = {}) => {
    const { start: clipStart, end: clipEnd } = rangeRef.current;
    if (!(clipEnd > clipStart)) {
      emitTime(video);
      return;
    }
    if (video.currentTime < clipStart - 0.02) {
      video.currentTime = clipStart;
    }
    if (video.currentTime >= clipEnd - 0.04) {
      if (pauseAtEnd || video.paused) {
        video.pause();
        video.currentTime = clipStart;
      } else {
        video.currentTime = clipStart;
      }
    }
    emitTime(video);
  };

  return (
    <video
      ref={videoRef}
      className="bb-composer-arrange-video"
      src={url}
      poster={posterUrl || undefined}
      muted
      playsInline
      controls
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        onAspect?.(video.videoWidth, video.videoHeight);
        video.currentTime = Math.max(0, start);
        emitTime(video);
      }}
      onPlay={(event) => {
        const video = event.currentTarget;
        const { start: clipStart } = rangeRef.current;
        if (video.currentTime < clipStart - 0.02) {
          video.currentTime = clipStart;
        }
        emitTime(video);
      }}
      onSeeking={(event) => enforceClipBounds(event.currentTarget)}
      onSeeked={(event) => enforceClipBounds(event.currentTarget)}
      onTimeUpdate={(event) => enforceClipBounds(event.currentTarget, { pauseAtEnd: true })}
    />
  );
}

function ErrorBanner({ message, skips, onDismiss }) {
  if (!message && !skips?.length) return null;
  return (
    <div className="bb-composer-banner" role="alert" aria-live="assertive">
      <span className="bb-composer-banner-icon" aria-hidden="true">
        <AlertTriangle size={15} strokeWidth={2.3} />
      </span>
      <div className="bb-composer-banner-copy">
        {message ? <p className="bb-composer-banner-title">{message}</p> : null}
        {skips?.length ? (
          <ul className="bb-composer-banner-list">
            {skips.map((entry) => (
              <li key={`${entry.name}-${entry.reason}`}>
                <strong>{entry.name}</strong> — {entry.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="bb-composer-banner-close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Unified create/edit composer. Media uploads in the background as soon as it is
 * picked, so publishing only writes the resulting URLs.
 */
export function BlogComposerSheet({
  kind = 'posts',
  post = null,
  businessName = '',
  onClose,
  onAddSocialPost,
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  const isEdit = Boolean(post?.id);
  const type = isEdit
    ? post.type === 'video' || post.type === 'text' || post.type === 'image'
      ? post.type
      : tabToPostType(kind)
    : tabToPostType(kind);
  const meta = META[kind] || META.posts;

  const mediaRef = useRef(null);
  const videoRef = useRef(null);
  const posterRef = useRef(null);
  const panelRef = useRef(null);
  const reorderRef = useRef(null);
  const dragDepthRef = useRef(0);
  const publishedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [matchAll, setMatchAll] = useState(false);
  const [liveTrim, setLiveTrim] = useState(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState(null);
  const seekSeqRef = useRef(0);

  const [mediaUrl, setMediaUrl] = useState('');
  const [videoRemoteUrl, setVideoRemoteUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [videoAspect, setVideoAspect] = useState(0);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skips, setSkips] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropPreset, setCropPreset] = useState('socialPost');
  const [fileNameHint, setFileNameHint] = useState('');
  const [cropTarget, setCropTarget] = useState('image');
  const [cropImageId, setCropImageId] = useState('');

  const steps = type === 'image' ? POST_STEPS : type === 'video' ? VIDEO_STEPS : [];

  const onUploaded = useCallback((id, result) => {
    if (id === VIDEO_JOB_ID) {
      setVideoRemoteUrl(result.url || '');
      return;
    }
    if (id === POSTER_JOB_ID) {
      setPosterUrl(result.url || '');
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              remoteUrl: result.url || '',
              remotePosterUrl: result.posterUrl || item.remotePosterUrl
            }
          : item
      )
    );
  }, []);

  const { uploads, enqueue, retry, cancel, forget, trackUrl, releaseUrl } = useUploadQueue({
    onUploaded
  });

  const uploadIds = useMemo(() => {
    if (type === 'image') return items.map((item) => item.id);
    if (type === 'video') return [VIDEO_JOB_ID, POSTER_JOB_ID];
    return [];
  }, [type, items]);

  const summary = useMemo(() => summarizeUploads(uploads, uploadIds), [uploads, uploadIds]);

  const [uploadFlash, setUploadFlash] = useState(false);
  const wasUploadBusyRef = useRef(false);

  useEffect(() => {
    const active = busy || summary.busy;
    if (wasUploadBusyRef.current && !active) {
      setUploadFlash(true);
      const timer = setTimeout(() => setUploadFlash(false), 900);
      wasUploadBusyRef.current = false;
      return () => clearTimeout(timer);
    }
    wasUploadBusyRef.current = active;
    if (active) setUploadFlash(false);
    return undefined;
  }, [busy, summary.busy]);

  const uploadPhase = uploadFlash
    ? 'ready'
    : busy && !summary.busy
      ? 'preparing'
      : summary.busy
        ? 'uploading'
        : 'idle';

  const uploadRows = useMemo(() => {
    if (type === 'image') {
      return items
        .map((item, index) => {
          const state = uploads[item.id];
          if (!state || state.status === 'canceled') return null;
          return {
            id: item.id,
            kind: item.kind,
            label:
              item.kind === 'video'
                ? `Clip ${index + 1}`
                : `Photo ${index + 1}`,
            thumb: item.kind === 'video' ? item.posterUrl || '' : item.url || '',
            status: state.status,
            progress: state.progress || 0
          };
        })
        .filter(Boolean);
    }
    if (type === 'video') {
      const rows = [];
      const videoState = uploads[VIDEO_JOB_ID];
      const posterState = uploads[POSTER_JOB_ID];
      if (videoState && videoState.status !== 'canceled') {
        rows.push({
          id: VIDEO_JOB_ID,
          kind: 'video',
          label: videoFile?.name || 'Video',
          thumb: posterUrl || '',
          status: videoState.status,
          progress: videoState.progress || 0
        });
      }
      if (posterState && posterState.status !== 'canceled') {
        rows.push({
          id: POSTER_JOB_ID,
          kind: 'image',
          label: 'Thumbnail',
          thumb: posterUrl || '',
          status: posterState.status,
          progress: posterState.progress || 0
        });
      }
      return rows;
    }
    return [];
  }, [type, items, uploads, videoFile, posterUrl]);

  const uploadScreenOpen = busy || summary.busy || uploadFlash;

  // ---------------------------------------------------------------- load / draft

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setCaption(post.caption || '');
      setMediaUrl(post.mediaUrl || '');
      setVideoRemoteUrl(isBlobUrl(post.mediaUrl) ? '' : post.mediaUrl || '');
      setVideoFile(null);
      setPosterUrl(post.posterUrl || '');
      setDuration(post.duration || '');
      setDurationSeconds(Number(post.durationSeconds) || 0);
      setVideoAspect(Number(post.aspectRatio) || 0);

      const loaded = getPostMediaItems(post).map((item) => {
        const sourceDuration =
          Number(item.sourceDurationSeconds) ||
          Number(item.durationSeconds) ||
          0;
        const trimStart = Number(item.trimStart) || 0;
        const trimEnd =
          Number(item.trimEnd) > 0 ? Number(item.trimEnd) : sourceDuration;
        return newMediaItem({
          kind: item.kind,
          url: item.url,
          remoteUrl: item.url,
          posterUrl: item.posterUrl || '',
          remotePosterUrl: item.posterUrl || '',
          durationSeconds: item.durationSeconds || Math.max(0, trimEnd - trimStart),
          sourceDurationSeconds: sourceDuration,
          durationLabel: item.durationLabel || '',
          trimStart,
          trimEnd,
          aspectRatio: Number(item.aspectRatio) || 0,
          alt: item.alt || ''
        });
      });
      setItems(loaded);
      setActiveId(loaded[0]?.id || '');
      setStepIndex(type === 'image' && loaded.length ? 1 : 0);
      return;
    }

    let draft = null;
    try {
      draft = JSON.parse(sessionStorage.getItem(draftKey(kind, null)) || 'null');
    } catch {
      draft = null;
    }
    setTitle(draft?.title || '');
    setCaption(draft?.caption || '');
    setItems([]);
    setActiveId('');
    setMediaUrl('');
    setVideoRemoteUrl('');
    setVideoFile(null);
    setPosterUrl('');
    setDuration('');
    setDurationSeconds(0);
    setVideoAspect(0);
    setStepIndex(0);
  }, [post, type, kind]);

  // Text survives an accidental dismissal; File handles cannot be serialized.
  useEffect(() => {
    if (isEdit) return;
    const key = draftKey(kind, null);
    if (!title.trim() && !caption.trim()) {
      sessionStorage.removeItem(key);
      return;
    }
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify({ title, caption }));
      } catch {
        /* private mode / quota */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, caption, isEdit, kind]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(draftKey(kind, null));
    } catch {
      /* ignore */
    }
  }, [kind]);

  // ---------------------------------------------------------------- shell chrome

  const hasUnsavedWork =
    !publishedRef.current &&
    (items.length > 0 ||
      Boolean(title.trim()) ||
      Boolean(caption.trim()) ||
      Boolean(mediaUrl));

  const requestClose = useCallback(() => {
    if (busy) return;
    if (hasUnsavedWork) {
      setConfirmDiscard(true);
      return;
    }
    onClose?.();
  }, [busy, hasUnsavedWork, onClose]);

  const discardAndClose = useCallback(() => {
    clearDraft();
    onClose?.();
  }, [clearDraft, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (cropOpen) return;
        event.stopPropagation();
        if (confirmDiscard) setConfirmDiscard(false);
        else requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropOpen, confirmDiscard, requestClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const focusTimer = setTimeout(() => {
      const target = panel.querySelector('[data-autofocus]');
      if (target) target.focus();
      else panel.focus();
    }, 40);

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null || node === document.activeElement
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      panel.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // ---------------------------------------------------------------- media intake

  const addPostFiles = useCallback(
    async (files) => {
      const list = [...(files || [])];
      if (!list.length) return;
      setError('');
      setSkips([]);
      setBusy(true);
      try {
        const { accepted, skipped } = await intakePostMedia(list, {
          existingCount: items.length
        });
        if (skipped.length) setSkips(skipped);
        if (!accepted.length) return;

        const added = accepted.map((entry) =>
          newMediaItem({
            kind: entry.kind,
            url: trackUrl(entry.url),
            file: entry.file,
            posterUrl: trackUrl(entry.posterUrl || ''),
            posterFile: entry.posterFile || null,
            durationSeconds: entry.durationSeconds || 0,
            sourceDurationSeconds: entry.durationSeconds || 0,
            durationLabel: entry.durationLabel || '',
            trimStart: 0,
            trimEnd: entry.durationSeconds || 0,
            aspectRatio: entry.aspectRatio || 0
          })
        );

        setItems((prev) => [...prev, ...added]);
        setActiveId((prev) => prev || added[0].id);
        setStepIndex((prev) => Math.max(prev, 1));

        enqueue(
          added.map((item) => ({
            id: item.id,
            kind: item.kind,
            file: item.file,
            posterFile: item.posterFile,
            preset: 'socialPost'
          }))
        );
      } catch (err) {
        setError(err?.message || 'Could not add media.');
      } finally {
        setBusy(false);
      }
    },
    [items.length, enqueue, trackUrl]
  );

  const addLongVideo = useCallback(
    async (file) => {
      setError('');
      setSkips([]);
      setBusy(true);
      try {
        const check = await intakeLongVideo(file);
        if (!check.ok) {
          setError(check.reason);
          return;
        }
        const frame = check.frame;
        const seconds = frame.duration || (await readVideoFrame(file)).duration || 0;

        releaseUrl(mediaUrl);
        const preview = trackUrl(URL.createObjectURL(file));

        setVideoFile(file);
        setMediaUrl(preview);
        setVideoRemoteUrl('');
        setDurationSeconds(seconds);
        setDuration(formatDurationLabel(seconds));
        setVideoAspect(frame.aspect || 0);

        const jobs = [{ id: VIDEO_JOB_ID, kind: 'video', file }];
        try {
          const poster = await captureVideoPoster(file);
          jobs.push({
            id: POSTER_JOB_ID,
            kind: 'image',
            file: poster,
            preset: 'videoPoster'
          });
        } catch {
          /* the thumbnail step can still supply one */
        }
        enqueue(jobs);
      } catch (err) {
        setError(err?.message || 'Could not read that video.');
      } finally {
        setBusy(false);
      }
    },
    [enqueue, mediaUrl, releaseUrl, trackUrl]
  );

  const onPostMediaPick = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    addPostFiles(files);
  };

  const onVideoSectionFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) addLongVideo(file);
  };

  // Drag & drop across the whole sheet, plus clipboard paste for screenshots.
  const acceptsDrop = type === 'image' || type === 'video';

  const onDragEnter = (event) => {
    if (!acceptsDrop || !hasFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const onDragOver = (event) => {
    if (!acceptsDrop || !hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (event) => {
    if (!acceptsDrop) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  };

  const onDrop = (event) => {
    if (!acceptsDrop) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    if (type === 'image') addPostFiles(files);
    else addLongVideo(files.find((file) => file.type.startsWith('video/')) || files[0]);
  };

  useEffect(() => {
    if (type !== 'image') return undefined;
    const onPaste = (event) => {
      const files = [...(event.clipboardData?.files || [])].filter(
        (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
      );
      if (!files.length) return;
      event.preventDefault();
      addPostFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [type, addPostFiles]);

  // ---------------------------------------------------------------- crop

  const openImageCrop = (file, target, preset, imageId = '') => {
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropTarget(target);
    setCropPreset(preset);
    setCropImageId(imageId);
    setCropOpen(true);
  };

  const cropItem = async (item) => {
    if (item.kind !== 'image') return;
    if (item.file) {
      openImageCrop(item.file, 'image', 'socialPost', item.id);
      return;
    }
    if (!item.url) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
      openImageCrop(file, 'image', 'socialPost', item.id);
    } catch {
      setError('Could not open that image for cropping.');
    } finally {
      setBusy(false);
    }
  };

  const onPosterPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    openImageCrop(file, 'poster', 'videoPoster');
  };

  const closeCrop = () => {
    setCropOpen(false);
    setCropSource(null);
    setCropImageId('');
  };

  const onCropConfirm = async (file) => {
    if (cropTarget === 'poster') {
      enqueue({ id: POSTER_JOB_ID, kind: 'image', file, preset: 'videoPoster' });
      closeCrop();
      return;
    }
    if (!cropImageId) {
      closeCrop();
      return;
    }

    const preview = trackUrl(URL.createObjectURL(file));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== cropImageId) return item;
        if (isBlobUrl(item.url)) releaseUrl(item.url);
        return { ...item, url: preview, file, remoteUrl: '' };
      })
    );
    enqueue({
      id: cropImageId,
      kind: 'image',
      file,
      preset: 'socialPost',
      skipNormalize: true
    });
    closeCrop();
  };

  // ---------------------------------------------------------------- slides

  const removeItem = (id) => {
    forget(id);
    const target = items.find((item) => item.id === id);
    if (target) {
      if (isBlobUrl(target.url)) releaseUrl(target.url);
      if (isBlobUrl(target.posterUrl)) releaseUrl(target.posterUrl);
    }
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (activeId === id) setActiveId(next[0]?.id || '');
    if (!next.length) setStepIndex(0);
  };

  const moveItem = (from, to) => {
    setItems((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  // Pointer-based reordering so it works with touch, not just HTML5 drag.
  const onGripPointerDown = (event, index) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    reorderRef.current = { pointerId: event.pointerId, index };
  };

  const onGripPointerMove = (event) => {
    const state = reorderRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const node = document.elementFromPoint(event.clientX, event.clientY);
    const slide = node?.closest?.('[data-slide-index]');
    if (!slide) return;
    const to = Number(slide.dataset.slideIndex);
    if (!Number.isInteger(to) || to === state.index) return;
    moveItem(state.index, to);
    state.index = to;
  };

  const onGripPointerUp = (event) => {
    if (reorderRef.current?.pointerId === event.pointerId) reorderRef.current = null;
  };

  const setItemAspect = (id, aspect) => {
    if (!(aspect > 0) || !id) return;
    setItems((prev) =>
      prev.map((entry) =>
        entry.id === id && !(entry.aspectRatio > 0) ? { ...entry, aspectRatio: aspect } : entry
      )
    );
  };

  useEffect(() => {
    setLiveTrim(null);
    setPlaybackTime(0);
    setSeekRequest(null);
  }, [activeId]);

  const requestSeek = useCallback((time) => {
    seekSeqRef.current += 1;
    setSeekRequest({ id: seekSeqRef.current, time: Number(time) || 0 });
  }, []);

  const saveClipTrim = useCallback(
    async (item, { start, end }) => {
      if (!item?.id || item.kind !== 'video') return;
      const sourceDuration =
        Number(item.sourceDurationSeconds) || Number(item.durationSeconds) || 0;
      const trimStart = Math.max(0, Number(start) || 0);
      const trimEnd = Math.min(
        sourceDuration || Number(end) || 0,
        Math.max(trimStart + 0.5, Number(end) || 0)
      );
      const clipSeconds = Math.max(0, trimEnd - trimStart);
      let posterFile = item.posterFile || null;
      let nextPosterUrl = item.posterUrl || '';

      const frameSource = item.file || item.url;
      if (frameSource) {
        try {
          posterFile = await captureVideoPoster(frameSource, trimStart + 0.05);
          if (isBlobUrl(nextPosterUrl)) releaseUrl(nextPosterUrl);
          nextPosterUrl = trackUrl(URL.createObjectURL(posterFile));
        } catch {
          /* keep existing poster */
        }
      }

      setItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                trimStart,
                trimEnd,
                durationSeconds: clipSeconds,
                sourceDurationSeconds: sourceDuration || entry.sourceDurationSeconds,
                durationLabel: formatDurationLabel(clipSeconds),
                posterFile,
                posterUrl: nextPosterUrl,
                remotePosterUrl: ''
              }
            : entry
        )
      );
      setLiveTrim(null);

      if (item.file instanceof Blob) {
        enqueue({
          id: item.id,
          kind: 'video',
          file: item.file,
          posterFile: posterFile || item.posterFile || null
        });
      }
    },
    [enqueue, releaseUrl, trackUrl]
  );

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId)
  );
  const activeItem = items[activeIndex] || items[0] || null;

  /** Shared frame shape when the user asks every slide to match slide one. */
  const frameAspectFor = useCallback(
    (item) => {
      if (!item) return 0;
      if (!matchAll) return item.aspectRatio;
      return items[0]?.aspectRatio || item.aspectRatio;
    },
    [matchAll, items]
  );

  // ---------------------------------------------------------------- validation

  const pendingItems = items.filter((item) => !item.remoteUrl && isBlobUrl(item.url));
  const failedItems = items.filter((item) => uploads[item.id]?.status === 'error');

  const validateStep = (index) => {
    if (type === 'image') {
      if (!items.length) {
        return `Add at least one photo or clip — clips up to ${formatDurationLabel(
          POST_CLIP_MAX_SECONDS
        )}.`;
      }
      if (index >= POST_STEPS.length - 1) {
        if (failedItems.length) {
          return 'Retry or remove the slides that failed to upload.';
        }
        if (pendingItems.length) {
          return 'Media is still uploading — one moment.';
        }
      }
    }

    if (type === 'video') {
      const durableVideo = videoRemoteUrl.trim();
      if (index === 0 && !videoFile && !durableVideo) {
        return 'Upload a video file or paste a public URL to continue.';
      }
      if (index >= VIDEO_STEPS.length - 1) {
        if (uploads[VIDEO_JOB_ID]?.status === 'error') {
          return 'The video upload failed — retry it before publishing.';
        }
        if (!durableVideo) {
          return 'The video is still uploading — one moment.';
        }
        if (!posterUrl.trim() || isBlobUrl(posterUrl)) {
          return 'Choose a thumbnail before publishing.';
        }
      }
    }

    if (type === 'text' && !caption.trim()) return 'Write something first.';
    return '';
  };

  const goNext = () => {
    const message = validateStep(stepIndex);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const goBack = () => {
    setError('');
    setStepIndex((value) => Math.max(value - 1, 0));
  };

  const onLastStep =
    isEdit ||
    type === 'text' ||
    (type === 'image' ? stepIndex >= POST_STEPS.length - 1 : stepIndex >= VIDEO_STEPS.length - 1);

  const publish = async () => {
    const lastIndex =
      type === 'image'
        ? POST_STEPS.length - 1
        : type === 'video'
          ? VIDEO_STEPS.length - 1
          : 0;
    const message = validateStep(lastIndex);
    if (message) {
      setError(message);
      return;
    }

    setBusy(true);
    setError('');
    try {
      let payload = {
        type,
        title: title.trim() || (type === 'video' ? 'Untitled video' : ''),
        caption: caption.trim(),
        published: true
      };

      if (type === 'image') {
        const resolved = items
          .map((item) => ({ item, url: item.remoteUrl || (isBlobUrl(item.url) ? '' : item.url) }))
          .filter((entry) => entry.url);
        if (!resolved.length) {
          setError('Add at least one photo or clip.');
          return;
        }
        payload = {
          ...payload,
          mediaUrl: resolved[0].url,
          mediaUrls: resolved.map((entry) => entry.url),
          mediaItems: resolved.map(({ item, url }) => ({
            kind: item.kind,
            url,
            posterUrl: item.remotePosterUrl || (isBlobUrl(item.posterUrl) ? '' : item.posterUrl),
            durationSeconds: item.durationSeconds || 0,
            sourceDurationSeconds:
              item.sourceDurationSeconds || item.durationSeconds || 0,
            durationLabel: item.durationLabel || '',
            trimStart: Number(item.trimStart) || 0,
            trimEnd: Number(item.trimEnd) || 0,
            aspectRatio: Number(frameAspectFor(item)) || 0,
            alt: (item.alt || '').trim()
          }))
        };
      } else if (type === 'video') {
        let aspect = videoAspect;
        if (!(aspect > 0) && videoRemoteUrl) {
          try {
            aspect = (await readVideoFrame(videoRemoteUrl)).aspect;
          } catch {
            aspect = 0;
          }
        }
        payload = {
          ...payload,
          mediaUrl: videoRemoteUrl.trim(),
          posterUrl: posterUrl.trim(),
          duration: duration.trim() || formatDurationLabel(durationSeconds),
          durationSeconds,
          aspectRatio: aspect || 0
        };
      }

      publishedRef.current = true;
      clearDraft();
      if (isEdit) onUpdateSocialPost?.(post.id, payload);
      else onAddSocialPost?.(payload);
      onClose?.();
    } catch (err) {
      publishedRef.current = false;
      setError(err?.message || 'Could not publish.');
    } finally {
      setBusy(false);
    }
  };

  // Kept in a ref so the shortcut always runs against the current draft.
  const submitRef = useRef(() => {});
  submitRef.current = () => {
    if (cropOpen || busy) return;
    if (onLastStep) publish();
    else goNext();
  };

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') return;
      event.preventDefault();
      submitRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sheetTitle = isEdit ? title.trim() || meta.eyebrowEdit : meta.titleCreate;
  const publishDisabled = busy || summary.busy || Boolean(pendingItems.length && onLastStep);

  // ---------------------------------------------------------------- slide strip

  const renderSlide = (item, index) => {
    const state = uploads[item.id] || {};
    const uploading = state.status === 'preparing' || state.status === 'uploading';
    const failed = state.status === 'error';
    const done = state.status === 'done' || Boolean(item.remoteUrl);

    return (
      <div
        key={item.id}
        data-slide-index={index}
        className={`bb-composer-strip-item${activeItem?.id === item.id ? ' is-active' : ''}${
          failed ? ' is-failed' : ''
        }`}
        role="listitem"
        onClick={() => setActiveId(item.id)}
      >
        <span
          className="bb-composer-strip-grip"
          aria-hidden="true"
          onPointerDown={(event) => onGripPointerDown(event, index)}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerUp}
        >
          <GripVertical size={12} />
        </span>

        {item.kind === 'video' ? (
          <>
            {item.posterUrl ? (
              <img src={item.posterUrl} alt="" />
            ) : (
              <video src={item.url} muted playsInline />
            )}
            <span className="bb-composer-strip-video" aria-hidden="true">
              <Play size={10} fill="currentColor" />
            </span>
          </>
        ) : (
          <img src={item.url} alt="" />
        )}

        {uploading ? (
          <span className="bb-composer-strip-status" aria-label="Uploading">
            <ProgressRing value={state.progress || 0} size={28} />
          </span>
        ) : null}

        {done && !uploading ? (
          <span className="bb-composer-strip-check" aria-label="Ready">
            <Check size={11} strokeWidth={3} />
          </span>
        ) : null}

        <div className="bb-composer-strip-actions">
          {failed ? (
            <button
              type="button"
              className="bb-composer-strip-btn"
              aria-label="Retry upload"
              onClick={(event) => {
                event.stopPropagation();
                retry(item.id);
              }}
            >
              <RotateCcw size={12} />
            </button>
          ) : null}
          {uploading ? (
            <button
              type="button"
              className="bb-composer-strip-btn"
              aria-label="Cancel upload"
              onClick={(event) => {
                event.stopPropagation();
                cancel(item.id);
              }}
            >
              <X size={12} />
            </button>
          ) : null}
          {item.kind === 'image' && !uploading ? (
            <button
              type="button"
              className="bb-composer-strip-btn"
              aria-label="Crop"
              onClick={(event) => {
                event.stopPropagation();
                cropItem(item);
              }}
            >
              <Crop size={12} />
            </button>
          ) : null}
          <button
            type="button"
            className="bb-composer-strip-btn"
            aria-label="Remove"
            onClick={(event) => {
              event.stopPropagation();
              removeItem(item.id);
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  const footerPrimary = () => {
    if (onLastStep) {
      return (
        <button
          type="button"
          className="bb-primary-btn"
          onClick={publish}
          disabled={publishDisabled}
        >
          {busy ? 'Publishing…' : isEdit ? 'Save changes' : 'Publish'}
        </button>
      );
    }
    return (
      <button type="button" className="bb-primary-btn" onClick={goNext} disabled={busy}>
        Next
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
    );
  };

  return (
    <div
      className={`bb-social-studio-sheet bb-social-studio-sheet--composer bb-composer-sheet bb-composer-sheet--${type}`}
      role="dialog"
      aria-modal="true"
      aria-label={sheetTitle}
    >
      <div className="bb-social-studio-sheet-backdrop" onClick={requestClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bb-social-studio-sheet-panel bb-social-studio-sheet-panel--composer bb-composer-panel${
          dragActive ? ' is-drag-active' : ''
        }${uploadScreenOpen ? ' is-uploading' : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <UploadOverlay
          open={uploadScreenOpen}
          phase={uploadPhase}
          progress={summary.progress}
          activeCount={summary.activeCount}
          total={summary.total}
          rows={uploadRows}
        />
        <header className="bb-social-studio-sheet-head bb-composer-head">
          <div className="bb-blog-composer-head-copy">
            <p className="bb-social-studio-sheet-eyebrow">
              {isEdit ? meta.eyebrowEdit : meta.eyebrowCreate}
            </p>
            <h3 className="bb-social-studio-sheet-title">{sheetTitle}</h3>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-social-studio-sheet-close"
            aria-label="Close composer"
            onClick={requestClose}
          >
            <X size={16} />
          </button>
        </header>

        {steps.length && !isEdit ? <StepRail steps={steps} index={stepIndex} /> : null}

        <div className="bb-social-studio-sheet-body bb-composer-body">
          {type === 'image' && isEdit ? (
            <div className="bb-composer-edit bb-composer-edit--post">
              <div className="bb-composer-edit-media">
                <div
                  className="bb-composer-carousel-preview"
                  style={aspectStyle(frameAspectFor(activeItem))}
                >
                  {activeItem ? (
                    <MediaPreview
                      item={activeItem}
                      onAspect={(aspect) => setItemAspect(activeItem.id, aspect)}
                    />
                  ) : (
                    <span className="bb-composer-arrange-empty">No media</span>
                  )}
                </div>
                <div className="bb-composer-strip" role="list">
                  {items.map(renderSlide)}
                  {items.length < MAX_MEDIA ? (
                    <button
                      type="button"
                      className="bb-composer-strip-add"
                      onClick={() => mediaRef.current?.click()}
                      aria-label="Add media"
                    >
                      <Plus size={18} />
                    </button>
                  ) : null}
                </div>
                <input
                  ref={mediaRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={onPostMediaPick}
                />
              </div>
              <div className="bb-composer-edit-copy">
                <label className="bb-social-field">
                  <span>Title (optional)</span>
                  <input
                    className="native-control-input bb-social-compose-control"
                    value={title}
                    placeholder="Give this post a title"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="bb-social-field bb-social-field--grow">
                  <span className="bb-composer-x-label-row">
                    <span>Caption</span>
                    <CharacterCount value={caption.length} limit={CAPTION_SOFT_LIMIT} />
                  </span>
                  <textarea
                    data-autofocus="true"
                    className="native-control-input bb-social-compose-control bb-social-compose-caption"
                    rows={5}
                    value={caption}
                    placeholder="Write a caption…"
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {type === 'image' && !isEdit ? (
            <div className="bb-composer-image">
              {stepIndex === 0 ? (
                <div className="bb-composer-dropzone bb-composer-dropzone--hero">
                  <span className="bb-composer-dropzone-icons" aria-hidden="true">
                    <ImagePlus size={26} strokeWidth={2} />
                    <Film size={22} strokeWidth={2} />
                  </span>
                  <strong>Select photos &amp; clips</strong>
                  <span>
                    Drag them in, paste from the clipboard, or browse · up to {MAX_MEDIA} slides ·
                    clips to {formatDurationLabel(POST_CLIP_MAX_SECONDS)}
                  </span>
                  <button
                    type="button"
                    className="bb-primary-btn bb-composer-dropzone-upload"
                    onClick={() => mediaRef.current?.click()}
                    disabled={busy}
                  >
                    <UploadCloud size={16} strokeWidth={2.2} />
                    Upload
                  </button>
                </div>
              ) : null}

              {stepIndex === 1 ? (
                <div className="bb-composer-arrange">
                  <div className="bb-composer-arrange-workspace">
                    <div
                      className="bb-composer-arrange-stage"
                      style={aspectStyle(frameAspectFor(activeItem))}
                    >
                      <MediaPreview
                        item={activeItem}
                        trimStart={liveTrim?.start}
                        trimEnd={liveTrim?.end}
                        seekRequest={seekRequest}
                        onTime={setPlaybackTime}
                        onSeekHandled={(id) =>
                          setSeekRequest((prev) => (prev?.id === id ? null : prev))
                        }
                        onAspect={(aspect) => setItemAspect(activeItem?.id, aspect)}
                      />
                      {activeItem?.kind === 'video' && activeItem.durationLabel ? (
                        <span className="bb-composer-media-badge">
                          {liveTrim
                            ? formatDurationLabel(
                                Math.max(0, (liveTrim.end || 0) - (liveTrim.start || 0))
                              )
                            : activeItem.durationLabel}
                        </span>
                      ) : null}
                    </div>

                    {activeItem?.kind === 'video' ? (
                      <VideoClipTrimmer
                        source={activeItem.file || activeItem.url}
                        durationSeconds={
                          activeItem.sourceDurationSeconds ||
                          activeItem.durationSeconds ||
                          0
                        }
                        trimStart={activeItem.trimStart || 0}
                        trimEnd={
                          activeItem.trimEnd ||
                          activeItem.sourceDurationSeconds ||
                          activeItem.durationSeconds ||
                          0
                        }
                        maxClipSeconds={POST_CLIP_MAX_SECONDS}
                        busy={busy}
                        currentTime={playbackTime}
                        onPreview={setLiveTrim}
                        onSeek={requestSeek}
                        onSave={(range) => saveClipTrim(activeItem, range)}
                      />
                    ) : (
                      <p className="bb-composer-arrange-note">
                        Drag the strip to reorder · crop photos from the thumbnail
                      </p>
                    )}
                  </div>

                  <div className="bb-composer-arrange-rail">
                    <div className="bb-composer-strip-head">
                      <span className="bb-composer-slide-count">
                        {items.length} / {MAX_MEDIA} slides
                      </span>
                      {items.length > 1 ? (
                        <button
                          type="button"
                          className={`bb-composer-toggle${matchAll ? ' is-on' : ''}`}
                          aria-pressed={matchAll}
                          onClick={() => setMatchAll((value) => !value)}
                        >
                          <Layers size={13} strokeWidth={2.3} />
                          Match all to first
                        </button>
                      ) : null}
                    </div>

                    <div className="bb-composer-strip" role="list">
                      {items.map(renderSlide)}
                      {items.length < MAX_MEDIA ? (
                        <button
                          type="button"
                          className="bb-composer-strip-add"
                          onClick={() => mediaRef.current?.click()}
                          aria-label="Add media"
                        >
                          <Plus size={18} />
                        </button>
                      ) : null}
                    </div>

                    <p className="bb-composer-hint">
                      {activeItem?.kind === 'video'
                        ? 'Drag the yellow handles to trim · Save when the range changes'
                        : matchAll
                          ? 'Every slide is framed like the first · drag the handle to reorder'
                          : 'Each slide keeps its own shape · drag the handle to reorder · crop to adjust'}
                    </p>
                  </div>
                </div>
              ) : null}

              {stepIndex === 2 ? (
                <div className="bb-composer-caption-step">
                  <div className="bb-composer-caption-media">
                    <div
                      className="bb-composer-carousel-preview"
                      style={aspectStyle(frameAspectFor(activeItem))}
                    >
                      {activeItem ? (
                        <>
                          <MediaPreview
                            item={activeItem}
                            onAspect={(aspect) => setItemAspect(activeItem.id, aspect)}
                          />
                          {activeItem.kind === 'video' && activeItem.durationLabel ? (
                            <span className="bb-composer-media-badge">
                              {activeItem.durationLabel}
                            </span>
                          ) : null}
                          {items.length > 1 ? (
                            <div className="bb-composer-carousel-controls">
                              <button
                                type="button"
                                disabled={activeIndex <= 0}
                                onClick={() => setActiveId(items[activeIndex - 1]?.id || '')}
                                aria-label="Previous slide"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span>
                                {activeIndex + 1} / {items.length}
                              </span>
                              <button
                                type="button"
                                disabled={activeIndex >= items.length - 1}
                                onClick={() => setActiveId(items[activeIndex + 1]?.id || '')}
                                aria-label="Next slide"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="bb-composer-arrange-empty">No media</span>
                      )}
                    </div>
                  </div>

                  <div className="bb-composer-caption-copy">
                    <p className="bb-composer-caption-kicker">Almost done</p>
                    <label className="bb-social-field">
                      <span>Title (optional)</span>
                      <input
                        className="native-control-input bb-social-compose-control"
                        value={title}
                        placeholder="Give this post a title"
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </label>
                    <label className="bb-social-field bb-social-field--grow">
                      <span className="bb-composer-x-label-row">
                        <span>Caption</span>
                        <CharacterCount value={caption.length} limit={CAPTION_SOFT_LIMIT} />
                      </span>
                      <textarea
                        className="native-control-input bb-social-compose-control bb-social-compose-caption"
                        rows={6}
                        value={caption}
                        placeholder="Write a caption…"
                        onChange={(event) => setCaption(event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <input
                ref={mediaRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={onPostMediaPick}
              />
            </div>
          ) : null}

          {type === 'video' && isEdit ? (
            <div className="bb-composer-edit bb-composer-edit--video">
              <div className="bb-composer-edit-media">
                {mediaUrl ? (
                  <div
                    className="bb-composer-video-stage"
                    style={aspectStyle(videoAspect, 16 / 9)}
                  >
                    <video
                      className="bb-social-compose-player"
                      controls
                      playsInline
                      poster={posterUrl || undefined}
                      src={mediaUrl}
                      onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        if (
                          !(videoAspect > 0) &&
                          video.videoWidth > 0 &&
                          video.videoHeight > 0
                        ) {
                          setVideoAspect(video.videoWidth / video.videoHeight);
                        }
                      }}
                    />
                    {duration ? (
                      <span className="bb-composer-media-badge">{duration}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="bb-composer-edit-media-actions">
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={() => videoRef.current?.click()}
                    disabled={busy}
                  >
                    <UploadCloud size={15} strokeWidth={2.2} />
                    Replace video
                  </button>
                  <span className="bb-composer-readout">
                    Length{' '}
                    <strong>{duration || formatDurationLabel(durationSeconds) || '—'}</strong>
                  </span>
                </div>
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={onVideoSectionFile}
                />
              </div>

              <div className="bb-composer-edit-copy">
                <label className="bb-social-field">
                  <span>Title</span>
                  <input
                    data-autofocus="true"
                    className="native-control-input bb-social-compose-control"
                    value={title}
                    placeholder="Video title"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="bb-social-field bb-social-field--grow">
                  <span>Description</span>
                  <textarea
                    className="native-control-input bb-social-compose-control bb-social-compose-caption"
                    rows={4}
                    value={caption}
                    placeholder="What is this video about?"
                    onChange={(event) => setCaption(event.target.value)}
                  />
                </label>
              </div>

              <div className="bb-composer-edit-thumb">
                <p className="bb-composer-hint bb-composer-hint--lead">
                  Thumbnail cover — pick a frame or upload your own.
                </p>
                <VideoThumbnailPicker
                  videoFile={videoFile}
                  videoUrl={mediaUrl}
                  durationSeconds={durationSeconds}
                  aspectRatio={videoAspect}
                  posterUrl={posterUrl}
                  busy={busy}
                  onFrameChosen={(file) =>
                    enqueue({
                      id: POSTER_JOB_ID,
                      kind: 'image',
                      file,
                      preset: 'videoPoster',
                      skipNormalize: true
                    })
                  }
                  onUploadOwn={() => posterRef.current?.click()}
                />
                <input
                  ref={posterRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPosterPick}
                />
              </div>
            </div>
          ) : null}

          {type === 'video' && !isEdit ? (
            <div className="bb-composer-video">
              {stepIndex === 0 ? (
                <div className="bb-composer-fields bb-composer-video-source">
                  {mediaUrl ? (
                    <div
                      className="bb-composer-video-stage"
                      style={aspectStyle(videoAspect, 16 / 9)}
                    >
                      <video
                        className="bb-social-compose-player"
                        controls
                        playsInline
                        poster={posterUrl || undefined}
                        src={mediaUrl}
                        onLoadedMetadata={(event) => {
                          const video = event.currentTarget;
                          if (
                            !(videoAspect > 0) &&
                            video.videoWidth > 0 &&
                            video.videoHeight > 0
                          ) {
                            setVideoAspect(video.videoWidth / video.videoHeight);
                          }
                        }}
                      />
                      {duration ? (
                        <span className="bb-composer-media-badge">{duration}</span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="bb-composer-dropzone bb-composer-dropzone--hero">
                      <Film size={28} strokeWidth={2} />
                      <strong>Upload video</strong>
                      <span>Drag it in or browse · any length · thumbnail comes last</span>
                      <button
                        type="button"
                        className="bb-primary-btn bb-composer-dropzone-upload"
                        onClick={() => videoRef.current?.click()}
                        disabled={busy}
                      >
                        <UploadCloud size={16} strokeWidth={2.2} />
                        Upload
                      </button>
                    </div>
                  )}

                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={onVideoSectionFile}
                  />

                  <div className="bb-composer-or">or paste a public URL</div>
                  <label className="bb-social-field">
                    <span>Video URL</span>
                    <input
                      className="native-control-input bb-social-compose-control"
                      value={videoFile ? '' : videoRemoteUrl}
                      placeholder="https://…/video.mp4"
                      disabled={Boolean(videoFile)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVideoFile(null);
                        setVideoRemoteUrl(value);
                        setMediaUrl(value);
                      }}
                    />
                  </label>

                  {mediaUrl ? (
                    <button
                      type="button"
                      className="bb-ghost-btn"
                      onClick={() => videoRef.current?.click()}
                      disabled={busy}
                    >
                      Replace video file
                    </button>
                  ) : null}
                </div>
              ) : null}

              {stepIndex === 1 ? (
                <div className="bb-composer-fields">
                  <div
                    className="bb-composer-video-review bb-composer-video-review--soft"
                    style={aspectStyle(videoAspect, 16 / 9)}
                  >
                    {mediaUrl ? (
                      <video src={mediaUrl} poster={posterUrl || undefined} muted playsInline />
                    ) : null}
                    {duration ? (
                      <span className="bb-composer-video-duration">{duration}</span>
                    ) : null}
                  </div>

                  <label className="bb-social-field">
                    <span>Title</span>
                    <input
                      className="native-control-input bb-social-compose-control"
                      value={title}
                      placeholder="Video title"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>

                  <div className="bb-composer-readout">
                    <span>Length</span>
                    <strong>{duration || formatDurationLabel(durationSeconds) || '—'}</strong>
                  </div>

                  <label className="bb-social-field bb-social-field--grow">
                    <span>Description</span>
                    <textarea
                      className="native-control-input bb-social-compose-control bb-social-compose-caption"
                      rows={5}
                      value={caption}
                      placeholder="What is this video about?"
                      onChange={(event) => setCaption(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {stepIndex === 2 ? (
                <div className="bb-composer-fields bb-composer-video-thumb">
                  <p className="bb-composer-hint bb-composer-hint--lead">
                    Pick the cover viewers see before play — the last step, just like YouTube.
                  </p>
                  <VideoThumbnailPicker
                    videoFile={videoFile}
                    videoUrl={mediaUrl}
                    durationSeconds={durationSeconds}
                    aspectRatio={videoAspect}
                    posterUrl={posterUrl}
                    busy={busy}
                    onFrameChosen={(file) =>
                      enqueue({
                        id: POSTER_JOB_ID,
                        kind: 'image',
                        file,
                        preset: 'videoPoster',
                        skipNormalize: true
                      })
                    }
                    onUploadOwn={() => posterRef.current?.click()}
                  />
                  <input
                    ref={posterRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPosterPick}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {type === 'text' ? (
            <div className="bb-composer-text">
              <div className="bb-composer-x">
                <div className="bb-composer-x-avatar" aria-hidden="true">
                  {(businessName || 'B').trim().charAt(0).toUpperCase()}
                </div>
                <div className="bb-composer-x-main">
                  <label className="bb-social-field">
                    <span>Title (optional)</span>
                    <input
                      className="native-control-input bb-social-compose-control"
                      value={title}
                      placeholder="Add a title"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="bb-social-field bb-social-field--grow">
                    <span className="bb-composer-x-label-row">
                      <span>What&apos;s happening?</span>
                      <CharacterCount value={caption.length} limit={TEXT_SOFT_LIMIT} />
                    </span>
                    <textarea
                      data-autofocus="true"
                      className="native-control-input bb-social-compose-control bb-composer-x-input"
                      rows={6}
                      value={caption}
                      placeholder="Share an update…"
                      onChange={(event) => setCaption(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="bb-composer-bubble-preview" aria-label="Preview">
                <p className="bb-composer-bubble-preview-label">Live preview</p>
                <article className="bb-social-note bb-social-note--preview">
                  <div className="bb-social-note-card bb-social-note-bubble">
                    <header className="bb-social-note-meta">
                      <span className="bb-social-note-stamp">Just now</span>
                    </header>
                    {title.trim() ? (
                      <h2 className="bb-social-note-title">{title.trim()}</h2>
                    ) : null}
                    <p className="bb-social-note-text">
                      {caption.trim() || 'Your update will show here…'}
                    </p>
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          <ErrorBanner
            message={error}
            skips={skips}
            onDismiss={() => {
              setError('');
              setSkips([]);
            }}
          />
        </div>

        <footer className="bb-social-studio-sheet-footer bb-blog-composer-footer">
          {summary.busy && !uploadScreenOpen ? (
            <div className="bb-composer-upload-bar" aria-live="polite">
              <div className="bb-composer-upload-track">
                <span style={{ width: `${Math.round(summary.progress * 100)}%` }} />
              </div>
              <span className="bb-composer-upload-copy">
                Uploading {summary.activeCount} of {summary.total} ·{' '}
                {Math.round(summary.progress * 100)}%
              </span>
            </div>
          ) : null}

          <div className="bb-composer-footer-row">
            <div className="bb-blog-composer-footer-left">
              {isEdit && onRemoveSocialPost ? (
                <button
                  type="button"
                  className="bb-ghost-btn bb-blog-composer-delete"
                  onClick={() => {
                    onRemoveSocialPost(post.id);
                    onClose?.();
                  }}
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
            </div>
            <div className="bb-social-studio-sheet-footer-actions">
              {type !== 'text' && !isEdit && stepIndex > 0 ? (
                <button type="button" className="bb-ghost-btn" onClick={goBack} disabled={busy}>
                  <ChevronLeft size={16} strokeWidth={2.2} />
                  Back
                </button>
              ) : (
                <button type="button" className="bb-ghost-btn" onClick={requestClose}>
                  Cancel
                </button>
              )}
              {footerPrimary()}
            </div>
          </div>
        </footer>

        {dragActive ? (
          <div className="bb-composer-drop-overlay" aria-hidden="true">
            <UploadCloud size={30} strokeWidth={2} />
            <strong>Drop to add</strong>
            <span>
              {type === 'video'
                ? 'One video file'
                : `Photos and clips to ${formatDurationLabel(POST_CLIP_MAX_SECONDS)}`}
            </span>
          </div>
        ) : null}

        {confirmDiscard ? (
          <div className="bb-composer-confirm" role="alertdialog" aria-label="Discard draft">
            <div className="bb-composer-confirm-card">
              <h4>Discard this draft?</h4>
              <p>Your media and text will be lost. Uploads in progress will stop.</p>
              <div className="bb-composer-confirm-actions">
                <button
                  type="button"
                  className="bb-ghost-btn"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="bb-primary-btn bb-composer-confirm-discard"
                  onClick={discardAndClose}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset={cropPreset}
        fileNameHint={fileNameHint}
        onCancel={() => {
          if (busy) return;
          closeCrop();
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
