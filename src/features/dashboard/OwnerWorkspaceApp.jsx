import { OwnerWorkspaceShell } from './components/OwnerWorkspaceShell';
import { OverviewPage } from './pages/OverviewPage';
import { ComingSoonPanel } from '../../shared/ui/ComingSoonPanel';
import { workspaceTabLabels } from '../../config/routeConfig';
import { ServicesPage } from '../services/pages/ServicesPage';
import { SchedulePage } from '../schedule/pages/SchedulePage';
import { ProductsPage } from '../products/pages/ProductsPage';
import { WebsiteStudioPage } from '../website/pages/WebsiteStudioPage';
import { SocialStudioPage } from '../social/pages/SocialStudioPage';
import { useWorkspace } from '../workspace/WorkspaceContext';

const PAGE_COPY = {
  communications: {
    title: 'Support',
    body: 'Client ↔ business messaging threads.'
  },
  finance: {
    title: 'Finance',
    body: 'Stripe, Paystack (API keys), Manual EFT, and Cash.'
  },
  clients: {
    title: 'Clients',
    body: 'Client directory and booking history.'
  },
  profile: {
    title: 'Profile',
    body: 'Account, brand basics, team, and notifications.'
  }
};

export function OwnerWorkspaceApp({ tab }) {
  const { bookings, orders } = useWorkspace();
  const pending = bookings.filter((booking) => ['pending', 'waitlist'].includes(booking.status)).length;
  const pendingOrders = orders.filter((order) => order.status === 'pending').length;

  return (
    <OwnerWorkspaceShell tab={tab}>
      {tab === 'overview' ? (
        <OverviewPage pendingRequests={pending} pendingOrders={pendingOrders} />
      ) : tab === 'services' ? (
        <ServicesPage />
      ) : tab === 'staff' ? (
        <SchedulePage />
      ) : tab === 'products' ? (
        <ProductsPage />
      ) : tab === 'website' ? (
        <WebsiteStudioPage />
      ) : tab === 'social' ? (
        <SocialStudioPage />
      ) : (
        <ComingSoonPanel
          title={PAGE_COPY[tab]?.title || workspaceTabLabels[tab]}
          body={PAGE_COPY[tab]?.body || 'This area is next in the rebuild.'}
        />
      )}
    </OwnerWorkspaceShell>
  );
}
