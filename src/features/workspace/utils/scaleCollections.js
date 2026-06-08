import * as FirebaseSDK from '../../../services/firebase';
import { appId, db } from '../../../services/firebase';

const BATCH_LIMIT = 400;

const cleanId = (value = '', fallback = 'item') => (
  String(value || fallback)
    .trim()
    .replace(/[^A-Za-z0-9@._:-]/g, '-')
    .slice(0, 180) || fallback
);

const timestampMs = (value, fallback = Date.now()) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const lower = (value = '') => String(value || '').trim().toLowerCase();

const chunk = (items = [], size = BATCH_LIMIT) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const ownerCollection = (ownerId, collectionName) => (
  FirebaseSDK.collection(db, 'artifacts', appId, 'users', ownerId, collectionName)
);

const normalizeListRecords = ({ list = [], collectionName, idForRecord = record => record.id }) => (
  (Array.isArray(list) ? list : [])
    .map((record, index) => {
      const id = cleanId(idForRecord(record, index), `${collectionName}-${index + 1}`);
      return normalizeMirrorRecord(record, id, collectionName);
    })
    .filter(record => record.id)
);

const areRecordsEqual = (left = {}, right = {}) => JSON.stringify(left) === JSON.stringify(right);

const normalizeMirrorRecord = (record = {}, id, collectionName) => {
  const now = Date.now();
  const base = {
    ...record,
    id,
    updatedAtMs: timestampMs(record.updatedAtMs || record.updatedAt || record.importedAt || record.createdAt, now)
  };

  if (collectionName === 'clients') {
    return {
      ...base,
      searchName: lower(record.name),
      searchEmail: lower(record.email),
      searchPhone: String(record.phone || '').replace(/\D/g, ''),
      createdAtMs: timestampMs(record.createdAt, now)
    };
  }

  if (collectionName === 'staff') {
    return {
      ...base,
      searchName: lower(record.name || record.displayName),
      searchEmail: lower(record.email),
      sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : 0
    };
  }

  if (collectionName === 'services') {
    return {
      ...base,
      searchName: lower(record.name),
      categoryKey: lower(record.category),
      sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : 0
    };
  }

  if (collectionName === 'financeImports') {
    return {
      ...base,
      importedAtMs: timestampMs(record.importedAt || record.updatedAtMs || record.createdAt, now)
    };
  }

  return base;
};

export const syncListCollection = async ({
  ownerId,
  collectionName,
  list = [],
  idForRecord = record => record.id,
  deleteMissing = true,
  previousList = null
}) => {
  if (!db || !ownerId || !collectionName) return;
  const collectionRef = ownerCollection(ownerId, collectionName);
  const normalized = normalizeListRecords({ list, collectionName, idForRecord });
  const nextIds = new Set(normalized.map(record => record.id));
  const previousNormalized = Array.isArray(previousList)
    ? normalizeListRecords({ list: previousList, collectionName, idForRecord })
    : null;

  if (previousNormalized) {
    const previousById = new Map(previousNormalized.map(record => [record.id, record]));
    const changedRecords = normalized.filter(record => !areRecordsEqual(record, previousById.get(record.id)));
    const staleIds = previousNormalized.map(record => record.id).filter(id => !nextIds.has(id));

    for (const group of chunk(changedRecords)) {
      const batch = FirebaseSDK.writeBatch(db);
      group.forEach(record => {
        batch.set(FirebaseSDK.doc(collectionRef, record.id), record, { merge: true });
      });
      await batch.commit();
    }

    if (!deleteMissing) return;
    for (const group of chunk(staleIds)) {
      const batch = FirebaseSDK.writeBatch(db);
      group.forEach(id => batch.delete(FirebaseSDK.doc(collectionRef, id)));
      await batch.commit();
    }
    return;
  }

  for (const group of chunk(normalized)) {
    const batch = FirebaseSDK.writeBatch(db);
    group.forEach(record => {
      batch.set(FirebaseSDK.doc(collectionRef, record.id), record, { merge: true });
    });
    await batch.commit();
  }

  if (!deleteMissing) return;
  const existingSnap = await FirebaseSDK.getDocs(collectionRef);
  const staleDocs = existingSnap.docs.filter(docSnap => !nextIds.has(docSnap.id));
  for (const group of chunk(staleDocs)) {
    const batch = FirebaseSDK.writeBatch(db);
    group.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
  }
};

