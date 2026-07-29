import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Calendar, Check, ChevronDown, Clock, Hourglass, Info, MessageCircle, Pipette, Plus, RefreshCw, Search, SendHorizontal, Settings, Users, X } from 'lucide-react';
import * as FirebaseSDK from '../services/firebase';
import {
  LIVE_MESSAGE_LIMIT,
  createRescheduleProposal,
  formatPresenceTime,
  formatProposalLabel,
  getThreadMessageProposal,
  isPendingRescheduleProposal,
  timestampValue
} from '../features/communications/communicationsModel';
import { getMessagePreviewText } from '../features/communications/chatAttachments';
import { ChatAttachmentComposer, ChatMessageAttachments } from '../features/communications/components/ChatAttachments';
import { makeClientNotification, notificationEmailKey, NOTIFICATION_TYPES } from '../services/notifications';

const cloneGuestThreads = (threads = []) => (
  (Array.isArray(threads) ? threads : []).map(thread => ({
    ...thread,
    isExample: false,
    isGuestThread: true,
    messages: (Array.isArray(thread.messages) ? thread.messages : []).map(message => ({
      ...message,
      isExample: false,
      id: message.id || `guest-message-${Math.random().toString(36).slice(2)}`
    }))
  }))
);

const CHAT_DEFAULT_APPEARANCE = {
  background: '#F8FAFC',
  clientBubble: '#FFFFFF',
  clientText: '#172033',
  ownerBubble: '#101114',
  ownerText: '#FFFFFF',
  wallpaper: 'linen'
};

const CHAT_WALLPAPERS = [
  {
    id: 'linen',
    label: 'Linen',
    note: 'Soft booking-desk texture.',
    background: 'radial-gradient(circle at 18% 22%, rgba(15,23,42,0.055) 0 1px, transparent 1.6px), radial-gradient(circle at 76% 68%, rgba(15,23,42,0.04) 0 1px, transparent 1.6px), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(241,245,249,0.94))',
    size: '34px 34px, 38px 38px, auto'
  },
  {
    id: 'paper',
    label: 'Paper',
    note: 'Clean subtle diagonal grain.',
    background: 'repeating-linear-gradient(135deg, rgba(15,23,42,0.035) 0 1px, transparent 1px 13px), linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))',
    size: 'auto, auto'
  },
  {
    id: 'orbit',
    label: 'Orbit',
    note: 'Light app-style conversation pattern.',
    background: 'radial-gradient(circle at 20% 20%, rgba(5,5,5,0.045) 0 1px, transparent 2px), radial-gradient(circle at 70% 35%, rgba(20,167,255,0.07) 0 1.5px, transparent 2.6px), radial-gradient(circle at 42% 78%, rgba(217,70,239,0.055) 0 1.2px, transparent 2.3px), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(245,247,250,0.95))',
    size: '42px 42px, 58px 58px, 64px 64px, auto'
  },
  {
    id: 'plain',
    label: 'Plain',
    note: 'No pattern, just colour.',
    background: 'linear-gradient(var(--support-chat-canvas), var(--support-chat-canvas))',
    size: 'auto'
  }
];

