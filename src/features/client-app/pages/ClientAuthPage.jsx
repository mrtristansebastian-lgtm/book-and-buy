import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { useState } from 'react';
import { getLocationPath, navigate } from '../../../app/routing';
import { profileAuthReturn } from '../profileAuthReturn';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useClientProfile } from '../ClientProfileContext';

/** Individual auth — same welcome chrome as business “Continue as a …” screen. */
export function ClientAuthPage() {
  const { configured, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const { workspace, loadDemoWorkspace } = useWorkspace();
  const { bootstrapClientAfterAuth, enterDemoClient } = useClientProfile();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const busy = Boolean(busyAction);
  const returnPath = profileAuthReturn(getLocationPath());

  const finish = async (user) => {
    if (user) await bootstrapClientAfterAuth(user, { displayName });
    navigate(returnPath, { replace: true });
  };

  const run = async (action, { justSignedUp = false, source = 'email' } = {}) => {
    if (busy) return;
    setBusyAction(source);
    setError('');
    setNotice('');
    try {
      const user = await action();
      if (!user) {
        setNotice('Continuing with Google in this window…');
        return;
      }
      if (justSignedUp && user?.email && !user.emailVerified) {
        setNotice('Check your email to verify your account before cloud uploads.');
      }
      await finish(user);
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusyAction('');
    }
  };

  const viewDemo = (source = 'demo') => {
    if (busy) return;
    setBusyAction(source);
    setError('');
    try {
      // Moving between business and customer demos must not reset local edits.
      if (!workspace?.isDemo) loadDemoWorkspace?.();
      enterDemoClient();
      navigate(returnPath, { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not open demo');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="bb-welcome native-ui">
      <div className="bb-welcome-atmosphere" aria-hidden="true" />
      <div className="bb-welcome-stage is-auth">
        <section className="bb-welcome-panel bb-welcome-panel--auth">
          <Button action="back" variant="secondary"
            type="button"
            className="bb-welcome-back"
            onClick={() => navigate('/', { replace: true })}
            disabled={busy}
          >
            Back
          </Button>
          <BrandMark size="lg" className="bb-welcome-brand-slot" />
          <h1 className="bb-welcome-auth-title">Continue as an individual</h1>
          <p className="bb-welcome-auth-copy">
            Sign in, create an account, or explore the individual demo.
          </p>

          {configured ? (
            <form
              className="bb-welcome-form"
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  async () => {
                    if (mode === 'signin') return signInEmail(email, password);
                    return signUpEmail(email, password, { displayName });
                  },
                  { justSignedUp: mode === 'signup' }
                );
              }}
            >
              <div className="bb-segment">
                <FilterChip
                  type="button"
                  disabled={busy}
                  selected={mode === 'signin'}
                  onClick={() => setMode('signin')}
                >
                  Sign in
                </FilterChip>
                <FilterChip
                  type="button"
                  disabled={busy}
                  selected={mode === 'signup'}
                  onClick={() => setMode('signup')}
                >
                  Create account
                </FilterChip>
              </div>
              {mode === 'signup' ? (
                <label className="bb-welcome-field">
                  <span>Your name</span>
                <input
                  className="native-control-input px-4"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  disabled={busy}
                />
                </label>
              ) : null}
              <label className="bb-welcome-field">
                <span>Email</span>
              <input
                className="native-control-input px-4"
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={busy}
                autoCapitalize="none"
                spellCheck={false}
              />
              </label>
              <label className="bb-welcome-field">
                <span>Password</span>
              <input
                className="native-control-input px-4"
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                disabled={busy}
              />
              </label>
              {error ? <p className="bb-welcome-error" role="alert">{error}</p> : null}
              {notice ? <p className="bb-welcome-notice" role="status">{notice}</p> : null}
              <Button action={mode === 'signin' ? 'signIn' : 'create'} busy={busyAction === 'email'} busyLabel="Please wait…" variant="primary" type="submit" className="bb-primary-btn" disabled={busy}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
              <Button action="signIn" busy={busyAction === 'google'} busyLabel="Connecting…" variant="secondary"
                type="button"
                className="bb-ghost-btn"
                disabled={busy}
                onClick={() => run(() => signInGoogle(), { source: 'google' })}
              >
                Continue with Google
              </Button>
            </form>
          ) : (
            <div className="bb-welcome-form">
              <p className="bb-welcome-local-note">
                Firebase is not configured — running in local/demo mode. Add{' '}
                <code>VITE_FIREBASE_CONFIG</code> to enable Google and email auth.
              </p>
              {error ? <p className="bb-welcome-error" role="alert">{error}</p> : null}
              <Button action="continue" busy={busyAction === 'local'} busyLabel="Please wait…" variant="primary" type="button" className="bb-primary-btn" disabled={busy} onClick={() => viewDemo('local')}>
                Get started
              </Button>
            </div>
          )}

          <Button action="view" busy={busyAction === 'demo'} busyLabel="Opening…" variant="secondary" type="button" className="bb-welcome-demo" disabled={busy} onClick={() => viewDemo('demo')}>
            View individual demo
          </Button>
        </section>
      </div>
    </div>
  );
}
