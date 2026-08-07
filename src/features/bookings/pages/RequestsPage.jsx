import { useState } from 'react';
import { BookingRequestsDesk } from '../components/BookingRequestsDesk';
import { ManualBookingSheet } from '../components/ManualBookingSheet';

export function RequestsPage() {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Requests</h1>
          <p className="bb-muted m-0">Triage booking requests for Book.</p>
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
