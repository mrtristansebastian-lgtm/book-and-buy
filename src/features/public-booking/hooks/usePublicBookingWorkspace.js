import { useCallback, useEffect, useState } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { buildBookingSlug } from '../../../utils/slugs';
import { guestModeStorageKey, safeLocalGet } from '../../../utils/publicBookingRoute';

const stripPublicDraftFields = (settings = {}) => {
  const {
    draftAutosavedAt,
    draftSavedAt,
    draftStatus,
    draftName,
    ...publishableSettings
  } = settings || {};
  return publishableSettings;
};

export function usePublicBookingWorkspace({
  guestMode,
  publicSlug,
  settings,
  settingsRef,
  user
}) {
  const [publicWorkspace, setPublicWorkspace] = useState(null);
  const [publicManualPaymentOptions, setPublicManualPaymentOptions] = useState([]);
  const [publicPaymentOptions, setPublicPaymentOptions] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const [publicReloadKey, setPublicReloadKey] = useState(0);

  const reloadPublicWorkspace = useCallback(() => {
    setPublicReloadKey(key => key + 1);
  }, []);

  useEffect(() => {
    if (!publicSlug) return;
    const localGuestSettings = settingsRef.current || settings;
    const localGuestSlug = buildBookingSlug(localGuestSettings.slug || localGuestSettings.brandName || localGuestSettings.businessName || 'studio');
    if (!user && (guestMode || safeLocalGet(guestModeStorageKey) === 'true') && localGuestSlug === publicSlug) {
      const publishableGuestSettings = stripPublicDraftFields(localGuestSettings);
      setPublicError('');
      setPublicWorkspace({
        ...publishableGuestSettings,
        slug: publicSlug,
        workspaceName: publishableGuestSettings.brandName || publishableGuestSettings.businessName || 'Build A Booking Workspace',
        ownerId: ''
      });
      setPublicLoading(false);
      return;
    }
    if (!isFirebaseConfigured) {
      setPublicError('Firebase is not configured yet.');
      setPublicLoading(false);
      return;
    }

    let cancelled = false;
    setPublicLoading(true);
    setPublicError('');
    setPublicWorkspace(null);
    const workspaceRef = FirebaseSDK.doc(db, 'artifacts', appId, 'public', 'data', 'workspaces', publicSlug);
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setPublicError('This booking page is taking longer than expected to load. Check your connection and try again.');
      setPublicLoading(false);
    }, 12000);
    FirebaseSDK.getDoc(workspaceRef)
      .then(async (docSnap) => {
        if (cancelled) return;
        if (!docSnap.exists()) {
          setPublicError('This booking page is not published yet.');
          setPublicWorkspace(null);
          return;
        }
        const workspace = docSnap.data() || {};
        const [servicesSnap, staffSnap] = await Promise.all([
          FirebaseSDK.getDocs(FirebaseSDK.query(
            FirebaseSDK.collection(workspaceRef, 'services'),
            FirebaseSDK.orderBy('sortOrder', 'asc'),
            FirebaseSDK.limit(300)
          )).catch(() => null),
          FirebaseSDK.getDocs(FirebaseSDK.query(
            FirebaseSDK.collection(workspaceRef, 'staff'),
            FirebaseSDK.orderBy('sortOrder', 'asc'),
            FirebaseSDK.limit(200)
          )).catch(() => null)
        ]);
        if (cancelled) return;
        const publicServices = servicesSnap?.docs?.map(serviceDoc => ({ id: serviceDoc.id, ...serviceDoc.data() })) || [];
        const publicStaff = staffSnap?.docs?.map(staffDoc => ({ id: staffDoc.id, ...staffDoc.data() })) || [];
        setPublicWorkspace({
          ...workspace,
          ...(publicServices.length ? { services: publicServices } : {}),
          ...(publicStaff.length ? { publicStaff } : {})
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setPublicError('Could not load this booking page.');
      })
      .finally(() => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setPublicLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [publicSlug, publicReloadKey, guestMode, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    if (!publicSlug || !isFirebaseConfigured || !publicWorkspace?.ownerId) {
      setPublicManualPaymentOptions([]);
      setPublicPaymentOptions([]);
      return () => { cancelled = true; };
    }

    const gatewayIds = ['stripe', 'payfast', 'yoco', 'paystack', 'manual_eft', 'cash'];
    Promise.all(gatewayIds.map(async (gatewayId) => {
      const snap = await FirebaseSDK.getDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', publicWorkspace.ownerId, 'payment_settings', gatewayId));
      if (!snap.exists()) return null;
      const data = snap.data() || {};
      if (data.enabled !== true) return null;
      const manual = gatewayId === 'manual_eft' || gatewayId === 'cash';
      if (!manual && data.configured !== true) return null;
      return {
        id: gatewayId,
        gatewayType: gatewayId,
        name: gatewayId === 'cash' ? 'Pay on site' : (data.providerName || (gatewayId === 'manual_eft' ? 'Manual EFT' : gatewayId)),
        enabled: true,
        configured: data.configured !== false,
        mode: data.mode || 'live',
        credentialSummary: data.credentialSummary || {},
        instructions: data.credentialSummary?.instructions || ''
      };
    }))
      .then((options) => {
        if (!cancelled) {
          const enabledOptions = options.filter(Boolean);
          setPublicPaymentOptions(enabledOptions);
          setPublicManualPaymentOptions(enabledOptions.filter(option => ['manual_eft', 'cash'].includes(option.id)));
        }
      })
      .catch((error) => {
        console.error('Could not load payment options', error);
        if (!cancelled) {
          setPublicManualPaymentOptions([]);
          setPublicPaymentOptions([]);
        }
      });

    return () => { cancelled = true; };
  }, [publicSlug, publicWorkspace?.ownerId]);

  return {
    publicError,
    publicLoading,
    publicManualPaymentOptions,
    publicPaymentOptions,
    publicWorkspace,
    reloadPublicWorkspace,
    setPublicError,
    setPublicLoading
  };
}
