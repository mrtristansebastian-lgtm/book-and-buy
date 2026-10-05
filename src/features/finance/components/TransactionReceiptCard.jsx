import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatMoney } from '../utils/financeLedger';

function formatReceiptDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function TransactionReceiptCard({
  row,
  currency,
  mode = 'bookings',
  brandName = '',
  onMarkPaid
}) {
  const displayCurrency = row.currency || currency || 'R';

  return (
    <article className={`bb-finance-receipt bb-finance-receipt--${row.paymentStatus}`}>
      <div className="bb-finance-receipt-serration bb-finance-receipt-serration--top" aria-hidden="true" />
      <div className="bb-finance-receipt-body">
        <header className="bb-finance-receipt-head">
          <div>
            <p className="bb-finance-receipt-brand">{row.brandName || brandName || 'Book and Buy'}</p>
            <p className="bb-finance-receipt-meta">
              {row.source === 'booking' || mode === 'bookings' ? 'Booking' : 'Order'}
              {' · '}
              {formatReceiptDate(row.createdAt)}
            </p>
          </div>
          <StatusBadge status={row.paymentStatus} className={`bb-finance-receipt-stamp bb-finance-receipt-stamp--${row.paymentStatus}`}>
            {row.paymentStatus}
          </StatusBadge>
        </header>

        <div className="bb-finance-receipt-rule" aria-hidden="true" />

        <div className="bb-finance-receipt-client">
          <strong>{row.clientName}</strong>
          {row.clientEmail ? <span>{row.clientEmail}</span> : null}
        </div>

        <ul className="bb-finance-receipt-lines">
          {(row.lineItems || []).map((item, index) => (
            <li key={`${row.id}-line-${index}`}>
              <span>
                {item.quantity > 1 ? `${item.quantity}× ` : ''}
                {item.name}
              </span>
              <span>{formatMoney(item.lineTotalCents, displayCurrency)}</span>
            </li>
          ))}
        </ul>

        <div className="bb-finance-receipt-rule bb-finance-receipt-rule--dashed" aria-hidden="true" />

        <footer className="bb-finance-receipt-foot">
          <div>
            <p className="bb-finance-receipt-method">{row.method}</p>
            <p className="bb-finance-receipt-ref">Ref {row.reference}</p>
          </div>
          <p className="bb-finance-receipt-total">{formatMoney(row.amountInCents, displayCurrency)}</p>
        </footer>

        {row.paymentStatus !== 'paid' && onMarkPaid ? (
          <Button action="markPaid" variant="secondary" type="button" className="bb-finance-receipt-pay" onClick={() => onMarkPaid(row)}>
            Mark paid
          </Button>
        ) : null}
      </div>
      <div className="bb-finance-receipt-serration bb-finance-receipt-serration--bottom" aria-hidden="true" />
    </article>
  );
}
