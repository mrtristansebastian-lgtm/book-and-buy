import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  Check,
  FileSpreadsheet,
  ReceiptText,
  RefreshCw,
  Trash2,
  Upload,
  Users
} from 'lucide-react';
import {
  buildCsvMigrationPayload,
  buildGuideScopeSelection,
  detectCsvScopes,
  migrationGuideById,
  migrationGuideOptions,
  parseCsvText
} from '../utils/csvMigration';

const migrationScopeCards = [
  {
    id: 'clients',
    title: 'Client list',
    caption: 'Creates saved client profiles only.',
    Icon: Users
  },
  {
    id: 'bookings',
    title: 'Bookings',
    caption: 'Adds dated sessions to the booking desk.',
    Icon: CalendarCheck
  },
  {
    id: 'finance',
    title: 'Finance history',
    caption: 'Imports paid or pending transaction rows.',
    Icon: ReceiptText
  }
];

export const MigrationImportPanel = ({
  canManageWorkspace,
  displayCurrency,
  importedCounts = {},
  onImportMigrationCsv,
  onClearMigrationData,
  showToast
}) => {
  const [parsedCsv, setParsedCsv] = useState(null);
  const [fileName, setFileName] = useState('');
  const [csvError, setCsvError] = useState('');
  const [guideId, setGuideId] = useState('clients');
  const [selectedScopes, setSelectedScopes] = useState({ clients: true, bookings: false, finance: false });
  const [batchId, setBatchId] = useState(`csv-${Date.now()}`);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const activeGuide = migrationGuideById[guideId] || migrationGuideById.clients;
  const preview = useMemo(
    () => buildCsvMigrationPayload(parsedCsv, selectedScopes, displayCurrency, batchId),
    [batchId, displayCurrency, parsedCsv, selectedScopes]
  );
  const uploadedTotal = Number(importedCounts.clients || 0) + Number(importedCounts.bookings || 0) + Number(importedCounts.financeRecords || 0);
  const selectedCount = Object.values(selectedScopes).filter(Boolean).length;
  const canImport = Boolean(canManageWorkspace && parsedCsv && selectedCount && preview.total && !importing);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setParsedCsv(null);
    if (file.size > 3 * 1024 * 1024) {
      setCsvError('Keep CSV uploads under 3MB for a fast import.');
      event.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      const detectedScopes = detectCsvScopes(parsed);
      setParsedCsv(parsed);
      setFileName(file.name);
      setBatchId(`csv-${Date.now()}`);
      setSelectedScopes(buildGuideScopeSelection(guideId, detectedScopes));
    } catch (error) {
      setCsvError(error?.message || 'This CSV could not be read.');
      setFileName('');
    } finally {
      event.target.value = '';
    }
  };

  const toggleScope = (scopeId) => {
    setSelectedScopes((current) => ({ ...current, [scopeId]: !current[scopeId] }));
  };

  const selectGuide = (nextGuideId) => {
    setGuideId(nextGuideId);
    setSelectedScopes(parsedCsv
      ? buildGuideScopeSelection(nextGuideId, detectCsvScopes(parsedCsv))
      : buildGuideScopeSelection(nextGuideId)
    );
  };

  const handleImport = async () => {
    if (!canImport) {
      if (!canManageWorkspace) showToast?.('Only owners and admins can import data.');
      else if (!parsedCsv) showToast?.('Upload a CSV first.');
      else showToast?.('Select at least one data type with usable rows.');
      return;
    }
    setImporting(true);
    try {
      await onImportMigrationCsv?.({
        ...preview,
        batchId,
        fileName,
        selectedScopes
      });
      setParsedCsv(null);
      setFileName('');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = async () => {
    if (!uploadedTotal || clearing) return;
    if (!window.confirm('Delete CSV-uploaded clients, bookings, and finance rows only? Existing live records will stay untouched.')) return;
    setClearing(true);
    try {
      await onClearMigrationData?.();
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="finance-migration-panel rounded-[1.25rem] border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 md:p-5 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="finance-migration-icon w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
            <FileSpreadsheet size={19} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Migration studio</p>
            <h3 className="text-2xl font-black tracking-tight text-black mt-1">Import one CSV, choose what it contains</h3>
            <p className="mt-2 text-sm text-neutral-500 max-w-2xl">
              Upload a client list, booking history, transaction history, or a mixed export. Build A Booking only creates the records you tick below.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <label className="h-11 px-4 rounded-2xl native-gradient-button text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={15} /> Upload CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
          </label>
          <button
            type="button"
            onClick={handleClear}
            disabled={!uploadedTotal || clearing}
            className="h-11 px-4 rounded-2xl border border-neutral-200 bg-white text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Trash2 size={15} /> {clearing ? 'Clearing' : 'Delete uploads'}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5 border-b border-neutral-100">
        <div className="finance-migration-guide rounded-2xl border border-neutral-100 bg-neutral-50 p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Step 1 / Format briefing</p>
              <h4 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-black">What kind of CSV are you uploading?</h4>
            </div>
            <p className="text-xs md:text-sm font-bold leading-relaxed text-neutral-500 max-w-xl">
              Choose the closest export type first. The import plan and sample CSV shape will update before you upload.
            </p>
          </div>

          <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {migrationGuideOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectGuide(option.id)}
                className={`finance-migration-guide-card rounded-2xl border bg-white p-4 text-left transition-all ${guideId === option.id ? 'is-selected' : ''}`}
              >
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{option.eyebrow}</span>
                <span className="mt-2 block text-base font-black tracking-tight text-black">{option.title}</span>
                <span className="mt-2 block text-xs font-bold leading-relaxed text-neutral-500">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="finance-migration-guide-summary mt-4 rounded-2xl border border-neutral-100 bg-white p-4 md:p-5">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Prepared for</p>
              <h4 className="mt-1 text-2xl font-black tracking-tight text-black">{activeGuide.title}</h4>
              <p className="mt-2 text-sm font-bold leading-relaxed text-neutral-500 max-w-2xl">{activeGuide.outcome}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Need at least</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeGuide.requiredColumns.map((column) => (
                    <span key={column} className="rounded-full bg-black px-2.5 py-1 text-[9px] font-bold text-white">{column}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">Better with</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeGuide.recommendedColumns.map((column) => (
                    <span key={column} className="rounded-full border border-neutral-100 bg-neutral-50 px-2.5 py-1 text-[9px] font-bold text-neutral-500">{column}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="finance-migration-csv-preview mt-5 rounded-2xl border border-neutral-100 bg-neutral-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-white flex items-center justify-between gap-3">
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-neutral-400">Your CSV should look like</span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-neutral-300">{activeGuide.csvColumns.length} columns</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {activeGuide.csvColumns.map((column) => (
                      <th key={column} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {activeGuide.sampleRow.map((value, index) => (
                      <td key={`${activeGuide.id}-${index}`} className="px-4 py-3 text-[12px] font-bold text-neutral-500 whitespace-nowrap">{value}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="p-4 md:p-5 grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="finance-migration-drop rounded-2xl border border-neutral-100 bg-neutral-50 p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Step 2 / File readout</p>
              <p className="mt-1 text-lg font-black text-black">{fileName || 'No CSV selected'}</p>
            </div>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
              {parsedCsv ? `${parsedCsv.rows.length} rows` : activeGuide.title}
            </span>
          </div>
          {csvError && (
            <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{csvError}</p>
          )}
          {parsedCsv ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Detected columns</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {parsedCsv.headers.slice(0, 14).map((header) => (
                  <span key={header} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-bold text-neutral-500">{header}</span>
                ))}
                {parsedCsv.headers.length > 14 && (
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-bold text-neutral-500">+{parsedCsv.headers.length - 14} more</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid sm:grid-cols-3 gap-2">
              {migrationScopeCards.map(({ id, title, Icon }) => (
                <div key={id} className="rounded-2xl border border-neutral-100 bg-white p-3 flex items-center gap-2">
                  <Icon size={16} className="text-neutral-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="finance-migration-summary rounded-2xl border border-neutral-100 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Step 3 / Upload status</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ['Clients', importedCounts.clients || 0],
              ['Bookings', importedCounts.bookings || 0],
              ['Finance', importedCounts.financeRecords || 0]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-xl font-black text-black">{value}</p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-neutral-400">
            Imported rows are tagged as uploaded data. Delete uploads clears those rows without touching native bookings, live payments, or manually created clients.
          </p>
        </aside>
      </div>

      {parsedCsv && (
        <div className="px-4 md:px-5 pb-4 md:pb-5">
          <div className="grid lg:grid-cols-3 gap-3">
            {migrationScopeCards.map(({ id, title, caption, Icon }) => {
              const checked = Boolean(selectedScopes[id]);
              const count = id === 'clients' ? preview.clients.length : id === 'bookings' ? preview.bookings.length : preview.financeRecords.length;
              return (
                <label key={id} className={`finance-migration-scope rounded-2xl border p-4 cursor-pointer transition-all ${checked ? 'is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleScope(id)}
                  />
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-black truncate">{title}</span>
                        <span className="block mt-1 text-xs text-neutral-500">{caption}</span>
                      </span>
                    </span>
                    <span className={`finance-migration-check w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${checked ? 'is-selected' : ''}`}>
                      {checked && <Check size={14} />}
                    </span>
                  </span>
                  <span className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">{count} ready</span>
                </label>
              );
            })}
          </div>

          <div className="mt-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="grid grid-cols-4 gap-2 lg:min-w-[420px]">
              {[
                ['Clients', preview.clients.length],
                ['Bookings', preview.bookings.length],
                ['Finance', preview.financeRecords.length],
                ['Skipped', preview.skippedRows]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white border border-neutral-100 p-3">
                  <p className="text-xl font-black text-black">{value}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => { setParsedCsv(null); setFileName(''); setCsvError(''); }}
                className="h-11 px-5 rounded-2xl border border-neutral-200 bg-white text-black text-[10px] font-bold uppercase tracking-widest"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="h-11 px-5 rounded-2xl bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {importing ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                Import selected data
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
