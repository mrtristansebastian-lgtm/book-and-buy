import { useState } from 'react';
import { BookingRequestsDesk } from '../components/BookingRequestsDesk';
import { ManualBookingSheet } from '../components/ManualBookingSheet';

export function RequestsPage() {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="bb-page-title-wrap">
          <div className="bb-page-header-glow" aria-hidden="true" />
          <h1 className="bb-page-title">Requests</h1>
        </div>
        <button type="button" className="bb-ink-btn" onClick={() => setManualOpen(true)}>
          Manual booking
        </button>
      </header>
      <BookingRequestsDesk />
      {manualOpen ? <ManualBookingSheet onClose={() => setManualOpen(false)} /> : null}
    </div>
  );
}
