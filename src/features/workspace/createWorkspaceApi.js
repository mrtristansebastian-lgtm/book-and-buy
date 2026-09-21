import { createDemoWorkspace, hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { createBlankWorkspace } from '../../data/blankWorkspace';
import { normalizeService, normalizeServiceList, collectServiceCategories } from '../../utils/services';
import { collectProductCategories, normalizeProduct } from '../../utils/products';
import { createPublicProductOrder } from '../../utils/orders';
import { saveOwnerWorkspaceToFirestore } from '../../shared/firebase/ownerWorkspace';
import {
  canEditAvailabilityRules,
  canEditStaffAvailability
} from '../../utils/staffAccess';
import { normalizeAvailabilityRules } from '../../utils/staffAvailability';
import { MODE_KEY, OWNER_KEY, DEMO_KEY, safeParse } from './workspacePersistence';
import { canUseCanonicalSocial, socialMutations } from '../social/socialApi';

export function createWorkspaceApi({ workspace, setWorkspace, user }) {
    const syncSocialPost = (post) => {
      if (!post?.id || workspace.isDemo || !canUseCanonicalSocial(user?.uid)) return;
      socialMutations
        .upsertPost({
          slug: workspace.slug,
          ownerId: user.uid,
          businessName: workspace.brandName || workspace.name || '',
          businessLogoUrl: workspace.website?.logoUrl || '',
          post
        })
        .catch(() => {});
    };
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
            },
            styleTokens: {
              ...prev.website?.styleTokens,
              ...(patch.styleTokens || {})
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
        syncSocialPost(record);
        return record;
      },
      updateSocialPost: (id, patch) => {
        const current = (workspace.socialPosts || []).find((post) => post.id === id);
        const nextPost = current ? { ...current, ...patch, id } : { ...patch, id };
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: (prev.socialPosts || []).map((post) =>
            post.id === id ? { ...post, ...patch } : post
          )
        }));
        syncSocialPost(nextPost);
      },
      removeSocialPost: (id) => {
        setWorkspace((prev) => ({
          ...prev,
          socialPosts: (prev.socialPosts || []).filter((post) => post.id !== id)
        }));
        if (!workspace.isDemo && canUseCanonicalSocial(user?.uid)) {
          socialMutations.deletePost({ slug: workspace.slug, postId: id }).catch(() => {});
        }
      },
      updateProfile: (patch) => {
        setWorkspace((prev) => ({ ...prev, ...patch }));
      },
      updateAvailabilityRules: (patch) => {
        if (!canEditAvailabilityRules({ user, workspace })) return;
        setWorkspace((prev) => ({
          ...prev,
          availabilityRules: normalizeAvailabilityRules({
            ...prev.availabilityRules,
            ...patch
          })
        }));
      },
      upsertStaffAvailability: (staffId, entry) => {
        if (!staffId) return;
        if (
          !canEditStaffAvailability({
            user,
            workspace,
            staff: workspace.staff || [],
            staffId
          })
        ) {
          return;
        }
        setWorkspace((prev) => ({
          ...prev,
          staffAvailability: {
            ...(prev.staffAvailability || {}),
            [staffId]: {
              ...(prev.staffAvailability?.[staffId] || { staffId }),
              ...entry,
              staffId
            }
          }
        }));
      },
      updateNotifications: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          notifications: { ...prev.notifications, ...patch }
        }));
      },
      updatePolicies: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          policies: { ...(prev.policies || {}), ...patch }
        }));
      },
      updatePlan: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          ...patch
        }));
      },
      updateFeatures: (patch) => {
        setWorkspace((prev) => ({
          ...prev,
          features: { ...(prev.features || {}), ...patch }
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
          const open = prev.availabilityRules?.businessOpenTime || '09:00';
          const close = prev.availabilityRules?.businessCloseTime || '17:00';
          const staffAvailability = { ...(prev.staffAvailability || {}) };
          if (!staffAvailability[next.id]) {
            staffAvailability[next.id] = {
              staffId: next.id,
              weekTemplate: {
                mon: { open: true, ranges: [{ start: open, end: close }] },
                tue: { open: true, ranges: [{ start: open, end: close }] },
                wed: { open: true, ranges: [{ start: open, end: close }] },
                thu: { open: true, ranges: [{ start: open, end: close }] },
                fri: { open: true, ranges: [{ start: open, end: close }] },
                sat: { open: false, ranges: [] },
                sun: { open: false, ranges: [] }
              },
              days: {},
              blocks: []
            };
          }
          return {
            ...prev,
            staff: exists
              ? prev.staff.map((item) => (item.id === next.id ? { ...item, ...next } : item))
              : [...(prev.staff || []), next],
            staffAvailability
          };
        });
      },
      removeStaff: (id) => {
        setWorkspace((prev) => {
          const staffAvailability = { ...(prev.staffAvailability || {}) };
          delete staffAvailability[id];
          return {
            ...prev,
            staff: (prev.staff || []).filter((member) => member.id !== id),
            staffAvailability
          };
        });
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
            brandName: prev.brandName || '',
            workspaceSlug: prev.slug || '',
            logoUrl: prev.logoUrl || prev.website?.logoUrl || '',
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now, visible: true },
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
            brandName: prev.brandName || '',
            workspaceSlug: prev.slug || '',
            logoUrl: prev.logoUrl || prev.website?.logoUrl || '',
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now, visible: true },
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
            subject: `Message · ${prev.brandName || client.name}`,
            clientId: client.id,
            brandName: prev.brandName || '',
            workspaceSlug: prev.slug || '',
            logoUrl: prev.logoUrl || prev.website?.logoUrl || '',
            unread: false,
            updatedAt: now,
            presence: { status: 'offline', lastSeenAt: now, visible: true },
            messages: [
              {
                id: `m-${now}`,
                type: 'text',
                from: 'business',
                body: `Hi ${client.name}, thanks for messaging ${prev.brandName}.`,
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
              ? {
                  ...thread,
                  presence: {
                    status: 'offline',
                    lastSeenAt: Date.now(),
                    visible: true,
                    ...(thread.presence || {}),
                    ...presence,
                    status:
                      String(presence?.status || thread.presence?.status || '').toLowerCase() ===
                      'online'
                        ? 'online'
                        : 'offline'
                  }
                }
              : thread
          )
        }));
      },
      setWorkspacePresence: (presence) => {
        setWorkspace((prev) => ({
          ...prev,
          presence: {
            status: 'offline',
            lastSeenAt: Date.now(),
            visible: prev.notifications?.showActivityStatus !== false,
            ...(prev.presence || {}),
            ...presence
          }
        }));
      },
      setClientPresence: (clientEmail, presence) => {
        const email = String(clientEmail || '').toLowerCase();
        if (!email) return;
        setWorkspace((prev) => ({
          ...prev,
          threads: (prev.threads || []).map((thread) =>
            String(thread.clientEmail || '').toLowerCase() === email
              ? {
                  ...thread,
                  presence: {
                    status: 'offline',
                    lastSeenAt: Date.now(),
                    visible: true,
                    ...(thread.presence || {}),
                    ...presence,
                    status:
                      String(presence?.status || '').toLowerCase() === 'online'
                        ? 'online'
                        : 'offline'
                  }
                }
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
        setWorkspace((prev) => {
          const list = [...(prev.paymentGateways || [])];
          const idx = list.findIndex((gateway) => gateway.gatewayType === gatewayType);
          const next = {
            gatewayType,
            enabled: false,
            mode: 'test',
            configured: false,
            credentialSummary: {},
            ...(idx >= 0 ? list[idx] : {}),
            ...patch,
            gatewayType,
            credentialSummary: {
              ...(idx >= 0 ? list[idx].credentialSummary || {} : {}),
              ...(patch.credentialSummary || {})
            },
            updatedAt: Date.now()
          };
          if (idx >= 0) list[idx] = next;
          else list.push(next);
          return { ...prev, paymentGateways: list };
        });
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

}
