import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  BUSINESS_CATEGORIES,
  categoryLabel,
  searchCategories
} from '../../config/businessCategories';

/**
 * Searchable Book / Buy industry picker. Selecting sets categoryId + label.
 */
export function BusinessCategoryPicker({
  value = '',
  onChange,
  mode = 'all',
  compact = false
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(mode === 'all' ? 'all' : mode);
  const selectedId = String(value || '').trim();

  const list = useMemo(() => {
    const filterMode = group === 'all' ? 'all' : group;
    return searchCategories(query, filterMode);
  }, [query, group]);

  const bookCount = BUSINESS_CATEGORIES.filter((c) => c.modes.includes('book')).length;
  const buyCount = BUSINESS_CATEGORIES.filter((c) => c.modes.includes('buy')).length;

  return (
    <div className={`bb-biz-cat-picker${compact ? ' is-compact' : ''}`}>
      <div className="bb-biz-cat-picker-tools">
        <label className="bb-biz-cat-picker-search">
          <Search size={15} strokeWidth={2.2} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Search industries"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search industries"
          />
        </label>
        {mode === 'all' ? (
          <div className="bb-biz-cat-picker-groups" role="tablist" aria-label="Industry type">
            {[
              { id: 'all', label: 'All' },
              { id: 'book', label: `Book (${bookCount})` },
              { id: 'buy', label: `Buy (${buyCount})` }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={group === item.id}
                className={`bb-biz-cat-picker-group${group === item.id ? ' is-active' : ''}`}
                onClick={() => setGroup(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedId ? (
        <p className="bb-biz-cat-picker-selected">
          Selected: <strong>{categoryLabel(selectedId)}</strong>
          <button
            type="button"
            className="bb-biz-cat-picker-clear"
            onClick={() => onChange?.({ categoryId: '', label: '' })}
          >
            Clear
          </button>
        </p>
      ) : null}

      <div className="bb-biz-cat-picker-grid" role="listbox" aria-label="Categories">
        {list.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`bb-biz-cat-picker-chip${active ? ' is-active' : ''}`}
              onClick={() => onChange?.({ categoryId: item.id, label: item.label })}
            >
              <span className="bb-biz-cat-picker-chip-mode">
                {item.modes.includes('book') && item.modes.includes('buy')
                  ? 'Book · Buy'
                  : item.modes[0] === 'book'
                    ? 'Book'
                    : 'Buy'}
              </span>
              <span className="bb-biz-cat-picker-chip-label">{item.label}</span>
            </button>
          );
        })}
        {list.length === 0 ? (
          <p className="bb-biz-cat-picker-empty">No industries match that search.</p>
        ) : null}
      </div>
    </div>
  );
}
