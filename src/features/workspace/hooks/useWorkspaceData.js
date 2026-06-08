import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultCommunications,
  createDefaultSettings,
  createGuestDemoWorkspace
} from '../../../config/appConfig';
import { isFirebaseConfigured } from '../../../services/firebase';
import { normalizeHexColor } from '../../../utils/theme';
import { writeBookingsCache } from '../../../utils/workspaceRoute';

const DEFAULT_STAFF = [{ id: 'owner', name: 'Admin', color: '#39FF14' }];

export const asArray = (value) => (Array.isArray(value) ? value : []);

export function useWorkspaceData({
  isGuestWorkspace,
  loading,
  publishedSettingsSnapshotRef,
  settingsRef,
  startsInGuestWorkspace,
  workspaceOwnerId
}) {
  const initialGuestWorkspaceRef = useRef(null);
  const guestDemoSeededRef = useRef(false);

  const getInitialGuestWorkspace = () => {
    if (!startsInGuestWorkspace) return null;
    if (!initialGuestWorkspaceRef.current) {
      initialGuestWorkspaceRef.current = createGuestDemoWorkspace();
    }
    return initialGuestWorkspaceRef.current;
  };

  const initialGuestWorkspace = getInitialGuestWorkspace();
  const [settings, setSettings] = useState(() => initialGuestWorkspace?.settings || createDefaultSettings());
  const [bookings, setBookings] = useState(() => asArray(initialGuestWorkspace?.bookings));
  const [financeImports, setFinanceImports] = useState(() => asArray(initialGuestWorkspace?.financeImports));
  const [financePaymentAttempts, setFinancePaymentAttempts] = useState([]);
  const [bookingsReady, setBookingsReady] = useState(() => Boolean(initialGuestWorkspace) || !isFirebaseConfigured);
  const [staffList, setStaffList] = useState(() => {
    const initialStaff = asArray(initialGuestWorkspace?.staffList);
    return initialStaff.length ? initialStaff : DEFAULT_STAFF;
  });
  const [clientRecords, setClientRecords] = useState(() => asArray(initialGuestWorkspace?.clientRecords));
  const [accountProfileOverride, setAccountProfileOverride] = useState(() => (
    initialGuestWorkspace?.settings?.accountProfiles?.['guest-workspace'] || {}
  ));
  const [communications, setCommunications] = useState(() => (
    initialGuestWorkspace?.communications || createDefaultCommunications()
  ));

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings, settingsRef]);

  useEffect(() => {
    setSettings(prev => {
      if (!prev.nativeAccent || normalizeHexColor(prev.primaryColor, '#000000') !== '#39FF14') return prev;
      return {
        ...prev,
        primaryColor: '#755CFF',
        slotBgColor: '#F8FAFC',
        dateActiveBgColor: '#EEF7FF',
        buttonTextColor: '#050505',
        availabilityStyle: 'solid',
        dateStyle: 'solid',
        timeSlotStyle: 'solid',
        actionButtonStyle: 'solid'
      };
    });
  }, []);

  useEffect(() => {
    if (!isGuestWorkspace) {
      guestDemoSeededRef.current = false;
      return;
    }
    if (loading) return;
    if (guestDemoSeededRef.current) return;

    const demoWorkspace = initialGuestWorkspaceRef.current || createGuestDemoWorkspace();
    setSettings(demoWorkspace.settings);
    setBookings(asArray(demoWorkspace.bookings));
    setFinanceImports(asArray(demoWorkspace.financeImports));
    setFinancePaymentAttempts([]);
    setBookingsReady(true);
    setStaffList(asArray(demoWorkspace.staffList).length ? asArray(demoWorkspace.staffList) : DEFAULT_STAFF);
    setClientRecords(asArray(demoWorkspace.clientRecords));
    setCommunications(demoWorkspace.communications);
    setAccountProfileOverride(demoWorkspace.settings.accountProfiles?.['guest-workspace'] || {});
    guestDemoSeededRef.current = true;
  }, [isGuestWorkspace, loading]);

  const resetGuestWorkspaceSeed = useCallback(() => {
    guestDemoSeededRef.current = false;
  }, []);

  const resetWorkspaceData = useCallback(() => {
    publishedSettingsSnapshotRef.current = null;
    guestDemoSeededRef.current = false;
    setSettings(createDefaultSettings());
    setCommunications(createDefaultCommunications());
    setBookings([]);
    setFinanceImports([]);
    setFinancePaymentAttempts([]);
    setBookingsReady(true);
    setClientRecords([]);
    setStaffList(DEFAULT_STAFF);
    setAccountProfileOverride({});
  }, [publishedSettingsSnapshotRef]);

  const setBookingsAndCache = useCallback((updater) => {
    setBookings(prev => {
      const nextBookings = typeof updater === 'function' ? updater(prev) : updater;
      if (workspaceOwnerId && Array.isArray(nextBookings)) {
        writeBookingsCache(workspaceOwnerId, nextBookings);
      }
      return nextBookings;
    });
  }, [workspaceOwnerId]);

  const safeStaffList = useMemo(() => asArray(staffList), [staffList]);
  const safeClientRecords = useMemo(() => asArray(clientRecords), [clientRecords]);
  const safeFinanceImports = useMemo(() => asArray(financeImports), [financeImports]);
  const visibleBookings = useMemo(() => asArray(bookings), [bookings]);

  return {
    accountProfileOverride,
    bookings,
    bookingsReady,
    clientRecords,
    communications,
    financeImports,
    financePaymentAttempts,
    resetGuestWorkspaceSeed,
    resetWorkspaceData,
    safeClientRecords,
    safeFinanceImports,
    safeStaffList,
    setAccountProfileOverride,
    setBookings,
    setBookingsAndCache,
    setBookingsReady,
    setClientRecords,
    setCommunications,
    setFinanceImports,
    setFinancePaymentAttempts,
    setSettings,
    setStaffList,
    settings,
    staffList,
    visibleBookings
  };
}
