import test from 'node:test';
import assert from 'node:assert/strict';
import { callProvider, providerRequest, appendToolResults, strictOutputCompatible, normalizeResponse } from '../functions/ai/providers.js';

const input = { model: 'test-model', messages: [{ role: 'user', content: 'Hello' }], instructions: 'Trusted instructions', tools: [{ name: 'read_catalog', description: 'Read', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }], format: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'], additionalProperties: false }, maxOutputTokens: 256 };
function sse(events) { return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } }); }

test('ChatGPT allowlisted requests omit unsupported fields and preserve namespaced tool turns', () => {
  const body = providerRequest('chatgpt', { ...input, background: true, conversation: 'private', previous_response_id: 'prior', arbitrary: 'secret' });
  assert.deepEqual(Object.keys(body).sort(), ['model', 'input', 'instructions', 'store', 'stream', 'include', 'tools', 'parallel_tool_calls', 'text'].sort());
  assert.equal(body.store, false); assert.equal(body.stream, true); assert.ok(Array.isArray(body.input));
  assert.equal(body.tools[0].type, 'namespace'); assert.equal(body.tools[0].name, 'bookbuy'); assert.equal(body.tools[0].tools[0].name, 'read_catalog');
  assert.equal(providerRequest('openai', input).max_output_tokens, 256);
  const native = [{ type: 'function_call', namespace: 'bookbuy', name: 'read_catalog', call_id: 'call-42', arguments: '{}' }];
  const result = normalizeResponse('chatgpt', { status: 'completed', output: native });
  assert.equal(result.calls[0].namespace, 'bookbuy'); assert.equal(result.calls[0].id, 'call-42');
  const next = appendToolResults('chatgpt', input.messages, result, [{ id: 'call-42', result: { items: [] } }]);
  assert.equal(next[1].namespace, 'bookbuy'); assert.equal(next.at(-1).call_id, 'call-42');
  for (const namespace of ['unknown', undefined]) assert.throws(() => normalizeResponse('chatgpt', { status: 'completed', output: [{ ...native[0], namespace }] }), { code: 'permission-denied' });
  assert.throws(() => providerRequest('chatgpt', { ...input, messages: [{ role: 'system', content: 'untrusted' }] }), { code: 'invalid-argument' });
});

