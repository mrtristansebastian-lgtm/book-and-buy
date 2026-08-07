export function EditSection({
  editMode = false,
  title,
  children,
  className = '',
  hidden = false,
  coach,
  sectionId
}) {
  if (hidden && !editMode) return null;

  return (
    <section
      className={`bb-edit-section ${editMode ? 'bb-edit-section--edit' : ''} ${
        hidden ? 'bb-edit-section--hidden' : ''
      } ${className}`}
      data-section={title || sectionId || undefined}
      data-section-id={sectionId || undefined}
    >
      {editMode && title ? (
        <div className="bb-edit-section-label">
          <span>{title}</span>
          {hidden ? <span className="bb-edit-section-badge">Hidden</span> : null}
        </div>
      ) : null}
      {editMode && coach && !hidden ? <p className="bb-edit-section-coach">{coach}</p> : null}
      {children}
    </section>
  );
}
