import { ChevronLeft, Plus } from 'lucide-react';
import { ClientBookingHistory } from './ClientBookingHistory';
import { ClientDetailsForm } from './ClientDetailsForm';
import { ClientNotesLabels } from './ClientNotesLabels';
import { ClientProfileHeader } from './ClientProfileHeader';

export const ClientProfilePanel = ({
  activeClient,
  clientLabelOptions,
  clientMobileView,
  clientNoteDraft,
  getBookingService,
  onAvatarUpload,
  onBackToDirectory,
  onOpenAddClient,
  onOpenBookings,
  onNoteDraftChange,
  onSaveDetails,
  onSaveNotes,
  onToggleLabel,
  safeStaffList,
  showToast
}) => {
  if (!activeClient) return null;

  const allLabels = Array.from(new Set([...(activeClient.autoLabels || []), ...(activeClient.labels || [])]));
  const isExampleClient = Boolean(activeClient.isExample);

  return (
    <section className={`${activeClient ? 'xl:col-span-7' : 'hidden'} space-y-4 md:space-y-6 ${clientMobileView === 'profile' ? '' : 'hidden md:block'}`}>
      <div className="md:hidden flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToDirectory}
          className="h-10 px-4 rounded-lg bg-white border border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-black flex items-center gap-2"
        >
          <ChevronLeft size={15} /> Directory
        </button>
        <button
          type="button"
          onClick={onOpenAddClient}
          className="h-10 px-4 rounded-lg bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <ClientProfileHeader
        activeClient={activeClient}
        allLabels={allLabels}
        isExampleClient={isExampleClient}
        onAvatarUpload={onAvatarUpload}
        onOpenBookings={onOpenBookings}
      />

      <ClientDetailsForm
        activeClient={activeClient}
        isExampleClient={isExampleClient}
        onSaveDetails={onSaveDetails}
        showToast={showToast}
      />

      <ClientNotesLabels
        activeClient={activeClient}
        clientLabelOptions={clientLabelOptions}
        clientNoteDraft={clientNoteDraft}
        isExampleClient={isExampleClient}
        onNoteDraftChange={onNoteDraftChange}
        onSaveNotes={onSaveNotes}
        onToggleLabel={onToggleLabel}
        showToast={showToast}
      />

      <ClientBookingHistory
        activeClient={activeClient}
        getBookingService={getBookingService}
        isExampleClient={isExampleClient}
        safeStaffList={safeStaffList}
      />
    </section>
  );
};
