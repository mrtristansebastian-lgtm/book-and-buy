import { useState } from 'react';

export function TextPostComposer({ onAddSocialPost }) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setCaption('');
    setError('');
  };

  const publish = () => {
    if (!caption.trim()) {
      setError('Write something first.');
      return;
    }
    onAddSocialPost?.({
      type: 'text',
      title: title.trim(),
      caption: caption.trim(),
      published: true
    });
    reset();
  };

  return (
    <section className="bb-social-compose bb-social-compose--text">
      <header className="bb-social-compose-head">
        <h2 className="bb-social-compose-title">New article</h2>
        <p className="bb-social-compose-lede">Goes live immediately</p>
      </header>

      <div className="bb-social-compose-fields">
        <label className="bb-social-field">
          <span>Title</span>
          <input
            className="native-control-input bb-social-compose-control"
            value={title}
            placeholder="Article title (optional)"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="bb-social-field bb-social-field--grow">
          <span>Article</span>
          <textarea
            className="native-control-input bb-social-compose-control bb-social-compose-caption"
            rows={6}
            value={caption}
            placeholder="Write your article…"
            onChange={(event) => setCaption(event.target.value)}
          />
        </label>
        {error ? <p className="bb-social-compose-error">{error}</p> : null}
        <div className="bb-social-compose-actions">
          <button type="button" className="bb-primary-btn" onClick={publish}>
            Publish
          </button>
        </div>
      </div>
    </section>
  );
}
