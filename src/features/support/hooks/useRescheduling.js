import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { APP_ID } from '../../../config/appConfig';
import { getFirebase } from '../../../shared/firebase/client';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { availableRescheduleSlots, businessClock, nextProposal, validateBookingSlot } from '../../../../functions/bookingDomain';

export function useRescheduling(thread, actor = 'business') {
  const { workspace, applyDemoReschedule } = useWorkspace();
  const localBooking = workspace.bookings?.find((b) => b.id === thread?.bookingId);
  const [context, setContext] = useState(null); const [open, setOpen] = useState(false);
  const [dateKey, setDateKey] = useState(''); const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const operation = useRef(null); const loadVersion = useRef(0);
  const demo = workspace.isDemo;
  const demoProposal = useMemo(() => [...(thread?.messages || [])].reverse().find((m) => m.type === 'reschedule')?.proposal || null, [thread?.messages]);
  const proposal = demo ? demoProposal : context?.proposal;
  const booking = demo ? localBooking : context?.booking;
  const timezone = (demo ? workspace.timezone : context?.timezone) || 'UTC';
  const clientAllowed = demo ? workspace.availabilityRules?.reschedulingAllowed !== false : context?.clientAllowed !== false;
  const today = businessClock(timezone).dateKey;
  useEffect(() => { ++loadVersion.current; setOpen(false); setContext(null); setError(''); setDateKey(''); setSlots([]); setLoading(false); operation.current = null; return () => { ++loadVersion.current; }; }, [thread?.id]);
  useEffect(() => {
    if (demo || !thread?.ownerId || !thread?.bookingId) return undefined;
    const firebase = getFirebase(); if (!firebase) return undefined;
    return onSnapshot(doc(firebase.db, 'artifacts', APP_ID, 'users', thread.ownerId, 'rescheduleProposals', thread.bookingId), (snap) => {
      setContext((prior) => prior ? { ...prior, proposal: snap.exists() ? snap.data() : null } : prior);
    }, () => {});
  }, [demo, thread?.id, thread?.ownerId, thread?.bookingId]);
  const load = async (day) => {
    const version = ++loadVersion.current; setLoading(true); setError('');
    try {
      if (demo) {
        if (!localBooking) throw new Error('Link an active booking to this conversation first.');
        setSlots(availableRescheduleSlots(workspace, localBooking, day, workspace.bookings));
      } else {
        const firebase = getFirebase(); if (!firebase) throw new Error('Sign in to manage booking times.');
        if (actor === 'business' && !thread.ownerId) {
          const ref = doc(firebase.db, 'artifacts', APP_ID, 'clientThreads', thread.id);
          if (!(await getDoc(ref)).exists()) await setDoc(ref, { ownerId: workspace.ownerId || firebase.auth.currentUser?.uid, bookingId: thread.bookingId, clientEmail: thread.clientEmail, clientName: thread.clientName || '', subject: thread.subject || 'Booking', brandName: workspace.brandName || '', updatedAt: Date.now(), createdAt: Date.now() });
        }
        const result = await firebaseCallables.getBookingRescheduleContext({ threadId: thread.id, dateKey: day });
        if (version === loadVersion.current) { setContext(result); setSlots(result.slots || []); }
      }
    } catch (failure) { if (version === loadVersion.current) { setError(failure.message || 'Could not load available times.'); setSlots([]); } }
    finally { if (version === loadVersion.current) setLoading(false); }
  };
  const show = async () => { const day = proposal?.proposed?.dateKey || today; setDateKey(day); setOpen(true); await load(day); };
  const changeDate = (value) => { setDateKey(value); operation.current = null; load(value); };
  const respond = async (action, proposed, note = '') => {
    if (busy) return false; setBusy(true); setError('');
    const signature = JSON.stringify({ action, proposed, note, revision: proposal?.revision || 0 });
    if (operation.current?.signature !== signature) operation.current = { signature, id: crypto.randomUUID() };
    try {
      if (demo) {
        if (!localBooking) throw new Error('Booking not found.');
        if (actor === 'client' && !clientAllowed && ['propose', 'counter'].includes(action)) throw new Error('This business does not allow client reschedule requests.');
        const next = nextProposal({ current: proposal, booking: localBooking, actor, action, slot: proposed, note, expectedRevision: proposal?.revision || 0, id: localBooking.id });
        if (['propose', 'counter', 'accept'].includes(action)) validateBookingSlot(workspace, localBooking, next.proposed, workspace.bookings);
        applyDemoReschedule(thread.id, { ...next, serviceName: localBooking.serviceName, timezone }, actor);
      } else {
        await firebaseCallables.respondToBookingReschedule({ threadId: thread.id, action, expectedRevision: proposal?.revision || 0, requestId: operation.current.id, ...(proposed ? { slot: proposed } : {}), note });
        await load(dateKey || today);
      }
      operation.current = null; setOpen(false); return true;
    } catch (failure) { setError(failure.message || 'The booking was not changed. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  // Context is needed for response cards even before the date picker is opened.
  useEffect(() => { if (!demo && thread?.bookingId) load(today); }, [demo, thread?.id, thread?.bookingId]);
  return { open, show, close: () => { if (!busy) setOpen(false); }, dateKey, changeDate, slots, loading, busy, error, booking, proposal, actor, timezone, today, clientAllowed, respond };
}
