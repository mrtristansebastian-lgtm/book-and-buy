import { Check, Film, ImagePlus, Loader2 } from 'lucide-react';

function uploadStatusLabel(status) {
  if (status === 'preparing') return 'Preparing';
  if (status === 'uploading') return 'Uploading';
  if (status === 'queued') return 'Waiting';
  if (status === 'done') return 'Ready';
  if (status === 'error') return 'Failed';
  return '';
}

/**
 * Full-panel upload screen so picking media never feels like a black box.
 * Crossfades between preparing → uploading → brief “All set”.
 */
export function UploadOverlay({
  open = false,
  phase = 'idle',
  progress = 0,
  activeCount = 0,
  total = 0,
  rows = []
}) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const title =
    phase === 'ready'
      ? 'All set'
      : phase === 'preparing'
        ? 'Preparing media…'
        : total > 1
          ? `Uploading ${activeCount} of ${total}`
          : 'Uploading…';
  const detail =
    phase === 'ready'
      ? 'Your media is ready to publish'
      : phase === 'preparing'
        ? 'Reading files and building previews'
        : `${pct}% complete`;

  return (
    <div
      className={`bb-composer-upload-screen${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-live="polite"
    >
      <div className="bb-composer-upload-screen-card">
        <div className="bb-composer-upload-screen-hero">
          {phase === 'ready' ? (
            <span className="bb-composer-upload-screen-done" aria-hidden="true">
              <Check size={28} strokeWidth={2.6} />
            </span>
          ) : phase === 'preparing' ? (
            <Loader2 size={28} className="bb-spin bb-composer-upload-screen-spinner" aria-hidden="true" />
          ) : (
            <span className="bb-composer-upload-screen-pct">{pct}%</span>
          )}
          <div className="bb-composer-upload-screen-copy">
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        </div>

        <div
          className={`bb-composer-upload-screen-track${
            phase === 'preparing' ? ' is-indeterminate' : ''
          }`}
        >
          <span
            style={
              phase === 'preparing'
                ? undefined
                : { width: phase === 'ready' ? '100%' : `${pct}%` }
            }
          />
        </div>

        {rows.length ? (
          <ul className="bb-composer-upload-screen-list">
            {rows.map((row) => (
              <li key={row.id} className={`is-${row.status || 'queued'}`}>
                <div className="bb-composer-upload-screen-row">
                  <span className="bb-composer-upload-screen-thumb" aria-hidden="true">
                    {row.thumb ? (
                      <img src={row.thumb} alt="" />
                    ) : row.kind === 'video' ? (
                      <Film size={14} strokeWidth={2.2} />
                    ) : (
                      <ImagePlus size={14} strokeWidth={2.2} />
                    )}
                  </span>
                  <div className="bb-composer-upload-screen-meta">
                    <strong>{row.label}</strong>
                    <span>{uploadStatusLabel(row.status)}</span>
                  </div>
                  <span className="bb-composer-upload-screen-row-pct">
                    {row.status === 'done'
                      ? '100%'
                      : row.status === 'error'
                        ? '!'
                        : `${Math.round((row.progress || 0) * 100)}%`}
                  </span>
                </div>
                <div className="bb-composer-upload-screen-row-track">
                  <span
                    style={{
                      width: `${Math.round(
                        (row.status === 'done' ? 1 : row.progress || 0) * 100
                      )}%`
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
