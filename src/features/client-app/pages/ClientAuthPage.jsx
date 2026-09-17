import { useState } from 'react';
import { navigate } from '../../../app/routing';
import { BrandMark } from '../../../shared/ui/BrandMark';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useClientProfile } from '../ClientProfileContext';

/** Client login / signup for the Instagram-style app. */
export function ClientAuthPage() {
  const { configured, signInEmail, signUpEmail, signInGoogle, isLocalMode } = useAuth();
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

  return (
    <div className="bb-client-auth">
      <div className="bb-client-auth-card">
        <header className="bb-client-auth-head">
          <BrandMark size="lg" />
          <h1 className="bb-client-auth-title">Your bookings, feed &amp; messages</h1>
          <p className="bb-muted m-0">
            Sign in as a client to follow businesses, chat, and manage bookings and orders.
          </p>
        </header>

        {configured ? (
          <form
            className="bb-client-auth-form"
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
              <button type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>
                Sign in
              </button>
              <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>
                Create account
              </button>
            </div>
            {mode === 'signup' ? (
              <input
                className="native-control-input px-4"
                placeholder="Your name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            ) : null}
            <input
              className="native-control-input px-4"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="native-control-input px-4"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <p className="bb-client-auth-error">{error}</p> : null}
            {notice ? <p className="bb-client-auth-notice">{notice}</p> : null}
            <button type="submit" className="bb-primary-btn" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create client account'}
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
          <div className="bb-client-auth-form">
            <p className="bb-muted m-0 text-sm">
              Firebase is not configured — local/demo mode. Add{' '}
              <code>VITE_FIREBASE_CONFIG</code> to enable Google and email auth.
            </p>
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => {
                loadDemoWorkspace?.();
                enterDemoClient();
                navigate('/app/home', { replace: true });
              }}
            >
              Continue as demo client
            </button>
          </div>
        )}

        <footer className="bb-client-auth-foot">
          <button type="button" className="bb-ghost-btn" onClick={() => navigate('/')}>
            Business owner login
          </button>
          {isLocalMode || !configured ? (
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => {
                loadDemoWorkspace?.();
                enterDemoClient();
                navigate('/app/home', { replace: true });
              }}
            >
              Demo client
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
