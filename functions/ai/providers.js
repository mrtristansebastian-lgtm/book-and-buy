import { aiError } from './config.js';

// OpenAI strict output accepts a restricted schema subset: closed objects and
// every property required. Keep portable optional/open payloads best-effort on
// the provider; the gateway validates every output and tool call before use.
// https://developers.openai.com/api/docs/guides/structured-outputs
const strictKeywords = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'anyOf', 'description', 'title']);
export function strictOutputCompatible(schema, depth = 0) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || depth > 5 || Object.keys(schema).some(key => !strictKeywords.has(key))) return false;
  if (depth === 0 && (schema.type !== 'object' || schema.anyOf)) return false;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!schema.anyOf && types.some(type => !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(type))) return false;
  if (types.includes('object') || schema.properties) {
    const properties = schema.properties || {}, required = schema.required || [];
    if (schema.additionalProperties !== false || Object.keys(properties).some(key => !required.includes(key)) || required.some(key => !Object.hasOwn(properties, key))) return false;
    if (Object.values(properties).some(child => !strictOutputCompatible(child, depth + 1))) return false;
  }
  if (types.includes('array') && (!schema.items || !strictOutputCompatible(schema.items, depth + 1))) return false;
  if (schema.anyOf?.some(child => !strictOutputCompatible(child, depth + 1))) return false;
  return true;
}

// Official Responses and Messages wire formats. Neither adapter executes tools.
export function providerRequest(provider, { model, messages, instructions, tools = [], format, maxOutputTokens, reasoningEffort }) {
  if (provider === 'anthropic') return {
    model, max_tokens: maxOutputTokens, stream: true, system: instructions,
    messages: messages.filter(item => item.role !== 'system'),
    ...(tools.length ? { tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema })) } : {}),
    ...(format ? { output_config: { format: { type: 'json_schema', schema: format } } } : {})
  };
  const functions = tools.map(tool => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: false }));
  if (provider === 'chatgpt' && (!Array.isArray(messages) || messages.some(item => item.role === 'system'))) throw aiError('invalid-argument', 'ChatGPT requests require explicit context and server-controlled instructions.');
  return { model, input: messages, instructions, ...(provider === 'chatgpt' ? {} : { max_output_tokens: maxOutputTokens }), store: false, stream: true,
    include: ['reasoning.encrypted_content'],
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    ...(tools.length ? { tools: provider === 'chatgpt' ? [{ type: 'namespace', name: 'bookbuy', description: 'Book & Buy owner tools. Business changes require a validated preview and owner approval.', tools: functions }] : functions, parallel_tool_calls: false } : {}),
    ...(format ? { text: { format: { type: 'json_schema', name: 'bookbuy_result', schema: format, strict: strictOutputCompatible(format) } } } : {})
  };
}

// Only approved machine-readable fields escape provider errors. Response bodies
// may contain user text or secrets, so never persist or return them verbatim.
export function providerFailure(status, providerCode, requestId, { provider, param, bodyKind } = {}) {
  const known = {
    subscription_sharing_user_not_eligible: ['permission-denied', 'ChatGPT plan usage is unavailable for this account or workspace.'],
    subscription_sharing_usage_limit_exceeded: ['resource-exhausted', 'Your ChatGPT app usage limit was reached. Review it in ChatGPT Settings → Usage.'],
    subscription_sharing_usage_unavailable: ['unavailable', 'ChatGPT usage could not be checked. Try again later.'],
    subscription_sharing_user_unavailable: ['unavailable', 'ChatGPT account information is temporarily unavailable. Try again later.'],
    subscription_sharing_unsupported_capability: ['invalid-argument', 'This request uses a capability unavailable through your ChatGPT plan.'],
    subscription_sharing_route_not_supported: ['permission-denied', 'This ChatGPT integration is not authorized for this request.'],
    chatpass_v2_scope_not_authorized: ['permission-denied', 'This ChatGPT connection does not grant the required AI permission.'],
    chatpass_v2_invalid_authorization_context: ['permission-denied', 'This ChatGPT connection does not grant the required AI permission.'],
    subscription_sharing_invalid_user: ['failed-precondition', 'ChatGPT could not validate this account. Check its connection and permissions.']
  };
  const [code, message] = known[providerCode] || (provider === 'chatgpt' && status === 403 ? ['permission-denied', 'ChatGPT blocked this request because of permission, account, or serving-region policy.'] : provider === 'chatgpt' && status === 401 ? ['permission-denied', 'ChatGPT did not accept this account’s inference permission. Check the connection.'] : status === 401 || status === 403 ? ['failed-precondition', 'Reconnect this AI provider to restore access.'] : status === 400 ? ['invalid-argument', 'The AI provider does not support this request.'] : status === 429 ? ['resource-exhausted', 'The AI provider usage limit was reached. Try again later.'] : ['unavailable', 'The AI provider is temporarily unavailable.']);
  return Object.assign(aiError(code, message), { details: { httpStatus: status, ...(known[providerCode] ? { providerCode } : {}), ...(/^(?:input|tools|model|reasoning|text|store|stream|background|max_output_tokens|service_tier)(?:[.\[\]A-Za-z0-9_-]{0,100})$/.test(param || '') ? { providerParam: param } : {}), ...(['structured-error', 'detail', 'json', 'text', 'stream'].includes(bodyKind) ? { bodyKind } : {}), ...(/^[A-Za-z0-9_-]{1,200}$/.test(requestId || '') ? { requestId } : {}), ...(providerCode === 'subscription_sharing_usage_limit_exceeded' ? { recoveryUrl: 'https://chatgpt.com/settings/usage' } : {}) } });
}

