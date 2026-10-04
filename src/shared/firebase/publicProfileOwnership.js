export class ProfileAddressUnavailableError extends Error {
  constructor() {
    super('That profile address is already in use. Choose a different address in Settings → Domains, then publish again.');
    this.name = 'ProfileAddressUnavailableError';
    this.code = 'profile-address-unavailable';
  }
}

/** Read and claim the address in one transaction so competing publications
 * cannot take a slug between an availability check and the actual write.
 * Rules independently enforce this boundary for callers bypassing this API.
 */
export async function writeOwnedPublicProfile(transaction, reference, snapshot) {
  if (!snapshot?.ownerId || typeof snapshot.ownerId !== 'string') {
    throw new Error('Sign in as the owner to publish your business profile.');
  }
  const existing = await transaction.get(reference);
  if (existing.exists() && existing.data()?.ownerId !== snapshot.ownerId) {
    throw new ProfileAddressUnavailableError();
  }
  transaction.set(reference, snapshot, { merge: true });
}
