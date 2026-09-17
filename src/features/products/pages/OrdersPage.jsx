import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { ProductOrdersDesk } from '../components/ProductOrdersDesk';

export function OrdersPage() {
  return (
    <div className="grid gap-5">
      <ProductOrdersDesk
        heading={
          <header className="bb-ops-page-head">
            <div className="bb-page-title-wrap">
              <PageBackButton />
              <span className="bb-page-title-main">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title">Orders</h1>
              </span>
            </div>
          </header>
        }
      />
    </div>
  );
}
