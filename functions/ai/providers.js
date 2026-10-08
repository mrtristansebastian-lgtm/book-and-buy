import { aiError } from './config.js';

// Official Responses and Messages wire formats. Neither adapter executes tools.
export function providerRequest(provider, { model, messages, instructions, tools = [], format, maxOutputTokens }) {
  if (provider === 'anthropic') return {
    model, max_tokens: maxOutputTokens, stream: true, system: instructions,
    messages: messages.filter(item => item.role !== 'system'),
    ...(tools.length ? { tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema })) } : {}),
    ...(format ? { output_config: { format: { type: 'json_schema', schema: format } } } : {})
  };
  return { model, input: messages, instructions, max_output_tokens: maxOutputTokens, store: false, stream: true,
    ...(tools.length ? { tools: tools.map(tool => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: false })), parallel_tool_calls: false } : {}),
    ...(format ? { text: { format: { type: 'json_schema', name: 'bookbuy_result', schema: format, strict: true } } } : {})
  };
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
  return { content: output.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join(''), calls: output.filter(item => item.type === 'function_call').map(item => { let args; try { args = JSON.parse(item.arguments); } catch { throw aiError('failed-precondition', 'The assistant returned invalid tool arguments.'); } return { id: item.call_id, name: item.name, arguments: args }; }), native: output, usage: { inputTokens: result.usage?.input_tokens || 0, outputTokens: result.usage?.output_tokens || 0 } };
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
    const code = response.status === 401 || response.status === 403 ? 'failed-precondition' : response.status === 429 ? 'resource-exhausted' : 'unavailable';
    throw aiError(code, response.status === 429 ? 'The AI provider usage limit was reached. Try again later.' : response.status === 401 || response.status === 403 ? 'Reconnect this AI provider to restore access.' : 'The AI provider is temporarily unavailable.');
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream')) return normalizeResponse(provider, await response.json());
  let final; let message; const blocks = new Map();
  for await (const event of readSSE(response.body)) {
    if (event.type === 'error' || ['response.failed', 'response.incomplete'].includes(event.type)) throw aiError('unavailable', 'The AI response was interrupted or unavailable.');
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
