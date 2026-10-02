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
    <div className="bb-settings-content bb-settings-content--billing">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Subscription</h2>
        <p className="bb-muted m-0 text-sm">
          {plan.name} · {price}
          {workspace.planStatus ? ` · ${workspace.planStatus}` : ''}
        </p>
        <div className="bb-settings-stub">
          {workspace.isDemo ? 'This is a demo subscription. No billing account or payment method is connected.' : 'Online subscription management is not available yet. No payment method has been connected through this page.'}
        </div>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Invoices</h2>
        <p className="bb-muted m-0 text-sm">No invoices yet — they will appear after live billing.</p>
      </section>
    </div>
  );
}
