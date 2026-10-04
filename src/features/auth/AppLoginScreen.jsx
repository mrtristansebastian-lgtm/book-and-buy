import { Button } from '../../shared/ui/Button';
import { FilterChip } from '../../shared/ui/FilterChip';
import { useState } from 'react';
import { navigate } from '../../app/routing';
import { BrandMark } from '../../shared/ui/BrandMark';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { useAuth } from './AuthContext';
import { useClientProfile } from '../client-app/ClientProfileContext';

export function AppLoginScreen() {
  const { loadDemoWorkspace, startOwnerOnboarding, exitDemoMode, workspace } = useWorkspace();
  const { configured, signInEmail, signUpEmail, signInGoogle } = useAuth();
  const { bootstrapClientAfterAuth, enterDemoClient } = useClientProfile();

  const [step, setStep] = useState('role');
  const [audience, setAudience] = useState(null);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const busy = Boolean(busyAction);

  const isIndividual = audience === 'individual';
  const isBusiness = audience === 'business';

  const chooseAudience = (next) => {
    setAudience(next);
    setStep('auth');
    setMode('signin');
    setError('');
    setNotice('');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  const goBack = () => {
    setStep('role');
    setAudience(null);
    setError('');
    setNotice('');
    setBusyAction('');
  };

  const finishBusiness = () => {
    const owner = workspace.isDemo ? exitDemoMode() : workspace;
    if (owner?.onboardingComplete) {
      navigate('/dashboard/overview');
      return;
    }
    startOwnerOnboarding();
    navigate('/onboarding');
  };

  const finishIndividual = async (authUser) => {
    if (authUser) {
      await bootstrapClientAfterAuth(authUser, { displayName });
    }
    navigate('/app/home', { replace: true });
  };

  const runAuth = async (action, { justSignedUp = false, source = 'email' } = {}) => {
    if (busy) return;
    setBusyAction(source);
    setError('');
    setNotice('');
    try {
      const authUser = await action();
      /* Redirect Google flow returns null until the page reloads with a session. */
      if (!authUser) {
        setNotice('Continuing with Google in this window…');
        return;
      }
      if (justSignedUp && authUser?.email && !authUser.emailVerified) {
        setNotice('Check your email to verify your account before uploading or saving to the cloud.');
      }
      if (isIndividual) {
        await finishIndividual(authUser);
        return;
      }
      finishBusiness();
    } catch (err) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setBusyAction('');
    }
  };

  const runLocalContinue = () => {
    if (busy) return;
    setBusyAction('local');
    setError('');
    try {
      if (isIndividual) {
        loadDemoWorkspace?.();
        enterDemoClient();
        navigate('/app/home', { replace: true });
        return;
      }
      startOwnerOnboarding();
      navigate('/onboarding');
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusyAction('');
    }
  };

  const viewDemo = () => {
    if (busy) return;
    setBusyAction('demo');
    setError('');
    try {
      if (isIndividual) {
        loadDemoWorkspace?.();
        enterDemoClient();
        navigate('/app/home', { replace: true });
        return;
      }
      loadDemoWorkspace();
      navigate('/demo');
    } catch (err) {
      setError(err?.message || 'Could not open demo');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="bb-welcome native-ui">
      <div className="bb-welcome-atmosphere" aria-hidden="true" />
      <div className={`bb-welcome-stage${step === 'auth' ? ' is-auth' : ''}`}>
        {step === 'role' ? (
          <section className="bb-welcome-panel bb-welcome-panel--role" key="role">
            <BrandMark size="hero" className="bb-welcome-brand-slot" />
            <p className="bb-welcome-lead">Book, buy, and run your day in one place.</p>
            <div className="bb-welcome-choices" role="group" aria-label="How will you use Book and Buy?">
              <button
                type="button"
                className="bb-welcome-choice"
                onClick={() => chooseAudience('individual')}
              >
                <span className="bb-welcome-choice-label">I’m an individual</span>
                <span className="bb-welcome-choice-hint">Book, follow, and message businesses</span>
              </button>
              <button
                type="button"
                className="bb-welcome-choice"
                onClick={() => chooseAudience('business')}
              >
                <span className="bb-welcome-choice-label">I’m a business</span>
                <span className="bb-welcome-choice-hint">Create a free profile. Get discovered on Places.</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="bb-welcome-panel bb-welcome-panel--auth" key="auth">
            <Button action="back" variant="secondary" type="button" className="bb-welcome-back" onClick={goBack} disabled={busy}>
              Back
            </Button>
            <BrandMark size="lg" className="bb-welcome-brand-slot" />
            <h1 className="bb-welcome-auth-title">
              {isIndividual ? 'Continue as an individual' : 'Continue as a business'}
            </h1>
            <p className="bb-welcome-auth-copy">
              {isIndividual
                ? 'Sign in, create an account, or explore the individual demo.'
                : 'Sign in or create your free business profile. No subscription or card required.'}
            </p>

            {configured ? (
              <form
                className="bb-welcome-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAuth(
                    async () => {
                      if (mode === 'signin') return signInEmail(email, password);
                      return signUpEmail(email, password, {
                        displayName: isIndividual ? displayName : ''
                      });
                    },
                    { justSignedUp: mode === 'signup' }
                  );
                }}
              >
                <div className="bb-filter-group">
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
                {isIndividual && mode === 'signup' ? (
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
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
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
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  disabled={busy}
                />
                </label>
                {error ? <p className="bb-welcome-error" role="alert">{error}</p> : null}
                {notice ? <p className="bb-welcome-notice" role="status">{notice}</p> : null}
                <Button action={mode === 'signin' ? 'signIn' : 'create'} busy={busyAction === 'email'} busyLabel="Please wait…" variant="primary" type="submit" className="bb-primary-btn" disabled={busy}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
                <Button action="signIn" busy={busyAction === 'google'} busyLabel="Connecting…" variant="primary"
                  type="button"
                  className="bb-ghost-btn"
                  disabled={busy}
                  onClick={() => runAuth(() => signInGoogle(), { source: 'google' })}
                >
                  Continue with Google
                </Button>
              </form>
            ) : (
              <div className="bb-welcome-form">
                <p className="bb-welcome-local-note">
                  Firebase is not configured — running in local/demo mode. Add{' '}
                  <code>VITE_FIREBASE_CONFIG</code> to <code>.env.local</code> (see{' '}
                  <code>docs/firebase-launch-checklist.md</code>).
                </p>
                {error ? <p className="bb-welcome-error" role="alert">{error}</p> : null}
                <Button action={isBusiness ? 'create' : 'continue'} busy={busyAction === 'local'} busyLabel="Please wait…" variant="primary"
                  type="button"
                  className="bb-primary-btn"
                  disabled={busy}
                  onClick={runLocalContinue}
                >
                  {isBusiness ? 'Create account' : 'Get started'}
                </Button>
              </div>
            )}

            <Button action="view" busy={busyAction === 'demo'} busyLabel="Opening…" variant="secondary"
              type="button"
              className="bb-welcome-demo"
              disabled={busy}
              onClick={viewDemo}
            >
              {isIndividual ? 'View individual demo' : 'View business demo'}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
