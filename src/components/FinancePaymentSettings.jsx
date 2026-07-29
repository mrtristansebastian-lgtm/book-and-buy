import { useEffect, useMemo, useState } from 'react';
import * as FirebaseSDK from '../services/firebase';
import { db, functions, isFirebaseConfigured } from '../services/firebase';
import {
  emptyDrafts,
  gatewayById,
  gatewayCards,
  getGatewayMissingRequiredFields
} from '../features/finance/config/gatewayConfig';
import { FinanceDesk } from '../features/finance/components/FinanceDesk';
import { FinanceTimelineChart } from '../features/finance/components/FinanceTimelineChart';
import { GatewaySettingsModal } from '../features/finance/components/GatewaySettingsModal';
import { BookingDateRangeDialog } from '../features/bookings/components/BookingDateRangeDialog';
import { PeriodSegmentedControl } from './PeriodSegmentedControl';
import {
  buildChartBuckets,
  currencyOptionByCode,
  currencyOptions,
  getPeriodRange,
  manualGatewayIds,
  normalizeAttempt
} from '../features/finance/utils/financeMetrics';
import {
  buildFinanceCsvRows,
  buildFinanceCsvText,
  buildFinanceStatItems,
  buildManualBookingRows,
  calculateFinanceMetrics,
  filterRecordsByPeriod,
  getFinanceCurrencyStorageKey,
  getVisibleFinanceDeskRows,
  inferFinanceCurrency,
  mergeFinanceRecords
} from '../features/finance/utils/financeDeskModel';

