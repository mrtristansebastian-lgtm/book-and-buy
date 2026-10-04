import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { useState } from 'react';
import {
  BILLING_PLANS,
  FREE_PROFILE_PLAN_ID,
  PLAN_IDS,
  formatPlanPrice,
  getPlan
} from '../../../config/billingPlans';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function PlanSettingsPage() {
  const { workspace, updatePlan } = useWorkspace();
  const [interval, setInterval] = useState(workspace.billingInterval || 'month');
  const currentId = workspace.planId || FREE_PROFILE_PLAN_ID;
  const current = getPlan(currentId);
  const isFreeProfile = current.id === FREE_PROFILE_PLAN_ID;
  const visiblePlanIds = isFreeProfile && !workspace.isDemo ? [FREE_PROFILE_PLAN_ID] : [FREE_PROFILE_PLAN_ID, ...PLAN_IDS];

  const selectPlan = (planId) => {
    updatePlan({
      planId,
      billingInterval: interval,
      planStatus: workspace.planStatus === 'trialing' ? 'trialing' : 'active'
    });
  };

  return (
    <div className="bb-settings-content bb-settings-content--plan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="bb-muted m-0 text-sm">
            Current: <strong>{current.name}</strong>
            {workspace.planStatus === 'trialing' ? ' · Studio trial' : ''}
            {workspace.isDemo ? ' · Demo (Business unlocked)' : ''}
          </p>
        </div>
        {!isFreeProfile || workspace.isDemo ? <div className="flex gap-2">
          <FilterChip
            type="button"
            selected={interval === 'month'}
            onClick={() => setInterval('month')}
          >
            Monthly
          </FilterChip>
          <FilterChip
            type="button"
            selected={interval === 'year'}
            onClick={() => setInterval('year')}
          >
            Annual (2 months free)
          </FilterChip>
        </div> : null}
      </div>

      <div className="bb-settings-plan-grid">
        {visiblePlanIds.map((id) => {
          const plan = BILLING_PLANS[id];
          const price =
            id === FREE_PROFILE_PLAN_ID ? 'Free · no subscription' : interval === 'year'
              ? formatPlanPrice(plan.annualPrice, { interval: 'year' })
              : formatPlanPrice(plan.monthlyPrice);
          const isCurrent = currentId === id && (id === FREE_PROFILE_PLAN_ID || (workspace.billingInterval || 'month') === interval);
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
              {plan.upcomingFeatures?.length ? <div className="bb-settings-plan-upcoming"><strong>Not available yet</strong>{plan.upcomingFeatures.join(' · ')}</div> : null}
              <Button action="view" variant="primary"
                type="button"
                className={isCurrent ? 'bb-ghost-btn' : 'bb-primary-btn'}
                disabled={isCurrent || !workspace.isDemo}
                onClick={() => {
                  selectPlan(id);
                }}
              >
                {isCurrent ? 'Current plan' : workspace.isDemo ? `Preview ${plan.name}` : 'Upgrades not available yet'}
              </Button>
            </article>
          );
        })}
      </div>

      <p className="bb-muted m-0 text-sm">
        {isFreeProfile && !workspace.isDemo ? 'Your business profile is free. Publish it from E-Business when you are ready to appear on Places. No card, trial expiry or subscription is required. Customer payments are managed separately in Payments.' : workspace.isDemo ? 'Explore plans in demo mode. No subscription is created and no payment is taken.' : 'Subscription upgrades are not available yet. Your current plan stays unchanged. Client payments are managed separately in Payments.'}
      </p>
    </div>
  );
}
