import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const readWebPDimensions = contents => {
  assert.equal(contents.subarray(0, 4).toString(), 'RIFF', 'asset is not RIFF');
  assert.equal(contents.subarray(8, 12).toString(), 'WEBP', 'asset is not WebP');
  let offset = 12;
  while (offset + 8 <= contents.length) {
    const chunkType = contents.subarray(offset, offset + 4).toString();
    const chunkSize = contents.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (chunkType === 'VP8X') {
      return {
        width: contents.readUIntLE(dataOffset + 4, 3) + 1,
        height: contents.readUIntLE(dataOffset + 7, 3) + 1
      };
    }
    if (chunkType === 'VP8 ') {
      return {
        width: contents.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: contents.readUInt16LE(dataOffset + 8) & 0x3fff
      };
    }
    if (chunkType === 'VP8L') {
      const byte1 = contents[dataOffset + 1];
      const byte2 = contents[dataOffset + 2];
      const byte3 = contents[dataOffset + 3];
      const byte4 = contents[dataOffset + 4];
      return {
        width: 1 + (((byte2 & 0x3f) << 8) | byte1),
        height: 1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | ((byte2 & 0xc0) >> 6))
      };
    }
    offset = dataOffset + chunkSize + (chunkSize % 2);
  }
  throw new Error('WebP dimensions not found');
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'spa' });

