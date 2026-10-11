export function workspaceConnectionError(error) {
  const code = String(error?.code || '').replace(/^functions\//, '');
  if (code === 'permission-denied') return 'Please verify your email, then sign in again to open your business.';
  if (['internal', 'unavailable', 'not-found', 'deadline-exceeded'].includes(code) || error?.message === 'internal') {
    return 'The business service is temporarily unavailable. Your account has been created, but we could not load your workspace. Please try again shortly.';
  }
  return 'We could not connect to your business. Check your connection and try again.';
}
