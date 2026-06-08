const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export const buildStaffId = (email = '') => {
  const emailKey = normalizeEmail(email);
  return `staff-${emailKey.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now()}`;
};

export const createOwnerStaffProfile = (signedInUser, color = '#39FF14') => ({
  id: 'owner',
  uid: signedInUser?.uid || '',
  name: signedInUser?.displayName || 'Workspace Owner',
  email: signedInUser?.email || '',
  phone: signedInUser?.phoneNumber || '',
  photoURL: signedInUser?.photoURL || '',
  role: 'owner',
  status: 'connected',
  color
});
