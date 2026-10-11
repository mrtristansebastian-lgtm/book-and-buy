import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';

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
      <h3 className="bb-services-section-title">Store Category</h3>
      <p className="bb-services-section-lede">Optionally group this service on your Book page. Your Store Category is separate from your Discovery Category.</p>
      <div className="bb-services-category-chips">
        <FilterChip
          type="button"
          selected={!draft.category}
          className={`bb-services-chip${!draft.category ? ' is-active' : ''}`}
          onClick={() => patch({ category: '' })}
        >
          None
        </FilterChip>
        {categoryOptions.map((label) => {
          const active = draft.category === label;
          return (
            <FilterChip
              key={label}
              type="button"
              selected={active}
              className={`bb-services-chip${active ? ' is-active' : ''}`}
              onClick={() => patch({ category: label })}
            >
              {label}
            </FilterChip>
          );
        })}
        <Button action="add" variant="primary"
          type="button"
          className="bb-services-chip bb-services-chip--add"
          onClick={() => setAddingCategory(true)}
        >
          Add
        </Button>
      </div>
      {addingCategory ? (
        <div className="bb-services-category-add">
          <input
            className="native-control-input bb-services-control"
            value={newCategory}
            placeholder="New Store Category"
            autoFocus
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitCategory();
              }
            }}
          />
          <Button action="save" variant="primary" type="button" className="bb-primary-btn" onClick={commitCategory}>
            Save
          </Button>
          <Button action="cancel" variant="secondary"
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setAddingCategory(false);
              setNewCategory('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </section>
  );
}
