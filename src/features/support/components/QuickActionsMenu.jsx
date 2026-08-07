import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';

export function QuickActionsMenu({
  linkedBooking,
  linkedOrder,
  clientEmail,
  onConfirmBooking,
  onDeclineBooking,
  onSuggestReschedule,
  onViewBooking,
  onMarkPaid,
  onFulfilOrder,
  onViewOrder,
  onCopyEmail,
  onLinkBooking,
  onLinkOrder,
  clientBookings = [],
  clientOrders = []
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const run = (fn) => {
    fn?.();
    setOpen(false);
  };

  return (
    <div className="bb-support-quick-menu support-quick-control" ref={rootRef}>
      <button type="button" className="bb-ink-btn" onClick={() => setOpen((v) => !v)}>
        <Zap size={14} />
        Quick actions
      </button>
      {open ? (
        <div className="bb-support-quick-panel" role="menu">
          {linkedBooking ? (
            <>
              {linkedBooking.status === 'pending' ? (
                <button type="button" onClick={() => run(onConfirmBooking)}>
                  Confirm booking
                </button>
              ) : null}
              {linkedBooking.status === 'pending' || linkedBooking.status === 'waitlist' ? (
                <button type="button" onClick={() => run(onDeclineBooking)}>
                  Decline booking
                </button>
              ) : null}
              <button type="button" onClick={() => run(onSuggestReschedule)}>
                Suggest reschedule
              </button>
              <button type="button" onClick={() => run(onViewBooking)}>
                View booking
              </button>
            </>
          ) : null}
          {linkedOrder ? (
            <>
              {linkedOrder.paymentStatus !== 'paid' ? (
                <button type="button" onClick={() => run(onMarkPaid)}>
                  Mark order paid
                </button>
              ) : null}
              {linkedOrder.status === 'pending' ? (
                <button type="button" onClick={() => run(onFulfilOrder)}>
                  Mark fulfilled
                </button>
              ) : null}
              <button type="button" onClick={() => run(onViewOrder)}>
                View order
              </button>
            </>
          ) : null}
          {clientBookings.length && !linkedBooking ? (
            <button
              type="button"
              onClick={() => run(() => onLinkBooking?.(clientBookings[0]))}
            >
              Link latest booking
            </button>
          ) : null}
          {clientOrders.length && !linkedOrder ? (
            <button type="button" onClick={() => run(() => onLinkOrder?.(clientOrders[0]))}>
              Link latest order
            </button>
          ) : null}
          <button type="button" disabled={!clientEmail} onClick={() => run(onCopyEmail)}>
            Copy email
          </button>
        </div>
      ) : null}
    </div>
  );
}
