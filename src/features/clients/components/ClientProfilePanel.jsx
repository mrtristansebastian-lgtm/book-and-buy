import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, Plus, StickyNote, Tags, UserRound } from 'lucide-react';
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
  const [activeFileRoom, setActiveFileRoom] = useState('details');

  useEffect(() => {
    setActiveFileRoom('details');
  }, [activeClient?.id]);

  if (!activeClient) return null;

  const allLabels = Array.from(new Set([...(activeClient.autoLabels || []), ...(activeClient.labels || [])]));
  const isExampleClient = Boolean(activeClient.isExample);
  const fileRooms = [
    {
      id: 'details',
      label: 'Details',
      icon: UserRound
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: StickyNote
    },
    {
      id: 'labels',
      label: 'Labels',
      icon: Tags
    },
    {
      id: 'bookings',
      label: 'History',
      icon: CalendarDays
    }
  ];
  const currentRoom = fileRooms.find(room => room.id === activeFileRoom) || fileRooms[0];

  const renderFileRoom = () => {
    if (currentRoom.id === 'details') {
      return (
        <ClientDetailsForm
          activeClient={activeClient}
          isExampleClient={isExampleClient}
          onSaveDetails={onSaveDetails}
          showToast={showToast}
        />
      );
    }
    if (currentRoom.id === 'notes') {
      return (
        <ClientNotesLabels
          activeClient={activeClient}
          clientLabelOptions={clientLabelOptions}
          clientNoteDraft={clientNoteDraft}
          isExampleClient={isExampleClient}
          onNoteDraftChange={onNoteDraftChange}
          onSaveNotes={onSaveNotes}
          onToggleLabel={onToggleLabel}
          room="notes"
          showToast={showToast}
        />
      );
    }
    if (currentRoom.id === 'labels') {
      return (
        <ClientNotesLabels
          activeClient={activeClient}
          clientLabelOptions={clientLabelOptions}
          clientNoteDraft={clientNoteDraft}
          isExampleClient={isExampleClient}
          onNoteDraftChange={onNoteDraftChange}
          onSaveNotes={onSaveNotes}
          onToggleLabel={onToggleLabel}
          room="labels"
          showToast={showToast}
        />
      );
    }
    return (
      <ClientBookingHistory
        activeClient={activeClient}
        getBookingService={getBookingService}
        isExampleClient={isExampleClient}
        safeStaffList={safeStaffList}
      />
    );
  };

  return (
    <section className={`client-profile-panel ${activeClient ? 'xl:col-span-7' : 'hidden'} space-y-4 md:space-y-6 ${clientMobileView === 'profile' ? '' : 'hidden md:block'}`}>
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

      <div className="client-file-room-shell">
        <aside className="client-file-room-nav" aria-label="Client file sections">
          <div className="client-file-room-list">
            {fileRooms.map(room => {
              const Icon = room.icon;
              const active = room.id === currentRoom.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  className={active ? 'is-active' : ''}
                  onClick={() => setActiveFileRoom(room.id)}
                  aria-pressed={active}
                  aria-current={active ? 'page' : undefined}
                >
                  <span><Icon size={15} /></span>
                  <strong>{room.label}</strong>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="client-file-room-main">
          {renderFileRoom()}
        </main>
      </div>
    </section>
  );
};
