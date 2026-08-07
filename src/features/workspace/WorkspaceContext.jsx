import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createDemoWorkspace, hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { createBlankWorkspace } from '../../data/blankWorkspace';
import { normalizeService, normalizeServiceList, collectServiceCategories } from '../../utils/services';
import { collectProductCategories, normalizeProduct } from '../../utils/products';
import { createPublicProductOrder } from '../../utils/orders';
import { useAuth } from '../auth/AuthContext';
import {
  loadOwnerWorkspaceFromFirestore,
  saveOwnerWorkspaceToFirestore
} from '../../shared/firebase/ownerWorkspace';

const WorkspaceContext = createContext(null);
const MODE_KEY = 'book-and-buy.workspace-mode';
const OWNER_KEY = 'book-and-buy.owner-workspace';
const DEMO_KEY = 'book-and-buy.demo-workspace';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readInitialWorkspace() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    if (mode === 'owner') {
      return safeParse(localStorage.getItem(OWNER_KEY), createBlankWorkspace({ onboardingComplete: false }));
    }
    if (mode === 'demo') {
      return hydrateDemoWorkspace(safeParse(localStorage.getItem(DEMO_KEY), null));
    }
  } catch {
    /* ignore */
  }
  return createDemoWorkspace();
}

function persistWorkspace(next) {
  try {
    if (next.isDemo) {
      localStorage.setItem(MODE_KEY, 'demo');
      localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      return;
    }
    localStorage.setItem(MODE_KEY, 'owner');
    localStorage.setItem(OWNER_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function WorkspaceProvider({ children }) {
  const { user, configured } = useAuth();
  const [workspace, setWorkspace] = useState(() => readInitialWorkspace());
  const cloudHydratedRef = useRef(false);
  const skipNextCloudSaveRef = useRef(false);

  useEffect(() => {
    persistWorkspace(workspace);
  }, [workspace]);

  /** One-time upgrade for cached demo workspaces missing rich Home sections. */
  useEffect(() => {
    setWorkspace((prev) => {
      if (!prev.isDemo) return prev;
      const next = hydrateDemoWorkspace(prev);
      if (
        next.websiteSchema === prev.websiteSchema &&
        next.socialSchema === prev.socialSchema &&
        next.website?.aboutBody === prev.website?.aboutBody &&
        (next.website?.venueImages?.length || 0) === (prev.website?.venueImages?.length || 0) &&
        (next.socialPosts?.length || 0) === (prev.socialPosts?.length || 0)
      ) {
        return prev;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspace.isDemo) cloudHydratedRef.current = false;
  }, [workspace.isDemo]);

  /** Bind ownerId + hydrate owner settings from Firestore when signed in. */
  useEffect(() => {
    let cancelled = false;
    async function hydrateOwner() {
      if (!configured || !user?.uid) {
        cloudHydratedRef.current = false;
        return;
      }
      if (workspace.isDemo) return;

      setWorkspace((prev) => {
        if (prev.isDemo) return prev;
        if (prev.ownerId === user.uid) return prev;
        return { ...prev, ownerId: user.uid, isDemo: false };
      });

      if (cloudHydratedRef.current) return;
      cloudHydratedRef.current = true;
      try {
        const remote = await loadOwnerWorkspaceFromFirestore(user.uid);
        if (cancelled || !remote) return;
        skipNextCloudSaveRef.current = true;
        setWorkspace((prev) => {
          if (prev.isDemo) return prev;
          return {
            ...prev,
            ...remote,
            ownerId: user.uid,
            isDemo: false,
            website: {
              ...prev.website,
              ...(remote.website || {})
            }
          };
        });
      } catch {
        /* keep local cache */
      }
    }
    hydrateOwner();
    return () => {
      cancelled = true;
    };
    // Only re-run on auth identity; workspace.isDemo checked inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, user?.uid, workspace.isDemo]);

  /** Debounced owner settings write-through. */
  useEffect(() => {
    if (!configured || !user?.uid || workspace.isDemo) return;
    if (workspace.ownerId && workspace.ownerId !== user.uid) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      saveOwnerWorkspaceToFirestore(user.uid, {
        ...workspace,
        ownerId: user.uid
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [configured, user?.uid, workspace]);

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
      clients: workspace.clients || [],
      threads: workspace.threads || [],
      paymentGateways: workspace.paymentGateways || [],
      setServices: (services) =>
        setWorkspace((prev) => ({ ...prev, services: normalizeServiceList(services) })),
      upsertService: (service) => {
        setWorkspace((prev) => {
          const next = normalizeService(service);
          const exists = prev.services.some((item) => item.id === next.id);
          const services = exists
            ? prev.services.map((item) => (item.id === next.id ? next : item))
            : [...prev.services, next];
          return {
            ...prev,
            services,
            serviceCategories: collectServiceCategories(
              services,
              prev.serviceCategories || []
            )
          };
        });
      },
      removeService: (id) =>
        setWorkspace((prev) => ({
          ...prev,
          services: prev.services.filter((service) => service.id !== id)
        })),
      setServiceCategories: (categories) => {
        setWorkspace((prev) => ({
          ...prev,
          serviceCategories: collectServiceCategories(prev.services || [], categories || [])
        }));
      },
      upsertProduct: (product) => {
        setWorkspace((prev) => {
          const next = normalizeProduct(product);
          const exists = prev.products.some((item) => item.id === next.id);
          const products = exists
            ? prev.products.map((item) => (item.id === next.id ? next : item))
            : [...prev.products, next];
          return {
            ...prev,
            products,
            productCategories: collectProductCategories(
              products,
              prev.productCategories || []
            )
          };
        });
      },
      removeProduct: (id) =>
        setWorkspace((prev) => ({
          ...prev,
          products: prev.products.filter((product) => product.id !== id)
        })),
      setProductCategories: (categories) => {
        setWorkspace((prev) => ({
          ...prev,
          productCategories: collectProductCategories(prev.products || [], categories || [])
        }));
      },
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
      acceptOrder: (id) => updateOrder(id, { status: 'accepted' }),
      shipOrder: (id) => updateOrder(id, { status: 'shipped' }),
      assignBookingStaff: (id, staffMember) =>
        updateBooking(id, {
          staffId: staffMember?.id || '',
          staffName: staffMember?.name || ''
        }),
      updateWebsite: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          website: {
            ...prev.website,
            ...patch,
            pages: {
              ...prev.website?.pages,
              ...(patch.pages || {})
            },
            sections: {
              ...prev.website?.sections,
              ...(patch.sections || {})
            }
          },
          publishedAt: patch.publish ? Date.now() : prev.publishedAt
        }));
      },
      publishWebsite: async () => {
        let snapshot = null;
        setWorkspace((prev) => {
          snapshot = {
            ...prev,
            ownerId: user?.uid || prev.ownerId,
            publishedAt: Date.now(),
            website: { ...prev.website, published: true }
          };
          return snapshot;
        });
        const { publishWorkspaceToFirestore } = await import('../../shared/firebase/integrations');
        try {
          return await publishWorkspaceToFirestore(snapshot || {});
        } catch (error) {
          return {
            ok: false,
            localOnly: true,
            reason: error?.message || 'Cloud publish failed. Kept local publish.'
          };
        }
      },
      addSocialPost: (post) => {
        const record = {
          id: post.id || `post-${Date.now()}`,
          type: post.type || 'text',
          mediaUrl: post.mediaUrl || '',
          posterUrl: post.posterUrl || '',
          duration: post.duration || '',
          caption: post.caption || '',
          title: post.title || '',
          published: post.published !== false,
          createdAt: Date.now(),
          order: 0,
          ...post
        };
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: [
            record,
            ...(prev.socialPosts || []).map((item, index) => ({
              ...item,
              order: index + 1
            }))
          ]
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
      },
      updateProfile: (patch) => {
        setWorkspace((prev) => ({ ...prev, ...patch }));
      },
      updateAvailabilityRules: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          availabilityRules: { ...prev.availabilityRules, ...patch }
        }));
      },
      updateNotifications: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          notifications: { ...prev.notifications, ...patch }
        }));
      },
      upsertStaff: (member) => {
        setWorkspace((prev) => {
          const next = {
            id: member.id || `staff-${Date.now()}`,
            accessRole: 'Staff',
            color: '#050505',
            ...member
          };
          const exists = (prev.staff || []).some((item) => item.id === next.id);
          return {
            ...prev,
            staff: exists
              ? prev.staff.map((item) => (item.id === next.id ? { ...item, ...next } : item))
              : [...(prev.staff || []), next]
          };
        });
      },
      removeStaff: (id) => {
        setWorkspace((prev) => ({
          ...prev,
          staff: (prev.staff || []).filter((member) => member.id !== id)
        }));
      },
      upsertClient: (client) => {
        setWorkspace((prev) => {
          const next = { id: client.id || `client-${Date.now()}`, ...client };
          const exists = (prev.clients || []).some((item) => item.id === next.id);
          return {
            ...prev,
            clients: exists
              ? prev.clients.map((item) => (item.id === next.id ? { ...item, ...next } : item))
              : [...(prev.clients || []), next]
          };
        });
      },
      removeClient: (id) => {
        setWorkspace((prev) => ({
          ...prev,
          clients: (prev.clients || []).filter((client) => client.id !== id)
        }));
      },
      startThreadFromBooking: (booking) => {
        if (!booking) return null;
        let created = null;
        setWorkspace((prev) => {
          const existing = (prev.threads || []).find(
            (thread) =>
              thread.bookingId === booking.id ||
              (String(thread.clientEmail || '').toLowerCase() ===
                String(booking.clientEmail || '').toLowerCase() &&
                thread.subject?.includes(booking.serviceName || ''))
          );
          if (existing) {
            created = { ...existing, bookingId: existing.bookingId || booking.id };
            return {
              ...prev,
              threads: prev.threads.map((thread) =>
                thread.id === existing.id
                  ? {
                      ...thread,
                      bookingId: thread.bookingId || booking.id,
                      unread: true,
                      updatedAt: Date.now()
                    }
                  : thread
              )
            };
          }
          const now = Date.now();
          created = {
            id: `thread-${now}`,
            clientName: booking.clientName,
            clientEmail: booking.clientEmail || '',
            subject: `Re: ${booking.serviceName}`,
            bookingId: booking.id,
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now },
            messages: [
              {
                id: `m-${now}`,
                type: 'system',
                from: 'business',
                body: `Booking linked · ${booking.serviceName} (${booking.dateKey || booking.date} ${booking.time})`,
                at: now
              },
              {
                id: `m-${now + 1}`,
                type: 'text',
                from: 'business',
                body: `Following up on ${booking.serviceName} (${booking.dateKey || booking.date} ${booking.time}).`,
                at: now + 1
              }
            ]
          };
          return { ...prev, threads: [created, ...(prev.threads || [])] };
        });
        return created;
      },
      startThreadFromOrder: (order) => {
        if (!order) return null;
        let created = null;
        setWorkspace((prev) => {
          const existing = (prev.threads || []).find(
            (thread) =>
              thread.orderId === order.id ||
              (String(thread.clientEmail || '').toLowerCase() ===
                String(order.clientEmail || '').toLowerCase() &&
                thread.subject?.startsWith('Order ·'))
          );
          if (existing) {
            created = { ...existing, orderId: existing.orderId || order.id };
            return {
              ...prev,
              threads: prev.threads.map((thread) =>
                thread.id === existing.id
                  ? {
                      ...thread,
                      orderId: thread.orderId || order.id,
                      unread: true,
                      updatedAt: Date.now()
                    }
                  : thread
              )
            };
          }
          const now = Date.now();
          const itemLabel = (order.items || [])
            .map((item) => item.name)
            .filter(Boolean)
            .slice(0, 2)
            .join(' + ');
          created = {
            id: `thread-${now}`,
            clientName: order.clientName,
            clientEmail: order.clientEmail || '',
            subject: `Order · ${itemLabel || 'Products'}`,
            orderId: order.id,
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now },
            messages: [
              {
                id: `m-${now}`,
                type: 'system',
                from: 'business',
                body: `Order linked · ${itemLabel || 'Products'}`,
                at: now
              },
              {
                id: `m-${now + 1}`,
                type: 'text',
                from: 'business',
                body: `Hi ${order.clientName}, reaching out about your order.`,
                at: now + 1
              }
            ]
          };
          return { ...prev, threads: [created, ...(prev.threads || [])] };
        });
        return created;
      },
      startThreadFromClient: (client) => {
        if (!client) return null;
        let created = null;
        setWorkspace((prev) => {
          const email = String(client.email || '').toLowerCase();
          const existing = (prev.threads || []).find(
            (thread) =>
              String(thread.clientEmail || '').toLowerCase() === email &&
              thread.subject === `Message · ${client.name}`
          );
          if (existing) {
            created = existing;
            return {
              ...prev,
              threads: prev.threads.map((thread) =>
                thread.id === existing.id
                  ? { ...thread, unread: true, updatedAt: Date.now() }
                  : thread
              )
            };
          }
          const now = Date.now();
          created = {
            id: `thread-${now}`,
            clientName: client.name,
            clientEmail: client.email || '',
            subject: `Message · ${client.name}`,
            clientId: client.id,
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now },
            messages: [
              {
                id: `m-${now}`,
                type: 'text',
                from: 'business',
                body: `Hi ${client.name}, reaching out from ${prev.brandName}.`,
                at: now
              }
            ]
          };
          return { ...prev, threads: [created, ...(prev.threads || [])] };
        });
        return created;
      },
      sendThreadMessage: (threadId, payload) => {
        const incoming = typeof payload === 'string' ? { body: payload } : payload || {};
        const text = String(incoming.body || '').trim();
        const attachments = Array.isArray(incoming.attachments) ? incoming.attachments : [];
        const type =
          incoming.type ||
          (attachments[0]?.kind === 'voice'
            ? 'voice'
            : attachments[0]?.kind === 'image'
              ? 'image'
              : attachments[0]?.kind === 'file'
                ? 'file'
                : 'text');
        if (!text && !attachments.length && type !== 'system') return null;
        const message = {
          id: `m-${Date.now()}`,
          type,
          from: incoming.from || 'business',
          body: text,
          at: Date.now(),
          ...(attachments.length ? { attachments } : {})
        };
        setWorkspace((prev) => ({
          ...prev,
          threads: (prev.threads || []).map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  unread: message.from === 'client',
                  updatedAt: Date.now(),
                  messages: [...(thread.messages || []), message]
                }
              : thread
          )
        }));
        return message;
      },
      updateThread: (threadId, patch) => {
        setWorkspace((prev) => ({
          ...prev,
          threads: (prev.threads || []).map((thread) =>
            thread.id === threadId ? { ...thread, ...patch, updatedAt: Date.now() } : thread
          )
        }));
      },
      setThreadPresence: (threadId, presence) => {
        setWorkspace((prev) => ({
          ...prev,
          threads: (prev.threads || []).map((thread) =>
            thread.id === threadId
              ? { ...thread, presence: { ...(thread.presence || {}), ...presence } }
              : thread
          )
        }));
      },
      markThreadRead: (threadId) => {
        setWorkspace((prev) => ({
          ...prev,
          threads: (prev.threads || []).map((thread) =>
            thread.id === threadId ? { ...thread, unread: false } : thread
          )
        }));
      },
      updatePaymentGateway: (gatewayType, patch) => {
        setWorkspace((prev) => ({
          ...prev,
          paymentGateways: (prev.paymentGateways || []).map((gateway) =>
            gateway.gatewayType === gatewayType
              ? {
                  ...gateway,
                  ...patch,
                  credentialSummary: {
                    ...gateway.credentialSummary,
                    ...(patch.credentialSummary || {})
                  },
                  updatedAt: Date.now()
                }
              : gateway
          )
        }));
      },
      loadDemoWorkspace: ({ reset = false } = {}) => {
        const stored = !reset ? safeParse(localStorage.getItem(DEMO_KEY), null) : null;
        const next = reset ? createDemoWorkspace() : hydrateDemoWorkspace(stored);
        localStorage.setItem(MODE_KEY, 'demo');
        localStorage.setItem(DEMO_KEY, JSON.stringify(next));
        setWorkspace(next);
        return next;
      },
      resetDemoWorkspace: () => {
        const next = createDemoWorkspace();
        localStorage.setItem(MODE_KEY, 'demo');
        localStorage.setItem(DEMO_KEY, JSON.stringify(next));
        setWorkspace(next);
        return next;
      },
      exitDemoMode: () => {
        localStorage.setItem(MODE_KEY, 'owner');
        const owner = safeParse(
          localStorage.getItem(OWNER_KEY),
          createBlankWorkspace({ onboardingComplete: false })
        );
        setWorkspace(owner);
        return owner;
      },
      startOwnerOnboarding: () => {
        const next = createBlankWorkspace({
          onboardingComplete: false,
          ownerId: user?.uid || undefined,
          isDemo: false
        });
        localStorage.setItem(MODE_KEY, 'owner');
        localStorage.setItem(OWNER_KEY, JSON.stringify(next));
        setWorkspace(next);
        return next;
      },
      completeOnboarding: (patch = {}) => {
        setWorkspace((prev) => {
          const next = {
            ...createBlankWorkspace({
              ...prev,
              ...patch,
              ownerId: user?.uid || prev.ownerId || patch.ownerId,
              website: {
                ...prev.website,
                ...(patch.website || {}),
                pages: {
                  ...prev.website?.pages,
                  ...(patch.website?.pages || {})
                }
              },
              onboardingComplete: true,
              isDemo: false
            })
          };
          localStorage.setItem(MODE_KEY, 'owner');
          localStorage.setItem(OWNER_KEY, JSON.stringify(next));
          if (user?.uid) {
            saveOwnerWorkspaceToFirestore(user.uid, { ...next, ownerId: user.uid }).catch(() => {});
          }
          return next;
        });
      },
      bindOwnerId: (ownerId) => {
        if (!ownerId) return;
        setWorkspace((prev) =>
          prev.isDemo ? prev : { ...prev, ownerId, isDemo: false }
        );
      }
    };
  }, [workspace, user?.uid]);

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
