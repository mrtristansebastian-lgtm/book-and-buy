import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import * as FirebaseSDK from '../../../services/firebase';
import { auth, isFirebaseConfigured } from '../../../services/firebase';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';

const getActionParams = () => {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const merged = new URLSearchParams(window.location.search);
  new URLSearchParams(hashQuery).forEach((value, key) => merged.set(key, value));
  return merged;
};

const getSafeContinueUrl = (params) => {
  const fallback = `${window.location.origin}${window.location.pathname}#/client`;
  const value = params.get('continueUrl') || params.get('continue') || '';
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
};

export const AuthActionPage = () => {
  const params = useMemo(getActionParams, []);
  const mode = params.get('mode') || params.get('intent') || '';
  const oobCode = params.get('oobCode') || '';
  const [status, setStatus] = useState('working');
  const [message, setMessage] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isReset = mode === 'resetPassword';
  const isVerify = mode === 'verifyEmail';

  useEffect(() => {
    let cancelled = false;
    const runAction = async () => {
      if (!isFirebaseConfigured || !auth || !oobCode) {
        setStatus('error');
        setMessage('This secure link is missing required details. Request a fresh email and try again.');
        return;
      }
      try {
        if (isVerify) {
          await FirebaseSDK.applyActionCode(auth, oobCode);
          await auth.currentUser?.reload?.();
          if (!cancelled) {
            setStatus('success');
            setMessage('Your email is verified. You can continue into Build A Booking.');
          }
          return;
        }
        if (isReset) {
          const email = await FirebaseSDK.verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) {
            setResetEmail(email || '');
            setStatus('ready');
            setMessage('Choose a new password for your Build A Booking account.');
          }
          return;
        }
        setStatus('error');
        setMessage('This email action is not supported.');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setStatus('error');
          setMessage('This secure link is expired or has already been used. Request a fresh email and try again.');
        }
      }
    };
    runAction();
    return () => {
      cancelled = true;
    };
  }, [isReset, isVerify, oobCode]);

  const finishReset = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setMessage('Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match yet.');
      return;
    }
    setStatus('working');
    try {
      await FirebaseSDK.confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
      setMessage('Your password was reset. You can sign in with your new password.');
    } catch (error) {
      console.error(error);
      setStatus('ready');
      setMessage('That reset link could not be completed. Request a fresh email and try again.');
    }
  };

  const continueUrl = typeof window !== 'undefined' ? getSafeContinueUrl(params) : '#/client';
  const statusIcon = status === 'error' ? <XCircle size={22} /> : status === 'ready' ? <KeyRound size={22} /> : <CheckCircle2 size={22} />;

  return (
    <div className="native-ui min-h-screen bg-white text-black flex items-center justify-center px-5 py-10">
      <main className="w-full max-w-md text-center">
        <BuildABookingBrand className="mx-auto mb-8 w-52 sm:w-60" variant="dark" />
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-black text-white'}`}>
          {statusIcon}
        </div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-neutral-400">
          {isReset ? 'Password reset' : 'Email verification'}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">
          {status === 'working' ? 'Checking link.' : status === 'error' ? 'Link issue.' : isReset && status === 'ready' ? 'New password.' : 'All set.'}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">{message || 'One moment while we secure your account.'}</p>

        {isReset && status === 'ready' && (
          <form onSubmit={finishReset} className="mt-7 space-y-3 text-left">
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs font-bold text-neutral-500 break-all">{resetEmail}</div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              placeholder="New password"
              className="h-12 w-full rounded-lg border border-neutral-100 bg-neutral-50 px-5 text-sm font-bold outline-none transition-colors focus:border-black focus:bg-white"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              placeholder="Confirm password"
              className="h-12 w-full rounded-lg border border-neutral-100 bg-neutral-50 px-5 text-sm font-bold outline-none transition-colors focus:border-black focus:bg-white"
            />
            <button type="submit" className="h-12 w-full rounded-full bg-black text-[10px] font-black uppercase tracking-widest text-white">
              Save password
            </button>
          </form>
        )}

        {(status === 'success' || status === 'error') && (
          <a
            href={continueUrl}
            className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-[10px] font-black uppercase tracking-widest text-white"
          >
            Continue
          </a>
        )}
      </main>
    </div>
  );
};
