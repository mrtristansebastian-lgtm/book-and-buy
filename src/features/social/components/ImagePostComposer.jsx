import { useRef, useState } from 'react';
import { ImagePlus, Replace } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';

export function ImagePostComposer({ onAddSocialPost }) {
  const fileRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');

  const reset = () => {
    setMediaUrl('');
    setTitle('');
    setCaption('');
    setError('');
  };

  const onPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
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

  const submit = (published) => {
    if (!mediaUrl.trim()) {
      setError('Add a photo first.');
      return;
    }
    onAddSocialPost?.({
      type: 'image',
      mediaUrl: mediaUrl.trim(),
      title: title.trim(),
      caption: caption.trim(),
      published
    });
    reset();
  };

  return (
    <section className="bb-social-compose bb-social-compose--image">
      <header className="bb-social-compose-head">
        <h2 className="bb-social-compose-title">New post</h2>
        <p className="bb-social-compose-lede">
          Crop to Instagram 4:5, then publish into the same gallery clients see live.
        </p>
      </header>

      <div className="bb-social-compose-image-layout">
        <div className="bb-social-compose-media-col">
          <button
            type="button"
            className={`bb-social-dropzone bb-social-dropzone--portrait ${mediaUrl ? 'has-media' : ''}`}
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
                <span className="bb-social-dropzone-hint">JPG or PNG · 4:5 portrait</span>
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
            <span>Title</span>
            <input
              className="native-control-input"
              value={title}
              placeholder="Post title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
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
    </section>
  );
}
