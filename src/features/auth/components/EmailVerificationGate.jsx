import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';

export const EmailVerificationGate = ({
  busy,
  error,
  onRefresh,
  onResend,
  onSignOut,
  user
}) => (
  <div className="native-ui min-h-screen bg-white text-black flex items-center justify-center px-5 py-10">
    <main className="w-full max-w-md text-center">
      <BuildABookingBrand className="mx-auto mb-8 w-52 sm:w-60" variant="dark" />
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
        <ShieldCheck size={22} />
      </div>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-neutral-400">Secure workspace</p>
      <h1 className="text-3xl font-black tracking-tight text-black sm:text-4xl">Verify your email.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
        We sent a verification link to <span className="font-bold text-black break-all">{user?.email}</span>. Verify it to unlock your workspace, client portal, bookings, and messages.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-relaxed text-red-600">
          {error}
        </p>
      )}
      <div className="mt-7 grid gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-50"
        >
          <RefreshCw size={15} />
          I verified it
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-6 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:border-black disabled:cursor-wait disabled:opacity-50"
        >
          <MailCheck size={15} />
          Resend email
        </button>
        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          className="h-11 text-[10px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:text-black disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    </main>
  </div>
);
