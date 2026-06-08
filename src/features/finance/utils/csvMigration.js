import { cardGatewayIds, gatewayById } from '../config/gatewayConfig';
import { normalizeCsvGateway, normalizeCsvPaymentStatus } from './financeRecordNormalizers';

const migrationColumnAliases = {
  clientName: ['client name', 'customer name', 'customer', 'name', 'full name', 'member name'],
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  email: ['email', 'email address', 'customer email', 'client email'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'client phone'],
  birthday: ['birthday', 'birth date', 'date of birth', 'dob'],
  notes: ['notes', 'client notes', 'memo', 'comments'],
  tags: ['tags', 'labels', 'segment'],
  serviceName: ['service', 'service name', 'class', 'class name', 'appointment type', 'product'],
  serviceCategory: ['category', 'service category', 'class category'],
  serviceDuration: ['duration', 'service duration', 'minutes', 'length'],
  bookingDate: ['booking date', 'appointment date', 'date', 'session date', 'class date', 'scheduled date'],
  bookingTime: ['booking time', 'appointment time', 'time', 'session time', 'start time'],
  bookingStatus: ['booking status', 'appointment status', 'status'],
  bookingId: ['booking id', 'appointment id', 'reservation id', 'order id', 'reference'],
  staffName: ['staff', 'coach', 'trainer', 'instructor', 'specialist'],
  amount: ['amount', 'total', 'price', 'paid', 'payment amount', 'transaction amount', 'gross amount', 'amount paid'],
  amountInCents: ['amount in cents', 'amount_in_cents', 'total cents', 'price cents'],
  currency: ['currency', 'currency code'],
  paymentStatus: ['payment status', 'transaction status', 'paid status', 'finance status'],
  paymentMethod: ['payment method', 'method', 'gateway', 'payment gateway', 'processor'],
  paymentReference: ['payment reference', 'transaction id', 'transaction reference', 'receipt id', 'invoice id', 'payment id'],
  paidAt: ['paid at', 'payment date', 'transaction date', 'settled date', 'updated at'],
  description: ['description', 'transaction description', 'item', 'line item']
};

export const migrationGuideOptions = [
  {
    id: 'clients',
    title: 'Client list',
    eyebrow: 'Contacts only',
    description: 'Best for a clean list of clients or members with no appointment or payment history.',
    scopes: { clients: true, bookings: false, finance: false },
    requiredColumns: ['client name or first name', 'email or phone'],
    recommendedColumns: ['birthday', 'notes', 'tags'],
    csvColumns: ['client name', 'email', 'phone', 'notes', 'tags'],
    sampleRow: ['Maya Chen', 'maya@example.com', '+65 8123 4567', 'Prefers mornings', 'VIP'],
    outcome: 'Creates saved client profiles only. No bookings or finance rows are created.'
  },
  {
    id: 'bookings',
    title: 'Booking history',
    eyebrow: 'Sessions + clients',
    description: 'Best for appointments, classes, consultations, or booking exports that include dates and times.',
    scopes: { clients: true, bookings: true, finance: false },
    requiredColumns: ['client name', 'booking date', 'service'],
    recommendedColumns: ['booking time', 'booking status', 'staff', 'booking id'],
    csvColumns: ['client name', 'email', 'service', 'booking date', 'booking time', 'booking status', 'staff'],
    sampleRow: ['Maya Chen', 'maya@example.com', 'Jump Start Assessment', '2026-05-20', '09:00', 'confirmed', 'Ari'],
    outcome: 'Adds booking records and naturally builds the client directory from those bookings.'
  },
  {
    id: 'finance',
    title: 'Finance history',
    eyebrow: 'Transactions only',
    description: 'Best for payment processor exports, bank payment logs, invoices, or transaction history.',
    scopes: { clients: false, bookings: false, finance: true },
    requiredColumns: ['amount', 'payment status or paid at'],
    recommendedColumns: ['client name', 'email', 'currency', 'payment method', 'payment reference'],
    csvColumns: ['client name', 'email', 'amount', 'currency', 'payment status', 'payment method', 'payment reference', 'paid at'],
    sampleRow: ['Maya Chen', 'maya@example.com', '35', 'USD', 'paid', 'stripe', 'txn_001', '2026-05-20'],
    outcome: 'Feeds revenue, pending payments, the finance graph, and the transaction desk.'
  },
  {
    id: 'mixed',
    title: 'All-in-one export',
    eyebrow: 'Full migration',
    description: 'Best when one CSV contains clients, dated bookings, and payment details in the same rows.',
    scopes: { clients: true, bookings: true, finance: true },
    requiredColumns: ['client name', 'booking date or payment date', 'service or amount'],
    recommendedColumns: ['email', 'phone', 'booking time', 'amount', 'payment status', 'payment reference'],
    csvColumns: ['client name', 'email', 'phone', 'service', 'booking date', 'booking time', 'amount', 'currency', 'payment status', 'payment method'],
    sampleRow: ['Maya Chen', 'maya@example.com', '+65 8123 4567', 'HIIT Class', '2026-05-20', '09:00', '35', 'USD', 'paid', 'stripe'],
    outcome: 'Creates every supported record type, while skipping anything the CSV does not prove.'
  }
];

