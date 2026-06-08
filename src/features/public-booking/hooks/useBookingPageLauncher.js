import { useMemo } from 'react';
import { buildBookingSlug } from '../../../utils/slugs';

export function useBookingPageLauncher(settings) {
  const bookingPageSlug = useMemo(
    () => buildBookingSlug(settings.slug || settings.brandName || settings.businessName || 'studio'),
    [settings.brandName, settings.businessName, settings.slug]
  );
  const bookingPageRoute = `#/book/${bookingPageSlug}`;
  const bookingPageUrl = useMemo(() => {
    if (typeof window === 'undefined') return bookingPageRoute;
    return `${window.location.origin}${window.location.pathname}${bookingPageRoute}`;
  }, [bookingPageRoute]);

  const openBookingPage = () => {
    if (typeof window === 'undefined') return;
    const opened = window.open(bookingPageUrl, '_blank');
    if (opened) {
      opened.opener = null;
      return;
    }
    if (!opened) {
      window.location.assign(bookingPageUrl);
    }
  };

  return { bookingPageRoute, bookingPageSlug, bookingPageUrl, openBookingPage };
}
