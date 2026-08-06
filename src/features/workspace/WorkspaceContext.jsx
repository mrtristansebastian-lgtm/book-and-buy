import { createContext, useContext, useMemo, useState } from 'react';
import { createDemoWorkspace } from '../../data/demoWorkspace';
import { normalizeService, normalizeServiceList } from '../../utils/services';
import { normalizeProduct, normalizeProductList } from '../../utils/products';
import { createPublicProductOrder } from '../../utils/orders';

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

    const updateOrder = (id, patch) => {
      setWorkspace((prev) => ({
        ...prev,
        orders: prev.orders.map((order) =>
          order.id === id ? { ...order, ...patch, updatedAt: Date.now() } : order
        )
      }));
    };

    return {
      workspace,
      services: workspace.services,
      staff: workspace.staff,
      bookings: workspace.bookings,
      products: workspace.products,
      orders: workspace.orders,
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
      upsertProduct: (product) => {
        setWorkspace((prev) => {
          const next = normalizeProduct(product);
          const exists = prev.products.some((item) => item.id === next.id);
          return {
            ...prev,
            products: exists
              ? prev.products.map((item) => (item.id === next.id ? next : item))
              : [...prev.products, next]
          };
        });
      },
      removeProduct: (id) =>
        setWorkspace((prev) => ({
          ...prev,
          products: prev.products.filter((product) => product.id !== id)
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
      markPaid: (id) => updateBooking(id, { paymentStatus: 'paid' }),
      placeProductOrder: ({ items, client, paymentMethod }) => {
        const order = createPublicProductOrder({
          workspaceSlug: workspace.slug,
          workspaceName: workspace.brandName,
          items,
          client,
          paymentMethod
        });
        setWorkspace((prev) => ({ ...prev, orders: [order, ...prev.orders] }));
        return order;
      },
      updateOrder,
      fulfilOrder: (id) => updateOrder(id, { status: 'fulfilled' }),
      cancelOrder: (id) => updateOrder(id, { status: 'cancelled' }),
      markOrderPaid: (id) => updateOrder(id, { paymentStatus: 'paid' }),
      updateWebsite: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          website: {
            ...prev.website,
            ...patch,
            pages: {
              ...prev.website?.pages,
              ...(patch.pages || {})
            }
          }
        }));
      },
      addSocialPost: (post) => {
        const record = {
          id: post.id || `post-${Date.now()}`,
          type: post.type || 'text',
          mediaUrl: post.mediaUrl || '',
          caption: post.caption || '',
          title: post.title || '',
          published: post.published !== false,
          createdAt: Date.now(),
          order: 0,
          ...post
        };
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: [record, ...(prev.socialPosts || []).map((item, index) => ({
            ...item,
            order: index + 1
          }))]
        }));
        return record;
      },
      updateSocialPost: (id, patch) => {
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: (prev.socialPosts || []).map((post) =>
            post.id === id ? { ...post, ...patch } : post
          )
        }));
      },
      removeSocialPost: (id) => {
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: (prev.socialPosts || []).filter((post) => post.id !== id)
        }));
      }
    };
  }, [workspace]);

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
