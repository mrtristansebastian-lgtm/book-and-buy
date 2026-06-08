import { useMemo } from 'react';

const normalizeEmail = (email = '') => email.trim().toLowerCase();

export function useWorkspaceIdentity({
  accountProfileOverride,
  isGuestWorkspace,
  safeStaffList,
  settings,
  user,
  workspaceAccess,
  workspaceOwnerId
}) {
  const referralUrl = useMemo(() => `${window.location.origin}/ref/${user?.uid?.substring(0, 6) || '10X'}`, [user?.uid]);
  const activeWorkspaceGrant = useMemo(
    () => workspaceAccess.find(grant => grant.ownerId === workspaceOwnerId),
    [workspaceAccess, workspaceOwnerId]
  );
  const workspaceRole = user
    ? (workspaceOwnerId === user.uid ? 'owner' : activeWorkspaceGrant?.role || 'staff')
    : (isGuestWorkspace ? 'guest' : 'demo');
  const isWorkspaceOwner = Boolean(user && workspaceOwnerId === user.uid);
  const canManageWorkspace = isGuestWorkspace || workspaceRole === 'owner' || workspaceRole === 'admin';
  const canManageTeam = canManageWorkspace;
  const workspaceChoices = useMemo(() => {
    if (!user) return [];
    return [
      { ownerId: user.uid, workspaceName: settings.brandName || 'My Workspace', role: 'owner', ownerEmail: user.email || '' },
      ...workspaceAccess
    ].filter((workspace, index, list) => list.findIndex(item => item.ownerId === workspace.ownerId) === index);
  }, [settings.brandName, user, workspaceAccess]);

  const accountProfileKey = useMemo(() => (
    user?.uid || normalizeEmail(user?.email || '') || (isGuestWorkspace ? 'guest-workspace' : 'local-account')
  ), [isGuestWorkspace, user?.email, user?.uid]);
  const fallbackAccountName = useMemo(() => {
    const source = user?.displayName || user?.email?.split('@')[0] || (isGuestWorkspace ? 'Guest Workspace' : 'Workspace Owner');
    const parts = String(source || '').trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ')
    };
  }, [isGuestWorkspace, user?.displayName, user?.email]);
  const storedAccountProfile = {
    ...(settings.accountProfiles?.[accountProfileKey] || {}),
    ...(accountProfileOverride || {})
  };
  const personalProfile = useMemo(() => ({
    uid: user?.uid || '',
    firstName: storedAccountProfile.firstName ?? fallbackAccountName.firstName,
    lastName: storedAccountProfile.lastName ?? fallbackAccountName.lastName,
    email: storedAccountProfile.email ?? user?.email ?? '',
    mobile: storedAccountProfile.mobile ?? storedAccountProfile.phone ?? '',
    photoURL: storedAccountProfile.photoURL ?? user?.photoURL ?? '',
    updatedAt: storedAccountProfile.updatedAt || 0
  }), [
    accountProfileKey,
    fallbackAccountName.firstName,
    fallbackAccountName.lastName,
    settings.accountProfiles,
    storedAccountProfile.email,
    storedAccountProfile.firstName,
    storedAccountProfile.lastName,
    storedAccountProfile.mobile,
    storedAccountProfile.phone,
    storedAccountProfile.photoURL,
    storedAccountProfile.updatedAt,
    user?.email,
    user?.photoURL,
    user?.uid
  ]);
  const personalDisplayName = useMemo(() => (
    [personalProfile.firstName, personalProfile.lastName].filter(Boolean).join(' ').trim() ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    (isGuestWorkspace ? 'Guest Workspace' : 'Workspace Owner')
  ), [isGuestWorkspace, personalProfile.firstName, personalProfile.lastName, user?.displayName, user?.email]);
  const displayStaffList = useMemo(() => {
    const emailKey = normalizeEmail(user?.email || '');
    const profileEmailKey = normalizeEmail(personalProfile.email || '');
    return safeStaffList.map(staff => {
      const isCurrentPerson = (
        (user?.uid && staff.uid === user.uid) ||
        (emailKey && normalizeEmail(staff.email || '') === emailKey) ||
        (profileEmailKey && normalizeEmail(staff.email || '') === profileEmailKey) ||
        (isWorkspaceOwner && staff.id === 'owner')
      );
      if (!isCurrentPerson) return staff;
      return {
        ...staff,
        name: personalDisplayName || staff.name,
        email: personalProfile.email || staff.email,
        phone: personalProfile.mobile || staff.phone || '',
        photoURL: personalProfile.photoURL || staff.photoURL || ''
      };
    });
  }, [isWorkspaceOwner, personalDisplayName, personalProfile.email, personalProfile.mobile, personalProfile.photoURL, safeStaffList, user?.email, user?.uid]);
  const activeStaffProfile = useMemo(() => {
    if (!user) return displayStaffList.find(staff => staff.id === 'owner') || null;
    const emailKey = normalizeEmail(user.email || '');
    return displayStaffList.find(staff => (
      staff.id === activeWorkspaceGrant?.staffId ||
      staff.uid === user.uid ||
      normalizeEmail(staff.email || '') === emailKey
    )) || (isWorkspaceOwner ? displayStaffList.find(staff => staff.id === 'owner') : null) || displayStaffList[0] || null;
  }, [activeWorkspaceGrant?.staffId, displayStaffList, isWorkspaceOwner, user]);
  const dashboardGreetingName = useMemo(() => {
    const source = personalDisplayName || activeStaffProfile?.name || user?.displayName || user?.email?.split('@')[0] || settings.brandName || 'Builder';
    return String(source).trim().split(/\s+/)[0] || 'Builder';
  }, [activeStaffProfile?.name, personalDisplayName, settings.brandName, user?.displayName, user?.email]);

  return {
    accountProfileKey,
    activeStaffProfile,
    activeWorkspaceGrant,
    canManageTeam,
    canManageWorkspace,
    dashboardGreetingName,
    displayStaffList,
    isWorkspaceOwner,
    personalDisplayName,
    personalProfile,
    referralUrl,
    workspaceChoices,
    workspaceRole
  };
}
