import { DurationPicker } from './DurationPicker';

export function ServiceEditorDurationStep({ draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Duration</h3>
      <p className="bb-services-section-lede">
        Used with Schedule hours to calculate bookable times.
      </p>
      <label className="bb-services-check">
        <input
          type="checkbox"
          checked={draft.fixedDuration === false}
          onChange={(event) => {
            const noFixed = event.target.checked;
            if (noFixed) {
              patch({
                fixedDuration: false,
                minDuration: draft.minDuration || draft.duration || '60'
              });
            } else {
              patch({
                fixedDuration: true,
                duration: draft.duration || draft.minDuration || '60'
              });
            }
          }}
        />
        <span>No fixed duration</span>
      </label>

      {draft.fixedDuration === false ? (
        <DurationPicker
          label="Minimum duration"
          hint="Required for availability"
          value={draft.minDuration}
          onChange={(minDuration) => patch({ minDuration })}
        />
      ) : (
        <DurationPicker
          label="Service length"
          hint="Blocks this much time on the schedule"
          value={draft.duration}
          onChange={(duration) => patch({ duration })}
        />
      )}
    </section>
  );
}
