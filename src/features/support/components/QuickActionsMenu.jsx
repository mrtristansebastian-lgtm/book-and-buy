import { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  Link2,
  PackageCheck,
  Wallet,
  XCircle,
  Zap
} from 'lucide-react';

function ActionItem({ icon: Icon, label, onClick, disabled = false, tone = 'default' }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`bb-support-quick-item ${tone !== 'default' ? `is-${tone}` : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="bb-support-quick-item-icon" aria-hidden="true">
        <Icon size={14} strokeWidth={2} />
      </span>
      <span>{label}</span>
    </button>
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

  const run = (fn) => {
    fn?.();
    setOpen(false);
  };

  const hasBookingActions = Boolean(linkedBooking);
  const hasOrderActions = Boolean(linkedOrder);
  const hasLinkActions =
    (clientBookings.length && !linkedBooking) || (clientOrders.length && !linkedOrder);

  return (
    <div className={`bb-support-quick-menu ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="bb-support-quick-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Zap size={13} strokeWidth={2.25} />
        <span>Quick actions</span>
        <ChevronDown size={13} strokeWidth={2.25} className="bb-support-quick-chevron" />
      </button>
      {open ? (
        <div className="bb-support-quick-panel" role="menu">
          {hasBookingActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Booking</p>
              {linkedBooking.status === 'pending' ? (
                <ActionItem
                  icon={CheckCircle2}
                  label="Confirm booking"
                  tone="positive"
                  onClick={() => run(onConfirmBooking)}
                />
              ) : null}
              {linkedBooking.status === 'pending' || linkedBooking.status === 'waitlist' ? (
                <ActionItem
                  icon={XCircle}
                  label="Decline booking"
                  tone="danger"
                  onClick={() => run(onDeclineBooking)}
                />
              ) : null}
              <ActionItem
                icon={CalendarClock}
                label="Set up reschedule"
                onClick={() => run(onSetupReschedule)}
              />
              <ActionItem
                icon={Eye}
                label="View booking"
                onClick={() => run(onViewBooking)}
              />
            </div>
          ) : null}

          {hasOrderActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Order</p>
              {linkedOrder.paymentStatus !== 'paid' ? (
                <ActionItem
                  icon={Wallet}
                  label="Mark order paid"
                  onClick={() => run(onMarkPaid)}
                />
              ) : null}
              {linkedOrder.status === 'pending' ? (
                <ActionItem
                  icon={PackageCheck}
                  label="Mark fulfilled"
                  onClick={() => run(onFulfilOrder)}
                />
              ) : null}
              <ActionItem icon={Eye} label="View order" onClick={() => run(onViewOrder)} />
            </div>
          ) : null}

          {hasLinkActions ? (
            <div className="bb-support-quick-group">
              <p className="bb-support-quick-label">Link</p>
              {clientBookings.length && !linkedBooking ? (
                <ActionItem
                  icon={Link2}
                  label="Link latest booking"
                  onClick={() => run(() => onLinkBooking?.(clientBookings[0]))}
                />
              ) : null}
              {clientOrders.length && !linkedOrder ? (
                <ActionItem
                  icon={Link2}
                  label="Link latest order"
                  onClick={() => run(() => onLinkOrder?.(clientOrders[0]))}
                />
              ) : null}
            </div>
          ) : null}

          <div className="bb-support-quick-group">
            <ActionItem
              icon={Copy}
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
