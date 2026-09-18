import {
  categoriesInGroup,
  categoryLabel,
  groupsForExploreMode,
  isValidExploreCategoryPair
} from '../../config/businessCategories';

/** Curated, item-level classification used only by individual Explore. */
export function ExploreCategoryPicker({ mode, value = {}, onChange, itemLabel = 'item', optional = false }) {
  const groups = groupsForExploreMode(mode);
  const mainId = String(value.exploreMainCategoryId || '');
  const subId = String(value.exploreSubcategoryId || '');
  const valid = isValidExploreCategoryPair(mainId, subId, mode);
  const leaves = mainId ? categoriesInGroup(mainId) : [];

  const chooseMain = (id) => {
    const keepSub = isValidExploreCategoryPair(id, subId, mode) ? subId : '';
    onChange?.({ exploreMainCategoryId: id, exploreSubcategoryId: keepSub });
  };

  return (
    <section className="bb-explore-category-picker" aria-labelledby={`explore-category-${mode}`}>
      <div className="bb-explore-category-picker-head">
        <div>
          <p className="bb-services-section-kicker">Explore discovery</p>
          <h3 id={`explore-category-${mode}`} className="bb-services-section-title">
            Help the right people find this {itemLabel}
          </h3>
          <p className="bb-services-section-lede">
            {optional
              ? 'Optional, but recommended: tagged content is much easier to surface in Explore.'
              : 'Choose one main category, then its best matching subcategory. These tags do not change your public catalog navigation.'}
          </p>
        </div>
        {valid ? (
          <span className="bb-explore-category-selected">
            {categoryLabel(mainId)} · {categoryLabel(subId)}
          </span>
        ) : null}
      </div>

      <div className="bb-explore-category-columns">
        <div className="bb-explore-category-column">
          <span className="bb-explore-category-label">1. Main category</span>
          <div className="bb-explore-category-main-grid">
            {groups.map((group) => {
              const selected = group.id === mainId;
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`bb-explore-category-main${selected ? ' is-active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => chooseMain(group.id)}
                >
                  <span>{group.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bb-explore-category-column">
          <span className="bb-explore-category-label">2. Subcategory</span>
          {mainId ? (
            <div className="bb-explore-category-sub-list" role="radiogroup" aria-label="Explore subcategory">
              {leaves.map((leaf) => {
                const selected = leaf.id === subId;
                return (
                  <button
                    key={leaf.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`bb-explore-category-sub${selected ? ' is-active' : ''}`}
                    onClick={() => onChange?.({ exploreMainCategoryId: mainId, exploreSubcategoryId: leaf.id })}
                  >
                    <span>{leaf.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="bb-explore-category-empty">Choose a main category first.</p>
          )}
        </div>
      </div>
    </section>
  );
}
