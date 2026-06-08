import { useCallback, useState } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, auth, db, isFirebaseConfigured } from '../../../services/firebase';
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  syncConfirmedBookingsToGoogleCalendar
} from '../../../services/googleCalendar';
import {
  createGoogleProvider,
  getGoogleAccessTokenFromResult,
  hasGoogleIdentityClient,
  signInWithGoogleIdentity,
  signInWithNativeGoogle
} from '../../auth';

export function useGoogleCalendarActions({
  applyAuthPersistence,
  canManageWorkspace,
  displayStaffList,
  getCurrentAuthReturnRoute,
  isNativeAppRuntime,
  keepLoggedIn,
  saveWorkspaceSettingsPatch,
  setAuthMode,
  setAuthPanelOpen,
  setAuthPersona,
  setBookingsAndCache,
  settings,
  showToast,
  startGoogleRedirect,
  user,
  visibleBookings,
  workspaceOwnerId
}) {
  const [googleCalendarAuth, setGoogleCalendarAuth] = useState({ accessToken: '', email: '', connectedAt: 0 });
  const [googleCalendarSyncing, setGoogleCalendarSyncing] = useState(false);

  const connectGoogleCalendar = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      showToast('Google Calendar sync needs Firebase Google sign-in.');
      return '';
    }
    if (!user) {
      setAuthPersona('owner');
      setAuthMode('signin');
      setAuthPanelOpen(true);
      showToast('Sign in first, then connect Google Calendar.');
      return '';
    }

    try {
      if (isNativeAppRuntime) {
        const nativeResult = await signInWithNativeGoogle(auth, {
          scopes: [GOOGLE_CALENDAR_EVENTS_SCOPE],
          useCredentialManager: false
        });
        const accessToken = nativeResult?.accessToken || '';
        if (!accessToken) throw new Error('Google did not return Calendar permission yet.');
        setGoogleCalendarAuth({
          accessToken,
          email: auth.currentUser?.email || user.email || '',
          connectedAt: Date.now()
        });
        showToast('Google Calendar connected.');
        return accessToken;
      }

      const provider = createGoogleProvider({ calendar: true });
      await applyAuthPersistence(keepLoggedIn);
      if (hasGoogleIdentityClient()) {
        const result = await signInWithGoogleIdentity(auth, { calendar: true });
        const accessToken = result?.accessToken || '';
        const connectedEmail = result.firebaseResult?.user?.email || user.email || '';
        if (!accessToken) throw new Error('Google did not return Calendar permission yet.');
        setGoogleCalendarAuth({
          accessToken,
          email: connectedEmail,
          connectedAt: Date.now()
        });
        if (canManageWorkspace) {
          await saveWorkspaceSettingsPatch({
            googleCalendar: {
              ...(settings.googleCalendar || {}),
              connectedEmail,
              connectedAt: Date.now(),
              mode: 'manual-sync'
            }
          }, 'Google Calendar connected.');
        } else {
          showToast('Google Calendar connected for this session.');
        }
        return accessToken;
      }
      try {
        const result = await FirebaseSDK.signInWithPopup(auth, provider);
        const accessToken = getGoogleAccessTokenFromResult(result);
        if (!accessToken) throw new Error('Google did not return Calendar permission yet.');
        setGoogleCalendarAuth({
          accessToken,
          email: result.user?.email || user.email || '',
          connectedAt: Date.now()
        });
        if (canManageWorkspace) {
          await saveWorkspaceSettingsPatch({
            googleCalendar: {
              ...(settings.googleCalendar || {}),
              connectedEmail: result.user?.email || user.email || '',
              connectedAt: Date.now(),
              mode: 'manual-sync'
            }
          }, 'Google Calendar connected.');
        } else {
          showToast('Google Calendar connected for this session.');
        }
        return accessToken;
      } catch (error) {
        if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/web-storage-unsupported'].includes(error?.code)) {
          await startGoogleRedirect(getCurrentAuthReturnRoute(), { calendar: true });
          return '';
        }
        throw error;
      }
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Google Calendar could not connect.');
      return '';
    }
  }, [
    applyAuthPersistence,
    canManageWorkspace,
    getCurrentAuthReturnRoute,
    isNativeAppRuntime,
    keepLoggedIn,
    saveWorkspaceSettingsPatch,
    setAuthMode,
    setAuthPanelOpen,
    setAuthPersona,
    settings.googleCalendar,
    showToast,
    startGoogleRedirect,
    user
  ]);

  const markGoogleCalendarResults = useCallback(async (results = []) => {
    if (!results.length) return;
    const syncedAt = Date.now();
    setBookingsAndCache(prev => prev.map(booking => {
      const match = results.find(result => result.bookingId === booking.id);
      return match
        ? { ...booking, googleCalendarEventId: match.eventId, googleCalendarSyncedAt: syncedAt, googleCalendarLink: match.htmlLink || '' }
        : booking;
    }));
    if (!isFirebaseConfigured || !user || !workspaceOwnerId) return;
    await Promise.all(results.map(result => FirebaseSDK.updateDoc(
      FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'bookings', result.bookingId),
      {
        googleCalendarEventId: result.eventId,
        googleCalendarLink: result.htmlLink || '',
        googleCalendarSyncedAt: syncedAt
      }
    ).catch(error => console.error('Google Calendar booking sync marker failed', error))));
  }, [setBookingsAndCache, user, workspaceOwnerId]);

  const syncGoogleCalendarBookings = useCallback(async (calendarId = 'workspace') => {
    if (googleCalendarSyncing) return;
    setGoogleCalendarSyncing(true);
    try {
      let accessToken = googleCalendarAuth.accessToken;
      if (!accessToken) {
        accessToken = await connectGoogleCalendar();
      }
      if (!accessToken) return;

      const result = await syncConfirmedBookingsToGoogleCalendar({
        accessToken,
        bookings: visibleBookings,
        settings,
        staffList: displayStaffList,
        calendarId,
        durationMinutes: Number(settings.defaultBookingDurationMinutes) || 60
      });

      await markGoogleCalendarResults(result.results);
      const nextCalendarSettings = {
        ...(settings.googleCalendar || {}),
        connectedEmail: googleCalendarAuth.email || auth.currentUser?.email || user?.email || '',
        connectedAt: googleCalendarAuth.connectedAt || Date.now(),
        lastSyncedAt: Date.now(),
        lastSyncCount: result.created,
        mode: 'manual-sync'
      };
      if (canManageWorkspace) {
        await saveWorkspaceSettingsPatch({ googleCalendar: nextCalendarSettings }, result.created
          ? `${result.created} booking${result.created === 1 ? '' : 's'} synced to Google Calendar.`
          : 'Google Calendar is already up to date.'
        );
      } else {
        showToast(result.created
          ? `${result.created} booking${result.created === 1 ? '' : 's'} synced to Google Calendar.`
          : 'Google Calendar is already up to date.'
        );
      }
    } catch (error) {
      console.error(error);
      const message = error?.status === 403
        ? 'Google Calendar API needs to be enabled for this project, or the account needs Calendar permission.'
        : error?.message || 'Google Calendar sync failed.';
      showToast(message);
    } finally {
      setGoogleCalendarSyncing(false);
    }
  }, [
    canManageWorkspace,
    connectGoogleCalendar,
    displayStaffList,
    googleCalendarAuth,
    googleCalendarSyncing,
    markGoogleCalendarResults,
    saveWorkspaceSettingsPatch,
    settings,
    showToast,
    user,
    visibleBookings
  ]);

  return {
    connectGoogleCalendar,
    googleCalendarAuth,
    googleCalendarSyncing,
    setGoogleCalendarAuth,
    syncGoogleCalendarBookings
  };
}
