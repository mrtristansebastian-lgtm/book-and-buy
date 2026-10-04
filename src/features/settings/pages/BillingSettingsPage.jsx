import { FREE_PROFILE_PLAN_ID, getPlan, formatPlanPrice } from '../../../config/billingPlans';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function BillingSettingsPage() {
  const { workspace } = useWorkspace();
  const plan = getPlan(workspace.planId || FREE_PROFILE_PLAN_ID);
  const isFreeProfile = plan.id === FREE_PROFILE_PLAN_ID;
  const interval = workspace.billingInterval || 'month';
  const price =
    isFreeProfile ? 'No subscription charge' : interval === 'year'
      ? formatPlanPrice(plan.annualPrice, { interval: 'year' })
      : formatPlanPrice(plan.monthlyPrice);

  return (
    <div className="bb-settings-content bb-settings-content--billing">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">{isFreeProfile ? 'Free business profile' : 'Subscription'}</h2>
        <p className="bb-muted m-0 text-sm">
          {plan.name} · {price}
          {workspace.planStatus ? ` · ${workspace.planStatus}` : ''}
        </p>
        <div className="bb-settings-stub">
          {isFreeProfile ? 'No card or subscription is needed to create and publish your Book and Buy business profile.' : workspace.isDemo ? 'This is a demo subscription. No billing account or payment method is connected.' : 'Online subscription management is not available yet. No payment method has been connected through this page.'}
        </div>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Invoices</h2>
        <p className="bb-muted m-0 text-sm">{isFreeProfile ? 'There are no subscription invoices for your free profile.' : workspace.isDemo ? 'No invoices are created in demo mode.' : 'Subscription billing is not available yet, so there are no subscription invoices to download.'}</p>
        <p className="bb-muted m-0 text-sm">Customer payments and sales records are separate from your Book and Buy subscription.</p>
      </section>
    </div>
  );
}
