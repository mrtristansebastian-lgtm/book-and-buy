import { EditableText, EditableImage, EditSection } from '../editable';

function messageHref(workspace) {
  const email = String(workspace.email || '').trim();
  if (email) return `mailto:${email}`;
  const phone = String(workspace.phone || '').replace(/[^\d+]/g, '');
  if (phone) return `tel:${phone}`;
  return '';
}

export function ProfileIdentitySection({
  workspace,
  website,
  editMode,
  preview,
  patchWebsite,
  onUpdateProfile
}) {
  const displayName = String(workspace.brandName || 'Business').trim() || 'Business';
  const bio =
    website.homeSubtext ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const category = String(website.profileCategory || '').trim();
  const location = String(
    website.profileLocation || website.address || ''
  ).trim();
  const logoSrc = website.logoUrl || '';
  const contactHref = messageHref(workspace);
  const showMessage = Boolean(contactHref) || editMode;
  const showCategory = editMode || Boolean(category);
  const showLocation = editMode || Boolean(location);
  const showMeta = showCategory || showLocation;
  const showBio = editMode || Boolean(String(bio || '').trim());

  const openMessage = () => {
    if (preview || editMode || !contactHref) return;
    window.location.href = contactHref;
  };

  return (
    <EditSection
      editMode={editMode}
      title="Profile"
      sectionId="identity"
      coach="Banner, avatar, business name, category, location, bio, and Message."
      className="bb-public-profile-identity"
    >
      <div className="bb-public-profile-shell">
        <div className="bb-public-profile-banner-wrap">
          <EditableImage
            editMode={editMode}
            src={website.socialBannerUrl || ''}
            className="bb-public-profile-banner"
            imgClassName="bb-public-profile-banner-img"
            storageFolder="social"
            preset="socialBanner"
            onChange={(url) => patchWebsite({ socialBannerUrl: url })}
            placeholderLabel={editMode ? 'Add banner' : ''}
          />
        </div>

        <div className="bb-public-profile-card">
          <div className="bb-public-profile-avatar-ring">
            <div className="bb-public-profile-avatar-wrap">
              <EditableImage
                editMode={editMode}
                src={logoSrc}
                className="bb-public-profile-avatar"
                imgClassName="bb-public-profile-avatar-img"
                storageFolder="brand"
                preset="logo"
                onChange={(url) => patchWebsite({ logoUrl: url })}
                placeholderLabel="Logo"
              />
            </div>
          </div>

          <div className="bb-public-profile-main">
            <EditableText
              as="h1"
              className="bb-public-profile-name"
              editMode={editMode}
              value={displayName}
              placeholder="Business name"
              onChange={(value) => {
                const next = String(value || '').trim() || 'Business';
                onUpdateProfile?.({ brandName: next });
                patchWebsite({ homeHeadline: next, headline: next });
              }}
            />

            {showMeta ? (
              <div className="bb-public-profile-meta">
                {showCategory ? (
                  <span className="bb-public-profile-chip bb-public-profile-chip--category">
                    <EditableText
                      as="span"
                      className="bb-public-profile-category"
                      editMode={editMode}
                      value={category}
                      placeholder="Category"
                      onChange={(value) => patchWebsite({ profileCategory: value })}
                    />
                  </span>
                ) : null}
                {showLocation ? (
                  <span className="bb-public-profile-chip bb-public-profile-chip--location">
                    <span className="bb-public-profile-chip-icon" aria-hidden="true" />
                    <EditableText
                      as="span"
                      className="bb-public-profile-location"
                      editMode={editMode}
                      value={
                        website.profileLocation ||
                        (editMode ? '' : location)
                      }
                      placeholder="Location"
                      onChange={(value) => patchWebsite({ profileLocation: value })}
                    />
                  </span>
                ) : null}
              </div>
            ) : null}

            {showBio ? (
              <EditableText
                as="p"
                className="bb-public-profile-bio"
                editMode={editMode}
                multiline
                value={bio}
                placeholder="Short bio"
                onChange={(value) =>
                  patchWebsite({ homeSubtext: value, subcopy: value, socialSubtext: value })
                }
              />
            ) : null}
          </div>

          {showMessage ? (
            <div className="bb-public-profile-aside">
              <button
                type="button"
                className="bb-ghost-btn bb-public-profile-action bb-public-profile-action--compact"
                disabled={editMode && !contactHref}
                title={
                  editMode && !contactHref
                    ? 'Add business email or phone in settings to enable Message'
                    : undefined
                }
                onClick={openMessage}
              >
                Message
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </EditSection>
  );
}
