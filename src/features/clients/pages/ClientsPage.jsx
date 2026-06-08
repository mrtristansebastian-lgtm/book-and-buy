import { ClientAddPanel } from '../components/ClientAddPanel';
import { ClientDirectory } from '../components/ClientDirectory';
import { ClientProfilePanel } from '../components/ClientProfilePanel';

export const ClientsPage = ({
  activeClient,
  clientDeskFilter,
  clientDeskFilters,
  clientLabelOptions,
  clientMobileView,
  clientNoteDraft,
  clientRecords,
  clientSearch,
  displayClients,
  getBookingService,
  handleClientAvatarUpload,
  handleManualClientSubmit,
  navigateWorkspaceTab,
  openBookingChat,
  safeStaffList,
  saveClients,
  setClientDeskFilter,
  setClientMobileView,
  setClientNoteDraft,
  setClientSearch,
  setSelectedClientId,
  showToast,
  toggleClientLabel,
  upsertClientRecord
}) => {
  const openAddClient = () => {
    setSelectedClientId(null);
    setClientMobileView('add');
  };

  const openClientFile = (clientId) => {
    setSelectedClientId(clientId);
    setClientMobileView('profile');
  };

  const saveClientBook = async () => {
    const saved = await saveClients(clientRecords);
    if (saved) showToast('Client book saved');
  };

  return (
    <div className="clients-page flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-10 lg:p-12">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className={`${activeClient ? 'xl:col-span-5' : 'xl:col-span-12'} space-y-4 md:space-y-6 ${clientMobileView === 'directory' || clientMobileView === 'add' ? '' : 'hidden md:block'}`}>
          <ClientDirectory
            activeClient={activeClient}
            clientDeskFilter={clientDeskFilter}
            clientDeskFilters={clientDeskFilters}
            clientMobileView={clientMobileView}
            clientSearch={clientSearch}
            displayClients={displayClients}
            onAddClient={openAddClient}
            onOpenBookingChat={openBookingChat}
            onOpenClient={openClientFile}
            onSaveClientBook={saveClientBook}
            onSearchChange={setClientSearch}
            onSetFilter={setClientDeskFilter}
            showToast={showToast}
          />

          <ClientAddPanel
            clientLabelOptions={clientLabelOptions}
            isVisible={clientMobileView === 'add'}
            onClose={() => setClientMobileView('directory')}
            onSubmit={handleManualClientSubmit}
          />
        </section>

        <ClientProfilePanel
          activeClient={activeClient}
          clientLabelOptions={clientLabelOptions}
          clientMobileView={clientMobileView}
          clientNoteDraft={clientNoteDraft}
          getBookingService={getBookingService}
          onAvatarUpload={handleClientAvatarUpload}
          onBackToDirectory={() => setClientMobileView('directory')}
          onOpenAddClient={openAddClient}
          onOpenBookings={() => navigateWorkspaceTab('bookings')}
          onNoteDraftChange={setClientNoteDraft}
          onSaveDetails={upsertClientRecord}
          onSaveNotes={upsertClientRecord}
          onToggleLabel={toggleClientLabel}
          safeStaffList={safeStaffList}
          showToast={showToast}
        />
      </div>
    </div>
  );
};
