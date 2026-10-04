import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export function ChipList({ values = [], selected, onSelect, onAdd, addLabel = 'Add' }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const label = draft.trim();
    if (!label) return;
    onAdd?.(label);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="bb-products-chips">
      <FilterChip
        type="button"
        selected={!selected}
        className={`bb-products-chip${!selected ? ' is-active' : ''}`}
        onClick={() => onSelect?.('')}
      >
        None
      </FilterChip>
      {values.map((label) => (
        <FilterChip
          key={label}
          type="button"
          selected={selected === label}
          className={`bb-products-chip${selected === label ? ' is-active' : ''}`}
          onClick={() => onSelect?.(label)}
        >
          {label}
        </FilterChip>
      ))}
      {adding ? (
        <div className="bb-products-inline-add">
          <input
            className="native-control-input bb-services-control"
            value={draft}
            placeholder={addLabel}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
            }}
          />
          <Button action="add" variant="primary" type="button" className="bb-primary-btn" onClick={commit}>
            Add
          </Button>
          <Button action="cancel" variant="secondary"
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setAdding(false);
              setDraft('');
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button action="add" variant="primary"
          type="button"
          className="bb-products-chip bb-products-chip--add"
          onClick={() => setAdding(true)}
        >
          {addLabel}
        </Button>
      )}
    </div>
  );
}
