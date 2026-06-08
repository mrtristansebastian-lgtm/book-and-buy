import { useState } from 'react';
import {
  hasFreshAuthRedirectStart,
  rememberLoginStorageKey,
  safeLocalGet
} from '../../../utils/workspaceRoute';

export function useAuthSession() {
  const [user, setUser] = useState(null);
  const [workspaceAccess, setWorkspaceAccess] = useState([]);
  const [activeWorkspaceOwnerId, setActiveWorkspaceOwnerId] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authPersona, setAuthPersona] = useState('owner');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [keepLoggedIn, setKeepLoggedIn] = useState(() => safeLocalGet(rememberLoginStorageKey) !== 'false');
  const [authRedirectPending, setAuthRedirectPending] = useState(() => hasFreshAuthRedirectStart());
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [accountDeleteText, setAccountDeleteText] = useState('');

  return {
    accessLoading,
    accountDeleteOpen,
    accountDeleteText,
    activeWorkspaceOwnerId,
    authBusy,
    authError,
    authForm,
    authMode,
    authPanelOpen,
    authPersona,
    authRefreshTick,
    authRedirectPending,
    keepLoggedIn,
    setAccessLoading,
    setAccountDeleteOpen,
    setAccountDeleteText,
    setActiveWorkspaceOwnerId,
    setAuthBusy,
    setAuthError,
    setAuthForm,
    setAuthMode,
    setAuthPanelOpen,
    setAuthPersona,
    setAuthRedirectPending,
    setAuthRefreshTick,
    setKeepLoggedIn,
    setUser,
    setWorkspaceAccess,
    user,
    workspaceAccess
  };
}
