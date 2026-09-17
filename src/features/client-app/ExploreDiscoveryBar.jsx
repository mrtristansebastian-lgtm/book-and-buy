import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  BookOpen,
  Car,
  ChevronRight,
  Clock3,
  Cookie,
  Download,
  Dumbbell,
  Flower,
  Gem,
  Globe2,
  GraduationCap,
  Hand,
  Home,
  Image,
  Lamp,
  Layers,
  MapPin,
  Navigation,
  PartyPopper,
  PawPrint,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  X
} from 'lucide-react';
import {
  EXPLORE_MODE_FILTERS,
  bookCategoryGroups,
  buyCategoryGroups,
  categoriesInGroup,
  categoryLabel,
  getCategoryGroupById,
  groupsForExploreMode,
  isExploreGroupFilterId,
  isExploreModeFilterId,
  resolveExploreChipFromLabel,
  searchCategories,
  searchCategoryGroups
} from '../../config/businessCategories';
import { DistanceRingControl } from './DistanceRingControl';

const HISTORY_MAX = 5;

const GROUP_ICONS = {
  Sparkles,
  Dumbbell,
  GraduationCap,
  UtensilsCrossed,
  Home,
  PawPrint,
  Car,
  PartyPopper,
  Ticket,
  ShoppingBag,
  Shirt,
  Gem,
  Image,
  Hand,
  Bike,
  BookOpen,
  Smartphone,
  Download,
  Lamp,
  Cookie,
  Flower
};

const MODE_ICONS = {
  book: Sparkles,
  buy: ShoppingBag,
  both: Layers
};

function pushHistory(prev = [], term = '') {
  const next = String(term || '').trim();
  if (!next) return prev;
  const cleaned = [next, ...prev.filter((item) => item.toLowerCase() !== next.toLowerCase())];
  return cleaned.slice(0, HISTORY_MAX);
}

function selectedModeId(categoryIds = []) {
  return categoryIds.find((id) => isExploreModeFilterId(id)) || '';
}

function modeKeyFromChip(id) {
  if (id === 'mode:book') return 'book';
  if (id === 'mode:buy') return 'buy';
  if (id === 'mode:both') return 'both';
  return 'all';
}

