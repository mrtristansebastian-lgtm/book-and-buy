import { useEffect, useMemo, useState } from 'react';
import { Star, User, Users } from 'lucide-react';
import { buildClientKey } from '../utils/clientKeys';

const clientLabelOptions = ['VIP', 'Needs Follow-up', 'Prefers Chat', 'High Value', 'No-show Risk'];

export function useClientDirectory({ safeClientRecords, visibleBookings }) {
  const [clientSearch, setClientSearch] = useState('');
  const [clientDeskFilter, setClientDeskFilter] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientNoteDraft, setClientNoteDraft] = useState('');
  const [clientMobileView, setClientMobileView] = useState('directory');

  const bookingClients = useMemo(() => {
    const clients = new Map();
    visibleBookings.forEach(booking => {
      const id = buildClientKey(booking.clientName, booking.clientPhone);
      const existing = clients.get(id) || {
        id,
        name: booking.clientName || 'Unnamed Client',
        phone: booking.clientPhone || '',
        email: booking.clientEmail || '',
        birthday: booking.clientBirthday || '',
        notes: booking.clientNote || '',
        source: 'booking',
        bookings: []
      };
      existing.name = existing.name || booking.clientName || 'Unnamed Client';
      existing.phone = existing.phone || booking.clientPhone || '';
      existing.email = existing.email || booking.clientEmail || '';
      existing.birthday = existing.birthday || booking.clientBirthday || '';
      existing.notes = existing.notes || booking.clientNote || '';
      existing.bookings.push(booking);
      clients.set(id, existing);
    });

    return Array.from(clients.values()).map(client => {
      const history = [...client.bookings].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const bookingCount = history.length;
      const autoLabels = [];
      if (bookingCount >= 3) autoLabels.push('Regular');
      else if (bookingCount === 2) autoLabels.push('Returning');
      else if (bookingCount === 1) autoLabels.push('First Time');
      if (history.some(booking => booking.noShowHistory)) autoLabels.push('No-show Risk');
      if (history.some(booking => booking.status === 'waitlist')) autoLabels.push('Waitlist');

      return {
        ...client,
        email: client.email || history[0]?.clientEmail || '',
        birthday: client.birthday || history[0]?.clientBirthday || '',
        notes: client.notes || history.find(booking => booking.clientNote)?.clientNote || '',
        bookings: history,
        bookingCount,
        lastBooking: history[0] || null,
        autoLabels
      };
    });
  }, [visibleBookings]);

  const clientDirectory = useMemo(() => {
    const clients = new Map(bookingClients.map(client => [client.id, client]));

    safeClientRecords.forEach(record => {
      const id = record.id || buildClientKey(record.name, record.phone);
      const bookingProfile = clients.get(id);
      clients.set(id, {
        ...(bookingProfile || {}),
        ...record,
        id,
        name: record.name || bookingProfile?.name || 'Unnamed Client',
        phone: record.phone || bookingProfile?.phone || '',
        email: record.email || bookingProfile?.email || '',
        birthday: record.birthday || bookingProfile?.birthday || '',
        notes: record.notes || bookingProfile?.notes || '',
        avatar: record.avatar || '',
        labels: record.labels || [],
        bookings: bookingProfile?.bookings || [],
        bookingCount: bookingProfile?.bookingCount || 0,
        lastBooking: bookingProfile?.lastBooking || null,
        autoLabels: bookingProfile?.autoLabels?.length ? bookingProfile.autoLabels : ['Manual'],
        source: bookingProfile?.source || record.source || 'manual',
        createdAt: record.createdAt || bookingProfile?.lastBooking?.timestamp || Date.now(),
        updatedAt: record.updatedAt || record.createdAt || bookingProfile?.lastBooking?.timestamp || Date.now()
      });
    });

    return Array.from(clients.values()).sort((a, b) => (
      (b.lastBooking?.timestamp || b.updatedAt || b.createdAt || 0) -
      (a.lastBooking?.timestamp || a.updatedAt || a.createdAt || 0)
    ));
  }, [bookingClients, safeClientRecords]);

  const clientMetrics = useMemo(() => ({
    total: clientDirectory.length,
    regulars: clientDirectory.filter(client => client.autoLabels?.includes('Regular') || client.labels?.includes('VIP')).length,
    firstTimers: clientDirectory.filter(client => client.autoLabels?.includes('First Time')).length,
    enriched: clientDirectory.filter(client => client.notes || client.avatar || client.labels?.length).length
  }), [clientDirectory]);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clientDirectory;
    return clientDirectory.filter(client => (
      [
        client.name,
        client.phone,
        client.email,
        ...(client.labels || []),
        ...(client.autoLabels || [])
      ].join(' ').toLowerCase().includes(query)
    ));
  }, [clientDirectory, clientSearch]);

  const filteredClientDirectory = useMemo(() => {
    if (clientDeskFilter === 'regulars') {
      return filteredClients.filter(client => (
        client.autoLabels?.includes('Regular') || client.labels?.includes('VIP') || client.labels?.includes('Regular')
      ));
    }
    if (clientDeskFilter === 'first-time') {
      return filteredClients.filter(client => client.autoLabels?.includes('First Time'));
    }
    return filteredClients;
  }, [clientDeskFilter, filteredClients]);

  const clientDeskFilters = useMemo(() => ([
    { id: 'all', label: 'All', count: clientDirectory.length, icon: Users },
    { id: 'regulars', label: 'Regulars', count: clientMetrics.regulars, icon: Star },
    { id: 'first-time', label: 'First Time', count: clientMetrics.firstTimers, icon: User }
  ]), [clientDirectory.length, clientMetrics.firstTimers, clientMetrics.regulars]);

  const selectedClient = useMemo(() => (
    clientDirectory.find(client => client.id === selectedClientId) || null
  ), [clientDirectory, selectedClientId]);

  const clientProfileByKey = useMemo(() => (
    new Map(clientDirectory.map(client => [client.id, client]))
  ), [clientDirectory]);

  const getBookingClientProfile = (booking = {}) => (
    clientProfileByKey.get(buildClientKey(booking.clientName, booking.clientPhone)) || null
  );

  const getBookingClientAvatar = (booking = {}) => (
    booking.clientPhotoURL ||
    booking.clientAvatar ||
    booking.avatar ||
    getBookingClientProfile(booking)?.avatar ||
    ''
  );

  useEffect(() => {
    if (clientDeskFilter === 'enriched') {
      setClientDeskFilter('all');
    }
  }, [clientDeskFilter]);

  useEffect(() => {
    if (!clientDirectory.length) {
      if (selectedClientId) setSelectedClientId(null);
      return;
    }
    if (selectedClientId && !clientDirectory.some(client => client.id === selectedClientId)) {
      setSelectedClientId(null);
      setClientMobileView('directory');
    }
  }, [clientDirectory, selectedClientId]);

  useEffect(() => {
    setClientNoteDraft(selectedClient?.notes || '');
  }, [selectedClient?.id]);

  return {
    activeClient: selectedClient,
    buildClientKey,
    clientDeskFilter,
    clientDeskFilters,
    clientDirectory,
    clientLabelOptions,
    clientMetrics,
    clientMobileView,
    clientNoteDraft,
    clientSearch,
    displayClients: filteredClientDirectory,
    filteredClientDirectory,
    getBookingClientAvatar,
    getBookingClientProfile,
    selectedClient,
    selectedClientId,
    setClientDeskFilter,
    setClientMobileView,
    setClientNoteDraft,
    setClientSearch,
    setSelectedClientId
  };
}
