import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../firebase/client';
import { analyticsCartPath, analyticsSessionPath } from '../firebase/paths';

const SESSION_KEY = 'bb_analytics_sid';
const GEO_KEY = 'bb_analytics_geo';
const HEARTBEAT_MS = 20_000;

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
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let visibilityBound = false;
let geoPromise: Promise<GeoInfo> | null = null;
let lastPath = '';
let sessionStartedAt = 0;
let commerceOnly = false;

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

export function getAnalyticsSessionId(): string {
  if (typeof sessionStorage === 'undefined') {
    return `tmp_${Date.now().toString(36)}`;
  }
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getAnalyticsCartId(): string {
  return `cart_${getAnalyticsSessionId()}`;
}

async function resolveGeo(): Promise<GeoInfo> {
  if (typeof sessionStorage !== 'undefined') {
    const cached = sessionStorage.getItem(GEO_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as GeoInfo;
      } catch {
        /* ignore */
      }
    }
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
        city: String(data.city || '').slice(0, 80)
      };
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
      }
      return geo;
    } catch {
      return {};
    }
  })();
  return geoPromise;
}

function canWritePresence(): boolean {
  return isFirebaseConfigured() && !isBot() && !commerceOnly;
}

function canWriteCommerce(): boolean {
  return isFirebaseConfigured() && !isBot();
}

async function upsertSession(ctx: SessionContext, path: string) {
  if (!canWritePresence()) return;
  const firebase = getFirebase();
  if (!firebase || !ctx.slug || !ctx.ownerId) return;

  const sessionId = getAnalyticsSessionId();
  const now = Date.now();
  if (!sessionStartedAt) sessionStartedAt = now;
  const geo = await resolveGeo();
  const ref = doc(firebase.db, ...analyticsSessionPath(APP_ID, sessionId));
  try {
    await setDoc(
      ref,
      {
        sessionId,
        slug: ctx.slug,
        ownerId: ctx.ownerId,
        startedAt: sessionStartedAt,
        lastSeenAt: now,
        path: String(path || '/').slice(0, 500),
        referrer:
          typeof document !== 'undefined' ? String(document.referrer || '').slice(0, 500) : '',
        country: geo.country || '',
        region: geo.region || '',
        city: geo.city || '',
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
      sessionId: getAnalyticsSessionId(),
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

  const sessionId = getAnalyticsSessionId();
  const cartId = getAnalyticsCartId();
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

  const path =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.hash || ''}`.slice(0, 500)
      : ctx.path || '/';
  lastPath = path;

  if (!commerceOnly) {
    void upsertSession(ctx, path);
    void trackAnalyticsEvent('page_view', { ...ctx, path });
  }

  const tick = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const nextPath =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.hash || ''}`.slice(0, 500)
        : path;
    if (nextPath !== lastPath) {
      lastPath = nextPath;
      if (!commerceOnly) {
        void trackAnalyticsEvent('page_view', { ...ctx, path: nextPath });
      }
    }
    if (!commerceOnly) void upsertSession({ ...ctx, path: nextPath }, nextPath);
  };

  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(tick, HEARTBEAT_MS);

  if (!visibilityBound && typeof document !== 'undefined') {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick();
    });
  }

  return () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
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

export const LIVE_WINDOW_MS = 45_000;
