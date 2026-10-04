import { Button } from '../../../shared/ui/Button';
import { useEffect, useRef, useState } from 'react';

function ActionItem({ action, label, onClick, disabled = false, busy = false, variant = 'secondary' }) {
  return (
    <Button action={action} variant={variant} busy={busy}
      type="button"
      role="menuitem"
      className="bb-support-quick-item"
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
    </Button>
  );
}

export function QuickActionsMenu({
  linkedBooking,
  linkedOrder,
  clientEmail,
  onConfirmBooking,
  onDeclineBooking,
  onSetupReschedule,
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = async (fn) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try { await fn?.(); setOpen(false); } catch (failure) { setError(failure.message || 'That action could not be completed.'); }
    finally { actionLock.current = false; setBusy(false); }
  };

  const hasBookingActions = Boolean(linkedBooking);
  const hasOrderActions = Boolean(linkedOrder);
  const hasLinkActions =
    (clientBookings.length && !linkedBooking) || (clientOrders.length && !linkedOrder);

  return (
    <div className={`bb-support-quick-menu ${open ? 'is-open' : ''}`} ref={rootRef}>
      <Button action="quickActions" variant="secondary"
        type="button"
        className="bb-support-quick-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Quick actions</span>
      </Button>
      {open ? (
        <div className="bb-support-quick-panel" role="menu" aria-busy={busy || undefined}>
          {hasBookingActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Booking</p>
              {linkedBooking.status === 'pending' ? (
                <ActionItem action="confirm" busy={busy}
                  label="Confirm booking"
                  variant="positive"
                  onClick={() => run(onConfirmBooking)}
                />
              ) : null}
              {linkedBooking.status === 'pending' || linkedBooking.status === 'waitlist' ? (
                <ActionItem action="decline" busy={busy}
                  label="Decline booking"
                  variant="destructive"
                  onClick={() => run(onDeclineBooking)}
                />
              ) : null}
              <ActionItem action="reschedule" busy={busy}
                label="Set up reschedule"
                onClick={() => run(onSetupReschedule)}
              />
              <ActionItem action="view" busy={busy}
                label="View booking"
                onClick={() => run(onViewBooking)}
              />
            </div>
          ) : null}

          {hasOrderActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Order</p>
              {linkedOrder.paymentStatus !== 'paid' ? (
                <ActionItem action="markPaid" busy={busy}
                  label="Mark order paid"
                  variant="positive"
                  onClick={() => run(onMarkPaid)}
                />
              ) : null}
              {linkedOrder.status === 'pending' ? (
                <ActionItem action="fulfil" busy={busy}
                  label="Mark fulfilled"
                  variant="positive"
                  onClick={() => run(onFulfilOrder)}
                />
              ) : null}
              <ActionItem action="view" busy={busy} label="View order" onClick={() => run(onViewOrder)} />
            </div>
          ) : null}

          {hasLinkActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Link</p>
              {clientBookings.length && !linkedBooking ? (
                <ActionItem action="connect" busy={busy}
                  label="Link latest booking"
                  onClick={() => run(() => onLinkBooking?.(clientBookings[0]))}
                />
              ) : null}
              {clientOrders.length && !linkedOrder ? (
                <ActionItem action="connect" busy={busy}
                  label="Link latest order"
                  onClick={() => run(() => onLinkOrder?.(clientOrders[0]))}
                />
              ) : null}
            </div>
          ) : null}

          <div className="bb-support-quick-group">
            {error && <p role="alert" className="bb-reschedule-error">{error}</p>}
            <ActionItem action="copy" busy={busy}
              label="Copy email"
              disabled={!clientEmail}
              onClick={() => run(onCopyEmail)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
