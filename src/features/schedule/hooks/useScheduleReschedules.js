import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase } from '../../../shared/firebase/client';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { demoScheduleReschedules, mapScheduleReschedules } from '../utils/scheduleReschedules';

const empty = () => ({ pendingIds: new Set(), proposalsByBooking: new Map(), incomplete: false });
export function useScheduleReschedules() {
  const { workspace } = useWorkspace();
  const ownerId = workspace.ownerId || '';
  const demo = workspace.isDemo === true;
  const scope = `${demo ? 'demo' : 'owner'}:${ownerId}`;
  const [remote, setRemote] = useState(() => ({ scope: '', ...empty(), loading: false, error: '' }));
  const local = useMemo(() => demoScheduleReschedules(workspace.threads), [workspace.threads]);
  useEffect(() => {
    let active = true;
    setRemote({ scope, ...empty(), loading: !demo && Boolean(ownerId), error: '' });
    if (demo || !ownerId) return undefined;
    const firebase = getFirebase();
    if (!firebase) { setRemote({ scope, ...empty(), loading: false, error: 'Reschedule updates are not connected. Reconnect to see current requests.' }); return undefined; }
    const proposals = query(collection(firebase.db, 'artifacts', APP_ID, 'users', ownerId, 'rescheduleProposals'), where('status', '==', 'pending'), limit(201));
    const unsubscribe = onSnapshot(proposals, snapshot => {
      if (active) setRemote({ scope, ...mapScheduleReschedules(snapshot.docs.map(document => ({ id: document.id, data: document.data() })), ownerId), loading: false, error: '' });
    }, () => {
      if (active) setRemote({ scope, ...empty(), loading: false, error: 'Reschedule requests could not load. Reconnect to see current requests.' });
    });
    return () => { active = false; unsubscribe(); };
  }, [scope, demo, ownerId]);
  if (demo) return { ...local, loading: false, error: '' };
  if (remote.scope !== scope) return { ...empty(), loading: Boolean(ownerId), error: '' };
  return { pendingIds: remote.pendingIds, proposalsByBooking: remote.proposalsByBooking, loading: remote.loading,
    error: remote.error, incomplete: remote.incomplete };
}