export async function* readSSE(body) {
  const decoder = new TextDecoder(); let buffer = ''; let bytes = 0;
  for await (const chunk of body) {
    bytes += chunk.byteLength;
    if (bytes > 2000000) throw aiError('resource-exhausted', 'The provider response exceeded its size limit.');
    buffer = (buffer + decoder.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');
    let split;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, split); buffer = buffer.slice(split + 2);
      const json = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (json && json !== '[DONE]') {
        try { yield JSON.parse(json); } catch (error) { if (error.code) throw error; throw aiError('unavailable', 'The provider returned an invalid stream.'); }
      }
    }
  }
}
export function normalizeResponse(provider, result) {
  if (provider === 'anthropic') {
    if (result.stop_reason === 'max_tokens') throw aiError('resource-exhausted', 'The response reached its token limit. Try a smaller request.');
    if (!['end_turn', 'tool_use', 'stop_sequence'].includes(result.stop_reason)) throw aiError('unavailable', 'The provider did not complete its response.');
    return { content: (result.content || []).filter(item => item.type === 'text').map(item => item.text).join(''), calls: (result.content || []).filter(item => item.type === 'tool_use').map(item => ({ id: item.id, name: item.name, arguments: item.input })), native: result.content || [], usage: { inputTokens: result.usage?.input_tokens || 0, outputTokens: result.usage?.output_tokens || 0 } };
  }
  if (result.status !== 'completed') throw aiError('unavailable', 'The provider did not complete its response.');
  const output = result.output || [];
  if (output.some(item => item.content?.some(block => block.type === 'refusal'))) throw aiError('failed-precondition', 'The provider could not fulfill this request.');
  return { content: output.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join(''), calls: output.filter(item => item.type === 'function_call').map(item => { if (provider === 'chatgpt' && item.namespace !== 'bookbuy') throw aiError('permission-denied', 'The assistant requested an unknown tool namespace.'); let args; try { args = JSON.parse(item.arguments); } catch { throw aiError('failed-precondition', 'The assistant returned invalid tool arguments.'); } return { id: item.call_id, name: item.name, ...(item.namespace ? { namespace: item.namespace } : {}), arguments: args }; }), native: output, usage: { inputTokens: result.usage?.input_tokens || 0, outputTokens: result.usage?.output_tokens || 0 } };
}
export async function callProvider(provider, input, { apiKey, signal, fetchImpl = fetch, onText = async () => {} }) {
  const anthropic = provider === 'anthropic';
  const response = await fetchImpl(anthropic ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/responses', {
    method: 'POST', redirect: 'error', signal,
    headers: anthropic ? { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(providerRequest(provider, input))
  });
  if (!response.ok) {
    // Provider error bodies can contain request text and credentials. Never expose them.
    let providerCode; let param; let bodyKind = 'text'; try { const body = await response.json(); providerCode = body?.error?.code; param = body?.error?.param; bodyKind = body?.error && typeof body.error === 'object' ? 'structured-error' : typeof body?.detail === 'string' ? 'detail' : 'json'; } catch { /* a direct-route error need not be JSON */ }
    throw Object.assign(providerFailure(response.status, providerCode, response.headers.get('x-request-id') || response.headers.get('openai-request-id'), { provider, param, bodyKind }), { noInferenceStarted: true });
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) return normalizeResponse(provider, await response.json());
  let final; let message; const blocks = new Map();
  for await (const event of readSSE(response.body)) {
    if (event.type === 'error' || event.type === 'response.failed') throw providerFailure(response.status, event.response?.error?.code || event.error?.code || event.code, response.headers.get('x-request-id') || response.headers.get('openai-request-id'), { provider, param: event.response?.error?.param || event.error?.param || event.param, bodyKind: 'stream' });
    if (event.type === 'response.incomplete') throw aiError('resource-exhausted', 'The response ended before completion. Try a smaller request.');
    if (!anthropic && event.type === 'response.output_text.delta') await onText(event.delta || '');
    if (!anthropic && event.type === 'response.completed') final = event.response;
    if (anthropic && event.type === 'message_start') message = { ...event.message, content: [] };
    if (anthropic && event.type === 'content_block_start') blocks.set(event.index, { ...event.content_block, json: '' });
    if (anthropic && event.type === 'content_block_delta') {
      const block = blocks.get(event.index); if (!block) throw aiError('unavailable', 'The AI provider returned an invalid stream.');
      if (event.delta?.type === 'text_delta') { block.text = (block.text || '') + event.delta.text; await onText(event.delta.text); }
      if (event.delta?.type === 'input_json_delta') block.json += event.delta.partial_json || '';
    }
    if (anthropic && event.type === 'message_delta' && message) { message.stop_reason = event.delta?.stop_reason; message.usage = { ...message.usage, ...event.usage }; }
    if (anthropic && event.type === 'message_stop' && message) {
      message.content = [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([, block]) => {
        const { json, ...value } = block;
        if (value.type === 'tool_use' && json) { try { value.input = JSON.parse(json); } catch { throw aiError('failed-precondition', 'The assistant returned invalid tool arguments.'); } }
        return value;
      }); final = message;
    }
  }
  if (!final) throw aiError('unavailable', 'The AI response ended before completion.');
  return normalizeResponse(provider, final);
}
export function appendToolResults(provider, messages, result, outputs) {
  if (provider === 'anthropic') return [...messages, { role: 'assistant', content: result.native }, { role: 'user', content: outputs.map(item => ({ type: 'tool_result', tool_use_id: item.id, content: JSON.stringify(item.result) })) }];
  return [...messages, ...result.native, ...outputs.map(item => ({ type: 'function_call_output', call_id: item.id, output: JSON.stringify(item.result) }))];
}