export const FinancePaymentSettings = ({
  appId,
  businessId,
  isGuestWorkspace = false,
  exampleMode = false,
  exampleGatewayStates = {},
  canManageWorkspace,
  showToast,
  bookings = [],
  onMarkBookingPaid
}) => {
  const [saved, setSaved] = useState({});
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [saving, setSaving] = useState('');
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState('stripe');
  const [financeSummary, setFinanceSummary] = useState({});
  const [paymentAttempts, setPaymentAttempts] = useState([]);
  const [period, setPeriod] = useState('all');
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [financeCustomRange, setFinanceCustomRange] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { from: today, to: today };
  });
  const [deskView, setDeskView] = useState('transactions');
  const [search, setSearch] = useState('');
  const [deskStatusFilter, setDeskStatusFilter] = useState('all');
  const [deskSort, setDeskSort] = useState('newest');
  const [displayCurrency, setDisplayCurrency] = useState('ZAR');

  useEffect(() => {
    if (exampleMode) {
      setSaved(exampleGatewayStates);
      return undefined;
    }
    if (!isFirebaseConfigured || !db || !appId || !businessId) return undefined;
    const settingsRef = FirebaseSDK.collection(db, 'artifacts', appId, 'users', businessId, 'payment_settings');
    return FirebaseSDK.onSnapshot(settingsRef, (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => { next[docSnap.id] = docSnap.data() || {}; });
      setSaved(next);
      setDrafts((current) => {
        const merged = { ...current };
        gatewayCards.forEach((gateway) => {
          const publicConfig = next[gateway.id] || {};
          merged[gateway.id] = {
            ...merged[gateway.id],
            enabled: Boolean(publicConfig.enabled),
            mode: publicConfig.mode || merged[gateway.id]?.mode || 'test'
          };
        });
        return merged;
      });
    }, (error) => {
      console.error('Finance gateway settings listener failed', error);
    });
  }, [appId, businessId, exampleGatewayStates, exampleMode]);

  useEffect(() => {
    if (exampleMode) return undefined;
    if (!isFirebaseConfigured || !db || !appId || !businessId) return undefined;
    const userRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', businessId);
    const summaryRef = FirebaseSDK.doc(db, 'artifacts', appId, 'users', businessId, 'finance', 'summary');
    const attemptsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(userRef, 'payment_attempts'),
      FirebaseSDK.limit(80)
    );
    const unsubSummary = FirebaseSDK.onSnapshot(summaryRef, (docSnap) => {
      setFinanceSummary(docSnap.exists() ? docSnap.data() || {} : {});
    }, (error) => {
      console.error('Finance summary listener failed', error);
    });
    const unsubAttempts = FirebaseSDK.onSnapshot(attemptsQuery, (snapshot) => {
      const next = snapshot.docs.map(normalizeAttempt).sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
      setPaymentAttempts(next);
    }, (error) => {
      console.error('Payment attempts listener failed', error);
    });
    return () => {
      unsubSummary();
      unsubAttempts();
    };
  }, [appId, businessId, exampleMode]);

  const selectedGateway = gatewayById[selectedGatewayId] || gatewayCards[0];
  const selectedDraft = drafts[selectedGateway.id] || emptyDrafts[selectedGateway.id];
  const effectiveSaved = useMemo(() => saved, [saved]);
  const selectedPublicConfig = effectiveSaved[selectedGateway.id] || {};
  const isManualGateway = manualGatewayIds.has(selectedGateway.id);
  const isCashGateway = selectedGateway.id === 'cash';

  const periodRange = useMemo(() => getPeriodRange(period, financeCustomRange), [financeCustomRange, period]);

  const manualBookingRows = useMemo(() => (
    buildManualBookingRows({ bookings, isGuestWorkspace })
  ), [bookings, isGuestWorkspace]);

  const financeRecords = useMemo(() => (
    mergeFinanceRecords({ manualBookingRows, paymentAttempts })
  ), [manualBookingRows, paymentAttempts]);

  const inferredCurrency = useMemo(() => (
    inferFinanceCurrency({ financeSummary, records: financeRecords })
  ), [financeRecords, financeSummary.currency]);

  const currencyStorageKey = useMemo(() => (
    getFinanceCurrencyStorageKey({ businessId, isGuestWorkspace })
  ), [businessId, isGuestWorkspace]);

  useEffect(() => {
    let stored = '';
    try {
      stored = window.localStorage.getItem(currencyStorageKey) || '';
    } catch {
      stored = '';
    }
    setDisplayCurrency(currencyOptionByCode[stored] ? stored : inferredCurrency);
  }, [currencyStorageKey, inferredCurrency]);

  const updateDisplayCurrency = (code) => {
    const next = currencyOptionByCode[code] ? code : inferredCurrency;
    setDisplayCurrency(next);
    try {
      window.localStorage.setItem(currencyStorageKey, next);
    } catch {
      // Local persistence is optional; the selected currency still applies for this session.
    }
  };

  const periodRecords = useMemo(() => (
    filterRecordsByPeriod({ records: financeRecords, periodRange })
  ), [financeRecords, periodRange]);

  const financeMetrics = useMemo(() => {
    return calculateFinanceMetrics({ allRecords: financeRecords, period, periodRecords });
  }, [financeRecords, period, periodRecords]);

  const chartBuckets = useMemo(() => buildChartBuckets(periodRecords, period, periodRange), [period, periodRange, periodRecords]);

  const financeStatItems = useMemo(() => (
    buildFinanceStatItems({ displayCurrency, financeMetrics })
  ), [displayCurrency, financeMetrics]);

  const visibleDeskRows = useMemo(() => {
    return getVisibleFinanceDeskRows({
      deskSort,
      deskStatusFilter,
      deskView,
      records: financeRecords,
      search
    });
  }, [deskSort, deskStatusFilter, deskView, financeRecords, search]);

  const updateDraft = (gatewayId, patch) => {
    setDrafts((current) => ({
      ...current,
      [gatewayId]: {
        ...current[gatewayId],
        ...patch,
        credentials: {
          ...(current[gatewayId]?.credentials || {}),
          ...(patch.credentials || {})
        }
      }
    }));
  };

  const saveGateway = async (gateway) => {
    const guestSessionOnly = isGuestWorkspace || (!isFirebaseConfigured || !businessId);
    if (exampleMode && !isGuestWorkspace) {
      showToast?.('Gateway settings are read-only while example data is on.');
      return;
    }
    if (!canManageWorkspace) {
      showToast?.('Only owners and admins can manage finance settings.');
      return;
    }
    const missingRequiredFields = getGatewayMissingRequiredFields({
      gateway,
      draft: drafts[gateway.id],
      publicConfig: effectiveSaved[gateway.id]
    });
    if (drafts[gateway.id]?.enabled && missingRequiredFields.length) {
      const labels = missingRequiredFields
        .map((fieldKey) => gateway.fields.find((field) => field.key === fieldKey)?.label || fieldKey)
        .join(', ');
      showToast?.(`Add ${labels} before enabling ${gateway.name}.`);
      return;
    }
    const manual = manualGatewayIds.has(gateway.id);
    if (guestSessionOnly) {
      setSaved(current => ({
        ...current,
        [gateway.id]: {
          ...(current[gateway.id] || {}),
          enabled: drafts[gateway.id]?.enabled || false,
          mode: manual ? 'live' : (drafts[gateway.id]?.mode || 'test'),
          providerName: gateway.name,
          updatedAt: Date.now()
        }
      }));
      updateDraft(gateway.id, {
        credentials: gateway.fields.reduce((acc, field) => {
          acc[field.key] = '';
          return acc;
        }, {})
      });
      showToast?.(`${gateway.name} saved for this guest session.`);
      return;
    }
    if (!businessId) {
      showToast?.('Sign in or save this workspace before saving payment settings.');
      return;
    }
    if (!functions) {
      showToast?.('Firebase Functions are not connected yet.');
      return;
    }
    setSaving(gateway.id);
    try {
      const callable = FirebaseSDK.httpsCallable(functions, 'savePaymentGatewaySettings');
      await callable({
        appId,
        businessId,
        gatewayType: gateway.id,
        enabled: drafts[gateway.id]?.enabled || false,
        mode: manual ? 'live' : (drafts[gateway.id]?.mode || 'test'),
        providerName: gateway.name,
        credentials: drafts[gateway.id]?.credentials || {}
      });
      updateDraft(gateway.id, {
        credentials: gateway.fields.reduce((acc, field) => {
          acc[field.key] = '';
          return acc;
        }, {})
      });
      showToast?.(`${gateway.name} settings saved.`);
    } catch (error) {
      console.error('Payment settings save failed', error);
      showToast?.(error?.message || `${gateway.name} could not be saved.`);
    } finally {
      setSaving('');
    }
  };

  const openGatewayModal = (gatewayId = selectedGatewayId) => {
    setSelectedGatewayId(gatewayId);
    setGatewayModalOpen(true);
  };

  const downloadFinanceCsv = () => {
    const rows = buildFinanceCsvRows({ displayCurrency, records: financeRecords });

    if (!rows.length) {
      showToast?.('No finance records to export yet.');
      return;
    }

    const csv = buildFinanceCsvText(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `build-a-booking-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast?.('Finance export prepared.');
  };

  return (
    <section className="finance-studio w-full max-w-7xl mx-auto">
      <div className="finance-hero rounded-[1.25rem] border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="finance-hero-accent" />
        <div className="finance-hero-head p-4 md:p-6 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Revenue pulse</p>
            <h3 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-black">{periodRange.label}</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <label className="relative sm:w-36">
              <span className="sr-only">Display currency</span>
              <select
                value={displayCurrency}
                onChange={(event) => updateDisplayCurrency(event.target.value)}
                className="h-12 w-full rounded-2xl border border-neutral-100 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-black outline-none focus:border-black"
              >
                {currencyOptions.map((option) => (
                  <option key={option.code} value={option.code}>{option.code}</option>
                ))}
              </select>
            </label>
            <PeriodSegmentedControl
              ariaLabel="Finance period"
              className="finance-period-tabs"
              onChange={setPeriod}
              onCustomSelect={() => setCustomRangeOpen(true)}
              testIdPrefix="finance-period"
              value={period}
            />
          </div>
        </div>

        <div className="finance-hero-body p-4 md:p-6">
          <FinanceTimelineChart buckets={chartBuckets} currency={displayCurrency} statItems={financeStatItems} />
        </div>
      </div>

      <FinanceDesk
        deskSort={deskSort}
        deskStatusFilter={deskStatusFilter}
        deskView={deskView}
        displayCurrency={displayCurrency}
        onDownloadFinanceCsv={downloadFinanceCsv}
        onMarkBookingPaid={onMarkBookingPaid}
        onOpenGatewayModal={() => openGatewayModal()}
        rows={visibleDeskRows}
        search={search}
        setDeskSort={setDeskSort}
        setDeskStatusFilter={setDeskStatusFilter}
        setDeskView={setDeskView}
        setSearch={setSearch}
      />

      <GatewaySettingsModal
        open={gatewayModalOpen}
        drafts={drafts}
        selectedGateway={selectedGateway}
        selectedGatewayId={selectedGatewayId}
        selectedDraft={selectedDraft}
        selectedPublicConfig={selectedPublicConfig}
        saving={saving}
        isManualGateway={isManualGateway}
        isCashGateway={isCashGateway}
        onClose={() => setGatewayModalOpen(false)}
        onSelectGateway={setSelectedGatewayId}
        onUpdateDraft={updateDraft}
        onSaveGateway={saveGateway}
      />

      {customRangeOpen && (
        <BookingDateRangeDialog
          bookingCustomRange={financeCustomRange}
          onClose={() => setCustomRangeOpen(false)}
          onFromChange={(value) => setFinanceCustomRange(prev => ({
            from: value,
            to: prev.to && prev.to >= value ? prev.to : value
          }))}
          onSave={() => setCustomRangeOpen(false)}
          onToChange={(value) => setFinanceCustomRange(prev => ({ ...prev, to: value }))}
        />
      )}

    </section>
  );
};

