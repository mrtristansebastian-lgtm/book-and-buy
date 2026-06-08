import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { syncListCollection } from '../../workspace/utils/scaleCollections';
import {
  buildStaffId,
  createOwnerStaffProfile
} from '../utils/staffProfiles';

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export function useStaffActions({
  canManageTeam,
  personalDisplayName,
  personalProfile,
  safeStaffList,
  setStaffList,
  settings,
  showToast,
  staffList,
  user,
  workspaceOwnerId
}) {
  const writeStaffAccessGrant = async (staff) => {
    const emailKey = normalizeEmail(staff.email);
    if (!emailKey || !workspaceOwnerId) return;
    await FirebaseSDK.setDoc(
      FirebaseSDK.doc(db, 'artifacts', appId, 'staffAccess', emailKey, 'workspaces', workspaceOwnerId),
      {
        ownerId: workspaceOwnerId,
        ownerEmail: user?.email || '',
        workspaceName: settings.brandName || 'Build A Booking Workspace',
        email: emailKey,
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role || 'staff',
        color: staff.color || '#39FF14',
        status: staff.accessEnabled === false ? 'revoked' : 'active',
        updatedAt: Date.now()
      },
      { merge: true }
    );
  };

  const removeStaffAccessGrant = async (staff) => {
    const emailKey = normalizeEmail(staff.email);
    if (!emailKey || !workspaceOwnerId) return;
    await FirebaseSDK.deleteDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'staffAccess', emailKey, 'workspaces', workspaceOwnerId));
  };

  const saveStaff = async (newList, previousList = staffList, options = {}) => {
    const profileForStaff = options.profile || personalProfile;
    const displayNameForStaff = options.displayName || personalDisplayName;
    const silent = Boolean(options.silent);
    const normalizedList = newList.map((staff, index) => {
      if (staff.id === 'owner') {
        return {
          ...staff,
          ...createOwnerStaffProfile({
            ...user,
            displayName: displayNameForStaff,
            email: profileForStaff.email || user?.email || staff.email || '',
            photoURL: profileForStaff.photoURL || staff.photoURL || user?.photoURL || '',
            phoneNumber: profileForStaff.mobile || staff.phone || user?.phoneNumber || ''
          }, staff.color || '#39FF14'),
          color: staff.color || '#39FF14',
          role: 'owner',
          status: 'connected'
        };
      }
      const emailKey = normalizeEmail(staff.email);
      return {
        ...staff,
        id: staff.id || buildStaffId(emailKey),
        email: emailKey,
        role: staff.role || 'staff',
        status: staff.status || 'access-ready',
        accessEnabled: staff.accessEnabled !== false,
        sortOrder: index
      };
    });
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) {
      setStaffList(normalizedList);
      return true;
    }
    if (!canManageTeam) {
      if (!silent) showToast('Only owners and admins can manage team access.');
      return false;
    }

    try {
      setStaffList(normalizedList);
      await Promise.all([
        FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'staff'), { list: normalizedList, updatedAt: Date.now() }),
        syncListCollection({
          ownerId: workspaceOwnerId,
          collectionName: 'staff',
          list: normalizedList,
          previousList,
          idForRecord: record => record.id
        })
      ]);

      const activeStaff = normalizedList.filter(staff => staff.id !== 'owner' && staff.accessEnabled !== false && normalizeEmail(staff.email));
      const previousStaff = previousList.filter(staff => staff.id !== 'owner' && normalizeEmail(staff.email));
      const activeEmails = new Set(activeStaff.map(staff => normalizeEmail(staff.email)));
      await Promise.all(activeStaff.map(writeStaffAccessGrant));
      await Promise.all(previousStaff.filter(staff => !activeEmails.has(normalizeEmail(staff.email))).map(removeStaffAccessGrant));
      return true;
    } catch (error) {
      console.error('Team save failed', error);
      setStaffList(previousList);
      if (!silent) showToast('Team setup could not be saved.');
      return false;
    }
  };

  const createStaffMember = async ({ name, email, color, role }) => {
    const emailKey = normalizeEmail(email);
    if (!emailKey) return false;
    if (!canManageTeam && isFirebaseConfigured) {
      showToast('Only owners and admins can add staff.');
      return false;
    }

    let detectedAccount = null;
    if (isFirebaseConfigured) {
      try {
        const lookupSnap = await FirebaseSDK.getDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accountLookup', emailKey));
        if (lookupSnap.exists()) detectedAccount = lookupSnap.data();
      } catch (error) {
        console.error(error);
      }
    }

    const nextStaff = {
      id: buildStaffId(emailKey),
      uid: detectedAccount?.uid || '',
      name: name || detectedAccount?.displayName || emailKey.split('@')[0],
      email: emailKey,
      photoURL: detectedAccount?.photoURL || '',
      color,
      role,
      status: detectedAccount ? 'connected' : 'access-ready',
      accessEnabled: true,
      updatedAt: Date.now()
    };
    const nextList = [
      ...safeStaffList.filter(staff => normalizeEmail(staff.email) !== emailKey),
      nextStaff
    ];
    const saved = await saveStaff(nextList, staffList);
    if (saved) showToast(detectedAccount ? 'Google account detected and access granted.' : 'Access will activate when they sign in with this email.');
    return saved;
  };

  return {
    createStaffMember,
    saveStaff
  };
}
