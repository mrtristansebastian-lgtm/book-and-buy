import { ChipList } from './ChipList';
import { ExploreCategoryPicker } from '../../../shared/ui/ExploreCategoryPicker';

export function ProductEditorCategoryStep({ categoryOptions, draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Category</h3>
      <p className="bb-services-section-lede">Store categories stay flexible and shape your Buy page navigation.</p>
      <ChipList
        values={categoryOptions}
        selected={draft.category || ''}
        onSelect={(label) => patch({ category: label })}
        onAdd={(label) => patch({ category: label })}
        addLabel="Add category"
      />
      <ExploreCategoryPicker mode="buy" value={draft} onChange={patch} />
    </section>
  );
}
