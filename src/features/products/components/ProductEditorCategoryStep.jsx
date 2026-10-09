import { ChipList } from './ChipList';

export function ProductEditorCategoryStep({ categoryOptions, draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Store category</h3>
      <p className="bb-services-section-lede">Optionally group this product on your Buy page. Its discovery category is already set in the first step.</p>
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
