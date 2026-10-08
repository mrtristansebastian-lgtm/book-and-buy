import test from 'node:test';
import assert from 'node:assert/strict';
import { callProvider, providerRequest, appendToolResults } from '../functions/ai/providers.js';

const input = { model: 'test-model', messages: [{ role: 'user', content: 'Hello' }], instructions: 'Trusted instructions', tools: [{ name: 'read_catalog', description: 'Read', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }], format: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'], additionalProperties: false }, maxOutputTokens: 256 };
function sse(events) { return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } }); }

test('adapters use native API schemas, strict output and server-only auth headers', () => {
  const openai = providerRequest('openai', input); const claude = providerRequest('anthropic', input);
  assert.equal(openai.store, false); assert.equal(openai.stream, true); assert.equal(openai.text.format.type, 'json_schema'); assert.equal(openai.tools[0].type, 'function');
  assert.equal(claude.max_tokens, 256); assert.equal(claude.output_config.format.type, 'json_schema'); assert.deepEqual(claude.tools[0].input_schema, input.tools[0].inputSchema);
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
