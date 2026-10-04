/** Never borrow private/local business content for an unrelated public slug. */
export function resolvePublicProfile({ slug, local, lookup, configured, useLocalDemo, viewerId, allowOwnerPreview }) {
  if (useLocalDemo) return { status: 'ready', workspace: local, publicMode: false };
  if (configured && (lookup.slug !== slug || lookup.status === 'loading')) {
    return { status: 'loading', workspace: null, publicMode: true };
  }
  if (lookup.slug === slug && lookup.workspace) {
    return { status: 'ready', workspace: lookup.workspace, publicMode: true };
  }
  if (allowOwnerPreview && viewerId && local?.ownerId === viewerId && local?.slug === slug) {
    return { status: 'ready', workspace: local, publicMode: false };
  }
  return { status: lookup.slug === slug && lookup.status === 'error' ? 'error' : 'missing', workspace: null, publicMode: true };
}
