import { getPlan, formatPlanPrice } from '../../../config/billingPlans';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function BillingSettingsPage() {
  const { workspace } = useWorkspace();
  const plan = getPlan(workspace.planId || 'starter');
  const interval = workspace.billingInterval || 'month';
  const price =
    interval === 'year'
      ? formatPlanPrice(plan.annualPrice, { interval: 'year' })
      : formatPlanPrice(plan.monthlyPrice);

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Subscription</h2>
        <p className="bb-muted m-0 text-sm">
          {plan.name} · {price}
          {workspace.planStatus ? ` · ${workspace.planStatus}` : ''}
        </p>
        <button type="button" className="bb-primary-btn justify-self-start" disabled>
          Manage billing
        </button>
        <div className="bb-settings-stub">
          Stripe customer portal opens here when <code>createBillingPortalSession</code> is
          configured. Until then, plan changes are saved locally on the workspace.
        </div>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Invoices</h2>
        <p className="bb-muted m-0 text-sm">No invoices yet — they will appear after live billing.</p>
      </section>
    </div>
  );
}
