export function needsEmailVerification(user) {
  return Boolean(user && user.emailVerified === false &&
    user.providerData?.some(provider => provider.providerId === 'password'));
}
