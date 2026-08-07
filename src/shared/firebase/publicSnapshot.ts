/**
 * Public-safe workspace fields for Firestore `#/w/:slug` documents.
 * Never include bookings, orders, threads, or payment secrets.
 */

type AnyRecord = Record<string, unknown>;

function publicPaymentGateways(gateways: unknown) {
  if (!Array.isArray(gateways)) return [];
  return gateways
    .filter((gateway): gateway is AnyRecord => Boolean(gateway && typeof gateway === 'object' && (gateway as AnyRecord).enabled))
    .map((gateway) => ({
      gatewayType: gateway.gatewayType,
      enabled: true,
      mode: gateway.mode || 'live',
      label: gateway.label || gateway.gatewayType
    }));
}

function publicServices(services: unknown) {
  if (!Array.isArray(services)) return [];
  return services
    .filter((service): service is AnyRecord => Boolean(service && typeof service === 'object' && (service as AnyRecord).active !== false))
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      currency: service.currency,
      scheduleType: service.scheduleType,
      imageUrls: service.imageUrls || [],
      active: true
    }));
}

function publicProducts(products: unknown) {
  if (!Array.isArray(products)) return [];
  return products
    .filter((product): product is AnyRecord => Boolean(product && typeof product === 'object' && (product as AnyRecord).active !== false))
    .map((product) => ({
      id: product.id,
      name: product.name,
      title: product.title,
      description: product.description || '',
      price: product.price,
      priceInCents: product.priceInCents,
      currency: product.currency,
      image: product.image,
      imageUrls: product.imageUrls || [],
      stockNote: product.stockNote,
      active: true
    }));
}

function publicSocialPosts(posts: unknown) {
  if (!Array.isArray(posts)) return [];
  return posts
    .filter((post): post is AnyRecord => Boolean(post && typeof post === 'object' && (post as AnyRecord).published !== false))
    .map((post) => ({
      id: post.id,
      type: post.type || 'text',
      title: post.title || '',
      caption: post.caption || '',
      mediaUrl: post.mediaUrl || '',
      posterUrl: post.posterUrl || '',
      duration: post.duration || '',
      published: true,
      createdAt: post.createdAt || 0,
      order: post.order ?? 0
    }));
}

function publicStaff(staff: unknown) {
  if (!Array.isArray(staff)) return [];
  return staff
    .filter((member): member is AnyRecord => Boolean(member && typeof member === 'object'))
    .map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role || member.accessRole || 'Staff',
      color: member.color || '#111827'
    }));
}

export function buildPublicWorkspaceSnapshot(workspace: AnyRecord) {
  const ownerId = String(workspace.ownerId || '');
  const slug = String(workspace.slug || '');
  return {
    ownerId,
    slug,
    brandName: workspace.brandName || 'Business',
    tagline: workspace.tagline || '',
    email: workspace.email || '',
    phone: workspace.phone || '',
    welcomeMessage: workspace.welcomeMessage || '',
    website: workspace.website || {},
    socialPosts: publicSocialPosts(workspace.socialPosts),
    services: publicServices(workspace.services),
    products: publicProducts(workspace.products),
    staff: publicStaff(workspace.staff),
    availabilityRules: workspace.availabilityRules || {},
    staffAvailability: workspace.staffAvailability || {},
    paymentGateways: publicPaymentGateways(workspace.paymentGateways),
    published: true,
    publishedAt: Date.now(),
    updatedAt: Date.now()
  };
}
