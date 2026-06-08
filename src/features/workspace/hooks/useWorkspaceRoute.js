import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInitialWorkspaceRoute,
  getPublicBookingSlug,
  getWorkspaceRouteFromUrl,
  normalizeEditorTabId,
  normalizeWorkspaceRoute,
  saveWorkspaceRoute,
  shouldStartInGuestWorkspace
} from '../../../utils/workspaceRoute';

const dashboardFallbackRoute = { view: 'dashboard', activeTab: 'overview', editorTab: 'introduction' };
const clientFallbackRoute = { view: 'client', activeTab: 'overview', editorTab: 'introduction' };

export function useWorkspaceRoute({ confirmLeavingUnsavedChanges, loading }) {
  const [initialWorkspaceRoute] = useState(getInitialWorkspaceRoute);
  const startsInGuestWorkspace = useMemo(
    () => shouldStartInGuestWorkspace(initialWorkspaceRoute),
    [initialWorkspaceRoute]
  );
  const [view, setView] = useState(initialWorkspaceRoute.view);
  const [activeTab, setActiveTab] = useState(initialWorkspaceRoute.activeTab);
  const [editorTab, setEditorTab] = useState(initialWorkspaceRoute.editorTab);
  const [publicSlug, setPublicSlug] = useState(getPublicBookingSlug);

  const navigateWorkspaceTab = useCallback((nextTab, nextEditorTab) => {
    if (!nextTab) return false;
    if (nextTab !== activeTab && !confirmLeavingUnsavedChanges()) return false;
    setActiveTab(nextTab);
    if (nextEditorTab) setEditorTab(normalizeEditorTabId(nextEditorTab));
    return true;
  }, [activeTab, confirmLeavingUnsavedChanges]);

  const applyWorkspaceRoute = useCallback((route = {}) => {
    const nextRoute = normalizeWorkspaceRoute(route, dashboardFallbackRoute);
    const leavingCurrentWork = nextRoute.view !== view || (nextRoute.view === 'dashboard' && nextRoute.activeTab !== activeTab);
    if (leavingCurrentWork && !confirmLeavingUnsavedChanges()) return false;
    setView(nextRoute.view);
    if (nextRoute.view === 'dashboard') {
      setActiveTab(nextRoute.activeTab);
      if (nextRoute.activeTab === 'editor') setEditorTab(nextRoute.editorTab || 'introduction');
    }
    saveWorkspaceRoute(nextRoute);
    return true;
  }, [activeTab, confirmLeavingUnsavedChanges, view]);

  const getCurrentAuthReturnRoute = useCallback(() => normalizeWorkspaceRoute({
    view: 'dashboard',
    activeTab: view === 'dashboard' ? activeTab : 'overview',
    editorTab
  }, dashboardFallbackRoute), [activeTab, editorTab, view]);

  const getAuthReturnRouteForPersona = useCallback((persona = 'owner') => (
    persona === 'client'
      ? normalizeWorkspaceRoute({ view: 'client' }, clientFallbackRoute)
      : getCurrentAuthReturnRoute()
  ), [getCurrentAuthReturnRoute]);

  const syncRouteStateFromLocation = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.search.includes('auth=google')) return false;
    const nextRoute = getWorkspaceRouteFromUrl();
    if (!nextRoute) return false;

    saveWorkspaceRoute(nextRoute);
    setView(currentView => currentView === nextRoute.view ? currentView : nextRoute.view);
    if (nextRoute.view === 'dashboard') {
      setActiveTab(currentTab => currentTab === nextRoute.activeTab ? currentTab : nextRoute.activeTab);
      if (nextRoute.activeTab === 'editor') {
        setEditorTab(currentEditorTab => currentEditorTab === nextRoute.editorTab ? currentEditorTab : nextRoute.editorTab);
      }
    }
    return true;
  }, []);

  useEffect(() => {
    const syncPublicRoute = () => {
      const nextPublicSlug = getPublicBookingSlug();
      setPublicSlug(nextPublicSlug);
      if (!nextPublicSlug && !loading) syncRouteStateFromLocation();
    };
    window.addEventListener('popstate', syncPublicRoute);
    window.addEventListener('hashchange', syncPublicRoute);
    return () => {
      window.removeEventListener('popstate', syncPublicRoute);
      window.removeEventListener('hashchange', syncPublicRoute);
    };
  }, [loading, syncRouteStateFromLocation]);

  useEffect(() => {
    if (publicSlug || loading) return;
    const route = saveWorkspaceRoute({ view, activeTab, editorTab });
    if (typeof window === 'undefined' || window.location.search.includes('auth=google')) return;
    const nextHash = route.view === 'dashboard'
      ? `#/dashboard/${route.activeTab}`
      : route.view === 'client'
        ? '#/client'
        : route.view === 'authAction'
          ? (window.location.hash || '#/auth/action')
          : '';
    if (window.location.hash !== nextHash) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [publicSlug, loading, view, activeTab, editorTab]);

  useEffect(() => {
    if (publicSlug || loading || typeof window === 'undefined') return undefined;

    syncRouteStateFromLocation();
    window.addEventListener('hashchange', syncRouteStateFromLocation);
    window.addEventListener('popstate', syncRouteStateFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncRouteStateFromLocation);
      window.removeEventListener('popstate', syncRouteStateFromLocation);
    };
  }, [publicSlug, loading, syncRouteStateFromLocation]);

  return {
    activeTab,
    applyWorkspaceRoute,
    editorTab,
    getAuthReturnRouteForPersona,
    getCurrentAuthReturnRoute,
    initialWorkspaceRoute,
    navigateWorkspaceTab,
    publicSlug,
    setActiveTab,
    setEditorTab,
    setPublicSlug,
    setView,
    startsInGuestWorkspace,
    view
  };
}
