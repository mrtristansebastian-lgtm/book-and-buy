import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveInventory,releaseInventory,commitInventory,inventoryHoldMs} from '../functions/inventoryDomain.js';
const workspace = {products:[{id:'p',stockAvailable:'1'}]};
const order = {id:'order',ownerId:'owner',paymentMethod:'stripe',items:[{productId:'p',quantity:1}]};
test('the last available item is deducted once, committed once and never released after commit',() => {
  const hold = reserveInventory(workspace,order,null,1000);
  assert.equal(hold.products[0].stockAvailable,'0'); assert.equal(hold.reservation.expiresAtMs,601000);
  assert.throws(() => reserveInventory({...workspace,products:hold.products},{...order,id:'other'},null,1000),/enough stock/);
  assert.equal(reserveInventory({...workspace,products:hold.products},order,hold.reservation,1001).changed,false);
  const committed = commitInventory({...workspace,products:hold.products},hold.reservation,2000);
  assert.equal(committed.reservation.status,'committed'); assert.equal(commitInventory(workspace,committed.reservation,3000).changed,false);
  assert.equal(releaseInventory(workspace,committed.reservation).changed,false);
});
test('late payment reacquires available stock once and cannot consume the same units twice',() => {
  const hold = reserveInventory(workspace,order,null,1000);
  const late = commitInventory({...workspace,products:hold.products},hold.reservation,601001);
  assert.equal(late.exception,false); assert.equal(late.products[0].stockAvailable,'0'); assert.equal(late.reservation.status,'committed');
  assert.equal(late.reservation.reacquiredAtMs,601001);
  assert.equal(releaseInventory({...workspace,products:late.products},late.reservation).changed,false);
  assert.equal(commitInventory({...workspace,products:late.products},late.reservation,601002).changed,false);
});

test('expiry restores stock once and late payment cannot steal a newer hold or resurrect a cancellation',() => {
  const hold = reserveInventory(workspace,order,null,1000);
  const expiry = releaseInventory({...workspace,products:hold.products},hold.reservation,'expired',601000);
  assert.equal(expiry.products[0].stockAvailable,'1');
  assert.equal(releaseInventory({...workspace,products:expiry.products},expiry.reservation,'expired',601001).changed,false);
  const competitor = reserveInventory({...workspace,products:expiry.products},{...order,id:'second'},null,601000);
  const late = commitInventory({...workspace,products:competitor.products},expiry.reservation,601001);
  assert.equal(late.exception,true); assert.equal(late.products[0].stockAvailable,'0');
  const cancelled = releaseInventory({...workspace,products:hold.products},hold.reservation,'cancelled',2000);
  assert.equal(commitInventory({...workspace,products:cancelled.products},cancelled.reservation,3000).exception,true);
});
test('variant quantities aggregate, unlimited catalog records are not accidentally made tracked, configurable holds validate',() => {
  const ws = {products:[{id:'p',variants:[{id:'v',stockAvailable:2},{id:'untracked'}]}],checkout:{inventoryOnlineHoldMinutes:20,inventoryManualHoldHours:12}};
  const held = reserveInventory(ws,{...order,items:[{productId:'p',variantId:'v',quantity:1},{productId:'p',variantId:'v',quantity:1},{productId:'p',variantId:'untracked',quantity:3}]},null,0);
  assert.equal(held.products[0].variants[0].stockAvailable,'0'); assert.equal(held.reservation.items.length,1); assert.equal(held.reservation.expiresAtMs,1200000);
  assert.equal(inventoryHoldMs(ws,'cash'),43200000);
  assert.throws(() => inventoryHoldMs({...ws,checkout:{inventoryOnlineHoldMinutes:0}},'stripe'),/hold duration/);
});
