import { useState } from 'react';
import { ScheduleSettingsModal } from '../features/schedule/components/ScheduleSettingsModal.jsx?schedule-fcfs-v2';
import { ScheduleSlotEditorModal } from '../features/schedule/components/ScheduleSlotEditorModal';
import { ScheduleCalendarWorkspace } from '../features/schedule/components/ScheduleCalendarWorkspace';
import { ScheduleTimeline } from '../features/schedule/components/ScheduleTimeline';
import { ScheduleTopBar } from '../features/schedule/components/ScheduleTopBar';
import { useScheduleWorkspace } from '../features/schedule/hooks/useScheduleWorkspace';

export const BusinessCalendar = ({
  activeStaffId = 'owner',
  bookings = [],
  clientDirectory = [],
  exampleMode = false,
  googleCalendarState = {},
  isGuestWorkspace = false,
  onCreateManualBooking,
  onConnectGoogleCalendar,
  onOpenBookingChat,
  onSave,
  onSettingsDirty,
  onSyncGoogleCalendar,
  onUpdateBooking,
  services = [],
  setSettings,
  settings,
  showToast,
  staffList = [],
  workspaceRole = 'owner'
}) => {
  const [applyScope, setApplyScope] = useState('day');
  const readOnly = exampleMode && !isGuestWorkspace;
  const schedule = useScheduleWorkspace({
    activeStaffId,
    bookings,
    clientDirectory,
    onSettingsDirty,
    setSettings,
    settings,
    showToast,
    staffList,
    workspaceRole
  });

  return (
    <div className="schedule-workspace-shell">
      <ScheduleTopBar
        googleCalendarState={googleCalendarState}
        googleSyncCount={schedule.googleSyncableBookings.length}
        onConnectGoogleCalendar={onConnectGoogleCalendar}
        onSave={onSave}
        onSyncGoogleCalendar={onSyncGoogleCalendar}
        readOnly={readOnly}
        selectedCalendarId={schedule.selectedCalendarId}
      />

      <section data-tour="schedule-calendar">
        <ScheduleCalendarWorkspace
          allBookings={bookings}
          calendars={schedule.calendars}
          clientDirectory={clientDirectory}
          exampleMode={readOnly}
          listView={(
            <ScheduleTimeline
              bookingsByTime={schedule.bookingsByTime}
              canEdit={schedule.canEditSelectedCalendar && !readOnly}
              dayConfig={schedule.dayConfig}
              embedded
              isPastDay={schedule.isPastDay}
              onAddSlot={schedule.actions.startAddingSlot}
              onEditSlot={schedule.actions.startEditingSlot}
              onMove={schedule.actions.moveDateWindow}
              onOpenSettings={() => schedule.setSettingsModalOpen(true)}
              onSelectDate={schedule.actions.selectDate}
              onToggleAvailability={schedule.actions.toggleDateAvailability}
              openSlotCount={schedule.openSlotCount}
              selectedBookings={schedule.selectedBookings}
              selectedDate={schedule.selectedDate}
              selectedDayTitle={schedule.selectedDayTitle}
              serviceCatalog={services.length ? services : settings?.services || []}
              staffList={staffList}
              todayStr={schedule.todayStr}
            />
          )}
          onCreateBooking={onCreateManualBooking}
          onOpenBookingChat={onOpenBookingChat}
          onOpenSettings={() => schedule.setSettingsModalOpen(true)}
          onSelectCalendar={schedule.actions.selectCalendar}
          onSelectDate={schedule.actions.selectDate}
          onUpdateBooking={onUpdateBooking}
          selectedCalendarId={schedule.selectedCalendarId}
          selectedDate={schedule.selectedDate}
          services={services.length ? services : settings?.services || []}
          settings={settings}
          staffList={staffList}
          todayStr={schedule.todayStr}
        />
      </section>

      <ScheduleSettingsModal
        applyScope={applyScope}
        availabilityRules={schedule.availabilityRules}
        defaultSlots={schedule.defaultSlots}
        isOpen={schedule.settingsModalOpen}
        launcherSkin
        onAddSlot={schedule.actions.startAddingDefaultSlot}
        onApplyDefaults={schedule.actions.applyDefaultSlotsForScope}
        onChangeApplyScope={setApplyScope}
        onClose={() => schedule.setSettingsModalOpen(false)}
        onDeleteSlot={schedule.actions.deleteDefaultSlot}
        onDeleteScheduleTemplate={schedule.actions.deleteScheduleTemplate}
        onEditSlot={schedule.actions.startEditingDefaultSlot}
        onApplyScheduleTemplate={schedule.actions.applyScheduleTemplate}
        onSaveScheduleTemplate={schedule.actions.saveScheduleTemplate}
        onSelectDate={schedule.actions.selectDate}
        onUpdateAvailabilityRules={schedule.actions.updateAvailabilityRules}
        onSaveAvailabilitySettings={onSave}
        onSaveDefaults={schedule.actions.saveGeneratedDefaultSlots}
        onToggleWaitlist={schedule.actions.toggleWaitlist}
        scheduleTemplates={schedule.scheduleTemplates}
        selectedDate={schedule.selectedDate}
        selectedCalendarName={schedule.selectedCalendar?.name || 'Business Overview'}
        waitlistEnabled={schedule.waitlistEnabled}
      />

      <ScheduleSlotEditorModal
        deleteSlotFromEditor={schedule.actions.deleteSlotFromEditor}
        saveSlotEditor={schedule.actions.saveSlotEditor}
        setSlotEditor={schedule.setSlotEditor}
        slotEditor={schedule.slotEditor}
      />
    </div>
  );
};
