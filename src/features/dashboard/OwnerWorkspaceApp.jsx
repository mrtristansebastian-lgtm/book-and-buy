import { OwnerWorkspaceShell } from './components/OwnerWorkspaceShell';
import { OverviewPage } from './pages/OverviewPage';
import { ComingSoonPanel } from '../../shared/ui/ComingSoonPanel';
import { workspaceTabLabels } from '../../config/routeConfig';

const PAGE_COPY = {
  services: {
    title: 'Services',
    body: 'Catalog and Booking Requests will live here with a period-style Catalog | Requests toggle.'
  },
  staff: {
    title: 'Schedule',
    body: 'Today’s operational board — staff lanes, hours, and confirmed bookings.'
  },
  products: {
    title: 'Products',
    body: 'Product catalog and order fulfilment with a Catalog | Orders toggle.'
  },
  website: {
    title: 'Website',
    body: 'Guided site builder for Home, Book, Shop, and Social — sections, preview, publish. No cinema free-form editor.'
  },
  social: {
    title: 'Social',
    body: 'Post composer that publishes your public Social page.'
  },
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
  return (
    <OwnerWorkspaceShell tab={tab}>
      {tab === 'overview' ? (
        <OverviewPage />
      ) : (
        <ComingSoonPanel
          title={PAGE_COPY[tab]?.title || workspaceTabLabels[tab]}
          body={PAGE_COPY[tab]?.body || 'This area is next in the rebuild.'}
        />
      )}
    </OwnerWorkspaceShell>
  );
}
