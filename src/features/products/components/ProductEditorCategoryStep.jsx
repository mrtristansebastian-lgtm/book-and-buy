import { ChipList } from './ChipList';

export function ProductEditorCategoryStep({ categoryOptions, draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Category</h3>
      <ChipList
        values={categoryOptions}
        selected={draft.category || ''}
        onSelect={(label) => patch({ category: label })}
        onAdd={(label) => patch({ category: label })}
        addLabel="Add category"
      />
    </section>
  );
}
