import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { GATEWAY_META, GATEWAY_ORDER } from '../config/gatewayMeta';
import { getPublicPaymentOptions, savePaymentGatewaySettings } from '../../../utils/payments';

export function FinanceSettingsSheet({
  open,
  onClose,
  paymentGateways = [],
  brandName = '',
  onSaveGateway
}) {
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

  if (!open) return null;

  const saveGateway = (gateway, patch) => {
    const saved = savePaymentGatewaySettings({
      gatewayType: gateway.gatewayType,
      enabled: patch.enabled ?? gateway.enabled,
      mode: patch.mode ?? gateway.mode,
      credentialSummary: patch.credentialSummary ?? gateway.credentialSummary
    });
    onSaveGateway?.(gateway.gatewayType, {
      ...saved,
      providerName: GATEWAY_META[gateway.gatewayType]?.name
    });
    setFlash(`${GATEWAY_META[gateway.gatewayType]?.name || gateway.gatewayType} saved`);
    window.setTimeout(() => setFlash(''), 1600);
  };

  return (
    <div className="bb-finance-sheet-overlay" onClick={onClose} role="presentation">
      <aside
        className="bb-finance-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Payment settings"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bb-finance-sheet-head">
          <div>
            <p className="bb-finance-eyebrow">Payment settings</p>
            <h2 className="bb-finance-sheet-title">Stripe, Paystack &amp; manual</h2>
          </div>
          <button type="button" className="bb-finance-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>

        {flash ? <p className="bb-finance-sheet-flash">{flash}</p> : null}

        <div className="bb-finance-sheet-body">
          {byType.map((gateway) => {
            const meta = GATEWAY_META[gateway.gatewayType];
            return (
              <article key={gateway.gatewayType} className="bb-finance-gateway">
                <div className="bb-finance-gateway-head">
                  <div>
                    <h3>{meta.name}</h3>
                    <p>{meta.blurb}</p>
                  </div>
                  <label className="bb-finance-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(gateway.enabled)}
                      onChange={(event) => saveGateway(gateway, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                {meta.needsKeys ? (
                  <div className="bb-finance-gateway-fields">
                    <select
                      value={gateway.mode || 'test'}
                      onChange={(event) => saveGateway(gateway, { mode: event.target.value })}
                    >
                      <option value="test">Test mode</option>
                      <option value="live">Live mode</option>
                    </select>
                    <input
                      className="native-control-input px-4"
                      placeholder={
                        gateway.gatewayType === 'stripe'
                          ? 'Publishable key (demo stores last4)'
                          : 'Public key (demo stores last4)'
                      }
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
                    <input
                      className="native-control-input px-4"
                      type="password"
                      placeholder="Secret key (demo — not stored)"
                      autoComplete="off"
                      onBlur={() => {
                        saveGateway(gateway, {
                          credentialSummary: {
                            ...gateway.credentialSummary,
                            secretKeyConfigured: true,
                            webhookConfigured: true
                          }
                        });
                      }}
                    />
                    <p className="bb-finance-gateway-note">
                      {gateway.gatewayType === 'stripe'
                        ? 'Add your Stripe webhook signing secret when live payments are restored. Demo stores public key last4 only.'
                        : 'Paystack webhooks verify with your secret key (HMAC). No Connect / subaccounts in V1.'}
                    </p>
                  </div>
                ) : null}

                {gateway.gatewayType === 'manual_eft' ? (
                  <div className="bb-finance-gateway-fields">
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
                      className="native-control-input px-4"
                      placeholder="Account number"
                      defaultValue={gateway.credentialSummary?.accountNumber || ''}
                      onBlur={(event) =>
                        saveGateway(gateway, {
                          credentialSummary: {
                            ...gateway.credentialSummary,
                            accountNumber: event.target.value
                          }
                        })
                      }
                    />
                    <input
                      className="native-control-input px-4"
                      placeholder="Branch code"
                      defaultValue={gateway.credentialSummary?.branchCode || ''}
                      onBlur={(event) =>
                        saveGateway(gateway, {
                          credentialSummary: {
                            ...gateway.credentialSummary,
                            branchCode: event.target.value
                          }
                        })
                      }
                    />
                    <input
                      className="native-control-input px-4 bb-finance-gateway-span"
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

                <div className="bb-finance-gateway-status">
                  {!gateway.enabled ? (
                    <span className="is-off">Off — hidden on public checkout</span>
                  ) : gateway.configured === false ||
                    (meta.needsKeys && !gateway.credentialSummary?.publicKeyLast4) ? (
                    <span className="is-warn">Needs setup · {gateway.mode || 'test'}</span>
                  ) : (
                    <span className="is-ready">Ready for checkout · {gateway.mode || 'test'}</span>
                  )}
                </div>
              </article>
            );
          })}

          <section className="bb-finance-gateway">
            <h3>Public checkout options</h3>
            <p>What clients can see for {brandName || 'this business'} right now.</p>
            <div className="bb-finance-preview-chips">
              {publicPreview.options.length === 0 ? (
                <span className="bb-muted text-sm">No gateways enabled.</span>
              ) : (
                publicPreview.options.map((option) => (
                  <span key={option.id}>{option.name}</span>
                ))
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
