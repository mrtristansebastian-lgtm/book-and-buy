import { aiError } from './config.js';
// The editor's small portable schema subset; reject unsupported validation keywords.
const keywords = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'anyOf', 'oneOf', 'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'maximum', 'description', 'title', 'default']);
export function validateSchema(schema, depth = 0) {
  if (depth > 15 || !schema || typeof schema !== 'object' || Array.isArray(schema) || Object.keys(schema).some(key => !keywords.has(key))) throw aiError('invalid-argument', 'This output schema uses unsupported validation rules.');
  for (const child of Object.values(schema.properties || {})) validateSchema(child, depth + 1);
  if (schema.items) validateSchema(schema.items, depth + 1);
  for (const child of [...(schema.anyOf || []), ...(schema.oneOf || [])]) validateSchema(child, depth + 1);
}
export function matchesSchema(value, schema) {
  if (schema.anyOf && !schema.anyOf.some(child => matchesSchema(value, child))) return false;
  if (schema.oneOf && schema.oneOf.filter(child => matchesSchema(value, child)).length !== 1) return false;
  if (schema.enum && !schema.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) return false;
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) return false;
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).some(item => item === type || (item === 'integer' && Number.isSafeInteger(value)))) return false;
  if (type === 'object') {
    if ((schema.required || []).some(key => !Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(schema.properties || {}, key))) return false;
    for (const [key, child] of Object.entries(schema.properties || {})) if (Object.hasOwn(value, key) && !matchesSchema(value[key], child)) return false;
  }
  if (type === 'array' && ((schema.minItems != null && value.length < schema.minItems) || (schema.maxItems != null && value.length > schema.maxItems) || (schema.items && value.some(item => !matchesSchema(item, schema.items))))) return false;
  if (type === 'string' && ((schema.minLength != null && value.length < schema.minLength) || (schema.maxLength != null && value.length > schema.maxLength))) return false;
  if (type === 'number' && (!Number.isFinite(value) || (schema.minimum != null && value < schema.minimum) || (schema.maximum != null && value > schema.maximum))) return false;
  return true;
}