export function WorkspaceInbox({
  appId,
  db,
  user,
  workspaceOwnerId,
  isGuestWorkspace = false,
  exampleMode = false,
  exampleThreads = [],
  bookings,
  clientDirectory = [],
  staffList = [],
  services = [],
  updateBooking,
  onCreateManualBooking,
  setActiveTab,
  focusTarget,
  showToast
}) {
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [oldestMessageCursor, setOldestMessageCursor] = useState(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [threadsReady, setThreadsReady] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [threadQuery, setThreadQuery] = useState('');
  const [supportFilter, setSupportFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [clientFileOpen, setClientFileOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [quickBookingSaving, setQuickBookingSaving] = useState(false);
  const [guestThreads, setGuestThreads] = useState(() => cloneGuestThreads(exampleThreads));
  const [chatAppearance, setChatAppearance] = useState(CHAT_DEFAULT_APPEARANCE);

  const guestThreadMode = isGuestWorkspace;
  const threadSource = guestThreadMode ? guestThreads : (exampleMode ? exampleThreads : threads);
  const activeChatWallpaper = CHAT_WALLPAPERS.find(wallpaper => wallpaper.id === chatAppearance.wallpaper) || CHAT_WALLPAPERS[0];
  const chatSurfaceStyle = {
    '--support-chat-canvas': chatAppearance.background,
    '--support-chat-client-bubble': chatAppearance.clientBubble,
    '--support-chat-client-text': chatAppearance.clientText,
    '--support-chat-owner-bubble': chatAppearance.ownerBubble,
    '--support-chat-owner-text': chatAppearance.ownerText,
    '--support-chat-wallpaper': activeChatWallpaper.background,
    '--support-chat-wallpaper-size': activeChatWallpaper.size
  };
  const clientProfileByEmail = useMemo(() => {
    const profiles = new Map();
    clientDirectory.forEach(client => {
      const emailKey = notificationEmailKey(client.email || '');
      if (emailKey) profiles.set(emailKey, client);
    });
    return profiles;
  }, [clientDirectory]);
  const getThreadClientProfile = (thread = {}) => {
    const emailKey = notificationEmailKey(thread.clientEmail || '');
    if (emailKey && clientProfileByEmail.has(emailKey)) return clientProfileByEmail.get(emailKey);
    return clientDirectory.find(client => (
      String(client.name || '').trim().toLowerCase() === String(thread.clientName || '').trim().toLowerCase()
    )) || null;
  };
  const getThreadAvatar = (thread = {}) => (
    thread.clientPhotoURL ||
    thread.clientAvatar ||
    getThreadClientProfile(thread)?.avatar ||
    ''
  );

  useEffect(() => {
    if (exampleMode) {
      setThreadsReady(true);
      return undefined;
    }
    if (isGuestWorkspace) {
      setThreadsReady(true);
      return undefined;
    }
    if (!db || !workspaceOwnerId) {
      setThreadsReady(true);
      return undefined;
    }
    setThreadsReady(false);
    const threadsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads'),
      FirebaseSDK.where('ownerId', '==', workspaceOwnerId),
      FirebaseSDK.orderBy('updatedAtMs', 'desc'),
      FirebaseSDK.limit(40)
    );
    const unsub = FirebaseSDK.onSnapshot(threadsQuery, (snap) => {
      if (snap.empty) {
        FirebaseSDK.getDocs(FirebaseSDK.query(
          FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads'),
          FirebaseSDK.where('ownerId', '==', workspaceOwnerId),
          FirebaseSDK.limit(40)
        )).then((fallbackSnap) => {
          const fallbackThreads = fallbackSnap.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => timestampValue(b.updatedAtMs || b.updatedAt || b.lastMessageAt) - timestampValue(a.updatedAtMs || a.updatedAt || a.lastMessageAt));
          setThreads(fallbackThreads);
          setActiveThreadId(current => (current && fallbackThreads.some(thread => thread.id === current)) ? current : (fallbackThreads[0]?.id || ''));
          setThreadsReady(true);
        }).catch((error) => {
          console.error('Workspace inbox fallback sync failed', error);
          setThreadsReady(true);
        });
        return;
      }
      const next = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => timestampValue(b.updatedAtMs || b.updatedAt || b.lastMessageAt) - timestampValue(a.updatedAtMs || a.updatedAt || a.lastMessageAt));
      setThreads(next);
      setActiveThreadId(current => (current && next.some(thread => thread.id === current)) ? current : (next[0]?.id || ''));
      setThreadsReady(true);
    }, (error) => {
      console.error('Workspace inbox sync failed', error);
      setThreadsReady(true);
    });
    return () => unsub();
  }, [appId, db, exampleMode, isGuestWorkspace, workspaceOwnerId]);

  useEffect(() => {
    if ((!isGuestWorkspace && !exampleMode) || !threadSource.length) return;
    setActiveThreadId(current => (current && threadSource.some(thread => thread.id === current)) ? current : threadSource[0].id);
  }, [exampleMode, isGuestWorkspace, threadSource]);

  useEffect(() => {
    if (!isGuestWorkspace || !exampleThreads.length) return;
    setGuestThreads(current => current.length ? current : cloneGuestThreads(exampleThreads));
  }, [exampleThreads, isGuestWorkspace]);

  const activeThread = useMemo(
    () => threadSource.find(thread => thread.id === activeThreadId) || threadSource[0] || null,
    [activeThreadId, threadSource]
  );
  const linkedBooking = useMemo(
    () => bookings.find(booking => booking.id === activeThread?.bookingId) || null,
    [activeThread?.bookingId, bookings]
  );
  const visibleMessages = guestThreadMode || exampleMode ? (activeThread?.messages || []) : [...olderMessages, ...messages];
  const activeStaff = useMemo(() => {
    const emailKey = notificationEmailKey(user?.email || '');
    return staffList.find(staff => notificationEmailKey(staff.email || '') === emailKey || staff.uid === user?.uid) || staffList[0] || null;
  }, [staffList, user?.email, user?.uid]);
  const assignedStaff = useMemo(() => (
    linkedBooking?.staffId ? staffList.find(staff => staff.id === linkedBooking.staffId) : null
  ), [linkedBooking?.staffId, staffList]);
  const assignedStaffColor = assignedStaff?.color || activeStaff?.color || '#39FF14';
  const activeClientProfile = activeThread ? getThreadClientProfile(activeThread) : null;
  const activeThreadPrefill = useMemo(() => ({
    clientName: activeClientProfile?.name || activeThread?.clientName || '',
    clientPhone: activeClientProfile?.phone || linkedBooking?.clientPhone || '',
    clientEmail: activeClientProfile?.email || activeThread?.clientEmail || linkedBooking?.clientEmail || '',
    clientCountry: activeClientProfile?.country || linkedBooking?.clientCountry || activeThread?.clientCountry || '',
    clientBirthday: activeClientProfile?.birthday || linkedBooking?.clientBirthday || '',
    clientNote: activeClientProfile?.notes || linkedBooking?.clientNote || activeThread?.lastMessage || '',
    serviceName: activeThread?.serviceName || linkedBooking?.serviceName || '',
    staffId: assignedStaff?.id || linkedBooking?.staffId || activeStaff?.id || '',
    threadId: activeThread?.id || ''
  }), [activeClientProfile?.birthday, activeClientProfile?.country, activeClientProfile?.email, activeClientProfile?.name, activeClientProfile?.notes, activeClientProfile?.phone, activeStaff?.id, activeThread?.clientCountry, activeThread?.clientEmail, activeThread?.clientName, activeThread?.id, activeThread?.lastMessage, activeThread?.serviceName, assignedStaff?.id, linkedBooking?.clientBirthday, linkedBooking?.clientCountry, linkedBooking?.clientEmail, linkedBooking?.clientNote, linkedBooking?.clientPhone, linkedBooking?.serviceName, linkedBooking?.staffId]);
  const submitQuickBooking = async (event) => {
    event.preventDefault();
    if (!onCreateManualBooking || quickBookingSaving) return;
    const formData = new FormData(event.currentTarget);
    setQuickBookingSaving(true);
    try {
      const ok = await onCreateManualBooking({
        threadId: activeThread?.id || '',
        clientName: formData.get('clientName'),
        clientPhone: formData.get('clientPhone'),
        clientEmail: formData.get('clientEmail'),
        clientCountry: formData.get('clientCountry'),
        clientBirthday: formData.get('clientBirthday'),
        clientNote: formData.get('clientNote'),
        serviceId: formData.get('serviceId'),
        serviceName: formData.get('serviceName'),
        bookingDate: formData.get('bookingDate'),
        bookingTime: formData.get('bookingTime'),
        bookingStatus: formData.get('bookingStatus'),
        staffId: formData.get('staffId')
      });
      if (ok) setQuickBookingOpen(false);
    } finally {
      setQuickBookingSaving(false);
    }
  };
  const buildRescheduleProposal = (proposal = {}) => createRescheduleProposal({
    requestedBy: 'owner',
    source: 'offer',
    ...proposal,
    bookingId: proposal.bookingId || activeThread?.bookingId || linkedBooking?.id || ''
  });
  const getMessageProposal = (message = {}) => getThreadMessageProposal(message, activeThread);
  const isPendingProposal = isPendingRescheduleProposal;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.classList.toggle('support-chat-open', mobileChatOpen);
    return () => document.documentElement.classList.remove('support-chat-open');
  }, [mobileChatOpen]);

  useEffect(() => {
    if (!quickBookingOpen || typeof window === 'undefined') return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector('.support-quick-booking-sheet')?.scrollTo({ top: 0 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [quickBookingOpen]);

  useEffect(() => {
    setClientFileOpen(false);
    setChatSettingsOpen(false);
  }, [activeThread?.id]);

  useEffect(() => {
    if (!focusTarget?.requestId) return;
    const match = threadSource.find(thread => (
      (focusTarget.threadId && thread.id === focusTarget.threadId) ||
      (focusTarget.bookingId && thread.bookingId === focusTarget.bookingId)
    ));
    if (!match) return;
    setActiveThreadId(match.id);
    setThreadQuery('');
    setMobileChatOpen(true);
  }, [focusTarget?.requestId, focusTarget?.threadId, focusTarget?.bookingId, threadSource]);

  const createClientNotification = async (email, payload) => {
    const emailKey = notificationEmailKey(email);
    if (!db || !emailKey) return false;
    try {
      await FirebaseSDK.addDoc(
        FirebaseSDK.collection(db, 'artifacts', appId, 'clientAccess', emailKey, 'notifications'),
        {
          ...payload,
          clientEmail: emailKey,
          ownerId: payload.ownerId || workspaceOwnerId,
          audience: 'client',
          read: false,
          createdAtMs: payload.createdAtMs || Date.now(),
          createdAt: FirebaseSDK.serverTimestamp()
        }
      );
      return true;
    } catch (error) {
      console.error('Client notification from inbox failed', error);
      return false;
    }
  };

  const updateGuestThread = (threadId, updater) => {
    setGuestThreads(current => current.map(thread => {
      if (thread.id !== threadId) return thread;
      const nextThread = typeof updater === 'function' ? updater(thread) : { ...thread, ...updater };
      return {
        ...nextThread,
        updatedAtMs: nextThread.updatedAtMs || Date.now(),
        isGuestThread: true,
        isExample: false
      };
    }));
  };

  useEffect(() => {
    if (guestThreadMode || !db || !activeThread?.id || activeThread?.isExample) {
      setMessages([]);
      setOlderMessages([]);
      setOldestMessageCursor(null);
      setHasOlderMessages(false);
      return undefined;
    }
    setOlderMessages([]);
    setOldestMessageCursor(null);
    setHasOlderMessages(false);
    const messagesQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads', activeThread.id, 'messages'),
      FirebaseSDK.orderBy('createdAt', 'desc'),
      FirebaseSDK.limit(LIVE_MESSAGE_LIMIT)
    );
    const unsub = FirebaseSDK.onSnapshot(messagesQuery, (snap) => {
      const docs = snap.docs;
      setMessages(docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })).reverse());
      setOldestMessageCursor(docs[docs.length - 1] || null);
      setHasOlderMessages(docs.length === LIVE_MESSAGE_LIMIT);
      if (Number(activeThread.ownerUnread || 0) > 0) {
        FirebaseSDK.updateDoc(
          FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', activeThread.id),
          { ownerUnread: 0, ownerLastSeenAt: FirebaseSDK.serverTimestamp() }
        ).catch(() => {});
      }
    }, (error) => console.error('Workspace messages sync failed', error));
    return () => unsub();
  }, [activeThread?.id, appId, db, guestThreadMode]);

  const loadPreviousMessages = async () => {
    if (guestThreadMode || !db || !activeThread?.id || activeThread?.isExample || !oldestMessageCursor || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const olderQuery = FirebaseSDK.query(
        FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads', activeThread.id, 'messages'),
        FirebaseSDK.orderBy('createdAt', 'desc'),
        FirebaseSDK.startAfter(oldestMessageCursor),
        FirebaseSDK.limit(LIVE_MESSAGE_LIMIT)
      );
      const snap = await FirebaseSDK.getDocs(olderQuery);
      const docs = snap.docs;
      const older = docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })).reverse();
      setOlderMessages(current => {
        const seen = new Set(current.map(message => message.id));
        return [...older.filter(message => !seen.has(message.id)), ...current];
      });
      if (docs.length) setOldestMessageCursor(docs[docs.length - 1]);
      setHasOlderMessages(docs.length === LIVE_MESSAGE_LIMIT);
    } catch (error) {
      console.error('Loading previous workspace messages failed', error);
      showToast?.('Could not load older messages. Try again.');
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const sendMessage = async (text = draft, extra = {}) => {
    const cleanText = String(text || '').trim();
    const { attachments = [], messageId = '', previewText = '', ...messageExtra } = extra || {};
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    if ((!cleanText && !safeAttachments.length) || !activeThread?.id || sending) return;
    if (activeThread.isExample) {
      setDraft('');
      showToast?.('Example preview only. Real replies will send when a client thread exists.');
      return;
    }
    const messagePreview = previewText || getMessagePreviewText({ text: cleanText, attachments: safeAttachments });
    if (guestThreadMode || !db) {
      const createdAtMs = Date.now();
      updateGuestThread(activeThread.id, thread => ({
        ...thread,
        lastMessage: messagePreview,
        lastMessageAtMs: createdAtMs,
        updatedAtMs: createdAtMs,
        clientUnread: Number(thread.clientUnread || 0) + 1,
        ownerUnread: 0,
        messages: [
          ...(thread.messages || []),
          {
            ...messageExtra,
            id: messageId || `guest-message-${createdAtMs}`,
            text: cleanText,
            ...(safeAttachments.length ? { attachments: safeAttachments } : {}),
            kind: messageExtra.kind || (safeAttachments.length && !cleanText ? 'attachment' : 'message'),
            senderId: user?.uid || workspaceOwnerId || 'guest-workspace',
            senderName: activeStaff?.name || user?.displayName || user?.email || 'Team',
            senderPhotoURL: activeStaff?.photoURL || user?.photoURL || '',
            staffId: activeStaff?.id || '',
            senderRole: 'owner',
            createdAtMs
          }
        ]
      }));
      setDraft('');
      return;
    }
    setSending(true);
    try {
      const messagesCollection = FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads', activeThread.id, 'messages');
      const messageRef = messageId ? FirebaseSDK.doc(messagesCollection, messageId) : FirebaseSDK.doc(messagesCollection);
      await FirebaseSDK.setDoc(messageRef, {
        ...messageExtra,
        text: cleanText,
        ...(safeAttachments.length ? { attachments: safeAttachments } : {}),
        kind: messageExtra.kind || (safeAttachments.length && !cleanText ? 'attachment' : 'message'),
        senderId: user?.uid || workspaceOwnerId,
        senderName: activeStaff?.name || user?.displayName || user?.email || 'Team',
        senderPhotoURL: activeStaff?.photoURL || user?.photoURL || '',
        staffId: activeStaff?.id || '',
        senderRole: 'owner',
        createdAt: FirebaseSDK.serverTimestamp()
      });
      await FirebaseSDK.updateDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', activeThread.id), {
        lastMessage: messagePreview,
        lastMessageAt: FirebaseSDK.serverTimestamp(),
        lastMessageAtMs: Date.now(),
        updatedAt: FirebaseSDK.serverTimestamp(),
        updatedAtMs: Date.now(),
        clientUnread: FirebaseSDK.increment(1),
        ownerUnread: 0
      });
      await createClientNotification(activeThread.clientEmail, makeClientNotification({
        type: NOTIFICATION_TYPES.NEW_MESSAGE,
        title: `New message from ${activeThread.workspaceName || 'the business'}`,
        body: messagePreview,
        ownerId: workspaceOwnerId,
        booking: linkedBooking || {},
        bookingId: activeThread.bookingId || '',
        threadId: activeThread.id,
        view: 'chats',
        priority: 'high',
        metadata: { senderRole: 'owner' }
      }));
      setDraft('');
    } catch (error) {
      console.error('Workspace message send failed', error);
      showToast?.('Could not send that message. Try again.');
    } finally {
      setSending(false);
    }
  };

  const offerReschedule = (proposal = null) => {
    if (activeThread?.isExample) {
      showToast?.('Example preview only. Live threads can send reschedule options.');
      return;
    }
    if (!activeThread?.id) {
      showToast?.('Open a client thread first.');
      return;
    }

    setActionDialog({
      type: 'reschedule',
      title: proposal ? 'Counter with another time' : 'Offer a new time',
      eyebrow: proposal ? 'Counter offer' : 'Reschedule',
      requestMode: proposal ? 'counter' : 'offer',
      date: proposal?.date || linkedBooking?.date || '',
      time: proposal?.time || linkedBooking?.time || '',
      message: ''
    });
  };

  const submitRescheduleOffer = async () => {
    const cleanDate = String(actionDialog?.date || '').trim();
    if (!cleanDate) {
      showToast?.('Add a date before sending a reschedule option.');
      return;
    }

    const cleanTime = String(actionDialog?.time || '').trim();
    if (!cleanTime) {
      showToast?.('Add a time before sending a reschedule option.');
      return;
    }

    const message = String(actionDialog?.message || '').trim()
      || `Reschedule option: ${cleanDate} at ${cleanTime}. Reply here to confirm and we will update your booking.`;
    const proposal = buildRescheduleProposal({
      date: cleanDate,
      time: cleanTime,
      requestedBy: 'owner',
      source: actionDialog?.requestMode === 'counter' ? 'counter' : 'offer',
      message
    });

    if (guestThreadMode && activeThread.id) {
      updateGuestThread(activeThread.id, {
        rescheduleStatus: actionDialog?.requestMode === 'counter' ? 'countered' : 'offered',
        proposedReschedule: proposal,
        updatedAtMs: Date.now()
      });
    } else if (db && activeThread.id) {
      await FirebaseSDK.updateDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', activeThread.id), {
        rescheduleStatus: actionDialog?.requestMode === 'counter' ? 'countered' : 'offered',
        proposedReschedule: proposal,
        updatedAt: FirebaseSDK.serverTimestamp(),
        updatedAtMs: Date.now()
      }).catch(() => {});
    }
    await sendMessage(message, {
      kind: actionDialog?.requestMode === 'counter' ? 'reschedule-counter' : 'reschedule-offer',
      proposedReschedule: proposal
    });
    setActionDialog(null);
    showToast?.(actionDialog?.requestMode === 'counter' ? 'Counter offer sent to the client.' : 'Reschedule option sent to the client.');
  };

  const acceptRescheduleProposal = async (proposal = {}) => {
    if (activeThread?.isExample) {
      showToast?.('Example preview only. Live reschedule requests can be accepted from here.');
      return;
    }
    if (!linkedBooking) {
      showToast?.('No matching booking found for this reschedule request.');
      return;
    }
    if (!proposal.date || !proposal.time) {
      showToast?.('This reschedule request is missing a date or time.');
      return;
    }

    const nextProposal = { ...proposal, status: 'accepted', acceptedBy: 'owner', decidedAtMs: Date.now() };
    await updateBooking(linkedBooking.id, { date: proposal.date, time: proposal.time });
    if (guestThreadMode && activeThread?.id) {
      updateGuestThread(activeThread.id, {
        rescheduleStatus: 'accepted',
        proposedReschedule: nextProposal,
        updatedAtMs: Date.now()
      });
    } else if (db && activeThread?.id) {
      await FirebaseSDK.updateDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', activeThread.id), {
        rescheduleStatus: 'accepted',
        proposedReschedule: nextProposal,
        updatedAt: FirebaseSDK.serverTimestamp(),
        updatedAtMs: Date.now()
      }).catch(() => {});
    }
    await sendMessage(`Accepted reschedule: ${formatProposalLabel(proposal)}. Your booking has been updated.`, {
      kind: 'reschedule-accepted',
      proposedReschedule: nextProposal
    });
    showToast?.('Reschedule accepted and booking updated.');
  };

  const declineRescheduleProposal = async (proposal = {}) => {
    if (activeThread?.isExample) {
      showToast?.('Example preview only. Live reschedule requests can be declined from here.');
      return;
    }
    const nextProposal = { ...proposal, status: 'declined', declinedBy: 'owner', decidedAtMs: Date.now() };
    if (guestThreadMode && activeThread?.id) {
      updateGuestThread(activeThread.id, {
        rescheduleStatus: 'declined',
        proposedReschedule: nextProposal,
        updatedAtMs: Date.now()
      });
    } else if (db && activeThread?.id) {
      await FirebaseSDK.updateDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', activeThread.id), {
        rescheduleStatus: 'declined',
        proposedReschedule: nextProposal,
        updatedAt: FirebaseSDK.serverTimestamp(),
        updatedAtMs: Date.now()
      }).catch(() => {});
    }
    await sendMessage(`Declined reschedule: ${formatProposalLabel(proposal)}. Send another option here if you want to keep looking.`, {
      kind: 'reschedule-declined',
      proposedReschedule: nextProposal
    });
    showToast?.('Reschedule request declined.');
  };

  const sendRunningLateUpdate = () => {
    if (activeThread?.isExample) {
      showToast?.('Example preview only. Live threads can send running-late updates.');
      return;
    }
    if (!activeThread?.id) {
      showToast?.('Open a client thread first.');
      return;
    }

    setActionDialog({
      type: 'late',
      title: 'Send running-late update',
      eyebrow: 'Quick Update',
      minutes: '10',
      message: ''
    });
  };

  const submitRunningLateUpdate = async () => {
    const cleanMinutes = String(actionDialog?.minutes || '').trim();
    if (!cleanMinutes) {
      showToast?.('Add the number of minutes before sending.');
      return;
    }

    const message = String(actionDialog?.message || '').trim()
      || `Running ${cleanMinutes} minutes late. Thanks for your patience - we will keep you posted here.`;

    await sendMessage(message);
    setActionDialog(null);
    showToast?.('Running-late update sent.');
  };

  const clientPresenceLabel = (() => {
    if (!activeThread) return 'No active chat';
    if (activeThread.isExample) return 'Last seen just now';
    if (activeThread.clientOnline) return 'Live now';
    const lastSeen = formatPresenceTime(activeThread.clientLastSeenAt || activeThread.clientLastSeenMs);
    if (lastSeen) return `Last seen ${lastSeen}`;
    return 'Last seen unavailable';
  })();

  const matchesSupportFilter = (thread, filter = supportFilter) => {
    if (filter === 'unread') return Number(thread.ownerUnread || 0) > 0;
    if (filter === 'requests') return ['pending', 'requested'].includes(String(thread.bookingStatus || '').toLowerCase());
    if (filter === 'confirmed') return String(thread.bookingStatus || '').toLowerCase() === 'confirmed';
    if (filter === 'waitlist') return String(thread.bookingStatus || '').toLowerCase() === 'waitlist';
    if (filter === 'reschedules') return ['requested', 'countered'].includes(String(thread.rescheduleStatus || '').toLowerCase());
    return true;
  };
  const supportTabs = [
    { id: 'all', label: 'All', count: threadSource.length, icon: MessageCircle },
    { id: 'unread', label: 'Unread', count: threadSource.filter(thread => matchesSupportFilter(thread, 'unread')).length, icon: Bell },
    { id: 'requests', label: 'Requests', count: threadSource.filter(thread => matchesSupportFilter(thread, 'requests')).length, icon: Calendar },
    { id: 'confirmed', label: 'Confirmed', count: threadSource.filter(thread => matchesSupportFilter(thread, 'confirmed')).length, icon: Check },
    { id: 'waitlist', label: 'Waitlist', count: threadSource.filter(thread => matchesSupportFilter(thread, 'waitlist')).length, icon: Clock },
    { id: 'reschedules', label: 'Reschedules', count: threadSource.filter(thread => matchesSupportFilter(thread, 'reschedules')).length, icon: RefreshCw }
  ];
  const selectSupportFilter = (nextFilter) => {
    setSupportFilter(nextFilter);
    const nextThread = threadSource.find(thread => matchesSupportFilter(thread, nextFilter));
    setActiveThreadId(nextThread?.id || '');
  };
  const filteredThreads = useMemo(() => {
    const queryText = threadQuery.trim().toLowerCase();
    return threadSource.filter(thread => {
      if (!matchesSupportFilter(thread)) return false;
      if (!queryText) return true;
      return [
      thread.clientName,
      thread.clientEmail,
      thread.workspaceName,
      thread.lastMessage,
      thread.bookingStatus
      ].some(value => String(value || '').toLowerCase().includes(queryText));
    });
  }, [threadQuery, threadSource, supportFilter]);

  const renderClientInfoPanel = ({ sidePanel = false } = {}) => {
    if (!activeThread) return null;
    return (
      <>
        <div className="support-client-info-header flex items-start justify-between gap-4 p-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold ${getThreadAvatar(activeThread) ? 'bg-neutral-100 border border-neutral-100 text-black' : 'booking-avatar-placeholder'}`}>
              {getThreadAvatar(activeThread) ? <img src={getThreadAvatar(activeThread)} alt="" className="w-full h-full object-cover" /> : (activeThread.clientName || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1">Client File</p>
              <h3 className="text-xl font-bold tracking-tight text-black truncate">{activeThread.clientName || 'Client'}</h3>
              <p className="text-xs text-neutral-500 truncate">{activeThreadPrefill.clientEmail || activeThreadPrefill.clientPhone || 'Support thread'}</p>
            </div>
          </div>
          <button type="button" onClick={() => setClientFileOpen(false)} className="support-client-info-close w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors" aria-label={sidePanel ? 'Close info panel' : 'Close client file'}>
            <X size={15} />
          </button>
        </div>

        <div className="support-client-file-body p-5 space-y-4">
          <div className="support-client-file-actions">
            <button type="button" onClick={() => { setQuickBookingOpen(true); setClientFileOpen(false); }}>
              <Plus size={15} />
              <span>Add booking</span>
            </button>
            <button type="button" onClick={() => { setActiveTab?.('bookings'); setClientFileOpen(false); }}>
              <Calendar size={15} />
              <span>Open bookings</span>
            </button>
            <button type="button" onClick={() => { offerReschedule(); setClientFileOpen(false); }}>
              <RefreshCw size={15} />
              <span>Offer reschedule</span>
            </button>
            <button type="button" onClick={() => { sendRunningLateUpdate(); setClientFileOpen(false); }}>
              <Clock size={15} />
              <span>Running late</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="support-client-file-tile">
              <p>Booking</p>
              <strong>{linkedBooking ? `${linkedBooking.date || 'Date'} / ${linkedBooking.time || 'Time'}` : activeThreadPrefill.serviceName || 'Not linked yet'}</strong>
            </div>
            <div className="support-client-file-tile">
              <p>Status</p>
              <strong>{linkedBooking?.status || activeThread.bookingStatus || 'Open'}</strong>
            </div>
            <div className="support-client-file-tile">
              <p>Staff</p>
              <strong>{assignedStaff?.name || activeStaff?.name || 'Team'}</strong>
            </div>
            <div className="support-client-file-tile">
              <p>Service</p>
              <strong>{activeThreadPrefill.serviceName || linkedBooking?.serviceName || 'Not set'}</strong>
            </div>
          </div>

          <div className="support-client-file-list">
            <div>
              <span>Phone</span>
              <strong>{activeThreadPrefill.clientPhone || 'Not saved'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{activeThreadPrefill.clientEmail || 'Not saved'}</strong>
            </div>
            <div>
              <span>Country</span>
              <strong>{activeThreadPrefill.clientCountry || 'Not saved'}</strong>
            </div>
            <div>
              <span>Notes</span>
              <strong>{activeThreadPrefill.clientNote || activeThread.lastMessage || 'No notes yet'}</strong>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderChatSettingsPanel = ({ sidePanel = false } = {}) => {
    const colorControls = [
      { key: 'background', label: 'Chat background', note: 'Base colour behind the wallpaper.' },
      { key: 'clientBubble', label: 'Client bubble', note: 'Incoming message bubble fill.' },
      { key: 'clientText', label: 'Client text', note: 'Incoming message copy colour.' },
      { key: 'ownerBubble', label: 'Team bubble', note: 'Your reply bubble fill.' },
      { key: 'ownerText', label: 'Team text', note: 'Your reply copy colour.' }
    ];
    const applyChatColor = (key, value) => {
      setChatAppearance(current => ({ ...current, [key]: value }));
    };

    return (
      <>
        <div className="support-client-info-header flex items-start justify-between gap-4 p-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0">
              <Settings size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1">Chat Settings</p>
              <h3 className="text-xl font-bold tracking-tight text-black truncate">Conversation style</h3>
              <p className="text-xs text-neutral-500 truncate">Colours and wallpaper for this chat.</p>
            </div>
          </div>
          <button type="button" onClick={() => setChatSettingsOpen(false)} className="support-client-info-close w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors" aria-label={sidePanel ? 'Close settings panel' : 'Close chat settings'}>
            <X size={15} />
          </button>
        </div>

        <div className="support-client-file-body support-chat-settings-body p-5 space-y-4">
          <section className="support-chat-settings-section">
            <div className="support-chat-settings-section-head">
              <p>Colours</p>
              <span>Precise chat surface controls.</span>
            </div>
            <div className="support-chat-settings-grid">
              {colorControls.map((item) => {
                const value = chatAppearance[item.key] || '#FFFFFF';
                return (
                  <article
                    key={item.key}
                    className="editor-color-control-card support-chat-color-card"
                    style={{ '--editor-row-color': value, '--editor-row-css-color': value }}
                  >
                    <label className="editor-color-control-swatch" aria-label={`Pick ${item.label} colour`}>
                      <input
                        type="color"
                        value={value}
                        onChange={(event) => applyChatColor(item.key, event.target.value)}
                      />
                      <span />
                    </label>
                    <div className="editor-color-control-copy">
                      <span className="editor-color-control-kicker">Chat colour</span>
                      <b>{item.label}</b>
                      <small>{item.note}</small>
                    </div>
                    <div className="editor-color-control-actions">
                      <button
                        type="button"
                        className="editor-color-value-pill"
                        onClick={() => {}}
                        title={`${item.label} colour value`}
                      >
                        {value}
                      </button>
                      <label className="editor-color-icon-button" title={`Open ${item.label} colour picker`} aria-label={`Open ${item.label} colour picker`}>
                        <input
                          type="color"
                          value={value}
                          onChange={(event) => applyChatColor(item.key, event.target.value)}
                        />
                        <Pipette size={13} />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="support-chat-settings-section">
            <div className="support-chat-settings-section-head">
              <p>Wallpaper</p>
              <span>Subtle patterns for the chat canvas.</span>
            </div>
            <div className="support-chat-wallpaper-grid">
              {CHAT_WALLPAPERS.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  type="button"
                  className={`support-chat-wallpaper-choice ${chatAppearance.wallpaper === wallpaper.id ? 'is-active' : ''}`}
                  onClick={() => setChatAppearance(current => ({ ...current, wallpaper: wallpaper.id }))}
                >
                  <span
                    className="support-chat-wallpaper-preview"
                    style={{ background: wallpaper.background, backgroundSize: wallpaper.size }}
                  />
                  <strong>{wallpaper.label}</strong>
                  <small>{wallpaper.note}</small>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            className="support-chat-settings-reset"
            onClick={() => setChatAppearance(CHAT_DEFAULT_APPEARANCE)}
          >
            Reset style
          </button>
        </div>
      </>
    );
  };

  return (
    <>
    <section data-tour="client-inbox" className="support-inbox-card support-inbox-pro support-desk-shell saas-card overflow-hidden bg-white" style={chatSurfaceStyle}>
      <div className="h-1 native-gradient-line" />
      <div className={`support-workspace-grid ${clientFileOpen || chatSettingsOpen ? 'is-info-open' : ''} grid grid-cols-1 xl:grid-cols-12 min-h-[520px] xl:min-h-[640px]`}>
        <aside className={`support-thread-list ${mobileChatOpen ? 'hidden xl:block' : ''} xl:col-span-4 border-b xl:border-b-0 xl:border-r border-neutral-100 bg-neutral-50/45`}>
          <div className="support-thread-search p-3 md:p-4 border-b border-neutral-100 bg-white/70">
            <div className="support-rail-head flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Inbox</p>
                <h3 className="text-lg font-bold tracking-tight text-black">
                  {supportTabs.find(tab => tab.id === supportFilter)?.label || 'Client'} threads
                </h3>
              </div>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
              <input
                value={threadQuery}
                onChange={(event) => setThreadQuery(event.target.value)}
                placeholder="Search client, email, message"
                aria-label="Search support threads"
                className="w-full h-11 md:h-12 rounded-lg bg-white border border-neutral-200 pl-11 pr-4 text-sm font-bold outline-none focus:border-black transition-colors"
              />
            </div>
            <div className="support-mail-tabs mt-3">
              <div className="support-mail-tabs-track flex items-center gap-1.5 overflow-x-auto">
                {supportTabs.map((tab) => {
                  const IconCmp = tab.icon;
                  const active = supportFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => selectSupportFilter(tab.id)}
                      title={`${tab.label} (${tab.count})`}
                      aria-label={`${tab.label} threads (${tab.count})`}
                      className={`support-mail-tab ${active ? 'is-active' : ''} h-9 rounded-xl border px-2.5 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shrink-0`}
                    >
                      <IconCmp size={13} />
                      <span className="sr-only">{tab.label}</span>
                      <span className="support-mail-tab-count min-w-5 h-5 rounded-full flex items-center justify-center text-[9px]">{tab.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="max-h-[62vh] xl:max-h-[660px] overflow-y-auto">
            {filteredThreads.length ? filteredThreads.map(thread => {
              const active = activeThread?.id === thread.id;
              const threadAvatar = getThreadAvatar(thread);
              const bookingStatus = String(thread.bookingStatus || 'pending').toLowerCase();
              const StatusIcon = bookingStatus === 'confirmed'
                ? Check
                : bookingStatus === 'waitlist'
                  ? Hourglass
                  : bookingStatus === 'declined'
                    ? X
                    : Clock;
              const statusLabel = bookingStatus === 'waitlist' ? 'Waitlist' : bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1);
              const hasReschedule = ['requested', 'countered'].includes(String(thread.rescheduleStatus || '').toLowerCase());
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    setMobileChatOpen(true);
                  }}
                  className={`support-thread-row w-full text-left p-3.5 md:p-5 border-b border-neutral-100 transition-colors relative overflow-hidden ${active ? 'is-active' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold overflow-hidden ${threadAvatar ? 'bg-white border border-neutral-100 text-black' : 'booking-avatar-placeholder'}`}>
                        {threadAvatar ? <img src={threadAvatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : (thread.clientName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="support-thread-client-name font-bold truncate">{thread.clientName || 'Client'}</p>
                        <p className="support-thread-service text-xs mt-1 truncate">{thread.serviceName || thread.clientEmail || thread.workspaceName || 'Client thread'}</p>
                      </div>
                    </div>
                    <div className="support-thread-meta-icons flex items-center gap-1.5 shrink-0">
                      <span className={`support-thread-icon-chip ${bookingStatus}`} title={statusLabel} aria-label={statusLabel}>
                        <StatusIcon size={13} />
                      </span>
                      {hasReschedule && (
                        <span className="support-thread-icon-chip reschedule" title="Reschedule requested" aria-label="Reschedule requested">
                          <RefreshCw size={13} />
                        </span>
                      )}
                      {Number(thread.ownerUnread || 0) > 0 && <span className="support-thread-unread-count min-w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center">{thread.ownerUnread}</span>}
                    </div>
                  </div>
                  <div className="support-thread-preview-box">
                    <p className="support-thread-preview text-sm line-clamp-2">{thread.lastMessage || 'No messages yet.'}</p>
                  </div>
                </button>
              );
            }) : (
              <div className="launch-empty-state support-empty-rail">
                <div className="launch-empty-icon native-gradient-icon"><Users size={21}/></div>
                <p className="launch-empty-eyebrow">{threadsReady ? 'Support threads' : 'Syncing inbox'}</p>
                <h3>{threadsReady ? (threads.length ? 'No matching threads' : 'No client threads yet') : 'Loading client threads'}</h3>
                <p className="launch-empty-copy">{threadsReady ? (threads.length ? 'Try another name, email, or message keyword.' : 'New bookings with an email address will open a client support thread here automatically.') : 'Your live inbox is syncing.'}</p>
                {threadsReady && !threads.length && (
                  <button type="button" className="launch-empty-primary" onClick={() => setActiveTab?.('bookings')}>
                    <Plus size={14} /> Create test booking
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        <div className={`support-chat-panel ${mobileChatOpen ? 'fixed inset-0 z-[999] xl:static xl:z-auto' : 'hidden xl:flex'} ${clientFileOpen ? 'xl:col-span-5' : 'xl:col-span-8'} flex flex-col min-h-[100dvh] xl:min-h-[620px] bg-white`}>
          {activeThread ? (
            <>
              <div className="support-chat-header support-conversation-bar p-3 md:p-5 border-b border-neutral-100 flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button type="button" aria-label="Back to support inbox" onClick={() => setMobileChatOpen(false)} className="xl:hidden w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0">
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold ${getThreadAvatar(activeThread) ? 'bg-neutral-100 border border-neutral-100 text-black' : 'booking-avatar-placeholder'}`}>
                    {getThreadAvatar(activeThread) ? <img src={getThreadAvatar(activeThread)} alt="" className="w-full h-full object-cover" /> : (activeThread.clientName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="support-chat-identity min-w-0">
                    <h3 className="support-chat-name-line text-base md:text-xl font-bold text-black">
                      <span className="truncate">{activeThread.clientName || 'Client'}</span>
                      {assignedStaff && (
                        <span
                          className="support-chat-staff-dot"
                          style={{ backgroundColor: assignedStaffColor }}
                          title={`Assigned to ${assignedStaff.name}`}
                          aria-label={`Assigned to ${assignedStaff.name}`}
                        />
                      )}
                    </h3>
                    <p className="support-presence-label text-xs md:text-sm text-neutral-500 truncate">
                      {clientPresenceLabel}
                    </p>
                  </div>
                </div>
                <div className="support-chat-actions support-chat-command-bar flex items-center gap-1.5 shrink-0 w-full 2xl:w-auto overflow-x-auto">
                  <button
                    type="button"
                    aria-label="Open chat settings"
                    title="Chat settings"
                    onClick={() => {
                      setChatSettingsOpen(open => !open);
                      setClientFileOpen(false);
                    }}
                    className={`support-chat-settings-button ${chatSettingsOpen ? 'is-active' : ''}`}
                  >
                    <Settings size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Open chat info"
                    title="Chat info"
                    onClick={() => {
                      setClientFileOpen(open => !open);
                      setChatSettingsOpen(false);
                    }}
                    className={`support-chat-info-button ${clientFileOpen ? 'is-active' : ''}`}
                  >
                    <Info size={15} />
                  </button>
                </div>
              </div>

              <div className="support-chat-canvas flex-1 overflow-y-auto p-3 md:p-6 bg-white space-y-3">
                {!activeThread?.isExample && hasOlderMessages && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={loadPreviousMessages}
                      disabled={loadingOlderMessages}
                      className="support-load-previous rounded-full border border-neutral-200 bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                    >
                      {loadingOlderMessages ? 'Loading...' : 'Load previous messages'}
                    </button>
                  </div>
                )}
                {visibleMessages.map(message => {
                  const mine = message.senderRole === 'owner';
                  const proposal = getMessageProposal(message);
                  const pendingProposal = proposal && isPendingProposal(proposal) && ['reschedule-request', 'reschedule-offer', 'reschedule-counter'].includes(message.kind);
                  const ownerCanRespond = pendingProposal && proposal.requestedBy !== 'owner';
                  const messageTone = mine ? 'support-message-owner' : message.senderRole === 'system' ? 'support-message-system' : 'support-message-client';
                  const messageStyle = mine
                    ? { backgroundColor: chatAppearance.ownerBubble, color: chatAppearance.ownerText }
                    : message.senderRole === 'system'
                      ? undefined
                      : { backgroundColor: chatAppearance.clientBubble, color: chatAppearance.clientText };
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`support-message-bubble ${messageTone} max-w-[82%] rounded-2xl px-4 py-3 shadow-sm`} style={messageStyle}>
                        {message.text && <p className="support-message-copy text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>}
                        <ChatMessageAttachments attachments={message.attachments} mine={mine} />
                        {proposal && (
                          <div className={`support-message-proposal mt-3 rounded-xl border p-3 ${mine ? 'is-owner' : 'is-client'}`}>
                            <p className="support-message-proposal-title text-[8px] font-bold uppercase tracking-[0.16em] mb-2">
                              {proposal.status === 'accepted' ? 'Reschedule accepted' : proposal.status === 'declined' ? 'Reschedule declined' : proposal.source === 'counter' ? 'Counter offer' : 'Reschedule request'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="support-message-proposal-tile rounded-lg px-3 py-2">
                                <p className="support-message-proposal-label text-[8px] font-bold uppercase tracking-widest">Date</p>
                                <p className="support-message-proposal-value text-xs font-bold mt-1">{proposal.date || 'To confirm'}</p>
                              </div>
                              <div className="support-message-proposal-tile rounded-lg px-3 py-2">
                                <p className="support-message-proposal-label text-[8px] font-bold uppercase tracking-widest">Time</p>
                                <p className="support-message-proposal-value text-xs font-bold mt-1">{proposal.time || 'To confirm'}</p>
                              </div>
                            </div>
                            {ownerCanRespond ? (
                              <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => acceptRescheduleProposal(proposal)} className="h-9 rounded-lg native-gradient-button text-black text-[8px] font-bold uppercase tracking-widest">
                                  Accept
                                </button>
                                <button type="button" onClick={() => offerReschedule(proposal)} className="support-message-proposal-secondary h-9 rounded-lg border text-[8px] font-bold uppercase tracking-widest">
                                  Counter
                                </button>
                                <button type="button" onClick={() => declineRescheduleProposal(proposal)} className="support-message-proposal-secondary h-9 rounded-lg border text-[8px] font-bold uppercase tracking-widest">
                                  Decline
                                </button>
                              </div>
                            ) : pendingProposal ? (
                              <p className="support-message-proposal-status text-[10px] font-bold uppercase tracking-widest">
                                {proposal.requestedBy === 'owner' ? 'Waiting for client response' : 'Waiting for your response'}
                              </p>
                            ) : (
                              <p className="support-message-proposal-status text-[10px] font-bold uppercase tracking-widest">{proposal.status || 'Closed'}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="support-chat-composer p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-5 border-t border-neutral-100 bg-white">
                <ChatAttachmentComposer
                  draft={draft}
                  setDraft={setDraft}
                  sending={sending}
                  onSend={({ text, attachments, messageId, previewText }) => sendMessage(text, { attachments, messageId, previewText })}
                  placeholder="Reply to client..."
                  ariaLabel="Reply to client"
                  readOnly={Boolean(activeThread?.isExample)}
                  readOnlyMessage="Example preview only. Real replies will send when a client thread exists."
                  showToast={showToast}
                  workspaceAppId={appId}
                  threadId={activeThread?.id || ''}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-5 md:p-10 text-center">
              <div className="launch-empty-state support-empty-main">
                <div className="launch-empty-icon native-gradient-icon"><MessageCircle size={24}/></div>
                <p className="launch-empty-eyebrow">Connected client chat</p>
                <h3>Client chat is ready</h3>
                <p className="launch-empty-copy">When a client books with an email address, their portal and your workspace thread connect here automatically with booking context, contact details, and reschedule actions.</p>
                <div className="launch-empty-steps" aria-label="Support inbox workflow">
                  <span><Calendar size={14} /> Booking arrives</span>
                  <span><Bell size={14} /> Owner gets notified</span>
                  <span><SendHorizontal size={14} /> Reply from here</span>
                </div>
                <button type="button" className="launch-empty-primary" onClick={() => setActiveTab?.('bookings')}>
                  Open booking desk
                </button>
              </div>
            </div>
          )}
        </div>

        {(clientFileOpen || chatSettingsOpen) && activeThread && (
          <aside className="support-client-info-rail hidden xl:flex xl:col-span-3 bg-white border-l border-neutral-100">
            <div className="support-client-info-rail-inner">
              {chatSettingsOpen ? renderChatSettingsPanel({ sidePanel: true }) : renderClientInfoPanel({ sidePanel: true })}
            </div>
          </aside>
        )}
      </div>
    </section>
    {clientFileOpen && activeThread && (
      <div className="support-client-file-overlay xl:hidden fixed inset-0 z-[5000] bg-black/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="support-client-file-sheet w-full sm:max-w-md rounded-t-[1.35rem] sm:rounded-[1.1rem] bg-white border border-neutral-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {renderClientInfoPanel()}
        </div>
      </div>
    )}
    {chatSettingsOpen && (
      <div className="support-client-file-overlay xl:hidden fixed inset-0 z-[5000] bg-black/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="support-client-file-sheet support-chat-settings-sheet w-full sm:max-w-md rounded-t-[1.35rem] sm:rounded-[1.1rem] bg-white border border-neutral-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {renderChatSettingsPanel()}
        </div>
      </div>
    )}
    {quickBookingOpen && (
      <div className="support-quick-booking-overlay fixed inset-0 z-[5000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <form onSubmit={submitQuickBooking} className="support-quick-booking-sheet w-full sm:max-w-3xl rounded-t-[1.5rem] sm:rounded-[1.25rem] bg-white border border-neutral-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="support-quick-head flex items-start justify-between gap-4 p-5 sm:p-6 pb-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">From Chat</p>
              <h3 className="text-2xl font-bold tracking-tight text-black">Add Booking</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">Client details are prefilled from this thread and can be changed before saving.</p>
            </div>
            <button type="button" onClick={() => setQuickBookingOpen(false)} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors" aria-label="Close booking form">
              <X size={16} />
            </button>
          </div>
          <div className="support-quick-booking-grid grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-5 sm:px-6 pb-4">
            <label className="support-quick-field sm:col-span-2">
              <span>Name</span>
              <input name="clientName" required defaultValue={activeThreadPrefill.clientName} placeholder="Client name" />
            </label>
            <label className="support-quick-field">
              <span>Phone</span>
              <input name="clientPhone" type="tel" defaultValue={activeThreadPrefill.clientPhone} placeholder="+27 82 000 0000" />
            </label>
            <label className="support-quick-field">
              <span>Email</span>
              <input name="clientEmail" type="email" defaultValue={activeThreadPrefill.clientEmail} placeholder="client@email.com" />
            </label>
            <label className="support-quick-field">
              <span>Country</span>
              <input name="clientCountry" defaultValue={activeThreadPrefill.clientCountry} placeholder="South Africa" autoComplete="country-name" />
            </label>
            <label className="support-quick-field">
              <span>Date</span>
              <span className="support-quick-control">
                <input name="bookingDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
                <Calendar size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="support-quick-field">
              <span>Time</span>
              <span className="support-quick-control">
                <input name="bookingTime" type="time" required defaultValue="09:00" />
                <Clock size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="support-quick-field">
              <span>Status</span>
              <span className="support-quick-control">
                <select name="bookingStatus" defaultValue="confirmed">
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Needs review</option>
                  <option value="waitlist">Waitlist</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="support-quick-field">
              <span>Staff</span>
              <span className="support-quick-control">
                <select name="staffId" defaultValue={activeThreadPrefill.staffId}>
                  <option value="">Unassigned</option>
                  {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="support-quick-field">
              <span>Service</span>
              <span className="support-quick-control">
                <select name="serviceId" defaultValue="">
                  <option value="">Use custom service below</option>
                  {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <label className="support-quick-field">
              <span>Custom service</span>
              <input name="serviceName" defaultValue={activeThreadPrefill.serviceName} placeholder="Service name" />
            </label>
            <label className="support-quick-field sm:col-span-2">
              <span>Internal note</span>
              <textarea name="clientNote" rows={3} defaultValue={activeThreadPrefill.clientNote} placeholder="Context from this conversation..." />
            </label>
            <input type="hidden" name="clientBirthday" defaultValue={activeThreadPrefill.clientBirthday} />
          </div>
          <div className="support-quick-actions grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setQuickBookingOpen(false)} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={quickBookingSaving} className="h-12 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-[0.12em] disabled:opacity-50 disabled:cursor-wait">
              {quickBookingSaving ? 'Saving' : 'Save Booking'}
            </button>
          </div>
        </form>
      </div>
    )}
    {actionDialog && (
      <div className="fixed inset-0 z-[1200] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-lg rounded-t-[1.5rem] sm:rounded-[1.25rem] bg-white border border-neutral-100 shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">{actionDialog.eyebrow}</p>
              <h3 className="text-2xl font-bold tracking-tight text-black">{actionDialog.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {actionDialog.type === 'reschedule'
                  ? `Send ${activeThread?.clientName || 'this client'} a clear reschedule option inside this thread.`
                  : `Send ${activeThread?.clientName || 'this client'} a running-late update without leaving the inbox.`}
              </p>
            </div>
            <button type="button" onClick={() => setActionDialog(null)} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors">
              <X size={16} />
            </button>
          </div>

          {actionDialog.type === 'reschedule' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <label className="block">
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Date</span>
                <input
                  value={actionDialog.date}
                  onChange={(event) => setActionDialog(prev => ({ ...prev, date: event.target.value }))}
                  placeholder="Friday, May 22"
                  className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black transition-colors"
                />
              </label>
              <label className="block">
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Time</span>
                <input
                  value={actionDialog.time}
                  onChange={(event) => setActionDialog(prev => ({ ...prev, time: event.target.value }))}
                  placeholder="14:30"
                  className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black transition-colors"
                />
              </label>
            </div>
          ) : (
            <label className="block mb-4">
              <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Minutes Late</span>
              <input
                type="number"
                min="1"
                value={actionDialog.minutes}
                onChange={(event) => setActionDialog(prev => ({ ...prev, minutes: event.target.value }))}
                placeholder="10"
                className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black transition-colors"
              />
            </label>
          )}

          <label className="block mb-5">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Message Preview</span>
            <textarea
              rows={4}
              value={actionDialog.message}
              onChange={(event) => setActionDialog(prev => ({ ...prev, message: event.target.value }))}
              placeholder={actionDialog.type === 'reschedule'
                ? `Reschedule option: ${actionDialog.date || 'new date'} at ${actionDialog.time || 'new time'}. Reply here to confirm and we will update your booking.`
                : `Running ${actionDialog.minutes || '10'} minutes late. Thanks for your patience - we will keep you posted here.`}
              className="w-full resize-none rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3 text-sm leading-relaxed text-black outline-none focus:bg-white focus:border-black transition-colors"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setActionDialog(null)} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={actionDialog.type === 'reschedule' ? submitRescheduleOffer : submitRunningLateUpdate}
              disabled={sending}
              className="h-12 rounded-full native-gradient-button text-black text-[10px] font-bold uppercase tracking-[0.12em] disabled:opacity-50 disabled:cursor-wait"
            >
              {sending ? 'Sending' : 'Send Update'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

