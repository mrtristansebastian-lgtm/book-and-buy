/** Only a first-party business profile can be an auth return destination. */
export function profileAuthReturn(path = '') {
  const query = String(path).split('?')[1] || '';
  const target = new URLSearchParams(query).get('returnTo') || '';
  return /^\/w\/[a-z0-9][a-z0-9-]*\/?$/i.test(target) ? target : '/app/discovery';
}

export function profileSignInPath(slug) {
  return `/app/auth?returnTo=${encodeURIComponent(`/w/${slug}`)}`;
}

export function clientAuthRedirect(path) {
  // A just-completed sign-in may already have navigated before the old auth
  // screen's effect runs. Never overwrite that successful destination.
  return /^\/app\/auth\/?$/.test(String(path).split('?')[0]) ? profileAuthReturn(path) : null;
}
