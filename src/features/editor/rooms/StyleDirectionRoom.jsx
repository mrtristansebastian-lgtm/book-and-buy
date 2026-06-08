import { editorStyleDirections, getEditorStyleDirection } from '../../../config/appConfig';

export function StyleDirectionRoom({ value, onApply }) {
  const activeDirection = getEditorStyleDirection(value);

  return (
    <div className="style-direction-suite">
      <div className="style-direction-grid">
        {editorStyleDirections.map((direction) => {
          const isActive = activeDirection.id === direction.id;
          return (
            <button
              key={direction.id}
              type="button"
              onClick={() => onApply(direction.id)}
              className={isActive ? 'is-active' : ''}
              aria-pressed={isActive}
              aria-label={`${direction.label} style`}
              title={direction.label}
            >
              <i className={`style-direction-preview style-direction-preview-${direction.id}`} aria-hidden="true">
                <b />
                <b />
                <b />
                <b />
                <b />
                <b />
              </i>
              <strong>{direction.label}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
