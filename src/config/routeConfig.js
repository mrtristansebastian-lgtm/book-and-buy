export const workspaceTabIds = ['overview', 'bookings', 'business', 'communications', 'editor', 'services', 'finance', 'clients', 'staff', 'profile'];

export const workspaceTabAliases = {
  schedule: 'business',
  calendar: 'business',
  team: 'staff',
  'my-clients': 'clients',
  support: 'communications',
  inbox: 'communications',
  'support-inbox': 'communications',
  'my-services': 'services',
  payments: 'finance'
};

export const workspaceTabPublicSegments = {
  business: 'schedule',
  communications: 'support',
  staff: 'team'
};

export const getWorkspaceTabPublicSegment = (tab = 'overview') => {
  const canonicalTab = workspaceTabAliases[tab] || tab || 'overview';
  return workspaceTabPublicSegments[canonicalTab] || canonicalTab;
};

export const editorTabIds = ['introduction', 'colours', 'typography', 'style', 'form'];

export const editorTabAliases = {
  identity: 'introduction',
  themes: 'colours',
  visuals: 'style',
  features: 'form',
  copy: 'introduction'
};

export const defaultEditorTab = 'introduction';
