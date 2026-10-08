import { useState } from 'react';
import { EditableText } from './editable';
import { OfferMarker } from './home-sections/WhatWeOfferSection';

export function ProfileWelcomeMarquee({ workspace, editMode, patchWebsite }) {
  const [picker, setPicker] = useState(null);
  const website = workspace.website || {};
  const enabled = website.welcomeMarqueeEnabled !== false;
  const text = website.welcomeMarqueeText ?? `Welcome to ${workspace.brandName || 'our business'} on Book & Buy. Stay connected, explore our products and services, and shop or book with ease. Keep everything organised in your client account.`;
  if (!enabled && !editMode) return null;
  const marker = (side) => website[`welcome${side}IconEnabled`] === false ? null : <OfferMarker
    reason={{ id: `welcome-${side}`, title: `${side.toLowerCase()} welcome icon`, icon: website[`welcome${side}Icon`] || 'sparkles' }}
    index={0} editMode={editMode} pickerOpen={picker === side}
    onTogglePicker={() => setPicker(picker === side ? null : side)}
    onSelectIcon={icon => { patchWebsite({ [`welcome${side}Icon`]: icon }); setPicker(null); }}
    onClosePicker={() => setPicker(null)} />;
  return <section className={`bb-profile-welcome bb-profile-welcome-static${editMode ? ' is-editing' : ''}`} aria-label="Business welcome">
    {editMode ? <div className="bb-profile-welcome-options">
      <label><input type="checkbox" checked={enabled} onChange={event => patchWebsite({ welcomeMarqueeEnabled: event.target.checked })} />Show welcome strip</label>
      {enabled ? ['Left', 'Right'].map(side => <label key={side}><input type="checkbox" checked={website[`welcome${side}IconEnabled`] !== false} onChange={event => patchWebsite({ [`welcome${side}IconEnabled`]: event.target.checked })} />{side} icon</label>) : null}
    </div> : null}
    {enabled ? <div className="bb-profile-welcome-content">
      <div className="bb-profile-welcome-side">{marker('Left')}</div>
      <EditableText as="p" editMode={editMode} multiline maxLength={320} value={text} placeholder="Welcome message" onChange={value => patchWebsite({ welcomeMarqueeText: value })} />
      <div className="bb-profile-welcome-side">{marker('Right')}</div>
    </div> : <p className="bb-profile-welcome-hidden">Welcome strip hidden from your public profile.</p>}
  </section>;
}
