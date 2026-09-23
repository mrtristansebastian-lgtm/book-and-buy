import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';
import { socialMutations } from '../socialApi';

const STATUS_TABS = ['open', 'reviewing', 'appealed', 'resolved', 'dismissed'];

function formatStamp(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(value)));
}

export function SocialModerationAdminPage() {
  const [status, setStatus] = useState('open');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async ({ append = false } = {}) => {
    setLoading(true);
    setError('');
    try {
      const result = await socialMutations.listModerationCases({
        status,
        cursor: append ? cursor : null,
        pageSize: 30
      });
      setItems((current) => append ? [...current, ...(result?.items || [])] : result?.items || []);
      setCursor(result?.nextCursor || null);
      setHasMore(Boolean(result?.hasMore));
    } catch (nextError) {
      setError(nextError?.message || 'Moderation cases could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [cursor, status]);

  useEffect(() => {
    setCursor(null);
    load();
  }, [status]);

  const resolve = async (item, action) => {
    setWorkingId(item.id);
    setError('');
    try {
      await socialMutations.resolveModerationCase({ caseId: item.id, action });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (nextError) {
      setError(nextError?.message || 'That action could not be completed.');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <main className="bb-social-admin">
      <header className="bb-social-admin-head">
        <span className="bb-social-admin-mark"><ShieldCheck size={24} /></span>
        <div>
          <p>Platform operations</p>
          <h1>Social moderation</h1>
          <span>Reports, appeals, account safety, and an immutable review trail.</span>
        </div>
        <button type="button" className="bb-social-admin-refresh" onClick={() => load()} aria-label="Refresh cases">
          <RefreshCw size={18} /> Refresh
        </button>
      </header>

      <nav className="bb-social-admin-tabs" aria-label="Moderation case status">
        {STATUS_TABS.map((value) => (
          <button key={value} type="button" className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>
            {value}
          </button>
        ))}
      </nav>

      {error ? <div className="bb-social-admin-error" role="alert"><AlertTriangle size={17} />{error}</div> : null}

      <section className="bb-social-admin-list" aria-live="polite">
        {!loading && !items.length ? (
          <div className="bb-social-admin-empty"><ShieldCheck size={28} /><strong>No {status} cases</strong><span>This queue is clear.</span></div>
        ) : items.map((item) => (
          <article key={item.id} className="bb-social-admin-case">
            <div className="bb-social-admin-case-copy">
              <span className={`bb-social-admin-priority is-${item.priority || 'normal'}`}>{item.priority || 'normal'}</span>
              <h2>{String(item.subjectType || 'content')} report</h2>
              <p><strong>{String(item.reason || 'Other').replaceAll('_', ' ')}</strong>{item.details ? ` — ${item.details}` : ''}</p>
              <dl>
                <div><dt>Target</dt><dd>{item.subjectId}</dd></div>
                <div><dt>Reported</dt><dd>{formatStamp(item.createdAtMs)}</dd></div>
                <div><dt>Case</dt><dd>{item.id}</dd></div>
              </dl>
            </div>
            <div className="bb-social-admin-case-actions">
              {item.businessSlug && item.postId ? (
                <button type="button" onClick={() => navigate(publicItemPath(item.businessSlug, 'social', item.postId))}>
                  <ExternalLink size={15} /> Review content
                </button>
              ) : null}
              <button type="button" disabled={workingId === item.id} onClick={() => resolve(item, 'remove')}>
                <X size={15} /> Remove
              </button>
              <button type="button" disabled={workingId === item.id} onClick={() => resolve(item, 'warn')}>Warn</button>
              <button type="button" disabled={workingId === item.id} onClick={() => resolve(item, 'suspend')}>Suspend</button>
              <button type="button" disabled={workingId === item.id} onClick={() => resolve(item, 'dismiss')}>
                <Check size={15} /> Dismiss
              </button>
            </div>
          </article>
        ))}
        {loading ? <div className="bb-social-admin-loading">Loading moderation cases…</div> : null}
      </section>

      {hasMore && !loading ? <button type="button" className="bb-social-admin-more" onClick={() => load({ append: true })}>Load more</button> : null}
    </main>
  );
}
