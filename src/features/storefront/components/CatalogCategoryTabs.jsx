import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';

export function CatalogCategoryTabs({
  options = [],
  value = 'all',
  onChange,
  ariaLabel = 'Categories'
}) {
  if (!options.length || options.length < 2) return null;

  return (
    <div className="bb-public-catalog-tabs">
      <PeriodSegmentedControl
        ariaLabel={ariaLabel}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
