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

function PostEditSheet({ post, onClose, onUpdateSocialPost, onRemoveSocialPost }) {
  const fileRef = useRef(null);
  const [title, setTitle] = useState(post.title || '');
  const [caption, setCaption] = useState(post.caption || '');
  const [mediaUrl, setMediaUrl] = useState(post.mediaUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');

  useEffect(() => {
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setMediaUrl(post.mediaUrl || '');
    setError('');
  }, [post]);

  const onPick = (event) => {
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
      setMediaUrl(result.url || '');
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
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
      type: 'image'
    });
    onClose();
  };

  return (
    <div className="bb-social-studio-sheet" role="dialog" aria-modal="true" aria-label="Edit post">
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel">
        <header className="bb-social-studio-sheet-head">
          <div>
            <p className="bb-social-studio-sheet-eyebrow">Edit post</p>
            <h3 className="bb-social-studio-sheet-title">{title.trim() || 'Untitled post'}</h3>
          </div>
          <button type="button" className="bb-ghost-btn bb-social-studio-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-social-studio-sheet-body">
          <button
            type="button"
            className={`bb-social-dropzone bb-social-dropzone--portrait bb-social-studio-sheet-thumb ${
              mediaUrl ? 'has-media' : ''
            }`}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {mediaUrl ? (
              <img src={mediaUrl} alt="" />
            ) : (
              <span className="bb-social-dropzone-empty">
                <span className="bb-social-dropzone-icon" aria-hidden="true">
                  <ImagePlus size={18} />
                </span>
                <span className="bb-social-dropzone-label">Add photo</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

          <label className="bb-social-field">
            <span>Title</span>
            <input
              className="native-control-input bb-social-compose-control"
              value={title}
              placeholder="Post title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="bb-social-field">
            <span>Caption</span>
            <textarea
              className="native-control-input bb-social-compose-control bb-social-compose-caption"
              rows={4}
              value={caption}
              placeholder="Write a caption…"
              onChange={(event) => setCaption(event.target.value)}
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
        preset="socialPost"
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
 * Studio posts library — compact tiles with date/time + edit.
 */
export function SocialStudioPostTiles({ posts, onUpdateSocialPost, onRemoveSocialPost }) {
  const [editingId, setEditingId] = useState('');

  if (!posts.length) {
    return (
      <div className="bb-public-empty">Nothing live yet — publish a photo above.</div>
    );
  }

  const editing = posts.find((post) => post.id === editingId) || null;

  return (
    <>
      <div className="bb-social-post-tiles" role="list">
        {posts.map((post) => {
          const src = post.mediaUrl || '';
          return (
            <article key={post.id} className="bb-social-post-tile" role="listitem">
              <div className="bb-social-post-tile-thumb">
                {src ? (
                  <img src={src} alt="" />
                ) : (
                  <span className="bb-social-post-tile-empty">No image</span>
                )}
              </div>
              <div className="bb-social-post-tile-body">
                <h3 className="bb-social-post-tile-title">{post.title || 'Untitled post'}</h3>
                {post.caption ? (
                  <p className="bb-social-post-tile-caption">{post.caption}</p>
                ) : null}
                <p className="bb-social-post-tile-date">{formatPostStamp(post.createdAt)}</p>
              </div>
              <button
                type="button"
                className="bb-ghost-btn bb-social-post-tile-edit"
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
        <PostEditSheet
          post={editing}
          onClose={() => setEditingId('')}
          onUpdateSocialPost={onUpdateSocialPost}
          onRemoveSocialPost={onRemoveSocialPost}
        />
      ) : null}
    </>
  );
}
