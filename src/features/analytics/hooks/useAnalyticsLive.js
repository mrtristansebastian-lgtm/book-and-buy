import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  limit
} from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  activeCartRows,
  buildDemoAnalytics,
  buildSalesSeries,
  computeAnalyticsKpis,
  computeFunnel,
  computeLiveStrip,
  filterByPeriod,
  rankPaths,
  rankProducts,
  rankReferrers,
  rollupGeo
} from '../utils/analyticsMetrics';

function mapDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function useAnalyticsLive(periodId = 'week', customRange = {}) {
  const { user, isLocalMode } = useAuth();
  const { workspace, orders, bookings } = useWorkspace();
  const ownerId = user?.uid || workspace?.ownerId || '';
  const configured = isFirebaseConfigured() && !isLocalMode && Boolean(ownerId);

  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [usingDemo, setUsingDemo] = useState(!configured);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!configured) {
      const demo = buildDemoAnalytics();
      setSessions(demo.sessions);
      setEvents(demo.events);
      setCarts(demo.carts);
      setUsingDemo(true);
      setLoading(false);
      return undefined;
    }

    const firebase = getFirebase();
    if (!firebase) {
      const demo = buildDemoAnalytics();
      setSessions(demo.sessions);
      setEvents(demo.events);
      setCarts(demo.carts);
      setUsingDemo(true);
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
            const demo = buildDemoAnalytics();
            setSessions(demo.sessions);
            setEvents(demo.events);
            setCarts(demo.carts);
            setUsingDemo(true);
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
      const demo = buildDemoAnalytics();
      setSessions(demo.sessions);
      setEvents(demo.events);
      setCarts(demo.carts);
      setUsingDemo(true);
      setLoading(false);
    }

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [configured, ownerId]);

  const periodSessions = useMemo(
    () => filterByPeriod(sessions, periodId, customRange, 'startedAt'),
    [sessions, periodId, customRange]
  );
  const periodEvents = useMemo(
    () => filterByPeriod(events, periodId, customRange, 'at'),
    [events, periodId, customRange]
  );
  const periodCarts = useMemo(
    () => filterByPeriod(carts, periodId, customRange, 'updatedAt'),
    [carts, periodId, customRange]
  );

  const live = useMemo(
    () => computeLiveStrip({ sessions, carts, now }),
    [sessions, carts, now]
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
      buildSalesSeries({
        events: periodEvents,
        orders,
        bookings,
        periodId,
        customRange
      }),
    [periodEvents, orders, bookings, periodId, customRange]
  );

  const geo = useMemo(() => rollupGeo(periodSessions), [periodSessions]);
  const topPaths = useMemo(
    () => rankPaths(periodSessions, periodEvents),
    [periodSessions, periodEvents]
  );
  const topProducts = useMemo(() => rankProducts(periodEvents), [periodEvents]);
  const topReferrers = useMemo(() => rankReferrers(periodSessions), [periodSessions]);
  const activeCarts = useMemo(() => activeCartRows(carts, now), [carts, now]);

  return {
    loading,
    error,
    usingDemo,
    live,
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
