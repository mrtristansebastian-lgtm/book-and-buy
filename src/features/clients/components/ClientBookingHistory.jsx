import { Briefcase, History } from 'lucide-react';
import { summarizeService } from '../../../utils/services';

export const ClientBookingHistory = ({
  activeClient,
  getBookingService,
  isExampleClient,
  safeStaffList
}) => (
  <section className="saas-card overflow-hidden">
    <div className="p-5 md:p-6 border-b border-neutral-100 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-black">Booking History</h3>
        <p className="text-sm text-neutral-500">Past and upcoming records linked to this client.</p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-md">{isExampleClient ? 'Example' : `${activeClient.bookingCount} Records`}</span>
    </div>
    <div className="divide-y divide-neutral-100">
      {activeClient.bookings.length ? activeClient.bookings.map(booking => {
        const assignedStaff = safeStaffList.find(staff => staff.id === booking.staffId);
        const serviceDetails = getBookingService(booking);
        const statusStyle = booking.status === 'confirmed'
          ? 'bg-[#39FF14] text-black'
          : booking.status === 'waitlist'
            ? 'bg-amber-100 text-amber-800'
            : booking.status === 'declined'
              ? 'bg-red-50 text-red-600'
              : 'bg-black text-white';
        return (
          <div key={booking.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/70 transition-colors">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <p className="metric-value text-xl font-bold text-black">{booking.time}</p>
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${statusStyle}`}>{booking.status === 'waitlist' ? 'Standby' : booking.status}</span>
              </div>
              <p className="text-sm text-neutral-500">{booking.date}{booking.clientBirthday ? ` / Bday: ${booking.clientBirthday}` : ''}</p>
              {serviceDetails?.name && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                  <Briefcase size={12} />
                  {summarizeService(serviceDetails)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {assignedStaff && <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{assignedStaff.name}</span>}
              {booking.noShowHistory && <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-[9px] font-bold uppercase tracking-widest">No-show Flag</span>}
            </div>
          </div>
        );
      }) : (
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-5 text-neutral-400"><History size={22} /></div>
          <h3 className="text-lg font-bold tracking-tight text-black mb-2">No booking history yet</h3>
          <p className="text-sm text-neutral-500">Once this client books, their visits will collect here automatically.</p>
        </div>
      )}
    </div>
  </section>
);
