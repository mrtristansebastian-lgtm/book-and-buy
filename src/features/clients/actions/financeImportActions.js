import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { syncListCollection } from '../../workspace/utils/scaleCollections';

export function createFinanceImportActions({
  canManageWorkspace,
  safeFinanceImports = [],
  setFinanceImports,
  showToast,
  user,
  workspaceOwnerId
}) {
  const saveFinanceImports = async (newList, options = {}) => {
    const silent = Boolean(options.silent);
    if (!user || !workspaceOwnerId || !isFirebaseConfigured) {
      setFinanceImports(newList);
      return true;
    }
    if (!canManageWorkspace) {
      if (!silent) showToast('Only owners and admins can save finance imports.');
      return false;
    }
    const previousList = safeFinanceImports;
    setFinanceImports(newList);
    try {
      await Promise.all([
        FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'finance', 'imports'), { list: newList, updatedAt: Date.now() }),
        syncListCollection({
          ownerId: workspaceOwnerId,
          collectionName: 'financeImports',
          list: newList,
          previousList,
          idForRecord: record => record.id
        })
      ]);
      return true;
    } catch (error) {
      console.error('Finance import save failed', error);
      setFinanceImports(previousList);
      if (!silent) showToast('Finance imports could not be saved.');
      return false;
    }
  };

  return {
    saveFinanceImports
  };
}
