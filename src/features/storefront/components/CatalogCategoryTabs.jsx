export function CatalogCategoryTabs({
  options = [],
  value = 'all',
  onChange,
  ariaLabel = 'Categories'
}) {
  if (!options.length || options.length < 2) return null;

  return (
    <div className="bb-public-catalog-tabs" role="tablist" aria-label={ariaLabel}>
      <div className="bb-public-catalog-tabs-rail">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`bb-public-catalog-tab${active ? ' is-active' : ''}`}
              onClick={() => onChange?.(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
