import { SocialProfileTabs } from '../social/components/SocialProfileTabs';

/**
 * PC desk: optional vertical content tabs + stage (no profile column).
 * Mobile: tabs sit above stage.
 */
export function ClientDeskLayout({
  className = '',
  contentTab = '',
  onContentTabChange = null,
  showContentTabs = false,
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
          <SocialProfileTabs value={contentTab} onChange={onContentTabChange} />
        </aside>
      ) : null}
      <div className="bb-client-desk-stage">{children}</div>
    </div>
  );
}
