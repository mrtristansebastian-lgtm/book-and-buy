import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const editables = {
  EditableText: ({ as = 'span', value }) => value ? React.createElement(as, {}, value) : null,
  EditableImage: ({ src, alt, preset }) => React.createElement('img', { src: src || undefined, alt, 'data-preset': preset }),
  EditSection: ({ hidden, editMode, children }) => hidden && !editMode ? null : React.createElement('section', {}, children)
};
function load(file, name, overrides = {}) {
  const { outputText } = ts.transpileModule(source(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  const scoped = (id) => id === '../editable' || id === './editable' ? editables :
    id.endsWith('/Button') ? { Button: ({ children, disabled, onClick }) => React.createElement('button', { disabled, onClick }, children) } :
    overrides[id] || require(id);
  new Function('module', 'exports', 'require', outputText)(module, module.exports, scoped);
  return module.exports[name];
}
const About = load('src/features/website/components/home-sections/AboutSection.jsx', 'AboutSection');
const Gallery = load('src/features/website/components/home-sections/VenueSection.jsx', 'VenueSection', {
  '../../../../shared/ui/useDetailDialog': { useDetailDialog: () => React.useRef(null) }
});
const html = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('profile presents all existing story pages without a hidden page-turn interface', () => {
  const rendered = html(About, { website: { aboutPages: [
    { id: 'a', title: 'Our story', body: 'Existing copy', imageUrl: '/story.jpg', icon: 'info' },
    { id: 'b', title: 'Our mission', body: 'Existing mission' }
  ] } });
  assert.match(rendered, /Existing copy/);
  assert.match(rendered, /Existing mission/);
  assert.match(rendered, /story.jpg/);
  assert.doesNotMatch(rendered, /carousel|Previous page|Next page/);
});

test('legacy merchant story fields remain readable and empty profiles do not show ghost sections', () => {
  const rendered = html(About, { website: { aboutBody: 'About text', missionBody: 'Mission text', visionBody: 'Vision text' } });
  for (const text of ['About text', 'Mission text', 'Vision text']) assert.ok(rendered.includes(text));
  assert.equal(html(About, { website: {} }), '');
  assert.equal(html(About, { website: { aboutBody: 'hidden' }, hidden: true }), '');
});

test('profile photo gallery keeps captions and hides empty live slots, not merchant photos', () => {
  const props = { website: { venueTitle: 'Our photos' }, venueImages: [
    { id: 'a', url: '/photo.jpg', caption: 'The studio' }, { id: 'b', url: '', caption: '' }
  ] };
  const rendered = html(Gallery, props);
  assert.match(rendered, /View The studio/);
  assert.match(rendered, /alt="The studio"/);
  assert.equal((rendered.match(/<figure/g) || []).length, 1);
  assert.equal((html(Gallery, { ...props, editMode: true }).match(/<figure/g) || []).length, 2);
  assert.equal(html(Gallery, { website: {}, venueImages: [] }), '');
});

test('one shared identity sits above all profile tabs; URL drives tab selection', () => {
  const view = source('src/features/website/components/PublicSurfaceViews.jsx');
  assert.match(view, /bb-business-profile/);
  assert.ok(view.indexOf('<BusinessProfileHeader') < view.indexOf('<nav'));
  assert.doesNotMatch(view, /<HeroSection|setActiveTab|railLocked/);
  assert.match(view, /publicPagePath\(workspace\.slug, id\)/);
  assert.match(view, /id="bb-profile-panel-book"/);
  assert.match(view, /id="bb-profile-panel-buy"/);
});

test('profile edit reuses published banner/logo/copy and provides real customer Save/Message actions', () => {
  const header = source('src/features/website/components/BusinessProfileHeader.jsx');
  assert.match(header, /website\.heroImageUrl \|\| website\.heroImage/);
  assert.match(header, /website\.logoUrl \|\| workspace\.logoUrl/);
  assert.match(header, /preset="socialBanner"/);
  assert.match(header, /preset="logo"/);
  assert.match(header, /patchWebsite\(\{ homeSubtext: value, subcopy: value \}\)/);
  assert.match(header, /await startClientMessage/);
  assert.match(header, /togglePlaceSave\(workspace\.slug\)/);
  assert.match(header, /workspace\.isDemo && workspace\.slug === local\.slug/);
  assert.doesNotMatch(header, /\b5\.0\b|Open now|rating=/);
});

test('profile adapts to its actual preview width and photo dialog handles focus and Escape', () => {
  const css = source('src/design/business-profile.css');
  assert.doesNotThrow(() => postcss.parse(css));
  assert.match(css, /container-type: inline-size/);
  assert.match(css, /@container bb-profile-width \(max-width: 599px\)/);
  assert.match(css, /grid-template-columns: minmax\(0,1fr\)/);
  const gallery = source('src/features/website/components/home-sections/VenueSection.jsx');
  assert.match(gallery, /useDetailDialog\(viewerIndex != null, close\)/);
  assert.match(gallery, /createPortal/);
  assert.match(gallery, /aria-modal="true"/);
});

test('photo cropping escapes preview stacking contexts and retains modal keyboard focus', () => {
  const crop = source('src/features/media/ImageCropModal.jsx');
  assert.match(crop, /return createPortal\(/);
  assert.match(crop, /document\.body/);
  assert.match(crop, /useDetailDialog\(open, cancel\)/);
  assert.match(crop, /busyLabel="Saving…"/);
  const image = source('src/features/website/components/editable/EditableImage.jsx');
  assert.match(image, /compact \? <button type="button" className="bb-editable-image-hit bb-editable-image-icon"/);
});
