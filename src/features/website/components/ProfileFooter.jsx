import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { EditableText } from './editable';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';

export const PROFILE_SOCIALS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'X'];
const policies = [['cancellation', 'Cancellation policy'], ['terms', 'Terms of service'], ['privacy', 'Privacy policy']];
function socialUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function ProfileFooter({ workspace, preview, editMode, patchWebsite, asPage = false }) {
  const [policy, setPolicy] = useState(null);
  const close = useCallback(() => setPolicy(null), []);
  const dialogRef = useDetailDialog(Boolean(policy), close);
  const socials = PROFILE_SOCIALS.map(label => [label, socialUrl(workspace.website?.socialLinks?.[label.toLowerCase()])]).filter(([, url]) => url);
  const contactMethods = [
    workspace.phone && { label: 'Call us', value: workspace.phone, href: `tel:${workspace.phone}`, Icon: Phone },
    workspace.email && { label: 'Email us', value: workspace.email, href: `mailto:${workspace.email}`, Icon: Mail }
  ].filter(Boolean);
  return <>
    {asPage ? <section className="bb-profile-contact-page" aria-label="Contact">
      <div className="bb-profile-contact-main">
        <header className="bb-profile-contact-intro bb-profile-page-intro">
          <h2>Get in touch</h2>
          <p>Reach {workspace.brandName} directly.</p>
        </header>
        <div className="bb-profile-contact-methods">
          {contactMethods.map(({ label, value, href, Icon }) => <a key={label} className="bb-profile-contact-method"
            href={preview ? undefined : href} aria-disabled={preview || undefined} tabIndex={preview ? -1 : undefined}>
            <span className="bb-profile-contact-method-icon"><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className="bb-profile-contact-method-copy"><span>{label}</span><strong>{value}</strong></span>
            <ArrowUpRight size={18} strokeWidth={1.6} aria-hidden="true" />
          </a>)}
          {!contactMethods.length && <p className="bb-profile-contact-note">This business has not added contact details yet.</p>}
        </div>
      </div>
      <div className="bb-profile-contact-details">
        {(socials.length > 0 || editMode) && <section className="bb-profile-contact-panel">
          <h3>Find us online</h3>
          <div className="bb-profile-contact-links">{editMode ? PROFILE_SOCIALS.map(label => <div key={label} className="bb-profile-social-edit"><span>{label}</span><EditableText as="p" editMode maxLength={2048} value={workspace.website?.socialLinks?.[label.toLowerCase()] || ''} placeholder="Add link" ariaLabel={`${label} link`} onChange={value => patchWebsite?.({ socialLinks: { ...workspace.website?.socialLinks, [label.toLowerCase()]: value } })} /></div>) : socials.map(([label, url]) => <a key={label} href={url}
            target="_blank" rel="noopener noreferrer"><span>{label}</span><ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" /></a>)}</div>
        </section>}
      </div>
    </section> : <footer className="bb-profile-footer">
      <section><h2>Get in touch</h2><p>{workspace.brandName}</p>
        {workspace.phone ? <a href={preview || editMode ? undefined : `tel:${workspace.phone}`}>{workspace.phone}</a> : null}
        {workspace.email ? <a href={preview || editMode ? undefined : `mailto:${workspace.email}`}>{workspace.email}</a> : null}
      </section>
      <section><h2>Client policies</h2>{policies.map(([key, label]) => <a key={key} href={`#policy-${key}`} onClick={event => { event.preventDefault(); setPolicy([key, label]); }}>{label}</a>)}</section>
      <section><h2>Follow us</h2>{editMode ? PROFILE_SOCIALS.map(label => <div className="bb-profile-social-edit" key={label}>
        <span>{label}</span><EditableText as="p" editMode maxLength={2048} value={workspace.website?.socialLinks?.[label.toLowerCase()] || ''}
          placeholder="Add link" ariaLabel={`${label} link`} onChange={value => patchWebsite?.({ socialLinks: { ...workspace.website?.socialLinks, [label.toLowerCase()]: value } })} />
      </div>) : socials.length ? socials.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}</a>) : <p>Social links coming soon.</p>}</section>
    </footer>}
    {policy && typeof document !== 'undefined' ? createPortal(<div className="bb-business-photo-overlay">
      <div className="bb-business-photo-backdrop" onClick={close} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={policy[1]} className="bb-profile-policy-dialog">
        <header><h2>{policy[1]}</h2><button type="button" onClick={close}>Close</button></header>
        <p>{workspace.policies?.[policy[0]]?.trim() || 'This business has not added this policy yet. Please contact them for details.'}</p>
      </section>
    </div>, document.body) : null}
  </>;
}
