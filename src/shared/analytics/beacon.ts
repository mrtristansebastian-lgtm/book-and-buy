import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../firebase/client';
import { analyticsCartPath, analyticsSessionPath } from '../firebase/paths';
import {
  GEO_CACHE_MS,
  LIVE_VISITOR_WINDOW_MS,
  presenceWriteDue,
  roundApproxCoordinate,
  validGeoCoordinates
} from './livePresence';
import { anonymousMetadata, doNotTrackEnabled, nextAnonymousIdentity } from './anonymousIdentity';
import { DISCOVERY_SURFACES, discoveryEventMetadata, discoveryImpressionId } from './discoveryAttribution';

const SESSION_KEY = 'bb_analytics_sid';
const WRITE_KEY = 'bb_analytics_presence_write';
const GEO_KEY = 'bb_analytics_geo';
const VISITOR_KEY = 'bb_analytics_visitor';
const MESSAGE_KEY = 'bb_analytics_message_context';
const DISCOVERY_KEY = 'bb_analytics_discovery';

export type AnalyticsEventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'booking_started'
  | 'booking_confirmed'
  | 'discovery_visit'
  | 'message_lead';

export type CartStatus = 'active' | 'checkout' | 'abandoned' | 'converted';

export type AnalyticsCartItem = {
  lineKey?: string;
  kind?: string;
  name?: string;
  quantity?: number;
  unitPriceCents?: number;
  productId?: string;
  serviceId?: string;
};

export type SessionContext = {
  slug: string;
  ownerId: string;
  path?: string;
  source?: 'places' | 'direct';
  discoverySurface?: 'places' | 'book' | 'buy';
};

type GeoInfo = {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

let geoPromise: Promise<GeoInfo> | null = null;
let lastPath = '';
const memoryStorage = new Map<string, Record<string, unknown>>();
const convertedCarts = new Set<string>();
const observedDiscoveryImpressions = new Set<string>();

function isBot(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|headless/i.test(ua);
}

function prefersDnt(): boolean {
  return doNotTrackEnabled(typeof navigator === 'undefined' ? null : navigator,
    typeof window === 'undefined' ? null : window);
}

function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function storageScope(ctx: SessionContext): string {
  return `${ctx.ownerId || 'owner'}:${ctx.slug || 'store'}`.replace(/[^a-zA-Z0-9:_-]/g, '_');
}

function readStoredJson(key: string): Record<string, unknown> | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : memoryStorage.get(key) || null;
  } catch {
    return memoryStorage.get(key) || null;
  }
}

function writeStoredJson(key: string, value: Record<string, unknown>) {
  memoryStorage.set(key, value);
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage is best-effort */
  }
}

function createSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getAnalyticsSession(ctx: SessionContext, now = Date.now(), impression = false) {
  const identityScope = impression ? `impression:${storageScope(ctx)}` : storageScope(ctx);
  const key = `${SESSION_KEY}:${identityScope}`;
  const visitorKey = `${VISITOR_KEY}:${identityScope}`;
  const { session, visitor } = nextAnonymousIdentity({
    storedSession: readStoredJson(key), storedVisitor: readStoredJson(visitorKey),
    source: impression ? 'direct' : ctx.source, now, createId: createSessionId
  });
  writeStoredJson(visitorKey, visitor);
  writeStoredJson(key, session);
  return session;
}

/** Visibility is independent of the customer's first actual business visit. */
function getDiscoveryImpressionSession(ctx: SessionContext) {
  return getAnalyticsSession(ctx, Date.now(), true);
}

export function getAnalyticsSessionId(ctx: SessionContext): string {
  if (!canWritePresence() || !ctx.ownerId || !ctx.slug) return '';
  return getAnalyticsSession(ctx).id;
}

export function getAnalyticsCartId(ctx: SessionContext): string {
  const sessionId = getAnalyticsSessionId(ctx);
  return sessionId ? `cart_${sessionId}` : '';
}

