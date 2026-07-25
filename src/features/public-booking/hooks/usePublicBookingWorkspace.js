import { useCallback, useEffect, useState } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, functions, httpsCallable, isFirebaseConfigured } from '../../../services/firebase';
import { buildBookingSlug } from '../../../utils/slugs';
import { exampleModeStorageKey, guestModeStorageKey, guestPublicPreviewStorageKey, safeLocalGet } from '../../../utils/publicBookingRoute';

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

const manualGatewayIds = new Set(['manual_eft', 'cash']);
const manualCredentialSummaryFields = ['accountHolder', 'bankName', 'accountNumber', 'branchCode', 'accountType', 'referencePrefix', 'instructions'];

const sanitizeManualCredentialSummary = (credentialSummary = {}) => (
  manualCredentialSummaryFields.reduce((acc, field) => {
    const value = String(credentialSummary[field] || '').trim().slice(0, field === 'instructions' ? 1000 : 260);
    if (value) acc[field] = value;
    return acc;
  }, {})
);

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
    let exampleSnapshot = null;
    try { exampleSnapshot = JSON.parse(safeLocalGet(guestPublicPreviewStorageKey) || 'null'); } catch { exampleSnapshot = null; }
    const snapshotSettings = exampleSnapshot?.version === 3 && exampleSnapshot?.slug === publicSlug
      ? { ...exampleSnapshot.settings, publicStaff: exampleSnapshot.staff || [] }
      : null;
    const localGuestSlug = buildBookingSlug(localGuestSettings.slug || localGuestSettings.brandName || localGuestSettings.businessName || 'studio');
    const isGuestPublicPreview = !user && (guestMode || safeLocalGet(guestModeStorageKey) === 'true' || safeLocalGet(exampleModeStorageKey) === 'true');
    const guestSettingsForSlug = snapshotSettings || (
      localGuestSlug === publicSlug
        ? localGuestSettings
        : publicSlug === 'your-business'
          ? { slug: publicSlug, brandName: 'Your Business' }
          : null
    );
    if (isGuestPublicPreview && guestSettingsForSlug) {
      const publishableGuestSettings = stripPublicDraftFields(guestSettingsForSlug);
      setPublicError('');
      setPublicWorkspace({
        ...publishableGuestSettings,
        slug: publicSlug,
        workspaceName: publishableGuestSettings.brandName || publishableGuestSettings.businessName || 'Build A Booking Workspace',
        ownerId: '',
        isExamplePreview: Boolean(snapshotSettings)
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

    const getCallablePaymentOptions = async () => {
      if (!functions || !httpsCallable) {
        throw new Error('Payment options callable is not available.');
      }
      const callable = httpsCallable(functions, 'getPublicPaymentOptions');
      const result = await callable({ appId, publicSlug });
      const options = Array.isArray(result?.data?.options) ? result.data.options : [];
      return {
        options,
        manualPaymentOptions: Array.isArray(result?.data?.manualPaymentOptions)
          ? result.data.manualPaymentOptions
          : options.filter(option => manualGatewayIds.has(option.id))
      };
    };

    const loadManualGatewayOption = async (gatewayId) => {
      try {
        const snap = await FirebaseSDK.getDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', publicWorkspace.ownerId, 'payment_settings', gatewayId));
        if (!snap.exists()) return null;
        const data = snap.data() || {};
        if (data.enabled !== true) return null;
        const credentialSummary = sanitizeManualCredentialSummary(data.credentialSummary || {});
        return {
          id: gatewayId,
          gatewayType: gatewayId,
          name: gatewayId === 'cash' ? 'Pay on site' : (data.providerName || (gatewayId === 'manual_eft' ? 'Manual EFT' : gatewayId)),
          enabled: true,
          configured: data.configured !== false,
          mode: data.mode || 'live',
          credentialSummary,
          instructions: credentialSummary.instructions || ''
        };
      } catch (error) {
        const isPermissionDenied = error?.code === 'permission-denied' || /missing or insufficient permissions/i.test(error?.message || '');
        if (!isPermissionDenied) {
          console.error('Could not load payment option', gatewayId, error);
        }
        return null;
      }
    };

    const loadFallbackManualOptions = async () => {
      const options = await Promise.all(['manual_eft', 'cash'].map(loadManualGatewayOption));
      const enabledOptions = options.filter(Boolean);
      return {
        options: enabledOptions,
        manualPaymentOptions: enabledOptions
      };
    };

    getCallablePaymentOptions()
      .catch((error) => {
        console.warn('Public payment options callable unavailable; using manual payment fallback.', error);
        return loadFallbackManualOptions();
      })
      .then((paymentResult) => {
        if (!cancelled) {
          setPublicPaymentOptions(paymentResult?.options || []);
          setPublicManualPaymentOptions(paymentResult?.manualPaymentOptions || []);
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
