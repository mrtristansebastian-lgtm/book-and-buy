import { ArrowRight, BookOpen, Check, ShieldCheck } from 'lucide-react';

export const ProfileActionStrip = ({
  isGuestWorkspace,
  onOpenOwnerAuth,
  onOpenOwnerManual,
  onSaveProfile
}) => (
  <div className="dashboard-action-strip max-w-6xl mb-4 md:mb-6">
    <div className="profile-header-actions">
      <div className="hidden md:flex flex-col sm:flex-row gap-3">
        {isGuestWorkspace ? (
          <>
            <button onClick={() => onOpenOwnerAuth('signin')} className="h-12 px-7 bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xl shadow-black/5 hover:-translate-y-0.5 hover:border-black transition-all flex items-center justify-center gap-2">
              <ShieldCheck size={14} /> Sign In
            </button>
            <button onClick={() => onOpenOwnerAuth('signup')} className="h-12 px-7 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xl shadow-black/10 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <ArrowRight size={14} /> Create Account
            </button>
          </>
        ) : (
          <>
            <button onClick={onOpenOwnerManual} className="h-12 px-7 bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xl shadow-black/5 hover:-translate-y-0.5 hover:border-black transition-all flex items-center justify-center gap-2">
              <BookOpen size={14} /> Owner Manual
            </button>
            <button onClick={onSaveProfile} className="h-12 px-7 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-xl shadow-black/10 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <Check size={14} /> Save Profile
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);