export const migrationGuideById = migrationGuideOptions.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});

export const buildGuideScopeSelection = (guideId, detectedScopes = {}) => {
  const guideScopes = migrationGuideById[guideId]?.scopes || migrationGuideById.mixed.scopes;
  if (guideId === 'mixed') {
    return {
      clients: Boolean(detectedScopes.clients || guideScopes.clients),
      bookings: Boolean(detectedScopes.bookings || guideScopes.bookings),
      finance: Boolean(detectedScopes.finance || guideScopes.finance)
    };
  }
  return {
    clients: Boolean(guideScopes.clients),
    bookings: Boolean(guideScopes.bookings),
    finance: Boolean(guideScopes.finance)
  };
};

const normalizeCsvColumn = (value = '') => String(value)
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '');

const csvAliasKeys = Object.fromEntries(
  Object.entries(migrationColumnAliases).map(([key, aliases]) => [
    key,
    aliases.map(normalizeCsvColumn)
  ])
);

export const parseCsvText = (text = '') => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell);
  rows.push(row);

  const cleanRows = rows
    .map((cells) => cells.map((value) => String(value ?? '').trim()))
    .filter((cells) => cells.some(Boolean));

  if (cleanRows.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.');
  }

  const headers = cleanRows[0].map((header, index) => header || `Column ${index + 1}`);
  const normalizedHeaders = headers.map(normalizeCsvColumn);
  const dataRows = cleanRows.slice(1)
    .map((cells, rowIndex) => {
      const values = {};
      headers.forEach((header, index) => {
        const key = normalizedHeaders[index];
        if (!key || Object.prototype.hasOwnProperty.call(values, key)) return;
        values[key] = String(cells[index] ?? '').trim();
      });
      return { index: rowIndex, values };
    })
    .filter((item) => Object.values(item.values).some(Boolean));

  if (!dataRows.length) {
    throw new Error('No usable rows were found after the header.');
  }

  return { headers, normalizedHeaders, rows: dataRows };
};

const hasCsvColumns = (parsedCsv, fields = []) => fields.some((field) => {
  const aliases = csvAliasKeys[field] || [];
  return parsedCsv.normalizedHeaders.some((header) => aliases.includes(header));
});

export const detectCsvScopes = (parsedCsv) => ({
  clients: hasCsvColumns(parsedCsv, ['clientName', 'firstName', 'lastName', 'email', 'phone', 'birthday', 'notes', 'tags']),
  bookings: hasCsvColumns(parsedCsv, ['serviceName', 'bookingDate', 'bookingTime', 'bookingStatus', 'bookingId', 'staffName']),
  finance: hasCsvColumns(parsedCsv, ['amount', 'amountInCents', 'currency', 'paymentStatus', 'paymentMethod', 'paymentReference', 'paidAt'])
});

const pickCsvField = (row, field) => {
  const aliases = csvAliasKeys[field] || [];
  for (const key of aliases) {
    const value = row.values[key];
    if (String(value || '').trim()) return { key, value: String(value).trim() };
  }
  return { key: '', value: '' };
};

const slugifyImportValue = (value = 'item') => String(value || 'item')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'item';

const buildImportedClientId = ({ name = '', email = '', phone = '' }) => {
  const emailKey = String(email || '').trim().toLowerCase();
  const phoneKey = String(phone || '').replace(/\D/g, '');
  if (emailKey) return `email-${emailKey.replace(/[^a-z0-9]+/g, '-')}`;
  if (phoneKey) return `phone-${phoneKey}`;
  return `name-${slugifyImportValue(name || 'client')}`;
};

