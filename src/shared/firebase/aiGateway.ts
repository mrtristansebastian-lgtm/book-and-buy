import { httpsCallable } from 'firebase/functions';
import { getFirebase } from './client';
import { recoverDurableRun } from './aiRunRecovery';

export type AIProvider = 'openai' | 'anthropic' | 'chatgpt';
export type AIConnection = { provider: AIProvider; revision: string; connected: boolean; available: boolean; includedAvailable?: boolean; billingChoice?: 'included' | 'personal' | 'none'; billing: 'included' | 'byok' | 'chatgpt' | 'unavailable'; status?: 'approval-pending' | 'ready' | 'identity-only' | 'reconnect-required' | 'unavailable'; last4?: string; accountLabel?: string; expiresAt?: number; reason?: string; oauthAvailable?: boolean; noticeVersion?: string; planUsageAcknowledged?: boolean; capabilities?: { identity: boolean; planInference: boolean; executionKinds: string[]; supportedModes: string[] } };
export type AIModel = { name: string; label: string; defaultEffort?: string; efforts?: Array<{ reasoningEffort: string; description: string }> };
export type AIModelProvider = { provider: AIProvider; available: boolean; defaultModel: string; models: AIModel[]; reason?: string; error?: { code: string; message: string; details?: { providerCode?: string; requestId?: string; httpStatus?: number; recoveryUrl?: string; providerParam?: string; bodyKind?: string } } };
export type AIEvent = { type: string; runId: string; sequence: number; text?: string; name?: string; result?: AIRunResult; error?: { code: string; message: string }; createdAt?: number };
export type AIRunResult = { runId: string; status: 'running' | 'completed' | 'failed' | 'cancelled'; content: string; model: string; provider: AIProvider; mode?: AIRunInput['mode']; connectionRevision?: string; reasoningEffort?: string; conversationId?: string; usage: { inputTokens: number; outputTokens: number }; error?: { code: string; message: string; details?: { providerCode?: string; requestId?: string; httpStatus?: number; recoveryUrl?: string; providerParam?: string; bodyKind?: string } }; events?: AIEvent[] };
export type AIRunInput = { workspaceId: string; provider: AIProvider; connectionRevision?: string; model?: string; reasoningEffort?: string; mode: 'builder' | 'ask' | 'plan' | 'butler'; conversationId: string; messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; format?: object; requestId?: string; maxOutputTokens?: number };
export type AIConversation = { conversationId: string; provider: AIProvider; model: string; mode: AIRunInput['mode']; connectionRevision?: string; reasoningEffort?: string; title: string; activeRun: string | null; updatedAt?: number; turns?: Array<{ runId: string; user: string; assistant: string; status: AIRunResult['status']; createdAt: number }> };
type PendingAIRun = { runId: string; conversationId: string; provider: AIProvider; model?: string; mode: AIRunInput['mode']; connectionRevision?: string; startedAt: number };
export function listPendingAIRuns(workspaceId: string): PendingAIRun[] { try { const value = JSON.parse(localStorage.getItem(`bookbuy-ai-pending:${workspaceId}`) || '[]'); return Array.isArray(value) ? value.filter(row => /^[A-Za-z0-9_-]{1,80}$/.test(row?.runId || '') && Date.now() - row.startedAt < 86400000) : []; } catch { return []; } }
function savePending(workspaceId: string, run: PendingAIRun, remove = false) { try { const existing = listPendingAIRuns(workspaceId).filter(row => row.runId !== run.runId); localStorage.setItem(`bookbuy-ai-pending:${workspaceId}`, JSON.stringify(remove ? existing : [...existing, run])); } catch { /* server history remains authoritative when storage is unavailable */ } }

function bundle() {
  const firebase = getFirebase();
  if (!firebase) throw new Error('Hosted AI is unavailable until this app is connected to its backend.');
  if (!firebase.auth.currentUser) throw new Error('Sign in to connect and use AI for your business.');
  return firebase;
}
async function call<T>(name: string, data: object): Promise<T> {
  return (await httpsCallable<object, T>(bundle().functions, name)(data)).data;
}
export const listAIConnections = (workspaceId: string) => call<{ connections: AIConnection[] }>('listAIConnections', { workspaceId });
export const saveAIConnection = (workspaceId: string, provider: AIProvider, apiKey: string) => call<AIConnection>('saveAIConnection', { workspaceId, provider, apiKey });
export const disconnectAIConnection = (workspaceId: string, provider: AIProvider) => call<{ ok: true; remoteRevoked?: boolean }>('disconnectAIConnection', { workspaceId, provider });
export const selectAIBillingSource = (workspaceId: string, provider: AIProvider, billing: 'included' | 'personal') => call<AIConnection>('selectAIBillingSource', { workspaceId, provider, billing });
export const listAIModels = (workspaceId: string) => call<{ providers: AIModelProvider[] }>('listAIModels', { workspaceId });
export const getAIRun = (workspaceId: string, runId: string, afterSequence = 0) => call<AIRunResult>('getAIRun', { workspaceId, runId, afterSequence });
export const cancelAIRun = (workspaceId: string, runId: string) => call<{ ok: true }>('cancelAIRun', { workspaceId, runId });
export const listAIConversations = (workspaceId: string) => call<{ conversations: AIConversation[] }>('listAIConversations', { workspaceId });
export const getAIConversation = (workspaceId: string, conversationId: string) => call<AIConversation>('getAIConversation', { workspaceId, conversationId });
export const acknowledgeChatGPTPlanUsage = (workspaceId: string, expectedRevision: string, noticeVersion: string) => call<{ ok: true }>('acknowledgeChatGPTPlanUsage', { workspaceId, expectedRevision, noticeVersion });
export const getPendingChatGPTConnection = (workspaceId: string, pendingId: string) => call<{ pendingId: string; accountLabel: string; expectedRevision: string; expiresAt: number }>('getPendingChatGPTConnection', { workspaceId, pendingId });
export const confirmChatGPTConnection = (workspaceId: string, pendingId: string, expectedRevision: string, accept: boolean) => call<{ ok: true }>('confirmChatGPTConnection', { workspaceId, pendingId, expectedRevision, accept });
export async function deleteAIConversation(workspaceId: string, conversationId: string, expectedUpdatedAt?: number) {
  const result = await call<{ status: 'deleting' | 'deleted' }>('deleteAIConversation', { workspaceId, conversationId, requestId: crypto.randomUUID(), ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}) });
  for (const run of listPendingAIRuns(workspaceId)) if (run.conversationId === conversationId) savePending(workspaceId, run, true);
  return result;
}

