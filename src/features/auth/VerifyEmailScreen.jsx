import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { BrandMark } from '../../shared/ui/BrandMark';
import { Button } from '../../shared/ui/Button';
import { getFirebase } from '../../shared/firebase/client';

export function VerifyEmailScreen() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run(action) {
    setBusy(action); setError(''); setMessage('');
    try {
      const current = getFirebase()?.auth.currentUser;
      if (!current) throw new Error('Sign in again to continue.');
      if (action === 'resend') {
        await sendEmailVerification(current);
        setMessage('Verification email sent. Check your inbox and spam folder.');
      } else {
        await current.reload();
        await current.getIdToken(true);
        if (!current.emailVerified) setMessage('Your email is not verified yet. Open the link in your verification email, then try again.');
      }
    } catch (err) {
      setError(err.code === 'auth/too-many-requests' ? 'Please wait a moment before trying again.' : 'We could not check your account. Please try again.');
    } finally { setBusy(''); }
  }
  return <div className="bb-welcome native-ui"><div className="bb-welcome-atmosphere" aria-hidden="true" />
    <div className="bb-welcome-stage is-auth"><section className="bb-welcome-panel bb-welcome-panel--auth">
      <BrandMark size="lg" className="bb-welcome-brand-slot" />
      <div className="bb-empty-state-icon" aria-hidden="true"><MailCheck size={28} /></div>
      <h1 className="bb-welcome-auth-title">Check your email</h1>
      <p className="bb-welcome-auth-copy">Your account is created. Open the verification link sent to <strong>{user?.email}</strong> to start setting up your business.</p>
      <div className="bb-welcome-form">
        <Button action="confirm" variant="primary" busy={busy === 'check'} disabled={Boolean(busy)} onClick={() => run('check')}>I’ve verified my email</Button>
        <Button action="email" variant="secondary" busy={busy === 'resend'} disabled={Boolean(busy)} onClick={() => run('resend')}>Resend verification email</Button>
        {message ? <p className="bb-welcome-notice" role="status">{message}</p> : null}
        {error ? <p className="bb-welcome-error" role="alert">{error}</p> : null}
        <Button action="signOut" variant="ghost" disabled={Boolean(busy)} onClick={signOut}>Use another account</Button>
      </div>
    </section></div>
  </div>;
}