const parseCsvMoneyToCents = (field = {}) => {
  if (!field.value) return 0;
  const raw = String(field.value || '').trim();
  const numeric = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) return 0;
  const key = String(field.key || '').toLowerCase();
  if (key.includes('cents')) return Math.max(0, Math.round(parsed));
  return Math.max(0, Math.round(parsed * 100));
};

const parseCsvDate = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return null;
  const iso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const splitDate = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (splitDate) {
    const first = Number(splitDate[1]);
    const second = Number(splitDate[2]);
    const year = Number(splitDate[3].length === 2 ? `20${splitDate[3]}` : splitDate[3]);
    const month = second > 12 ? first : second;
    const day = second > 12 ? second : first;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = Date.parse(clean);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const applyCsvTime = (date, value = '') => {
  if (!date) return null;
  const next = new Date(date);
  const clean = String(value || '').trim();
  if (!clean) return next;
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return next;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridian = String(match[3] || '').toLowerCase();
  if (meridian === 'pm' && hours < 12) hours += 12;
  if (meridian === 'am' && hours === 12) hours = 0;
  next.setHours(hours, minutes, 0, 0);
  return next;
};

const formatCsvDateKey = (date) => {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const formatCsvBookingDate = (date) => (
  date
    ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''
);

const normalizeCsvBookingStatus = (value = '') => {
  const clean = String(value || '').trim().toLowerCase();
  if (clean.includes('cancel')) return 'cancelled';
  if (clean.includes('declin')) return 'declined';
  if (clean.includes('wait')) return 'waitlist';
  if (clean.includes('pending') || clean.includes('request')) return 'pending';
  if (clean.includes('complete')) return 'completed';
  return 'confirmed';
};

const extractCsvClient = (row) => {
  const firstName = pickCsvField(row, 'firstName').value;
  const lastName = pickCsvField(row, 'lastName').value;
  const email = pickCsvField(row, 'email').value;
  const phone = pickCsvField(row, 'phone').value;
  const explicitName = pickCsvField(row, 'clientName').value;
  const name = explicitName || [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0] || '';
  return {
    name: name.trim(),
    email,
    phone,
    birthday: pickCsvField(row, 'birthday').value,
    notes: pickCsvField(row, 'notes').value,
    tags: pickCsvField(row, 'tags').value
  };
};

export const buildCsvMigrationPayload = (parsedCsv, selectedScopes, displayCurrency, batchId) => {
  if (!parsedCsv) return { clients: [], bookings: [], financeRecords: [], skippedRows: 0, total: 0 };
  const clients = new Map();
  const bookings = [];
  const financeRecords = [];
  let skippedRows = 0;
  const importedAt = Date.now();

  parsedCsv.rows.forEach((row) => {
    const rowNumber = row.index + 2;
    const client = extractCsvClient(row);
    const hasClient = Boolean(client.name || client.email || client.phone);
    const clientId = hasClient ? buildImportedClientId(client) : '';
    const serviceName = pickCsvField(row, 'serviceName').value;
    const serviceCategory = pickCsvField(row, 'serviceCategory').value;
    const serviceDuration = pickCsvField(row, 'serviceDuration').value;
    const bookingDate = parseCsvDate(pickCsvField(row, 'bookingDate').value);
    const bookingTime = pickCsvField(row, 'bookingTime').value;
    const bookingDateTime = applyCsvTime(bookingDate, bookingTime);
    const bookingId = pickCsvField(row, 'bookingId').value;
    const amountField = pickCsvField(row, 'amountInCents').value
      ? pickCsvField(row, 'amountInCents')
      : pickCsvField(row, 'amount');
    const amountInCents = parseCsvMoneyToCents(amountField);
    const currency = (pickCsvField(row, 'currency').value || displayCurrency || 'ZAR').toUpperCase();
    const paymentStatus = normalizeCsvPaymentStatus(pickCsvField(row, 'paymentStatus').value, amountInCents);
    const gatewayType = normalizeCsvGateway(pickCsvField(row, 'paymentMethod').value);
    const paymentReference = pickCsvField(row, 'paymentReference').value || bookingId;
    const paidDate = parseCsvDate(pickCsvField(row, 'paidAt').value);
    const paidDateTime = applyCsvTime(paidDate, bookingTime);
    const description = pickCsvField(row, 'description').value || serviceName || 'Imported transaction';
    const rowHasBooking = Boolean((bookingDate || bookingTime || serviceName || bookingId) && hasClient);
    const rowHasFinance = Boolean(amountInCents || (paymentReference && (paidDate || pickCsvField(row, 'paymentStatus').value)));
    let createdSomething = false;
    let createdBooking = null;

    if (selectedScopes.clients && hasClient) {
      const labels = client.tags
        ? client.tags.split(/[|;,]/).map((tag) => tag.trim()).filter(Boolean)
        : [];
      clients.set(clientId, {
        id: clientId,
        name: client.name || 'Imported Client',
        phone: client.phone || '',
        email: client.email || '',
        birthday: client.birthday || '',
        notes: client.notes || '',
        avatar: '',
        labels: Array.from(new Set(['Imported', ...labels])),
        source: 'csv-import',
        importedViaCsv: true,
        importBatchId: batchId,
        importedAt,
        createdAt: importedAt,
        updatedAt: importedAt
      });
      createdSomething = true;
    }

    if (selectedScopes.bookings && rowHasBooking) {
      const id = bookingId
        ? `csv-booking-${slugifyImportValue(bookingId)}`
        : `${batchId}-booking-${rowNumber}`;
      const timestamp = bookingDateTime?.getTime() || paidDateTime?.getTime() || importedAt;
      createdBooking = {
        id,
        clientName: client.name || 'Imported Client',
        clientPhone: client.phone || '',
        clientEmail: client.email || '',
        clientBirthday: client.birthday || '',
        clientNote: client.notes || '',
        clientEmailOptIn: Boolean(client.email),
        serviceId: '',
        serviceName: serviceName || description || 'Imported booking',
        serviceDescription: '',
        servicePrice: amountInCents ? String(amountInCents / 100) : '',
        servicePriceType: 'fixed',
        serviceDuration,
        serviceCategory,
        amountInCents,
        amountPaidInCents: paymentStatus === 'paid' ? amountInCents : 0,
        currency,
        paymentMethod: gatewayType,
        paymentGateway: cardGatewayIds.has(gatewayType) ? gatewayType : '',
        paymentProviderName: gatewayById[gatewayType]?.name || gatewayType.replace(/_/g, ' '),
        paymentStatus,
        paymentReference,
        paidAt: paymentStatus === 'paid' ? (paidDateTime?.getTime() || timestamp) : null,
        notificationChannels: { email: false, portal: false },
        date: formatCsvBookingDate(bookingDate),
        dateKey: formatCsvDateKey(bookingDate),
        time: bookingTime || '',
        status: normalizeCsvBookingStatus(pickCsvField(row, 'bookingStatus').value),
        staffName: pickCsvField(row, 'staffName').value,
        noShowHistory: false,
        source: 'csv-import',
        importedViaCsv: true,
        importBatchId: batchId,
        importedAt,
        createdAt: timestamp,
        updatedAt: importedAt,
        timestamp
      };
      bookings.push(createdBooking);
      createdSomething = true;
    }

    if (selectedScopes.finance && rowHasFinance && !createdBooking) {
      const financeId = paymentReference
        ? `csv-finance-${slugifyImportValue(paymentReference)}`
        : `${batchId}-finance-${rowNumber}`;
      const updatedAtMs = paidDateTime?.getTime() || bookingDateTime?.getTime() || importedAt;
      financeRecords.push({
        id: financeId,
        gatewayType,
        status: paymentStatus,
        amountInCents,
        currency,
        customerName: client.name || 'Imported Client',
        customerEmail: client.email || '',
        description,
        bookingId: bookingId || paymentReference || '',
        providerReference: paymentReference || '',
        updatedAtMs,
        importedViaCsv: true,
        importBatchId: batchId,
        importedAt,
        source: 'csv-import'
      });
      createdSomething = true;
    }

    if (!createdSomething) skippedRows += 1;
  });

  return {
    clients: Array.from(clients.values()),
    bookings,
    financeRecords,
    skippedRows,
    total: clients.size + bookings.length + financeRecords.length
  };
};