export async function startChatGPTConnection(workspaceId: string, intent = 'connect', expectedRevision?: string): Promise<{ authUrl: string; expiresAt: number }> {
  const firebase = bundle();
  const setup = await call<{ setupUrl: string; setupTicket: string; state: string; expiresAt: number }>('startChatGPTConnection', { workspaceId, intent, ...(expectedRevision ? { expectedRevision } : {}) });
  const callback = new URL(setup.setupUrl);
  if (callback.protocol !== 'https:' || callback.origin !== window.location.origin || callback.username || callback.password || callback.hash || callback.search) throw new Error('ChatGPT sign-in must use the registered secure address for this app.');
  const token = await firebase.auth.currentUser!.getIdToken();
  // The registered callback should be served on the app's first-party origin so
  // its HttpOnly transaction cookie survives browser tracking protections.
  const response = await fetch(callback.href, { method: 'POST', redirect: 'error', credentials: 'include', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ setupTicket: setup.setupTicket, state: setup.state }) });
  if (!response.ok) throw new Error('ChatGPT connection could not start. Sign in and try again.');
  const result = await response.json(); const authorization = new URL(result.authUrl);
  if (authorization.origin !== 'https://auth.openai.com' || authorization.pathname !== '/api/accounts/authorize' || authorization.username || authorization.password || authorization.hash || authorization.searchParams.get('state') !== setup.state || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now()) throw new Error('ChatGPT returned an invalid sign-in request. Try again.');
  return { authUrl: authorization.href, expiresAt: result.expiresAt };
}
export async function runAI(input: AIRunInput, onEvent?: (event: AIEvent) => void, signal?: AbortSignal): Promise<AIRunResult> {
  const firebase = bundle();
  const requestId = input.requestId || crypto.randomUUID();
  const payload = { ...input, requestId };
  const pending: PendingAIRun = { runId: requestId, conversationId: input.conversationId, provider: input.provider, model: input.model, mode: input.mode, connectionRevision: input.connectionRevision, startedAt: Date.now() };
  let latestSequence = 0;
  let finished = false;
  const cancel = () => { void (async () => { for (const delay of [0, 300, 1000]) { if (delay) await new Promise(resolve => setTimeout(resolve, delay)); try { await cancelAIRun(input.workspaceId, requestId); break; } catch { /* admission may still be reaching the server */ } } })(); };
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) { signal.removeEventListener('abort', cancel); throw new DOMException('Request cancelled.', 'AbortError'); }
  savePending(input.workspaceId, pending);
  const deliver = (event: AIEvent) => { if (event.sequence > latestSequence) { latestSequence = event.sequence; onEvent?.(event); } };
  try {
    const callable = httpsCallable<AIRunInput, AIRunResult, AIEvent>(firebase.functions, 'runAI', { timeout: 300000 });
    const stream = await callable.stream(payload, { signal });
    // Attach the terminal promise immediately to avoid an unhandled rejection.
    const terminal = stream.data.then(value => ({ value }), error => ({ error }));
    try { for await (const event of stream.stream) deliver(event); } catch (error) { if (signal?.aborted) throw error; }
    const final = await terminal;
    if ('error' in final) throw final.error;
    for (const event of final.value.events || []) deliver(event);
    if (final.value.status === 'running') { const recovered = await recoverDurableRun({ runId: requestId, getRun: (_runId: string, afterSequence: number) => getAIRun(input.workspaceId, requestId, afterSequence), onEvent: deliver, afterSequence: latestSequence, signal }); finished = true; return recovered; }
    finished = true; return final.value;
  } catch (error) {
    if (signal?.aborted) { cancel(); throw new DOMException('Request cancelled.', 'AbortError'); }
    // Recover the same durable run after a connection loss; never resubmit a
    // generation with a new identifier, which could duplicate paid inference.
    try { const result = await recoverDurableRun({ runId: requestId, getRun: (_runId: string, afterSequence: number) => getAIRun(input.workspaceId, requestId, afterSequence), onEvent: deliver, afterSequence: latestSequence, signal }); finished = true; return result; }
    catch (recoveryError) { if (String((recoveryError as { code?: string }).code || '').endsWith('not-found')) { finished = true; throw error; } throw recoveryError; }
  } finally { signal?.removeEventListener('abort', cancel); if (finished) savePending(input.workspaceId, pending, true); }
}
