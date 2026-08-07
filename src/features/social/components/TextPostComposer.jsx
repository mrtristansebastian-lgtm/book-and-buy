import { useState } from 'react';

export function TextPostComposer({ brandName = 'Business', onAddSocialPost }) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  const initial = String(brandName || 'B')
    .trim()
    .charAt(0)
    .toUpperCase();

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

  return (
    <section className="bb-social-compose bb-social-compose--text">
      <header className="bb-social-compose-head">
        <h2 className="bb-page-title text-xl m-0">New text update</h2>
        <p className="bb-muted m-0 text-sm">Short notes for the Text tab on your public Social page.</p>
      </header>

      <div className="bb-social-compose-tweet">
        <div className="bb-social-text-avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="bb-social-compose-fields">
          <input
            className="bb-social-compose-kicker-input"
            value={title}
            placeholder="Kicker (optional)"
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="bb-social-compose-tweet-input"
            rows={4}
            value={caption}
            placeholder="What’s happening?"
            onChange={(event) => setCaption(event.target.value)}
          />
          {error ? <p className="bb-social-compose-error">{error}</p> : null}
          <div className="bb-social-compose-actions">
            <button type="button" className="bb-ghost-btn" onClick={() => submit(false)}>
              Save draft
            </button>
            <button type="button" className="bb-primary-btn" onClick={() => submit(true)}>
              Post
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
