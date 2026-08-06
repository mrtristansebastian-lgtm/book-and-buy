import { useState } from 'react';
import { APP_NAME } from '../../config/appConfig';
import { navigate } from '../../app/routing';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { useAuth } from './AuthContext';

export function AppLoginScreen() {
  const { loadDemoWorkspace, startOwnerOnboarding, workspace } = useWorkspace();
  const { configured, signInEmail, signUpEmail, signInGoogle, user } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const runAuth = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      if (workspace.onboardingComplete && !workspace.isDemo) {
        navigate('/dashboard/overview');
      } else {
        startOwnerOnboarding();
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-shell native-ui min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md grid gap-8">
        <header className="grid gap-3">
          <div className="bb-brand-mark text-3xl">{APP_NAME}</div>
          <h1 className="bb-page-title text-4xl m-0">
            Welcome to <span className="native-accent-text">{APP_NAME}</span>.
          </h1>
          <p className="bb-muted m-0 text-base leading-relaxed">
            {configured
              ? 'Sign in with Firebase, create a workspace, or open the Flour & Flame demo dashboard.'
              : 'Local mode — open a workspace or the Flour & Flame demo. Add VITE_FIREBASE_CONFIG for real Auth.'}
          </p>
        </header>

        {configured ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              runAuth(() =>
                mode === 'signin'
                  ? signInEmail(email, password)
                  : signUpEmail(email, password)
              );
            }}
          >
            <div className="bb-segment">
              <button
                type="button"
                aria-pressed={mode === 'signin'}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === 'signup'}
                onClick={() => setMode('signup')}
              >
                Create account
              </button>
            </div>
            <input
              className="native-control-input px-4"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="native-control-input px-4"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            {error ? <p className="m-0 text-sm text-[#b45309]">{error}</p> : null}
            <button type="submit" className="bb-primary-btn" disabled={busy}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              className="bb-ghost-btn"
              disabled={busy}
              onClick={() => runAuth(() => signInGoogle())}
            >
              Continue with Google
            </button>
            {user ? (
              <p className="bb-muted m-0 text-xs">Signed in as {user.email}</p>
            ) : null}
          </form>
        ) : null}

        <div className="grid gap-3">
          <button
            type="button"
            className="bb-ink-btn"
            onClick={() => {
              if (workspace.onboardingComplete && !workspace.isDemo) {
                navigate('/dashboard/overview');
                return;
              }
              startOwnerOnboarding();
              navigate('/onboarding');
            }}
          >
            Open Workspace
          </button>
          {!configured ? (
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => {
                startOwnerOnboarding();
                navigate('/onboarding');
              }}
            >
              Create Account
            </button>
          ) : null}
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              loadDemoWorkspace();
              navigate('/demo');
            }}
          >
            View Demo As Guest
          </button>
          <button type="button" className="bb-ghost-btn" onClick={() => navigate('/portal')}>
            Client Portal
          </button>
        </div>

        <footer className="flex flex-wrap gap-4 text-sm bb-muted">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Support</span>
        </footer>
      </div>
    </div>
  );
}