async function resolveGeo(): Promise<GeoInfo> {
  const cached = readStoredJson(GEO_KEY);
  if (cached && Date.now() - Number(cached.fetchedAt || 0) <= GEO_CACHE_MS) {
    return cached as GeoInfo;
  }
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return {};
      const data = await res.json();
      if (!data?.success) return {};
      const geo: GeoInfo = {
        country: String(data.country_code || data.country || '').slice(0, 64),
        region: String(data.region || '').slice(0, 80),
        city: String(data.city || '').slice(0, 80),
        latitude: roundApproxCoordinate(data.latitude) ?? undefined,
        longitude: roundApproxCoordinate(data.longitude) ?? undefined
      };
      writeStoredJson(GEO_KEY, { ...geo, fetchedAt: Date.now() });
      return geo;
    } catch {
      return {};
    }
  })();
  try {
    return await geoPromise;
  } finally {
    geoPromise = null;
  }
}

function canWritePresence(): boolean {
  return isFirebaseConfigured() && !isBot() && !prefersDnt();
}

function canWriteCommerce(): boolean {
  return canWritePresence();
}

function currentPublicPath(fallback = '/') {
  return typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.hash || ''}`.slice(0, 500)
    : fallback;
}

function presenceWriteAllowed(ctx: SessionContext, now: number) {
  const key = `${WRITE_KEY}:${storageScope(ctx)}`;
  const stored = readStoredJson(key);
  if (!presenceWriteDue(stored?.at, now)) return false;
  writeStoredJson(key, { at: now });
  return true;
}

async function upsertSession(ctx: SessionContext, path: string, force = false) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`bb-presence:${storageScope(ctx)}`, () => writePresence(ctx, path, force));
  }
  return writePresence(ctx, path, force);
}

async function writePresence(ctx: SessionContext, path: string, force = false) {
  if (!canWritePresence()) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const firebase = getFirebase();
  if (!firebase || !ctx.slug || !ctx.ownerId) return;

  const now = Date.now();
  const session = getAnalyticsSession(ctx, now);
  if (!force && !presenceWriteAllowed(ctx, now)) return;
  const geo = await resolveGeo();
  if (!canWritePresence()) return;
  const ref = doc(firebase.db, ...analyticsSessionPath(APP_ID, session.id));
  const coordinates = validGeoCoordinates(geo.latitude, geo.longitude)
    ? { latitude: geo.latitude, longitude: geo.longitude }
    : {};
  try {
    await setDoc(
      ref,
      {
        sessionId: session.id,
        slug: ctx.slug,
        ownerId: ctx.ownerId,
        ...anonymousMetadata(session),
        startedAt: session.startedAt,
        lastSeenAt: now,
        path: String(path || '/').slice(0, 500),
        referrer: safeReferrer(),
        country: geo.country || '',
        region: geo.region || '',
        city: geo.city || '',
        ...coordinates,
        device: deviceLabel(),
        isBot: false,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch {
    /* best-effort */
  }
}

export async function trackAnalyticsEvent(
  type: AnalyticsEventType,
  ctx: SessionContext,
  extra: Record<string, unknown> = {},
  eventId?: string
) {
  const commerce =
    type === 'purchase' ||
    type === 'booking_confirmed' ||
    type === 'add_to_cart' ||
    type === 'begin_checkout' ||
    type === 'booking_started';
  if (commerce ? !canWriteCommerce() : !canWritePresence()) return;
  const firebase = getFirebase();
  if (!firebase || !ctx.slug || !ctx.ownerId) return;

  try {
    const session = type === 'discovery_visit' && extra.discoveryAction === 'impression'
      ? getDiscoveryImpressionSession(ctx) : getAnalyticsSession(ctx);
    const ref = eventId ? doc(firebase.db, 'artifacts', APP_ID, 'analyticsEvents', eventId) :
      doc(collection(firebase.db, 'artifacts', APP_ID, 'analyticsEvents'));
    await setDoc(ref, {
      ...extra,
      ...discoveryEventMetadata({
        surface: ctx.discoverySurface,
        stored: readStoredJson(`${DISCOVERY_KEY}:${storageScope(ctx)}`),
        sessionId: session.id
      }),
      type,
      sessionId: session.id,
      slug: ctx.slug,
      ownerId: ctx.ownerId,
      ...anonymousMetadata(session),
      at: Date.now(),
      path: String(ctx.path || lastPath || '/').slice(0, 500),
      createdAt: serverTimestamp()
    });
  } catch {
    /* best-effort */
  }
}

/** Strip referrer queries/fragments, which can contain email addresses or payment tokens. */
function safeReferrer() {
  try {
    const url = new URL(typeof document === 'undefined' ? '' : document.referrer);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch { return ''; }
}

export function reportDiscoveryVisit(
  ctx: SessionContext,
  { surface = 'places', target = 'business' }: { surface?: 'places' | 'book' | 'buy'; target?: 'business' | 'offer' } = {}
) {
  if (!canWritePresence() || !ctx.slug || !ctx.ownerId) return;
  const entry: SessionContext = { ...ctx, source: 'places', discoverySurface: surface, path: `/app/find/${surface}` };
  const session = getAnalyticsSession(entry);
  writeStoredJson(`${DISCOVERY_KEY}:${storageScope(ctx)}`, { sessionId: session.id, surface });
  void upsertSession(entry, entry.path!, true);
  if (target === 'business') void trackAnalyticsEvent('discovery_visit', entry, {
    discoveryAction: 'business_open', discoveryTarget: 'business'
  });
}

export function reportDiscoveryImpression(
  ctx: SessionContext,
  surface: 'places' | 'book' | 'buy',
  item?: { id?: string; name?: string; kind?: string }
) {
  if (!canWritePresence() || !ctx.slug || !ctx.ownerId || !DISCOVERY_SURFACES.includes(surface)) return;
  const session = getDiscoveryImpressionSession(ctx);
  const kind = item ? (item.kind === 'service' || item.kind === 'book' ? 'service' : 'product') : 'business';
  const eventId = discoveryImpressionId({ sessionId: session.id, surface, itemKind: kind, itemId: item?.id || '' });
  if (observedDiscoveryImpressions.has(eventId)) return;
  observedDiscoveryImpressions.add(eventId);
  // Impressions do not create presence documents or change the visit's acquisition source.
  void trackAnalyticsEvent('discovery_visit', { ...ctx, discoverySurface: surface, path: `/app/find/${surface}` }, {
    discoveryAction: 'impression', discoveryTarget: kind,
    ...(item ? { itemKind: kind, itemName: String(item.name || '').slice(0, 160),
      ...(kind === 'service' ? { serviceId: item.id || '' } : { productId: item.id || '' }) } : {})
  }, eventId);
}

export function rememberMessageAnalytics(threadId: string, ctx: SessionContext) {
  if (!canWritePresence() || !threadId || !ctx.ownerId || !ctx.slug) return;
  writeStoredJson(`${MESSAGE_KEY}:${threadId}`, { ownerId: ctx.ownerId, slug: ctx.slug });
}

export function hasMessageAnalyticsContext(threadId: string): boolean {
  return canWritePresence() && Boolean(readStoredJson(`${MESSAGE_KEY}:${threadId}`));
}

/** Called only after a first client message has successfully committed. No thread ID in event data. */
export async function reportMessageLead(threadId: string) {
  if (!canWritePresence() || !/^[a-zA-Z0-9_-]{1,128}$/.test(threadId)) return;
  const stored = readStoredJson(`${MESSAGE_KEY}:${threadId}`);
  if (!stored?.ownerId || !stored?.slug) return;
  const ctx = { ownerId: String(stored.ownerId), slug: String(stored.slug), path: '/app/messages' };
  try {
    await upsertSession(ctx, ctx.path, true);
    // Events are create-only in rules, so retries and concurrent first sends cannot double-count.
    await trackAnalyticsEvent('message_lead', ctx, {}, `message_lead_${threadId}`);
  } catch { /* The successfully sent message must not be affected by analytics. */ }
}

/** Optional attribution must never prevent a booking/order or opt-out. */
export async function getAnalyticsAttribution(ctx: SessionContext) {
  if (!canWritePresence() || !ctx.ownerId || !ctx.slug) return {};
  try {
    const session = getAnalyticsSession(ctx);
    await upsertSession(ctx, currentPublicPath(), true);
    if (!canWritePresence()) return {};
    return { analyticsSessionId: session.id, analyticsSource: session.source };
  } catch { return {}; }
}

export async function upsertAnalyticsCart(
  ctx: SessionContext,
  {
    items = [],
    status = 'active',
    valueCents = 0
  }: {
    items?: AnalyticsCartItem[];
    status?: CartStatus;
    valueCents?: number;
  }
) {
  if (!canWriteCommerce()) return;
  const firebase = getFirebase();
  if (!firebase || !ctx.slug || !ctx.ownerId) return;

  const sessionId = getAnalyticsSessionId(ctx);
  const cartId = getAnalyticsCartId(ctx);
  // Checkout removes submitted lines from the UI cart. That cleanup must not
  // overwrite a successful conversion with an empty abandoned-cart snapshot.
  if (status === 'converted') convertedCarts.add(cartId);
  else if (items.length > 0) convertedCarts.delete(cartId);
  else if (status === 'abandoned' && convertedCarts.has(cartId)) return;
  const ref = doc(firebase.db, ...analyticsCartPath(APP_ID, cartId));
  const safeItems = (items || []).slice(0, 50).map((item) => ({
    lineKey: String(item.lineKey || '').slice(0, 120),
    kind: String(item.kind || '').slice(0, 40),
    name: String(item.name || '').slice(0, 160),
    quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
    unitPriceCents: Math.max(0, Math.round(Number(item.unitPriceCents) || 0)),
    productId: String(item.productId || '').slice(0, 80),
    serviceId: String(item.serviceId || '').slice(0, 80)
  }));

  try {
    await setDoc(
      ref,
      {
        cartId,
        sessionId,
        slug: ctx.slug,
        ownerId: ctx.ownerId,
        status,
        valueCents: Math.max(0, Math.round(Number(valueCents) || 0)),
        items: safeItems,
        updatedAt: Date.now(),
        serverUpdatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch {
    /* best-effort */
  }
}

export function startAnalyticsBeacon(ctx: SessionContext) {
  if (!ctx.slug || !ctx.ownerId) return () => {};
  if (isBot() || prefersDnt()) return () => {};

  const recordActivity = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const nextPath = currentPublicPath(ctx.path || '/');
    void upsertSession({ ...ctx, path: nextPath }, nextPath);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') recordActivity();
  };
  document.addEventListener('pointerdown', recordActivity, { capture: true, passive: true });
  document.addEventListener('keydown', recordActivity, { capture: true });
  document.addEventListener('scroll', recordActivity, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    document.removeEventListener('pointerdown', recordActivity, true);
    document.removeEventListener('keydown', recordActivity, true);
    document.removeEventListener('scroll', recordActivity, true);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function reportPageView(ctx: SessionContext, path: string) {
  if (!canWritePresence()) return;
  lastPath = path;
  void upsertSession(ctx, path);
  void trackAnalyticsEvent('page_view', { ...ctx, path });
}

export function reportProductView(
  ctx: SessionContext,
  product: { id?: string; name?: string; kind?: string },
  interaction: 'view' | 'click' = 'view'
) {
  if (!canWritePresence()) return;
  const kind = product.kind === 'service' || product.kind === 'book' ? 'service' : 'product';
  void trackAnalyticsEvent('product_view', ctx, {
    commerceVersion: 1,
    interaction,
    itemKind: kind,
    ...(interaction === 'click' && ctx.discoverySurface ? { discoveryAction: 'offer_click' } : {}),
    ...(kind === 'service' ? { serviceId: product.id || '' } : { productId: product.id || '' }),
    itemName: String(product.name || '').slice(0, 160)
  });
}

export function reportOfferClick(ctx: SessionContext, item: { id?: string; name?: string; kind?: string }) {
  reportProductView(ctx, item, 'click');
}

export const LIVE_WINDOW_MS = LIVE_VISITOR_WINDOW_MS;
