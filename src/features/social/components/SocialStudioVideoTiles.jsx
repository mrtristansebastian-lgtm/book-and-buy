import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';

function formatPostStamp(createdAt) {
  const ts = Number(createdAt) || 0;
  if (!ts) return 'No date';
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${date} · ${time}`;
}

function VideoEditSheet({
  post,
  onClose,
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  const posterRef = useRef(null);
  const [title, setTitle] = useState(post.title || '');
  const [caption, setCaption] = useState(post.caption || '');
  const [mediaUrl, setMediaUrl] = useState(post.mediaUrl || '');
  const [posterUrl, setPosterUrl] = useState(post.posterUrl || '');
  const [duration, setDuration] = useState(post.duration || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');

  useEffect(() => {
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setMediaUrl(post.mediaUrl || '');
    setPosterUrl(post.posterUrl || '');
    setDuration(post.duration || '');
    setError('');
  }, [post]);

  const onPoster = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropOpen(true);
  };

  const onCropConfirm = async (file) => {
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, 'social');
      setPosterUrl(result.url || '');
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Poster upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    onUpdateSocialPost?.(post.id, {
      title: title.trim(),
      caption: caption.trim(),
      mediaUrl: mediaUrl.trim(),
      posterUrl: posterUrl.trim(),
      duration: duration.trim(),
      type: 'video'
    });
    onClose();
  };

  return (
    <div className="bb-social-studio-sheet" role="dialog" aria-modal="true" aria-label="Edit video">
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel">
        <header className="bb-social-studio-sheet-head">
          <div>
            <p className="bb-social-studio-sheet-eyebrow">Edit video</p>
            <h3 className="bb-social-studio-sheet-title">{title.trim() || 'Untitled video'}</h3>
          </div>
          <button type="button" className="bb-ghost-btn bb-social-studio-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-social-studio-sheet-body">
          <button
            type="button"
            className="bb-social-compose-poster-pick"
            onClick={() => posterRef.current?.click()}
            disabled={busy}
          >
            {posterUrl ? (
              <img src={posterUrl} alt="" className="bb-social-compose-poster-thumb" />
            ) : (
              <span className="bb-social-compose-poster-empty" aria-hidden="true">
                <ImagePlus size={16} />
              </span>
            )}
            <span className="bb-social-compose-poster-copy">
              <strong>{posterUrl ? 'Change thumbnail' : 'Add thumbnail'}</strong>
              <span>16:9 crop</span>
            </span>
          </button>
          <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={onPoster} />

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
            <span>Description</span>
            <textarea
              className="native-control-input bb-social-compose-control bb-social-compose-caption"
              rows={4}
              value={caption}
              placeholder="What is this video about?"
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>
          <label className="bb-social-field">
            <span>Video URL</span>
            <input
              className="native-control-input bb-social-compose-control"
              value={mediaUrl}
              placeholder="https://…/video.mp4"
              onChange={(event) => setMediaUrl(event.target.value)}
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
          {error ? <p className="bb-social-compose-error">{error}</p> : null}
        </div>

        <footer className="bb-social-studio-sheet-footer">
          {onRemoveSocialPost ? (
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => {
                onRemoveSocialPost(post.id);
                onClose();
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="bb-social-studio-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bb-primary-btn" onClick={save} disabled={busy}>
              Save
            </button>
          </div>
        </footer>
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset="videoPoster"
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

/**
 * Studio video library — one tile per video with date + edit.
 */
export function SocialStudioVideoTiles({ posts, onUpdateSocialPost, onRemoveSocialPost }) {
  const [editingId, setEditingId] = useState('');

  if (!posts.length) {
    return (
      <div className="bb-public-empty">Nothing live yet — publish a video above.</div>
    );
  }

  const editing = posts.find((post) => post.id === editingId) || null;

  return (
    <>
      <div className="bb-social-video-tiles" role="list">
        {posts.map((post) => {
          const thumb = post.posterUrl || post.mediaUrl || '';
          return (
            <article key={post.id} className="bb-social-video-tile" role="listitem">
              <div className="bb-social-video-tile-thumb">
                {thumb ? <img src={thumb} alt="" /> : <span className="bb-social-video-tile-empty">No thumb</span>}
                {post.duration ? (
                  <span className="bb-social-video-tile-duration">{post.duration}</span>
                ) : null}
              </div>
              <div className="bb-social-video-tile-body">
                <h3 className="bb-social-video-tile-title">{post.title || 'Untitled video'}</h3>
                {post.caption ? (
                  <p className="bb-social-video-tile-caption">{post.caption}</p>
                ) : null}
                <p className="bb-social-video-tile-date">{formatPostStamp(post.createdAt)}</p>
              </div>
              <button
                type="button"
                className="bb-ghost-btn bb-social-video-tile-edit"
                onClick={() => setEditingId(post.id)}
              >
                <Pencil size={14} />
                Edit
              </button>
            </article>
          );
        })}
      </div>

      {editing ? (
        <VideoEditSheet
          post={editing}
          onClose={() => setEditingId('')}
          onUpdateSocialPost={onUpdateSocialPost}
          onRemoveSocialPost={onRemoveSocialPost}
        />
      ) : null}
    </>
  );
}
