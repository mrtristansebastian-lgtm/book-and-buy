import { ChevronRight } from 'lucide-react';
import { LAYOUT_COUNT } from '../home-sections/sectionLayout';

export function EditSection({
  editMode = false,
  title,
  children,
  className = '',
  hidden = false,
  coach,
  sectionId,
  layout = 0,
  onCycleLayout
}) {
  if (hidden && !editMode) return null;

  const layoutIndex = Number.isFinite(Number(layout)) ? Number(layout) : 0;
  const showCycle = editMode && typeof onCycleLayout === 'function';

  return (
    <section
      className={`bb-edit-section ${editMode ? 'bb-edit-section--edit' : ''} ${
        hidden ? 'bb-edit-section--hidden' : ''
      } ${className}`}
      data-section={title || sectionId || undefined}
      data-layout={layoutIndex}
      data-section-id={sectionId || undefined}
    >
      {editMode && title ? (
        <div className="bb-edit-section-label">
          <span>{title}</span>
          {hidden ? <span className="bb-edit-section-badge">Hidden</span> : null}
          {showCycle ? (
            <div className="bb-edit-section-layout-controls">
              <span className="bb-edit-section-layout-index" aria-hidden="true">
                {layoutIndex + 1}/{LAYOUT_COUNT}
              </span>
              <button
                type="button"
                className="bb-edit-section-layout-next"
                aria-label={`Next layout for ${title}`}
                title="Next layout"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCycleLayout();
                }}
              >
                <ChevronRight size={16} strokeWidth={2.4} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {editMode && coach && !hidden ? <p className="bb-edit-section-coach">{coach}</p> : null}
      {children}
    </section>
  );
}
