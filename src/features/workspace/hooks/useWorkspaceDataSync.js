import { useEffect } from 'react';
import { createDefaultCommunications, createDefaultSettings, normalizeCommunications } from '../../../config/appConfig';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { createOwnerStaffProfile } from '../../staff';
import { readBookingsCache, writeBookingsCache } from '../../../utils/workspaceRoute';
import { areJsonEqual, mergeStateIfChanged } from '../utils/workspaceState';
import { asArray } from './useWorkspaceData';

const DEFAULT_STAFF = [{ id: 'owner', name: 'Admin', color: '#39FF14' }];
const COLLECTION_CLIENT_LIMIT = 500;
const COLLECTION_FINANCE_IMPORT_LIMIT = 500;
const COLLECTION_STAFF_LIMIT = 200;
const COLLECTION_SERVICE_LIMIT = 300;
const COLLECTION_CALENDAR_DAY_LIMIT = 900;

const dateValueToMs = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getTimestampValue = (value) => {
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const handleSyncError = (label) => (error) => {
  console.error(`${label} sync failed`, error);
};

const sortBySortOrder = (items = []) => [...items].sort((a, b) => (
  Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
  String(a.name || a.id || '').localeCompare(String(b.name || b.id || ''))
));

const sortByUpdatedDesc = (items = []) => [...items].sort((a, b) => (
  getTimestampValue(b.updatedAtMs || b.updatedAt || b.createdAt) -
  getTimestampValue(a.updatedAtMs || a.updatedAt || a.createdAt)
));

const getRollingCalendarStartKey = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
};

const mergeCalendarMirrorIntoSettings = (baseSettings = {}, defaultRows = [], dayRows = []) => {
  const nextSettings = { ...baseSettings };
  const staffCalendars = { ...(baseSettings.staffCalendars || {}) };
  defaultRows.forEach(row => {
    const calendarId = row.calendarId || row.id;
    if (!calendarId) return;
    if (calendarId === 'workspace') {
      if (Array.isArray(row.availableTimes)) nextSettings.availableTimes = row.availableTimes;
      if (row.scheduleDefaults) nextSettings.scheduleDefaults = row.scheduleDefaults;
      return;
    }
    const previousCalendar = staffCalendars[calendarId] || {};
    staffCalendars[calendarId] = {
      ...previousCalendar,
      staffId: calendarId,
      ...(Array.isArray(row.availableTimes) ? { availableTimes: row.availableTimes } : {}),
      ...(row.scheduleDefaults ? { scheduleDefaults: row.scheduleDefaults } : {})
    };
  });

  const workspaceSchedule = { ...(baseSettings.schedule || {}) };
  dayRows.forEach(row => {
    if (!row.dateKey || !row.calendarId) return;
    const dayConfig = {
      available: row.available !== false,
      times: Array.isArray(row.times) ? row.times : []
    };
    if (row.calendarId === 'workspace') {
      workspaceSchedule[row.dateKey] = dayConfig;
      return;
    }
    const previousCalendar = staffCalendars[row.calendarId] || { staffId: row.calendarId };
    staffCalendars[row.calendarId] = {
      ...previousCalendar,
      schedule: {
        ...(previousCalendar.schedule || {}),
        [row.dateKey]: dayConfig
      }
    };
  });

  nextSettings.schedule = workspaceSchedule;
  nextSettings.staffCalendars = staffCalendars;
  return nextSettings;
};

