import { ShieldCheck, Trash2, X } from 'lucide-react';

export const ProfileAccountControls = ({
  activeProfileSection,
  authBusy,
  isGuestWorkspace,
  keepLoggedIn,
  onDeleteAccount,
  onSignOut,
  onToggleKeepLoggedIn
}) => (
  <div className={`profile-section profile-section-account ${activeProfileSection === 'account' ? 'grid' : 'hidden'} grid-cols-1 lg:grid-cols-12 gap-5`}>
    <section className="lg:col-span-7 bg-white rounded-lg border border-neutral-100 p-5 md:p-7 shadow-[0_22px_70px_-60px_rgba(15,23,42,0.5)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-neutral-300 mb-2">Device Session</p>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black">Keep me logged in</h3>
            <p className="text-sm text-neutral-500 leading-relaxed mt-2 max-w-xl">Use this on trusted devices so Google and email sign-in return cleanly to the workspace you were using.</p>
          </div>
        </div>
        <label className="inline-flex items-center gap-3 rounded-full bg-neutral-50 border border-neutral-100 p-1.5 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(event) => onToggleKeepLoggedIn(event.target.checked)}
            className="sr-only"
          />
          <span className={`relative h-10 w-16 rounded-full transition-colors ${keepLoggedIn ? 'bg-black' : 'bg-neutral-200'}`}>
            <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-lg transition-transform ${keepLoggedIn ? 'translate-x-7' : 'translate-x-1'}`} />
          </span>
          <span className="pr-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {keepLoggedIn ? 'On' : 'Off'}
          </span>
        </label>
      </div>
    </section>

    <section className="lg:col-span-5 bg-white rounded-lg border border-neutral-100 p-5 md:p-7 shadow-[0_22px_70px_-60px_rgba(15,23,42,0.5)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-neutral-300 mb-3">Account Control</p>
      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black">{isGuestWorkspace ? 'Exit guest mode' : 'Sign out safely'}</h3>
      <p className="text-sm text-neutral-500 leading-relaxed mt-2 mb-5">{isGuestWorkspace ? 'Close the local guest workspace and return to the app login screen.' : 'End this session and return to the app login screen without leaving stale login redirects behind.'}</p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={authBusy}
        className="w-full h-12 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        <X size={14} /> {isGuestWorkspace ? 'Exit Guest' : 'Sign Out'}
      </button>
      {!isGuestWorkspace && (
        <button
          type="button"
          onClick={onDeleteAccount}
          disabled={authBusy}
          className="mt-3 w-full h-12 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} /> Delete Account
        </button>
      )}
    </section>
  </div>
);
