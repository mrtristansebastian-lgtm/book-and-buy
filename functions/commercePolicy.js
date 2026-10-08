/** A checkout preview depends on policy sections as well as the catalog price. */
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
