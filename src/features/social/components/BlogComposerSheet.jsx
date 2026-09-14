import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Crop,
  Film,
  GripVertical,
  ImagePlus,
  Plus,
  Trash2,
  Type,
  X
} from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import { getPostMediaUrls, tabToPostType } from '../utils/socialPostType';

const MAX_IMAGES = 10;
const TEXT_SOFT_LIMIT = 280;

const META = {
  posts: {
    eyebrowCreate: 'New photo',
    eyebrowEdit: 'Edit photo',
    titleCreate: 'New post',
    Icon: ImagePlus
  },
  videos: {
    eyebrowCreate: 'New video',
    eyebrowEdit: 'Edit video',
    titleCreate: 'New video',
    Icon: Clapperboard
  },
  text: {
    eyebrowCreate: 'New text update',
    eyebrowEdit: 'Edit text update',
    titleCreate: 'New update',
    Icon: Type
  }
};

const IMAGE_STEPS = [
  { id: 'select', label: 'Select' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'caption', label: 'Caption' }
];

const VIDEO_STEPS = [
  { id: 'source', label: 'Source' },
  { id: 'thumbnail', label: 'Thumbnail' },
  { id: 'details', label: 'Details' }
];

function isBlobUrl(url) {
  return String(url || '').startsWith('blob:');
}

