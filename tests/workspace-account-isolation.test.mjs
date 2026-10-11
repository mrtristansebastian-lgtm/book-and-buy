import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import ts from 'typescript';
import { needsEmailVerification } from '../src/features/auth/emailVerification.js';
import { workspaceConnectionError } from '../src/features/workspace/workspaceConnectionError.js';
import { createWorkspaceConflictReview, assertWorkspaceConflictCurrent } from '../src/shared/firebase/workspaceConflict.js';

test('switching owners blanks the previous business and waits for the new cloud workspace before saving', async () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  globalThis.window = {setTimeout:() => 1,clearTimeout() {}};
  globalThis.localStorage = {getItem:() => null,setItem() {}};
  try {
    let auth = {user:{uid:'owner-a',email:'a@example.test'},configured:true};
    let cursor = 0; let effects = []; let state; let subscriber; const slots = []; const pending = new Map(); const loads = []; const writes = [];
    const initial = {ownerId:'owner-a',brandName:'Private A',slug:'a',onboardingComplete:true,bookings:[{id:'private-a'}],products:[],services:[],website:{headline:'Private draft'},sectionRevisions:{}};
    const react = {...React,
      useState(initialValue) { const index=cursor++; slots[index] ??= {value:typeof initialValue === 'function' ? initialValue() : initialValue}; return [slots[index].value,value => {slots[index].value=typeof value === 'function' ? value(slots[index].value) : value;}]; },
      useRef(value) { return slots[cursor++] ??= {current:value}; },
      useMemo(factory) { return factory(); },
      useEffect(effect,deps) { const index=cursor++; const prior=slots[index]; if (!prior || deps.some((value,i) => value !== prior.deps[i])) { slots[index]={deps,cleanup:prior?.cleanup}; effects.push(() => {slots[index].cleanup?.();slots[index].cleanup=effect();}); } }
    };
    const {outputText} = ts.transpileModule(readFileSync(new URL('../src/features/workspace/WorkspaceContext.jsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
    const module = {exports:{}};
    new Function('module','exports','require',outputText)(module,module.exports,id => {
      if (id==='react') return react;
      if (id==='react/jsx-runtime') return {jsx:React.createElement,jsxs:React.createElement};
      if (id.endsWith('AuthContext')) return {useAuth:() => auth};
      if (id.endsWith('emailVerification')) return { needsEmailVerification };
      if (id.endsWith('workspaceConnectionError')) return { workspaceConnectionError };
      if (id.endsWith('demoWorkspace')) return {hydrateDemoWorkspace:() => initial};
      if (id.endsWith('blankWorkspace')) return {createBlankWorkspace:seed => ({brandName:'',slug:'',bookings:[],orders:[],products:[],services:[],website:{},...seed})};
      if (id.endsWith('workspaceDomain.js')) return {WORKSPACE_SECTIONS:{general:['brandName','slug','tagline'],website:['website'],products:['products']}};
      if (id.endsWith('workspaceConflict')) return {createWorkspaceConflictReview,assertWorkspaceConflictCurrent};
      if (id.endsWith('workspacePersistence')) return {readInitialWorkspace:() => initial,persistWorkspace() {},safeParse:(raw,fallback) => fallback,OWNER_KEY:'owner',MODE_KEY:'mode'};
      if (id.endsWith('createWorkspaceApi')) return {createWorkspaceApi:({workspace,setWorkspace}) => ({workspace,updateProfile:patch => setWorkspace(prior => ({...prior,...patch}))})};
      if (id.endsWith('ownerWorkspace')) return {
        readCachedOwnerBaseline:uid => uid === 'owner-a' ? {...initial,brandName:'Before local edit'} : null,
        loadOwnerWorkspaceFromFirestore:uid => {loads.push(uid);return new Promise(resolve => pending.set(uid,resolve));},
        saveOwnerWorkspaceToFirestore:(...args) => {writes.push(args);return Promise.resolve({ok:true});},
        subscribeOwnerWorkspace:(_uid,callback) => {subscriber=callback;return () => {};}
      };
      throw new Error(`Unexpected dependency ${id}`);
    });
    const render = () => {cursor=0;effects=[];const tree=module.exports.WorkspaceProvider({});state=tree.props.value;effects.forEach(effect => effect());return state.workspace;};
    render(); assert.deepEqual(loads,['owner-a']); assert.equal(writes.length,0); assert.equal(state.ownerWorkspaceReady,false);
    pending.get('owner-a')({...initial,brandName:'Server A',sectionRevisions:{general:1}}); await Promise.resolve();
    assert.equal(render().brandName,'Private A','Cached unsaved changes survive a refresh');
    assert.equal(state.workspace.sectionRevisions.general,0,'Recovered conflicting drafts still need revision review');
    auth={...auth,user:{uid:'owner-b',email:'b@example.test'}};
    render(); const switching = render();
    assert.deepEqual(loads,['owner-a','owner-b']);
    assert.equal(switching.ownerId,'owner-b'); assert.equal(switching.brandName,''); assert.deepEqual(switching.bookings,[]); assert.equal(switching.website.headline,undefined);
    assert.equal(state.ownerWorkspaceReady,false);
    assert.equal(writes.length,0,'Loading a different owner must never save the old business to that owner');
    pending.get('owner-b')({...switching,brandName:'Business B',slug:'b'}); await Promise.resolve();
    const remoteB=render(); assert.equal(remoteB.brandName,'Business B'); assert.equal(state.ownerWorkspaceReady,true);
    state.updateProfile({brandName:'Unsaved local B'}); render();
    subscriber({...remoteB,tagline:'Remote tagline',products:[{id:'new',name:'Live product'}],bookings:[{id:'remote-booking'}],sectionRevisions:{general:1,products:1}});
    const merged=render();
    assert.equal(merged.brandName,'Unsaved local B','Live snapshots preserve dirty owner edits');
    assert.equal(merged.tagline,'Remote tagline'); assert.equal(merged.products[0].id,'new'); assert.equal(merged.bookings[0].id,'remote-booking');
    assert.equal(merged.sectionRevisions.general,0,'Dirty sections retain their expected revision for conflict detection');
    assert.equal(merged.sectionRevisions.products,1);
    auth = {...auth, user:{uid:'owner-c',email:'c@example.test',emailVerified:false,providerData:[{providerId:'password'}]}};
    render(); render();
    assert.deepEqual(loads,['owner-a','owner-b'],'Unverified password accounts do not call protected workspace services');
    assert.equal(state.workspace.ownerId,'owner-c');
    assert.deepEqual(state.workspace.products,[]);
    auth = {...auth,user:{...auth.user,emailVerified:true}};
    render();
    assert.deepEqual(loads,['owner-a','owner-b','owner-c'],'Verification resumes the protected account load');
  } finally {
    if (previousWindow===undefined) delete globalThis.window; else globalThis.window=previousWindow;
    if (previousStorage===undefined) delete globalThis.localStorage; else globalThis.localStorage=previousStorage;
  }
});
