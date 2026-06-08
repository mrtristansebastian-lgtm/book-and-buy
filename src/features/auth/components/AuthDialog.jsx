import { Eye, Globe, X } from 'lucide-react';

export const AuthDialog = ({
  open,
  persona,
  mode,
  busy,
  form,
  error,
  keepLoggedIn,
  usesRedirectGoogleAuth,
  onClose,
  onPersonaChange,
  onGoogleAuth,
  onKeepLoggedInChange,
  onGuestDashboard,
  onClientGuestPortal,
  onFormChange,
  onPasswordReset,
  onSubmit,
  onToggleMode
}) => {
  if (!open) return null;

  const personaCopy = persona === 'client'
    ? {
      eyebrow: 'Client Access',
      title: mode === 'signup' ? 'Create Client Account' : 'Client Sign In',
      body: 'Clients can track bookings, request reschedules, get updates, and chat with the place they booked with.',
      submit: mode === 'signup' ? 'Create Client Login' : 'Open Client Portal'
    }
    : {
      eyebrow: 'Workspace Access',
      title: mode === 'signup' ? 'Create Account' : 'Sign In',
      body: 'Owners and invited staff can use the same secure sign-in.',
      submit: mode === 'signup' ? 'Create Workspace' : 'Sign In'
    };

  const googleLabel = busy
    ? 'Connecting...'
    : mode === 'signup'
      ? 'Sign Up With Google'
      : 'Continue With Google';

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form onSubmit={onSubmit} className="native-auth-panel w-full sm:max-w-md bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-5 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300 max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400 mb-2">{personaCopy.eyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">{personaCopy.title}</h2>
            <p className="text-sm text-neutral-500 mt-2">{personaCopy.body}</p>
          </div>
          <button type="button" aria-label="Close sign in panel" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center hover:text-black transition-colors shrink-0"><X size={16}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1 mb-4">
          {[
            ['owner', 'Owner / Staff'],
            ['client', 'Client']
          ].map(([nextPersona, label]) => (
            <button
              key={nextPersona}
              type="button"
              onClick={() => onPersonaChange(nextPersona)}
              className={`h-10 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${persona === nextPersona ? 'bg-black text-white shadow-lg' : 'text-neutral-500 hover:text-black'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onGoogleAuth} disabled={busy} className="w-full h-12 rounded-lg bg-white border border-neutral-200 text-black text-[11px] font-bold uppercase tracking-widest hover:bg-neutral-50 hover:border-neutral-300 transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 disabled:cursor-wait">
          <Globe size={16}/> {googleLabel}
        </button>
        {usesRedirectGoogleAuth && (
          <p className="mt-3 text-xs leading-relaxed text-neutral-500">
            On mobile, Google opens securely and brings you back to this workspace.
          </p>
        )}
        <label className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 cursor-pointer">
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-black">Keep me logged in</span>
            <span className="block text-xs text-neutral-500 mt-1">Remember this device for smoother return visits.</span>
          </span>
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(event) => onKeepLoggedInChange(event.target.checked)}
            className="sr-only"
          />
          <span className={`relative h-7 w-12 rounded-full transition-colors ${keepLoggedIn ? 'bg-black' : 'bg-neutral-200'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${keepLoggedIn ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </label>
        <button
          type="button"
          onClick={persona === 'client' ? onClientGuestPortal : onGuestDashboard}
          className="mt-3 w-full h-12 rounded-lg bg-[#39FF14] text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#39FF14]/20 hover:brightness-95 transition-all"
        >
          <Eye size={16}/> {persona === 'client' ? 'Preview Client Portal' : 'Browse As Guest'}
        </button>
        <div className="flex items-center gap-4 my-5">
          <div className="h-px bg-neutral-100 flex-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">or email</span>
          <div className="h-px bg-neutral-100 flex-1" />
        </div>
        <div className="space-y-3">
          <input type="email" value={form.email} onChange={(event) => onFormChange({ email: event.target.value })} required placeholder="Email address" autoComplete="email" className="w-full h-12 bg-neutral-50 border border-neutral-100 rounded-lg px-5 text-sm font-bold outline-none focus:bg-white focus:border-black transition-colors" />
          <input type="password" value={form.password} onChange={(event) => onFormChange({ password: event.target.value })} required minLength={6} placeholder="Password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full h-12 bg-neutral-50 border border-neutral-100 rounded-lg px-5 text-sm font-bold outline-none focus:bg-white focus:border-black transition-colors" />
        </div>
        {mode === 'signin' && (
          <button
            type="button"
            onClick={onPasswordReset}
            disabled={busy}
            className="mt-3 w-full text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:text-black disabled:opacity-50"
          >
            Forgot password?
          </button>
        )}
        {error && <p role="alert" className="mt-4 text-xs font-bold text-red-500 leading-relaxed">{error}</p>}
        <button type="submit" disabled={busy} className="mt-5 w-full h-12 rounded-lg bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-wait">
          {busy ? 'Please Wait' : personaCopy.submit}
        </button>
        <button type="button" onClick={onToggleMode} className="mt-4 w-full text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
          {mode === 'signup' ? 'Already have an account?' : 'Need an account? Create one'}
        </button>
      </form>
    </div>
  );
};
