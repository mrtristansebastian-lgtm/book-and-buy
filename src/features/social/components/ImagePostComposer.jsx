import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';

export function ImagePostComposer({ onAddSocialPost }) {
  const fileRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMediaUrl('');
    setCaption('');
    setError('');
  };

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, 'social');
      setMediaUrl(result.url || '');
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = (published) => {
    if (!mediaUrl.trim()) {
      setError('Add a photo first.');
      return;
    }
    onAddSocialPost?.({
      type: 'image',
      mediaUrl: mediaUrl.trim(),
      caption: caption.trim(),
      published
    });
    reset();
  };

  return (
    <section className="bb-social-compose bb-social-compose--image">
      <header className="bb-social-compose-head">
        <h2 className="bb-page-title text-xl m-0">New post</h2>
        <p className="bb-muted m-0 text-sm">Square photo + caption. Drafts stay off the live feed.</p>
      </header>

      <div className="bb-social-compose-image-layout">
        <button
          type="button"
          className={`bb-social-dropzone bb-social-dropzone--square ${mediaUrl ? 'has-media' : ''}`}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {mediaUrl ? (
            <img src={mediaUrl} alt="" />
          ) : (
            <span className="bb-social-dropzone-empty">
              <ImagePlus size={22} />
              {busy ? 'Uploading…' : 'Add photo'}
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

        <div className="bb-social-compose-fields">
          <label className="bb-social-field">
            <span>Caption</span>
            <textarea
              className="native-control-input px-4 py-3"
              rows={4}
              value={caption}
              placeholder="Write a caption…"
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>
          {error ? <p className="bb-social-compose-error">{error}</p> : null}
          <div className="bb-social-compose-actions">
            <button type="button" className="bb-ghost-btn" onClick={() => submit(false)} disabled={busy}>
              Save draft
            </button>
            <button type="button" className="bb-primary-btn" onClick={() => submit(true)} disabled={busy}>
              Publish
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
