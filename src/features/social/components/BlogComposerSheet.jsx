import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Crop,
  Film,
  GripVertical,
  ImagePlus,
  Play,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import {
  uploadPublicImage,
  uploadPublicVideo
} from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  formatDurationLabel,
  getPostMediaItems,
  POST_CLIP_MAX_SECONDS,
  tabToPostType
} from '../utils/socialPostType';
import { captureVideoPoster, readVideoDuration, readVideoFrame, aspectStyle } from '../utils/videoMedia';

const MAX_MEDIA = 10;
const TEXT_SOFT_LIMIT = 280;

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

function newMediaItem(partial = {}) {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'image',
    url: '',
    file: null,
    posterUrl: '',
    posterFile: null,
    durationSeconds: 0,
    durationLabel: '',
    aspectRatio: 0,
    ...partial
  };
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
        >
          <span className="bb-composer-step-index">{i + 1}</span>
          <span className="bb-composer-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function MediaPreview({ item, onAspect }) {
  if (!item?.url) {
    return <span className="bb-composer-arrange-empty">Nothing selected</span>;
  }

  const reportAspect = (w, h) => {
    if (!(w > 0 && h > 0)) return;
    onAspect?.(w / h);
  };

  if (item.kind === 'video') {
    return (
      <video
        className="bb-composer-arrange-video"
        src={item.url}
        poster={item.posterUrl || undefined}
        muted
        playsInline
        controls
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          reportAspect(video.videoWidth, video.videoHeight);
        }}
      />
    );
  }

  return (
    <img
      src={item.url}
      alt=""
      onLoad={(event) => {
        const img = event.currentTarget;
        reportAspect(img.naturalWidth, img.naturalHeight);
      }}
    />
  );
}

