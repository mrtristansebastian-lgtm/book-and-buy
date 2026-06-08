import { CheckCircle2, Globe, Share2, X } from 'lucide-react';

export const EditorLaunchControls = ({
  bookingPageRoute,
  bookingPageUrl,
  copyToClipboard,
  editorLaunchPanel,
  onOpenBookingPage,
  onSave,
  setEditorLaunchPanel
}) => (
  <>
    {editorLaunchPanel && (
      <div className="editor-floating-launch-popover">
        <div className="editor-launch-popover-head">
          <div>
            <span>Booking page</span>
            <strong>{bookingPageRoute}</strong>
          </div>
          <button type="button" onClick={() => setEditorLaunchPanel(null)} aria-label="Close editor panel">
            <X size={14} />
          </button>
        </div>
        <div className="editor-launch-popover-body">
          <button type="button" onClick={() => copyToClipboard(bookingPageUrl, 'Booking page link')} className="editor-link-pill" title={bookingPageUrl}>
            <span>{bookingPageUrl}</span>
            <Share2 size={13} />
          </button>
          <div className="editor-launch-actions">
            <button type="button" onClick={() => copyToClipboard(bookingPageUrl, 'Booking page link')}>Copy link</button>
            <button type="button" onClick={onOpenBookingPage}>Open page</button>
          </div>
        </div>
      </div>
    )}
    <div className="editor-floating-launch-toolbar">
      <button type="button" onClick={() => setEditorLaunchPanel(panel => panel === 'booking' ? null : 'booking')} className={editorLaunchPanel === 'booking' ? 'is-active' : ''} aria-label="Booking page link" title="Booking page link">
        <Globe size={16} />
        <span className="editor-launch-action-label">Page</span>
      </button>
      <button type="button" onClick={onSave} className="is-primary" aria-label="Save booking page" title="Save booking page">
        <CheckCircle2 size={16} />
        <span className="editor-launch-action-label">Save</span>
      </button>
    </div>
  </>
);