function newImageItem(partial = {}) {
  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: '',
    file: null,
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

  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const posterRef = useRef(null);
  const dragIndex = useRef(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropPreset, setCropPreset] = useState('socialPost');
  const [fileNameHint, setFileNameHint] = useState('');
  const [cropTarget, setCropTarget] = useState('image');
  const [cropImageId, setCropImageId] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);

  const steps = type === 'image' ? IMAGE_STEPS : type === 'video' ? VIDEO_STEPS : [];

  useEffect(() => {
    if (!post) {
      setTitle('');
      setCaption('');
      setImages([]);
      setMediaUrl('');
      setPosterUrl('');
      setDuration('');
      setError('');
      setStepIndex(0);
      setPreviewIndex(0);
      return;
    }
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setMediaUrl(post.mediaUrl || '');
    setPosterUrl(post.posterUrl || '');
    setDuration(post.duration || '');
    const urls = getPostMediaUrls(post);
    setImages(urls.map((url) => newImageItem({ url })));
    setError('');
    setPreviewIndex(0);
    if (type === 'image') setStepIndex(urls.length ? 1 : 0);
    else if (type === 'video') setStepIndex(0);
    else setStepIndex(0);
  }, [post, type]);

  const durableVideoUrl = isBlobUrl(mediaUrl) ? '' : mediaUrl;
  const captionLen = caption.length;

  const openImageCrop = (file, target, preset, imageId = '') => {
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropTarget(target);
    setCropPreset(preset);
    setCropImageId(imageId);
    setCropOpen(true);
  };

  const onImagesPick = (event) => {
    const files = [...(event.target.files || [])].filter((file) =>
      String(file.type || '').startsWith('image/')
    );
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setImages((prev) => {
      const room = MAX_IMAGES - prev.length;
      const nextFiles = files.slice(0, Math.max(0, room));
      const added = nextFiles.map((file) =>
        newImageItem({
          url: URL.createObjectURL(file),
          file
        })
      );
      const next = [...prev, ...added];
      if (added[0]) {
        queueMicrotask(() => openImageCrop(added[0].file, 'image', 'socialPost', added[0].id));
      }
      return next;
    });
    setStepIndex(1);
  };

  const onPosterPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    openImageCrop(file, 'poster', 'videoPoster');
  };

  const onVideoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Choose a video file.');
      return;
    }
    setError('');
    setMediaUrl(URL.createObjectURL(file));
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
        setImages((prev) =>
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

  const removeImage = (id) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
    setPreviewIndex(0);
  };

  const cropExistingImage = async (item) => {
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
    setImages((prev) => {
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

  const ensureImagesUploaded = async () => {
    const next = [];
    for (const item of images) {
      if (item.url && !isBlobUrl(item.url) && !item.file) {
        next.push(item);
        continue;
      }
      if (!item.file && isBlobUrl(item.url)) {
        throw new Error('Crop or re-add each photo before publishing.');
      }
      if (!item.file) {
        throw new Error('Add at least one photo.');
      }
      const result = await uploadPublicImage(item.file, 'social');
      next.push({ ...item, url: result.url || '', file: null });
    }
    return next;
  };

  const validateStep = (index) => {
    if (type === 'image') {
      if (index === 0 && !images.length) return 'Add at least one photo.';
      if (index >= 1 && !images.length) return 'Add at least one photo.';
    }
    if (type === 'video') {
      if (index === 0) {
        if (!durableVideoUrl.trim()) {
          return 'Paste a public video URL to continue (local files are preview-only).';
        }
      }
      if (index >= 1 && !posterUrl.trim()) return 'Add a thumbnail before continuing.';
      if (index >= 2) {
        if (!mediaUrl.trim()) return 'Paste a public video URL to publish.';
        if (isBlobUrl(mediaUrl)) {
          return 'Paste a public video URL before publishing. Local files are preview-only.';
        }
        if (!posterUrl.trim()) return 'Add a thumbnail before publishing.';
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
        const uploaded = await ensureImagesUploaded();
        const urls = uploaded.map((item) => item.url).filter(Boolean);
        if (!urls.length) {
          setError('Add at least one photo.');
          return;
        }
        setImages(uploaded);
        payload = {
          ...payload,
          mediaUrl: urls[0],
          mediaUrls: urls
        };
      } else if (type === 'video') {
        payload = {
          ...payload,
          mediaUrl: mediaUrl.trim(),
          posterUrl: posterUrl.trim(),
          duration: duration.trim()
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
        ? stepIndex >= IMAGE_STEPS.length - 1
        : stepIndex >= VIDEO_STEPS.length - 1;

  const activePreview = images[previewIndex] || images[0];

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
                  className="bb-composer-dropzone"
                  onClick={() => imageRef.current?.click()}
                  disabled={busy}
                >
                  <ImagePlus size={28} strokeWidth={2} />
                  <strong>Select photos</strong>
                  <span>Up to {MAX_IMAGES} · 4:5 crop on the next step</span>
                </button>
              ) : null}

              {stepIndex === 1 ? (
                <div className="bb-composer-arrange">
                  <div className="bb-composer-arrange-stage">
                    {activePreview?.url ? (
                      <img src={activePreview.url} alt="" />
                    ) : (
                      <span className="bb-composer-arrange-empty">No photo selected</span>
                    )}
                  </div>
                  <div className="bb-composer-strip" role="list">
                    {images.map((item, index) => (
                      <div
                        key={item.id}
                        className={`bb-composer-strip-item${
                          (activePreview?.id || images[0]?.id) === item.id ? ' is-active' : ''
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
                        <img src={item.url} alt="" />
                        <div className="bb-composer-strip-actions">
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
                          <button
                            type="button"
                            className="bb-composer-strip-btn"
                            aria-label="Remove"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeImage(item.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES ? (
                      <button
                        type="button"
                        className="bb-composer-strip-add"
                        onClick={() => imageRef.current?.click()}
                        aria-label="Add photo"
                      >
                        <Plus size={18} />
                      </button>
                    ) : null}
                  </div>
                  <p className="bb-composer-hint">Drag to reorder · tap crop to refine</p>
                </div>
              ) : null}

              {stepIndex === 2 ? (
                <div className="bb-composer-caption-step">
                  <div className="bb-composer-carousel-preview">
                    {images[0]?.url ? (
                      <>
                        <img
                          src={(images[previewIndex] || images[0]).url}
                          alt=""
                        />
                        {images.length > 1 ? (
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
                              {previewIndex + 1} / {images.length}
                            </span>
                            <button
                              type="button"
                              disabled={previewIndex >= images.length - 1}
                              onClick={() =>
                                setPreviewIndex((v) => Math.min(images.length - 1, v + 1))
                              }
                              aria-label="Next"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <div className="bb-composer-fields">
                    <label className="bb-social-field">
                      <span>Title (optional)</span>
                      <input
                        className="native-control-input bb-social-compose-control"
                        value={title}
                        placeholder="Post title"
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </label>
                    <label className="bb-social-field bb-social-field--grow">
                      <span>Caption</span>
                      <textarea
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

              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImagesPick}
              />
            </div>
          ) : null}

          {type === 'video' ? (
            <div className="bb-composer-video">
              {stepIndex === 0 ? (
                <div className="bb-composer-fields">
                  <div className="bb-blog-composer-video-tools">
                    {mediaUrl && isBlobUrl(mediaUrl) ? (
                      <div className="bb-blog-composer-video-stage">
                        <video
                          className="bb-social-compose-player"
                          controls
                          playsInline
                          poster={posterUrl || undefined}
                          src={mediaUrl}
                        />
                        <p className="bb-composer-hint">
                          Local preview only — paste a public URL below to publish.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="bb-composer-dropzone bb-composer-dropzone--video"
                        onClick={() => videoRef.current?.click()}
                      >
                        <Film size={26} strokeWidth={2} />
                        <strong>Preview a local file</strong>
                        <span>Optional · not published</span>
                      </button>
                    )}
                    <input
                      ref={videoRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={onVideoFile}
                    />
                  </div>
                  <label className="bb-social-field">
                    <span>Video URL</span>
                    <input
                      className="native-control-input bb-social-compose-control"
                      value={durableVideoUrl}
                      placeholder="https://…/video.mp4"
                      onChange={(event) => setMediaUrl(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {stepIndex === 1 ? (
                <div className="bb-composer-fields">
                  <button
                    type="button"
                    className="bb-composer-dropzone bb-composer-dropzone--poster"
                    onClick={() => posterRef.current?.click()}
                    disabled={busy}
                  >
                    {posterUrl ? (
                      <img src={posterUrl} alt="" className="bb-composer-poster-preview" />
                    ) : (
                      <>
                        <ImagePlus size={26} strokeWidth={2} />
                        <strong>Add thumbnail</strong>
                        <span>Required · 16:9 crop</span>
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

              {stepIndex === 2 ? (
                <div className="bb-composer-fields">
                  <div className="bb-composer-video-review">
                    {posterUrl ? <img src={posterUrl} alt="" /> : null}
                    {duration.trim() ? (
                      <span className="bb-composer-video-duration">{duration.trim()}</span>
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
                  <header className="bb-social-note-meta">
                    <span className="bb-social-note-stamp">Just now</span>
                    <span className="bb-social-note-mark bb-public-native-fill" aria-hidden="true" />
                  </header>
                  {title.trim() ? (
                    <h2 className="bb-social-note-title">{title.trim()}</h2>
                  ) : null}
                  <div className="bb-social-note-bubble">
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
