import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {publicCommerceCatalog,serviceCommerceQuote,getPublicCommerceContext,quotePublicCommerce} from '../functions/commerceRuntime.js';
import {commerceQuoteRevision,assertCommerceQuoteRevision} from '../functions/commercePolicy.js';
import {getLivePublicServiceAvailability} from '../functions/availability.js';
import {placeMarketOrder,updateMarketOrder} from '../functions/marketOrders.js';
import {writeGuardedBooking} from '../functions/rescheduling.js';
import {expireInventoryReservations} from '../functions/inventoryService.js';
import {settleVerifiedPayment} from '../functions/payments/settlement.js';
const require = createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,getApps} = require('firebase-admin/app'); const {getFirestore} = require('firebase-admin/firestore');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (enabled && !getApps().length) initializeApp({projectId:process.env.GCLOUD_PROJECT || 'demo-book-buy-agent'});
test('public live catalog is a strict DTO and service quote does not expose costs',() => {
  const ws = {ownerId:'owner',slug:'shop',currency:'R',products:[{id:'p',name:'Product',price:20,cost:7,lowStockThreshold:3,stockAvailable:2}],services:[{id:'s',name:'Service',price:30,cost:4,duration:60}],staff:[{id:'staff',name:'Person',email:'secret@example.test'}],orders:[{clientName:'Private'}],website:{privateField:'secret'},policies:{terms:'Terms'}};
  const catalog = publicCommerceCatalog(ws);
  assert.equal(catalog.products[0].price,20); assert.equal(catalog.products[0].cost,undefined); assert.equal(catalog.staff[0].email,undefined); assert.equal(catalog.orders,undefined); assert.equal(catalog.website,undefined);
  assert.equal(serviceCommerceQuote(ws,{serviceId:'s'}).amountInCents,3000);
  assert.throws(() => serviceCommerceQuote({...ws,services:[{...ws.services[0],price:'invalid'}]},{serviceId:'s'}),/price/);
});
test('service quotes require an enabled country and selected service and reject unavailable variants',() => {
  const workspace = {currency:'R',sectionRevisions:{services:4,website:2},services:[{id:'s',price:25,duration:30,variants:[{id:'v',name:'Package',price:40,available:true},{id:'off',price:1,available:false}]}],website:{markets:[{countryCode:'ZA',enabled:true,catalogMode:'selected',serviceIds:['s']},{countryCode:'US',enabled:false,catalogMode:'all'}]}};
  const quote = serviceCommerceQuote(workspace,{serviceId:'s',variantId:'v',countryCode:'za'});
  assert.equal(quote.amountInCents,4000); assert.equal(quote.revision,4); assert.equal(quote.quoteRevision.website,2);
  for (const input of [{serviceId:'s'},{serviceId:'s',countryCode:'US'},{serviceId:'s',countryCode:'ZA',variantId:'off'}]) assert.throws(() => serviceCommerceQuote(workspace,input),/available|unavailable/);
  assert.equal(assertCommerceQuoteRevision(workspace,'service',quote.quoteRevision),undefined);
  assert.throws(() => assertCommerceQuoteRevision({...workspace,sectionRevisions:{...workspace.sectionRevisions,website:3}},'service',quote.quoteRevision),/Refresh the quote/);
  assert.throws(() => assertCommerceQuoteRevision(workspace,'service',{services:4}),/Refresh the quote/);
  assert.deepEqual(publicCommerceCatalog(workspace,'ZA').revision,{...commerceQuoteRevision(workspace,'product'),services:4});
});
async function fixture(method='stripe') {
  const db = getFirestore(); const suffix = randomUUID(); const ownerId = `commerce-${suffix}`; const slug = `shop-${suffix}`; const root = `artifacts/book-and-buy-v1/users/${ownerId}`;
  const day = new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const settings = db.doc(`${root}/config/settings`);
  await settings.set({ownerId,slug,brandName:'Commerce fixture',currency:'R',timezone:'UTC',sectionRevisions:{products:0},products:[{id:'p',name:'Last item',price:20,cost:5,stockAvailable:'1',active:true}],services:[{id:'s',name:'Appointment',price:30,duration:60}],orders:[],bookings:[],paymentGateways:[{gatewayType:method,enabled:true,configured:true}],availabilityRules:{openWeekdays:['mon','tue','wed','thu','fri','sat','sun'],businessOpenTime:'09:00',businessCloseTime:'17:00'},website:{markets:[{id:'ZA',countryCode:'ZA',enabled:true,catalogMode:'all',shippingProfileIds:['flat']}],shippingProfiles:[{id:'flat',enabled:true,productMode:'all',rateCents:0}]}});
  await db.doc(`artifacts/book-and-buy-v1/public/data/workspaces/${slug}`).set({ownerId,slug,published:true,products:[{id:'p',price:1}]});
  const request = {slug,requestId:randomUUID(),paymentMethod:method,items:[{productId:'p',quantity:1}],client:{clientName:'Client',clientEmail:'client@example.test',country:'ZA',shippingAddress:'Fixture address'}};
  return {db,ownerId,slug,root,settings,day,request,auth:{uid:ownerId,token:{email:'owner@example.test',email_verified:true}}};
}
async function paymentFixture(f,order,id='one') {
  const attemptId = `pay-${id}-${randomUUID()}`; const providerRef = `cs-${randomUUID()}`;
  await f.db.doc(`${f.root}/payment_attempts/${attemptId}`).set({id:attemptId,ownerId:f.ownerId,sourceType:'order',sourceId:order.id,gatewayType:'stripe',providerRef,amountInCents:2000,currency:'zar',status:'redirected'});
  return {ownerId:f.ownerId,attemptId,gatewayType:'stripe',providerPaymentId:`pi-${randomUUID()}`,providerRef,amountInCents:2000,currency:'zar',eventId:`evt-${randomUUID()}`};
}
test('concurrent last-item orders reserve once and provider settlement commits once with amount verification',{skip:!enabled},async () => {
  const f = await fixture(); const races = await Promise.allSettled([placeMarketOrder(f.request,null,f.db),placeMarketOrder({...f.request,requestId:randomUUID()},null,f.db)]);
  assert.equal(races.filter((result) => result.status==='fulfilled').length,1);
  const order = races.find((result) => result.status==='fulfilled').value;
  assert.equal((await f.settings.get()).data().products[0].stockAvailable,'0');
  const evidence = await paymentFixture(f,order);
  await assert.rejects(settleVerifiedPayment({...evidence,amountInCents:1},f.db),/amount/);
  const paid = await settleVerifiedPayment(evidence,f.db); const replay = await settleVerifiedPayment(evidence,f.db);
  assert.deepEqual(paid,replay); assert.equal(paid.inventoryException,false);
  assert.equal((await f.db.doc(`${f.root}/inventoryReservations/${order.id}`).get()).data().status,'committed');
  assert.equal((await f.settings.get()).data().products[0].stockAvailable,'0');
});
test('expiry restores stock and late payment stays paid but blocks fulfillment',{skip:!enabled},async () => {
  const f = await fixture(); const order = await placeMarketOrder(f.request,null,f.db);
  await f.db.doc(`${f.root}/inventoryReservations/${order.id}`).update({expiresAtMs:Date.now()-1});
  assert.equal((await expireInventoryReservations({ownerId:f.ownerId},f.db)).expiredCount,1);
  assert.equal((await expireInventoryReservations({ownerId:f.ownerId},f.db)).expiredCount,0);
  const result = await settleVerifiedPayment(await paymentFixture(f,order),f.db); assert.equal(result.inventoryException,true);
  const saved = (await f.settings.get()).data(); assert.equal(saved.products[0].stockAvailable,'1'); assert.equal(saved.orders[0].paymentStatus,'paid'); assert.equal(saved.orders[0].inventoryStatus,'payment_exception');
  await assert.rejects(updateMarketOrder({ownerId:f.ownerId,id:order.id,expectedRevision:saved.orders[0].revision,patch:{status:'accepted'}},f.auth,f.db),/expired/);
});
test('manual acceptance reserves, retry returns one mutation and manual receipt commits',{skip:!enabled},async () => {
  const f = await fixture('cash'); const order = await placeMarketOrder(f.request,null,f.db); assert.equal((await f.settings.get()).data().products[0].stockAvailable,'1');
  const input = {ownerId:f.ownerId,id:order.id,expectedRevision:1,requestId:randomUUID(),patch:{status:'accepted'}};
  const accepted = await updateMarketOrder(input,f.auth,f.db); assert.deepEqual(await updateMarketOrder(input,f.auth,f.db),accepted);
  assert.equal((await f.settings.get()).data().products[0].stockAvailable,'0');
  const paid = await updateMarketOrder({ownerId:f.ownerId,id:order.id,expectedRevision:accepted.revision,requestId:randomUUID(),patch:{paymentStatus:'paid'}},f.auth,f.db);
  assert.equal(paid.inventoryStatus,'committed'); assert.equal((await f.settings.get()).data().products[0].stockAvailable,'0');
});
test('public live availability reflects canonical bookings and live catalog ignores stale published prices',{skip:!enabled},async () => {
  const f = await fixture('cash');
  const catalog = await getPublicCommerceContext({slug:f.slug,countryCode:'ZA'},f.db); assert.equal(catalog.products[0].price,20);
  const args = {slug:f.slug,serviceId:'s',dateKey:f.day,countryCode:'ZA'};
  const slots = await getLivePublicServiceAvailability(args,f.db); assert.ok(slots.some((slot) => slot.time==='09:00'));
  const data = {slug:f.slug,requestId:randomUUID(),serviceId:'s',dateKey:f.day,date:f.day,time:'09:00',clientName:'Client',clientEmail:'client@example.test',clientCountry:'ZA',paymentMethod:'cash',amountInCents:1};
  const booking = await writeGuardedBooking(data,null,f.db,true); assert.equal(booking.amountInCents,3000);
  assert.ok(!(await getLivePublicServiceAvailability(args,f.db)).some((slot) => slot.time==='09:00'));
});
test('catalog and policy revision changes reject old quote previews before mutation',{skip:!enabled},async () => {
  const f = await fixture('cash');
  const productQuote = await quotePublicCommerce({...f.request,kind:'product'},null,f.db);
  const serviceQuote = await quotePublicCommerce({slug:f.slug,kind:'service',serviceId:'s',countryCode:'ZA'},null,f.db);
  await f.settings.update({sectionRevisions:{products:1,services:1,website:1}});
  await assert.rejects(placeMarketOrder({...f.request,requestId:randomUUID(),expectedCatalogRevision:productQuote.revision},null,f.db),/Refresh the quote/);
  const booking = {slug:f.slug,requestId:randomUUID(),serviceId:'s',date:f.day,dateKey:f.day,time:'09:00',clientName:'Client',clientEmail:'client@example.test',clientCountry:'ZA',paymentMethod:'cash'};
  await assert.rejects(writeGuardedBooking({...booking,expectedCatalogRevision:serviceQuote.revision},null,f.db,true),/Refresh the quote/);
  const refreshed = await quotePublicCommerce({...f.request,kind:'product'},null,f.db);
  await f.settings.update({'sectionRevisions.website':2});
  await assert.rejects(placeMarketOrder({...f.request,requestId:randomUUID(),expectedQuoteRevision:refreshed.quoteRevision},null,f.db),/Refresh the quote/);
  const stored = (await f.settings.get()).data(); assert.equal(stored.orders.length,0); assert.equal(stored.bookings.length,0);
});
