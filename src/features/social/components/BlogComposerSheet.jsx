import { useEffect, useRef, useState } from 'react';
import {
  Clapperboard,
  Film,
  ImagePlus,
  Replace,
  Type,
  X
} from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import { tabToPostType } from '../utils/socialPostType';

const META = {
  posts: {
    eyebrowCreate: 'New photo',
    eyebrowEdit: 'Edit photo',
    titleCreate: 'Compose a photo post',
    lede: '4:5 portrait · preview updates as you write',
    Icon: ImagePlus
  },
  videos: {
    eyebrowCreate: 'New video',
    eyebrowEdit: 'Edit video',
    titleCreate: 'Compose a video',
    lede: '16:9 · paste a public URL to publish',
    Icon: Clapperboard
  },
  text: {
    eyebrowCreate: 'New text update',
    eyebrowEdit: 'Edit text update',
    titleCreate: 'Compose a note',
    lede: 'Short update · shows on your live Content timeline',
    Icon: Type
  }
};

function isBlobUrl(url) {
  return String(url || '').startsWith('blob:');
}

function BlogPreview({
  type,
  title,
  caption,
  mediaUrl,
  posterUrl,
  duration,
  businessName
}) {
  const displayTitle =
    title.trim() ||
    (type === 'video'
      ? 'Untitled video'
      : type === 'text'
        ? 'Untitled update'
        : 'Untitled post');

  return (
    <div className={`bb-blog-preview bb-blog-preview--${type}`}>
      <div className="bb-blog-preview-chrome">
        <span className="bb-blog-preview-dot" />
        <span className="bb-blog-preview-dot" />
        <span className="bb-blog-preview-dot" />
        <p className="bb-blog-preview-label">Live preview</p>
      </div>

      <div className="bb-blog-preview-frame">
        <div className="bb-blog-preview-brand">{businessName || 'Your business'}</div>

        {type === 'image' ? (
          <div className="bb-blog-preview-media bb-blog-preview-media--portrait">
            {mediaUrl ? (
              <img src={mediaUrl} alt="" />
            ) : (
              <span className="bb-blog-preview-placeholder">
                <ImagePlus size={22} strokeWidth={2} />
                <span>Photo appears here</span>
              </span>
            )}
          </div>
        ) : null}

        {type === 'video' ? (
          <div className="bb-blog-preview-media bb-blog-preview-media--video">
            {mediaUrl ? (
              <video
                className="bb-blog-preview-player"
                controls
                playsInline
                poster={posterUrl || undefined}
                src={mediaUrl}
              />
            ) : posterUrl ? (
              <img src={posterUrl} alt="" />
            ) : (
              <span className="bb-blog-preview-placeholder">
                <Film size={22} strokeWidth={2} />
                <span>Video preview</span>
              </span>
            )}
            {duration.trim() ? (
              <span className="bb-blog-preview-duration">{duration.trim()}</span>
            ) : null}
          </div>
        ) : null}

        {type === 'text' ? (
          <div className="bb-blog-preview-text-card">
            <Type size={16} strokeWidth={2.2} aria-hidden="true" />
            <p className="bb-blog-preview-text-kicker">Text update</p>
          </div>
        ) : null}

        <div className="bb-blog-preview-copy">
          <h4 className="bb-blog-preview-title">{displayTitle}</h4>
          {caption.trim() ? (
            <p className="bb-blog-preview-caption">{caption.trim()}</p>
          ) : (
            <p className="bb-blog-preview-caption is-muted">
              {type === 'text' ? 'Your update will show here…' : 'Caption will show here…'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Unified create/edit composer for Content posts.
 * Publishes immediately — no draft workflow.
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

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
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

  useEffect(() => {
    if (!post) {
      setTitle('');
      setCaption('');
      setMediaUrl('');
      setPosterUrl('');
      setDuration('');
      setError('');
      return;
    }
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setMediaUrl(post.mediaUrl || '');
    setPosterUrl(post.posterUrl || '');
    setDuration(post.duration || '');
    setError('');
  }, [post]);

  const durableVideoUrl = isBlobUrl(mediaUrl) ? '' : mediaUrl;

  const openImageCrop = (file, target, preset) => {
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropTarget(target);
    setCropPreset(preset);
    setCropOpen(true);
  };

  const onImagePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    openImageCrop(file, 'image', 'socialPost');
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
      if (cropTarget === 'poster') setPosterUrl(url);
      else setMediaUrl(url);
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const validate = () => {
    if (type === 'image' && !mediaUrl.trim()) return 'Add a photo first.';
    if (type === 'video') {
      if (!mediaUrl.trim()) return 'Paste a public video URL to publish.';
      if (isBlobUrl(mediaUrl)) {
        return 'Paste a public video URL before publishing. Local files are preview-only.';
      }
      if (!posterUrl.trim()) return 'Add a poster image before publishing.';
    }
    if (type === 'text' && !caption.trim()) return 'Write something first.';
    return '';
  };

  const buildPayload = () => {
    const base = {
      type,
      title:
        title.trim() ||
        (type === 'video' ? 'Untitled video' : ''),
      caption: caption.trim(),
      published: true
    };
    if (type === 'image') return { ...base, mediaUrl: mediaUrl.trim() };
    if (type === 'video') {
      return {
        ...base,
        mediaUrl: mediaUrl.trim(),
        posterUrl: posterUrl.trim(),
        duration: duration.trim()
      };
    }
    return base;
  };

  const publish = () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    const payload = buildPayload();
    if (isEdit) onUpdateSocialPost?.(post.id, payload);
    else onAddSocialPost?.(payload);
    onClose?.();
  };

  const sheetTitle = isEdit ? title.trim() || meta.eyebrowEdit : meta.titleCreate;

  return (
    <div
      className="bb-social-studio-sheet bb-social-studio-sheet--composer"
      role="dialog"
      aria-modal="true"
      aria-label={sheetTitle}
    >
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel bb-social-studio-sheet-panel--composer">
        <header className="bb-social-studio-sheet-head">
          <div className="bb-blog-composer-head-copy">
            <p className="bb-social-studio-sheet-eyebrow">
              {isEdit ? meta.eyebrowEdit : meta.eyebrowCreate}
            </p>
            <h3 className="bb-social-studio-sheet-title">{sheetTitle}</h3>
            <p className="bb-social-studio-sheet-lede">{meta.lede}</p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-social-studio-sheet-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="bb-social-studio-sheet-body bb-blog-composer-body">
          <BlogPreview
            type={type}
            title={title}
            caption={caption}
            mediaUrl={mediaUrl}
            posterUrl={posterUrl}
            duration={duration}
            businessName={businessName}
          />

          <div className="bb-blog-composer-fields">
            {type === 'image' ? (
              <div className="bb-blog-composer-media-block">
                <button
                  type="button"
                  className={`bb-social-dropzone bb-social-dropzone--portrait ${
                    mediaUrl ? 'has-media' : ''
                  }`}
                  onClick={() => imageRef.current?.click()}
                  disabled={busy}
                >
                  {mediaUrl ? (
                    <img src={mediaUrl} alt="" />
                  ) : (
                    <span className="bb-social-dropzone-empty">
                      <span className="bb-social-dropzone-icon" aria-hidden="true">
                        <ImagePlus size={20} />
                      </span>
                      <span className="bb-social-dropzone-label">
                        {busy ? 'Uploading…' : 'Add photo'}
                      </span>
                      <span className="bb-social-dropzone-hint">4:5 crop</span>
                    </span>
                  )}
                </button>
                {mediaUrl ? (
                  <button
                    type="button"
                    className="bb-ghost-btn bb-social-compose-replace"
                    onClick={() => imageRef.current?.click()}
                    disabled={busy}
                  >
                    <Replace size={14} />
                    Replace
                  </button>
                ) : null}
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onImagePick}
                />
              </div>
            ) : null}

            {type === 'video' ? (
              <div className="bb-blog-composer-media-block">
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
                      <p className="bb-blog-composer-hint">
                        Local preview only — paste a public URL below to publish.
                      </p>
                      <button
                        type="button"
                        className="bb-ghost-btn bb-social-compose-replace"
                        onClick={() => videoRef.current?.click()}
                      >
                        <Replace size={14} />
                        Replace preview
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="bb-social-dropzone bb-social-dropzone--video"
                      onClick={() => videoRef.current?.click()}
                    >
                      <span className="bb-social-dropzone-empty">
                        <span className="bb-social-dropzone-icon" aria-hidden="true">
                          <Film size={20} />
                        </span>
                        <span className="bb-social-dropzone-label">Preview local file</span>
                        <span className="bb-social-dropzone-hint">Optional · not published</span>
                      </span>
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

                <button
                  type="button"
                  className="bb-social-compose-poster-pick"
                  onClick={() => posterRef.current?.click()}
                  disabled={busy}
                >
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt=""
                      className="bb-social-compose-poster-thumb"
                    />
                  ) : (
                    <span className="bb-social-compose-poster-empty" aria-hidden="true">
                      <ImagePlus size={16} />
                    </span>
                  )}
                  <span className="bb-social-compose-poster-copy">
                    <strong>{posterUrl ? 'Change poster' : 'Add poster'}</strong>
                    <span>Required to publish · 16:9 crop</span>
                  </span>
                </button>
                <input
                  ref={posterRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPosterPick}
                />

                <label className="bb-social-field">
                  <span>Duration</span>
                  <input
                    className="native-control-input bb-social-compose-control"
                    value={duration}
                    placeholder="3:42"
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <label className="bb-social-field">
              <span>Title{type === 'text' ? ' (optional)' : ''}</span>
              <input
                className="native-control-input bb-social-compose-control"
                value={title}
                placeholder={
                  type === 'video'
                    ? 'Video title'
                    : type === 'text'
                      ? 'Title (optional)'
                      : 'Post title'
                }
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="bb-social-field bb-social-field--grow">
              <span>
                {type === 'text' ? 'Update' : type === 'video' ? 'Description' : 'Caption'}
              </span>
              <textarea
                className="native-control-input bb-social-compose-control bb-social-compose-caption"
                rows={type === 'text' ? 7 : 4}
                value={caption}
                placeholder={
                  type === 'text'
                    ? 'Write your update…'
                    : type === 'video'
                      ? 'What is this video about?'
                      : 'Write a caption…'
                }
                onChange={(event) => setCaption(event.target.value)}
              />
            </label>

            {error ? <p className="bb-social-compose-error">{error}</p> : null}
          </div>
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
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              onClick={publish}
              disabled={busy}
            >
              {isEdit ? 'Save changes' : 'Publish'}
            </button>
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
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
