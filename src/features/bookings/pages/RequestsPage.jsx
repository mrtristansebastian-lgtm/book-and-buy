import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { BookingRequestsDesk } from '../components/BookingRequestsDesk';
import { ManualBookingSheet } from '../components/ManualBookingSheet';

export function RequestsPage() {
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="grid gap-5">
      <BookingRequestsDesk
        heading={
          <header className="bb-ops-page-head">
            <div className="bb-page-title-wrap">
              <PageBackButton />
              <span className="bb-page-title-main">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title">Requests</h1>
              </span>
            </div>
            <button type="button" className="bb-page-action" onClick={() => setManualOpen(true)}>
              <Plus size={14} strokeWidth={2.35} aria-hidden="true" />
              Manual booking
            </button>
          </header>
        }
      />
      {manualOpen ? <ManualBookingSheet onClose={() => setManualOpen(false)} /> : null}
    </div>
  );
}
