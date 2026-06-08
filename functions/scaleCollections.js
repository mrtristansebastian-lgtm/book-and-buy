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

const chunks = (items = [], size = BATCH_LIMIT) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
};

const normalizeRecord = (record = {}, id, collectionName) => {
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

const syncListCollection = async ({ db, baseRef, collectionName, list = [], idForRecord = record => record.id }) => {
  const collectionRef = baseRef.collection(collectionName);
  const normalized = (Array.isArray(list) ? list : [])
    .map((record, index) => normalizeRecord(record, cleanId(idForRecord(record, index), `${collectionName}-${index + 1}`), collectionName))
    .filter(record => record.id);
  const nextIds = new Set(normalized.map(record => record.id));
  let written = 0;
  let deleted = 0;

  for (const group of chunks(normalized)) {
    const batch = db.batch();
    group.forEach(record => batch.set(collectionRef.doc(record.id), record, { merge: true }));
    await batch.commit();
    written += group.length;
  }

  const existingSnap = await collectionRef.get();
  const staleDocs = existingSnap.docs.filter(doc => !nextIds.has(doc.id));
  for (const group of chunks(staleDocs)) {
    const batch = db.batch();
    group.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += group.length;
  }

  return { written, deleted };
};

const calendarRowsFromSettings = (settings = {}, staffList = []) => {
  const defaultRows = [
    {
      id: 'workspace',
      calendarId: 'workspace',
      calendarName: settings.brandName || 'Business',
      availableTimes: Array.isArray(settings.availableTimes) ? settings.availableTimes : [],
      scheduleDefaults: settings.scheduleDefaults || {},
      updatedAtMs: Date.now()
    },
    ...(Array.isArray(staffList) ? staffList : []).filter(staff => staff?.id).map(staff => ({
      id: cleanId(staff.id, 'staff'),
      calendarId: staff.id,
      calendarName: staff.name || 'Staff',
      availableTimes: Array.isArray(settings.staffCalendars?.[staff.id]?.availableTimes)
        ? settings.staffCalendars[staff.id].availableTimes
        : [],
      scheduleDefaults: settings.staffCalendars?.[staff.id]?.scheduleDefaults || {},
      updatedAtMs: Date.now()
    }))
  ];
  const dayRows = [];
  Object.entries(settings.schedule || {}).forEach(([dateKey, config]) => {
    dayRows.push({
      id: `workspace_${cleanId(dateKey, 'date')}`,
      calendarId: 'workspace',
      dateKey,
      available: config?.available !== false,
      times: Array.isArray(config?.times) ? config.times : [],
      updatedAtMs: timestampMs(config?.updatedAt || config?.updatedAtMs, Date.now())
    });
  });
  Object.entries(settings.staffCalendars || {}).forEach(([staffId, calendar]) => {
    Object.entries(calendar?.schedule || {}).forEach(([dateKey, config]) => {
      dayRows.push({
        id: `${cleanId(staffId, 'staff')}_${cleanId(dateKey, 'date')}`,
        calendarId: staffId,
        dateKey,
        available: config?.available !== false,
        times: Array.isArray(config?.times) ? config.times : [],
        updatedAtMs: timestampMs(config?.updatedAt || config?.updatedAtMs, Date.now())
      });
    });
  });
  return { defaultRows, dayRows };
};

const backfillWorkspaceScaleCollections = async ({ db, appId, ownerId }) => {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(ownerId);
  const [settingsSnap, staffSnap, clientsSnap, financeSnap] = await Promise.all([
    userRef.collection('config').doc('settings').get(),
    userRef.collection('config').doc('staff').get(),
    userRef.collection('config').doc('clients').get(),
    userRef.collection('finance').doc('imports').get()
  ]);
  const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
  const staffList = Array.isArray(staffSnap.data()?.list) ? staffSnap.data().list : [];
  const clientList = Array.isArray(clientsSnap.data()?.list) ? clientsSnap.data().list : [];
  const financeImports = Array.isArray(financeSnap.data()?.list) ? financeSnap.data().list : [];
  const { defaultRows, dayRows } = calendarRowsFromSettings(settings, staffList);

  const results = {
    staff: await syncListCollection({ db, baseRef: userRef, collectionName: 'staff', list: staffList }),
    clients: await syncListCollection({ db, baseRef: userRef, collectionName: 'clients', list: clientList }),
    services: await syncListCollection({ db, baseRef: userRef, collectionName: 'services', list: settings.services || [] }),
    financeImports: await syncListCollection({ db, baseRef: userRef, collectionName: 'financeImports', list: financeImports }),
    calendarDefaults: await syncListCollection({ db, baseRef: userRef, collectionName: 'calendarDefaults', list: defaultRows }),
    calendarDays: await syncListCollection({ db, baseRef: userRef, collectionName: 'calendarDays', list: dayRows })
  };

  return results;
};

module.exports = {
  backfillWorkspaceScaleCollections
};
