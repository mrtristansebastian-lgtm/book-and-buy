import { BookingFlow } from '../../../components/BookingFlow';

export function PublicBookingFlow({ settings, onComplete, onInstallApp }) {
  return (
    <BookingFlow
      settings={settings}
      onComplete={onComplete}
      onInstallApp={onInstallApp}
    />
  );
}
