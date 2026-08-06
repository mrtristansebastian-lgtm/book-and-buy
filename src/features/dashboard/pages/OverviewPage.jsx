import { navigate, publicPagePath } from '../../../app/routing';
import { E_BUSINESS_PAGES, E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function OverviewPage({ pendingRequests = 0, pendingOrders = 0, unreadSupport = 0 }) {
  const { workspace } = useWorkspace();

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="bb-page-title text-3xl md:text-4xl m-0">Mission control</h1>
        <p className="bb-muted m-0 max-w-2xl">
          Queues and share links for today — not a fake analytics wall.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { label: 'Booking requests', value: String(pendingRequests), href: '/dashboard/services' },
          { label: 'Product orders', value: String(pendingOrders), href: '/dashboard/products' },
          { label: 'Support threads', value: String(unreadSupport), href: '/dashboard/communications' }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="bb-panel text-left p-5 grid gap-2"
            onClick={() => navigate(item.href)}
          >
            <span className="bb-muted text-sm">{item.label}</span>
            <span className="bb-page-title text-3xl">{item.value}</span>
          </button>
        ))}
      </section>

      <section className="bb-panel p-5 grid gap-4">
        <div>
          <h2 className="bb-page-title text-xl m-0">{E_BUSINESS_PLATFORM_NAME}</h2>
          <p className="bb-muted m-0 mt-1 text-sm">Share Home, Book, Buy, and Social from one site.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {E_BUSINESS_PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              className="bb-ghost-btn"
              onClick={() => navigate(publicPagePath(workspace.slug, page.id))}
            >
              {page.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
