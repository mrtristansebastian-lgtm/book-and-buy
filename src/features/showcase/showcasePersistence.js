/** Seed the separate enquiry cache once per showcase generation. */
export function syncShowcaseEnquiries(workspace, { reset = false, storage = globalThis.localStorage } = {}) {
  if (workspace?.isDemo !== true || workspace.demoShowcaseActivitySchema !== 1 || !storage) return;
  const slug = workspace.slug || 'example';
  const dataKey = `bb.demo.listing-enquiries.v1:${slug}`;
  const markerKey = `bb.demo.showcase-enquiries-schema:${slug}`;
  const marker = `${workspace.demoScenarioSchema}:${workspace.demoGeneratedAt}:${workspace.demoCatalogRevision || 0}`;
  if (!reset && storage.getItem(markerKey) === marker) return;
  storage.setItem(dataKey, JSON.stringify(workspace.listingEnquiries || []));
  storage.setItem(markerKey, marker);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bb-demo-enquiries'));
}