test('ChatGPT policy, invalid request and temporary diagnostics stay actionable without raw bodies', async () => {
  for (const [status, code, body, kind] of [[403, 'permission-denied', { detail: 'private-policy-body' }, 'detail'], [400, 'invalid-argument', { error: { param: 'tools[0].type', message: 'private-invalid-body' } }, 'structured-error'], [503, 'unavailable', {}, 'json']]) {
    await assert.rejects(callProvider('chatgpt', input, { apiKey: 'mock', fetchImpl: async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-safe' } }) }), error => {
      assert.equal(error.code, code); assert.equal(error.details.bodyKind, kind); assert.equal(error.details.requestId, 'req-safe');
      if (status === 400) assert.equal(error.details.providerParam, 'tools[0].type');
      assert.ok(!JSON.stringify(error).includes('private-')); assert.ok(!error.message.includes('Reconnect')); return true;
    });
  }
  await assert.rejects(callProvider('chatgpt', input, { apiKey: 'mock', fetchImpl: async () => sse([{ type: 'response.output_text.delta', delta: 'partial' }]) }), { code: 'unavailable' });
});

test('adapters use native API schemas, strict output and server-only auth headers', () => {
  const openai = providerRequest('openai', input); const claude = providerRequest('anthropic', input);
  assert.equal(openai.store, false); assert.equal(openai.stream, true); assert.equal(openai.text.format.type, 'json_schema'); assert.equal(openai.tools[0].type, 'function');
  assert.equal(openai.tools[0].strict, false); assert.equal(openai.text.format.strict, true);
  assert.equal(claude.max_tokens, 256); assert.equal(claude.output_config.format.type, 'json_schema'); assert.deepEqual(claude.tools[0].input_schema, input.tools[0].inputSchema);
});

test('optional Butler patches and open builder payloads explicitly avoid unsupported strict schema requests', async () => {
  const patch = { type: 'object', additionalProperties: true, properties: { name: { type: 'string' } } };
  const tools = [{ name: 'catalog_preview', description: 'Prepare a catalog change', inputSchema: { type: 'object', properties: { id: { type: 'string' }, patch }, required: ['patch'], additionalProperties: false } }];
  const format = { type: 'object', properties: { summary: { type: 'string' }, project: patch }, required: ['summary'], additionalProperties: false };
  assert.equal(strictOutputCompatible(format), false);
  assert.equal(strictOutputCompatible({ ...input.format, oneOf: [input.format] }), false);
  assert.equal(strictOutputCompatible({ ...input.format, properties: { html: { type: 'string', maxLength: 100 } } }), false);
  for (const provider of ['openai', 'chatgpt']) {
    await callProvider(provider, { ...input, tools, format }, { apiKey: 'fake-key', fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(options.body);
      const definition = provider === 'chatgpt' ? body.tools[0].tools[0] : body.tools[0];
      assert.equal(definition.strict, false); assert.deepEqual(definition.parameters, tools[0].inputSchema);
      assert.equal(body.text.format.strict, false); assert.deepEqual(body.text.format.schema, format);
      return sse([{ type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"summary":"Prepared"}' }] }], usage: { input_tokens: 1, output_tokens: 1 } } }]);
    } });
  }
});
test('Responses streaming requires terminal completion and preserves tool call identity', async () => {
  const texts = []; let request;
  const result = await callProvider('openai', input, { apiKey: 'mock-key', onText: async text => texts.push(text), fetchImpl: async (url, options) => { request = { url, options }; return sse([{ type: 'response.output_text.delta', delta: 'Hello' }, { type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Hello' }] }, { type: 'function_call', call_id: 'call-1', name: 'read_catalog', arguments: '{}' }], usage: { input_tokens: 10, output_tokens: 5 } } }]); } });
  assert.equal(request.url, 'https://api.openai.com/v1/responses'); assert.equal(request.options.headers.Authorization, 'Bearer mock-key'); assert.deepEqual(texts, ['Hello']); assert.equal(result.calls[0].id, 'call-1');
  const next = appendToolResults('openai', input.messages, result, [{ id: 'call-1', result: { products: [] } }]); assert.equal(next.at(-1).call_id, 'call-1');
  await assert.rejects(callProvider('openai', input, { apiKey: 'mock', fetchImpl: async () => sse([{ type: 'response.output_text.delta', delta: 'Incomplete' }]) }), { code: 'unavailable' });
});
test('Claude native text and incremental JSON tool calls produce normalized results', async () => {
  let request; const texts = [];
  const result = await callProvider('anthropic', input, { apiKey: 'mock-key', onText: async text => texts.push(text), fetchImpl: async (url, options) => { request = { url, options }; return sse([{ type: 'message_start', message: { role: 'assistant', usage: { input_tokens: 12, output_tokens: 0 } } }, { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }, { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Reviewing' } }, { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tool-1', name: 'read_catalog', input: {} } }, { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"limit":' } }, { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '2}' } }, { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 8 } }, { type: 'message_stop' }]); } });
  assert.equal(request.url, 'https://api.anthropic.com/v1/messages'); assert.equal(request.options.headers['x-api-key'], 'mock-key'); assert.equal(request.options.headers['anthropic-version'], '2023-06-01');
  assert.equal(result.content, 'Reviewing'); assert.deepEqual(result.calls[0].arguments, { limit: 2 }); assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 8 }); assert.deepEqual(texts, ['Reviewing']);
  assert.equal(appendToolResults('anthropic', input.messages, result, [{ id: 'tool-1', result: {} }]).at(-1).content[0].tool_use_id, 'tool-1');
});
test('provider authentication, quota and incomplete failures disclose no response bodies', async () => {
  for (const [status, code] of [[401, 'failed-precondition'], [429, 'resource-exhausted'], [500, 'unavailable']]) {
    await assert.rejects(callProvider('openai', input, { apiKey: 'mock', fetchImpl: async () => new Response('sensitive-provider-body', { status }) }), error => error.code === code && !error.message.includes('sensitive'));
  }
  await assert.rejects(callProvider('anthropic', input, { apiKey: 'mock', fetchImpl: async () => new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [] }), { headers: { 'Content-Type': 'application/json' } }) }), { code: 'resource-exhausted' });
});

test('reasoning uses Responses parameters and stateless tool turns preserve encrypted items', () => {
  const request = providerRequest('chatgpt', { ...input, reasoningEffort: 'high' });
  assert.deepEqual(request.reasoning, { effort: 'high' }); assert.deepEqual(request.include, ['reasoning.encrypted_content']);
  const native = [{ type: 'reasoning', encrypted_content: 'opaque-state' }, { type: 'function_call', call_id: 'call', arguments: '{}', name: 'read_catalog' }];
  assert.equal(appendToolResults('chatgpt', input.messages, { native }, [{ id: 'call', result: {} }])[1].encrypted_content, 'opaque-state');
});

test('ChatGPT streamed usage failures preserve actionable safe codes without exposing response text', async () => {
  await assert.rejects(callProvider('chatgpt', input, { apiKey: 'mock', fetchImpl: async () => sse([{ type: 'response.output_text.delta', delta: 'Partial' }, { type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'sensitive account details' } } }]) }), error => error.code === 'resource-exhausted' && error.details.providerCode === 'subscription_sharing_usage_limit_exceeded' && error.details.recoveryUrl === 'https://chatgpt.com/settings/usage' && !error.message.includes('sensitive'));
});
