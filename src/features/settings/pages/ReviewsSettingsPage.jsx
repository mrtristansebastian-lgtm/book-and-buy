import { useEffect, useRef, useState } from 'react';
import { fetchGooglePlaceReviews } from '../../../shared/firebase/integrations';
import { useWorkspace } from '../../workspace/WorkspaceContext';

const STALE_MS = 24 * 60 * 60 * 1000;

function formatSyncedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function isReviewsStale(syncedAt) {
  if (!syncedAt) return true;
  const time = new Date(syncedAt).getTime();
  if (Number.isNaN(time)) return true;
  return Date.now() - time > STALE_MS;
}

export function ReviewsSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const placeId = String(website.googlePlaceId || '').trim();
  const enabled =
    website.googleReviewsEnabled == null ? Boolean(placeId) : Boolean(website.googleReviewsEnabled);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const autoSyncedRef = useRef(false);

  const syncReviews = async ({ silent = false } = {}) => {
    if (busy) return;
    if (!placeId) {
      setError('Add a Google Place ID first.');
      setStatus('');
      return;
    }
    if (!enabled) {
      if (!silent) {
        setError('Turn on Google reviews sync to import.');
        setStatus('');
      }
      return;
    }

    setBusy(true);
    if (!silent) {
      setError('');
      setStatus('Syncing…');
    }

    try {
      const result = await fetchGooglePlaceReviews(placeId);
      if (!result.ok) {
        setError(result.reason || 'Could not sync Google reviews.');
        setStatus('');
        return;
      }

      const syncedAt = new Date().toISOString();
      updateWebsite({
        reviews: result.reviews.slice(0, 6),
        googleReviewsSyncedAt: syncedAt,
        googleReviewsEnabled: true,
        sections: {
          ...(website.sections || {}),
          reviews: true
        }
      });
      setError('');
      setStatus(
        `Synced ${result.reviews.length} review${result.reviews.length === 1 ? '' : 's'} · ${formatSyncedAt(syncedAt)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync Google reviews.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoSyncedRef.current) return;
    if (!enabled || !placeId) return;
    if (!isReviewsStale(website.googleReviewsSyncedAt)) {
      if (website.googleReviewsSyncedAt) {
        setStatus(`Last synced ${formatSyncedAt(website.googleReviewsSyncedAt)}`);
      }
      return;
    }
    autoSyncedRef.current = true;
    void syncReviews({ silent: true });
    // Intentional: auto-sync once when the Reviews settings page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, placeId, website.googleReviewsSyncedAt]);

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Google reviews</h2>
        <p className="bb-muted m-0 text-sm">
          Sync Place reviews into your public Home Reviews section. Visitors see the stored copy —
          not a live Places call.
        </p>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Google Place ID</span>
          <input
            className="native-control-input px-4"
            value={website.googlePlaceId || ''}
            placeholder="ChIJ…"
            onChange={(event) => {
              const next = event.target.value;
              const patch = { googlePlaceId: next };
              if (website.googleReviewsEnabled == null && next.trim()) {
                patch.googleReviewsEnabled = true;
              }
              updateWebsite(patch);
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              updateWebsite({ googleReviewsEnabled: event.target.checked })
            }
          />
          <span className="font-semibold">Show synced Google reviews on Home</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="bb-primary-btn"
            disabled={busy || !placeId || !enabled}
            onClick={() => void syncReviews()}
          >
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          {website.googleReviewsSyncedAt ? (
            <span className="bb-muted text-xs m-0">
              Last synced {formatSyncedAt(website.googleReviewsSyncedAt)}
            </span>
          ) : null}
        </div>

        {status ? <p className="bb-muted m-0 text-sm">{status}</p> : null}
        {error ? (
          <p className="m-0 text-sm" style={{ color: '#b42318' }}>
            {error}
          </p>
        ) : null}

        <p className="bb-muted m-0 text-xs">
          Auto-refreshes when this page opens if sync is enabled and the last sync is older than
          24 hours (or never ran). Synced reviews show on Home — manage them here, not in page
          edit mode. Turn sync off to curate reviews manually on Home.
        </p>
      </section>
    </div>
  );
}
