const STORY_TEXT_LIMITS = { storyTitle: 120, storyBody: 20000 };
const PAGE_FIELDS = new Set(['id', 'title', 'body', 'imageUrl', 'icon']);
const STORY_FIELDS = [...Object.keys(STORY_TEXT_LIMITS), 'storyImageUrl', 'storyPages'];

function invalid(message) { const error = new Error(message); error.code = 'invalid-argument'; throw error; }
function text(value, label, maximum) {
  if (typeof value !== 'string' || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    invalid(`${label} must be text of ${maximum} characters or fewer.`);
  }
  return value;
}
function imageUrl(value) {
  const result = text(value, 'Story image URL', 2048).trim();
  if (!result) return '';
  if (/[\u0000-\u0020\u007f]/.test(result)) invalid('Use a valid story image URL.');
  if (result.startsWith('/') && !result.startsWith('//') && !result.includes('\\')) return result;
  let url;
  try { url = new URL(result); } catch { invalid('Use an HTTPS story image URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) invalid('Use an HTTPS story image URL without credentials.');
  return result;
}

/** Preserve explicit empty overrides and validate only the new story fields. */
export function validateProfileStory(website = {}) {
  const result = {};
  for (const [key, maximum] of Object.entries(STORY_TEXT_LIMITS)) {
    if (website[key] !== undefined) result[key] = text(website[key], key === 'storyTitle' ? 'Story title' : 'Story text', maximum);
  }
  if (website.storyImageUrl !== undefined) result.storyImageUrl = imageUrl(website.storyImageUrl);
  if (website.storyPages !== undefined) {
    if (!Array.isArray(website.storyPages) || website.storyPages.length > 100) invalid('Story pages must be a list of up to 100 chapters.');
    const ids = new Set();
    result.storyPages = website.storyPages.map(page => {
      if (!page || Object.getPrototypeOf(page) !== Object.prototype || Object.keys(page).some(key => !PAGE_FIELDS.has(key))) invalid('Story chapter contains unsupported fields.');
      if (typeof page.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(page.id) || ids.has(page.id)) invalid('Story chapter identifiers must be valid and unique.');
      ids.add(page.id);
      const next = { id: page.id };
      if (page.title !== undefined) next.title = text(page.title, 'Story chapter title', 120);
      if (page.body !== undefined) next.body = text(page.body, 'Story chapter text', 20000);
      if (page.imageUrl !== undefined) next.imageUrl = imageUrl(page.imageUrl);
      if (page.icon !== undefined) next.icon = text(page.icon, 'Story chapter icon', 40);
      return next;
    });
  }
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > 256000) invalid('Your story is too large. Shorten the chapters before saving.');
  return result;
}

/** Public snapshots never copy private or unrecognized chapter metadata. */
export function publicProfileStory(website = {}) {
  if (!website || typeof website !== 'object') return {};
  const source = Object.fromEntries(STORY_FIELDS.filter(key => website[key] !== undefined).map(key => [key, website[key]]));
  if (Array.isArray(source.storyPages)) source.storyPages = source.storyPages.map(page => page && Object.fromEntries([...PAGE_FIELDS].filter(key => page[key] !== undefined).map(key => [key, page[key]])));
  return validateProfileStory(source);
}
