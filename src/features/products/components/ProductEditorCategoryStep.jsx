import { ChipList } from './ChipList';

export function ProductEditorCategoryStep({ categoryOptions, draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Store Category</h3>
      <p className="bb-services-section-lede">Optionally group this product on your Buy page. Your Store Category is separate from your Discovery Category.</p>
      <ChipList
        values={categoryOptions}
        selected={draft.category || ''}
        onSelect={(label) => patch({ category: label })}
        onAdd={(label) => patch({ category: label })}
        addLabel="Add Store Category"
      />
    </section>
  );
}
