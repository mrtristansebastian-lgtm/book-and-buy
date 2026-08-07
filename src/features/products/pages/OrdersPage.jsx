import { ProductOrdersDesk } from '../components/ProductOrdersDesk';

export function OrdersPage() {
  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="bb-page-title text-3xl m-0">Orders</h1>
        <p className="bb-muted m-0">Fulfil and track Buy orders.</p>
      </header>
      <ProductOrdersDesk />
    </div>
  );
}
