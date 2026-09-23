import { ChevronLeft, ChevronRight, UploadCloud, X } from 'lucide-react';
import { ImageCropModal } from '../../../media/ImageCropModal';
import { VideoThumbnailPicker } from '../VideoThumbnailPicker';
import { formatDurationLabel, POST_CLIP_MAX_SECONDS } from '../../utils/socialPostType';
import { StepRail } from './StepRail';
import { UploadOverlay } from './UploadOverlay';
import { ErrorBanner } from './ErrorBanner';
import { ComposerMediaStep } from './ComposerMediaStep';
import { ComposerDetailsStep } from './ComposerDetailsStep';
import { ComposerReviewStep } from './ComposerReviewStep';
import { ComposerImageEdit } from './ComposerImageEdit';
import { ComposerVideoEdit } from './ComposerVideoEdit';
import { ComposerTextStep } from './ComposerTextStep';
import { useBlogComposer } from './useBlogComposer';

/**
 * Unified create/edit composer. Media uploads in the background as soon as it is
 * picked, so publishing only writes the resulting URLs.
 */
export function BlogComposerSheet(props) {
  const c = useBlogComposer(props);
  const {
    type,
    isEdit,
    isLongVideo,
    videoNoun,
    meta,
    sheetTitle,
    steps,
    stepIndex,
    dragActive,
    uploadScreenOpen,
    uploadPhase,
    summary,
    uploadRows,
    panelRef,
    requestClose,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    busy,
    error,
    skips,
    setError,
    setSkips,
    confirmDiscard,
    setConfirmDiscard,
    discardAndClose,
    cropOpen,
    cropSource,
    cropPreset,
    fileNameHint,
    closeCrop,
    onCropConfirm,
    coverPickerOpen,
    setCoverPickerOpen,
    videoFile,
    mediaUrl,
    durationSeconds,
    videoAspect,
    posterUrl,
    applyVideoPoster,
    posterRef,
    onPosterPick,
    items,
    applyCoverPoster,
    coverPosterRef,
    mediaRef,
    onPostMediaPick,
    goBack,
    goNext,
    onLastStep,
    publish,
    publishDisabled,
    onRemoveSocialPost,
    post,
    onClose
  } = c;

  return (
    <div
      className={`bb-social-studio-sheet bb-social-studio-sheet--composer bb-composer-sheet bb-composer-sheet--${type}`}
      role="dialog"
      aria-modal="true"
      aria-label={sheetTitle}
    >
      <div className="bb-social-studio-sheet-backdrop" onClick={requestClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bb-social-studio-sheet-panel bb-social-studio-sheet-panel--composer bb-composer-panel${
          dragActive ? ' is-drag-active' : ''
        }${uploadScreenOpen ? ' is-uploading' : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <UploadOverlay
          open={uploadScreenOpen}
          phase={uploadPhase}
          progress={summary.progress}
          activeCount={summary.activeCount}
          total={summary.total}
          rows={uploadRows}
        />
        <header className="bb-social-studio-sheet-head bb-composer-head">
          <div className="bb-blog-composer-head-copy">
            <p className="bb-social-studio-sheet-eyebrow">
              {isEdit ? meta.eyebrowEdit : meta.eyebrowCreate}
            </p>
            <h3 className="bb-social-studio-sheet-title">{sheetTitle}</h3>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-social-studio-sheet-close"
            aria-label="Close composer"
            onClick={requestClose}
          >
            <X size={16} />
          </button>
        </header>

        {steps.length && !isEdit ? <StepRail steps={steps} index={stepIndex} /> : null}

        <div className="bb-social-studio-sheet-body bb-composer-body">
          {type === 'image' && isEdit ? <ComposerImageEdit c={c} /> : null}

          {type === 'image' && !isEdit ? (
            <div className="bb-composer-image">
              {stepIndex === 0 ? <ComposerMediaStep c={c} /> : null}
              {stepIndex === 1 ? <ComposerDetailsStep c={c} /> : null}
              {stepIndex === 2 ? <ComposerReviewStep c={c} /> : null}
              <input
                ref={mediaRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={onPostMediaPick}
              />
            </div>
          ) : null}

          {isLongVideo && isEdit ? <ComposerVideoEdit c={c} /> : null}

          {isLongVideo && !isEdit ? (
            <div className="bb-composer-video">
              {stepIndex === 0 ? <ComposerMediaStep c={c} /> : null}
              {stepIndex === 1 ? <ComposerReviewStep c={c} /> : null}
            </div>
          ) : null}

          {type === 'text' ? <ComposerTextStep c={c} /> : null}

          <ErrorBanner
            message={error}
            skips={skips}
            onDismiss={() => {
              setError('');
              setSkips([]);
            }}
          />
        </div>

        <footer className="bb-social-studio-sheet-footer bb-blog-composer-footer">
          {summary.busy && !uploadScreenOpen ? (
            <div className="bb-composer-upload-bar" aria-live="polite">
              <div className="bb-composer-upload-track">
                <span style={{ width: `${Math.round(summary.progress * 100)}%` }} />
              </div>
              <span className="bb-composer-upload-copy">
                Uploading {summary.activeCount} of {summary.total} ·{' '}
                {Math.round(summary.progress * 100)}%
              </span>
            </div>
          ) : null}

          <div className="bb-composer-footer-row">
            <div className="bb-blog-composer-footer-left">
              {isEdit && onRemoveSocialPost ? (
                <button
                  type="button"
                  className="bb-ghost-btn bb-blog-composer-delete"
                  onClick={() => {
                    onRemoveSocialPost(post.id);
                    onClose?.();
                  }}
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
            </div>
            <div className="bb-social-studio-sheet-footer-actions">
              {type !== 'text' && !isEdit && stepIndex > 0 ? (
                <button type="button" className="bb-ghost-btn" onClick={goBack} disabled={busy}>
                  <ChevronLeft size={16} strokeWidth={2.2} />
                  Back
                </button>
              ) : (
                <button type="button" className="bb-ghost-btn" onClick={requestClose}>
                  Cancel
                </button>
              )}
              {onLastStep ? (
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={publish}
                  disabled={publishDisabled}
                >
                  {busy ? 'Publishing…' : 'Publish'}
                </button>
              ) : (
                <button type="button" className="bb-primary-btn" onClick={goNext} disabled={busy}>
                  Next
                  <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>
        </footer>

        {dragActive ? (
          <div className="bb-composer-drop-overlay" aria-hidden="true">
            <UploadCloud size={30} strokeWidth={2} />
            <strong>Drop to add</strong>
            <span>
              {isLongVideo
                ? `One ${videoNoun} file`
                : `Photos and clips to ${formatDurationLabel(POST_CLIP_MAX_SECONDS)}`}
            </span>
          </div>
        ) : null}

        {confirmDiscard ? (
          <div className="bb-composer-confirm" role="alertdialog" aria-label="Discard post">
            <div className="bb-composer-confirm-card">
              <h4>Discard this post?</h4>
              <p>Your media and text will be lost. Uploads in progress will stop.</p>
              <div className="bb-composer-confirm-actions">
                <button
                  type="button"
                  className="bb-ghost-btn"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="bb-primary-btn bb-composer-confirm-discard"
                  onClick={discardAndClose}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset={cropPreset}
        fileNameHint={fileNameHint}
        onCancel={() => {
          if (busy) return;
          closeCrop();
        }}
        onConfirm={onCropConfirm}
      />

      {coverPickerOpen ? (
        <div
          className="bb-cover-picker-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Choose cover"
        >
          <button
            type="button"
            className="bb-cover-picker-backdrop"
            aria-label="Close cover picker"
            onClick={() => setCoverPickerOpen(false)}
          />
          <div className="bb-cover-picker-panel">
            <header className="bb-cover-picker-head">
              <div>
                <p className="bb-cover-picker-eyebrow">Cover</p>
                <h3 className="bb-cover-picker-title">Choose a frame</h3>
              </div>
              <button
                type="button"
                className="bb-ghost-btn bb-cover-picker-close"
                aria-label="Close"
                onClick={() => setCoverPickerOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="bb-cover-picker-body">
              {isLongVideo ? (
                <VideoThumbnailPicker
                  videoFile={videoFile}
                  videoUrl={mediaUrl}
                  durationSeconds={durationSeconds}
                  aspectRatio={videoAspect}
                  posterUrl={posterUrl}
                  busy={busy}
                  onFrameChosen={applyVideoPoster}
                  onUploadOwn={() => posterRef.current?.click()}
                />
              ) : items[0]?.kind === 'video' ? (
                <VideoThumbnailPicker
                  videoFile={items[0].file || null}
                  videoUrl={items[0].url}
                  durationSeconds={
                    items[0].sourceDurationSeconds || items[0].durationSeconds || 0
                  }
                  aspectRatio={items[0].aspectRatio}
                  posterUrl={items[0].posterUrl}
                  busy={busy}
                  onFrameChosen={(file) => applyCoverPoster(items[0].id, file)}
                  onUploadOwn={() => coverPosterRef.current?.click()}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={posterRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPosterPick}
      />
    </div>
  );
}
