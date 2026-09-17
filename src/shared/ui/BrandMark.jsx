import { APP_LOGO_URL, APP_NAME } from '../../config/appConfig';

/**
 * Product wordmark + mark for Book and Buy chrome (welcome, auth, shells).
 * Not for tenant/business logos on public surfaces.
 */
export function BrandMark({
  size = 'md',
  showWordmark = true,
  wordmark = APP_NAME,
  className = '',
  as: Tag = 'div',
  ...rest
}) {
  const labelled = rest['aria-hidden'] == null || rest['aria-hidden'] === false;
  return (
    <Tag
      className={`bb-brand-lockup bb-brand-lockup--${size}${showWordmark ? '' : ' bb-brand-lockup--mark-only'} ${className}`.trim()}
      {...(labelled ? { 'aria-label': APP_NAME } : {})}
      {...rest}
    >
      <img
        className="bb-brand-lockup-mark"
        src={APP_LOGO_URL}
        alt=""
        width={120}
        height={204}
        decoding="async"
        aria-hidden="true"
      />
      {showWordmark ? <span className="bb-brand-lockup-word">{wordmark}</span> : null}
    </Tag>
  );
}
