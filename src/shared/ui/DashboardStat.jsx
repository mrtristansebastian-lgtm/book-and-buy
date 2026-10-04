import { useId } from 'react';

/** A value-first readout with purpose-specific hierarchy, not a new control. */
export function DashboardStat({
  as: Element = 'article', label, value, note, className = '', titleTag: Label = 'p',
  labelId, appearance = 'standard', valueProps = {}, noteHidden = false, children, ...props
}) {
  const generatedId = useId();
  const resolvedLabelId = labelId || `${generatedId}-label`;
  const valueId = `${generatedId}-value`;
  const noteId = `${generatedId}-note`;
  const resolvedAppearance = ['operational', 'primary', 'insight', 'supporting'].includes(appearance) ? appearance : 'standard';
  return (
    <Element
      {...props}
      type={Element === 'button' ? props.type || 'button' : props.type}
      className={`bb-dashboard-stat ${className}`.trim()}
      data-appearance={resolvedAppearance}
      aria-labelledby={props['aria-labelledby'] || (Element === 'button' ? `${valueId} ${resolvedLabelId}` : resolvedLabelId)}
      aria-describedby={props['aria-describedby'] || (note ? noteId : undefined)}
    >
      <span id={valueId} {...valueProps} className={`bb-dashboard-stat-value ${valueProps.className || ''}`.trim()}>{value}</span>
      <Label id={resolvedLabelId} className="bb-dashboard-stat-label">{label}</Label>
      {note ? <span id={noteId} className={`bb-dashboard-stat-note${noteHidden ? ' bb-control-sr-only' : ''}`}>{note}</span> : null}
      {children}
    </Element>
  );
}
