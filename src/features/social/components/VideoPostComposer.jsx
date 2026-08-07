import { useRef, useState } from 'react';
import { Film, ImagePlus, Replace } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';

export function VideoPostComposer({ onAddSocialPost }) {
  const videoRef = useRef(null);
  const posterRef = useRef(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [duration, setDuration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMediaUrl('');
    setPosterUrl('');
    setTitle('');
    setCaption('');
    setDuration('');
    setError('');
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

  const onPoster = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, 'social');
      setPosterUrl(result.url || '');
    } catch (err) {
      setError(err?.message || 'Poster upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = (published) => {
    if (!mediaUrl.trim()) {
      setError('Add a video file or URL.');
      return;
    }
    onAddSocialPost?.({
      type: 'video',
      mediaUrl: mediaUrl.trim(),
      posterUrl: posterUrl.trim(),
      title: title.trim() || 'Untitled video',
      caption: caption.trim(),
      duration: duration.trim(),
      published
    });
    reset();
  };

  const durableUrl = mediaUrl.startsWith('blob:') ? '' : mediaUrl;

  return (
    <section className="bb-social-compose bb-social-compose--video">
      <header className="bb-social-compose-head">
        <h2 className="bb-social-compose-title">Upload video</h2>
        <p className="bb-social-compose-lede">
          Preview locally from a file, or paste a durable link for sharing.
        </p>
      </header>

      <div className="bb-social-compose-video-layout">
        <div className="bb-social-compose-video-preview">
          {mediaUrl ? (
            <>
              <video
                className="bb-social-compose-player"
                controls
                playsInline
                poster={posterUrl || undefined}
                src={mediaUrl}
              />
              <button
                type="button"
                className="bb-ghost-btn bb-social-compose-replace"
                onClick={() => videoRef.current?.click()}
              >
                <Replace size={14} />
                Replace video
              </button>
            </>
          ) : (
            <button
              type="button"
              className="bb-social-dropzone bb-social-dropzone--video"
              onClick={() => videoRef.current?.click()}
            >
              <span className="bb-social-dropzone-empty">
                <span className="bb-social-dropzone-icon" aria-hidden="true">
                  <Film size={22} />
                </span>
                <span className="bb-social-dropzone-label">Choose video</span>
                <span className="bb-social-dropzone-hint">MP4 or WebM · 16:9 preview</span>
              </span>
            </button>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={onVideoFile} />
        </div>

        <div className="bb-social-compose-fields">
          <label className="bb-social-field">
            <span>Title</span>
            <input
              className="native-control-input px-4"
              value={title}
              placeholder="Video title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="bb-social-field">
            <span>Description</span>
            <textarea
              className="native-control-input bb-social-compose-caption"
              rows={3}
              value={caption}
              placeholder="Tell viewers what this is about…"
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>

          <div className="bb-social-compose-meta-grid">
            <label className="bb-social-field">
              <span>Video URL</span>
              <input
                className="native-control-input px-4"
                value={durableUrl}
                placeholder="https://…/video.mp4"
                onChange={(event) => setMediaUrl(event.target.value)}
              />
            </label>
            <label className="bb-social-field bb-social-field--short">
              <span>Duration</span>
              <input
                className="native-control-input px-4"
                value={duration}
                placeholder="3:42"
                onChange={(event) => setDuration(event.target.value)}
              />
            </label>
          </div>

          <div className="bb-social-compose-poster">
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
                <strong>{posterUrl ? 'Change poster' : 'Add poster'}</strong>
                <span>Thumbnail shown in the Videos list</span>
              </span>
            </button>
            <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={onPoster} />
          </div>

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
