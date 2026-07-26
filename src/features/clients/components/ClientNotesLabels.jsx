import { Check, Plus, StickyNote, Tag } from 'lucide-react';

export const ClientNotesLabels = ({
  activeClient,
  clientLabelOptions,
  clientNoteDraft,
  isExampleClient,
  onNoteDraftChange,
  onSaveNotes,
  onToggleLabel,
  room = 'all',
  showToast
}) => {
  const savedNote = String(activeClient.notes || '').trim();
  const noteUpdatedAt = Number(activeClient.updatedAt || activeClient.createdAt || 0);
  const noteDate = noteUpdatedAt
    ? new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short' }).format(new Date(noteUpdatedAt))
    : 'Not saved yet';
  const showNotes = room === 'all' || room === 'notes';
  const showLabels = room === 'all' || room === 'labels';

  return (
    <div className="client-file-stack">
      {showNotes && (
        <section className="client-file-card client-notes-card">
          <div className="client-file-section-head is-compact">
            <div className="client-file-section-copy">
              <p className="client-file-kicker">Private notes</p>
              <h3>Staff context</h3>
              <p>Capture what your team should know, then keep the saved note visible below for quick review.</p>
            </div>
          </div>

          <div className="client-notes-workspace">
            <div className="client-note-editor-panel">
              <label className="client-notes-field">
                <span>Update note</span>
                <textarea
                  value={isExampleClient ? '' : clientNoteDraft}
                  onChange={(event) => onNoteDraftChange(event.target.value)}
                  placeholder={isExampleClient ? 'Example data is read-only.' : 'Add a clear note for the next visit, follow-up, preference, or important client context...'}
                  disabled={isExampleClient}
                  className="client-notes-textarea"
                />
              </label>
              <div className="client-notes-save-row">
                <p>Only your team can see these notes.</p>
                <button type="button" disabled={isExampleClient} onClick={async () => {
                  const saved = await onSaveNotes(activeClient.id, { notes: clientNoteDraft });
                  if (saved) showToast('Client notes saved');
                }} className="client-file-secondary-action">
                  <Check size={15} /> {isExampleClient ? 'Example only' : 'Save note'}
                </button>
              </div>
            </div>

            <aside className={`client-saved-notes-panel ${savedNote ? 'has-note' : 'is-empty'}`} aria-label="Saved client notes">
              <div className="client-saved-notes-head">
                <span className="client-file-soft-icon"><StickyNote size={17} /></span>
                <div>
                  <p className="client-file-kicker">Saved note</p>
                  <h4>{savedNote ? 'Latest staff note' : 'No saved note yet'}</h4>
                </div>
                <span>{savedNote ? (isExampleClient ? 'Example' : noteDate) : 'Empty'}</span>
              </div>
              <p>{savedNote || 'Save a note above and it will sit here as a quick reference before bookings, calls, and support replies.'}</p>
            </aside>
          </div>
        </section>
      )}

      {showLabels && (
        <section className="client-file-card client-label-card">
          <div className="client-file-section-head is-compact">
            <div className="client-file-section-copy">
              <p className="client-file-kicker">Client labels</p>
              <h3>Pinned signals</h3>
              <p>Auto labels come from booking behavior. Staff labels stay pinned on this client.</p>
            </div>
            <span className="client-file-soft-icon"><Tag size={17} /></span>
          </div>
          <div className="client-label-list">
            {clientLabelOptions.map(label => {
              const active = activeClient.labels?.includes(label);
              return (
                <button
                  key={label}
                  disabled={isExampleClient}
                  onClick={() => onToggleLabel(activeClient, label)}
                  className={`client-label-button ${active ? 'is-active' : ''}`}
                >
                  <span>{label}</span>
                  {active ? <Check size={15} /> : <Plus size={15} />}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
