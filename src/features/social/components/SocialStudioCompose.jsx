import { useEffect, useId, useState } from 'react';
import { Clapperboard, ImagePlus, Plus, RectangleVertical, Type, X } from 'lucide-react';
import { EditableImage, EditableText } from '../../website/components/editable';
import { MAX_MEDIA } from '../utils/mediaIntake';
import {
  formatDurationLabel,
  POST_CLIP_MAX_SECONDS,
  VERTICAL_MAX_SECONDS
} from '../utils/socialPostType';

export const BLOG_CREATE_ACTIONS = [
  {
    id: 'posts',
    label: 'New post',
    hint: `Up to ${MAX_MEDIA} photos or clips to ${formatDurationLabel(POST_CLIP_MAX_SECONDS)}`,
    Icon: ImagePlus
  },
  {
    id: 'films',
    label: 'New Film',
    hint: 'Landscape · any length · pick a cover frame last',
    Icon: Clapperboard
  },
  {
    id: 'verticals',
    label: 'New Vertical',
    hint: `Portrait · up to ${formatDurationLabel(VERTICAL_MAX_SECONDS)} like Reels`,
    Icon: RectangleVertical
  },
  {
    id: 'text',
    label: 'New text update',
    hint: 'A quick note, no media needed',
    Icon: Type
  }
];

function CreateTypeModal({ open, onClose, onPick }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bb-social-create-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="bb-social-create-modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="bb-social-create-modal-panel">
        <header className="bb-social-create-modal-head">
          <div>
            <p className="bb-social-create-modal-eyebrow">Publish</p>
            <h2 id={titleId} className="bb-social-create-modal-title">
              What do you want to post?
            </h2>
          </div>
          <button
            type="button"
            className="bb-social-create-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>
        <div className="bb-social-create-modal-actions">
          {BLOG_CREATE_ACTIONS.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              type="button"
              className="bb-social-create-modal-btn"
              onClick={() => {
                onPick?.(id);
                onClose?.();
              }}
            >
              <span className="bb-social-create-modal-btn-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="bb-social-create-modal-btn-copy">
                <strong>{label}</strong>
                <span>{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Live Social profile chrome for Studio — same layout as public, with Edit + Post.
 */
export function SocialStudioCompose({
  brandName = '',
  logoUrl = '',
  bannerUrl = '',
  bio = '',
  category = '',
  location = '',
  onUpdateWebsite,
  onUpdateProfile,
  onOpenCreate
}) {
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const displayName = brandName.trim() || 'Business';
  const initial = displayName.charAt(0).toUpperCase() || 'B';
  const showCategory = editMode || Boolean(category);
  const showLocation = editMode || Boolean(location);
  const showMeta = showCategory || showLocation;
  const showBio = editMode || Boolean(String(bio || '').trim());

  return (
    <>
      <section
        className="bb-public-profile-identity bb-social-studio-profile"
        aria-label="Social profile"
      >
        <div className="bb-public-profile-shell">
          <div className="bb-public-profile-banner-wrap">
            <EditableImage
              editMode={editMode}
              src={bannerUrl}
              className="bb-public-profile-banner"
              imgClassName="bb-public-profile-banner-img"
              storageFolder="social"
              preset="socialBanner"
              onChange={(url) => onUpdateWebsite?.({ socialBannerUrl: url })}
              placeholderLabel={editMode ? 'Add banner' : ''}
            />
          </div>

          <div className="bb-public-profile-card">
            <div className="bb-public-profile-avatar-ring">
              <div className="bb-public-profile-avatar-wrap">
                <EditableImage
                  editMode={editMode}
                  src={logoUrl}
                  className="bb-public-profile-avatar"
                  imgClassName="bb-public-profile-avatar-img"
                  storageFolder="brand"
                  preset="logo"
                  onChange={(url) => onUpdateWebsite?.({ logoUrl: url })}
                  placeholderLabel={initial}
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
                  onUpdateWebsite?.({ homeHeadline: next, headline: next });
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
                        onChange={(value) => onUpdateWebsite?.({ profileCategory: value })}
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
                        value={location}
                        placeholder="Location"
                        onChange={(value) => onUpdateWebsite?.({ profileLocation: value })}
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
                    onUpdateWebsite?.({
                      homeSubtext: value,
                      subcopy: value,
                      socialSubtext: value
                    })
                  }
                />
              ) : null}
            </div>

            <div className="bb-public-profile-aside bb-social-studio-profile-aside">
              <button
                type="button"
                className={`bb-ghost-btn bb-public-profile-action bb-public-profile-action--compact${
                  editMode ? ' is-active' : ''
                }`}
                onClick={() => setEditMode((prev) => !prev)}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
              <button
                type="button"
                className="bb-primary-btn bb-public-profile-action bb-public-profile-action--compact bb-social-studio-profile-post"
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={15} strokeWidth={2.4} />
                Post
              </button>
            </div>
          </div>
        </div>
      </section>

      <CreateTypeModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onOpenCreate}
      />
    </>
  );
}
