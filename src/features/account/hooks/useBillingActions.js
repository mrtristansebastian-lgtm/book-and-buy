import { useCallback } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, functions } from '../../../services/firebase';

export function useBillingActions({
  isGuestWorkspace,
  openAuthPanel,
  showToast,
  user,
  workspaceOwnerId
}) {
  const openBillingAction = useCallback(async (action = 'checkout') => {
    if (!user || isGuestWorkspace) {
      openAuthPanel('signup', 'owner');
      showToast('Create an account first so billing can attach to your workspace.');
      return;
    }
    if (!functions || !FirebaseSDK.httpsCallable) {
      showToast('Billing functions are not connected yet.');
      return;
    }
    try {
      const callableName = action === 'portal' ? 'createBillingPortalSession' : 'createCheckoutSession';
      const billingAction = FirebaseSDK.httpsCallable(functions, callableName);
      const result = await billingAction({ appId, ownerId: workspaceOwnerId, plan: 'pro' });
      if (result?.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      showToast(action === 'portal' ? 'Billing portal is ready for Stripe setup.' : 'Checkout is ready for Stripe setup.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Billing is not configured yet.');
    }
  }, [isGuestWorkspace, openAuthPanel, showToast, user, workspaceOwnerId]);

  return { openBillingAction };
}
