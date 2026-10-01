import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  Timestamp,
  onSnapshot,
  orderBy,
  query,
  where,
  limit
} from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  LIVE_COMMERCE_WINDOW_MS,
  analyticsTimestampMs
} from '../../../shared/analytics/livePresence';
import { useLivePresence } from './useLivePresence';
import {
  activeCartRows,
  buildDemoAnalytics,
  buildMetricSeries,
  computeAnalyticsKpis,
  computeFunnel,
  computeLiveStrip,
  filterByPeriod,
  liveSessionRows,
  rankPaths,
  rankProducts,
  rankReferrers,
  rollupGeo
} from '../utils/analyticsMetrics';

function mapDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function useAnalyticsLive(periodId = 'week', customRange = {}, options = {}) {
  const { metricId = 'revenue', mode = 'report' } = options;
  const liveMode = mode === 'live';
  const { user, isLocalMode } = useAuth();
  const { workspace, orders, bookings, products } = useWorkspace();
  const ownerId = user?.uid || workspace?.ownerId || '';
  const allowDemo = Boolean(workspace?.isDemo) || (!user && (isLocalMode || !isFirebaseConfigured()));
  const configured = isFirebaseConfigured() && !isLocalMode && Boolean(ownerId) && !workspace?.isDemo;

  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [usingDemo, setUsingDemo] = useState(allowDemo);
  const presence = useLivePresence({ enabled: liveMode });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (liveMode) {
      setSessions([]);
      setEvents([]);
      setError('');
      setUsingDemo(presence.usingDemo);
      if (!configured) {
        setCarts(
          allowDemo
            ? buildDemoAnalytics({ now: presence.activityNow || Date.now() }).carts
            : []
        );
        setLoading(false);
        return undefined;
      }

      const firebase = getFirebase();
      if (!firebase) {
        setCarts([]);
        setLoading(false);
        return undefined;
      }

      setCarts([]);
      setLoading(true);
      const cutoff = Timestamp.fromMillis(Date.now() - LIVE_COMMERCE_WINDOW_MS);
      const cartsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsCarts'),
        where('ownerId', '==', ownerId),
        where('serverUpdatedAt', '>=', cutoff),
        orderBy('serverUpdatedAt', 'desc'),
        limit(200)
      );
      return onSnapshot(
        cartsQ,
        (snap) => {
          setCarts(
            mapDocs(snap).map((cart) => ({
              ...cart,
              updatedAt:
                analyticsTimestampMs(cart.serverUpdatedAt) || Number(cart.updatedAt || 0)
            }))
          );
          setLoading(false);
        },
        (err) => {
          setCarts([]);
          setError(err?.message || 'Could not load live carts');
          setLoading(false);
        }
      );
    }

    if (!configured) {
      if (allowDemo) {
        const demo = buildDemoAnalytics();
        setSessions(demo.sessions);
        setEvents(demo.events);
        setCarts(demo.carts);
        setUsingDemo(true);
      } else {
        setSessions([]);
        setEvents([]);
        setCarts([]);
        setUsingDemo(false);
      }
      setLoading(false);
      return undefined;
    }

    const firebase = getFirebase();
    if (!firebase) {
      setSessions([]);
      setEvents([]);
      setCarts([]);
      setUsingDemo(false);
      setLoading(false);
      return undefined;
    }

    setUsingDemo(false);
    setLoading(true);
    setError('');

    const unsubscribers = [];
    try {
      const sessionsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsSessions'),
        where('ownerId', '==', ownerId),
        limit(400)
      );
      unsubscribers.push(
        onSnapshot(
          sessionsQ,
          (snap) => {
            const rows = mapDocs(snap).sort(
              (a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)
            );
            setSessions(rows);
            setLoading(false);
          },
          (err) => {
            setError(err.message || 'Could not load sessions');
            setLoading(false);
            setSessions([]);
            setEvents([]);
            setCarts([]);
            setUsingDemo(false);
          }
        )
      );

      const eventsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsEvents'),
        where('ownerId', '==', ownerId),
        limit(800)
      );
      unsubscribers.push(
        onSnapshot(
          eventsQ,
          (snap) =>
            setEvents(
              mapDocs(snap).sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
            ),
          () => {}
        )
      );

      const cartsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsCarts'),
        where('ownerId', '==', ownerId),
        limit(200)
      );
      unsubscribers.push(
        onSnapshot(
          cartsQ,
          (snap) =>
            setCarts(
              mapDocs(snap).sort(
                (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)
              )
            ),
          () => {}
        )
      );
    } catch (err) {
      setError(err?.message || 'Analytics unavailable');
      setSessions([]);
      setEvents([]);
      setCarts([]);
      setUsingDemo(false);
      setLoading(false);
    }

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [configured, ownerId, allowDemo, liveMode]);

  const effectiveSessions = liveMode ? presence.liveSessions : sessions;
  const effectiveUsingDemo = liveMode ? presence.usingDemo : usingDemo;

  const periodSessions = useMemo(
    () => filterByPeriod(effectiveSessions, periodId, customRange, 'startedAt'),
    [effectiveSessions, periodId, customRange]
  );
  const periodEvents = useMemo(
    () => filterByPeriod(events, periodId, customRange, 'at'),
    [events, periodId, customRange]
  );
  const periodCarts = useMemo(
    () => filterByPeriod(carts, periodId, customRange, 'updatedAt'),
    [carts, periodId, customRange]
  );

  // Freeze demo activity at the moment its fixture was created so the live
  // preview does not expire while someone is reviewing the page.
  const activityNow = useMemo(() => {
    if (liveMode) return presence.activityNow;
    if (!usingDemo) return now;
    const fixtureNow = Math.max(0, ...carts.map((cart) => Number(cart.updatedAt || 0)));
    return fixtureNow || now;
  }, [liveMode, presence.activityNow, usingDemo, carts, now]);

  const live = useMemo(
    () => computeLiveStrip({ sessions: effectiveSessions, carts, now: activityNow }),
    [effectiveSessions, carts, activityNow]
  );
  const liveSessions = useMemo(
    () => liveSessionRows(effectiveSessions, activityNow),
    [effectiveSessions, activityNow]
  );

  const kpis = useMemo(
    () =>
      computeAnalyticsKpis({
        sessions: periodSessions,
        events: periodEvents,
        carts: periodCarts,
        orders,
        bookings
      }),
    [periodSessions, periodEvents, periodCarts, orders, bookings]
  );

  const funnel = useMemo(
    () => computeFunnel({ events: periodEvents, sessions: periodSessions }),
    [periodEvents, periodSessions]
  );

  const series = useMemo(
    () =>
      buildMetricSeries({
        metricId,
        events: periodEvents,
        sessions: periodSessions,
        carts: periodCarts,
        orders,
        bookings,
        products,
        periodId,
        customRange
      }),
    [
      metricId,
      periodEvents,
      periodSessions,
      periodCarts,
      orders,
      bookings,
      products,
      periodId,
      customRange
    ]
  );

  const geo = useMemo(() => rollupGeo(periodSessions), [periodSessions]);
  const topPaths = useMemo(
    () => rankPaths(periodSessions, periodEvents),
    [periodSessions, periodEvents]
  );
  const topProducts = useMemo(() => rankProducts(periodEvents), [periodEvents]);
  const topReferrers = useMemo(() => rankReferrers(periodSessions), [periodSessions]);
  const activeCarts = useMemo(
    () => activeCartRows(carts, activityNow),
    [carts, activityNow]
  );

  return {
    loading: liveMode ? loading || presence.loading : loading,
    error: liveMode ? error || presence.error : error,
    usingDemo: effectiveUsingDemo,
    activityNow,
    live,
    liveSessions,
    liveCountLabel: liveMode ? presence.liveCountLabel : String(live.liveVisitors || 0),
    liveCapped: liveMode ? presence.capped : false,
    kpis,
    funnel,
    series,
    geo,
    topPaths,
    topProducts,
    topReferrers,
    activeCarts,
    currency: workspace.currency || 'R'
  };
}
