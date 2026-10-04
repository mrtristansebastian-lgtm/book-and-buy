import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebase } from '../../../shared/firebase/client';
import { APP_ID } from '../../../config/appConfig';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { formatBookingWindow, staffInitials, staffPhoto } from '../pages/schedulePageUtils';
import { BOOKING_LIST_FILTERS, groupStaffBookings, pendingDemoRescheduleIds } from '../utils/staffBookingList';

export function StaffBookingList({ day, staffId = '' }) {
  const { workspace, bookings = [], staff = [] } = useWorkspace();
  const [filter, setFilter] = useState('');
  const [remotePending, setRemotePending] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setRemotePending([]); setError('');
    if (workspace.isDemo) return undefined;
    const firebase = getFirebase();
    if (!firebase || !workspace.ownerId) return undefined;
    return onSnapshot(query(collection(firebase.db, 'artifacts', APP_ID, 'users', workspace.ownerId, 'rescheduleProposals'), where('status', '==', 'pending'), limit(200)), snap => { setRemotePending(snap.docs.map(d => d.data().bookingId || d.id)); setError(''); }, () => setError('Reschedule requests could not load. Try reconnecting.'));
  }, [workspace.isDemo, workspace.ownerId]);
  const pendingIds = useMemo(() => workspace.isDemo ? pendingDemoRescheduleIds(workspace.threads) : new Set(remotePending), [workspace.isDemo, workspace.threads, remotePending]);
  const options = { day, staffId, pendingIds };
  const groups = groupStaffBookings(bookings, staff, { ...options, filter });
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return <section className="bb-schedule-booking-list" aria-label="Bookings by staff">
    <header><div><p className="bb-schedule-booking-eyebrow">BOOKINGS BY STAFF</p><h2>Your day, in detail.</h2><p><CalendarDays size={14} />{formatDisplayDate(day)}<span>· {total} booking{total === 1 ? '' : 's'}</span></p></div></header>
    <div className="bb-schedule-booking-filters" role="group" aria-label="Booking status filters">{BOOKING_LIST_FILTERS.map(item => { const count = groupStaffBookings(bookings, staff, {...options, filter:item.id}).reduce((sum,g)=>sum+g.items.length,0); return <FilterChip key={item.id} selected={filter === item.id} count={count} onClick={() => setFilter(current => current === item.id ? '' : item.id)}>{item.label}</FilterChip>; })}</div>
    {error ? <p role="alert">{error}</p> : null}
    {groups.length ? groups.map(group => <div className="bb-schedule-booking-group" key={group.id}><div className="bb-schedule-booking-staff"><span className="bb-schedule-resource-avatar" style={{'--staff-color':group.member.color || '#101828'}}>{staffPhoto(group.member) ? <img src={staffPhoto(group.member)} alt="" /> : staffInitials(group.member.name)}</span><strong>{group.member.name}</strong><span>{group.items.length}</span></div>
      {group.items.map(booking => <article className="bb-schedule-booking-row" key={booking.id}><div className="bb-schedule-booking-client"><strong>{booking.clientName || 'Client'}</strong><span>{booking.serviceName || 'Booking'}</span></div><div className="bb-schedule-booking-time"><Clock size={15} /><span>{formatBookingWindow(booking)}</span></div><div className="bb-schedule-booking-status"><StatusBadge status={booking.status} label={BOOKING_LIST_FILTERS.find(f=>f.id===booking.status)?.label || booking.status} />{pendingIds.has(booking.id) ? <StatusBadge status="reschedule-requested" label="Reschedule requested" /> : null}</div><Button action="view" variant="secondary" onClick={() => navigate('/dashboard/requests')} aria-label={`View booking for ${booking.clientName || 'client'}`}>View</Button></article>)}
    </div>) : <div className="bb-schedule-booking-empty"><CalendarDays size={24} /><strong>No {filter ? BOOKING_LIST_FILTERS.find(f=>f.id===filter)?.label.toLowerCase() : ''} bookings for this day</strong><p>Select another date or clear the active filter to see more bookings.</p>{filter ? <Button action="clear" variant="secondary" onClick={() => setFilter('')}>Clear filter</Button> : null}</div>}
  </section>;
}
