import { useEffect, useMemo, useRef } from 'react';
import { BrandLoader } from './AppLoading';
import { LegalDialog } from './AppOverlays';
import { AppLoginScreen, AuthActionPage, AuthDialog, EmailVerificationGate, shouldUseRedirectGoogleAuth } from '../features/auth';
import { ClientPortalGate } from '../features/client-portal';
import { DashboardRouteShell } from '../features/dashboard';
import { legalPages } from '../config/appConfig';
import {
  clientAuthPrefillStorageKey,
  safeSessionGet
} from '../utils/clientPortalRoute';
import { safeJsonParse } from '../utils/workspaceRoute';

const CLIENT_PREFILL_MAX_AGE_MS = 30 * 60 * 1000;

const readClientAuthPrefill = () => {
  if (typeof window === 'undefined') return null;

  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const params = new URLSearchParams(hashQuery);
  const stored = safeJsonParse(safeSessionGet(clientAuthPrefillStorageKey), {});
  const createdAt = Number(stored?.createdAt || 0);
  const isFreshStoredPrefill = Boolean(createdAt && Date.now() - createdAt <= CLIENT_PREFILL_MAX_AGE_MS);
  const source = params.get('source') || (isFreshStoredPrefill ? stored.source : '');

  if (source !== 'booking-success' && !params.has('email')) return null;

  const modeParam = params.get('mode') || (isFreshStoredPrefill ? stored.mode : '');
  const email = (params.get('email') || (isFreshStoredPrefill ? stored.email : '') || '').trim();
  const name = (params.get('name') || (isFreshStoredPrefill ? stored.name : '') || '').trim();

  return {
    email,
    name,
    mode: modeParam === 'signin' ? 'signin' : 'signup',
    source: source || 'booking-success'
  };
};

export function AppRouteHost({
  appId,
  auth,
  clientPortal,
  dashboard,
  db,
  landing,
  publicBooking,
  route
}) {
  const handledClientPrefillRef = useRef('');
  const clientAuthPrefill = useMemo(
    () => (route.view === 'client' ? readClientAuthPrefill() : null),
    [route.view]
  );

  const applyClientAuthPrefill = (prefill = clientAuthPrefill) => {
    if (!prefill?.email && !prefill?.name) return;
    auth.setForm(prev => ({
      ...prev,
      email: prefill.email || prev.email,
      name: prefill.name || prev.name || '',
      password: ''
    }));
  };

  const openClientAuth = (mode = clientAuthPrefill?.mode || 'signin') => {
    applyClientAuthPrefill();
    auth.openPanel(mode, 'client');
  };

  useEffect(() => {
    if (route.view !== 'client' || clientPortal.user || clientPortal.isGuestPreview || !clientAuthPrefill) return;
    const prefillKey = `${clientAuthPrefill.source}|${clientAuthPrefill.mode}|${clientAuthPrefill.email}|${clientAuthPrefill.name}`;
    if (handledClientPrefillRef.current === prefillKey) return;
    handledClientPrefillRef.current = prefillKey;

    applyClientAuthPrefill(clientAuthPrefill);
    auth.setError('');
    auth.setMode(clientAuthPrefill.mode);
    auth.setPersona('client');
    auth.setPanelOpen(true);
  }, [auth, clientAuthPrefill, clientPortal.isGuestPreview, clientPortal.user, route.view]);

  const authDialog = (
    <AuthDialog
      open={auth.panelOpen}
      persona={auth.persona}
      mode={auth.mode}
      busy={auth.busy}
      form={auth.form}
      error={auth.error}
      keepLoggedIn={auth.keepLoggedIn}
      usesRedirectGoogleAuth={shouldUseRedirectGoogleAuth()}
      onClose={() => { auth.setPanelOpen(false); auth.setError(''); }}
      onPersonaChange={auth.setPersona}
      onGoogleAuth={auth.onGoogleAuth}
      onKeepLoggedInChange={auth.setKeepLoggedIn}
      onGuestDashboard={auth.onGuestDashboard}
      onClientGuestPortal={auth.onClientGuestPortal}
      onFormChange={(updates) => auth.setForm(prev => ({ ...prev, ...updates }))}
      onPasswordReset={auth.onPasswordReset}
      onSubmit={auth.onSubmit}
      onToggleMode={() => {
        auth.setMode(auth.mode === 'signup' ? 'signin' : 'signup');
        auth.setError('');
      }}
    />
  );

  if (!route.publicSlug && route.loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <BrandLoader label="Loading workspace" />
      </div>
    );
  }

  if (route.view === 'authAction') {
    return <AuthActionPage />;
  }

  if (auth.requiresEmailVerification) {
    return (
      <EmailVerificationGate
        busy={auth.busy}
        error={auth.error}
        onRefresh={auth.onRefreshVerification}
        onResend={auth.onResendVerification}
        onSignOut={auth.onSignOut}
        user={auth.user}
      />
    );
  }

  if (route.view === 'client') {
    return (
      <ClientPortalGate
        appId={appId}
        db={db}
        user={clientPortal.user}
        isGuestPreview={clientPortal.isGuestPreview}
        authDialog={authDialog}
        onOpenClientAuth={() => openClientAuth(clientAuthPrefill?.mode || 'signin')}
        onPreviewClient={auth.onClientGuestPortal}
        onExitGuestPreview={() => {
          clientPortal.setGuestPreview(false);
          route.applyWorkspaceRoute({ view: 'landing' });
        }}
        onSignOut={auth.onSignOut}
        onOwnerLogin={() => route.applyWorkspaceRoute({ view: 'dashboard', activeTab: 'overview', editorTab: route.editorTab })}
        onInstallApp={publicBooking.onInstallApp}
      />
    );
  }

  if (route.view === 'landing') {
    return (
      <AppLoginScreen
        authDialog={authDialog}
        legalDialog={<LegalDialog pages={legalPages} panel={landing.legalPanel} onClose={() => landing.setLegalPanel(null)} />}
        user={auth.user}
        onOwnerSignIn={() => auth.openPanel('signin', 'owner')}
        onOwnerSignup={auth.onSignupOrDashboard}
        onOpenWorkspace={() => route.applyWorkspaceRoute({ view: 'dashboard', activeTab: 'overview', editorTab: route.editorTab })}
        onClientLogin={auth.onClientLogin}
        onGuestDashboard={auth.onGuestDashboard}
        onLegalPanel={landing.setLegalPanel}
      />
    );
  }

  return (
    <DashboardRouteShell
      activeTab={route.activeTab}
      mobileNavCollapsed={dashboard.mobileNavCollapsed}
      sidebarCollapsed={dashboard.sidebarCollapsed}
      overlays={{
        ...dashboard.overlays,
        authDialog,
        legalPages
      }}
      navigation={dashboard.navigation}
      routes={dashboard.routes}
    />
  );
}
