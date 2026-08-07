import { HOME_SECTION_IDS, LAYOUT_COUNT, createDefaultSectionLayouts } from './sectionLayout';

export const BUILTIN_HOME_LAYOUT_PACKS = [
  {
    id: 'classic',
    label: 'Classic',
    sectionLayouts: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, 0]))
  },
  {
    id: 'editorial',
    label: 'Editorial',
    sectionLayouts: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, 1]))
  },
  {
    id: 'minimal',
    label: 'Minimal',
    sectionLayouts: Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, 2]))
  }
];

function normalizeLayoutValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return ((Math.trunc(n) % LAYOUT_COUNT) + LAYOUT_COUNT) % LAYOUT_COUNT;
}

export function normalizeSectionLayouts(layouts) {
  const source = layouts && typeof layouts === 'object' ? layouts : {};
  return Object.fromEntries(
    HOME_SECTION_IDS.map((id) => [id, normalizeLayoutValue(source[id])])
  );
}

export function layoutsEqual(a, b) {
  const left = normalizeSectionLayouts(a);
  const right = normalizeSectionLayouts(b);
  return HOME_SECTION_IDS.every((id) => left[id] === right[id]);
}

export function getSavedHomeLayoutTemplates(website) {
  return Array.isArray(website?.homeLayoutTemplates) ? website.homeLayoutTemplates : [];
}

export function getPackSectionLayouts(id, website) {
  const builtin = BUILTIN_HOME_LAYOUT_PACKS.find((pack) => pack.id === id);
  if (builtin) return normalizeSectionLayouts(builtin.sectionLayouts);

  const saved = getSavedHomeLayoutTemplates(website).find((pack) => pack.id === id);
  if (saved) return normalizeSectionLayouts(saved.sectionLayouts);

  return createDefaultSectionLayouts();
}

export function listHomeLayoutOptions(website) {
  const builtins = BUILTIN_HOME_LAYOUT_PACKS.map((pack) => ({
    id: pack.id,
    label: pack.label,
    kind: 'builtin'
  }));
  const saved = getSavedHomeLayoutTemplates(website).map((pack) => ({
    id: pack.id,
    label: pack.name || 'Untitled template',
    kind: 'template'
  }));
  return [...builtins, ...saved];
}

export function findMatchingLayoutId(website) {
  const current = normalizeSectionLayouts(website?.sectionLayouts);
  for (const pack of BUILTIN_HOME_LAYOUT_PACKS) {
    if (layoutsEqual(current, pack.sectionLayouts)) return pack.id;
  }
  for (const pack of getSavedHomeLayoutTemplates(website)) {
    if (layoutsEqual(current, pack.sectionLayouts)) return pack.id;
  }
  return null;
}

export function isUniqueLayoutCombo(website) {
  return !findMatchingLayoutId(website);
}

export function resolveHomeLayoutId(website) {
  return findMatchingLayoutId(website) || 'custom';
}

export function getHomeLayoutLabel(website) {
  const match = findMatchingLayoutId(website);
  if (!match) return 'Custom';
  const option = listHomeLayoutOptions(website).find((item) => item.id === match);
  return option?.label || 'Custom';
}

export function applyHomeLayoutPack(id, website) {
  return {
    homeLayoutId: id,
    sectionLayouts: getPackSectionLayouts(id, website)
  };
}

export function saveHomeLayoutTemplate(website, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    throw new Error('Name your template.');
  }
  if (!isUniqueLayoutCombo(website)) {
    throw new Error('This layout already exists.');
  }

  const sectionLayouts = normalizeSectionLayouts(website?.sectionLayouts);
  const template = {
    id: `tpl-${Date.now().toString(36)}`,
    name: trimmed,
    sectionLayouts,
    createdAt: Date.now()
  };

  return {
    homeLayoutId: template.id,
    sectionLayouts,
    homeLayoutTemplates: [...getSavedHomeLayoutTemplates(website), template]
  };
}
