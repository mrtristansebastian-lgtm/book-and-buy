import { createContext, useContext, useMemo, useState } from 'react';
import { createDemoWorkspace } from '../../data/demoWorkspace';
import { normalizeService, normalizeServiceList } from '../../utils/services';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(() => createDemoWorkspace());

  const api = useMemo(() => {
    const updateBooking = (id, patch) => {
      setWorkspace((prev) => ({
        ...prev,
        bookings: prev.bookings.map((booking) =>
          booking.id === id ? { ...booking, ...patch, updatedAt: Date.now() } : booking
        )
      }));
    };

    return {
      workspace,
      services: workspace.services,
      staff: workspace.staff,
      bookings: workspace.bookings,
      setServices: (services) =>
        setWorkspace((prev) => ({ ...prev, services: normalizeServiceList(services) })),
      upsertService: (service) => {
        setWorkspace((prev) => {
          const next = normalizeService(service);
          const exists = prev.services.some((item) => item.id === next.id);
          return {
            ...prev,
            services: exists
              ? prev.services.map((item) => (item.id === next.id ? next : item))
              : [...prev.services, next]
          };
        });
      },
      removeService: (id) =>
        setWorkspace((prev) => ({
          ...prev,
          services: prev.services.filter((service) => service.id !== id)
        })),
      addBooking: (booking) => {
        const record = {
          id: booking.id || `bk-${Date.now()}`,
          timestamp: Date.now(),
          paymentStatus: booking.paymentStatus || 'unpaid',
          status: booking.status || 'pending',
          source: booking.source || 'owner',
          ...booking
        };
        setWorkspace((prev) => ({ ...prev, bookings: [record, ...prev.bookings] }));
        return record;
      },
      updateBooking,
      confirmBooking: (id) => updateBooking(id, { status: 'confirmed' }),
      declineBooking: (id) => updateBooking(id, { status: 'declined' }),
      waitlistBooking: (id) => updateBooking(id, { status: 'waitlist' }),
      markPaid: (id) => updateBooking(id, { paymentStatus: 'paid' })
    };
  }, [workspace]);

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
