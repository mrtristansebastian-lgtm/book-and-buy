export const PROVIDERS = ['openai', 'anthropic', 'chatgpt'];
export function aiError(code, message) { return Object.assign(new Error(message), { code }); }
export const positive = (value, fallback, max = 10000000) => {
  const number = Number(value ?? fallback);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback;
};
export function modelConfig(provider, env) {
  const prefix = provider === 'anthropic' ? 'ANTHROPIC' : provider === 'chatgpt' ? 'CHATGPT' : 'OPENAI';
  const models = [...new Set(String(env[`AI_${prefix}_MODELS`] || '').split(',').map(value => value.trim()).filter(value => /^[\w.:-]{1,100}$/.test(value)))];
  const defaultModel = String(env[`AI_${prefix}_DEFAULT_MODEL`] || '');
  return { models: models.map(name => ({ name, label: name })), defaultModel: models.includes(defaultModel) ? defaultModel : '', configured: models.length > 0 && models.includes(defaultModel) };
}
export function encryptionKey(env) {
  const key = String(env.AI_SETTINGS_ENCRYPTION_KEY || '');
  if (key.length < 32) throw aiError('unavailable', 'AI connection storage is not configured.');
  return key;
}
export function validateRun(data, config) {
  if (!PROVIDERS.includes(data.provider)) throw aiError('invalid-argument', 'Choose an AI provider.');
  if (!['builder', 'ask', 'plan', 'butler'].includes(data.mode)) throw aiError('invalid-argument', 'Choose a supported assistant mode.');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(data.conversationId || '') || !/^[a-zA-Z0-9_-]{1,80}$/.test(data.requestId || '')) throw aiError('invalid-argument', 'A valid conversation and request identifier are required.');
  if (!config.configured) throw aiError('unavailable', 'AI models have not been configured for this provider.');
  const model = data.model || config.defaultModel;
  if (!config.models.some(item => item.name === model)) throw aiError('invalid-argument', 'Choose an available model.');
  if (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 12 || data.messages.some(item => !['user', 'assistant', 'system'].includes(item?.role) || typeof item.content !== 'string' || item.content.length > 120000)) throw aiError('invalid-argument', 'Send a supported conversation.');
  if (!data.messages.some(item => item.role === 'user')) throw aiError('invalid-argument', 'A user message is required.');
  if (data.format && (typeof data.format !== 'object' || data.format.type !== 'object' || JSON.stringify(data.format).length > 60000)) throw aiError('invalid-argument', 'The output schema is invalid or too large.');
  if (Buffer.byteLength(JSON.stringify(data.messages)) + Buffer.byteLength(JSON.stringify(data.format || {})) > 200000) throw aiError('invalid-argument', 'This conversation is too large.');
  return { ...data, model };
}
