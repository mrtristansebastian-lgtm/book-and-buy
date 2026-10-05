import { SortField } from '../../../shared/ui/SortField';

export function CatalogCategoryTabs({
  options = [],
  value = 'all',
  onChange,
  ariaLabel = 'Categories'
}) {
  if (options.length < 2) return null;

  return (
    <div className="bb-public-catalog-category-field">
      <SortField
        label="Category"
        value={value}
        onChange={onChange}
        options={options}
        pickerTitle={ariaLabel}
        pickerHint="Choose a category to browse."
      />
    </div>
  );
}
