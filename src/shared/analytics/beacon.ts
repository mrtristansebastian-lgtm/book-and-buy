import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../firebase/client';
import { analyticsCartPath, analyticsSessionPath } from '../firebase/paths';
import {
  GEO_CACHE_MS,
  LIVE_VISITOR_WINDOW_MS,
  presenceWriteDue,
  roundApproxCoordinate,
  shouldReuseAnalyticsSession,
  validGeoCoordinates
} from './livePresence';

const SESSION_KEY = 'bb_analytics_sid';
const WRITE_KEY = 'bb_analytics_presence_write';
const GEO_KEY = 'bb_analytics_geo';

export type AnalyticsEventType =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'booking_started'
  | 'booking_confirmed';

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
let commerceOnly = false;
const memoryStorage = new Map<string, Record<string, unknown>>();

function isBot(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|headless/i.test(ua);
}

function prefersDnt(): boolean {
  if (typeof navigator === 'undefined') return false;
  const dnt = (navigator as Navigator & { doNotTrack?: string }).doNotTrack;
  return dnt === '1' || dnt === 'yes';
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

function getAnalyticsSession(ctx: SessionContext, now = Date.now()) {
  const key = `${SESSION_KEY}:${storageScope(ctx)}`;
  const stored = readStoredJson(key);
  const storedId = String(stored?.id || '');
  const startedAt = Number(stored?.startedAt || 0);
  const reusable = shouldReuseAnalyticsSession(stored, now);
  const session = reusable
    ? { id: storedId, startedAt, lastActivityAt: now }
    : { id: createSessionId(), startedAt: now, lastActivityAt: now };
  writeStoredJson(key, session);
  return session;
}

export function getAnalyticsSessionId(ctx: SessionContext): string {
  return getAnalyticsSession(ctx).id;
}

export function getAnalyticsCartId(ctx: SessionContext): string {
  return `cart_${getAnalyticsSessionId(ctx)}`;
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
  return isFirebaseConfigured() && !isBot() && !prefersDnt() && !commerceOnly;
}

function canWriteCommerce(): boolean {
  return isFirebaseConfigured() && !isBot();
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

async function upsertSession(ctx: SessionContext, path: string) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`bb-presence:${storageScope(ctx)}`, () => writePresence(ctx, path));
  }
  return writePresence(ctx, path);
}

async function writePresence(ctx: SessionContext, path: string) {
  if (!canWritePresence()) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  const firebase = getFirebase();
  if (!firebase || !ctx.slug || !ctx.ownerId) return;

  const now = Date.now();
  const session = getAnalyticsSession(ctx, now);
  if (!presenceWriteAllowed(ctx, now)) return;
  const geo = await resolveGeo();
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
        startedAt: session.startedAt,
        lastSeenAt: now,
        path: String(path || '/').slice(0, 500),
        referrer:
          typeof document !== 'undefined' ? String(document.referrer || '').slice(0, 500) : '',
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
  extra: Record<string, unknown> = {}
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
    const ref = doc(collection(firebase.db, 'artifacts', APP_ID, 'analyticsEvents'));
    await setDoc(ref, {
      type,
      sessionId: getAnalyticsSessionId(ctx),
      slug: ctx.slug,
      ownerId: ctx.ownerId,
      at: Date.now(),
      path: String(ctx.path || lastPath || '/').slice(0, 500),
      ...extra,
      createdAt: serverTimestamp()
    });
  } catch {
    /* best-effort */
  }
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
  commerceOnly = prefersDnt();
  if (!ctx.slug || !ctx.ownerId) return () => {};
  if (isBot()) return () => {};

  const recordActivity = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const nextPath = currentPublicPath(ctx.path || '/');
    if (!commerceOnly) void upsertSession({ ...ctx, path: nextPath }, nextPath);
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
  if (commerceOnly || !canWritePresence()) return;
  lastPath = path;
  void upsertSession(ctx, path);
  void trackAnalyticsEvent('page_view', { ...ctx, path });
}

export function reportProductView(
  ctx: SessionContext,
  product: { id?: string; name?: string }
) {
  if (!canWritePresence()) return;
  void trackAnalyticsEvent('product_view', ctx, {
    productId: product.id || '',
    productName: String(product.name || '').slice(0, 160)
  });
}

export const LIVE_WINDOW_MS = LIVE_VISITOR_WINDOW_MS;
