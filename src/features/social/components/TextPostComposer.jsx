import { useState } from 'react';

/**
 * Editorial article composer — matches live Business Blog notes.
 */
export function TextPostComposer({ onAddSocialPost }) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setCaption('');
    setError('');
  };

  const submit = (published) => {
    if (!caption.trim()) {
      setError('Write something first.');
      return;
    }
    onAddSocialPost?.({
      type: 'text',
      title: title.trim(),
      caption: caption.trim(),
      published
    });
    reset();
  };

  const nowLabel = new Date().toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <section className="bb-social-compose bb-social-compose--text">
      <header className="bb-social-compose-head">
        <h2 className="bb-social-compose-title">New article</h2>
        <p className="bb-social-compose-lede">
          Write a note that will appear on the Articles tab exactly as previewed below.
        </p>
      </header>

      <div className="bb-social-compose-note">
        <div className="bb-social-compose-note-meta">
          <span className="bb-social-compose-note-stamp">{nowLabel}</span>
          <span className="bb-social-note-mark bb-public-native-fill" aria-hidden="true" />
          <span className="bb-edit-section-badge">Drafting</span>
        </div>
        <input
          className="bb-social-compose-note-title"
          value={title}
          placeholder="Title (optional)"
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className="bb-social-compose-note-body"
          rows={5}
          value={caption}
          placeholder="Write your article…"
          onChange={(event) => setCaption(event.target.value)}
        />
        {error ? <p className="bb-social-compose-error">{error}</p> : null}
        <div className="bb-social-compose-actions">
          <button type="button" className="bb-ghost-btn" onClick={() => submit(false)}>
            Save draft
          </button>
          <button type="button" className="bb-primary-btn" onClick={() => submit(true)}>
            Publish
          </button>
        </div>
      </div>
    </section>
  );
}
