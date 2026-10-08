import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw, X, ShoppingBag } from 'lucide-react';
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
import { listAIConnections, listAIModels, runAI, getAIConversation, getAIRun, cancelAIRun, listAIConversations, deleteAIConversation } from '../../../shared/firebase/aiGateway';

import { useAIConfirmations } from '../../ai/useAIConfirmations';

/** The builder owns its editor controls; the workspace supplies navigation. */
export function WebsiteBuilderPage() {
  return <PublicCartProvider><ConnectedWebsiteBuilder /></PublicCartProvider>;
}

function ConnectedWebsiteBuilder() {
  const { workspace } = useWorkspace();
  const cart = usePublicCart();
  const confirmations = useAIConfirmations(workspace.ownerId || workspace.slug);
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
  const readyFrame = useRef(null);
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
      if (event.data.type === 'builder-ready' && event.data.url === frameUrl) { readyFrame.current = { url: frameUrl, source: event.source }; finishLoading('ready'); return; }
      if (event.data.type === 'builder-error' && event.data.url === frameUrl) { readyFrame.current = null; finishLoading('error'); return; }
      if (event.data.type === 'host-cancel') { activeRequests.current.get(event.data.requestId)?.abort(); return; }
      if (event.data.type === 'host-request') {
        const { requestId, operation, payload = {} } = event.data;
        if (typeof requestId !== 'string' || typeof operation !== 'string') return;
        if (activeRequests.current.has(requestId) || activeRequests.current.size >= 8) { event.source?.postMessage({ source: 'bookbuy-workspace', type: 'host-response', requestId, error: 'The builder is handling other requests. Try again shortly.' }, window.location.origin); return; }
        const controller = new AbortController(); activeRequests.current.set(requestId, controller);
        const workspaceId = workspace.ownerId || workspace.slug;
        const reply = data => { if (frameRef.current?.contentWindow === event.source) event.source?.postMessage({ source: 'bookbuy-workspace', requestId, ...data }, window.location.origin); };
        const execute = async () => {
          if (operation.startsWith('runtime.')) return executeBuilderRuntime(workspace, cart, operation.slice(8), payload, setCommercePanel);
          if (operation === 'ai.connections') return listAIConnections(workspaceId);
          if (operation === 'ai.models') return listAIModels(workspaceId);
          if (operation === 'ai.conversations') return listAIConversations(workspaceId);
          if (operation === 'ai.conversation.delete') { const conversation = await getAIConversation(workspaceId, payload.conversationId); await confirmations.confirmDeletion(conversation, controller.signal); return deleteAIConversation(workspaceId, payload.conversationId, conversation.updatedAt); }
          if (operation === 'ai.conversation') return getAIConversation(workspaceId, payload.conversationId);
          if (operation === 'ai.run.status') return getAIRun(workspaceId, payload.runId);
          if (operation === 'ai.run.cancel') return cancelAIRun(workspaceId, payload.runId);
          if (operation === 'ai.connect') { setAiDialog(payload.provider || 'anthropic'); return { opened: true }; }
          if (operation === 'ai.run') { if (payload.provider === 'chatgpt') { const { connections } = await listAIConnections(workspaceId); await confirmations.ensurePlanUsage(connections.find(row => row.provider === 'chatgpt'), controller.signal); } if (controller.signal.aborted) throw new DOMException('Request cancelled.', 'AbortError'); return runAI({ ...payload, workspaceId }, progress => reply({ type: 'host-progress', event: progress }), controller.signal); }
          if (operation === 'website.publish') return builderCallable('publishWebsite', { ...payload, workspaceId });
          if (operation === 'website.status') return builderCallable('getWebsitePublishStatus', { workspaceId });
          if (operation === 'website.rollback') return builderCallable('rollbackWebsite', { ...payload, workspaceId });
          if (operation === 'website.draft.save') return builderCallable('saveWebsiteDraft', { ...payload, workspaceId });
          if (operation === 'website.draft.load') return builderCallable('getWebsiteDraft', { ...payload, workspaceId });
          if (operation === 'website.versions.list') return builderCallable('listWebsiteDraftVersions', { ...payload, workspaceId });
          if (operation === 'website.versions.load') return builderCallable('getWebsiteDraftVersion', { ...payload, workspaceId });
          if (operation === 'website.preview') return builderCallable('createWebsitePreview', { ...payload, workspaceId });
          throw new Error('Unsupported builder operation.');
        };
        execute().then(result => reply({ type: 'host-response', result })).catch(error => reply({ type: 'host-response', error: error.message, errorCode: error.code || '', errorDetails: error.details || {} })).finally(() => activeRequests.current.delete(requestId));
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
  }, [commerceContext, workspace, cart.count, cart.subtotalCents, frameUrl]);
  // Navigation disconnects the UI but preserves durable AI runs. Only Stop cancels.
  useEffect(() => () => { activeRequests.current.clear(); }, [workspaceKey]);

  useEffect(() => {
    const isCurrentFrameReady = () => readyFrame.current?.url === frameUrl && readyFrame.current?.source === frameRef.current?.contentWindow;
    if (isCurrentFrameReady()) { finishLoading('ready'); return; }
    setLoadState('loading');
    loadTimer.current = window.setTimeout(() => { if (!isCurrentFrameReady()) setLoadState('slow'); }, 15_000);
    frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'host-check-ready' }, window.location.origin);
    return () => window.clearTimeout(loadTimer.current);
  }, [frameUrl, retryCount]);

  const retry = () => { readyFrame.current = null; setRetryCount((count) => count + 1); };
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
      </header>

      <div className="bb-builder-editor" aria-busy={loadState === 'loading'}>
        <iframe
          ref={frameRef}
          key={`${workspaceKey}:${retryCount}`}
          src={frameUrl}
          title={`${workspace.brandName || 'Your business'} website builder`}
          className="bb-builder-frame"
          allow="clipboard-write; microphone"
          onLoad={() => { frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'catalog-context', context: commerceContext, cart: { count: cart.count, total: cart.subtotalCents / 100 } }, window.location.origin); frameRef.current?.contentWindow?.postMessage({ source: 'bookbuy-workspace', type: 'host-check-ready' }, window.location.origin); }}
          onError={() => { readyFrame.current = null; finishLoading('error'); }}
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
      {confirmations.modal}
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