/**
 * Unified create/edit composer — stepped for image/video, X-style for text.
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
  const dragIndex = useRef(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [items, setItems] = useState([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [videoAspect, setVideoAspect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropPreset, setCropPreset] = useState('socialPost');
  const [fileNameHint, setFileNameHint] = useState('');
  const [cropTarget, setCropTarget] = useState('image');
  const [cropImageId, setCropImageId] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);

  const steps = type === 'image' ? POST_STEPS : type === 'video' ? VIDEO_STEPS : [];

  useEffect(() => {
    if (!post) {
      setTitle('');
      setCaption('');
      setItems([]);
      setMediaUrl('');
      setVideoFile(null);
      setPosterUrl('');
      setDuration('');
      setDurationSeconds(0);
      setVideoAspect(0);
      setError('');
      setStepIndex(0);
      setPreviewIndex(0);
      return;
    }
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setMediaUrl(post.mediaUrl || '');
    setVideoFile(null);
    setPosterUrl(post.posterUrl || '');
    setDuration(post.duration || '');
    setDurationSeconds(Number(post.durationSeconds) || 0);
    setVideoAspect(Number(post.aspectRatio) || 0);
    const loaded = getPostMediaItems(post).map((item) =>
      newMediaItem({
        kind: item.kind,
        url: item.url,
        posterUrl: item.posterUrl || '',
        durationSeconds: item.durationSeconds || 0,
        durationLabel: item.durationLabel || '',
        aspectRatio: Number(item.aspectRatio) || 0
      })
    );
    setItems(loaded);
    setError('');
    setPreviewIndex(0);
    if (type === 'image') setStepIndex(loaded.length ? 1 : 0);
    else setStepIndex(0);
  }, [post, type]);

  const durableVideoUrl = isBlobUrl(mediaUrl) ? '' : mediaUrl;
  const captionLen = caption.length;
  const activePreview = items[previewIndex] || items[0];

  const openImageCrop = (file, target, preset, imageId = '') => {
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropTarget(target);
    setCropPreset(preset);
    setCropImageId(imageId);
    setCropOpen(true);
  };

  const onPostMediaPick = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setBusy(true);
    try {
      const room = MAX_MEDIA - items.length;
      const slice = files.slice(0, Math.max(0, room));
      const added = [];

      for (const file of slice) {
        if (file.type.startsWith('image/')) {
          const item = newMediaItem({
            kind: 'image',
            url: URL.createObjectURL(file),
            file
          });
          added.push(item);
          continue;
        }
        if (file.type.startsWith('video/')) {
          const frame = await readVideoFrame(file).catch(() => null);
          const seconds = frame?.duration || (await readVideoDuration(file));
          if (seconds > POST_CLIP_MAX_SECONDS + 0.25) {
            setError(
              `Clips in Posts must be ${POST_CLIP_MAX_SECONDS}s or less. Use Videos for longer films.`
            );
            continue;
          }
          let posterFile = null;
          let posterPreview = '';
          try {
            posterFile = await captureVideoPoster(file);
            posterPreview = URL.createObjectURL(posterFile);
          } catch {
            posterFile = null;
          }
          added.push(
            newMediaItem({
              kind: 'video',
              url: URL.createObjectURL(file),
              file,
              posterUrl: posterPreview,
              posterFile,
              durationSeconds: seconds,
              durationLabel: formatDurationLabel(seconds),
              aspectRatio: frame?.aspect || 0
            })
          );
          continue;
        }
      }

      if (!added.length) {
        if (!error) setError('Choose photos or clips up to 1 minute.');
        return;
      }

      setItems((prev) => [...prev, ...added]);
      setStepIndex(1);
      const firstImage = added.find((item) => item.kind === 'image' && item.file);
      if (firstImage) {
        queueMicrotask(() =>
          openImageCrop(firstImage.file, 'image', 'socialPost', firstImage.id)
        );
      }
    } catch (err) {
      setError(err?.message || 'Could not add media');
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

  const onVideoSectionFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Choose a video file.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const frame = await readVideoFrame(file);
      const seconds = frame.duration || (await readVideoDuration(file));
      const label = formatDurationLabel(seconds);
      setDurationSeconds(seconds);
      setDuration(label);
      setVideoAspect(frame.aspect || 0);
      setVideoFile(file);
      setMediaUrl(URL.createObjectURL(file));
      try {
        const poster = await captureVideoPoster(file);
        const uploaded = await uploadPublicImage(poster, 'social');
        setPosterUrl(uploaded.url || '');
      } catch {
        /* poster optional until final step */
      }
    } catch (err) {
      setError(err?.message || 'Could not read video');
    } finally {
      setBusy(false);
    }
  };

  const onCropConfirm = async (file) => {
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, 'social');
      const url = result.url || '';
      if (cropTarget === 'poster') {
        setPosterUrl(url);
      } else if (cropImageId) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === cropImageId ? { ...item, url, file: null } : item
          )
        );
      }
      setCropOpen(false);
      setCropSource(null);
      setCropImageId('');
    } catch (err) {
      setError(err?.message || 'Upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setPreviewIndex(0);
  };

  const cropExistingImage = async (item) => {
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
      setError('Could not open image for crop.');
    } finally {
      setBusy(false);
    }
  };

  const onDragStart = (index) => {
    dragIndex.current = index;
  };

  const onDragOver = (event, index) => {
    event.preventDefault();
    const from = dragIndex.current;
    if (from == null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      dragIndex.current = index;
      return next;
    });
  };

  const onDragEnd = () => {
    dragIndex.current = null;
  };

  const ensurePostMediaUploaded = async () => {
    const next = [];
    for (const item of items) {
      if (item.kind === 'image') {
        if (item.url && !isBlobUrl(item.url) && !item.file) {
          next.push(item);
          continue;
        }
        if (!item.file) throw new Error('Crop or re-add each photo before publishing.');
        const result = await uploadPublicImage(item.file, 'social');
        next.push({ ...item, url: result.url || '', file: null });
        continue;
      }

      let url = item.url;
      if (item.file || isBlobUrl(item.url)) {
        if (!item.file) throw new Error('Re-add each clip before publishing.');
        const uploaded = await uploadPublicVideo(item.file, 'social');
        url = uploaded.url || '';
      }
      let poster = item.posterUrl;
      if (item.posterFile) {
        const uploadedPoster = await uploadPublicImage(item.posterFile, 'social');
        poster = uploadedPoster.url || poster;
      } else if (poster && isBlobUrl(poster) && item.file) {
        const posterFile = await captureVideoPoster(item.file);
        const uploadedPoster = await uploadPublicImage(posterFile, 'social');
        poster = uploadedPoster.url || '';
      }
      next.push({
        ...item,
        url,
        file: null,
        posterUrl: poster && !isBlobUrl(poster) ? poster : '',
        posterFile: null
      });
    }
    return next;
  };

  const validateStep = (index) => {
    if (type === 'image') {
      if (!items.length) return 'Add at least one photo or clip (clips ≤ 1 minute).';
    }
    if (type === 'video') {
      if (index === 0) {
        if (!videoFile && !durableVideoUrl.trim()) {
          return 'Upload a video file or paste a public URL to continue.';
        }
      }
      if (index >= 2) {
        if (!videoFile && !durableVideoUrl.trim()) {
          return 'Upload a video file or paste a public URL to publish.';
        }
        if (!videoFile && isBlobUrl(mediaUrl)) {
          return 'Paste a public video URL before publishing.';
        }
        if (!posterUrl.trim() || isBlobUrl(posterUrl)) {
          return 'Add a thumbnail before publishing.';
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

  const publish = async () => {
    const lastCheck =
      type === 'image'
        ? validateStep(1)
        : type === 'video'
          ? validateStep(2)
          : validateStep(0);
    if (lastCheck) {
      setError(lastCheck);
      return;
    }
    if (type === 'text' && !caption.trim()) {
      setError('Write something first.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      let payload = {
        type,
        title:
          title.trim() ||
          (type === 'video' ? 'Untitled video' : type === 'text' ? '' : ''),
        caption: caption.trim(),
        published: true
      };

      if (type === 'image') {
        const uploaded = await ensurePostMediaUploaded();
        if (!uploaded.length) {
          setError('Add at least one photo or clip.');
          return;
        }
        setItems(uploaded);
        const urls = uploaded.map((item) => item.url).filter(Boolean);
        payload = {
          ...payload,
          mediaUrl: urls[0],
          mediaUrls: urls,
          mediaItems: uploaded.map((item) => ({
            kind: item.kind,
            url: item.url,
            posterUrl: item.posterUrl || '',
            durationSeconds: item.durationSeconds || 0,
            durationLabel: item.durationLabel || '',
            aspectRatio: Number(item.aspectRatio) || 0
          }))
        };
      } else if (type === 'video') {
        let finalUrl = durableVideoUrl.trim();
        if (videoFile) {
          const uploaded = await uploadPublicVideo(videoFile, 'social');
          finalUrl = uploaded.url || '';
        }
        if (!finalUrl || isBlobUrl(finalUrl)) {
          setError('Upload a video file or paste a public URL to publish.');
          return;
        }
        let aspect = videoAspect;
        if (!(aspect > 0) && finalUrl) {
          try {
            aspect = (await readVideoFrame(finalUrl)).aspect;
          } catch {
            aspect = 0;
          }
        }
        payload = {
          ...payload,
          mediaUrl: finalUrl,
          posterUrl: posterUrl.trim(),
          duration: duration.trim() || formatDurationLabel(durationSeconds),
          durationSeconds,
          aspectRatio: aspect || 0
        };
      }

      if (isEdit) onUpdateSocialPost?.(post.id, payload);
      else onAddSocialPost?.(payload);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not publish');
    } finally {
      setBusy(false);
    }
  };

  const sheetTitle = isEdit ? title.trim() || meta.eyebrowEdit : meta.titleCreate;
  const canPublish =
    type === 'text'
      ? true
      : type === 'image'
        ? stepIndex >= POST_STEPS.length - 1
        : stepIndex >= VIDEO_STEPS.length - 1;

  const footerPrimary = () => {
    if (type === 'text' || canPublish) {
      return (
        <button
          type="button"
          className="bb-primary-btn"
          onClick={publish}
          disabled={busy}
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
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel bb-social-studio-sheet-panel--composer bb-composer-panel">
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
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        {steps.length ? <StepRail steps={steps} index={stepIndex} /> : null}

        <div className="bb-social-studio-sheet-body bb-composer-body">
          {type === 'image' ? (
            <div className="bb-composer-image">
              {stepIndex === 0 ? (
                <button
                  type="button"
                  className="bb-composer-dropzone bb-composer-dropzone--hero"
                  onClick={() => mediaRef.current?.click()}
                  disabled={busy}
                >
                  <span className="bb-composer-dropzone-icons" aria-hidden="true">
                    <ImagePlus size={26} strokeWidth={2} />
                    <Film size={22} strokeWidth={2} />
                  </span>
                  <strong>Select photos &amp; clips</strong>
                  <span>
                    Up to {MAX_MEDIA} · clips max {POST_CLIP_MAX_SECONDS}s · Instagram-style
                    crop next
                  </span>
                </button>
              ) : null}

              {stepIndex === 1 ? (
                <div className="bb-composer-arrange">
                  <div
                    className="bb-composer-arrange-stage"
                    style={aspectStyle(activePreview?.aspectRatio)}
                  >
                    <MediaPreview
                      item={activePreview}
                      onAspect={(aspect) => {
                        if (!(aspect > 0) || !activePreview?.id) return;
                        setItems((prev) =>
                          prev.map((entry) =>
                            entry.id === activePreview.id && !(entry.aspectRatio > 0)
                              ? { ...entry, aspectRatio: aspect }
                              : entry
                          )
                        );
                      }}
                    />
                    {activePreview?.kind === 'video' && activePreview.durationLabel ? (
                      <span className="bb-composer-media-badge">
                        {activePreview.durationLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="bb-composer-strip" role="list">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`bb-composer-strip-item${
                          (activePreview?.id || items[0]?.id) === item.id ? ' is-active' : ''
                        }`}
                        role="listitem"
                        draggable
                        onDragStart={() => onDragStart(index)}
                        onDragOver={(event) => onDragOver(event, index)}
                        onDragEnd={onDragEnd}
                        onClick={() => setPreviewIndex(index)}
                      >
                        <span className="bb-composer-strip-grip" aria-hidden="true">
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
                        <div className="bb-composer-strip-actions">
                          {item.kind === 'image' ? (
                            <button
                              type="button"
                              className="bb-composer-strip-btn"
                              aria-label="Crop"
                              onClick={(event) => {
                                event.stopPropagation();
                                cropExistingImage(item);
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
                    ))}
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
                    Drag to reorder · crop photos · clips must stay under 1 minute
                  </p>
                </div>
              ) : null}

              {stepIndex === 2 ? (
                <div className="bb-composer-caption-step">
                  <div className="bb-composer-caption-media">
                    <div
                      className="bb-composer-carousel-preview"
                      style={aspectStyle(
                        (items[previewIndex] || items[0])?.aspectRatio
                      )}
                    >
                      {items[0] ? (
                        <>
                          <MediaPreview
                            item={items[previewIndex] || items[0]}
                            onAspect={(aspect) => {
                              const active = items[previewIndex] || items[0];
                              if (!(aspect > 0) || !active?.id) return;
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === active.id && !(entry.aspectRatio > 0)
                                    ? { ...entry, aspectRatio: aspect }
                                    : entry
                                )
                              );
                            }}
                          />
                          {(items[previewIndex] || items[0])?.kind === 'video' &&
                          (items[previewIndex] || items[0])?.durationLabel ? (
                            <span className="bb-composer-media-badge">
                              {(items[previewIndex] || items[0]).durationLabel}
                            </span>
                          ) : null}
                          {items.length > 1 ? (
                            <div className="bb-composer-carousel-controls">
                              <button
                                type="button"
                                disabled={previewIndex <= 0}
                                onClick={() => setPreviewIndex((v) => Math.max(0, v - 1))}
                                aria-label="Previous"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span>
                                {previewIndex + 1} / {items.length}
                              </span>
                              <button
                                type="button"
                                disabled={previewIndex >= items.length - 1}
                                onClick={() =>
                                  setPreviewIndex((v) => Math.min(items.length - 1, v + 1))
                                }
                                aria-label="Next"
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
                    {items.length > 1 ? (
                      <p className="bb-composer-caption-media-hint">
                        Swipe through the carousel before you publish
                      </p>
                    ) : null}
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
                      <span>Caption</span>
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

          {type === 'video' ? (
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
                          if (!(videoAspect > 0) && video.videoWidth > 0 && video.videoHeight > 0) {
                            setVideoAspect(video.videoWidth / video.videoHeight);
                          }
                        }}
                      />
                      {duration ? (
                        <span className="bb-composer-media-badge">{duration}</span>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="bb-composer-dropzone bb-composer-dropzone--hero"
                      onClick={() => videoRef.current?.click()}
                      disabled={busy}
                    >
                      <Film size={28} strokeWidth={2} />
                      <strong>Upload video</strong>
                      <span>Any length · thumbnail comes last</span>
                    </button>
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
                      value={durableVideoUrl}
                      placeholder="https://…/video.mp4"
                      onChange={(event) => {
                        setVideoFile(null);
                        setMediaUrl(event.target.value);
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
                      <video
                        src={mediaUrl}
                        poster={posterUrl || undefined}
                        muted
                        playsInline
                      />
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
                  <label className="bb-social-field">
                    <span>Duration</span>
                    <input
                      className="native-control-input bb-social-compose-control"
                      value={duration}
                      placeholder="3:42"
                      onChange={(event) => setDuration(event.target.value)}
                    />
                  </label>
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
                    Pick the cover viewers see before play — last step, just like YouTube.
                  </p>
                  <button
                    type="button"
                    className="bb-composer-dropzone bb-composer-dropzone--poster"
                    onClick={() => posterRef.current?.click()}
                    disabled={busy}
                    style={posterUrl ? aspectStyle(videoAspect, 16 / 9) : undefined}
                  >
                    {posterUrl ? (
                      <img src={posterUrl} alt="" className="bb-composer-poster-preview" />
                    ) : (
                      <>
                        <ImagePlus size={26} strokeWidth={2} />
                        <strong>Choose thumbnail</strong>
                        <span>Required · keeps the video’s own shape</span>
                      </>
                    )}
                  </button>
                  {posterUrl ? (
                    <button
                      type="button"
                      className="bb-ghost-btn"
                      onClick={() => posterRef.current?.click()}
                      disabled={busy}
                    >
                      Change thumbnail
                    </button>
                  ) : null}
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
                      <span
                        className={`bb-composer-x-count${
                          captionLen > TEXT_SOFT_LIMIT ? ' is-over' : ''
                        }`}
                      >
                        {captionLen}
                      </span>
                    </span>
                    <textarea
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

          {error ? <p className="bb-social-compose-error">{error}</p> : null}
        </div>

        <footer className="bb-social-studio-sheet-footer bb-blog-composer-footer">
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
            {type !== 'text' && stepIndex > 0 ? (
              <button type="button" className="bb-ghost-btn" onClick={goBack} disabled={busy}>
                <ChevronLeft size={16} strokeWidth={2.2} />
                Back
              </button>
            ) : (
              <button type="button" className="bb-ghost-btn" onClick={onClose}>
                Cancel
              </button>
            )}
            {footerPrimary()}
          </div>
        </footer>
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset={cropPreset}
        fileNameHint={fileNameHint}
        onCancel={() => {
          if (busy) return;
          setCropOpen(false);
          setCropSource(null);
          setCropImageId('');
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
