import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, LoaderCircle, RotateCcw, X, ShoppingBag } from 'lucide-react';
import { navigate, workspacePagePath } from '../../../app/routing';
import { Button } from '../../../shared/ui/Button';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PublicCartProvider, usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import { buildBuilderCommerceContext, resolveBuilderCommerceAction } from '../builderCommerce';
import '../builder-page.css';
import { AIConnectionsDialog } from '../AIConnectionsDialog';
import { builderCallable, executeBuilderRuntime } from '../builderRuntime';
import { listAIConnections, listAIModels, runAI } from '../../../shared/firebase/aiGateway';

/** The builder owns its editor controls; the workspace supplies navigation. */
export function WebsiteBuilderPage() {
  return <PublicCartProvider><ConnectedWebsiteBuilder /></PublicCartProvider>;
}

function ConnectedWebsiteBuilder() {
  const { workspace } = useWorkspace();
  const cart = usePublicCart();
  const frameRef = useRef(null);
  const dialogRef = useRef(null);
  const [commercePanel, setCommercePanel] = useState(null);
  const [commerceError, setCommerceError] = useState('');
  const [aiDialog, setAiDialog] = useState(null);
  const activeRequests = useRef(new Map());
  useDialogFocus(dialogRef, Boolean(commercePanel), () => setCommercePanel(null));
  const commerceContext = useMemo(() => buildBuilderCommerceContext(workspace), [workspace]);
  const [loadState, setLoadState] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const loadTimer = useRef(null);
  const workspaceKey = String(workspace.id || workspace.slug || 'local-workspace');
  const parameters = new URLSearchParams({
    embedded: '1',
    workspace: workspaceKey,
    business: String(workspace.brandName || 'Your business')
  });
  const frameUrl = `/builder/index.html?${parameters.toString()}`;

  useEffect(() => {
    const sendContext = () => frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'catalog-context', context: commerceContext, cart: { count: cart.count, total: cart.subtotalCents / 100 } }, window.location.origin);
    sendContext();
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow || event.data?.source !== 'bookbuy-builder-host') return;
      if (event.data.type === 'host-cancel') { activeRequests.current.get(event.data.requestId)?.abort(); return; }
      if (event.data.type === 'host-request') {
        const { requestId, operation, payload = {} } = event.data;
        if (typeof requestId !== 'string' || typeof operation !== 'string') return;
        const controller = new AbortController(); activeRequests.current.set(requestId, controller);
        const workspaceId = workspace.ownerId || workspace.slug;
        const execute = async () => {
          if (operation.startsWith('runtime.')) return executeBuilderRuntime(workspace, cart, operation.slice(8), payload, setCommercePanel);
          if (operation === 'ai.connections') return listAIConnections(workspaceId);
          if (operation === 'ai.models') return listAIModels(workspaceId);
          if (operation === 'ai.connect') { setAiDialog(payload.provider || 'anthropic'); return { opened: true }; }
          if (operation === 'ai.run') return runAI({ ...payload, workspaceId }, undefined, controller.signal);
          if (operation === 'website.publish') return builderCallable('publishWebsite', { ...payload, workspaceId });
          if (operation === 'website.status') return builderCallable('getWebsitePublishStatus', { workspaceId });
          if (operation === 'website.rollback') return builderCallable('rollbackWebsite', { ...payload, workspaceId });
          throw new Error('Unsupported builder operation.');
        };
        execute().then(result => event.source?.postMessage({ source: 'bookbuy-workspace', type: 'host-response', requestId, result }, window.location.origin)).catch(error => event.source?.postMessage({ source: 'bookbuy-workspace', type: 'host-response', requestId, error: error.message }, window.location.origin)).finally(() => activeRequests.current.delete(requestId));
        return;
      }
      if (event.data.type === 'catalog-request') return sendContext();
      if (event.data.type !== 'commerce-open') return;
      try {
        const target = resolveBuilderCommerceAction(workspace, event.data.action, event.data.payload);
        setCommerceError('');
        setCommercePanel(target.kind === 'close' ? null : target);
      } catch (error) { setCommerceError(error.message); }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [commerceContext, workspace, cart.count, cart.subtotalCents]);

  useEffect(() => {
    setLoadState('loading');
    loadTimer.current = window.setTimeout(() => setLoadState('slow'), 15_000);
    return () => window.clearTimeout(loadTimer.current);
  }, [frameUrl, retryCount]);

  const retry = () => setRetryCount((count) => count + 1);
  const finishLoading = (state) => {
    window.clearTimeout(loadTimer.current);
    setLoadState(state);
  };

  return (
    <section className="bb-builder-page" aria-labelledby="bb-builder-title">
      <header className="bb-builder-header">
        <div className="bb-builder-heading bb-page-title-wrap">
          <PageBackButton />
          <span className="bb-page-title-main">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 id="bb-builder-title" className="bb-page-title">Website builder</h1>
          </span>
        </div>
        <Button
          icon={Globe2}
          variant="secondary"
          className="bb-builder-profile-link"
          aria-label="Open business profile"
          onClick={() => navigate(workspacePagePath('website'))}
        >
          <span className="bb-builder-profile-label-desktop">Business profile</span>
          <span className="bb-builder-profile-label-mobile">Profile</span>
        </Button>
      </header>

      <div className="bb-builder-editor" aria-busy={loadState === 'loading'}>
        <iframe
          ref={frameRef}
          key={`${workspaceKey}:${retryCount}`}
          src={frameUrl}
          title={`${workspace.brandName || 'Your business'} website builder`}
          className="bb-builder-frame"
          allow="clipboard-write; microphone"
          onLoad={() => { finishLoading('ready'); frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'catalog-context', context: commerceContext, cart: { count: cart.count, total: cart.subtotalCents / 100 } }, window.location.origin); }}
          onError={() => finishLoading('error')}
        />
        {loadState !== 'ready' ? (
          <div className="bb-builder-load-state" role="status" aria-live="polite">
            {loadState === 'loading' ? (
              <>
                <LoaderCircle size={24} aria-hidden="true" />
                <p>Opening your builder…</p>
              </>
            ) : (
              <>
                <p>{loadState === 'slow' ? 'The builder is taking longer to open.' : 'The builder could not open.'}</p>
                <Button icon={RotateCcw} variant="secondary" onClick={retry}>Try again</Button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {commerceError && <div className="bb-builder-commerce-error" role="alert">{commerceError}<button onClick={() => setCommerceError('')} aria-label="Dismiss">×</button></div>}
      {aiDialog && <AIConnectionsDialog workspaceId={workspace.ownerId || workspace.slug} provider={aiDialog} onChanged={() => frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'ai-connections-changed' }, window.location.origin)} onClose={() => { setAiDialog(null); frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'ai-connections-changed' }, window.location.origin); }} />}
      {commercePanel && <div className="bb-builder-commerce-overlay" onClick={event => { if (event.target === event.currentTarget) setCommercePanel(null); }}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="builder-commerce-title" className="bb-builder-commerce-panel">
          <header><div><h2 id="builder-commerce-title">{commercePanel.kind === 'checkout' ? 'Checkout' : 'Book & Buy selection'}</h2><p>Website test · no payments or records are created</p></div><Button variant="secondary" icon={X} aria-label="Close commerce test" onClick={() => setCommercePanel(null)} /></header>
          <div className="bb-builder-commerce-body">
            {commercePanel.kind === 'checkout' ? <PublicCartCheckout catalogWorkspace={workspace} testMode onBack={() => setCommercePanel(null)} /> : <PublicCatalogDetail key={`${commercePanel.kind}:${commercePanel.id}`} kind={commercePanel.kind} item={(commercePanel.kind === 'product' ? workspace.products : workspace.services).find(item => item.id === commercePanel.id)} workspace={workspace} slug={workspace.slug} checkoutTestMode onBack={() => setCommercePanel(null)} />}
          </div>
          <footer><Button variant="secondary" icon={ShoppingBag} onClick={() => setCommercePanel({ kind: 'checkout' })}>Cart · {cart.count}</Button><span>Variants, stock and booking times use your app’s existing rules.</span></footer>
        </section>
      </div>}
    </section>
  );
}
