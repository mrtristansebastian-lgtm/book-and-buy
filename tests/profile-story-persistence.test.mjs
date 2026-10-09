import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileStory, publicProfileStory } from '../functions/profileStoryDomain.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { publicProfile } from '../functions/workspaceCommands.js';

const chapter = overrides => ({ id: 'our-story', title: 'Our story', body: 'Made with care.\n\nBuilt together.', imageUrl: 'https://images.example.test/story.jpg', ...overrides });
const change = (website, expectedRevision = 0) => [{ section: 'website', expectedRevision, patch: { website } }];

test('story chapters save through revision-checked owner commands and reach the public snapshot', () => {
  const previous = { brandName: 'Our studio', website: { aboutBody: 'Original copy', aboutPages: [{ id: 'original', body: 'Original chapter', icon: 'info' }] }, sectionRevisions: { website: 3 } };
  const website = { ...previous.website, storyTitle: 'Our beginnings', storyBody: 'Updated introduction', storyImageUrl: '/images/intro.jpg', storyPages: [chapter(), chapter({ id: 'mission', title: 'Our mission', body: 'Thoughtful work', icon: 'target' })] };
  const next = applyWorkspaceChanges(previous, change(website, 3));
  assert.equal(next.sectionRevisions.website, 4);
  assert.deepEqual(next.website.storyPages, website.storyPages);
  assert.deepEqual(previous.website, { aboutBody: 'Original copy', aboutPages: [{ id: 'original', body: 'Original chapter', icon: 'info' }] });
  const published = publicProfile(next, 'owner_a').website;
  for (const field of ['storyTitle', 'storyBody', 'storyImageUrl', 'storyPages', 'aboutBody', 'aboutPages']) assert.deepEqual(published[field], website[field]);
  assert.throws(() => applyWorkspaceChanges(next, change(website, 3)), error => error.code === 'aborted');
});

test('empty story overrides and chapter drafts remain explicit without modifying legacy content', () => {
  const website = { aboutBody: 'Legacy story', storyTitle: '', storyBody: '', storyImageUrl: '', storyPages: [] };
  assert.deepEqual(publicProfileStory(website), { storyTitle: '', storyBody: '', storyImageUrl: '', storyPages: [] });
  assert.deepEqual(validateProfileStory({ storyPages: [chapter({ title: '', body: '', imageUrl: '' })] }).storyPages, [chapter({ title: '', body: '', imageUrl: '' })]);
  assert.equal(applyWorkspaceChanges({}, change(website)).website.aboutBody, 'Legacy story');
  assert.deepEqual(publicProfileStory({ aboutBody: 'Unchanged legacy profile' }), {});
  assert.deepEqual(publicProfileStory(null), {});
});

test('story writes reject malformed chapters, duplicate identities, private metadata and oversized data', () => {
  const invalid = [
    { storyPages: {} }, { storyPages: [null] }, { storyPages: [chapter({ id: '../other' })] }, { storyPages: [chapter(), chapter()] },
    { storyPages: [chapter({ body: {} })] }, { storyPages: [chapter({ title: 'x'.repeat(121) })] }, { storyPages: [chapter({ body: 'x'.repeat(20001) })] },
    { storyPages: [chapter({ internalNote: 'Private team information' })] }, { storyPages: [chapter({ accessToken: 'secret' })] },
    { storyTitle: null }, { storyBody: 'a\u0000b' }, { storyPages: Array.from({ length: 101 }, (_, index) => chapter({ id: `chapter-${index}` })) },
    { storyPages: Array.from({ length: 15 }, (_, index) => chapter({ id: `chapter-${index}`, body: 'x'.repeat(20000) })) }
  ];
  for (const website of invalid) assert.throws(() => applyWorkspaceChanges({}, change(website)), error => error.code === 'invalid-argument');
});

test('story images accept public HTTPS and site paths while rejecting executable or credentialed URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml;base64,abc', 'blob:https://example.test/image', 'http://example.test/image.jpg', '//example.test/image.jpg', '/\\example.test/image.jpg', '/\n/example.test/image.jpg', 'https://user:password@example.test/image.jpg']) {
    assert.throws(() => applyWorkspaceChanges({}, change({ storyImageUrl: url })), error => error.code === 'invalid-argument');
    assert.throws(() => applyWorkspaceChanges({}, change({ storyPages: [chapter({ imageUrl: url })] })), error => error.code === 'invalid-argument');
  }
  for (const url of ['', '/images/story.jpg', 'https://firebasestorage.googleapis.com/v0/b/public/o/story.jpg?alt=media&token=image-token']) {
    assert.equal(validateProfileStory({ storyImageUrl: url }).storyImageUrl, url);
  }
});

test('public story projections allowlist chapter fields even for older unvalidated owner records', () => {
  const website = { storyPages: [chapter({ internalNote: 'Private note', provider: { accessToken: 'secret' }, icon: 'info' })], storyBody: 'Public text', privateOwnerInfo: 'Private contact' };
  const published = publicProfile({ website, products: [], services: [] }, 'owner_a').website;
  assert.deepEqual(published.storyPages, [chapter({ icon: 'info' })]);
  assert.equal(published.storyBody, 'Public text');
  assert.doesNotMatch(JSON.stringify(published), /Private note|Private contact|secret|accessToken/);
});
