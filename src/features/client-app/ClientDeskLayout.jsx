import { FilterChip } from '../../shared/ui/FilterChip';

function ContentTabs({ value, onChange, tabs = [] }) {
  return (
    <div className="bb-client-content-tabs" role="tablist" aria-label="Find sections">
      {tabs.map(({ id, label }) => {
        const active = value === id;
        return (
          <FilterChip
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            selected={active}
            className={`bb-client-content-tab${active ? ' is-active' : ''}`}
            onClick={() => onChange?.(id)}
          >
            <span>{label}</span>
          </FilterChip>
        );
      })}
    </div>
  );
}

/**
 * Content tabs (Posts / Films / …) sit horizontally above the stage on all breakpoints.
 */
export function ClientDeskLayout({
  className = '',
  contentTab = '',
  onContentTabChange = null,
  showContentTabs = false,
  contentTabs = null,
  children
}) {
  return (
    <div
      className={`bb-client-desk${showContentTabs ? ' has-tabs' : ''}${
        className ? ` ${className}` : ''
      }`}
    >
      {showContentTabs ? (
        <aside className="bb-client-desk-rail" aria-label="Content type">
          <ContentTabs
            value={contentTab}
            onChange={onContentTabChange}
            tabs={contentTabs || []}
          />
        </aside>
      ) : null}
      <div className="bb-client-desk-stage">{children}</div>
    </div>
  );
}
