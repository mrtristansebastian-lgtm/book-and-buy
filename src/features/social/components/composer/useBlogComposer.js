import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUploadQueue, summarizeUploads } from '../../hooks/useUploadQueue';
import { intakeLongVideo, intakePostMedia } from '../../utils/mediaIntake';
import {
  formatDurationLabel,
  getPostMediaItems,
  POST_CLIP_MAX_SECONDS,
  VERTICAL_MAX_SECONDS,
  tabToPostType
} from '../../utils/socialPostType';
import { captureVideoPoster, readVideoFrame } from '../../utils/videoMedia';
import {
  VIDEO_JOB_ID,
  POSTER_JOB_ID,
  FOCUSABLE,
  META,
  POST_STEPS,
  VIDEO_STEPS,
  isBlobUrl,
  draftKey,
  newMediaItem,
  hasFiles
} from './composerMeta';

function localDateTimeValue(value) {
  const date = new Date(Number(value || 0));
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function useBlogComposer({
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
    ? post.type === 'video' ||
      post.type === 'vertical' ||
      post.type === 'text' ||
      post.type === 'image'
      ? post.type
      : tabToPostType(kind)
    : tabToPostType(kind);
  const isLongVideo = type === 'video' || type === 'vertical';
  const isVertical = type === 'vertical';
  const videoFallbackAspect = isVertical ? 9 / 16 : 16 / 9;
  const videoMaxClipSeconds = isVertical ? VERTICAL_MAX_SECONDS : 0;
  const videoNoun = isVertical ? 'Vertical' : 'Film';
  const meta = META[kind] || META.posts;

  const mediaRef = useRef(null);
  const videoRef = useRef(null);
  const posterRef = useRef(null);
  const coverPosterRef = useRef(null);
  const panelRef = useRef(null);
  const reorderRef = useRef(null);
  const dragDepthRef = useRef(0);
  const publishedRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [publishMode, setPublishMode] = useState('published');
  const [scheduledAtLocal, setScheduledAtLocal] = useState('');
  const [exploreMainCategoryId, setExploreMainCategoryId] = useState('');
  const [exploreSubcategoryId, setExploreSubcategoryId] = useState('');
  const [location, setLocation] = useState(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
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
  const [videoSourceDuration, setVideoSourceDuration] = useState(0);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState(0);
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

  const steps = type === 'image' ? POST_STEPS : isLongVideo ? VIDEO_STEPS : [];

  const onUploaded = useCallback((id, result) => {
    if (id === VIDEO_JOB_ID) {
      setVideoRemoteUrl(result.url || '');
      return;
    }
    if (id === POSTER_JOB_ID) {
      setPosterUrl(result.url || '');
      return;
    }
    if (String(id).endsWith('__poster')) {
      const itemId = String(id).slice(0, -'__poster'.length);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                remotePosterUrl: result.url || item.remotePosterUrl,
                posterUrl: result.url || item.posterUrl
              }
            : item
        )
      );
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
    if (isLongVideo) return [VIDEO_JOB_ID, POSTER_JOB_ID];
    return [];
  }, [type, items, isLongVideo]);

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
    if (isLongVideo) {
      const rows = [];
      const videoState = uploads[VIDEO_JOB_ID];
      const posterState = uploads[POSTER_JOB_ID];
      if (videoState && videoState.status !== 'canceled') {
        rows.push({
          id: VIDEO_JOB_ID,
          kind: 'video',
          label: videoFile?.name || videoNoun,
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
  }, [type, items, uploads, videoFile, posterUrl, isLongVideo, videoNoun]);

  const uploadScreenOpen = busy || summary.busy || uploadFlash;

  // ---------------------------------------------------------------- load / draft

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setCaption(post.caption || '');
      setPublishMode(post.status === 'scheduled' ? 'scheduled' : post.status === 'draft' || post.published === false ? 'draft' : 'published');
      setScheduledAtLocal(post.scheduledAtMs ? localDateTimeValue(post.scheduledAtMs) : '');
      setExploreMainCategoryId(post.exploreMainCategoryId || '');
      setExploreSubcategoryId(post.exploreSubcategoryId || '');
      setLocation(
        post.location
          ? {
              label: String(post.location || ''),
              placeId: String(post.locationPlaceId || ''),
              lat: Number(post.locationLat) || 0,
              lng: Number(post.locationLng) || 0
            }
          : null
      );
      setMediaUrl(post.mediaUrl || '');
      setVideoRemoteUrl(isBlobUrl(post.mediaUrl) ? '' : post.mediaUrl || '');
      setVideoFile(null);
      setPosterUrl(post.posterUrl || '');
      setDuration(post.duration || '');
      setDurationSeconds(Number(post.durationSeconds) || 0);
      setVideoAspect(Number(post.aspectRatio) || 0);
      {
        const sourceDuration =
          Number(post.sourceDurationSeconds) ||
          Number(post.durationSeconds) ||
          0;
        const trimStart = Number(post.trimStart) || 0;
        const trimEnd =
          Number(post.trimEnd) > 0 ? Number(post.trimEnd) : sourceDuration;
        setVideoSourceDuration(sourceDuration);
        setVideoTrimStart(trimStart);
        setVideoTrimEnd(trimEnd);
      }

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
    setPublishMode(draft?.publishMode || 'published');
    setScheduledAtLocal(draft?.scheduledAtLocal || '');
    setExploreMainCategoryId(draft?.exploreMainCategoryId || '');
    setExploreSubcategoryId(draft?.exploreSubcategoryId || '');
    setLocation(null);
    setItems([]);
    setActiveId('');
    setMediaUrl('');
    setVideoRemoteUrl('');
    setVideoFile(null);
    setPosterUrl('');
    setDuration('');
    setDurationSeconds(0);
    setVideoSourceDuration(0);
    setVideoTrimStart(0);
    setVideoTrimEnd(0);
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
        sessionStorage.setItem(
          key,
          JSON.stringify({ title, caption, exploreMainCategoryId, exploreSubcategoryId, publishMode, scheduledAtLocal })
        );
      } catch {
        /* private mode / quota */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title, caption, exploreMainCategoryId, exploreSubcategoryId, publishMode, scheduledAtLocal, isEdit, kind]);

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
        const check = await intakeLongVideo(file, {
          orientation: isVertical ? 'portrait' : 'landscape',
          maxSeconds: videoMaxClipSeconds
        });
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
        setVideoSourceDuration(seconds);
        setVideoTrimStart(0);
        setVideoTrimEnd(seconds);
        setDuration(formatDurationLabel(seconds));
        setVideoAspect(frame.aspect || 0);
        setLiveTrim(null);
        setPlaybackTime(0);

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
    [enqueue, mediaUrl, releaseUrl, trackUrl, isVertical, videoMaxClipSeconds]
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
  const acceptsDrop = type === 'image' || isLongVideo;

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
    else if (isLongVideo) addLongVideo(files.find((file) => file.type.startsWith('video/')) || files[0]);
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
      applyVideoPoster(file);
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

  const setCoverSlide = (index) => {
    if (!(index > 0)) return;
    const id = items[index]?.id || '';
    moveItem(index, 0);
    if (id) setActiveId(id);
  };

  const applyVideoPoster = useCallback(
    (file) => {
      if (!(file instanceof Blob)) return;
      if (isBlobUrl(posterUrl)) releaseUrl(posterUrl);
      setPosterUrl(trackUrl(URL.createObjectURL(file)));
      enqueue({
        id: POSTER_JOB_ID,
        kind: 'image',
        file,
        preset: 'videoPoster',
        skipNormalize: true
      });
      setCoverPickerOpen(false);
    },
    [enqueue, posterUrl, releaseUrl, trackUrl]
  );

  const applyCoverPoster = useCallback(
    (itemId, file) => {
      if (!itemId || !(file instanceof Blob)) return;
      const target = items.find((item) => item.id === itemId);
      if (!target || target.kind !== 'video') return;

      const preview = trackUrl(URL.createObjectURL(file));
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          if (isBlobUrl(item.posterUrl)) releaseUrl(item.posterUrl);
          return {
            ...item,
            posterUrl: preview,
            posterFile: file,
            remotePosterUrl: ''
          };
        })
      );

      if (target.file instanceof Blob) {
        enqueue({
          id: itemId,
          kind: 'video',
          file: target.file,
          posterFile: file,
          preset: 'socialPost'
        });
      } else {
        enqueue({
          id: `${itemId}__poster`,
          kind: 'image',
          file,
          preset: 'videoPoster',
          skipNormalize: true
        });
      }
      setCoverPickerOpen(false);
    },
    [items, enqueue, trackUrl, releaseUrl]
  );

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

  // Older video posts may lack sourceDurationSeconds — probe once so trim works.
  useEffect(() => {
    if (!isLongVideo || !mediaUrl || videoSourceDuration > 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const frame = await readVideoFrame(mediaUrl);
        if (cancelled || !(frame?.duration > 0)) return;
        setVideoSourceDuration(frame.duration);
        setVideoTrimStart((prev) => prev || 0);
        setVideoTrimEnd((prev) => (prev > 0 ? prev : frame.duration));
        if (!(videoAspect > 0) && frame.aspect > 0) setVideoAspect(frame.aspect);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, mediaUrl, videoSourceDuration, videoAspect]);

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

  const saveLongVideoTrim = useCallback(
    async ({ start, end }) => {
      const sourceDuration = videoSourceDuration || durationSeconds || 0;
      const trimStart = Math.max(0, Number(start) || 0);
      const trimEnd = Math.min(
        sourceDuration || Number(end) || 0,
        Math.max(trimStart + 0.5, Number(end) || 0)
      );
      const clipSeconds = Math.max(0, trimEnd - trimStart);
      let nextPoster = posterUrl;
      let posterFile = null;

      const frameSource = videoFile || mediaUrl;
      if (frameSource) {
        try {
          posterFile = await captureVideoPoster(frameSource, trimStart + 0.05);
          if (isBlobUrl(nextPoster)) releaseUrl(nextPoster);
          nextPoster = trackUrl(URL.createObjectURL(posterFile));
        } catch {
          /* keep existing poster */
        }
      }

      setVideoTrimStart(trimStart);
      setVideoTrimEnd(trimEnd);
      setDurationSeconds(clipSeconds);
      setDuration(formatDurationLabel(clipSeconds));
      setPosterUrl(nextPoster);
      setLiveTrim(null);

      if (posterFile) {
        enqueue({
          id: POSTER_JOB_ID,
          kind: 'image',
          file: posterFile,
          preset: 'videoPoster',
          skipNormalize: true
        });
      }
    },
    [
      videoSourceDuration,
      durationSeconds,
      posterUrl,
      videoFile,
      mediaUrl,
      enqueue,
      releaseUrl,
      trackUrl
    ]
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

    if (isLongVideo) {
      if (index === 0 && !videoFile && !videoRemoteUrl.trim()) {
        return `Upload a ${videoNoun} to continue.`;
      }
      if (index >= VIDEO_STEPS.length - 1) {
        if (uploads[VIDEO_JOB_ID]?.status === 'error') {
          return 'The video upload failed — retry it before publishing.';
        }
        if (!videoRemoteUrl.trim()) {
          return 'The video is still uploading — one moment.';
        }
        if (!posterUrl.trim() || isBlobUrl(posterUrl)) {
          return 'Tap Set cover to choose a thumbnail before publishing.';
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
        : isLongVideo
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
        title: type === 'image' ? '' : title.trim() || (isLongVideo ? `Untitled ${videoNoun}` : ''),
        caption: caption.trim(),
        exploreMainCategoryId,
        exploreSubcategoryId,
        status: 'published',
        published: true,
        scheduledAtMs: 0,
        archivedAtMs: 0,
        location: location?.label || '',
        locationPlaceId: location?.placeId || '',
        locationLat: Number(location?.lat) || 0,
        locationLng: Number(location?.lng) || 0
      };

      if (type === 'image') {
        const resolved = items
          .map((item) => ({ item, url: item.remoteUrl || (isBlobUrl(item.url) ? '' : item.url) }))
          .filter((entry) => entry.url);
        if (!resolved.length) {
          setError('Add at least one photo or clip.');
          return;
        }
        const first = resolved[0];
        const coverPoster =
          first.item.kind === 'video'
            ? first.item.remotePosterUrl ||
              (isBlobUrl(first.item.posterUrl) ? '' : first.item.posterUrl)
            : '';
        payload = {
          ...payload,
          mediaUrl: first.url,
          posterUrl: coverPoster,
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
      } else if (isLongVideo) {
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
          sourceDurationSeconds: videoSourceDuration || durationSeconds,
          trimStart: videoTrimStart || 0,
          trimEnd: videoTrimEnd || videoSourceDuration || durationSeconds,
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

  return {
    kind,
    post,
    businessName,
    onClose,
    onAddSocialPost,
    onUpdateSocialPost,
    onRemoveSocialPost,
    isEdit,
    type,
    isLongVideo,
    isVertical,
    videoFallbackAspect,
    videoMaxClipSeconds,
    videoNoun,
    meta,
    mediaRef,
    videoRef,
    posterRef,
    coverPosterRef,
    panelRef,
    stepIndex,
    setStepIndex,
    title,
    setTitle,
    caption,
    setCaption,
    publishMode,
    setPublishMode,
    scheduledAtLocal,
    setScheduledAtLocal,
    exploreMainCategoryId,
    setExploreMainCategoryId,
    exploreSubcategoryId,
    setExploreSubcategoryId,
    location,
    setLocation,
    coverPickerOpen,
    setCoverPickerOpen,
    items,
    setItems,
    activeId,
    setActiveId,
    matchAll,
    setMatchAll,
    liveTrim,
    setLiveTrim,
    playbackTime,
    setPlaybackTime,
    seekRequest,
    setSeekRequest,
    mediaUrl,
    videoRemoteUrl,
    videoFile,
    posterUrl,
    duration,
    durationSeconds,
    videoSourceDuration,
    videoTrimStart,
    videoTrimEnd,
    videoAspect,
    setVideoAspect,
    busy,
    error,
    setError,
    skips,
    setSkips,
    dragActive,
    confirmDiscard,
    setConfirmDiscard,
    cropSource,
    cropOpen,
    cropPreset,
    fileNameHint,
    cropTarget,
    cropImageId,
    steps,
    uploads,
    enqueue,
    retry,
    cancel,
    forget,
    trackUrl,
    releaseUrl,
    summary,
    uploadFlash,
    uploadPhase,
    uploadRows,
    uploadScreenOpen,
    clearDraft,
    hasUnsavedWork,
    requestClose,
    discardAndClose,
    addPostFiles,
    addLongVideo,
    onPostMediaPick,
    onVideoSectionFile,
    acceptsDrop,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    openImageCrop,
    cropItem,
    onPosterPick,
    closeCrop,
    onCropConfirm,
    removeItem,
    moveItem,
    setCoverSlide,
    applyVideoPoster,
    applyCoverPoster,
    onGripPointerDown,
    onGripPointerMove,
    onGripPointerUp,
    setItemAspect,
    requestSeek,
    saveClipTrim,
    saveLongVideoTrim,
    activeIndex,
    activeItem,
    frameAspectFor,
    pendingItems,
    failedItems,
    validateStep,
    goNext,
    goBack,
    onLastStep,
    publish,
    sheetTitle,
    publishDisabled
  };
}
