import { useEffect } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { drainClientErrorQueue, reportClientError } from '../../../services/errorReporting';

export function useClientErrorReporting({
  appId,
  db,
  isFirebaseConfigured,
  user,
  workspaceOwnerId
}) {
  useEffect(() => {
    const handleWindowError = (event) => {
      reportClientError(event.error || event.message, { source: 'window-error' });
    };
    const handleUnhandledRejection = (event) => {
      reportClientError(event.reason || 'Unhandled promise rejection', { source: 'unhandled-rejection' });
    };
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !workspaceOwnerId) return undefined;
    let cancelled = false;
    const ownerIdForReports = workspaceOwnerId;
    const writeErrorReport = async (report) => {
      if (cancelled) return;
      await FirebaseSDK.addDoc(
        FirebaseSDK.collection(db, 'artifacts', appId, 'users', ownerIdForReports, 'clientErrors'),
        {
          ...report,
          ownerId: ownerIdForReports,
          uid: user?.uid || '',
          email: user?.email || '',
          createdAt: FirebaseSDK.serverTimestamp()
        }
      );
    };
    drainClientErrorQueue(writeErrorReport).catch((error) => {
      console.warn('Queued client errors could not be sent yet.', error);
    });
    const handleOnline = () => {
      drainClientErrorQueue(writeErrorReport).catch((error) => {
        console.warn('Queued client errors could not be sent after reconnect.', error);
      });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
    };
  }, [appId, db, isFirebaseConfigured, user?.email, user?.uid, workspaceOwnerId]);
}
