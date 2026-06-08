import { ChevronDown, Layers, Plus, Search } from 'lucide-react';
import { bookingPaymentFilterOptions, bookingSortOptions } from '../../../config/appConfig';
import { BookingRecordRow } from './BookingRecordRow';

export const BookingDesk = ({
  actions,
  bookingDesk,
  bookingDeskPeriod,
  bookingPaymentFilter,
  bookingRows,
  bookingSearch,
  bookingSort,
  displayStaffList,
  onBookingDeskPeriodChange,
  onBookingFilterChange,
  onBookingPaymentFilterChange,
  onBookingSearchChange,
  onBookingSortChange,
  onOpenCustomRange,
  onOpenManualBooking,
  safeStaffList
}) => (
  <section data-tour="bookings-queue" className="saas-card booking-desk-shell overflow-hidden">
    <div className="booking-desk-command p-4 md:p-5 border-b border-neutral-100">
      <div className="booking-desk-head flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="booking-desk-title-block">
          <p className="booking-desk-eyebrow text-[10px] font-bold uppercase text-neutral-400 mb-2">Booking Desk</p>
          <h2 className="booking-desk-title text-2xl md:text-3xl font-bold tracking-tight text-black">
            {bookingDesk.activeFilter === 'upcoming' ? 'Latest Upcoming' : `${bookingDesk.activeFilterLabel} Bookings`}
          </h2>
          <p className="booking-desk-subcopy text-sm text-neutral-500 mt-1">
            {`${bookingRows.length} shown / ${bookingDesk.period.rangeLabel}.`}
          </p>
        </div>
        <div className="booking-desk-head-actions">
          <button
            type="button"
            onClick={onOpenManualBooking}
            className="booking-add-inline-button"
          >
            <Plus size={14} /> Booking
          </button>
          <div className="booking-period-tabs schedule-scope-toggle flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 w-full sm:w-fit">
            {bookingDesk.periods.map(period => (
              <button
                key={period.id}
                type="button"
                onClick={() => {
                  onBookingDeskPeriodChange(period.id);
                  if (period.id === 'custom') onOpenCustomRange();
                }}
                className={`booking-period-tab flex-1 sm:flex-none h-10 px-4 rounded-md text-[10px] font-bold uppercase transition-all ${bookingDeskPeriod === period.id ? 'is-active bg-[#39FF14] text-black shadow-lg shadow-[#39FF14]/20' : 'text-neutral-500 hover:text-black hover:bg-white'}`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="booking-desk-controls mt-4 flex flex-col xl:flex-row gap-3">
        <label className="booking-search-field relative flex-1 min-w-0">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
          <input
            value={bookingSearch}
            onChange={(event) => onBookingSearchChange(event.target.value)}
            placeholder="Search client, phone, email, note"
            aria-label="Search bookings"
            className="booking-desk-input w-full h-12 rounded-lg bg-white border border-neutral-200 pl-11 pr-4 text-sm font-bold text-black outline-none focus:border-black transition-colors"
          />
        </label>
        <div className="booking-desk-selects grid grid-cols-2 gap-2 xl:w-[420px]">
          <details name="booking-desk-filter-menu" className="booking-desk-menu relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && event.currentTarget.removeAttribute('open')}>
            <summary className="booking-desk-select-face">
              <span>{bookingPaymentFilterOptions.find(([value]) => value === bookingPaymentFilter)?.[1] || 'All payments'}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div className="booking-desk-menu-panel">
              {bookingPaymentFilterOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={bookingPaymentFilter === value ? 'is-selected' : ''}
                  onClick={(event) => {
                    onBookingPaymentFilterChange(value);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
          <details name="booking-desk-filter-menu" className="booking-desk-menu relative" onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && event.currentTarget.removeAttribute('open')}>
            <summary className="booking-desk-select-face">
              <span>{bookingSortOptions.find(([value]) => value === bookingSort)?.[1] || 'Newest first'}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div className="booking-desk-menu-panel">
              {bookingSortOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={bookingSort === value ? 'is-selected' : ''}
                  onClick={(event) => {
                    onBookingSortChange(value);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </details>
        </div>
        <div className="booking-filter-rail flex flex-wrap items-center gap-2">
          {bookingDesk.filters.map(filter => {
            const FilterIcon = filter.icon || Layers;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onBookingFilterChange(filter.id)}
                className={`booking-filter-chip h-11 px-3 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${bookingDesk.activeFilter === filter.id ? 'is-active bg-black text-white shadow-lg' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-black'}`}
              >
                <FilterIcon size={13} />
                <span>{filter.label}</span>
                <span className={`booking-filter-count min-w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${bookingDesk.activeFilter === filter.id ? 'native-gradient-icon text-black' : 'bg-white text-black border border-neutral-100'}`}>{filter.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="booking-record-list divide-y divide-neutral-100">
      {bookingRows.length === 0 ? (
        <div className="p-12 md:p-20 text-center">
          <div className="w-14 h-14 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-5 text-neutral-400"><Layers size={22} /></div>
          <h3 className="text-xl font-bold tracking-tight text-black mb-2">{bookingDesk.searchActive ? 'No matching bookings' : 'No bookings here'}</h3>
          <p className="text-sm text-neutral-500">{bookingDesk.searchActive ? 'Try a different client name, phone, email, or note.' : 'Try another category or wait for new booking requests.'}</p>
        </div>
      ) : bookingRows.map(booking => (
        <BookingRecordRow
          key={booking.id}
          booking={booking}
          displayStaffList={displayStaffList}
          safeStaffList={safeStaffList}
          {...actions}
        />
      ))}
    </div>
  </section>
);
