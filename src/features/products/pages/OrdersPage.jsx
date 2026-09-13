import { ProductOrdersDesk } from '../components/ProductOrdersDesk';

export function OrdersPage() {
  return (
    <div className="grid gap-5">
      <header className="bb-page-title-wrap">
        <div className="bb-page-header-glow" aria-hidden="true" />
        <h1 className="bb-page-title">Orders</h1>
      </header>
      <ProductOrdersDesk />
    </div>
  );
}
