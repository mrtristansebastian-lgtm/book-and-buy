import { SocialProfileTabs } from '../social/components/SocialProfileTabs';

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
          <SocialProfileTabs
            value={contentTab}
            onChange={onContentTabChange}
            tabs={contentTabs || undefined}
          />
        </aside>
      ) : null}
      <div className="bb-client-desk-stage">{children}</div>
    </div>
  );
}