export function useWorkspaceDataSync({
  isGuestWorkspace,
  isWorkspaceOwner,
  loading,
  personalDisplayName,
  personalProfile,
  publicSlug,
  publishedSettingsSnapshotRef,
  setBookings,
  setBookingsReady,
  setClientRecords,
  setCommunications,
  setFinanceImports,
  setFinancePaymentAttempts,
  setSettings,
  setStaffList,
  settingsRef,
  user,
  workspaceOwnerId
}) {
  useEffect(() => {
    if (publicSlug) {
      return undefined;
    }
    if ((!user || !workspaceOwnerId) && isFirebaseConfigured) return undefined;
    if (!isFirebaseConfigured) {
      return undefined;
    }

    const settingsDocRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'settings');
    const applyWorkspaceSettings = (baseSettings = {}) => {
      const data = { ...baseSettings };
      if (data.fontFamily === 'sans') data.fontFamily = 'inter';
      if (data.fontFamily === 'serif') data.fontFamily = 'playfair';
      if (data.fontFamily === 'mono') data.fontFamily = 'space-mono';
      if (data.fontFamily === 'display') data.fontFamily = 'syne';
      setSettings(prev => mergeStateIfChanged(prev, data));
    };

    const unsubSettings = FirebaseSDK.onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = { ...docSnap.data() };
        publishedSettingsSnapshotRef.current = data;
        applyWorkspaceSettings(data);
      } else {
        publishedSettingsSnapshotRef.current = null;
        setSettings(prev => mergeStateIfChanged(prev, createDefaultSettings()));
      }
    }, handleSyncError('Settings'));

    let hasStaffCollection = false;
    let hasClientCollection = false;
    let hasFinanceImportCollection = false;
    let calendarDefaultRows = [];
    let calendarDayRows = [];

    const staffCollectionQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'staff'),
      FirebaseSDK.orderBy('sortOrder', 'asc'),
      FirebaseSDK.limit(COLLECTION_STAFF_LIMIT)
    );
    const unsubStaffCollection = FirebaseSDK.onSnapshot(staffCollectionQuery, (snap) => {
      hasStaffCollection = !snap.empty;
      if (!hasStaffCollection) return;
      const nextStaff = sortBySortOrder(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setStaffList(prev => areJsonEqual(prev, nextStaff) ? prev : nextStaff);
    }, handleSyncError('Staff collection'));

    const staffRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'staff');
    const unsubStaff = FirebaseSDK.onSnapshot(staffRef, (docSnap) => {
      if (hasStaffCollection) return;
      if (docSnap.exists()) {
        const nextStaff = asArray(docSnap.data().list);
        setStaffList(prev => areJsonEqual(prev, nextStaff) ? prev : nextStaff);
      } else if (isWorkspaceOwner) {
        const ownerProfile = [createOwnerStaffProfile({
          ...user,
          displayName: personalDisplayName,
          email: personalProfile.email || user?.email || '',
          photoURL: personalProfile.photoURL || user?.photoURL || '',
          phoneNumber: personalProfile.mobile || user?.phoneNumber || ''
        })];
        setStaffList(prev => areJsonEqual(prev, ownerProfile) ? prev : ownerProfile);
      } else {
        setStaffList(prev => areJsonEqual(prev, DEFAULT_STAFF) ? prev : DEFAULT_STAFF);
      }
    }, handleSyncError('Staff'));

    const commsRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'communications');
    const unsubComms = FirebaseSDK.onSnapshot(commsRef, (docSnap) => {
      if (docSnap.exists()) {
        const nextComms = normalizeCommunications(docSnap.data());
        setCommunications(prev => areJsonEqual(prev, nextComms) ? prev : nextComms);
      } else {
        const nextComms = createDefaultCommunications();
        setCommunications(prev => areJsonEqual(prev, nextComms) ? prev : nextComms);
      }
    }, handleSyncError('Communication'));

    const servicesQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'services'),
      FirebaseSDK.orderBy('sortOrder', 'asc'),
      FirebaseSDK.limit(COLLECTION_SERVICE_LIMIT)
    );
    const unsubServicesCollection = FirebaseSDK.onSnapshot(servicesQuery, (snap) => {
      if (snap.empty) return;
      const nextServices = sortBySortOrder(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setSettings(prev => mergeStateIfChanged(prev, { ...prev, services: nextServices }));
    }, handleSyncError('Service collection'));

    const applyCalendarMirror = () => {
      if (!calendarDefaultRows.length && !calendarDayRows.length) return;
      setSettings(prev => mergeStateIfChanged(prev, mergeCalendarMirrorIntoSettings(prev, calendarDefaultRows, calendarDayRows)));
    };
    const calendarDefaultsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'calendarDefaults'),
      FirebaseSDK.limit(COLLECTION_STAFF_LIMIT + 1)
    );
    const unsubCalendarDefaults = FirebaseSDK.onSnapshot(calendarDefaultsQuery, (snap) => {
      calendarDefaultRows = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      applyCalendarMirror();
    }, handleSyncError('Calendar defaults'));
    const calendarDaysQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'calendarDays'),
      FirebaseSDK.where('dateKey', '>=', getRollingCalendarStartKey()),
      FirebaseSDK.orderBy('dateKey', 'asc'),
      FirebaseSDK.limit(COLLECTION_CALENDAR_DAY_LIMIT)
    );
    const unsubCalendarDays = FirebaseSDK.onSnapshot(calendarDaysQuery, (snap) => {
      calendarDayRows = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      applyCalendarMirror();
    }, handleSyncError('Calendar days'));

    const clientsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'clients'),
      FirebaseSDK.orderBy('updatedAtMs', 'desc'),
      FirebaseSDK.limit(COLLECTION_CLIENT_LIMIT)
    );
    const unsubClientsCollection = FirebaseSDK.onSnapshot(clientsQuery, (snap) => {
      hasClientCollection = !snap.empty;
      if (!hasClientCollection) return;
      const nextClients = sortByUpdatedDesc(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setClientRecords(prev => areJsonEqual(prev, nextClients) ? prev : nextClients);
    }, handleSyncError('Client collection'));

    const clientsRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'config', 'clients');
    const unsubClients = FirebaseSDK.onSnapshot(clientsRef, (docSnap) => {
      if (hasClientCollection) return;
      if (docSnap.exists()) {
        const nextClients = asArray(docSnap.data().list);
        setClientRecords(prev => areJsonEqual(prev, nextClients) ? prev : nextClients);
      } else {
        setClientRecords(prev => prev.length ? [] : prev);
      }
    }, handleSyncError('Client'));

    const financeImportsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'financeImports'),
      FirebaseSDK.orderBy('updatedAtMs', 'desc'),
      FirebaseSDK.limit(COLLECTION_FINANCE_IMPORT_LIMIT)
    );
    const unsubFinanceImportsCollection = FirebaseSDK.onSnapshot(financeImportsQuery, (snap) => {
      hasFinanceImportCollection = !snap.empty;
      if (!hasFinanceImportCollection) return;
      const nextImports = sortByUpdatedDesc(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setFinanceImports(prev => areJsonEqual(prev, nextImports) ? prev : nextImports);
    }, handleSyncError('Finance import collection'));

    const financeImportsRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'finance', 'imports');
    const unsubFinanceImports = FirebaseSDK.onSnapshot(financeImportsRef, (docSnap) => {
      if (hasFinanceImportCollection) return;
      if (docSnap.exists()) {
        const nextImports = asArray(docSnap.data().list);
        setFinanceImports(prev => areJsonEqual(prev, nextImports) ? prev : nextImports);
      } else {
        setFinanceImports(prev => prev.length ? [] : prev);
      }
    }, handleSyncError('Finance import'));

    return () => {
      unsubSettings();
      unsubStaffCollection();
      unsubStaff();
      unsubComms();
      unsubServicesCollection();
      unsubCalendarDefaults();
      unsubCalendarDays();
      unsubClientsCollection();
      unsubClients();
      unsubFinanceImportsCollection();
      unsubFinanceImports();
    };
  }, [user, workspaceOwnerId, isWorkspaceOwner, publicSlug, personalDisplayName, personalProfile.email, personalProfile.mobile, personalProfile.photoURL]);

  useEffect(() => {
    if (publicSlug || isGuestWorkspace || !isFirebaseConfigured || !db || !workspaceOwnerId) {
      setFinancePaymentAttempts(prev => prev.length ? [] : prev);
      return undefined;
    }

    const paymentAttemptsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'payment_attempts'),
      FirebaseSDK.orderBy('updatedAtMs', 'desc'),
      FirebaseSDK.limit(240)
    );
    const unsubscribe = FirebaseSDK.onSnapshot(paymentAttemptsQuery, (snapshot) => {
      const nextAttempts = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          gatewayType: data.gatewayType || 'stripe',
          status: data.status || 'initiated',
          amountInCents: Number(data.amountInCents || data.amountPaidInCents || 0),
          currency: data.currency || settingsRef.current?.currency || 'ZAR',
          customerName: data.customerName || data.clientName || 'Client',
          bookingId: data.bookingId || '',
          updatedAtMs: dateValueToMs(data.paidAt || data.updatedAt || data.createdAt)
        };
      });
      setFinancePaymentAttempts(prev => areJsonEqual(prev, nextAttempts) ? prev : nextAttempts);
    }, (error) => console.error('Finance payment attempts sync failed', error));

    return () => unsubscribe();
  }, [workspaceOwnerId, publicSlug, isGuestWorkspace]);

  useEffect(() => {
    if (publicSlug) {
      setBookingsReady(true);
      return undefined;
    }
    if (isGuestWorkspace) {
      setBookingsReady(true);
      return undefined;
    }
    if (!isFirebaseConfigured || !db) {
      setBookingsReady(true);
      return undefined;
    }
    if (!user || !workspaceOwnerId) {
      setBookings([]);
      setBookingsReady(!loading);
      return undefined;
    }

    const cachedBookings = readBookingsCache(workspaceOwnerId);
    if (cachedBookings?.bookings?.length) {
      setBookings(prev => areJsonEqual(prev, cachedBookings.bookings) ? prev : cachedBookings.bookings);
      setBookingsReady(true);
    } else {
      setBookings([]);
      setBookingsReady(false);
    }

    const bookingsCol = FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'bookings');
    const bookingsQuery = FirebaseSDK.query(
      bookingsCol,
      FirebaseSDK.orderBy('timestamp', 'desc'),
      FirebaseSDK.limit(250)
    );

    const unsubBookings = FirebaseSDK.onSnapshot(bookingsQuery, (snap) => {
      const nextBookings = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => getTimestampValue(b.timestamp) - getTimestampValue(a.timestamp));
      writeBookingsCache(workspaceOwnerId, nextBookings);
      setBookings(prev => areJsonEqual(prev, nextBookings) ? prev : nextBookings);
      setBookingsReady(true);
    }, (error) => {
      console.error('Booking sync failed', error);
      const fallbackBookings = readBookingsCache(workspaceOwnerId);
      if (fallbackBookings?.bookings?.length) {
        setBookings(prev => areJsonEqual(prev, fallbackBookings.bookings) ? prev : fallbackBookings.bookings);
      }
      setBookingsReady(true);
    });

    return () => unsubBookings();
  }, [isGuestWorkspace, loading, publicSlug, user?.uid, workspaceOwnerId]);
}
