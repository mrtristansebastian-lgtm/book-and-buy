import test from 'node:test';
import assert from 'node:assert/strict';
import { stripPublicCatalogCosts } from '../scripts/scrub-public-catalog-costs.mjs';

test('legacy public cost repair removes only cost metadata and retains typed price, stock and variant values', () => {
  const input = { arrayValue: { values: [{ mapValue: { fields: {
    name: { stringValue: 'Apron' }, price: { doubleValue: 250 }, stockAvailable: { integerValue: '5' },
    cost: { doubleValue: 125 }, costBasisInCents: { integerValue: '12500' },
    variants: { arrayValue: { values: [{ mapValue: { fields: {
      id: { stringValue: 'large' }, price: { doubleValue: 275 },
      optionValues: { mapValue: { fields: { Size: { stringValue: 'Large' } } } },
      cost: { doubleValue: 140 }, unitCostInCents: { integerValue: '14000' }
    } } }] } }
  } } }] } };
  const original = JSON.stringify(input);
  const sanitized = stripPublicCatalogCosts(input);
  assert.equal(sanitized.removed, 4);
  const fields = sanitized.value.arrayValue.values[0].mapValue.fields;
  assert.deepEqual(fields.name, input.arrayValue.values[0].mapValue.fields.name);
  assert.deepEqual(fields.price, { doubleValue: 250 });
  assert.deepEqual(fields.stockAvailable, { integerValue: '5' });
  assert.deepEqual(fields.variants.arrayValue.values[0].mapValue.fields.optionValues,
    { mapValue: { fields: { Size: { stringValue: 'Large' } } } });
  assert.doesNotMatch(JSON.stringify(sanitized.value), /"(?:cost|costBasisInCents|unitCostInCents)"/);
  assert.equal(JSON.stringify(input), original, 'Read inspection does not mutate the fetched data');
  assert.equal(stripPublicCatalogCosts(sanitized.value).removed, 0, 'Repeated repair is safe');
});
