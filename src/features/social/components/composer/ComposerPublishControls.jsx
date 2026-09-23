export function ComposerPublishControls({ c }) {
  const minimum = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16);
  return (
    <section className="bb-composer-publish-controls" aria-label="Publishing options">
      <div className="bb-composer-publish-controls-head">
        <strong>When should this go live?</strong>
        <span>You can keep working, publish now, or choose a future time.</span>
      </div>
      <div className="bb-composer-publish-modes" role="radiogroup" aria-label="Publishing status">
        {[
          ['published', 'Publish now'],
          ['draft', 'Save draft'],
          ['scheduled', 'Schedule']
        ].map(([value, label]) => (
          <label key={value} className={c.publishMode === value ? 'is-selected' : ''}>
            <input
              type="radio"
              name="social-publish-mode"
              value={value}
              checked={c.publishMode === value}
              onChange={() => c.setPublishMode(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {c.publishMode === 'scheduled' ? (
        <label className="bb-social-field bb-composer-schedule-field">
          <span>Publish date and time</span>
          <input
            type="datetime-local"
            className="native-control-input bb-social-compose-control"
            min={minimum}
            value={c.scheduledAtLocal}
            onChange={(event) => c.setScheduledAtLocal(event.target.value)}
          />
        </label>
      ) : null}
    </section>
  );
}