function PickCell({ icon: Icon, label, selected = false, onClick, size = 20 }) {
  return (
    <button
      type="button"
      className={`bb-explore-pick${selected ? ' is-on' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="bb-explore-pick-icon" aria-hidden="true">
        <Icon size={size} strokeWidth={1.75} />
      </span>
      <span className="bb-explore-pick-label">{label}</span>
    </button>
  );
}

/**
 * Wizard discovery: Book/Buy/Both → categories → subcategories as matching tiles.
 * Every tile becomes a removable pill; Done & Search closes with current filters.
 */
export function ExploreDiscoveryBar({
  mode = 'local',
  maxKm = 30,
  categoryIds = [],
  queryText = '',
  searchHistory = [],
  clientCity = '',
  clientCountryCode = '',
  geoStatus = 'idle',
  onModeChange,
  onMaxKmChange,
  onCategoryIdsChange,
  onQueryChange,
  onSearchHistoryChange,
  onRequestGeo,
  onPickManualLocation
}) {
  const searchId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(queryText);
  /** Wizard step: mode → groups → leaves */
  const [step, setStep] = useState('mode');
  const [activeGroupId, setActiveGroupId] = useState('');

  const selected = useMemo(() => new Set(categoryIds.map(String)), [categoryIds]);
  const selectedList = useMemo(() => [...selected], [selected]);
  const modeChip = selectedModeId(selectedList);
  const modeKey = modeKeyFromChip(modeChip);

  useEffect(() => {
    setDraft(queryText);
  }, [queryText]);

  useEffect(() => {
    if (!open) {
      setStep(modeChip ? 'groups' : 'mode');
      setActiveGroupId('');
    }
  }, [open, modeChip]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (step === 'leaves') {
          setStep('groups');
          setActiveGroupId('');
        } else if (step === 'groups' && modeChip) {
          setStep('mode');
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, step, modeChip]);

  const activeGroup = activeGroupId ? getCategoryGroupById(activeGroupId) : null;
  const visibleGroups = useMemo(() => groupsForExploreMode(modeKey), [modeKey]);
  const bookGroups = useMemo(() => bookCategoryGroups(), []);
  const buyGroups = useMemo(() => buyCategoryGroups(), []);
  const leafCategories = useMemo(() => {
    if (!activeGroupId) return [];
    const leaves = categoriesInGroup(activeGroupId);
    if (modeKey === 'all' || modeKey === 'both') return leaves;
    return leaves.filter((item) => item.modes.includes(modeKey));
  }, [activeGroupId, modeKey]);

  const renderGroupGrid = (groups) => (
    <div className="bb-explore-pick-grid">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.icon] || Sparkles;
        const chipId = `group:${group.id}`;
        return (
          <PickCell
            key={group.id}
            icon={Icon}
            label={group.label}
            selected={selected.has(chipId)}
            onClick={() => pickGroup(group.id)}
          />
        );
      })}
    </div>
  );

  const typed = draft.trim();
  const matchingGroups = useMemo(() => searchCategoryGroups(typed), [typed]);
  const matchingLeaves = useMemo(
    () => (typed ? searchCategories(typed, modeKey === 'both' ? 'all' : modeKey).slice(0, 10) : []),
    [typed, modeKey]
  );
  const matchingModes = useMemo(() => {
    if (!typed) return EXPLORE_MODE_FILTERS;
    const q = typed.toLowerCase();
    return EXPLORE_MODE_FILTERS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.mode.includes(q)
    );
  }, [typed]);

  const nearLabel = clientCity
    ? clientCity
    : clientCountryCode
      ? clientCountryCode
      : 'Near you';

  const keepOpenFocus = () => {
    setOpen(true);
    inputRef.current?.focus();
  };

  const rememberLabel = (id) => {
    const label = categoryLabel(id);
    if (label) onSearchHistoryChange?.(pushHistory(searchHistory, label));
  };

  const setChips = (nextIds, historyId) => {
    onCategoryIdsChange?.(nextIds);
    if (historyId) rememberLabel(historyId);
  };

  const clearCategory = (id) => {
    const next = categoryIds.filter((item) => item !== id);
    onCategoryIdsChange?.(next);
    if (isExploreModeFilterId(id)) {
      setStep('mode');
      setActiveGroupId('');
    } else if (isExploreGroupFilterId(id) && activeGroupId === id.slice('group:'.length)) {
      setStep('groups');
      setActiveGroupId('');
    }
    keepOpenFocus();
  };

  const pickMode = (modeId) => {
    const withoutModes = selectedList.filter((id) => !isExploreModeFilterId(id));
    setChips([...withoutModes, modeId], modeId);
    setStep('groups');
    setActiveGroupId('');
    setDraft('');
    onQueryChange?.('');
    keepOpenFocus();
  };

  const pickGroup = (groupId, { ensureMode = false } = {}) => {
    const chipId = `group:${groupId}`;
    const withoutModes = selectedList.filter((id) => !isExploreModeFilterId(id));
    const withoutGroups = withoutModes.filter((id) => !isExploreGroupFilterId(id));
    const modeId = modeChip || (ensureMode ? 'mode:both' : '');
    const next = [
      ...(modeId ? [modeId] : []),
      ...withoutGroups.filter((id) => id !== chipId),
      chipId
    ];
    setChips(next, chipId);
    setActiveGroupId(groupId);
    setStep('leaves');
    setDraft('');
    onQueryChange?.('');
    keepOpenFocus();
  };

  const toggleLeaf = (id) => {
    const next = new Set(selected);
    const wasOn = next.has(id);
    if (wasOn) next.delete(id);
    else next.add(id);
    setChips([...next], wasOn ? '' : id);
    keepOpenFocus();
  };

  const commitSearch = (term = draft) => {
    const next = String(term || '').trim();
    setDraft(next);
    onQueryChange?.(next);
    if (next) onSearchHistoryChange?.(pushHistory(searchHistory, next));
    setOpen(false);
    setActiveGroupId('');
  };

  const applyRecent = (term) => {
    const chipId = resolveExploreChipFromLabel(term);
    if (chipId) {
      setDraft('');
      onQueryChange?.('');
      if (isExploreModeFilterId(chipId)) {
        pickMode(chipId);
        return;
      }
      if (isExploreGroupFilterId(chipId)) {
        pickGroup(chipId.slice('group:'.length), { ensureMode: true });
        return;
      }
      const next = selected.has(chipId) ? selectedList : [...selectedList, chipId];
      setChips(next, chipId);
      setStep(modeChip ? 'groups' : 'mode');
      keepOpenFocus();
      return;
    }
    commitSearch(term);
  };

  const goBack = () => {
    if (step === 'leaves') {
      setStep('groups');
      setActiveGroupId('');
    } else if (step === 'groups') {
      setStep('mode');
    }
    keepOpenFocus();
  };

  const chipClassName = (id) => {
    if (isExploreModeFilterId(id)) return 'bb-explore-chip is-mode';
    if (isExploreGroupFilterId(id)) return 'bb-explore-chip is-group';
    return 'bb-explore-chip';
  };

  const hasChips = selectedList.length > 0;
  const showPanel = open;
  const groupIcon = activeGroup ? GROUP_ICONS[activeGroup.icon] || Sparkles : Sparkles;
  const stepTitle =
    step === 'mode'
      ? 'Book or buy?'
      : step === 'groups'
        ? 'Categories'
        : activeGroup?.label || 'Industries';

  return (
    <div className="bb-explore-discovery" ref={rootRef}>
      <div className="bb-explore-discovery-row">
        <div className="bb-explore-discovery-modes" role="tablist" aria-label="Discovery mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'local'}
            className={`bb-explore-mode${mode === 'local' ? ' is-active' : ''}`}
            onClick={() => onModeChange?.('local')}
          >
            <Navigation size={13} strokeWidth={2.4} aria-hidden="true" />
            Local
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'international'}
            className={`bb-explore-mode${mode === 'international' ? ' is-active' : ''}`}
            onClick={() => onModeChange?.('international')}
          >
            <Globe2 size={13} strokeWidth={2.4} aria-hidden="true" />
            International
          </button>
        </div>

        {mode === 'local' ? (
          <div className="bb-explore-near">
            <MapPin size={12} strokeWidth={2.4} aria-hidden="true" />
            <span className="bb-explore-near-text">{nearLabel}</span>
            {geoStatus === 'loading' ? (
              <span className="bb-explore-near-status">…</span>
            ) : (
              <button
                type="button"
                className="bb-explore-near-btn"
                onClick={
                  geoStatus === 'ready' || clientCity ? onPickManualLocation : onRequestGeo
                }
              >
                {geoStatus === 'ready' || clientCity ? 'Change' : 'Locate'}
              </button>
            )}
          </div>
        ) : (
          <p className="bb-explore-intl-copy">
            Serving <strong>{clientCountryCode || 'your country'}</strong>
          </p>
        )}
      </div>

      {mode === 'local' ? (
        <DistanceRingControl value={maxKm} onChange={onMaxKmChange} />
      ) : null}

      <div
        className={`bb-explore-search${showPanel ? ' is-open' : ''}${
          draft || hasChips ? ' has-value' : ''
        }`}
      >
        <div
          className={`bb-explore-chip-field${hasChips ? ' has-chips' : ''}`}
          onClick={() => keepOpenFocus()}
        >
          <Search size={16} strokeWidth={2.2} className="bb-explore-chip-field-icon" aria-hidden="true" />
          <div className="bb-explore-chip-field-inner">
            {selectedList.map((id) => (
              <button
                key={id}
                type="button"
                className={chipClassName(id)}
                aria-label={`Remove ${categoryLabel(id, id)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  clearCategory(id);
                }}
              >
                <span>{categoryLabel(id, id)}</span>
                <X size={12} strokeWidth={2.6} aria-hidden="true" />
              </button>
            ))}
            <input
              ref={inputRef}
              id={searchId}
              type="text"
              className="bb-explore-chip-input"
              value={draft}
              placeholder={hasChips ? 'Add more…' : 'Search places, posts, or industries'}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              aria-expanded={showPanel}
              aria-controls={`${searchId}-panel`}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                onQueryChange?.(next);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !draft && selectedList.length) {
                  clearCategory(selectedList[selectedList.length - 1]);
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitSearch(draft);
                }
              }}
            />
          </div>
          {draft || hasChips ? (
            <button
              type="button"
              className="bb-explore-chip-field-clear"
              aria-label="Clear search"
              onClick={(event) => {
                event.stopPropagation();
                setDraft('');
                onQueryChange?.('');
                onCategoryIdsChange?.([]);
                setStep('mode');
                setActiveGroupId('');
                keepOpenFocus();
              }}
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          ) : null}
        </div>

        {showPanel ? (
          <div
            id={`${searchId}-panel`}
            className="bb-explore-search-panel"
            role="listbox"
            aria-label="Search suggestions"
          >
            {searchHistory.length > 0 && !typed && step === 'mode' ? (
              <section className="bb-explore-search-section">
                <header className="bb-explore-search-section-head">
                  <span>Recent</span>
                  <button
                    type="button"
                    className="bb-explore-search-section-action"
                    onClick={() => onSearchHistoryChange?.([])}
                  >
                    Clear
                  </button>
                </header>
                <ul className="bb-explore-search-history">
                  {searchHistory.slice(0, HISTORY_MAX).map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        className="bb-explore-search-history-item"
                        onClick={() => applyRecent(term)}
                      >
                        <Clock3 size={14} strokeWidth={2.2} aria-hidden="true" />
                        <span>{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="bb-explore-search-section">
              <header className="bb-explore-search-section-head">
                {step !== 'mode' && !typed ? (
                  <button type="button" className="bb-explore-search-back" onClick={goBack}>
                    <ArrowLeft size={14} strokeWidth={2.3} aria-hidden="true" />
                    {stepTitle}
                  </button>
                ) : (
                  <span>{typed ? 'Results' : stepTitle}</span>
                )}
              </header>

              {typed ? (
                <div className="bb-explore-search-cat-list">
                  {matchingModes.map((item) => {
                    const Icon = MODE_ICONS[item.mode] || Sparkles;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`bb-explore-pick-row${selected.has(item.id) ? ' is-on' : ''}`}
                        onClick={() => pickMode(item.id)}
                      >
                        <span className="bb-explore-pick-icon" aria-hidden="true">
                          <Icon size={16} strokeWidth={1.9} />
                        </span>
                        <span className="bb-explore-pick-row-copy">
                          <strong>{item.label}</strong>
                          <span className="bb-explore-pick-row-meta">Filter</span>
                        </span>
                        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    );
                  })}
                  {matchingGroups.map((group) => {
                    const Icon = GROUP_ICONS[group.icon] || Sparkles;
                    const chipId = `group:${group.id}`;
                    return (
                      <button
                        key={`g-${group.id}`}
                        type="button"
                        className={`bb-explore-pick-row${selected.has(chipId) ? ' is-on' : ''}`}
                        onClick={() => pickGroup(group.id, { ensureMode: true })}
                      >
                        <span className="bb-explore-pick-icon" aria-hidden="true">
                          <Icon size={16} strokeWidth={1.9} />
                        </span>
                        <span className="bb-explore-pick-row-copy">
                          <strong>{group.label}</strong>
                          <span className="bb-explore-pick-row-meta">
                            {group.categoryIds.length} industries
                          </span>
                        </span>
                        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    );
                  })}
                  {matchingLeaves.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`bb-explore-pick-row${selected.has(item.id) ? ' is-on' : ''}`}
                      onClick={() => toggleLeaf(item.id)}
                    >
                      <span className="bb-explore-pick-icon" aria-hidden="true">
                        <Sparkles size={16} strokeWidth={1.9} />
                      </span>
                      <span className="bb-explore-pick-row-copy">
                        <strong>{item.label}</strong>
                        <span className="bb-explore-pick-row-meta">
                          {item.modes.includes('book') && item.modes.includes('buy')
                            ? 'Book · Buy'
                            : item.modes[0] === 'book'
                              ? 'Book'
                              : 'Buy'}
                        </span>
                      </span>
                    </button>
                  ))}
                  {matchingModes.length === 0 &&
                  matchingGroups.length === 0 &&
                  matchingLeaves.length === 0 ? (
                    <p className="bb-explore-search-empty">No categories match that.</p>
                  ) : null}
                </div>
              ) : step === 'mode' ? (
                <div className="bb-explore-pick-grid bb-explore-pick-modes-grid">
                  {EXPLORE_MODE_FILTERS.map((item) => {
                    const Icon = MODE_ICONS[item.mode] || Sparkles;
                    return (
                      <PickCell
                        key={item.id}
                        icon={Icon}
                        label={item.label}
                        size={22}
                        selected={selected.has(item.id)}
                        onClick={() => pickMode(item.id)}
                      />
                    );
                  })}
                </div>
              ) : step === 'groups' ? (
                modeKey === 'both' ? (
                  <div className="bb-explore-pick-split-wrap">
                    <div className="bb-explore-pick-split-block">
                      <p className="bb-explore-pick-split-label">Book</p>
                      {renderGroupGrid(bookGroups)}
                    </div>
                    <div className="bb-explore-pick-split" role="separator" aria-hidden="true" />
                    <div className="bb-explore-pick-split-block">
                      <p className="bb-explore-pick-split-label">Buy</p>
                      {renderGroupGrid(buyGroups)}
                    </div>
                  </div>
                ) : (
                  renderGroupGrid(visibleGroups)
                )
              ) : (
                <div className="bb-explore-pick-grid">
                  {leafCategories.map((item) => (
                    <PickCell
                      key={item.id}
                      icon={groupIcon}
                      label={item.label}
                      selected={selected.has(item.id)}
                      onClick={() => toggleLeaf(item.id)}
                    />
                  ))}
                  {leafCategories.length === 0 ? (
                    <p className="bb-explore-search-empty">No industries in this category.</p>
                  ) : null}
                </div>
              )}
            </section>

            <button
              type="button"
              className="bb-explore-search-submit"
              onClick={() => commitSearch(draft)}
            >
              Done &amp; search
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
