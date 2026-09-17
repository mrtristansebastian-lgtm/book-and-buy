import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Car,
  ChevronRight,
  Clock3,
  Dumbbell,
  Globe2,
  GraduationCap,
  Home,
  MapPin,
  Navigation,
  PartyPopper,
  PawPrint,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  X
} from 'lucide-react';
import {
  BUSINESS_CATEGORY_GROUPS,
  EXPLORE_MODE_FILTERS,
  categoriesForMode,
  categoriesInGroup,
  categoryLabel,
  getCategoryGroupById,
  isExploreGroupFilterId,
  isExploreModeFilterId,
  searchCategories,
  searchCategoryGroups
} from '../../config/businessCategories';
import { DistanceRingControl } from './DistanceRingControl';

const HISTORY_MAX = 5;
const MODE_GROUP_PREFIX = 'mode-group:';

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
  ShoppingBag
};

const MODE_ICONS = {
  book: Sparkles,
  buy: ShoppingBag
};

function pushHistory(prev = [], term = '') {
  const next = String(term || '').trim();
  if (!next) return prev;
  const cleaned = [next, ...prev.filter((item) => item.toLowerCase() !== next.toLowerCase())];
  return cleaned.slice(0, HISTORY_MAX);
}

function modeGroupId(mode) {
  return `${MODE_GROUP_PREFIX}${mode}`;
}

function parseModeGroup(id) {
  if (!String(id || '').startsWith(MODE_GROUP_PREFIX)) return '';
  return String(id).slice(MODE_GROUP_PREFIX.length);
}

