import { X } from 'lucide-react';
import { PaymentGatewaysPanel } from '../../settings/components/PaymentGatewaysPanel';

/** @deprecated Prefer Settings → Payments. Kept for any remaining sheet callers. */
export function FinanceSettingsSheet({
  open,
  onClose,
  paymentGateways = [],
  brandName = '',
  onSaveGateway
}) {
  if (!open) return null;

  return (
    <div className="bb-finance-sheet-overlay" onClick={onClose} role="presentation">
      <aside
        className="bb-finance-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Payment settings"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bb-finance-sheet-head">
          <div>
            <p className="bb-finance-eyebrow">Payment settings</p>
            <h2 className="bb-finance-sheet-title">Stripe, Paystack &amp; manual</h2>
          </div>
          <button type="button" className="bb-finance-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>
        <div className="bb-finance-sheet-body">
          <PaymentGatewaysPanel
            paymentGateways={paymentGateways}
            brandName={brandName}
            onSaveGateway={onSaveGateway}
          />
        </div>
      </aside>
    </div>
  );
}
