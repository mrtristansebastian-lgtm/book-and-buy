import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { buildBookingSlug } from '../../../utils/slugs';
import {
  mergeStateIfChanged,
  stripLegacyEditorFields
} from '../utils/workspaceState';
import {
  syncStaffCalendarCollections,
  syncPublicWorkspaceCollections,
  syncWorkspaceScaleCollections
} from '../utils/scaleCollections';

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const buildPublicStaffList = (staffList = []) => (
  (Array.isArray(staffList) ? staffList : [])
    .filter(staff => staff?.id && staff.accessEnabled !== false)
    .map(staff => ({
      id: staff.id,
      name: staff.name || staff.displayName || 'Team member',
      color: staff.color || '#111827',
      photoURL: staff.photoURL || ''
    }))
);

export function createWorkspacePersistenceActions({
  accountProfileKey,
  activeStaffId,
  canManageTeam,
  canManageWorkspace,
  clearWorkspaceDirty,
  displayStaffList,
  isWorkspaceOwner,
  personalDisplayName,
  personalProfile,
  publishedSettingsSnapshotRef,
  saveStaff,
  setAccountProfileOverride,
  setSettings,
  setStaffList,
  settings,
  settingsRef,
  showToast,
  staffList,
  user,
  workspaceRole,
  workspaceOwnerId
}) {
  const publishSettings = async (nextSettings = settings, successMessage = 'Booking page saved.', options = {}) => {
    const silent = Boolean(options.silent);
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) {
      if (!silent) showToast('Workspace updated in demo mode.');
      return true;
    }
    if (!canManageWorkspace) {
      if (!silent) showToast('Only owners and admins can save workspace settings.');
      return false;
    }
    if (!silent) showToast('Saving updates...');
    try {
      const publicSlug = buildBookingSlug(nextSettings.slug || nextSettings.brandName);
      const previousPublishedSettings = publishedSettingsSnapshotRef.current || settingsRef.current || settings;
      const publishableSettings = stripLegacyEditorFields(nextSettings);
      const settingsToPublish = {
        ...publishableSettings,
        slug: publicSlug,
        publishedAt: Date.now(),
        updatedAt: Date.now()
      };
      if (publicSlug !== settings.slug) {
        setSettings(prev => ({ ...prev, slug: publicSlug }));
      }
      await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'settings'), settingsToPublish);
      await syncWorkspaceScaleCollections({
        ownerId: workspaceOwnerId,
        settings: settingsToPublish,
        staffList: displayStaffList,
        previousSettings: previousPublishedSettings,
        previousStaffList: staffList
      });
      const { accountProfiles, ...publicSettingsToPublish } = settingsToPublish;
      await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'public', 'data', 'workspaces', publicSlug), {
        ...publicSettingsToPublish,
        publicStaff: buildPublicStaffList(displayStaffList),
        ownerId: workspaceOwnerId,
        ownerEmail: user?.email || '',
        workspaceName: publicSettingsToPublish.brandName || 'Build A Booking Workspace'
      });
      await syncPublicWorkspaceCollections({
        publicSlug,
        settings: publicSettingsToPublish,
        staffList: displayStaffList
      });
      publishedSettingsSnapshotRef.current = settingsToPublish;
      if (!silent) showToast(successMessage);
      return true;
    } catch (err) {
      console.error(err);
      if (!silent) showToast('Failed to save.');
      return false;
    }
  };

  const saveSettings = async () => {
    const saved = await publishSettings(settings);
    if (saved) clearWorkspaceDirty();
    return saved;
  };

  const saveStaffCalendarSettings = async () => {
    if (workspaceRole !== 'staff') return saveSettings();
    if (!activeStaffId) {
      showToast('Your staff calendar profile is not connected yet.');
      return false;
    }
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) {
      clearWorkspaceDirty();
      showToast('Schedule updated in demo mode.');
      return true;
    }
    try {
      await syncStaffCalendarCollections({
        ownerId: workspaceOwnerId,
        staffId: activeStaffId,
        settings,
        previousSettings: publishedSettingsSnapshotRef.current
      });
      publishedSettingsSnapshotRef.current = {
        ...(publishedSettingsSnapshotRef.current || settings),
        staffCalendars: {
          ...((publishedSettingsSnapshotRef.current || settings).staffCalendars || {}),
          [activeStaffId]: settings.staffCalendars?.[activeStaffId] || {}
        }
      };
      clearWorkspaceDirty();
      showToast('Your calendar saved.');
      return true;
    } catch (error) {
      console.error(error);
      showToast('Your calendar could not be saved.');
      return false;
    }
  };

  const saveWorkspaceSettingsPatch = async (patch = {}, successMessage = 'Workspace saved.') => {
    const baseSettings = stripLegacyEditorFields(publishedSettingsSnapshotRef.current || settingsRef.current || settings);
    const nextSettings = {
      ...baseSettings,
      ...patch
    };
    setSettings(prev => mergeStateIfChanged(prev, { ...prev, ...patch }));
    const saved = await publishSettings(nextSettings, successMessage, { silent: true });
    if (saved) {
      clearWorkspaceDirty();
      showToast(successMessage);
    } else {
      showToast('Workspace settings could not be saved.');
    }
    return saved;
  };

  const updatePersonalProfile = (updates = {}) => {
    const nextProfile = {
      ...personalProfile,
      ...updates,
      uid: user?.uid || personalProfile.uid || '',
      updatedAt: Date.now()
    };
    const nextDisplayName = [nextProfile.firstName, nextProfile.lastName].filter(Boolean).join(' ').trim() || personalDisplayName;
    const emailKey = normalizeEmail(user?.email || '');
    const profileEmailKey = normalizeEmail(nextProfile.email || '');
    const nextSettings = {
      ...settings,
      accountProfiles: {
        ...(settings.accountProfiles || {}),
        [accountProfileKey]: nextProfile
      }
    };
    const nextStaffList = (staffList || []).map(staff => {
      const isCurrentPerson = (
        (user?.uid && staff.uid === user.uid) ||
        (emailKey && normalizeEmail(staff.email || '') === emailKey) ||
        (profileEmailKey && normalizeEmail(staff.email || '') === profileEmailKey) ||
        (isWorkspaceOwner && staff.id === 'owner')
      );
      if (!isCurrentPerson) return staff;
      return {
        ...staff,
        name: nextDisplayName || staff.name,
        email: nextProfile.email || staff.email,
        phone: nextProfile.mobile || staff.phone || '',
        photoURL: nextProfile.photoURL || staff.photoURL || '',
        updatedAt: Date.now()
      };
    });

    setSettings(nextSettings);
    setAccountProfileOverride(nextProfile);
    setStaffList(nextStaffList);

    return { nextProfile, nextSettings, nextStaffList, nextDisplayName };
  };

  const persistProfileChanges = async (
    profileToSave = personalProfile,
    settingsToSave = settings,
    staffListToSave = displayStaffList,
    successMessage = 'Profile updated.'
  ) => {
    const displayName = [profileToSave.firstName, profileToSave.lastName].filter(Boolean).join(' ').trim() || personalDisplayName;
    const emailKey = normalizeEmail(profileToSave.email || user?.email || '');
    try {
      if (isFirebaseConfigured && user?.uid) {
        const accountPayload = {
          uid: user.uid,
          email: emailKey,
          displayName,
          firstName: profileToSave.firstName || '',
          lastName: profileToSave.lastName || '',
          mobile: profileToSave.mobile || '',
          phone: profileToSave.mobile || '',
          photoURL: profileToSave.photoURL || '',
          personalProfile: {
            ...profileToSave,
            email: emailKey,
            updatedAt: Date.now()
          },
          updatedAt: Date.now()
        };
        await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accounts', user.uid), accountPayload, { merge: true });
        if (emailKey) {
          await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'accountLookup', emailKey), accountPayload, { merge: true });
        }
      }

      if (canManageWorkspace) {
        const settingsSaved = await publishSettings(settingsToSave, successMessage, { silent: true });
        if (!settingsSaved) throw new Error('Workspace settings could not be saved.');
      } else if (!isFirebaseConfigured) {
        setSettings(settingsToSave);
      }

      if (canManageTeam) {
        const staffSaved = await saveStaff(staffListToSave, staffList, { profile: profileToSave, displayName, silent: true });
        if (!staffSaved) throw new Error('Team profile could not be saved.');
      }

      showToast(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      showToast('Profile could not be saved.');
      return false;
    }
  };

  const saveProfileChanges = async () => {
    await persistProfileChanges();
  };

  return {
    persistProfileChanges,
    publishSettings,
    saveProfileChanges,
    saveStaffCalendarSettings,
    saveSettings,
    saveWorkspaceSettingsPatch,
    updatePersonalProfile
  };
}
