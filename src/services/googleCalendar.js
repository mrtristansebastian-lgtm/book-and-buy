export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const padNumber = (value) => String(value).padStart(2, '0');

const normalizeTime = (time = '') => {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${padNumber(Math.min(23, Number(match[1])))}:${padNumber(Math.min(59, Number(match[2])))}`;
};

const addMinutesToLocalDateTime = (dateKey, time, minutes) => {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return '';
  const date = new Date(year, month - 1, day, hour, minute + minutes, 0, 0);
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:00`;
};

const getRuntimeTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const canSyncBookingToGoogleCalendar = (booking = {}) => (
  Boolean(
    booking.id &&
    !booking.isExample &&
    booking.status === 'confirmed' &&
    booking.dateKey &&
    normalizeTime(booking.time) &&
    booking.time !== 'Waitlist' &&
    !booking.googleCalendarEventId
  )
);

export const buildGoogleCalendarEvent = ({ booking, settings = {}, staff = null, durationMinutes = 60 }) => {
  const timeZone = settings.timeZone || getRuntimeTimeZone();
  const normalizedTime = normalizeTime(booking.time);
  const startDateTime = `${booking.dateKey}T${normalizedTime}:00`;
  const endDateTime = addMinutesToLocalDateTime(booking.dateKey, normalizedTime, durationMinutes);
  const businessName = settings.brandName || booking.workspaceName || 'Build A Booking';
  const clientName = booking.clientName || 'Client';
  const details = [
    `Build A Booking confirmed appointment`,
    `Business: ${businessName}`,
    `Client: ${clientName}`,
    booking.clientPhone ? `Phone: ${booking.clientPhone}` : '',
    booking.clientEmail ? `Email: ${booking.clientEmail}` : '',
    staff?.name ? `Staff: ${staff.name}` : booking.staffName ? `Staff: ${booking.staffName}` : '',
    booking.clientNote ? `Note: ${booking.clientNote}` : ''
  ].filter(Boolean).join('\n');

  return {
    summary: `${businessName}: ${clientName}`,
    description: details,
    start: {
      dateTime: startDateTime,
      timeZone
    },
    end: {
      dateTime: endDateTime || startDateTime,
      timeZone
    },
    reminders: {
      useDefault: true
    },
    extendedProperties: {
      private: {
        buildABookingId: booking.id,
        buildABookingWorkspace: settings.slug || booking.workspaceSlug || ''
      }
    }
  };
};

export const insertGoogleCalendarEvent = async ({ accessToken, event }) => {
  if (!accessToken) throw new Error('Google Calendar is not connected yet.');
  const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?sendUpdates=none`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Google Calendar rejected the sync request.';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const syncConfirmedBookingsToGoogleCalendar = async ({
  accessToken,
  bookings = [],
  settings = {},
  staffList = [],
  calendarId = 'workspace',
  durationMinutes = 60
}) => {
  const filteredBookings = bookings.filter((booking) => {
    if (!canSyncBookingToGoogleCalendar(booking)) return false;
    if (calendarId === 'workspace' || calendarId === 'all-staff') return true;
    return booking.staffId === calendarId;
  });
  const results = [];

  for (const booking of filteredBookings) {
    const staff = booking.staffId ? staffList.find((member) => member.id === booking.staffId) : null;
    const event = buildGoogleCalendarEvent({ booking, settings, staff, durationMinutes });
    const googleEvent = await insertGoogleCalendarEvent({ accessToken, event });
    results.push({
      bookingId: booking.id,
      eventId: googleEvent.id,
      htmlLink: googleEvent.htmlLink || '',
      syncedAt: Date.now()
    });
  }

  return {
    scanned: bookings.length,
    created: results.length,
    results
  };
};
