import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();
const WRITE_BATCH_LIMIT = 400;

const getTimestampValue = (value) => {
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export function createClientCsvMigrationActions({
  bookingPageSlug,
  buildClientKey,
  canManageWorkspace,
  clientRecords,
  safeClientRecords,
  safeFinanceImports,
  saveClients,
  saveFinanceImports,
  setBookingsAndCache,
  settings,
  showToast,
  user,
  visibleBookings,
  workspaceOwnerId
}) {
  const commitBookingImportRows = async (bookings = []) => {
    for (let index = 0; index < bookings.length; index += WRITE_BATCH_LIMIT) {
      const batch = FirebaseSDK.writeBatch(db);
      bookings.slice(index, index + WRITE_BATCH_LIMIT).forEach((booking) => {
        const { id, ...bookingPayload } = booking;
        batch.set(
          FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'bookings', id),
          bookingPayload
        );
      });
      await batch.commit();
    }
  };

  const commitBookingDeletes = async (docs = []) => {
    for (let index = 0; index < docs.length; index += WRITE_BATCH_LIMIT) {
      const batch = FirebaseSDK.writeBatch(db);
      docs.slice(index, index + WRITE_BATCH_LIMIT).forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }
  };

  const getImportedClientKey = (client = {}) => {
    const emailKey = normalizeEmail(client.email || '');
    const phoneKey = String(client.phone || '').replace(/\D/g, '');
    if (emailKey) return `email:${emailKey}`;
    if (phoneKey) return `phone:${phoneKey}`;
    return `id:${client.id || buildClientKey(client.name, client.phone)}`;
  };

  const handleCsvMigrationImport = async (payload = {}) => {
    if (!canManageWorkspace) {
      showToast('Only owners and admins can import CSV data.');
      return { clients: 0, bookings: 0, financeRecords: 0 };
    }
    const now = Date.now();
    const batchId = payload.batchId || `csv-${now}`;
    const fileName = payload.fileName || '';
    const incomingClients = Array.isArray(payload.clients) ? payload.clients : [];
    const incomingBookings = Array.isArray(payload.bookings) ? payload.bookings : [];
    const incomingFinanceRecords = Array.isArray(payload.financeRecords) ? payload.financeRecords : [];
    const existingClientKeys = new Set(safeClientRecords.map(getImportedClientKey));
    const incomingClientKeys = new Set();
    const importedClients = incomingClients
      .map(client => ({
        ...client,
        id: client.id || buildClientKey(client.name, client.phone),
        source: 'csv-import',
        importedViaCsv: true,
        importBatchId: batchId,
        importFileName: fileName,
        importedAt: client.importedAt || now,
        createdAt: client.createdAt || now,
        updatedAt: now
      }))
      .filter(client => {
        const key = getImportedClientKey(client);
        if (existingClientKeys.has(key) || incomingClientKeys.has(key)) return false;
        incomingClientKeys.add(key);
        return true;
      });
    const importedBookings = incomingBookings.map((booking, index) => ({
      ...booking,
      id: booking.id || `${batchId}-booking-${index + 1}`,
      workspaceSlug: settings.slug || bookingPageSlug,
      workspaceName: settings.brandName || settings.businessName || 'Build A Booking',
      source: 'csv-import',
      importedViaCsv: true,
      importBatchId: batchId,
      importFileName: fileName,
      importedAt: booking.importedAt || now,
      createdAt: booking.createdAt || booking.timestamp || now,
      updatedAt: now,
      timestamp: Number(booking.timestamp || booking.createdAt || now)
    }));
    const importedFinance = incomingFinanceRecords.map((record, index) => ({
      ...record,
      id: record.id || `${batchId}-finance-${index + 1}`,
      source: 'csv-import',
      importedViaCsv: true,
      importBatchId: batchId,
      importFileName: fileName,
      importedAt: record.importedAt || now,
      updatedAtMs: Number(record.updatedAtMs || record.paidAt || record.createdAt || now)
    }));

    if (!importedClients.length && !importedBookings.length && !importedFinance.length) {
      showToast('No new CSV rows to import. Existing matching clients were left untouched.');
      return { clients: 0, bookings: 0, financeRecords: 0 };
    }

    const bookingIds = new Set(importedBookings.map(booking => booking.id));
    setBookingsAndCache(prev => (
      [...importedBookings, ...prev.filter(booking => !bookingIds.has(booking.id))]
        .sort((a, b) => getTimestampValue(b.timestamp || b.updatedAt || b.createdAt) - getTimestampValue(a.timestamp || a.updatedAt || a.createdAt))
    ));
    const nextClients = [...importedClients, ...clientRecords];
    const financeIds = new Set(importedFinance.map(record => record.id));
    const nextFinanceImports = [
      ...importedFinance,
      ...safeFinanceImports.filter(record => !financeIds.has(record.id))
    ];

    try {
      const saveResults = await Promise.all([
        importedClients.length ? saveClients(nextClients, { silent: true }) : Promise.resolve(true),
        importedFinance.length ? saveFinanceImports(nextFinanceImports, { silent: true }) : Promise.resolve(true),
        (isFirebaseConfigured && user && workspaceOwnerId && importedBookings.length)
          ? commitBookingImportRows(importedBookings).then(() => true)
          : Promise.resolve(true)
      ]);
      if (saveResults.some(result => result === false)) {
        throw new Error('One or more CSV save operations failed.');
      }
      const parts = [
        importedClients.length ? `${importedClients.length} client${importedClients.length === 1 ? '' : 's'}` : '',
        importedBookings.length ? `${importedBookings.length} booking${importedBookings.length === 1 ? '' : 's'}` : '',
        importedFinance.length ? `${importedFinance.length} finance row${importedFinance.length === 1 ? '' : 's'}` : ''
      ].filter(Boolean);
      showToast(`Imported ${parts.join(', ')} from CSV.`);
      return { clients: importedClients.length, bookings: importedBookings.length, financeRecords: importedFinance.length };
    } catch (error) {
      console.error('CSV migration import failed', error);
      showToast('CSV import could not be saved.');
      return { clients: 0, bookings: 0, financeRecords: 0 };
    }
  };

  const handleClearCsvMigrationData = async () => {
    if (!canManageWorkspace) {
      showToast('Only owners and admins can delete uploaded data.');
      return { clients: 0, bookings: 0, financeRecords: 0 };
    }
    const importedClientCount = safeClientRecords.filter(client => client.importedViaCsv).length;
    const importedBookingCount = visibleBookings.filter(booking => booking.importedViaCsv).length;
    const importedFinanceCount = safeFinanceImports.filter(record => record.importedViaCsv).length;
    const nextClients = safeClientRecords.filter(client => !client.importedViaCsv);
    const nextFinanceImports = safeFinanceImports.filter(record => !record.importedViaCsv);
    setBookingsAndCache(prev => prev.filter(booking => !booking.importedViaCsv));

    try {
      const saveResults = await Promise.all([
        saveClients(nextClients, { silent: true }),
        saveFinanceImports(nextFinanceImports, { silent: true }),
        (isFirebaseConfigured && user && workspaceOwnerId)
          ? FirebaseSDK.getDocs(FirebaseSDK.query(
            FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'bookings'),
            FirebaseSDK.where('importedViaCsv', '==', true)
          )).then(snapshot => commitBookingDeletes(snapshot.docs)).then(() => true)
          : Promise.resolve(true)
      ]);
      if (saveResults.some(result => result === false)) {
        throw new Error('One or more CSV cleanup operations failed.');
      }
      showToast('Deleted uploaded CSV data. Live records were left alone.');
      return { clients: importedClientCount, bookings: importedBookingCount, financeRecords: importedFinanceCount };
    } catch (error) {
      console.error('CSV migration clear failed', error);
      showToast('Uploaded data could not be fully cleared.');
      return { clients: 0, bookings: 0, financeRecords: 0 };
    }
  };

  return {
    handleClearCsvMigrationData,
    handleCsvMigrationImport
  };
}
