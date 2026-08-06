import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { GATEWAY_META, GATEWAY_ORDER } from '../config/gatewayMeta';
import { getPublicPaymentOptions, savePaymentGatewaySettings } from '../../../utils/payments';

export function FinancePage() {
  const { paymentGateways, updatePaymentGateway, workspace } = useWorkspace();
  const [flash, setFlash] = useState('');

  const byType = useMemo(() => {
    const map = Object.fromEntries(
      (paymentGateways || []).map((gateway) => [gateway.gatewayType, gateway])
    );
    return GATEWAY_ORDER.map((id) => map[id] || { gatewayType: id, enabled: false, mode: 'test' });
  }, [paymentGateways]);

  const publicPreview = useMemo(
    () => getPublicPaymentOptions({ paymentGateways: byType }),
    [byType]
  );

  const saveGateway = (gateway, patch) => {
    const saved = savePaymentGatewaySettings({
      gatewayType: gateway.gatewayType,
      enabled: patch.enabled ?? gateway.enabled,
      mode: patch.mode ?? gateway.mode,
      credentialSummary: patch.credentialSummary ?? gateway.credentialSummary
    });
    updatePaymentGateway(gateway.gatewayType, {
      ...saved,
      providerName: GATEWAY_META[gateway.gatewayType]?.name
    });
    setFlash(`${GATEWAY_META[gateway.gatewayType]?.name || gateway.gatewayType} saved`);
    window.setTimeout(() => setFlash(''), 1600);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Finance</h1>
          <p className="bb-muted m-0 max-w-2xl">
            Stripe and Paystack via merchant API keys, plus Manual EFT and Cash. No Paystack Connect.
          </p>
        </div>
        {flash ? <span className="text-sm font-semibold">{flash}</span> : null}
      </header>

      <section className="grid gap-3">
        {byType.map((gateway) => {
          const meta = GATEWAY_META[gateway.gatewayType];
          return (
            <article key={gateway.gatewayType} className="bb-panel p-5 grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h2 className="bb-page-title text-xl m-0">{meta.name}</h2>
                  <p className="bb-muted m-0 text-sm">{meta.blurb}</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(gateway.enabled)}
                    onChange={(event) =>
                      saveGateway(gateway, { enabled: event.target.checked })
                    }
                  />
                  Enabled
                </label>
              </div>

              {meta.needsKeys ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <select
                    value={gateway.mode || 'test'}
                    onChange={(event) => saveGateway(gateway, { mode: event.target.value })}
                  >
                    <option value="test">Test mode</option>
                    <option value="live">Live mode</option>
                  </select>
                  <input
                    className="native-control-input px-4"
                    placeholder="Public key (stored as last4 only in demo)"
                    defaultValue={
                      gateway.credentialSummary?.publicKeyLast4
                        ? `****${gateway.credentialSummary.publicKeyLast4}`
                        : ''
                    }
                    onBlur={(event) => {
                      const raw = event.target.value.replace(/\*/g, '').slice(-4);
                      if (!raw) return;
                      saveGateway(gateway, {
                        credentialSummary: {
                          ...gateway.credentialSummary,
                          publicKeyLast4: raw,
                          webhookConfigured: true
                        }
                      });
                    }}
                  />
                </div>
              ) : null}

              {gateway.gatewayType === 'manual_eft' ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    className="native-control-input px-4"
                    placeholder="Account holder"
                    defaultValue={gateway.credentialSummary?.accountHolder || ''}
                    onBlur={(event) =>
                      saveGateway(gateway, {
                        credentialSummary: {
                          ...gateway.credentialSummary,
                          accountHolder: event.target.value
                        }
                      })
                    }
                  />
                  <input
                    className="native-control-input px-4"
                    placeholder="Bank name"
                    defaultValue={gateway.credentialSummary?.bankName || ''}
                    onBlur={(event) =>
                      saveGateway(gateway, {
                        credentialSummary: {
                          ...gateway.credentialSummary,
                          bankName: event.target.value
                        }
                      })
                    }
                  />
                  <input
                    className="native-control-input px-4 sm:col-span-2"
                    placeholder="Client instructions"
                    defaultValue={gateway.credentialSummary?.instructions || ''}
                    onBlur={(event) =>
                      saveGateway(gateway, {
                        credentialSummary: {
                          ...gateway.credentialSummary,
                          instructions: event.target.value
                        }
                      })
                    }
                  />
                </div>
              ) : null}

              {gateway.gatewayType === 'cash' ? (
                <input
                  className="native-control-input px-4"
                  placeholder="Cash instructions"
                  defaultValue={gateway.credentialSummary?.instructions || ''}
                  onBlur={(event) =>
                    saveGateway(gateway, {
                      credentialSummary: {
                        ...gateway.credentialSummary,
                        instructions: event.target.value
                      }
                    })
                  }
                />
              ) : null}

              <p className="bb-muted m-0 text-xs">
                Status:{' '}
                {gateway.enabled
                  ? `${gateway.mode || 'test'} · ${gateway.configured === false ? 'needs setup' : 'ready'}`
                  : 'off'}
              </p>
            </article>
          );
        })}
      </section>

      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Public checkout options</h2>
        <p className="bb-muted m-0 text-sm">
          What clients can see for {workspace.brandName} right now.
        </p>
        <div className="flex flex-wrap gap-2">
          {publicPreview.options.length === 0 ? (
            <span className="bb-muted text-sm">No gateways enabled.</span>
          ) : (
            publicPreview.options.map((option) => (
              <span key={option.id} className="bb-ghost-btn pointer-events-none">
                {option.name}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
