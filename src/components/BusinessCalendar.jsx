import { useState } from 'react';
import { ScheduleSettingsModal } from '../features/schedule/components/ScheduleSettingsModal';
import { ScheduleSlotEditorModal } from '../features/schedule/components/ScheduleSlotEditorModal';
import { ScheduleTimeline } from '../features/schedule/components/ScheduleTimeline';
import { ScheduleTopBar } from '../features/schedule/components/ScheduleTopBar';
import { StaffCalendarSwitcher } from '../features/schedule/components/StaffCalendarSwitcher';
import { useScheduleWorkspace } from '../features/schedule/hooks/useScheduleWorkspace';

export const BusinessCalendar = ({
  activeStaffId = 'owner',
  bookings = [],
  clientDirectory = [],
  googleCalendarState = {},
  onConnectGoogleCalendar,
  onSave,
  onSettingsDirty,
  onSyncGoogleCalendar,
  setSettings,
  settings,
  showToast,
  staffList = [],
  workspaceRole = 'owner'
}) => {
  const [applyScope, setApplyScope] = useState('day');
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
        selectedCalendarId={schedule.selectedCalendarId}
      />

      <section className="schedule-workspace-grid" data-tour="schedule-calendar">
        <StaffCalendarSwitcher
          calendars={schedule.calendars}
          getStaffInitials={schedule.getStaffInitials}
          onSelectCalendar={schedule.actions.selectCalendar}
          selectedCalendarId={schedule.selectedCalendarId}
        />

        <main className="schedule-main-column">
          <ScheduleTimeline
            bookingsByTime={schedule.bookingsByTime}
            canEdit={schedule.canEditSelectedCalendar}
            dayConfig={schedule.dayConfig}
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
            todayStr={schedule.todayStr}
          />
        </main>
      </section>

      <ScheduleSettingsModal
        applyScope={applyScope}
        availabilityRules={schedule.availabilityRules}
        defaultSlots={schedule.defaultSlots}
        isOpen={schedule.settingsModalOpen}
        onAddSlot={schedule.actions.startAddingDefaultSlot}
        onApplyDefaults={schedule.actions.applyDefaultSlotsForScope}
        onChangeApplyScope={setApplyScope}
        onClose={() => schedule.setSettingsModalOpen(false)}
        onDeleteSlot={schedule.actions.deleteDefaultSlot}
        onEditSlot={schedule.actions.startEditingDefaultSlot}
        onUpdateAvailabilityRules={schedule.actions.updateAvailabilityRules}
        onSaveAvailabilitySettings={onSave}
        onSaveDefaults={schedule.actions.saveGeneratedDefaultSlots}
        onToggleWaitlist={schedule.actions.toggleWaitlist}
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
