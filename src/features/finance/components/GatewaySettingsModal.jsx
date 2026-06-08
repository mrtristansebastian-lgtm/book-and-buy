import {
  ArrowLeft,
  Check,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X
} from 'lucide-react';
import { GatewayLogo, gatewayCards, getGatewayMissingRequiredFields } from '../config/gatewayConfig';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`finance-toggle ${checked ? 'is-on' : ''}`}
    aria-pressed={checked}
  >
    <span />
  </button>
);

export const GatewaySettingsModal = ({
  open,
  drafts = {},
  selectedGateway,
  selectedGatewayId,
  selectedDraft = {},
  selectedPublicConfig = {},
  saving = '',
  isManualGateway = false,
  isCashGateway = false,
  onClose,
  onSelectGateway,
  onUpdateDraft,
  onSaveGateway
}) => {
  if (!open || !selectedGateway) return null;

  const missingRequiredFields = getGatewayMissingRequiredFields({
    gateway: selectedGateway,
    draft: selectedDraft,
    publicConfig: selectedPublicConfig
  });
  const isEnableBlocked = Boolean(selectedDraft.enabled && missingRequiredFields.length);
  const missingRequiredLabels = missingRequiredFields
    .map((fieldKey) => selectedGateway.fields.find((field) => field.key === fieldKey)?.label || fieldKey)
    .join(', ');
  const readinessLabel = selectedDraft.enabled
    ? isEnableBlocked
      ? `Needs ${missingRequiredLabels}`
      : 'Ready for checkout and finance sync'
    : 'Off until enabled';

  return (
    <div className="finance-modal fixed inset-0 z-[1400] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="finance-modal-panel w-full md:max-w-5xl max-h-[92vh] overflow-hidden rounded-t-[1.75rem] md:rounded-[1.5rem] bg-white border border-neutral-200 shadow-2xl shadow-black/30 flex flex-col">
        <div className="p-4 md:p-5 border-b border-neutral-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onClose} className="w-11 h-11 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black md:hidden">
              <ArrowLeft size={18} />
            </button>
            <div className={`finance-gateway-mark w-11 h-11 rounded-2xl native-gradient-button flex items-center justify-center text-black shrink-0 ${selectedGateway.logo ? 'has-logo bg-white border border-neutral-100' : ''}`}>
              <GatewayLogo gateway={selectedGateway} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Gateway setup</p>
              <h3 className="text-2xl font-black tracking-tight text-black truncate">{selectedGateway.name}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="hidden md:flex w-11 h-11 rounded-2xl bg-white border border-neutral-200 items-center justify-center text-black">
            <X size={18} />
          </button>
        </div>

        <div className="finance-modal-body grid lg:grid-cols-[320px_1fr] min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          <aside className="finance-modal-gateway-list border-b lg:border-b-0 lg:border-r border-neutral-100 bg-neutral-50/60 p-3 overflow-x-auto lg:overflow-y-auto">
            <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
              {gatewayCards.map((gateway) => {
                const active = selectedGatewayId === gateway.id;
                const enabled = Boolean(drafts[gateway.id]?.enabled);
                return (
                  <button
                    key={gateway.id}
                    type="button"
                    onClick={() => onSelectGateway?.(gateway.id)}
                    className={`w-[220px] lg:w-full rounded-2xl border px-3 py-3 flex items-center gap-3 text-left transition-all ${active ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-black border-neutral-100 hover:border-neutral-300'}`}
                  >
                    <span className={`finance-gateway-mark w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gateway.logo ? 'has-logo' : ''} ${active ? 'bg-white text-black' : enabled ? 'native-gradient-button text-black' : 'bg-neutral-50 text-black'}`}>
                      <GatewayLogo gateway={gateway} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black truncate">{gateway.name}</span>
                      <span className={`block text-[9px] font-bold uppercase tracking-widest ${active ? 'text-white/55' : 'text-neutral-400'}`}>
                        {enabled ? 'Enabled' : gateway.region}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="finance-modal-config p-4 md:p-6 overflow-visible lg:overflow-y-auto lg:max-h-full">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-500 max-w-xl">{selectedGateway.note}</p>
                <div className="mt-3 flex max-w-full flex-wrap items-center gap-2">
                  <p className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-400 leading-none">
                    <LockKeyhole size={13} /> {isManualGateway ? (isCashGateway ? 'No API keys needed' : 'Bank details show to clients') : 'Secrets save through Cloud Functions'}
                  </p>
                  <p className={`inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest leading-none ${isEnableBlocked ? 'border-amber-200 bg-amber-50 text-amber-700' : selectedDraft.enabled ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-neutral-100 bg-white text-neutral-400'}`}>
                    {readinessLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3 md:min-w-[220px]">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{isManualGateway ? 'Payment method' : 'Gateway'}</p>
                  <p className="text-sm font-black text-black">{selectedDraft.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <Toggle checked={selectedDraft.enabled} onChange={(enabled) => onUpdateDraft?.(selectedGateway.id, { enabled })} />
              </div>
            </div>

            {!isManualGateway && (
              <div className="mt-5 grid grid-cols-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-1">
                {['test', 'live'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateDraft?.(selectedGateway.id, { mode })}
                    className={`h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedDraft.mode === mode ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-neutral-400'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {selectedGateway.fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    <span>{field.label}</span>
                    {selectedGateway.requiredFields?.includes(field.key) && <span className="tracking-widest text-neutral-300">Required</span>}
                  </span>
                  <div className={`native-control-pill mt-2 flex gap-2 rounded-2xl border border-neutral-200 bg-white px-3 ${field.type === 'textarea' ? 'items-start py-3' : 'items-center'}`}>
                    <KeyRound size={15} className="text-neutral-300 shrink-0" />
                    {field.type === 'textarea' ? (
                      <textarea
                        value={selectedDraft.credentials?.[field.key] || ''}
                        onChange={(event) => onUpdateDraft?.(selectedGateway.id, { credentials: { [field.key]: event.target.value } })}
                        placeholder={selectedPublicConfig.credentialSummary?.[field.key] || `Enter ${field.label.toLowerCase()}`}
                        className="native-control-input min-h-24 flex-1 min-w-0 resize-none bg-transparent outline-none text-sm font-bold text-black placeholder:text-neutral-300"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={selectedDraft.credentials?.[field.key] || ''}
                        onChange={(event) => onUpdateDraft?.(selectedGateway.id, { credentials: { [field.key]: event.target.value } })}
                        placeholder={selectedPublicConfig.credentialSummary?.[field.key] || `Enter ${field.label.toLowerCase()}`}
                        className="native-control-input h-12 flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-black placeholder:text-neutral-300"
                        autoComplete="off"
                      />
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-black">
                    {isCashGateway
                      ? 'Cash instructions are ready for clients'
                      : selectedGateway.id === 'manual_eft'
                        ? 'Use the booking ID as payment reference'
                        : selectedPublicConfig.configured ? 'Saved keys are masked' : 'Add keys once, then save'}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {isCashGateway
                      ? 'Clients can choose cash, then your team marks the booking paid once money is received.'
                      : selectedGateway.id === 'manual_eft'
                        ? 'Your bank details appear after booking. The finance desk tracks it until you mark it paid.'
                        : 'Public settings sync to the dashboard. Secret values are stored only by the backend.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSaveGateway?.(selectedGateway)}
                disabled={saving === selectedGateway.id || isEnableBlocked}
                className="h-12 px-6 rounded-2xl native-gradient-button text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving === selectedGateway.id ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                {isCashGateway ? 'Save Cash' : selectedGateway.id === 'manual_eft' ? 'Save EFT' : 'Save Gateway'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
