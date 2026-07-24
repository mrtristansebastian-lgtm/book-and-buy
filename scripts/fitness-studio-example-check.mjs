import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
try {
  const { createFitnessStudioExample } = await server.ssrLoadModule('/src/config/fitnessStudioExample.js');
  const example = createFitnessStudioExample({ anchorDate: new Date('2026-07-24T00:00:00Z') });
  const countBy = (rows, key) => rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
    return counts;
  }, {});
  const statusCounts = countBy(example.bookings, 'status');
  const paymentCounts = countBy(example.bookings, 'paymentStatus');
  const serviceCounts = countBy(example.bookings, 'serviceName');
  const countryCounts = countBy(example.clientRecords, 'country');
  const clientIds = new Set(example.clientRecords.map(client => client.id));
  const staffIds = new Set(example.staffList.map(staff => staff.id));
  const bookingIds = new Set(example.bookings.map(booking => booking.id));
  const staffSlots = new Set();

  assert.equal(example.clientRecords.length, 200);
  assert.equal(example.bookings.length, 700);
  assert.equal(example.settings.services.length, 8);
  assert.ok(example.settings.services.every(service => service.imageUrls?.every(path => existsSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))))));
  assert.ok(example.settings.venuePhotos.every(path => existsSync(resolve(process.cwd(), 'public', path.replace(/^\//, '')))));
  assert.equal(Object.keys(serviceCounts).length, 8);
  assert.ok(Object.values(serviceCounts).every(count => count > 0));
  assert.equal(example.bookings.filter(booking => booking.dateKey < '2026-07-24').length, 620);
  assert.equal(example.bookings.filter(booking => booking.dateKey >= '2026-07-24').length, 80);
  assert.deepEqual(statusCounts, { completed: 590, declined: 30, confirmed: 60, pending: 14, waitlisted: 6 });
  assert.deepEqual(paymentCounts, { paid: 608, manual_pending: 40, unpaid: 52 });
  assert.deepEqual(countryCounts, {
    'South Africa': 140, 'United Kingdom': 12, Germany: 8, Netherlands: 7, France: 7,
    'United States': 6, Australia: 5, Nigeria: 5, Kenya: 4, 'United Arab Emirates': 3, Brazil: 3
  });
  assert.equal(example.clientRecords.reduce((total, client) => total + client.bookingCount, 0), 700);
  assert.equal(example.manifest.paidRevenueCents, 24904000);
  assert.equal(example.manifest.pendingRevenueCents, 1667000);
  assert.equal(example.manifest.totalRevenueCents, 28675000);
  assert.ok(example.bookings.every(booking => clientIds.has(booking.clientId) && staffIds.has(booking.staffId)));
  assert.equal(example.supportThreads.length, 20);
  assert.ok(example.supportThreads.every(thread => bookingIds.has(thread.bookingId) && clientIds.has(thread.clientId)));
  assert.ok(example.supportThreads.every(thread => thread.messages.length >= 4 && thread.messages.every(message => message.text && message.senderRole)));
  assert.equal(example.supportThreads.filter(thread => thread.rescheduleStatus === 'requested').length, 4);

  for (const booking of example.bookings) {
    const slot = `${booking.staffId}|${booking.dateKey}|${booking.time}`;
    assert.equal(staffSlots.has(slot), false, `staff double-booked at ${slot}`);
    staffSlots.add(slot);
  }

  console.log('Fitness studio example invariants passed.');
} finally {
  await server.close();
}
