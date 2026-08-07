/** Client-side staff availability view/edit rights (owner or self by email). */

export const normalizeStaffEmail = (email = '') => String(email || '').trim().toLowerCase();

export const isWorkspaceOwnerViewer = ({ user = null, workspace = {} } = {}) => {
  if (workspace?.isDemo) return true;
  // Signed-in app user is the workspace owner until staff login is wired
  if (user?.uid && (!workspace?.ownerId || workspace.ownerId === user.uid)) return true;
  // Local / unsigned owner workspace
  if (!user?.uid && !workspace?.ownerId) return true;
  const email = normalizeStaffEmail(user?.email);
  if (!email) return false;
  const self = (workspace?.staff || []).find(
    (member) => normalizeStaffEmail(member.email) === email
  );
  return String(self?.accessRole || '').toLowerCase() === 'owner';
};

export const resolveLinkedStaffId = ({ user = null, staff = [] } = {}) => {
  const email = normalizeStaffEmail(user?.email);
  if (!email) return '';
  return (
    (staff || []).find((member) => normalizeStaffEmail(member.email) === email)?.id || ''
  );
};

export const getVisibleStaffForAvailability = ({
  user = null,
  workspace = {},
  staff = []
} = {}) => {
  const list = Array.isArray(staff) ? staff : [];
  if (isWorkspaceOwnerViewer({ user, workspace })) return list;
  const linkedId = resolveLinkedStaffId({ user, staff: list });
  if (!linkedId) return [];
  return list.filter((member) => member.id === linkedId);
};

export const canEditStaffAvailability = ({
  user = null,
  workspace = {},
  staff = [],
  staffId = ''
} = {}) => {
  if (!staffId) return false;
  if (isWorkspaceOwnerViewer({ user, workspace })) return true;
  const linkedId = resolveLinkedStaffId({ user, staff: staff.length ? staff : workspace?.staff });
  return Boolean(linkedId && linkedId === staffId);
};

export const canEditAvailabilityRules = ({ user = null, workspace = {} } = {}) =>
  isWorkspaceOwnerViewer({ user, workspace });
