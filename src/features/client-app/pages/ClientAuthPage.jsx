import { useState } from 'react';
import { navigate } from '../../../app/routing';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useClientProfile } from '../ClientProfileContext';

/** Individual auth — same welcome chrome as business “Continue as a …” screen. */
export function ClientAuthPage() {
  const { configured, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const { loadDemoWorkspace } = useWorkspace();
  const { bootstrapClientAfterAuth, enterDemoClient } = useClientProfile();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (user) => {
    if (user) await bootstrapClientAfterAuth(user, { displayName });
    navigate('/app/home', { replace: true });
  };

  const run = async (action, { justSignedUp = false } = {}) => {
    setBusy(true);
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
      setBusy(false);
    }
  };

  const viewDemo = () => {
    setBusy(true);
    setError('');
    try {
      loadDemoWorkspace?.();
      enterDemoClient();
      navigate('/app/home', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not open demo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-welcome native-ui">
      <div className="bb-welcome-atmosphere" aria-hidden="true" />
      <div className="bb-welcome-stage is-auth">
        <section className="bb-welcome-panel bb-welcome-panel--auth">
          <button
            type="button"
            className="bb-welcome-back"
            onClick={() => navigate('/', { replace: true })}
            disabled={busy}
          >
            Back
          </button>
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
              {mode === 'signup' ? (
                <input
                  className="native-control-input px-4"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                />
              ) : null}
              <input
                className="native-control-input px-4"
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <input
                className="native-control-input px-4"
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              {error ? <p className="bb-welcome-error">{error}</p> : null}
              {notice ? <p className="bb-welcome-notice">{notice}</p> : null}
              <button type="submit" className="bb-primary-btn" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <button
                type="button"
                className="bb-ghost-btn"
                disabled={busy}
                onClick={() => run(() => signInGoogle())}
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <div className="bb-welcome-form">
              <p className="bb-welcome-local-note">
                Firebase is not configured — running in local/demo mode. Add{' '}
                <code>VITE_FIREBASE_CONFIG</code> to enable Google and email auth.
              </p>
              {error ? <p className="bb-welcome-error">{error}</p> : null}
              <button type="button" className="bb-primary-btn" disabled={busy} onClick={viewDemo}>
                {busy ? 'Please wait…' : 'Get started'}
              </button>
            </div>
          )}

          <button type="button" className="bb-welcome-demo" disabled={busy} onClick={viewDemo}>
            View individual demo
          </button>
        </section>
      </div>
    </div>
  );
}
