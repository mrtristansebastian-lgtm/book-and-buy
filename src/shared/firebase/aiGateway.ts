import { httpsCallable } from 'firebase/functions';
import { getFirebase } from './client';

export type AIProvider = 'openai' | 'anthropic' | 'chatgpt';
export type AIConnection = { provider: AIProvider; connected: boolean; available: boolean; billing: 'included' | 'byok' | 'chatgpt' | 'unavailable'; last4?: string; accountLabel?: string; reason?: string; oauthAvailable?: boolean };
export type AIModelProvider = { provider: AIProvider; available: boolean; defaultModel: string; models: Array<{ name: string; label: string }>; reason?: string };
export type AIEvent = { type: string; runId: string; sequence: number; text?: string; name?: string; result?: AIRunResult; error?: { code: string; message: string }; createdAt?: number };
export type AIRunResult = { runId: string; status: 'running' | 'completed' | 'failed' | 'cancelled'; content: string; model: string; provider: AIProvider; usage: { inputTokens: number; outputTokens: number }; error?: { code: string; message: string }; events?: AIEvent[] };
export type AIRunInput = { workspaceId: string; provider: AIProvider; model?: string; mode: 'builder' | 'ask' | 'plan' | 'butler'; conversationId: string; messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>; format?: object; requestId?: string; maxOutputTokens?: number };

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
export const disconnectAIConnection = (workspaceId: string, provider: AIProvider) => call<{ ok: true }>('disconnectAIConnection', { workspaceId, provider });
export const selectAIBillingSource = (workspaceId: string, provider: AIProvider, billing: 'included' | 'personal') => call<AIConnection>('selectAIBillingSource', { workspaceId, provider, billing });
export const listAIModels = (workspaceId: string) => call<{ providers: AIModelProvider[] }>('listAIModels', { workspaceId });
export const getAIRun = (workspaceId: string, runId: string, afterSequence = 0) => call<AIRunResult>('getAIRun', { workspaceId, runId, afterSequence });
export const cancelAIRun = (workspaceId: string, runId: string) => call<{ ok: true }>('cancelAIRun', { workspaceId, runId });

export async function startChatGPTConnection(workspaceId: string): Promise<{ authUrl: string; expiresAt: number }> {
  const firebase = bundle();
  const setup = await call<{ setupUrl: string; setupTicket: string; state: string; expiresAt: number }>('startChatGPTConnection', { workspaceId });
  const token = await firebase.auth.currentUser!.getIdToken();
  // The registered callback should be served on the app's first-party origin so
  // its HttpOnly transaction cookie survives browser tracking protections.
  const response = await fetch(setup.setupUrl, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ setupTicket: setup.setupTicket, state: setup.state }) });
  if (!response.ok) throw new Error('ChatGPT connection could not start. Sign in and try again.');
  return response.json();
}
export async function runAI(input: AIRunInput, onEvent?: (event: AIEvent) => void, signal?: AbortSignal): Promise<AIRunResult> {
  const firebase = bundle();
  const requestId = input.requestId || crypto.randomUUID();
  const payload = { ...input, requestId };
  let latestSequence = 0;
  const cancel = () => { void cancelAIRun(input.workspaceId, requestId).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) { signal.removeEventListener('abort', cancel); throw new DOMException('Request cancelled.', 'AbortError'); }
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
    return final.value;
  } catch (error) {
    if (signal?.aborted) { cancel(); throw new DOMException('Request cancelled.', 'AbortError'); }
    // Recover the same durable run after a connection loss; never resubmit a
    // generation with a new identifier, which could duplicate paid inference.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const result = await getAIRun(input.workspaceId, requestId, latestSequence);
        for (const event of result.events || []) deliver(event);
        if (result.status !== 'running') return result;
      } catch { if (attempt === 0) throw error; }
      await new Promise<void>(resolve => setTimeout(resolve, Math.min(1500 * (attempt + 1), 6000)));
      if (signal?.aborted) { cancel(); throw new DOMException('Request cancelled.', 'AbortError'); }
    }
    const result = await getAIRun(input.workspaceId, requestId, latestSequence);
    for (const event of result.events || []) deliver(event);
    return result;
  } finally { signal?.removeEventListener('abort', cancel); }
}