try {
  const { createWorkspaceExample } = await server.ssrLoadModule('/src/config/workspaceExample.js');
  const example = createWorkspaceExample({ anchorDate: new Date('2026-07-24T12:00:00+02:00') });
  const countBy = (rows, key) => rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
    return counts;
  }, {});
  const clientIds = new Set(example.clientRecords.map(client => client.id));
  const staffIds = new Set(example.staffList.map(staff => staff.id));
  const serviceIds = new Set(example.settings.services.map(service => service.id));
  const bookingIds = new Set(example.bookings.map(booking => booking.id));
  const threadIds = new Set(example.supportThreads.map(thread => thread.id));
  const clientsById = new Map(example.clientRecords.map(client => [client.id, client]));
  const staffById = new Map(example.staffList.map(staff => [staff.id, staff]));
  const portraitPaths = [
    ...example.clientRecords.map(client => client.avatar),
    ...example.staffList.map(staff => staff.photoURL)
  ];
  const portraitHashes = portraitPaths.map(assetPath => {
    const absolutePath = resolve(process.cwd(), 'public', assetPath.replace(/^\//, ''));
    assert.equal(existsSync(absolutePath), true, `missing portrait ${assetPath}`);
    const contents = readFileSync(absolutePath);
    assert.equal(contents.subarray(0, 4).toString(), 'RIFF', `${assetPath} is not WebP`);
    return createHash('sha256').update(contents).digest('hex');
  });
  const businessAssetSpecs = [
    [example.settings.logo, 512, 512],
    [example.settings.bannerImage, 1600, 900],
    ...example.settings.services.map(service => [service.imageUrls[0], 1200, 900]),
    ...example.settings.venuePhotos.map(assetPath => [assetPath, 1600, 1200])
  ];
  const businessAssetHashes = [];
  for (const [assetPath, expectedWidth, expectedHeight] of businessAssetSpecs) {
    const absolutePath = resolve(process.cwd(), 'public', assetPath.replace(/^\//, ''));
    assert.equal(existsSync(absolutePath), true, `missing business image ${assetPath}`);
    const contents = readFileSync(absolutePath);
    assert.equal(contents.subarray(0, 4).toString(), 'RIFF', `${assetPath} is not WebP`);
    const metadata = readWebPDimensions(contents);
    assert.equal(metadata.width, expectedWidth, `${assetPath} width`);
    assert.equal(metadata.height, expectedHeight, `${assetPath} height`);
    businessAssetHashes.push(createHash('sha256').update(contents).digest('hex'));
  }

  assert.equal(example.settings.brandName, 'Flame & Flour');
  assert.equal(example.settings.businessType, 'classes');
  assert.equal(example.settings.serviceIndustry, 'classes');
  assert.equal(example.settings.locationMode, 'my_location');
  assert.equal(example.settings.serviceDisplayStyle, 'rail');
  assert.equal(example.settings.serviceDropdownEnabled, false);
  assert.equal(example.settings.slug, 'your-business');
  assert.equal(example.settings.logo, '/example/flour-and-flame/flame-and-flour-logo-clean.webp');
  assert.equal(example.settings.logoDisplay.size, 176);
  assert.equal(example.settings.bannerImage, '/example/flour-and-flame/hero.webp');
  assert.equal(example.settings.venuePhotos.length, 6);
  assert.equal(example.settings.address, 'Woodstock, Cape Town, South Africa');
  assert.equal(example.clientRecords.length, 12);
  assert.equal(example.staffList.length, 4);
  assert.equal(example.settings.services.length, 5);
  assert.deepEqual(example.settings.services.map(service => ({
    name: service.name,
    price: service.price,
    duration: service.duration
  })), [
    { name: 'Pasta From Scratch', price: 850, duration: 180 },
    { name: 'Artisan Bread Workshop', price: 780, duration: 210 },
    { name: 'French Pastry Foundations', price: 950, duration: 180 },
    { name: 'Cape Malay Cooking', price: 900, duration: 180 },
    { name: 'Private Baking Lesson', price: 1200, duration: 120 }
  ]);
  assert.ok(example.settings.services.every(service => (
    service.locationType === 'business' &&
    service.bookingType === 'class' &&
    service.serviceType === 'class' &&
    service.autoGenerateMeeting === false &&
    service.meetingLink === '' &&
    service.imageUrls.length === 1 &&
    service.imageUrls[0].startsWith('/example/flour-and-flame/services/')
  )));
  assert.equal(businessAssetSpecs.length, 13);
  assert.equal(new Set(businessAssetHashes).size, 13);
  assert.equal(example.gatewayStates.cash.enabled, true);
  assert.equal(example.gatewayStates.cash.configured, true);
  assert.equal(example.bookings.length, 30);
  assert.equal(example.supportThreads.length, 12);
  assert.equal(example.notifications.length, 6);
  assert.equal(clientIds.size, 12);
  assert.equal(staffIds.size, 4);
  assert.equal(serviceIds.size, 5);
  assert.equal(bookingIds.size, 30);
  assert.equal(threadIds.size, 12);
  assert.equal(new Set(example.clientRecords.map(client => client.name)).size, 12);
  assert.equal(new Set(example.clientRecords.map(client => client.email)).size, 12);
  assert.equal(new Set(example.clientRecords.map(client => client.phone)).size, 12);
  assert.equal(new Set(example.clientRecords.map(client => client.avatar)).size, 12);
  assert.equal(new Set(example.staffList.map(staff => staff.name)).size, 4);
  assert.equal(new Set(example.staffList.map(staff => staff.email)).size, 4);
  assert.equal(new Set(example.staffList.map(staff => staff.photoURL)).size, 4);
  assert.equal(new Set(portraitPaths).size, 16);
  assert.equal(new Set(portraitHashes).size, 16);
  assert.deepEqual(countBy(example.bookings, 'status'), {
    completed: 16,
    declined: 2,
    confirmed: 8,
    pending: 3,
    waitlisted: 1
  });
  assert.deepEqual(countBy(example.bookings, 'paymentStatus'), {
    paid: 20,
    manual_pending: 4,
    unpaid: 6
  });
  assert.equal(example.bookings.filter(booking => booking.dateKey < '2026-07-24').length, 18);
  assert.equal(example.bookings.filter(booking => booking.dateKey >= '2026-07-24').length, 12);
  assert.equal(example.bookings.filter(booking => booking.dateKey === '2026-07-24').length, 4);
  assert.ok(example.bookings.every(booking => {
    const client = clientsById.get(booking.clientId);
    const staff = staffById.get(booking.staffId);
    return (
      client &&
      staff &&
      serviceIds.has(booking.serviceId) &&
      booking.clientName === client.name &&
      booking.clientEmail === client.email &&
      booking.clientAvatar === client.avatar &&
      booking.avatar === client.avatar &&
      booking.staffName === staff.name &&
      booking.staffPhotoURL === staff.photoURL
    );
  }));
  assert.deepEqual(
    [...new Set(example.supportThreads.map(thread => thread.clientId))].sort(),
    [...clientIds].sort()
  );
  assert.equal(new Set(example.supportThreads.map(thread => thread.bookingId)).size, 12);
  assert.equal(new Set(example.supportThreads.map(thread => thread.subject)).size, 12);
  assert.equal(new Set(example.supportThreads.map(thread => (
    thread.messages.map(message => message.text).join('|')
  ))).size, 12);
  assert.ok(example.supportThreads.every(thread => {
    const booking = example.bookings.find(record => record.id === thread.bookingId);
    const client = clientsById.get(thread.clientId);
    const staff = staffById.get(thread.staffId);
    return (
      booking &&
      client &&
      staff &&
      booking.clientId === client.id &&
      thread.clientName === client.name &&
      thread.clientEmail === client.email &&
      thread.clientAvatar === client.avatar &&
      thread.clientPhotoURL === client.avatar &&
      thread.staffName === staff.name &&
      thread.staffPhotoURL === staff.photoURL &&
      thread.messages.length === 4 &&
      thread.lastMessage === thread.messages[3].text &&
      thread.messages.every((message, messageIndex) => (
        message.text.trim().length > 0 &&
        message.senderPhotoURL === (messageIndex % 2 === 0 ? client.avatar : staff.photoURL)
      ))
    );
  }));
  assert.equal(example.supportThreads.filter(thread => thread.rescheduleStatus === 'requested').length, 1);
  assert.ok(example.notifications.every(notification => (
    bookingIds.has(notification.bookingId) &&
    threadIds.has(notification.threadId)
  )));
  assert.equal(example.manifest.paidRevenueCents, example.bookings.filter(booking => booking.paymentStatus === 'paid').reduce((sum, booking) => sum + booking.amountInCents, 0));
  assert.equal(example.manifest.pendingRevenueCents, example.bookings.filter(booking => booking.paymentStatus === 'manual_pending').reduce((sum, booking) => sum + booking.amountInCents, 0));
  assert.equal(example.manifest.totalRevenueCents, example.bookings.reduce((sum, booking) => sum + booking.amountInCents, 0));

  console.log('Workspace example invariants passed.');
} finally {
  await server.close();
}
