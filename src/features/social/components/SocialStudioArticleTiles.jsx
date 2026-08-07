import { useEffect, useState } from 'react';
import { Pencil, Type, X } from 'lucide-react';

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

function TextUpdateEditSheet({ post, onClose, onUpdateSocialPost, onRemoveSocialPost }) {
  const [title, setTitle] = useState(post.title || '');
  const [caption, setCaption] = useState(post.caption || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(post.title || '');
    setCaption(post.caption || '');
    setError('');
  }, [post]);

  const save = () => {
    if (!caption.trim()) {
      setError('Write something first.');
      return;
    }
    onUpdateSocialPost?.(post.id, {
      title: title.trim(),
      caption: caption.trim(),
      type: 'text'
    });
    onClose();
  };

  return (
    <div className="bb-social-studio-sheet" role="dialog" aria-modal="true" aria-label="Edit text update">
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel">
        <header className="bb-social-studio-sheet-head">
          <div>
            <p className="bb-social-studio-sheet-eyebrow">Edit text update</p>
            <h3 className="bb-social-studio-sheet-title">{title.trim() || 'Untitled update'}</h3>
          </div>
          <button type="button" className="bb-ghost-btn bb-social-studio-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-social-studio-sheet-body">
          <label className="bb-social-field">
            <span>Title</span>
            <input
              className="native-control-input bb-social-compose-control"
              value={title}
              placeholder="Title (optional)"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="bb-social-field">
            <span>Update</span>
            <textarea
              className="native-control-input bb-social-compose-control bb-social-compose-caption"
              rows={8}
              value={caption}
              placeholder="Write your update…"
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
            <button type="button" className="bb-primary-btn" onClick={save}>
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Studio text-update library — compact tiles with date/time + edit sheet.
 */
export function SocialStudioArticleTiles({ posts, onUpdateSocialPost, onRemoveSocialPost }) {
  const [editingId, setEditingId] = useState('');

  if (!posts.length) {
    return (
      <div className="bb-public-empty">Nothing live yet — publish a text update above.</div>
    );
  }

  const editing = posts.find((post) => post.id === editingId) || null;

  return (
    <>
      <div className="bb-social-article-tiles" role="list">
        {posts.map((post) => (
          <article key={post.id} className="bb-social-article-tile" role="listitem">
            <div className="bb-social-article-tile-thumb" aria-hidden="true">
              <Type size={16} strokeWidth={2.2} />
            </div>
            <div className="bb-social-article-tile-body">
              <h3 className="bb-social-article-tile-title">{post.title || 'Untitled update'}</h3>
              {post.caption ? (
                <p className="bb-social-article-tile-caption">{post.caption}</p>
              ) : null}
              <p className="bb-social-article-tile-date">{formatPostStamp(post.createdAt)}</p>
            </div>
            <button
              type="button"
              className="bb-ghost-btn bb-social-article-tile-edit"
              onClick={() => setEditingId(post.id)}
            >
              <Pencil size={14} />
              Edit
            </button>
          </article>
        ))}
      </div>

      {editing ? (
        <TextUpdateEditSheet
          post={editing}
          onClose={() => setEditingId('')}
          onUpdateSocialPost={onUpdateSocialPost}
          onRemoveSocialPost={onRemoveSocialPost}
        />
      ) : null}
    </>
  );
}