/**
 * Local-first discovery: Book/Buy + parent groups → chips in the search field.
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
  const [activeGroupId, setActiveGroupId] = useState('');
  const selected = useMemo(() => new Set(categoryIds.map(String)), [categoryIds]);
  const selectedList = useMemo(() => [...selected], [selected]);

  useEffect(() => {
    setDraft(queryText);
  }, [queryText]);

  useEffect(() => {
    if (!open) setActiveGroupId('');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (activeGroupId) setActiveGroupId('');
        else setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, activeGroupId]);

  const activeModeBrowse = parseModeGroup(activeGroupId);
  const activeGroup = !activeModeBrowse && activeGroupId ? getCategoryGroupById(activeGroupId) : null;
  const leafCategories = useMemo(() => {
    if (activeModeBrowse) return categoriesForMode(activeModeBrowse);
    if (activeGroupId) return categoriesInGroup(activeGroupId);
    return [];
  }, [activeGroupId, activeModeBrowse]);

  const typed = draft.trim();
  const matchingGroups = useMemo(() => searchCategoryGroups(typed), [typed]);
  const matchingLeaves = useMemo(
    () => (typed ? searchCategories(typed, 'all').slice(0, 10) : []),
    [typed]
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

  const commitSearch = (term = draft) => {
    const next = String(term || '').trim();
    onQueryChange?.(next);
    if (next) onSearchHistoryChange?.(pushHistory(searchHistory, next));
    setOpen(false);
    setActiveGroupId('');
  };

  const toggleCategory = (id) => {
    const next = new Set(selected);
    const wasOn = next.has(id);
    if (wasOn) next.delete(id);
    else next.add(id);
    onCategoryIdsChange?.([...next]);
    if (!wasOn) {
      const label = categoryLabel(id);
      if (label) onSearchHistoryChange?.(pushHistory(searchHistory, label));
    }
    inputRef.current?.focus();
  };

  const ensureChip = (id) => {
    if (selected.has(id)) return;
    const next = [...selectedList, id];
    onCategoryIdsChange?.(next);
    const label = categoryLabel(id);
    if (label) onSearchHistoryChange?.(pushHistory(searchHistory, label));
  };

  const openModeBrowse = (mode) => {
    ensureChip(`mode:${mode}`);
    setActiveGroupId(modeGroupId(mode));
    setDraft('');
    onQueryChange?.('');
    inputRef.current?.focus();
  };

  const openGroupBrowse = (groupId) => {
    ensureChip(`group:${groupId}`);
    setActiveGroupId(groupId);
    setDraft('');
    onQueryChange?.('');
    inputRef.current?.focus();
  };

  const clearCategory = (id) => {
    onCategoryIdsChange?.(categoryIds.filter((item) => item !== id));
  };

  const chipClassName = (id) => {
    if (isExploreModeFilterId(id)) return 'bb-explore-search-chip is-mode';
    if (isExploreGroupFilterId(id)) return 'bb-explore-search-chip is-group';
    return 'bb-explore-search-chip';
  };

  const hasChips = selectedList.length > 0;
  const showPanel = open;
  const browseTitle = activeModeBrowse
    ? activeModeBrowse === 'book'
      ? 'Book'
      : 'Buy'
    : activeGroup?.label || 'Categories';

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
          className={`bb-search-field bb-explore-search-field${hasChips ? ' has-chips' : ''}`}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <Search size={16} strokeWidth={2.2} className="bb-search-field-icon" aria-hidden="true" />
          <div className="bb-explore-search-inner">
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
                <X size={11} strokeWidth={2.6} aria-hidden="true" />
              </button>
            ))}
            <input
              ref={inputRef}
              id={searchId}
              type="search"
              className="native-search-input"
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
                if (next.trim()) setActiveGroupId('');
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
              className="bb-explore-search-clear"
              aria-label="Clear search"
              onClick={(event) => {
                event.stopPropagation();
                setDraft('');
                onQueryChange?.('');
                onCategoryIdsChange?.([]);
                setActiveGroupId('');
                inputRef.current?.focus();
                setOpen(true);
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
            {searchHistory.length > 0 && !typed && !activeGroupId ? (
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
                        onClick={() => {
                          setDraft(term);
                          commitSearch(term);
                        }}
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
                {activeGroupId ? (
                  <button
                    type="button"
                    className="bb-explore-search-back"
                    onClick={() => setActiveGroupId('')}
                  >
                    <ArrowLeft size={14} strokeWidth={2.3} aria-hidden="true" />
                    {browseTitle}
                  </button>
                ) : (
                  <span>{typed ? 'Results' : 'Categories'}</span>
                )}
              </header>

              {activeGroupId ? (
                <div className="bb-explore-search-cat-list">
                  {leafCategories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`bb-explore-search-cat${selected.has(item.id) ? ' is-on' : ''}`}
                      onClick={() => toggleCategory(item.id)}
                    >
                      <span>{item.label}</span>
                      <span className="bb-explore-search-cat-mode">
                        {item.modes.includes('book') && item.modes.includes('buy')
                          ? 'Book · Buy'
                          : item.modes[0] === 'book'
                            ? 'Book'
                            : 'Buy'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : typed ? (
                <div className="bb-explore-search-cat-list">
                  {matchingModes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`bb-explore-search-cat${selected.has(item.id) ? ' is-on' : ''}`}
                      onClick={() => openModeBrowse(item.mode)}
                    >
                      <span>{item.label}</span>
                      <span className="bb-explore-search-cat-mode">All</span>
                    </button>
                  ))}
                  {matchingGroups.map((group) => {
                    const Icon = GROUP_ICONS[group.icon] || Sparkles;
                    return (
                      <button
                        key={`g-${group.id}`}
                        type="button"
                        className="bb-explore-search-parent is-row"
                        onClick={() => openGroupBrowse(group.id)}
                      >
                        <span className="bb-explore-search-parent-icon" aria-hidden="true">
                          <Icon size={16} strokeWidth={1.9} />
                        </span>
                        <span className="bb-explore-search-parent-copy">
                          <strong>{group.label}</strong>
                          <span className="bb-explore-search-parent-meta">
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
                      className={`bb-explore-search-cat${selected.has(item.id) ? ' is-on' : ''}`}
                      onClick={() => toggleCategory(item.id)}
                    >
                      <span>{item.label}</span>
                      <span className="bb-explore-search-cat-mode">
                        {item.modes[0] === 'book' ? 'Book' : 'Buy'}
                      </span>
                    </button>
                  ))}
                  {matchingModes.length === 0 &&
                  matchingGroups.length === 0 &&
                  matchingLeaves.length === 0 ? (
                    <p className="bb-explore-search-empty">No categories match that.</p>
                  ) : null}
                  <button
                    type="button"
                    className="bb-explore-search-submit"
                    onClick={() => commitSearch(draft)}
                  >
                    Search “{typed}”
                  </button>
                </div>
              ) : (
                <>
                  <div className="bb-explore-search-mode-tiles">
                    {EXPLORE_MODE_FILTERS.map((item) => {
                      const Icon = MODE_ICONS[item.mode] || Sparkles;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`bb-explore-search-mode-tile${
                            selected.has(item.id) ? ' is-on' : ''
                          }`}
                          onClick={() => openModeBrowse(item.mode)}
                        >
                          <span className="bb-explore-search-parent-icon" aria-hidden="true">
                            <Icon size={18} strokeWidth={1.85} />
                          </span>
                          <span className="bb-explore-search-mode-tile-label">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="bb-explore-search-hint">Or pick an industry group</p>
                  <div className="bb-explore-search-parent-grid">
                    {BUSINESS_CATEGORY_GROUPS.map((group) => {
                      const Icon = GROUP_ICONS[group.icon] || Sparkles;
                      const chipId = `group:${group.id}`;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          className={`bb-explore-search-parent${
                            selected.has(chipId) ? ' is-on' : ''
                          }`}
                          onClick={() => openGroupBrowse(group.id)}
                        >
                          <span className="bb-explore-search-parent-icon" aria-hidden="true">
                            <Icon size={18} strokeWidth={1.85} />
                          </span>
                          <span className="bb-explore-search-parent-label">{group.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
