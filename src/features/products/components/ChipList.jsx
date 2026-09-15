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
      <button
        type="button"
        className={`bb-products-chip${!selected ? ' is-active' : ''}`}
        onClick={() => onSelect?.('')}
      >
        None
      </button>
      {values.map((label) => (
        <button
          key={label}
          type="button"
          className={`bb-products-chip${selected === label ? ' is-active' : ''}`}
          onClick={() => onSelect?.(label)}
        >
          {label}
        </button>
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
          <button type="button" className="bb-primary-btn" onClick={commit}>
            Add
          </button>
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setAdding(false);
              setDraft('');
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="bb-products-chip bb-products-chip--add"
          onClick={() => setAdding(true)}
        >
          <Plus size={13} />
          {addLabel}
        </button>
      )}
    </div>
  );
}
