import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {canonicalPayment,verifiedPaymentEvidence,validatePaymentReturnUrls,paymentReturnUrl,paymentAppId,paymentAttemptKey} from '../functions/payments/paymentPolicy.js';
import {verifyStripeSignature} from '../functions/payments/webhooks.js';
const workspace = {currency:'R',paymentGateways:[{gatewayType:'stripe',enabled:true,configured:true}]};
const source = {id:'order',paymentMethod:'stripe',paymentStatus:'unpaid',status:'pending',amountInCents:4200,currency:'R'};
test('payments use saved amounts, currency, transaction state and enabled gateway',() => {
  assert.deepEqual(canonicalPayment(source,workspace,{sourceType:'order',gatewayType:'stripe',amountInCents:1}),{amountInCents:4200,currency:'zar'});
  assert.throws(() => canonicalPayment(source,workspace,{sourceType:'order',gatewayType:'stripe',currency:'USD'}),/currency/);
  assert.throws(() => canonicalPayment({...source,paymentStatus:'paid'},workspace,{sourceType:'order',gatewayType:'stripe'}),/cannot accept/);
  assert.throws(() => canonicalPayment(source,{...workspace,paymentGateways:[]},{sourceType:'order',gatewayType:'stripe'}),/disabled/);
  assert.throws(() => paymentAppId('other-tenant-app'),/Invalid application/);
});
test('provider evidence must match exact amount, currency, source and provider reference',() => {
  const attempt = {gatewayType:'stripe',sourceType:'order',sourceId:'o',providerRef:'cs_1',amountInCents:4200,currency:'zar'};
  const evidence = {gatewayType:'stripe',providerPaymentId:'pi_1',providerRef:'cs_1',amountInCents:4200,currency:'ZAR'};
  assert.equal(verifiedPaymentEvidence(attempt,evidence),true);
  for (const change of [{amountInCents:1},{currency:'USD'},{providerRef:'cs_other'},{gatewayType:'paypal'},{sourceId:'other'}]) assert.throws(() => verifiedPaymentEvidence(attempt,{...evidence,...change}));
});
test('return URLs require trusted origins, preserve hash routes and idempotency is stable',() => {
  const raw = 'https://shop.example/#/w/shop/buy?paid=1';
  assert.equal(validatePaymentReturnUrls(raw,'https://shop.example/#/w/shop/buy?cancelled=1',['https://shop.example']).successUrl,raw);
  assert.throws(() => validatePaymentReturnUrls('https://attacker.example/','https://attacker.example/',['https://shop.example']),/approved/);
  assert.throws(() => validatePaymentReturnUrls('https://user:pass@shop.example/','https://shop.example/',['https://shop.example']),/approved/);
  assert.match(paymentReturnUrl(raw,'pay123','stripe'),/#\/w\/shop\/buy\?paid=1&attemptId=pay123&gateway=stripe$/);
  assert.equal(paymentAttemptKey('a','order','o','stripe','r'),paymentAttemptKey('a','order','o','stripe','r'));
  assert.notEqual(paymentAttemptKey('a','order','o','stripe','r'),paymentAttemptKey('b','order','o','stripe','r'));
});
test('Stripe signatures reject tampering and stale delivery and accept rotated signature lists',() => {
  const now = 1700000000000; const body = '{"id":"evt_1"}'; const time = now / 1000;
  const signature = createHmac('sha256','secret').update(`${time}.${body}`).digest('hex');
  assert.equal(verifyStripeSignature(body,`t=${time},v1=wrong,v1=${signature}`,'secret',now),true);
  assert.throws(() => verifyStripeSignature(body+'x',`t=${time},v1=${signature}`,'secret',now),/Invalid/);
  assert.throws(() => verifyStripeSignature(body,`t=${time},v1=${signature}`,'secret',now+301000),/Expired/);
});
