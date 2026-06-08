import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { syncListCollection, upsertListRecord } from '../../workspace/utils/scaleCollections';

export function createClientPersistenceActions({
  buildClientKey,
  canManageWorkspace,
  clientDirectory,
  deleteStorageAsset,
  requestImageCropUpload,
  safeClientRecords,
  setClientMobileView,
  setClientRecords,
  setSelectedClientId,
  showToast,
  user,
  workspaceOwnerId
}) {
  const saveClients = async (newList, options = {}) => {
    const silent = Boolean(options.silent);
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) {
      setClientRecords(newList);
      return true;
    }
    if (!canManageWorkspace) {
      if (!silent) showToast('Only owners and admins can save client records.');
      return false;
    }
    const previousList = safeClientRecords;
    setClientRecords(newList);
    try {
      await Promise.all([
        FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'clients'), { list: newList, updatedAt: Date.now() }),
        syncListCollection({
          ownerId: workspaceOwnerId,
          collectionName: 'clients',
          list: newList,
          previousList,
          idForRecord: record => record.id
        })
      ]);
      return true;
    } catch (error) {
      console.error('Client save failed', error);
      setClientRecords(previousList);
      if (!silent) showToast('Client records could not be saved.');
      return false;
    }
  };

  const saveClientRecord = async (nextRecord, options = {}) => {
    const silent = Boolean(options.silent);
    const previousList = safeClientRecords;
    const nextList = [nextRecord, ...previousList.filter(client => client.id !== nextRecord.id)];
    setClientRecords(nextList);
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) return true;
    if (!canManageWorkspace) {
      setClientRecords(previousList);
      if (!silent) showToast('Only owners and admins can save client records.');
      return false;
    }
    try {
      await upsertListRecord({
        ownerId: workspaceOwnerId,
        collectionName: 'clients',
        record: nextRecord,
        idForRecord: record => record.id
      });
      return true;
    } catch (error) {
      console.error('Client record save failed', error);
      setClientRecords(previousList);
      if (!silent) showToast('Client record could not be saved.');
      return false;
    }
  };

  const upsertClientRecord = async (clientId, updates) => {
    const bookingProfile = clientDirectory.find(client => client.id === clientId);
    const existingRecord = safeClientRecords.find(client => client.id === clientId);
    const nextRecord = {
      id: clientId,
      name: updates.name ?? existingRecord?.name ?? bookingProfile?.name ?? 'Unnamed Client',
      phone: updates.phone ?? existingRecord?.phone ?? bookingProfile?.phone ?? '',
      email: updates.email ?? existingRecord?.email ?? bookingProfile?.email ?? '',
      birthday: updates.birthday ?? existingRecord?.birthday ?? bookingProfile?.birthday ?? '',
      notes: updates.notes ?? existingRecord?.notes ?? bookingProfile?.notes ?? '',
      avatar: updates.avatar ?? existingRecord?.avatar ?? bookingProfile?.avatar ?? '',
      labels: updates.labels ?? existingRecord?.labels ?? bookingProfile?.labels ?? [],
      source: existingRecord?.source || (bookingProfile?.source === 'booking' ? 'booking' : 'manual'),
      createdAt: existingRecord?.createdAt || bookingProfile?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    return saveClientRecord(nextRecord);
  };

  const toggleClientLabel = async (client, label) => {
    if (!client) return;
    const currentLabels = client.labels || [];
    const nextLabels = currentLabels.includes(label)
      ? currentLabels.filter(item => item !== label)
      : [...currentLabels, label];
    const saved = await upsertClientRecord(client.id, { labels: nextLabels });
    if (saved) showToast('Client label saved');
  };

  const handleClientAvatarUpload = async (clientId, file) => {
    if (!file) return;
    const previousAvatar = clientDirectory.find(client => client.id === clientId)?.avatar || '';
    requestImageCropUpload(file, {
      folder: 'client-avatars',
      title: 'Crop client photo',
      ratioKey: 'square',
      shape: 'circle'
    }, async (avatarUrl) => {
      const saved = await upsertClientRecord(clientId, { avatar: avatarUrl });
      if (saved) {
        if (previousAvatar && previousAvatar !== avatarUrl) await deleteStorageAsset(previousAvatar);
        showToast('Client photo updated');
      } else if (avatarUrl && avatarUrl !== previousAvatar) {
        await deleteStorageAsset(avatarUrl);
      }
    });
  };

  const handleManualClientSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.clientName.value.trim();
    const phone = form.clientPhone.value.trim();
    const email = form.clientEmail.value.trim();
    const birthday = form.clientBirthday.value.trim();
    const label = form.clientLabel.value;
    if (!name) return;

    const id = phone ? buildClientKey(name, phone) : `manual-${Date.now()}`;
    const existingClient = clientDirectory.find(client => client.id === id);
    const labels = label
      ? Array.from(new Set([...(existingClient?.labels || []), label]))
      : (existingClient?.labels || []);

    const saved = await upsertClientRecord(id, { name, phone, email, birthday, labels });
    if (saved) {
      setSelectedClientId(id);
      setClientMobileView('profile');
      form.reset();
      showToast(existingClient ? 'Client profile updated' : 'Client added');
    }
  };

  return {
    handleClientAvatarUpload,
    handleManualClientSubmit,
    saveClientRecord,
    saveClients,
    toggleClientLabel,
    upsertClientRecord
  };
}
