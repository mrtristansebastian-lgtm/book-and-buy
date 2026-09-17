import { OwnerWorkspaceShell } from './components/OwnerWorkspaceShell';
import { OverviewPage } from './pages/OverviewPage';
import { ServicesPage } from '../services/pages/ServicesPage';
import { RequestsPage } from '../bookings/pages/RequestsPage';
import { SchedulePage } from '../schedule/pages/SchedulePage';
import { AvailabilityPage } from '../schedule/pages/AvailabilityPage';
import { ProductsPage } from '../products/pages/ProductsPage';
import { OrdersPage } from '../products/pages/OrdersPage';
import { StockPage } from '../products/pages/StockPage';
import { WebsiteStudioPage } from '../website/pages/WebsiteStudioPage';
import { BookStudioPage } from '../website/pages/BookStudioPage';
import { BuyStudioPage } from '../website/pages/BuyStudioPage';
import { CheckoutStudioPage } from '../website/pages/CheckoutStudioPage';
import { SocialStudioPage } from '../social/pages/SocialStudioPage';
import { SupportInboxPage } from '../support/pages/SupportInboxPage';
import { FinancePage } from '../finance/pages/FinancePage';
import { AnalyticsPage } from '../analytics/pages/AnalyticsPage';
import { LiveStatsPage } from '../analytics/pages/LiveStatsPage';
import { ClientsPage } from '../clients/pages/ClientsPage';
import { SettingsShell } from '../settings/SettingsShell';

export function OwnerWorkspaceApp({ tab, rest = [] }) {
  return (
    <OwnerWorkspaceShell tab={tab}>
      {tab === 'overview' ? (
        <OverviewPage />
      ) : tab === 'services' ? (
        <ServicesPage routeRest={rest} />
      ) : tab === 'requests' ? (
        <RequestsPage />
      ) : tab === 'staff' ? (
        <SchedulePage />
      ) : tab === 'availability' ? (
        <AvailabilityPage />
      ) : tab === 'products' ? (
        <ProductsPage routeRest={rest} />
      ) : tab === 'orders' ? (
        <OrdersPage />
      ) : tab === 'stock' ? (
        <StockPage routeRest={rest} />
      ) : tab === 'website' ? (
        <WebsiteStudioPage />
      ) : tab === 'website-book' ? (
        <BookStudioPage />
      ) : tab === 'website-buy' ? (
        <BuyStudioPage />
      ) : tab === 'website-checkout' ? (
        <CheckoutStudioPage />
      ) : tab === 'social' ? (
        <SocialStudioPage />
      ) : tab === 'communications' ? (
        <SupportInboxPage />
      ) : tab === 'finance' ? (
        <FinancePage />
      ) : tab === 'live-stats' ? (
        <LiveStatsPage />
      ) : tab === 'analytics' ? (
        <AnalyticsPage />
      ) : tab === 'clients' ? (
        <ClientsPage />
      ) : tab === 'settings' ? (
        <SettingsShell section={rest?.[0]} />
      ) : null}
    </OwnerWorkspaceShell>
  );
}
