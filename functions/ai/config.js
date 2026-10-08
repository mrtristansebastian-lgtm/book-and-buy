export const PROVIDERS = ['openai', 'anthropic', 'chatgpt'];
export function aiError(code, message) { return Object.assign(new Error(message), { code }); }
export const positive = (value, fallback, max = 10000000) => {
  const number = Number(value ?? fallback);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback;
};
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const descriptions = { none: 'Fastest response', minimal: 'Light reasoning', low: 'Fast and focused', medium: 'Balanced reasoning', high: 'More thorough reasoning', xhigh: 'Deep reasoning for difficult work', max: 'Most thorough reasoning' };
export function modelCapabilities(name, configured = {}) {
  if (!configured || typeof configured !== 'object' || Array.isArray(configured)) configured = {};
  // Unknown models expose no reasoning controls until explicitly configured.
  // Unsupported effort values must never be sent to a provider.
  let defaults = [];
  if (/^gpt-(?:6\.1-sol|6-astra)(?:$|-)/.test(name)) defaults = ['low', 'medium', 'high', 'xhigh', 'max'];
  else if (/^gpt-(?:6-(?:sol|luna)|5\.6)(?:$|-)/.test(name)) defaults = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
  else if (/^gpt-5(?:\.\d+)?(?:$|-)/.test(name)) defaults = ['low', 'medium', 'high'];
  else if (/^(?:o3|o4-mini)(?:$|-)/.test(name)) defaults = ['low', 'medium', 'high'];
  const efforts = Array.isArray(configured.efforts) ? configured.efforts.filter(value => EFFORTS.includes(value)) : defaults;
  const values = [...new Set(efforts)];
  const defaultEffort = values.includes(configured.defaultEffort) ? configured.defaultEffort : values.includes('medium') ? 'medium' : values[0] || '';
  return { defaultEffort, efforts: values.map(reasoningEffort => ({ reasoningEffort, description: descriptions[reasoningEffort] })) };
}
export function modelConfig(provider, env) {
  const prefix = provider === 'anthropic' ? 'ANTHROPIC' : provider === 'chatgpt' ? 'CHATGPT' : 'OPENAI';
  const models = [...new Set(String(env[`AI_${prefix}_MODELS`] || '').split(',').map(value => value.trim()).filter(value => /^[\w.:-]{1,100}$/.test(value)))];
  const defaultModel = String(env[`AI_${prefix}_DEFAULT_MODEL`] || '');
  let capabilities = {};
  try { capabilities = JSON.parse(env[`AI_${prefix}_MODEL_CAPABILITIES`] || '{}'); } catch { return { models: [], defaultModel: '', configured: false }; }
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return { models: [], defaultModel: '', configured: false };
  return { models: models.map(name => ({ name, label: name, ...modelCapabilities(provider === 'anthropic' ? '' : name, capabilities[name]) })), defaultModel: models.includes(defaultModel) ? defaultModel : '', configured: models.length > 0 && models.includes(defaultModel) };
}
export function encryptionKey(env) {
  const key = String(env.AI_SETTINGS_ENCRYPTION_KEY || '');
  if (key.length < 32) throw aiError('unavailable', 'AI connection storage is not configured.');
  return key;
}
export function validateRun(data, config) {
  if (data.attachments !== undefined && (!Array.isArray(data.attachments) || data.attachments.length)) throw aiError('invalid-argument', 'AI file attachments are not supported yet. Import website source through the builder tools instead.');
  if (!PROVIDERS.includes(data.provider)) throw aiError('invalid-argument', 'Choose an AI provider.');
  if (!['builder', 'ask', 'plan', 'butler'].includes(data.mode)) throw aiError('invalid-argument', 'Choose a supported assistant mode.');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(data.conversationId || '') || !/^[a-zA-Z0-9_-]{1,80}$/.test(data.requestId || '')) throw aiError('invalid-argument', 'A valid conversation and request identifier are required.');
  if (data.connectionRevision !== undefined && !/^[a-f0-9]{64}$/.test(data.connectionRevision)) throw aiError('invalid-argument', 'Refresh your AI connection before starting a request.');
  if (!config.configured) throw aiError('unavailable', 'AI models have not been configured for this provider.');
  const model = data.model || config.defaultModel;
  const selected = config.models.find(item => item.name === model);
  if (!selected) throw aiError('invalid-argument', 'Choose an available model.');
  const reasoningEffort = data.reasoningEffort || data.effort || selected.defaultEffort || undefined;
  if (reasoningEffort && !selected.efforts?.some(item => item.reasoningEffort === reasoningEffort)) throw aiError('invalid-argument', 'Choose a supported thinking level for this model.');
  if (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 12 || data.messages.some(item => !['user', 'assistant', 'system'].includes(item?.role) || typeof item.content !== 'string' || item.content.length > 120000)) throw aiError('invalid-argument', 'Send a supported conversation.');
  if (!data.messages.some(item => item.role === 'user')) throw aiError('invalid-argument', 'A user message is required.');
  if (data.format && (typeof data.format !== 'object' || data.format.type !== 'object' || JSON.stringify(data.format).length > 60000)) throw aiError('invalid-argument', 'The output schema is invalid or too large.');
  if (Buffer.byteLength(JSON.stringify(data.messages)) + Buffer.byteLength(JSON.stringify(data.format || {})) > 200000) throw aiError('invalid-argument', 'This conversation is too large.');
  return { ...data, model, reasoningEffort };
}
