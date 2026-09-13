import { useMemo, useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GATEWAY_META, ONLINE_GATEWAY_IDS } from '../../finance/config/gatewayMeta';
import { ensureGatewayRoster, getPublicPaymentOptions, last4 } from '../../../utils/payments';
import { APP_ID } from '../../../config/appConfig';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { firebaseCallables } from '../../../shared/firebase/callables';

function statusFor(gateway) {
  if (!gateway?.configured) return { id: 'off', label: 'Not connected' };
  if (gateway.credentialSummary?.demoConfigured) {
    return { id: 'demo', label: 'Demo connected' };
  }
  if (gateway.mode === 'live') return { id: 'live', label: 'Live connected' };
  return { id: 'test', label: 'Test connected' };
}

function OnlineGatewayCard({
  gateway,
  flash,
  onSaved,
  onDisconnected,
  cloudReady
}) {
  const meta = GATEWAY_META[gateway.gatewayType];
  const status = statusFor(gateway);
  const [open, setOpen] = useState(!gateway.configured);
  const [mode, setMode] = useState(gateway.mode || 'test');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [replaceSecret, setReplaceSecret] = useState(!gateway.configured);

  const save = async () => {
    setError('');
    setBusy(true);
    try {
      if (cloudReady) {
        const saved = await firebaseCallables.savePaymentGatewaySettings({
          appId: APP_ID,
          gatewayType: gateway.gatewayType,
          enabled: true,
          mode,
          publicKey: publicKey.trim(),
          clientId: publicKey.trim(),
          secretKey: secretKey.trim(),
          webhookSecret: webhookSecret.trim() || undefined
        });
        onSaved?.(gateway.gatewayType, {
          ...saved,
          providerName: meta.name,
          enabled: true
        });
      } else {
        if (!publicKey.trim() || !secretKey.trim()) {
          throw new Error('Enter both keys to connect locally (demo).');
        }
        onSaved?.(gateway.gatewayType, {
          gatewayType: gateway.gatewayType,
          enabled: true,
          mode,
          configured: true,
          providerName: meta.name,
          credentialSummary: {
            publicKeyLast4: last4(publicKey),
            secretKeyConfigured: true,
            webhookConfigured: Boolean(webhookSecret.trim()),
            demoConfigured: true
          }
        });
      }
      setSecretKey('');
      setWebhookSecret('');
      setReplaceSecret(false);
      setOpen(false);
    } catch (err) {
      setError(err?.message || 'Could not save gateway.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setError('');
    setBusy(true);
    try {
      if (cloudReady) {
        await firebaseCallables.disconnectPaymentGateway({
          appId: APP_ID,
          gatewayType: gateway.gatewayType
        });
      }
      onDisconnected?.(gateway.gatewayType);
      setOpen(true);
      setReplaceSecret(true);
      setPublicKey('');
    } catch (err) {
      setError(err?.message || 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="bb-pay-card bb-panel p-5 grid gap-3">
      <div className="bb-pay-card-head">
        <div className="grid gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="bb-page-title text-lg m-0">{meta.name}</h3>
            <span className={`bb-pay-status is-${status.id}`}>{status.label}</span>
          </div>
          <p className="bb-muted m-0 text-sm">{meta.blurb}</p>
          {gateway.configured && gateway.credentialSummary?.publicKeyLast4 ? (
            <p className="bb-muted m-0 text-sm">
              Key ···{gateway.credentialSummary.publicKeyLast4}
              {gateway.mode ? ` · ${gateway.mode}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {gateway.configured ? (
            <>
              <button
                type="button"
                className="bb-ghost-btn"
                disabled={busy}
                onClick={() => {
                  setOpen(true);
                  setReplaceSecret(true);
                }}
              >
                Reconnect
              </button>
              <button type="button" className="bb-ghost-btn" disabled={busy} onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button type="button" className="bb-primary-btn" onClick={() => setOpen(true)}>
              Connect
            </button>
          )}
        </div>
      </div>

      {flash === gateway.gatewayType ? (
        <p className="bb-settings-flash flex items-center gap-2 m-0">
          <Check size={14} /> {meta.name} saved
        </p>
      ) : null}

      {open ? (
        <div className="bb-pay-connect grid gap-3">
          {!cloudReady ? (
            <p className="bb-settings-stub m-0">
              Firebase is not configured — keys stay local as demo flags only. Online charging needs
              Cloud Functions + <code>PAYMENT_SETTINGS_ENCRYPTION_KEY</code>.
            </p>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="test">Test / sandbox</option>
              <option value="live">Live</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{meta.publicLabel}</span>
            <input
              className="native-control-input px-4"
              placeholder={meta.publicPlaceholder}
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              autoComplete="off"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{meta.secretLabel}</span>
            {gateway.configured && !replaceSecret ? (
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  className="native-control-input px-4 flex-1"
                  value="••••••••••••••••"
                  disabled
                  readOnly
                />
                <button
                  type="button"
                  className="bb-ghost-btn"
                  onClick={() => setReplaceSecret(true)}
                >
                  Replace secret
                </button>
              </div>
            ) : (
              <div className="bb-pay-secret-row">
                <input
                  className="native-control-input px-4"
                  type={showSecret ? 'text' : 'password'}
                  placeholder={meta.secretPlaceholder}
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="bb-pay-eye"
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  onClick={() => setShowSecret((prev) => !prev)}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </label>

          {gateway.gatewayType === 'stripe' || gateway.gatewayType === 'paystack' ? (
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Webhook signing secret (optional)</span>
              <input
                className="native-control-input px-4"
                type="password"
                placeholder="whsec_… or Paystack uses secret key HMAC"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                autoComplete="off"
              />
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="bb-primary-btn"
              disabled={busy || (replaceSecret && !secretKey.trim()) || !publicKey.trim()}
              onClick={save}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save & verify'
              )}
            </button>
            <a
              className="bb-ghost-btn inline-flex items-center gap-1"
              href={meta.docsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open {meta.name} keys <ExternalLink size={14} />
            </a>
            {gateway.configured ? (
              <button type="button" className="bb-ghost-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            ) : null}
          </div>
          {error ? <p className="bb-pay-error m-0">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

function ManualGatewayCard({ gateway, onSaved }) {
  const meta = GATEWAY_META[gateway.gatewayType];
  const [enabled, setEnabled] = useState(Boolean(gateway.enabled));
  const [summary, setSummary] = useState(gateway.credentialSummary || {});

  const persist = (nextEnabled, nextSummary) => {
    onSaved?.(gateway.gatewayType, {
      gatewayType: gateway.gatewayType,
      enabled: nextEnabled,
      mode: 'live',
      configured: true,
      providerName: meta.name,
      credentialSummary: nextSummary
    });
  };

  return (
    <article className="bb-pay-card bb-panel p-5 grid gap-3">
      <div className="bb-pay-card-head">
        <div className="grid gap-1">
          <h3 className="bb-page-title text-lg m-0">{meta.name}</h3>
          <p className="bb-muted m-0 text-sm">{meta.blurb}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              const next = event.target.checked;
              setEnabled(next);
              persist(next, summary);
            }}
          />
          Enabled
        </label>
      </div>

      {gateway.gatewayType === 'manual_eft' ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            ['accountHolder', 'Account holder'],
            ['bankName', 'Bank name'],
            ['accountNumber', 'Account number'],
            ['branchCode', 'Branch code']
          ].map(([key, placeholder]) => (
            <input
              key={key}
              className="native-control-input px-4"
              placeholder={placeholder}
              value={summary[key] || ''}
              onChange={(event) => setSummary((prev) => ({ ...prev, [key]: event.target.value }))}
              onBlur={() => persist(enabled, summary)}
            />
          ))}
          <input
            className="native-control-input px-4 sm:col-span-2"
            placeholder="Client instructions"
            value={summary.instructions || ''}
            onChange={(event) =>
              setSummary((prev) => ({ ...prev, instructions: event.target.value }))
            }
            onBlur={() => persist(enabled, summary)}
          />
        </div>
      ) : (
        <input
          className="native-control-input px-4"
          placeholder="Cash instructions"
          value={summary.instructions || ''}
          onChange={(event) =>
            setSummary((prev) => ({ ...prev, instructions: event.target.value }))
          }
          onBlur={() => persist(enabled, summary)}
        />
      )}
    </article>
  );
}

export function PaymentGatewaysPanel({
  paymentGateways = [],
  brandName = '',
  onSaveGateway
}) {
  const [flash, setFlash] = useState('');
  const cloudReady = isFirebaseConfigured();
  const roster = useMemo(() => ensureGatewayRoster(paymentGateways), [paymentGateways]);
  const publicPreview = useMemo(
    () => getPublicPaymentOptions({ paymentGateways: roster }),
    [roster]
  );

  const handleSaved = (gatewayType, patch) => {
    onSaveGateway?.(gatewayType, patch);
    setFlash(gatewayType);
    window.setTimeout(() => setFlash(''), 1800);
  };

  const handleDisconnected = (gatewayType) => {
    onSaveGateway?.(gatewayType, {
      gatewayType,
      enabled: false,
      configured: false,
      credentialSummary: {}
    });
  };

  return (
    <div className="bb-settings-gateways">
      <p className="bb-muted m-0 text-sm max-w-2xl">
        Connect your own Stripe, PayPal, or Paystack account. Clients pay on the provider’s secure
        page — Book and Buy never sees card numbers. Funds settle to your provider account (0%
        platform cut).
      </p>

      {roster
        .filter((gateway) => ONLINE_GATEWAY_IDS.includes(gateway.gatewayType))
        .map((gateway) => (
          <OnlineGatewayCard
            key={gateway.gatewayType}
            gateway={gateway}
            flash={flash}
            cloudReady={cloudReady}
            onSaved={handleSaved}
            onDisconnected={handleDisconnected}
          />
        ))}

      {roster
        .filter((gateway) => !ONLINE_GATEWAY_IDS.includes(gateway.gatewayType))
        .map((gateway) => (
          <ManualGatewayCard key={gateway.gatewayType} gateway={gateway} onSaved={handleSaved} />
        ))}

      <section className="bb-panel p-5 grid gap-2">
        <h3 className="bb-page-title text-lg m-0">Public checkout options</h3>
        <p className="bb-muted m-0 text-sm">
          What clients can see for {brandName || 'this business'} right now.
        </p>
        <div className="bb-settings-preview-chips">
          {publicPreview.options.length === 0 ? (
            <span className="bb-muted text-sm">No gateways enabled.</span>
          ) : (
            publicPreview.options.map((option) => <span key={option.id}>{option.name}</span>)
          )}
        </div>
      </section>
    </div>
  );
}
