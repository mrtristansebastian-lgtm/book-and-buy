import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultCommunications,
  createDefaultSettings,
  createGuestDemoWorkspace,
  createWorkspaceExample
} from '../../../config/appConfig';
import { isFirebaseConfigured } from '../../../services/firebase';
import { normalizeHexColor } from '../../../utils/theme';
import { writeBookingsCache } from '../../../utils/workspaceRoute';

const DEFAULT_STAFF = [{ id: 'owner', name: 'Admin', title: 'Owner', color: '#39FF14' }];

export const asArray = (value) => (Array.isArray(value) ? value : []);

export function useWorkspaceData({
  isGuestWorkspace,
  isExampleMode = false,
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
  const [settings, setSettingsState] = useState(() => initialGuestWorkspace?.settings || createDefaultSettings());
  const [bookings, setBookingsState] = useState(() => asArray(initialGuestWorkspace?.bookings));
  const [financePaymentAttempts, setFinancePaymentAttemptsState] = useState([]);
  const [bookingsReady, setBookingsReadyState] = useState(() => Boolean(initialGuestWorkspace) || !isFirebaseConfigured);
  const [staffList, setStaffListState] = useState(() => {
    const initialStaff = asArray(initialGuestWorkspace?.staffList);
    return initialStaff.length ? initialStaff : DEFAULT_STAFF;
  });
  const [clientRecords, setClientRecordsState] = useState(() => asArray(initialGuestWorkspace?.clientRecords));
  const [accountProfileOverride, setAccountProfileOverrideState] = useState(() => (
    initialGuestWorkspace?.settings?.accountProfiles?.['guest-workspace'] || {}
  ));
  const [communications, setCommunicationsState] = useState(() => (
    initialGuestWorkspace?.communications || createDefaultCommunications()
  ));
  const [exampleSupportThreads, setExampleSupportThreads] = useState([]);
  const [exampleNotifications, setExampleNotifications] = useState([]);
  const [exampleGatewayStates, setExampleGatewayStates] = useState({});
  const [exampleManifest, setExampleManifest] = useState(null);
  const readOnlyExampleMode = isExampleMode && !isGuestWorkspace;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings, settingsRef]);

  useEffect(() => {
    setSettingsState(prev => {
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
    setSettingsState(demoWorkspace.settings);
    setBookingsState(asArray(demoWorkspace.bookings));
    setFinancePaymentAttemptsState([]);
    setBookingsReadyState(true);
    setStaffListState(asArray(demoWorkspace.staffList).length ? asArray(demoWorkspace.staffList) : DEFAULT_STAFF);
    setClientRecordsState(asArray(demoWorkspace.clientRecords));
    setCommunicationsState(demoWorkspace.communications);
    setAccountProfileOverrideState(demoWorkspace.settings.accountProfiles?.['guest-workspace'] || {});
    setExampleSupportThreads([]);
    setExampleNotifications([]);
    setExampleGatewayStates({});
    setExampleManifest(null);
    guestDemoSeededRef.current = true;
  }, [isGuestWorkspace, loading]);

  const resetGuestWorkspaceSeed = useCallback(() => {
    guestDemoSeededRef.current = false;
  }, []);

  const resetWorkspaceData = useCallback(() => {
    publishedSettingsSnapshotRef.current = null;
    guestDemoSeededRef.current = false;
    setSettingsState(createDefaultSettings());
    setCommunicationsState(createDefaultCommunications());
    setBookingsState([]);
    setFinancePaymentAttemptsState([]);
    setBookingsReadyState(true);
    setClientRecordsState([]);
    setStaffListState(DEFAULT_STAFF);
    setAccountProfileOverrideState({});
    setExampleSupportThreads([]);
    setExampleNotifications([]);
    setExampleGatewayStates({});
    setExampleManifest(null);
  }, [publishedSettingsSnapshotRef]);

  const loadWorkspaceExample = useCallback((anchorDate) => {
    const example = createWorkspaceExample({ anchorDate });
    setSettingsState(example.settings);
    setBookingsState(example.bookings);
    setFinancePaymentAttemptsState([]);
    setBookingsReadyState(true);
    setStaffListState(example.staffList);
    setClientRecordsState(example.clientRecords);
    setCommunicationsState(example.communications);
    setAccountProfileOverrideState({});
    setExampleSupportThreads(example.supportThreads);
    setExampleNotifications(example.notifications);
    setExampleGatewayStates(example.gatewayStates);
    setExampleManifest(example.manifest);
    return example;
  }, []);

  const restoreBlankGuestWorkspace = useCallback(() => {
    const demoWorkspace = createGuestDemoWorkspace();
    setSettingsState(demoWorkspace.settings);
    setBookingsState([]);
    setFinancePaymentAttemptsState([]);
    setBookingsReadyState(true);
    setStaffListState(demoWorkspace.staffList);
    setClientRecordsState([]);
    setCommunicationsState(demoWorkspace.communications);
    setAccountProfileOverrideState({});
    setExampleSupportThreads([]);
    setExampleNotifications([]);
    setExampleGatewayStates({});
    setExampleManifest(null);
  }, []);

  const setBookingsAndCache = useCallback((updater) => {
    if (readOnlyExampleMode) return;
    setBookingsState(prev => {
      const nextBookings = typeof updater === 'function' ? updater(prev) : updater;
      if (workspaceOwnerId && Array.isArray(nextBookings)) {
        writeBookingsCache(workspaceOwnerId, nextBookings);
      }
      return nextBookings;
    });
  }, [readOnlyExampleMode, workspaceOwnerId]);

  const guardSetter = useCallback((setter) => (updater) => {
    if (!readOnlyExampleMode) setter(updater);
  }, [readOnlyExampleMode]);
  const setSettings = useMemo(() => guardSetter(setSettingsState), [guardSetter]);
  const setBookings = useMemo(() => guardSetter(setBookingsState), [guardSetter]);
  const setFinancePaymentAttempts = useMemo(() => guardSetter(setFinancePaymentAttemptsState), [guardSetter]);
  const setBookingsReady = useMemo(() => guardSetter(setBookingsReadyState), [guardSetter]);
  const setStaffList = useMemo(() => guardSetter(setStaffListState), [guardSetter]);
  const setClientRecords = useMemo(() => guardSetter(setClientRecordsState), [guardSetter]);
  const setAccountProfileOverride = useMemo(() => guardSetter(setAccountProfileOverrideState), [guardSetter]);
  const setCommunications = useMemo(() => guardSetter(setCommunicationsState), [guardSetter]);

  const safeStaffList = useMemo(() => asArray(staffList), [staffList]);
  const safeClientRecords = useMemo(() => asArray(clientRecords), [clientRecords]);
  const visibleBookings = useMemo(() => asArray(bookings), [bookings]);

  return {
    accountProfileOverride,
    bookings,
    bookingsReady,
    clientRecords,
    communications,
    exampleGatewayStates,
    exampleManifest,
    exampleNotifications,
    exampleSupportThreads,
    financePaymentAttempts,
    loadWorkspaceExample,
    restoreBlankGuestWorkspace,
    resetGuestWorkspaceSeed,
    resetWorkspaceData,
    safeClientRecords,
    safeStaffList,
    setAccountProfileOverride,
    setBookings,
    setBookingsAndCache,
    setBookingsReady,
    setClientRecords,
    setCommunications,
    setFinancePaymentAttempts,
    setSettings,
    setStaffList,
    settings,
    staffList,
    visibleBookings
  };
}
