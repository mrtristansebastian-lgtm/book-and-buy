import { useRef, useState } from 'react';
import { ImagePlus, Replace } from 'lucide-react';
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
        <h2 className="bb-social-compose-title">New post</h2>
        <p className="bb-social-compose-lede">Square photo and caption for the Posts tab.</p>
      </header>

      <div className="bb-social-compose-image-layout">
        <div className="bb-social-compose-media-col">
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
                <span className="bb-social-dropzone-icon" aria-hidden="true">
                  <ImagePlus size={22} />
                </span>
                <span className="bb-social-dropzone-label">{busy ? 'Uploading…' : 'Add photo'}</span>
                <span className="bb-social-dropzone-hint">JPG or PNG · square works best</span>
              </span>
            )}
          </button>
          {mediaUrl ? (
            <button
              type="button"
              className="bb-ghost-btn bb-social-compose-replace"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Replace size={14} />
              Replace photo
            </button>
          ) : null}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        </div>

        <div className="bb-social-compose-fields">
          <label className="bb-social-field">
            <span>Caption</span>
            <textarea
              className="native-control-input bb-social-compose-caption"
              rows={6}
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
