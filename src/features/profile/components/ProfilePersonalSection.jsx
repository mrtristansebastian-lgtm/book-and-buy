import { Camera, Crop, Mail, Phone } from 'lucide-react';

export const ProfilePersonalSection = ({
  activeProfileSection,
  isGuestWorkspace,
  onOpenOwnerAuth,
  onPhotoUpload,
  onRemovePhoto,
  personalDisplayName,
  personalProfile,
  updatePersonalProfile,
  user,
  workspaceRole
}) => (
  <div className={`profile-section profile-section-account ${activeProfileSection === 'account' ? 'block' : 'hidden'} overflow-hidden bg-white rounded-lg border border-neutral-100 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.75)]`}>
    <div className="grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-5 bg-black text-white p-6 md:p-8 flex flex-col justify-between gap-10">
        <div className="flex items-center gap-4">
          <label className="relative w-16 h-16 rounded-lg bg-white text-black flex items-center justify-center overflow-hidden font-bold text-2xl shadow-xl cursor-pointer group shrink-0">
            {personalProfile.photoURL ? <img src={personalProfile.photoURL} alt="Account avatar" className="w-full h-full object-cover" /> : (personalDisplayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || (isGuestWorkspace ? 'G' : 'A'))}
            <span className="absolute inset-0 bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} />
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPhotoUpload(event.target.files?.[0])}
            />
          </label>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-white/35 mb-2">{isGuestWorkspace ? 'Browsing As' : 'Signed In As'}</p>
            <p className="text-xl font-bold tracking-tight truncate">{personalDisplayName || (isGuestWorkspace ? 'Guest Workspace' : 'Admin User')}</p>
            <p className="text-xs text-white/45 mt-1 truncate">{personalProfile.email || 'No contact email yet'}</p>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#39FF14] mb-3">{workspaceRole} access</p>
          <p className="text-sm leading-relaxed text-white/55">Your profile powers the business workspace, booking page identity, client communication, and staff access.</p>
        </div>
      </div>
      <div className="lg:col-span-7 p-5 md:p-8">
        {isGuestWorkspace && (
          <div className="guest-profile-auth-card mb-5">
            <div>
              <span>Guest workspace</span>
              <strong>Save this setup to a real account.</strong>
              <p>Sign in or create an owner account to keep your page, services, and schedule beyond this local preview.</p>
            </div>
            <div>
              <button type="button" onClick={() => onOpenOwnerAuth('signin')}>Sign In</button>
              <button type="button" onClick={() => onOpenOwnerAuth('signup')}>Create Account</button>
            </div>
          </div>
        )}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-300 mb-2">Personal Profile</p>
            <h3 className="text-2xl font-bold tracking-tight text-black">Your account details</h3>
            <p className="text-sm text-neutral-500 mt-1">Separate from business details. This is the person behind the workspace.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <label className="h-10 px-4 rounded-full bg-neutral-50 border border-neutral-100 text-black text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-2 cursor-pointer hover:border-black transition-colors">
              <Crop size={14} /> Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onPhotoUpload(event.target.files?.[0])}
              />
            </label>
            {personalProfile.photoURL && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="h-10 px-4 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="native-control-pill rounded-lg bg-neutral-50 border border-neutral-100 p-4 transition-colors">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2 block">First Name</span>
            <input
              value={personalProfile.firstName || ''}
              onChange={(event) => updatePersonalProfile({ firstName: event.target.value })}
              className="native-control-input w-full bg-transparent outline-none text-sm font-bold text-black"
              placeholder="First name"
            />
          </label>
          <label className="native-control-pill rounded-lg bg-neutral-50 border border-neutral-100 p-4 transition-colors">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2 block">Surname</span>
            <input
              value={personalProfile.lastName || ''}
              onChange={(event) => updatePersonalProfile({ lastName: event.target.value })}
              className="native-control-input w-full bg-transparent outline-none text-sm font-bold text-black"
              placeholder="Surname"
            />
          </label>
          <label className="native-control-pill rounded-lg bg-neutral-50 border border-neutral-100 p-4 transition-colors">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2 flex items-center gap-2"><Mail size={12} /> Contact Email</span>
            <input
              type="email"
              value={personalProfile.email || ''}
              onChange={(event) => updatePersonalProfile({ email: event.target.value })}
              className="native-control-input w-full bg-transparent outline-none text-sm font-bold text-black"
              placeholder="you@email.com"
            />
          </label>
          <label className="native-control-pill rounded-lg bg-neutral-50 border border-neutral-100 p-4 transition-colors">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2 flex items-center gap-2"><Phone size={12} /> Mobile Number</span>
            <input
              type="tel"
              value={personalProfile.mobile || ''}
              onChange={(event) => updatePersonalProfile({ mobile: event.target.value })}
              className="native-control-input w-full bg-transparent outline-none text-sm font-bold text-black"
              placeholder="+27 ..."
            />
          </label>
          <div className="rounded-lg bg-white border border-neutral-100 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2">Account ID</p>
            <p className="text-sm font-bold text-black break-all">{user?.uid || (isGuestWorkspace ? 'LOCAL-GUEST' : 'BUILD-BOOKING-001')}</p>
          </div>
          <div className="rounded-lg bg-white border border-neutral-100 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-300 mb-2">Workspace Role</p>
            <p className="text-sm font-bold text-black capitalize">{workspaceRole}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
