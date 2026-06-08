import { Briefcase } from 'lucide-react';

export const ProfileBillingSection = ({
  activeProfileSection,
  onBillingAction
}) => (
  <section className={`profile-section profile-section-billing ${activeProfileSection === 'billing' ? 'block' : 'hidden'} bg-white rounded-lg border border-neutral-100 p-5 md:p-7 shadow-[0_22px_70px_-60px_rgba(15,23,42,0.5)]`}>
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0">
          <Briefcase size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-neutral-300 mb-2">Plan & Billing</p>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black">Ready for paid plans</h3>
          <p className="text-sm text-neutral-500 leading-relaxed mt-2 max-w-2xl">Stripe checkout and billing portal actions are scaffolded for this workspace. When your price IDs and secret key are connected, these buttons become the upgrade and account management path.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <button type="button" onClick={() => onBillingAction('checkout')} className="h-12 px-6 rounded-full bg-[#39FF14] text-black text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform">
          Upgrade Plan
        </button>
        <button type="button" onClick={() => onBillingAction('portal')} className="h-12 px-6 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest hover:border-black transition-colors">
          Manage Billing
        </button>
      </div>
    </div>
  </section>
);
