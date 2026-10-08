import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceConflictReview, assertWorkspaceConflictCurrent } from '../src/shared/firebase/workspaceConflict.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { readFileSync } from 'node:fs';
import React from 'react';
import ts from 'typescript';

const baseline={ownerId:'owner',brandName:'Original',tagline:'Old tagline',products:[],sectionRevisions:{general:0,products:0}};
test('an explicit review includes only dirty fields and reapplies against the exact displayed cloud revision',() => {
  const draft={...baseline,brandName:'My new name'};
  const cloud={...baseline,brandName:'Other name',tagline:'Remote tagline',products:[{id:'p',name:'New product'}],sectionRevisions:{general:2,products:1}};
  const review=createWorkspaceConflictReview(baseline,draft,cloud);
  assert.deepEqual(review.rows,[{section:'general',field:'brandName',before:'Other name',after:'My new name'}]);
  assert.equal(assertWorkspaceConflictCurrent(review,draft),undefined);
  const saved=applyWorkspaceChanges(cloud,review.changes);
  assert.equal(saved.brandName,'My new name'); assert.equal(saved.tagline,'Remote tagline'); assert.equal(saved.products[0].id,'p');
  assert.throws(() => applyWorkspaceChanges({...cloud,sectionRevisions:{general:3}},review.changes),/changed in another session/);
});
test('a changed draft or owner invalidates a review before any retry can run',() => {
  const draft={...baseline,brandName:'Draft'};const review=createWorkspaceConflictReview(baseline,draft,baseline);
  assert.throws(() => assertWorkspaceConflictCurrent(review,{...draft,brandName:'New draft'}),/draft changed/);
  assert.throws(() => assertWorkspaceConflictCurrent(review,{...draft,ownerId:'other'}),/draft changed/);
  assert.equal(createWorkspaceConflictReview(baseline,draft,draft).changes.length,0);
});

test('the review dialog writes only after the owner chooses Keep my changes and reports failed approval',async () => {
  const draft={...baseline,brandName:'Draft'},review=createWorkspaceConflictReview(baseline,draft,baseline);
  let cursor=0;const states=[];const calls=[];let closed=0;
  const Button=() => null;const module={exports:{}};
  const {outputText}=ts.transpileModule(readFileSync(new URL('../src/features/settings/WorkspaceSaveReview.jsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  new Function('module','exports','require',outputText)(module,module.exports,id => {
    if (id==='react') return {...React,useId:() => 'review',useState:initial => {const index=cursor++;states[index] ??= {value:initial};return [states[index].value,value => {states[index].value=value;}];}};
    if (id==='react/jsx-runtime') return {jsx:React.createElement,jsxs:React.createElement};
    if (id==='react-dom') return {createPortal:tree => tree};
    if (id.endsWith('/Button')) return {Button};
    if (id.endsWith('/useDetailDialog')) return {useDetailDialog:() => ({current:{focus() {}}})};
    throw new Error(`Unexpected dependency ${id}`);
  });
  const priorDocument=globalThis.document;globalThis.document={body:{}};
  try {
    const render=() => {cursor=0;return module.exports.WorkspaceSaveReview({review,onResolve:async (...args) => {calls.push(args);throw new Error('This section changed again.');},onClose:() => closed++});};
    const all=(node,result=[]) => {if (Array.isArray(node)) node.forEach(child => all(child,result));else if (React.isValidElement(node)) {result.push(node);all(node.props.children,result);}return result;};
    const tree=render();assert.equal(tree.props.role,'dialog');assert.equal(calls.length,0);
    all(tree).find(node => node.type===Button && node.props.children==='Keep editing').props.onClick();assert.equal(closed,1);assert.equal(calls.length,0);
    await all(tree).find(node => node.type===Button && node.props.children==='Keep my changes').props.onClick();
    assert.deepEqual(calls,[[review,'reapply']]);
    assert.equal(all(render()).find(node => node.props.role==='alert').props.children,'This section changed again.');
  } finally {if (priorDocument===undefined) delete globalThis.document;else globalThis.document=priorDocument;}
});
