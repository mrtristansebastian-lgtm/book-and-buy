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
  getPeriodBounds,
  computeLiveStrip,
  filterByPeriod,
  liveSessionRows,
  rankPaths,
  rankProducts,
  rankReferrers,
  rollupGeo
} from '../utils/analyticsMetrics';
import { buildTrafficReport, buildPlacesReport, buildTrafficSeries } from '../utils/trafficReports';
import { buildCommerceReport } from '../utils/commerceReports';
import { buildReportDashboard } from '../utils/reportCatalog';

function mapDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function useAnalyticsLive(periodId = 'week', customRange = {}, options = {}) {
  const { metricId = 'sessions', mode = 'report' } = options;
  const liveMode = mode === 'live';
  const { user, isLocalMode } = useAuth();
  const { workspace, orders, bookings } = useWorkspace();
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
  const [coverage, setCoverage] = useState({ sessions: true, events: true, carts: false });
  const [cartTracking, setCartTracking] = useState(false);
  const bounds = getPeriodBounds(periodId, customRange);
  const reportStart = liveMode ? null : bounds.start;
  const reportEnd = liveMode ? null : bounds.end;
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
      setCoverage({ sessions: true, events: true, carts: true });
      setCartTracking(allowDemo);
      if (allowDemo) {
        const demo = buildDemoAnalytics({ orders, bookings, products: workspace.products, services: workspace.services });
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
    setSessions([]);
    setEvents([]);
    setCoverage({ sessions: false, events: false, carts: false });
    setCartTracking(false);
    setCarts([]);
    let readySessions = false;
    let readyEvents = false;
    let readyCarts = false;
    const finishLoading = () => setLoading(!(readySessions && readyEvents && readyCarts));
    const rangeConstraints = (key) => [
      ...(reportStart == null ? [] : [where(key, '>=', reportStart)]),
      ...(reportEnd == null ? [] : [where(key, '<=', reportEnd)]),
      orderBy(key, 'desc'), limit(1001)
    ];

    const unsubscribers = [];
    try {
      const sessionsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsSessions'),
        where('ownerId', '==', ownerId),
        ...rangeConstraints('startedAt')
      );
      unsubscribers.push(
        onSnapshot(
          sessionsQ,
          (snap) => {
            const rows = mapDocs(snap).sort(
              (a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0)
            );
            setSessions(rows.slice(0, 1000));
            setCoverage((current) => ({ ...current, sessions: snap.size <= 1000 }));
            readySessions = true;
            finishLoading();
          },
          (err) => {
            setError('Visitor data could not be loaded. Try again when the connection and analytics indexes are ready.');
            readySessions = true;
            finishLoading();
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
        ...rangeConstraints('at')
      );
      unsubscribers.push(
        onSnapshot(
          eventsQ,
          (snap) => {
            setEvents(mapDocs(snap).slice(0, 1000));
            setCoverage((current) => ({ ...current, events: snap.size <= 1000 }));
            readyEvents = true;
            finishLoading();
          },
          () => {
            setEvents([]);
            setCoverage((current) => ({ ...current, events: false }));
            setError('Traffic events could not be loaded. Insights may be incomplete.');
            readyEvents = true;
            finishLoading();
          }
        )
      );

      const cartsQ = query(
        collection(firebase.db, 'artifacts', APP_ID, 'analyticsCarts'),
        where('ownerId', '==', ownerId),
        ...(reportStart == null ? [] : [where('serverUpdatedAt', '>=', Timestamp.fromMillis(reportStart))]),
        ...(reportEnd == null ? [] : [where('serverUpdatedAt', '<=', Timestamp.fromMillis(reportEnd))]),
        orderBy('serverUpdatedAt', 'desc'),
        limit(1001)
      );
      unsubscribers.push(
        onSnapshot(
          cartsQ,
          (snap) => {
            setCarts(mapDocs(snap).slice(0, 1000).map(cart => ({ ...cart,
              updatedAt: analyticsTimestampMs(cart.serverUpdatedAt) || Number(cart.updatedAt || 0) })));
            setCartTracking(true);
            setCoverage(current => ({ ...current, carts: snap.size <= 1000 }));
            readyCarts = true;
            finishLoading();
          },
          () => {
            setCarts([]);
            setCartTracking(false);
            setCoverage(current => ({ ...current, carts: false }));
            setError('Cart activity could not be loaded. Cart insights may be incomplete.');
            readyCarts = true;
            finishLoading();
          }
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
  }, [configured, ownerId, allowDemo, liveMode, reportStart, reportEnd]);

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

  const complete = coverage.sessions && coverage.events && coverage.carts;
  const traffic = useMemo(() => buildTrafficReport({ sessions: periodSessions, events: periodEvents, start: reportStart, end: reportEnd, complete }), [periodSessions, periodEvents, reportStart, reportEnd, complete]);
  const discovery = useMemo(() => buildPlacesReport({ sessions: periodSessions, events: periodEvents, orders, bookings, start: reportStart, end: reportEnd, complete }), [periodSessions, periodEvents, orders, bookings, reportStart, reportEnd, complete]);
  const commerce = useMemo(() => buildCommerceReport({ sessions, events: periodEvents, carts: periodCarts,
    products: workspace.products || [], services: workspace.services || [], start: reportStart, end: reportEnd,
    now: activityNow, cartTracking }), [sessions, periodEvents, periodCarts, workspace.products, workspace.services, reportStart, reportEnd, activityNow, cartTracking]);
  const series = useMemo(() => buildTrafficSeries({ metricId, sessions: periodSessions, events: periodEvents, start: reportStart, end: reportEnd }), [metricId, periodSessions, periodEvents, reportStart, reportEnd]);
  const reports = useMemo(() => liveMode ? null : buildReportDashboard({ sessions, events, carts, orders, bookings,
    products: workspace.products || [], services: workspace.services || [], start: reportStart, end: reportEnd,
    now: activityNow, cartTracking, complete }), [liveMode, sessions, events, carts, orders, bookings, workspace.products, workspace.services, reportStart, reportEnd, activityNow, cartTracking, complete]);

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
    liveCountLabel: liveMode && presence.capped ? `${live.liveVisitors}+` : String(live.liveVisitors || 0),
    liveCapped: liveMode ? presence.capped : false,
    traffic,
    discovery,
    commerce,
    reports,
    complete,
    series,
    geo,
    topPaths,
    topProducts,
    topReferrers,
    activeCarts,
    currency: workspace.currency || 'R'
  };
}
