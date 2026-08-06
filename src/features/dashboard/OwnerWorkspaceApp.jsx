import { OwnerWorkspaceShell } from './components/OwnerWorkspaceShell';
import { OverviewPage } from './pages/OverviewPage';
import { ServicesPage } from '../services/pages/ServicesPage';
import { SchedulePage } from '../schedule/pages/SchedulePage';
import { ProductsPage } from '../products/pages/ProductsPage';
import { WebsiteStudioPage } from '../website/pages/WebsiteStudioPage';
import { SocialStudioPage } from '../social/pages/SocialStudioPage';
import { SupportInboxPage } from '../support/pages/SupportInboxPage';
import { FinancePage } from '../finance/pages/FinancePage';
import { ClientsPage } from '../clients/pages/ClientsPage';
import { ProfilePage } from '../profile/pages/ProfilePage';
import { useWorkspace } from '../workspace/WorkspaceContext';

export function OwnerWorkspaceApp({ tab }) {
  const { bookings, orders, threads } = useWorkspace();
  const pending = bookings.filter((booking) => ['pending', 'waitlist'].includes(booking.status)).length;
  const pendingOrders = orders.filter((order) => order.status === 'pending').length;
  const unreadSupport = (threads || []).filter((thread) => thread.unread).length;

  return (
    <OwnerWorkspaceShell tab={tab}>
      {tab === 'overview' ? (
        <OverviewPage
          pendingRequests={pending}
          pendingOrders={pendingOrders}
          unreadSupport={unreadSupport}
        />
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
      ) : tab === 'communications' ? (
        <SupportInboxPage />
      ) : tab === 'finance' ? (
        <FinancePage />
      ) : tab === 'clients' ? (
        <ClientsPage />
      ) : tab === 'profile' ? (
        <ProfilePage />
      ) : null}
    </OwnerWorkspaceShell>
  );
}
