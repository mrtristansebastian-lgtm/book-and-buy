import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PaymentGatewaysPanel } from '../components/PaymentGatewaysPanel';

export function PaymentsSettingsPage() {
  const { workspace, paymentGateways, updatePaymentGateway } = useWorkspace();

  return (
    <PaymentGatewaysPanel
      paymentGateways={paymentGateways}
      brandName={workspace.brandName}
      onSaveGateway={updatePaymentGateway}
    />
  );
}
