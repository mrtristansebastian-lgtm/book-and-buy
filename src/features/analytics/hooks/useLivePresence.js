import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../../shared/firebase/client';
import {
  LIVE_VISITOR_WINDOW_MS,
  MAX_LIVE_SESSION_DOCS,
  analyticsTimestampMs
} from '../../../shared/analytics/livePresence';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { buildDemoAnalytics, liveSessionRows } from '../utils/analyticsMetrics';

function snapshotRows(snapshot) {
  return snapshot.docs.map((row) => {
    const data = row.data();
    const serverSeenAt = analyticsTimestampMs(data.updatedAt);
    return {
      id: row.id,
      ...data,
      lastSeenAt: serverSeenAt || analyticsTimestampMs(data.lastSeenAt)
    };
  });
}

export function useLivePresence({ enabled = true } = {}) {
  const { user, isLocalMode } = useAuth();
  const { workspace } = useWorkspace();
  const ownerId = user?.uid || workspace?.ownerId || '';
  const allowDemo = Boolean(workspace?.isDemo) || (!user && (isLocalMode || !isFirebaseConfigured()));
  const configured =
    enabled && isFirebaseConfigured() && !isLocalMode && Boolean(ownerId) && !workspace?.isDemo;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [demoNow, setDemoNow] = useState(0);
  const [usingDemo, setUsingDemo] = useState(enabled && allowDemo);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 4000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      setError('');
      setUsingDemo(false);
      setDemoNow(0);
      return undefined;
    }

    if (!configured) {
      if (allowDemo) {
        const fixtureNow = Date.now();
        setRows(buildDemoAnalytics({ now: fixtureNow }).sessions);
        setDemoNow(fixtureNow);
        setUsingDemo(true);
      } else {
        setRows([]);
        setDemoNow(0);
        setUsingDemo(false);
      }
      setLoading(false);
      setError('');
      return undefined;
    }

    const firebase = getFirebase();
    if (!firebase) return undefined;
    setRows([]);
    setLoading(true);
    setError('');
    setUsingDemo(false);
    setDemoNow(0);

    const cutoff = Timestamp.fromMillis(Date.now() - LIVE_VISITOR_WINDOW_MS);
    const sessionsQuery = query(
      collection(firebase.db, 'artifacts', APP_ID, 'analyticsSessions'),
      where('ownerId', '==', ownerId),
      where('updatedAt', '>=', cutoff),
      orderBy('updatedAt', 'desc'),
      limit(MAX_LIVE_SESSION_DOCS)
    );

    return onSnapshot(
      sessionsQuery,
      (snapshot) => {
        setRows(snapshotRows(snapshot));
        setLoading(false);
      },
      (snapshotError) => {
        setRows([]);
        setError(snapshotError?.message || 'Live visitors are unavailable.');
        setLoading(false);
      }
    );
  }, [enabled, configured, allowDemo, ownerId]);

  const activityNow = usingDemo ? demoNow || now : now;
  const liveSessions = useMemo(
    () => liveSessionRows(rows, activityNow),
    [rows, activityNow]
  );
  const capped = rows.length >= MAX_LIVE_SESSION_DOCS;

  return {
    loading,
    error,
    usingDemo,
    activityNow,
    liveSessions,
    liveCount: liveSessions.length,
    liveCountLabel: capped ? `${liveSessions.length}+` : String(liveSessions.length),
    capped
  };
}

