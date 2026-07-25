import { ArrowUpRight, Download } from 'lucide-react';
import { clientAuthPrefillStorageKey, safeSessionSet } from '../../../utils/clientPortalRoute';

const buildABookingMark = '/build-a-booking-official-mark.jpg';

export const ClientPortalPrompt = ({
  formData,
  isPreview,
  onInstallApp,
  settings
}) => {
  const showPortalButton = Boolean(formData.email) || isPreview;
  const showInstallButton = Boolean(onInstallApp) || isPreview;

  if (!showPortalButton && !showInstallButton) return null;

  const openClientPortal = () => {
    if (isPreview) return;

    const email = String(formData.email || '').trim();
    const name = String(formData.name || '').trim();
    const storedPrefill = safeSessionSet(clientAuthPrefillStorageKey, JSON.stringify({
      email,
      name,
      mode: 'signup',
      source: 'booking-success',
      createdAt: Date.now()
    }));

    const params = new URLSearchParams({ mode: 'signup', source: 'booking-success' });
    if (!storedPrefill && email) params.set('email', email);
    if (!storedPrefill && name) params.set('name', name);
    window.location.href = `${window.location.origin}${window.location.pathname}${window.location.search}#/client?${params.toString()}`;
  };

  return (
    <div className="booking-portal-prompt mb-8 w-full max-w-lg rounded-2xl p-4">
      <div className="booking-portal-head flex items-start gap-3">
        <span className="booking-portal-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', color: settings.buttonTextColor || '#000000' }}>
          <img src={buildABookingMark} alt="" aria-hidden="true" />
        </span>
        <div className="booking-portal-copy min-w-0">
          <p className="booking-portal-eyebrow">Your booking companion</p>
          <h3 className="booking-portal-title" style={{ color: settings.headingColor }}>Track this booking</h3>
          <p className="booking-portal-description" style={{ color: settings.bodyColor }}>
            Keep updates, messages, and booking details together. Use the same email and we will link it automatically.
          </p>
        </div>
      </div>
      <div className="booking-portal-actions mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {showPortalButton && (
          <button
            type="button"
            onClick={openClientPortal}
            className="booking-portal-action booking-portal-action-secondary"
          >
            <span>Client portal</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
        {showInstallButton && (
          <button
            type="button"
            onClick={() => { if (!isPreview) onInstallApp?.(); }}
            className="booking-portal-action booking-portal-action-primary"
          >
            <Download size={15} aria-hidden="true" />
            <span>Add app</span>
          </button>
        )}
      </div>
    </div>
  );
};
