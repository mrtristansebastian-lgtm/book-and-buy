import { clientAuthPrefillStorageKey, safeSessionSet } from '../../../utils/clientPortalRoute';
import { withColorAlpha } from '../../../utils/theme';

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
    <div className="booking-portal-prompt mb-8 w-full max-w-lg rounded-2xl border p-4" style={{ borderColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 13, '#000000'), backgroundColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 4, '#000000') }}>
      <div className="booking-portal-head flex items-start gap-3">
        <span className="booking-portal-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', color: settings.buttonTextColor || '#000000' }}>
          <img src={settings.logo || '/build-a-booking-official-mark.jpg'} alt="" aria-hidden="true" />
        </span>
        <div className="booking-portal-copy min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em]" style={{ color: settings.headingColor }}>Track this booking</p>
          <p className="mt-1 text-xs leading-relaxed opacity-60" style={{ color: settings.bodyColor }}>
            Create or sign in with the same email used for this booking so the portal links it automatically.
          </p>
        </div>
      </div>
      <div className="booking-portal-actions mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {showPortalButton && (
          <button
            type="button"
            onClick={openClientPortal}
            className="h-10 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5"
            style={{ borderColor: withColorAlpha(settings.headingColor || '#000000', 13, '#000000'), color: settings.headingColor, backgroundColor: settings.backgroundColor || '#ffffff' }}
          >
            Client portal
          </button>
        )}
        {showInstallButton && (
          <button
            type="button"
            onClick={() => { if (!isPreview) onInstallApp?.(); }}
            className="h-10 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: settings.primaryColor || settings.headingColor || '#000000', color: settings.buttonTextColor || '#000000' }}
          >
            Add app
          </button>
        )}
      </div>
    </div>
  );
};
