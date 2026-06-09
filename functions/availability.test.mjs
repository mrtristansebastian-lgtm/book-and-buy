import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { getServiceAvailabilityModel, serviceIsAvailableForDate } = require('./availability.js');

const baseWorkspace = {
  availableTimes: ['09:00', '10:00'],
  publicStaff: [{ id: 'owner', name: 'Owner' }],
  services: [
    { id: 'haircut', name: 'Haircut', duration: '60', staffIds: [] },
    { id: 'colour', name: 'Colour', duration: '60', staffIds: [] }
  ],
  staffCalendars: {
    owner: { availableTimes: ['09:00', '10:00'] }
  },
  availabilityRules: {
    enabled: true,
    staffAssignmentMode: 'auto',
    holdMode: 'pending_confirmed',
    fallbackDurationMinutes: 60
  }
};

test('service availability periods allow existing availability when no period matches', () => {
  const model = getServiceAvailabilityModel({
    workspace: baseWorkspace,
    dateKey: '2026-06-08',
    incoming: { serviceId: 'haircut' }
  });

  assert.deepEqual(model.timeOptions, ['09:00', '10:00']);
  assert.equal(model.unavailableReason, '');
});

test('service availability periods hide services outside the selected period service set', () => {
  const workspace = {
    ...baseWorkspace,
    serviceAvailabilityPeriods: [{
      id: 'winter-special',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      serviceIds: ['colour'],
      active: true
    }]
  };

  assert.equal(serviceIsAvailableForDate({ workspace, serviceId: 'colour', dateKey: '2026-06-08' }), true);
  assert.equal(serviceIsAvailableForDate({ workspace, serviceId: 'haircut', dateKey: '2026-06-08' }), false);

  const model = getServiceAvailabilityModel({
    workspace,
    dateKey: '2026-06-08',
    incoming: { serviceId: 'haircut' }
  });

  assert.deepEqual(model.timeOptions, []);
  assert.equal(model.unavailableReason, 'Service not available for this period');
});
