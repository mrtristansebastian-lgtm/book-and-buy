import { Plus } from 'lucide-react';

export function ServiceEditorCategoryStep({
  draft,
  patch,
  categoryOptions,
  addingCategory,
  setAddingCategory,
  newCategory,
  setNewCategory,
  commitCategory
}) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Category</h3>
      <div className="bb-services-category-chips">
        <button
          type="button"
          className={`bb-services-chip${!draft.category ? ' is-active' : ''}`}
          onClick={() => patch({ category: '' })}
        >
          None
        </button>
        {categoryOptions.map((label) => {
          const active = draft.category === label;
          return (
            <button
              key={label}
              type="button"
              className={`bb-services-chip${active ? ' is-active' : ''}`}
              onClick={() => patch({ category: label })}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          className="bb-services-chip bb-services-chip--add"
          onClick={() => setAddingCategory(true)}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {addingCategory ? (
        <div className="bb-services-category-add">
          <input
            className="native-control-input bb-services-control"
            value={newCategory}
            placeholder="New category"
            autoFocus
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitCategory();
              }
            }}
          />
          <button type="button" className="bb-primary-btn" onClick={commitCategory}>
            Save
          </button>
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setAddingCategory(false);
              setNewCategory('');
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
}