export const upsertListRecord = async ({
  ownerId,
  collectionName,
  record = {},
  idForRecord = item => item.id
}) => {
  if (!db || !ownerId || !collectionName) return;
  const [normalized] = normalizeListRecords({ list: [record], collectionName, idForRecord });
  if (!normalized?.id) return;
  await FirebaseSDK.setDoc(
    FirebaseSDK.doc(ownerCollection(ownerId, collectionName), normalized.id),
    normalized,
    { merge: true }
  );
};

export const deleteListRecord = async ({
  ownerId,
  collectionName,
  record = {},
  idForRecord = item => item.id
}) => {
  if (!db || !ownerId || !collectionName) return;
  const id = cleanId(idForRecord(record), '');
  if (!id) return;
  await FirebaseSDK.deleteDoc(FirebaseSDK.doc(ownerCollection(ownerId, collectionName), id));
};

export const syncPublicWorkspaceCollections = async ({
  publicSlug,
  settings = {},
  staffList = []
}) => {
  if (!db || !publicSlug) return;
  const workspaceRef = FirebaseSDK.doc(db, 'artifacts', appId, 'public', 'data', 'workspaces', publicSlug);
  const publicServices = Array.isArray(settings.services) ? settings.services : [];
  const publicStaff = (Array.isArray(staffList) ? staffList : [])
    .filter(staff => staff?.id && staff.accessEnabled !== false)
    .map(staff => ({
      id: cleanId(staff.id, 'staff'),
      name: staff.name || staff.displayName || 'Team member',
      color: staff.color || '#111827',
      photoURL: staff.photoURL || '',
      sortOrder: Number.isFinite(Number(staff.sortOrder)) ? Number(staff.sortOrder) : 0,
      updatedAtMs: Date.now()
    }));

  await syncNestedPublicList({ workspaceRef, collectionName: 'services', list: publicServices });
  await syncNestedPublicList({ workspaceRef, collectionName: 'staff', list: publicStaff });
};

const syncNestedPublicList = async ({ workspaceRef, collectionName, list }) => {
  const collectionRef = FirebaseSDK.collection(workspaceRef, collectionName);
  const normalized = (Array.isArray(list) ? list : [])
    .map((record, index) => normalizeMirrorRecord(record, cleanId(record.id, `${collectionName}-${index + 1}`), collectionName));
  const nextIds = new Set(normalized.map(record => record.id));

  for (const group of chunk(normalized)) {
    const batch = FirebaseSDK.writeBatch(db);
    group.forEach(record => batch.set(FirebaseSDK.doc(collectionRef, record.id), record, { merge: true }));
    await batch.commit();
  }

  const existingSnap = await FirebaseSDK.getDocs(collectionRef);
  const staleDocs = existingSnap.docs.filter(docSnap => !nextIds.has(docSnap.id));
  for (const group of chunk(staleDocs)) {
    const batch = FirebaseSDK.writeBatch(db);
    group.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
  }
};

export const syncWorkspaceScaleCollections = async ({
  ownerId,
  settings = {},
  staffList = [],
  previousSettings = null,
  previousStaffList = null
}) => {
  if (!db || !ownerId) return;
  await syncListCollection({
    ownerId,
    collectionName: 'services',
    list: Array.isArray(settings.services) ? settings.services : [],
    previousList: Array.isArray(previousSettings?.services) ? previousSettings.services : null,
    idForRecord: record => record.id
  });
  await syncCalendarCollections({ ownerId, settings, staffList, previousSettings, previousStaffList });
};

