/** A checkout preview depends on policy sections as well as the catalog price. */
export function assertPublishedWorkspace(workspace, profile, slug, ownerId) {
  if (!profile || profile.published === false || profile.ownerId !== ownerId || workspace.slug !== slug || workspace.website?.published === false) {
    const error = new Error('This business website is no longer published at this address.'); error.code = 'failed-precondition'; throw error;
  }
}
export function commerceQuoteRevision(workspace, kind) {
  const sections = ['general','website','availabilityRules','features','checkout','payments',kind === 'service' ? 'services' : 'products'];
  return Object.fromEntries(sections.map((section) => [section,workspace.sectionRevisions?.[section] || 0]));
}
export function assertCommerceQuoteRevision(workspace,kind,expected) {
  if (expected === undefined) return;
  const current = commerceQuoteRevision(workspace,kind);
  if (!expected || typeof expected !== 'object' || Array.isArray(expected) || Object.keys(expected).length !== Object.keys(current).length || Object.entries(current).some(([key,value]) => !Number.isSafeInteger(expected[key]) || expected[key] !== value)) {
    const error = new Error('The checkout quote changed. Refresh the quote and review the new total before submitting.'); error.code = 'aborted'; throw error;
  }
}
