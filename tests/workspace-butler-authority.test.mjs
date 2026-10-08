import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { applyWorkspaceChanges, assertOwner, safeValue, SETTINGS_COVERAGE } from '../functions/workspaceDomain.js';
import { patchOwnerWorkspace, getOwnerWorkspace, migrateWorkspaceCollections, abortWorkspaceMigration, publishBusinessProfile, syncPublicBusinessProfile } from '../functions/workspaceCommands.js';
import { buildButlerCommand, authorizeStandingPolicy, validateButlerArguments, mergeStaffSchedule } from '../functions/butlerDomain.js';
import { executeButlerTool, applyButlerPreview, dismissButlerPreview, saveButlerAutomation, runButlerAutomations, limitedButlerRecords } from '../functions/butler.js';
import { SETTINGS_SECTIONS } from '../src/features/settings/settingsNav.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app'), { getFirestore } = require('firebase-admin/firestore');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (enabled && !getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-book-buy-agent' });
const original = () => ({ brandName:'Tea shop', slug:`shop-${randomUUID()}`, timezone:'UTC', currency:'R', products:[{id:'tea',name:'Tea',price:10,cost:4,stockAvailable:2,variants:[{id:'small',price:5,stockAvailable:0}]}], services:[], clients:[], orders:[], bookings:[], sectionRevisions:{products:0,general:0}, website:{} });
test('coverage includes every app settings page and separates unavailable capabilities', () => {
  assert.deepEqual(new Set(SETTINGS_COVERAGE.map(row => row.id)), new Set(SETTINGS_SECTIONS.map(row => row.id)));
  assert.equal(SETTINGS_COVERAGE.find(row => row.id === 'billing').status,'unavailable');
});
test('section commands protect stock identities, reject duplicates, and block credentials or another owner', () => {
  const old = original();
  const next = applyWorkspaceChanges(old,[{section:'products',expectedRevision:0,patch:{products:[{id:'tea',name:'Fresh tea',price:12,stockAvailable:900,variants:[]}]}}]);
  assert.equal(next.products[0].stockAvailable,2); assert.equal(next.products[0].variants[0].stockAvailable,0); assert.equal(next.products[0].variants[0].available,false);
  assert.throws(() => applyWorkspaceChanges(old,[{section:'products',expectedRevision:0,patch:{products:[{...old.products[0],variants:[{id:'a'},{id:'a'}]}]}}]),/unique/);
  assert.throws(() => applyWorkspaceChanges(old,[{section:'general',expectedRevision:0,patch:{paymentGateways:[]}}]),/outside/);
  assert.throws(() => safeValue({provider:{apiKey:'secret'}}),/secure connection/);
  assert.throws(() => assertOwner('owner-a',{uid:'owner-b'}),/owner/);
});
test('Butler tool contracts reject unsupported input and website operations retain their trusted name', () => {
  assert.throws(() => validateButlerArguments('orders.preview',{id:'a',patch:{status:'accepted'},approve:true}),/unsupported/);
  assert.throws(() => validateButlerArguments('availability.read',{serviceId:'s'}),/missing/);
  assert.equal(buildButlerCommand(original(),'website.publish.preview',{operation:'publish',project:{html:'x'}}).operation,'website.publish');
  assert.equal(buildButlerCommand(original(),'website.publish.preview',{operation:'rollback',revision:'abc'}).operation,'website.rollback');
  const policy = {enabled:true,maxRecords:1,recordIds:['tea'],allowedFields:['tags']};
  assert.equal(authorizeStandingPolicy(policy,'catalog.preview',{section:'products',id:'tea',patch:{tags:['Featured']}}),true);
  assert.equal(authorizeStandingPolicy(policy,'catalog.preview',{section:'products',id:'tea',record:{price:0},patch:{tags:['Featured']}}),false);
  assert.equal(authorizeStandingPolicy(policy,'inventory.preview',{id:'tea',patch:{stockAvailable:99}}),false);
});
test('staff proposals preserve other dates and reject invalid operational schedules', () => {
  const old = { staffId:'person',weekTemplate:{mon:{open:true,ranges:[{start:'09:00',end:'17:00'}]},tue:{open:true,ranges:[{start:'09:00',end:'17:00'}]}},days:{'2030-01-01':{status:'off',open:false},'2030-01-02':{status:'off',open:false}} };
  const next = mergeStaffSchedule(old,{weekTemplate:{mon:{open:false}},days:{'2030-01-01':{status:'open',ranges:[{start:'10:00',end:'14:00'}]}}},'person');
  assert.deepEqual(next.weekTemplate.tue,old.weekTemplate.tue);
  assert.deepEqual(next.days['2030-01-02'],old.days['2030-01-02']);
  assert.equal(next.days['2030-01-01'].open,true);
  for (const patch of [{staffId:'other'},{days:{'2030-02-30':{status:'open'}}},{weekTemplate:{mon:{ranges:[{start:'25:00',end:'14:00'}]}}},{days:{'2030-01-01':{status:'open',open:false}}},{workingHours:[]}]) assert.throws(() => mergeStaffSchedule(old,patch,'person'));
  assert.throws(() => buildButlerCommand(original(),'schedules.preview',{staffId:'unknown',patch:{days:{}}}),/current staff/);
  assert.throws(() => buildButlerCommand(original(),'website.design.preview',{project:{id:'site',html:'<html></html>'}}),/draft revision/);
  assert.equal(buildButlerCommand(original(),'website.design.preview',{project:{id:'site',html:'<html></html>'},expectedRevision:0}).operation,'website.draft.save');
});
test('large Butler read pages remain bounded and explicitly paginate omitted records', () => {
  const rows = Array.from({length:100},(_,i) => ({id:String(i),name:'Long'.repeat(2500),notes:'x'.repeat(10000)}));
  let offset=0,seen=0;
  do {const page=limitedButlerRecords(rows,{limit:100,offset});assert.ok(Buffer.byteLength(JSON.stringify(page))<12000);assert.ok(page.records.every(row => row.omitted));seen+=page.records.length;offset=page.nextOffset;} while (offset!==null);
  assert.equal(seen,100);
  assert.deepEqual(limitedButlerRecords([{id:'a',name:'Tea'},{id:'b',name:'Coffee'}],{query:'tea'}).records.map(row=>row.id),['a']);
});
async function fixture() {
  const db=getFirestore(),ownerId=`harness-${randomUUID()}`,root=`artifacts/book-and-buy-v1/users/${ownerId}`,auth={uid:ownerId,token:{email_verified:true,firebase:{sign_in_provider:'password'}}},workspace={...original(),ownerId};
  const ref=db.doc(`${root}/config/settings`); await ref.set(workspace); return {db,ownerId,root,auth,workspace,ref};
}
test('emulator section revisions serialize competing edits and request replay remains idempotent',{skip:!enabled},async () => {
  const f=await fixture(),input={ownerId:f.ownerId,requestId:randomUUID(),changes:[{section:'general',expectedRevision:0,patch:{brandName:'First'}}]};
  const race=await Promise.allSettled([patchOwnerWorkspace(input,f.auth,f.db),patchOwnerWorkspace({...input,requestId:randomUUID(),changes:[{section:'general',expectedRevision:0,patch:{brandName:'Second'}}]},f.auth,f.db)]);
  assert.equal(race.filter(row=>row.status==='fulfilled').length,1);
  const winner=race.findIndex(row=>row.status==='fulfilled');
  if (winner===0) { assert.equal((await patchOwnerWorkspace(input,f.auth,f.db)).duplicate,true); assert.equal((await f.ref.get()).data().mutationEpoch,1); }
  await assert.rejects(patchOwnerWorkspace({...input,ownerId:'other'},f.auth,f.db),/owner/);
});
test('emulator collection cutover verifies data and leaves only the collection writer authoritative',{skip:!enabled},async () => {
  const f=await fixture(),migrated=await migrateWorkspaceCollections({ownerId:f.ownerId,requestId:randomUUID()},f.auth,f.db);
  assert.equal(migrated.manifest.products.count,1);
  await patchOwnerWorkspace({ownerId:f.ownerId,requestId:randomUUID(),changes:[{section:'products',expectedRevision:0,patch:{products:[{...f.workspace.products[0],name:'Collection tea'}]}}]},f.auth,f.db);
  assert.equal((await getOwnerWorkspace({ownerId:f.ownerId},f.auth,f.db)).products[0].name,'Collection tea');
  assert.equal((await f.ref.get()).data().products[0].name,'Tea','The legacy array is frozen');
});
test('emulator aborted migration retries in a fresh epoch and ignores old backfill records',{skip:!enabled},async () => {
  const f=await fixture(),requestId=randomUUID();
  await f.ref.update({migration:{id:requestId,epoch:1,status:'paused',startedAt:Date.now()}});
  await f.db.doc(`${f.root}/catalogProducts/ghost`).set({id:'ghost',name:'Old record',_storageEpoch:1});
  await abortWorkspaceMigration({ownerId:f.ownerId,requestId},f.auth,f.db);
  const result=await migrateWorkspaceCollections({ownerId:f.ownerId,requestId:randomUUID()},f.auth,f.db);
  assert.equal(result.epoch,2); assert.deepEqual((await getOwnerWorkspace({ownerId:f.ownerId},f.auth,f.db)).products.map(row=>row.id),['tea']);
});
test('emulator live public projection updates catalog while excluding private records and costs',{skip:!enabled},async () => {
  const f=await fixture(); await publishBusinessProfile({ownerId:f.ownerId},f.auth,f.db);
  const publicRef=f.db.doc(`artifacts/book-and-buy-v1/public/data/workspaces/${f.workspace.slug}`),previous=(await publicRef.get()).data();
  await patchOwnerWorkspace({ownerId:f.ownerId,requestId:randomUUID(),changes:[{section:'products',expectedRevision:0,patch:{products:[{...f.workspace.products[0],price:14}]}}]},f.auth,f.db);
  await syncPublicBusinessProfile(f.ownerId,f.db); const next=(await publicRef.get()).data();
  assert.equal(next.products[0].price,14); assert.equal(next.publishedAt,previous.publishedAt); assert.equal(next.products[0].cost,undefined); assert.equal(next.orders,undefined);
});
test('emulator Butler writes need inline approval and dismiss/stale proposals cannot execute',{skip:!enabled},async () => {
  const f=await fixture(),request={uid:f.ownerId,workspaceId:f.ownerId,name:'catalog.preview',arguments:{section:'products',id:'tea',patch:{name:'Better tea'}}};
  const proposal=await executeButlerTool(request,f.db);
  await assert.rejects(applyButlerPreview({workspaceId:f.ownerId,previewId:proposal.previewId},f.auth,f.db),/approval/);
  assert.equal((await f.ref.get()).data().products[0].name,'Tea');
  await applyButlerPreview({workspaceId:f.ownerId,previewId:proposal.previewId,approve:true},f.auth,f.db);
  await applyButlerPreview({workspaceId:f.ownerId,previewId:proposal.previewId,approve:true},f.auth,f.db);
  assert.equal((await f.ref.get()).data().mutationEpoch,1);
  assert.equal((await f.db.collection(`${f.root}/butlerAudit`).get()).size,1);
  const dismissed=await executeButlerTool(request,f.db); await dismissButlerPreview({workspaceId:f.ownerId,previewId:dismissed.previewId},f.auth,f.db);
  await assert.rejects(applyButlerPreview({workspaceId:f.ownerId,previewId:dismissed.previewId,approve:true},f.auth,f.db),/dismissed/);
  const stale=await executeButlerTool(request,f.db); await f.ref.update({'sectionRevisions.general':1});
  await assert.rejects(applyButlerPreview({workspaceId:f.ownerId,previewId:stale.previewId,approve:true},f.auth,f.db),/stale/);
  await assert.rejects(executeButlerTool({...request,mode:'plan'},f.db),/read/);
});
test('emulator committed Butler actions recover an interrupted approval exactly once',{skip:!enabled},async () => {
  const f=await fixture(),proposal=await executeButlerTool({uid:f.ownerId,workspaceId:f.ownerId,name:'catalog.preview',arguments:{section:'products',id:'tea',patch:{name:'Recovered tea'}}},f.db),previewRef=f.db.doc(`${f.root}/butlerPreviews/${proposal.previewId}`),preview=(await previewRef.get()).data();
  await previewRef.update({executionAttempted:true,status:'executing',approvedActor:f.ownerId,leaseUntil:0,expiresAt:0});
  await patchOwnerWorkspace({ownerId:f.ownerId,changes:preview.command.changes,requestId:`butler-${proposal.previewId}`},f.auth,f.db);
  assert.equal((await applyButlerPreview({workspaceId:f.ownerId,previewId:proposal.previewId,approve:true},f.auth,f.db)).ok,true);
  assert.equal((await f.ref.get()).data().mutationEpoch,1); assert.equal((await previewRef.get()).data().status,'applied');
});
test('emulator routines enforce conditions, preserve newer tags, deduplicate and recover expired run leases',{skip:!enabled},async () => {
  const f=await fixture();
  const policy=await saveButlerAutomation({workspaceId:f.ownerId,expectedRevision:0,policy:{name:'Keep featured',enabled:true,tool:'catalog.preview',recordIds:['tea'],allowedFields:['tags'],mergeTags:true,args:{section:'products',id:'tea',patch:{tags:['Featured']}},trigger:'schedule',intervalMinutes:1440,maxRunsPerDay:1,maxRecords:1}},f.auth,f.db);
  const policyRef=f.db.doc(`${f.root}/butlerAutomations/${policy.id}`); await policyRef.update({nextRunAt:0});
  await f.ref.update({products:[{...f.workspace.products[0],tags:['New arrival']}]});
  await runButlerAutomations({},f.db); await runButlerAutomations({},f.db);
  assert.deepEqual((await f.ref.get()).data().products[0].tags,['New arrival','Featured']);
  assert.equal((await f.db.collection(`${f.root}/butlerAutomationRuns`).get()).size,1); assert.equal((await f.ref.get()).data().lastCommandSource,'automation');
  const runRef=f.db.doc(`${f.root}/butlerAutomationRuns/recovery`);
  await runRef.set({status:'running',ownerId:f.ownerId,policyId:policy.id,revision:policy.revision,previewId:'routine-recovery',at:Date.now(),leaseUntil:0});
  await runButlerAutomations({},f.db); assert.equal((await runRef.get()).data().status,'complete');
  assert.equal((await f.db.collection(`${f.root}/butlerPreviews`).get()).size,2);
  await saveButlerAutomation({ workspaceId:f.ownerId, id:policy.id, expectedRevision:policy.revision, policy:{...policy,conditions:[{field:'status',equals:'archived'}]} },f.auth,f.db);
  await policyRef.update({nextRunAt:0,runsToday:0});
  await runButlerAutomations({},f.db);
  assert.equal((await f.db.collection(`${f.root}/butlerAutomationRuns`).where('status','==','failed').get()).size,1);
});

test('emulator routine edits cannot reset daily limits and expired permissions can be paused',{skip:!enabled},async () => {
  const f=await fixture();
  const input={name:'Tag tea',enabled:true,tool:'catalog.preview',recordIds:['tea'],allowedFields:['tags'],args:{section:'products',id:'tea',patch:{tags:['Featured']}},trigger:'schedule',intervalMinutes:60,maxRunsPerDay:1};
  const policy=await saveButlerAutomation({workspaceId:f.ownerId,policy:input},f.auth,f.db);
  const ref=f.db.doc(`${f.root}/butlerAutomations/${policy.id}`),day=new Date().toISOString().slice(0,10);
  await ref.update({runsToday:1,runDay:day});
  const edited=await saveButlerAutomation({workspaceId:f.ownerId,id:policy.id,expectedRevision:policy.revision,policy:{...input,runsToday:0}},f.auth,f.db);
  assert.equal(edited.runsToday,1);
  const paused=await saveButlerAutomation({workspaceId:f.ownerId,id:policy.id,expectedRevision:edited.revision,policy:{...input,enabled:false,expiresAt:1}},f.auth,f.db);
  assert.equal(paused.enabled,false);
  await assert.rejects(saveButlerAutomation({workspaceId:f.ownerId,policy:{...input,args:{...input.args,approve:true}}},f.auth,f.db),/unsupported/);
});
test('emulator exhausted and expired routines leave the due queue and event bursts obey frequency',{skip:!enabled},async () => {
  const f=await fixture(),policyInput={name:'Tag tea',enabled:true,tool:'catalog.preview',recordIds:['tea'],allowedFields:['tags'],args:{section:'products',id:'tea',patch:{tags:['Featured']}},trigger:'schedule',intervalMinutes:15,maxRunsPerDay:1};
  const exhausted=await saveButlerAutomation({workspaceId:f.ownerId,policy:policyInput},f.auth,f.db),exhaustedRef=f.db.doc(`${f.root}/butlerAutomations/${exhausted.id}`);
  await exhaustedRef.update({nextRunAt:0,runDay:new Date().toISOString().slice(0,10),runsToday:1});
  const expired=await saveButlerAutomation({workspaceId:f.ownerId,policy:policyInput},f.auth,f.db),expiredRef=f.db.doc(`${f.root}/butlerAutomations/${expired.id}`);
  await expiredRef.update({nextRunAt:0,expiresAt:1});
  await runButlerAutomations({},f.db);
  assert.ok((await exhaustedRef.get()).data().nextRunAt>Date.now());
  assert.equal((await expiredRef.get()).data().enabled,false);
  const event=await saveButlerAutomation({workspaceId:f.ownerId,policy:{...policyInput,trigger:'workspace_updated',maxRunsPerDay:2}},f.auth,f.db),eventRef=f.db.doc(`${f.root}/butlerAutomations/${event.id}`);
  await eventRef.update({nextRunAt:0});
  await runButlerAutomations({eventOwnerId:f.ownerId,eventId:'first-event'},f.db);
  await runButlerAutomations({eventOwnerId:f.ownerId,eventId:'second-event'},f.db);
  await runButlerAutomations({eventOwnerId:f.ownerId,eventId:'first-event'},f.db);
  assert.equal((await eventRef.get()).data().runsToday,1);
  assert.equal((await f.db.collection(`${f.root}/butlerAutomationRuns`).get()).size,1);
});


test('emulator deleted conversations cannot create or execute outstanding Butler previews',{skip:!enabled},async () => {
  const f=await fixture(), chat=f.db.doc(`${f.root}/aiConversations/chat`); await chat.set({status:'active'});
  const proposal=await executeButlerTool({uid:f.ownerId,workspaceId:f.ownerId,name:'catalog.preview',arguments:{section:'products',id:'tea',patch:{name:'Deleted chat edit'}},conversationId:'chat',runId:'run'},f.db);
  await chat.update({status:'deleting'});
  await assert.rejects(applyButlerPreview({workspaceId:f.ownerId,previewId:proposal.previewId,approve:true},f.auth,f.db),/conversation was deleted/);
  await assert.rejects(executeButlerTool({uid:f.ownerId,workspaceId:f.ownerId,name:'catalog.preview',arguments:{section:'products',id:'tea',patch:{name:'Late edit'}},conversationId:'chat',requestId:'late'},f.db),/Conversation deleted/);
  assert.equal((await f.ref.get()).data().products[0].name,'Tea');
});
