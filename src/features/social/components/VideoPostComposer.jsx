import { useRef, useState } from 'react';
import { Film, ImagePlus, Replace } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';

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
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');

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

  const onPoster = (event) => {
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

  const publish = () => {
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
      published: true
    });
    reset();
  };

  const durableUrl = mediaUrl.startsWith('blob:') ? '' : mediaUrl;

  return (
    <section className="bb-social-compose bb-social-compose--video">
      <header className="bb-social-compose-head">
        <h2 className="bb-social-compose-title">New video</h2>
        <p className="bb-social-compose-lede">16:9 · goes live immediately</p>
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
                Replace
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
                  <Film size={20} />
                </span>
                <span className="bb-social-dropzone-label">Choose video</span>
                <span className="bb-social-dropzone-hint">MP4 or WebM</span>
              </span>
            </button>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={onVideoFile} />
        </div>

        <div className="bb-social-compose-fields">
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
              rows={3}
              value={caption}
              placeholder="What is this video about?"
              onChange={(event) => setCaption(event.target.value)}
            />
          </label>
          <label className="bb-social-field">
            <span>Video URL</span>
            <input
              className="native-control-input bb-social-compose-control"
              value={durableUrl}
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
              <span>16:9 crop</span>
            </span>
          </button>
          <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={onPoster} />

          {error ? <p className="bb-social-compose-error">{error}</p> : null}
          <div className="bb-social-compose-actions">
            <button type="button" className="bb-primary-btn" onClick={publish} disabled={busy}>
              Publish
            </button>
          </div>
        </div>
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
    </section>
  );
}
