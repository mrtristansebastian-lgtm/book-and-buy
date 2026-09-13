import { useState } from 'react';
import {
  BILLING_PLANS,
  PLAN_IDS,
  formatPlanPrice,
  getPlan
} from '../../../config/billingPlans';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function PlanSettingsPage() {
  const { workspace, updatePlan } = useWorkspace();
  const [interval, setInterval] = useState(workspace.billingInterval || 'month');
  const currentId = workspace.planId || 'starter';
  const current = getPlan(currentId);

  const selectPlan = (planId) => {
    updatePlan({
      planId,
      billingInterval: interval,
      planStatus: workspace.planStatus === 'trialing' ? 'trialing' : 'active'
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="bb-muted m-0 text-sm">
            Current: <strong>{current.name}</strong>
            {workspace.planStatus === 'trialing' ? ' · Studio trial' : ''}
            {workspace.isDemo ? ' · Demo (Business unlocked)' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={interval === 'month' ? 'bb-primary-btn' : 'bb-ghost-btn'}
            onClick={() => setInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={interval === 'year' ? 'bb-primary-btn' : 'bb-ghost-btn'}
            onClick={() => setInterval('year')}
          >
            Annual (2 months free)
          </button>
        </div>
      </div>

      <div className="bb-settings-plan-grid">
        {PLAN_IDS.map((id) => {
          const plan = BILLING_PLANS[id];
          const price =
            interval === 'year'
              ? formatPlanPrice(plan.annualPrice, { interval: 'year' })
              : formatPlanPrice(plan.monthlyPrice);
          const isCurrent = currentId === id;
          return (
            <article
              key={id}
              className={`bb-panel bb-settings-plan-card ${isCurrent ? 'is-current' : ''}`}
            >
              <div className="grid gap-1">
                <h3 className="bb-page-title text-xl m-0">{plan.name}</h3>
                <p className="bb-muted m-0 text-sm">{plan.blurb}</p>
              </div>
              <div className="bb-settings-plan-price">{price}</div>
              <ul>
                {plan.features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <button
                type="button"
                className={isCurrent ? 'bb-ghost-btn' : 'bb-primary-btn'}
                disabled={isCurrent}
                onClick={() => {
                  updatePlan({ billingInterval: interval });
                  selectPlan(id);
                }}
              >
                {isCurrent ? 'Current plan' : `Choose ${plan.name}`}
              </button>
            </article>
          );
        })}
      </div>

      <p className="bb-muted m-0 text-sm">
        Client checkout uses your own Stripe, Paystack, or EFT — Book and Buy does not take a
        platform cut on those payments in V1. Plan choice is saved on this workspace; live Stripe
        Checkout for upgrades lands when billing is configured.
      </p>
    </div>
  );
}
