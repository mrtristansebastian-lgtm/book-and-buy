export const buildClientKey = (name, phone) => {
  const phoneKey = (phone || '').replace(/\D/g, '');
  const nameKey = (name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return phoneKey ? `phone-${phoneKey}` : `name-${nameKey || 'client'}`;
};
