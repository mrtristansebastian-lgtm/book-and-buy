export const LAYOUT_COUNT = 3;

export const HOME_SECTION_IDS = [
  'hero',
  'about',
  'reasons',
  'venue',
  'map',
  'reviews',
  'bookStrip'
];

export function createDefaultSectionLayouts() {
  return Object.fromEntries(HOME_SECTION_IDS.map((id) => [id, 0]));
}

export function resolveSectionLayout(website, sectionId) {
  const raw = website?.sectionLayouts?.[sectionId];
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return ((Math.trunc(n) % LAYOUT_COUNT) + LAYOUT_COUNT) % LAYOUT_COUNT;
}

export function nextSectionLayout(website, sectionId) {
  return (resolveSectionLayout(website, sectionId) + 1) % LAYOUT_COUNT;
}

/** Safer class helper when layout is already normalized 0–2. */
export function sectionLayoutClass(layout) {
  const n = Number(layout);
  const safe = Number.isFinite(n) ? ((Math.trunc(n) % LAYOUT_COUNT) + LAYOUT_COUNT) % LAYOUT_COUNT : 0;
  return `bb-sec-layout bb-sec-layout--${safe}`;
}
