import { useState } from 'react';
import { Bookmark, MapPin, Phone, Share2 } from 'lucide-react';
import { EditableImage, EditableText, EditSection } from './editable';
import { Button } from '../../../shared/ui/Button';
import { navigate } from '../../../app/routing';
import { useClientProfile } from '../../client-app/ClientProfileContext';
import { startClientMessage } from '../../client-app/startClientMessage';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { profileSignInPath } from '../../client-app/profileAuthReturn';

/** One identity for the public profile, discovery and the E-Business editor.
 * Keep the existing image/copy fields so published merchant content isn't lost.
 */
export function BusinessProfileHeader({ workspace, editMode, preview, patchWebsite, onUpdateProfile, onOpenTab }) {
  const website = workspace.website || {};
  const { profile, isPlaceSaved, togglePlaceSave } = useClientProfile();
  const { workspace: local, startThreadFromClient } = useWorkspace();
  const [messaging, setMessaging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const name = String(workspace.brandName || 'Your business').trim();
  const bio = website.homeSubtext || website.subcopy || workspace.tagline || '';
  const location = website.profileLocation || [website.city, website.region].filter(Boolean).join(', ');
  const category = website.profileCategory || '';
  const logo = website.logoUrl || workspace.logoUrl || '';
  const interactive = !preview && !editMode;

  const message = async () => {
    if (!profile?.email) { navigate(profileSignInPath(workspace.slug)); return; }
    if (messaging) return;
    setError('');
    setMessaging(true);
    try {
      await startClientMessage({
        profile, workspace, requireThread: true,
        // Local demo threads must never be used for a different real business.
        startThreadFromClient: workspace.isDemo && workspace.slug === local.slug ? startThreadFromClient : undefined
      });
    } catch {
      setError('Could not open the conversation. Please try again.');
    } finally { setMessaging(false); }
  };
  const save = async () => {
    if (!profile?.email) { navigate(profileSignInPath(workspace.slug)); return; }
    if (saving) return;
    setSaving(true);
    setError('');
    try { await togglePlaceSave(workspace.slug); }
    catch { setError('Could not save this business. Please try again.'); }
    finally { setSaving(false); }
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.replace(/#.*$/, `#/w/${encodeURIComponent(workspace.slug)}`));
      setCopied(true);
    } catch { setError('Could not copy the profile link. You can copy it from your browser address bar.'); }
  };

  return (
    <EditSection editMode={editMode} title="Business profile" sectionId="profile" className="bb-business-profile-identity">
      {<nav className="bb-business-profile-public-nav" aria-label="Business profile navigation">
        <Button action="back" variant="secondary" disabled={!interactive} onClick={() => navigate('/app/find')}>Back to Places</Button>
        <Button action="share" icon={Share2} variant="secondary" disabled={!interactive} onClick={share} aria-live="polite">{copied ? 'Link copied' : 'Share profile'}</Button>
      </nav>}
      {website.heroImageUrl || website.heroImage || editMode ? <div className="bb-business-profile-banner">
        <EditableImage editMode={editMode} src={website.heroImageUrl || website.heroImage || ''}
          alt={`${name} cover photo`} className="bb-business-profile-banner-media"
          preset="profileBanner" storageFolder="brand" placeholderLabel="Add cover photo" editLabel="Edit cover photo"
          onChange={(url) => patchWebsite({ heroImageUrl: url, heroImage: '' })} />
      </div> : null}
      <div className="bb-business-profile-details">
        <div className="bb-business-profile-photo">
          <EditableImage editMode={editMode} src={logo} alt={`${name} profile photo`}
            className="bb-business-profile-photo-media" preset="logo" storageFolder="brand" compact
            placeholderLabel="Add profile photo" editLabel="Edit profile photo" onChange={(url) => {
              onUpdateProfile?.({ logoUrl: url });
              patchWebsite({ logoUrl: url });
            }} />
        </div>
        <div className="bb-business-profile-copy">
          <EditableText as="h1" className="bb-business-profile-name" editMode={editMode}
            maxLength={60}
            value={name} placeholder="Business name" website={website} patchWebsite={patchWebsite}
            onChange={(value) => {
              const next = value.trim() || 'Your business';
              onUpdateProfile?.({ brandName: next });
            }} />
          {(category || location) ? <p className="bb-business-profile-meta">
            {category ? <span className="bb-profile-metadata-pill">{category}</span> : null}
            {location ? <span className="bb-profile-metadata-pill"><MapPin size={14} aria-hidden="true" />{location}</span> : null}
          </p> : null}
          <EditableText as="p" className="bb-business-profile-bio" editMode={editMode} multiline
            maxLength={200}
            value={bio} placeholder="A short introduction to your business" website={website}
            patchWebsite={patchWebsite}
            onChange={(value) => patchWebsite({ homeSubtext: value, subcopy: value })} />
          {editMode ? <p className="bb-business-profile-edit-note">Edit your name, introduction and photos here. Location and business category are managed in Business settings.</p> : null}
        </div>
        <div className="bb-business-profile-actions">
          {<>
            <Button action="chat" variant="secondary" disabled={!interactive} busy={messaging} onClick={message}>Message</Button>
            {workspace.email ? <Button as="a" action="email" variant="secondary" disabled={!interactive} href={`mailto:${workspace.email}`}>Email</Button> : null}
            {workspace.phone ? <Button as="a" icon={Phone} variant="secondary" disabled={!interactive} href={`tel:${workspace.phone}`}>Call</Button> : null}
            <Button action="save" icon={Bookmark} variant="secondary" className="bb-profile-bookmark" disabled={!interactive} busy={saving}
              selected={isPlaceSaved(workspace.slug)}
              aria-label={isPlaceSaved(workspace.slug) ? 'Unsave business' : 'Save business'}
              title={isPlaceSaved(workspace.slug) ? 'Unsave business' : 'Save business'}
              aria-pressed={isPlaceSaved(workspace.slug)} onClick={save}>
              {isPlaceSaved(workspace.slug) ? 'Saved' : 'Save'}
            </Button>
          </>}
        </div>
      </div>
      {error ? <p className="bb-business-profile-error" role="alert">{error}</p> : null}
    </EditSection>
  );
}