export const syncCalendarCollections = async ({
  ownerId,
  settings = {},
  staffList = [],
  previousSettings = null,
  previousStaffList = null
}) => {
  if (!db || !ownerId) return;
  const buildDefaultRows = (sourceSettings = {}, sourceStaffList = []) => [
    {
      id: 'workspace',
      calendarId: 'workspace',
      calendarName: sourceSettings.brandName || 'Business',
      availableTimes: Array.isArray(sourceSettings.availableTimes) ? sourceSettings.availableTimes : [],
      scheduleDefaults: sourceSettings.scheduleDefaults || {},
      updatedAtMs: Date.now()
    },
    ...(Array.isArray(sourceStaffList) ? sourceStaffList : []).filter(staff => staff?.id).map(staff => ({
      id: cleanId(staff.id, 'staff'),
      calendarId: staff.id,
      calendarName: staff.name || 'Staff',
      availableTimes: Array.isArray(sourceSettings.staffCalendars?.[staff.id]?.availableTimes)
        ? sourceSettings.staffCalendars[staff.id].availableTimes
        : [],
      scheduleDefaults: sourceSettings.staffCalendars?.[staff.id]?.scheduleDefaults || {},
      updatedAtMs: Date.now()
    }))
  ];
  const defaultRows = buildDefaultRows(settings, staffList);
  const previousDefaultRows = previousSettings
    ? buildDefaultRows(previousSettings, previousStaffList || staffList)
    : null;
  await syncListCollection({
    ownerId,
    collectionName: 'calendarDefaults',
    list: defaultRows,
    previousList: previousDefaultRows,
    idForRecord: record => record.id
  });

  const buildDayRows = (sourceSettings = {}) => {
    const rows = [];
    Object.entries(sourceSettings.schedule || {}).forEach(([dateKey, config]) => {
      rows.push(normalizeCalendarDayRow('workspace', dateKey, config));
    });
    Object.entries(sourceSettings.staffCalendars || {}).forEach(([staffId, calendar]) => {
      Object.entries(calendar?.schedule || {}).forEach(([dateKey, config]) => {
        rows.push(normalizeCalendarDayRow(staffId, dateKey, config));
      });
    });
    return rows;
  };
  const dayRows = buildDayRows(settings);
  const previousDayRows = previousSettings ? buildDayRows(previousSettings) : null;
  await syncListCollection({
    ownerId,
    collectionName: 'calendarDays',
    list: dayRows,
    previousList: previousDayRows,
    idForRecord: record => record.id
  });
};

const normalizeCalendarDayRow = (calendarId, dateKey, config = {}) => ({
  id: `${cleanId(calendarId, 'workspace')}_${cleanId(dateKey, 'date')}`,
  calendarId,
  dateKey,
  available: config.available !== false,
  times: Array.isArray(config.times) ? config.times : [],
  updatedAtMs: timestampMs(config.updatedAt || config.updatedAtMs, Date.now())
});

export const syncStaffCalendarCollections = async ({
  ownerId,
  staffId,
  settings = {},
  previousSettings = null
}) => {
  if (!db || !ownerId || !staffId) return;
  const calendar = settings.staffCalendars?.[staffId] || {};
  const previousCalendar = previousSettings?.staffCalendars?.[staffId] || {};
  await upsertListRecord({
    ownerId,
    collectionName: 'calendarDefaults',
    record: {
      id: cleanId(staffId, 'staff'),
      calendarId: staffId,
      calendarName: calendar.calendarName || calendar.name || 'Staff',
      availableTimes: Array.isArray(calendar.availableTimes) ? calendar.availableTimes : [],
      scheduleDefaults: calendar.scheduleDefaults || {},
      updatedAtMs: Date.now()
    },
    idForRecord: record => record.id
  });

  const dayRows = Object.entries(calendar.schedule || {}).map(([dateKey, config]) => normalizeCalendarDayRow(staffId, dateKey, config));
  const previousDayRows = previousSettings
    ? Object.entries(previousCalendar.schedule || {}).map(([dateKey, config]) => normalizeCalendarDayRow(staffId, dateKey, config))
    : null;

  if (previousDayRows) {
    await syncListCollection({
      ownerId,
      collectionName: 'calendarDays',
      list: dayRows,
      previousList: previousDayRows,
      idForRecord: record => record.id
    });
    return;
  }

  await syncListCollection({
    ownerId,
    collectionName: 'calendarDays',
    list: dayRows,
    idForRecord: record => record.id,
    deleteMissing: false
  });

  const collectionRef = ownerCollection(ownerId, 'calendarDays');
  const existingSnap = await FirebaseSDK.getDocs(FirebaseSDK.query(
    collectionRef,
    FirebaseSDK.where('calendarId', '==', staffId)
  ));
  const nextIds = new Set(dayRows.map(row => row.id));
  const staleDocs = existingSnap.docs.filter(docSnap => !nextIds.has(docSnap.id));
  for (const group of chunk(staleDocs)) {
    const batch = FirebaseSDK.writeBatch(db);
    group.forEach(docSnap => batch.delete(docSnap.ref));
    await batch.commit();
  }
};
