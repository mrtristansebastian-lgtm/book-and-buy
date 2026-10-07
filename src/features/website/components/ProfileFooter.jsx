import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { EditableText } from './editable';

export const PROFILE_SOCIALS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'X'];
const policies = [['cancellation', 'Cancellation policy'], ['terms', 'Terms of service'], ['privacy', 'Privacy policy']];
function socialUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function ProfileFooter({ workspace, preview, editMode, patchWebsite }) {
  const [policy, setPolicy] = useState(null);
  const close = useCallback(() => setPolicy(null), []);
  const dialogRef = useDetailDialog(Boolean(policy), close);
  const socials = PROFILE_SOCIALS.map(label => [label, socialUrl(workspace.website?.socialLinks?.[label.toLowerCase()])]).filter(([, url]) => url);
  return <>
    <footer className="bb-profile-footer">
      <section><h2>Get in touch</h2><p>{workspace.brandName}</p>
        {workspace.phone ? <a href={preview || editMode ? undefined : `tel:${workspace.phone}`}>{workspace.phone}</a> : null}
        {workspace.email ? <a href={preview || editMode ? undefined : `mailto:${workspace.email}`}>{workspace.email}</a> : null}
      </section>
      <section><h2>Client policies</h2>{policies.map(([key, label]) => <a key={key} href={`#policy-${key}`} onClick={event => { event.preventDefault(); setPolicy([key, label]); }}>{label}</a>)}</section>
      <section><h2>Follow us</h2>{editMode ? PROFILE_SOCIALS.map(label => <div className="bb-profile-social-edit" key={label}>
        <span>{label}</span><EditableText as="p" editMode maxLength={2048} value={workspace.website?.socialLinks?.[label.toLowerCase()] || ''}
          placeholder="Add link" ariaLabel={`${label} link`} onChange={value => patchWebsite?.({ socialLinks: { ...workspace.website?.socialLinks, [label.toLowerCase()]: value } })} />
      </div>) : socials.length ? socials.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}</a>) : <p>Social links coming soon.</p>}</section>
    </footer>
    {policy && typeof document !== 'undefined' ? createPortal(<div className="bb-business-photo-overlay">
      <div className="bb-business-photo-backdrop" onClick={close} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={policy[1]} className="bb-profile-policy-dialog">
        <header><h2>{policy[1]}</h2><button type="button" onClick={close}>Close</button></header>
        <p>{workspace.policies?.[policy[0]]?.trim() || 'This business has not added this policy yet. Please contact them for details.'}</p>
      </section>
    </div>, document.body) : null}
  </>;
}
