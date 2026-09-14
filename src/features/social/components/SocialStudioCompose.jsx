import { useEffect, useId, useState } from 'react';
import { Clapperboard, ImagePlus, PenLine, Plus, RectangleVertical, X } from 'lucide-react';
import { EditableImage } from '../../website/components/editable';
import { MAX_MEDIA } from '../utils/mediaIntake';
import {
  formatDurationLabel,
  POST_CLIP_MAX_SECONDS,
  VERTICAL_MAX_SECONDS
} from '../utils/socialPostType';
import {
  IG_NAME_MAX,
  IG_USERNAME_MAX,
  formatUsernameDisplay,
  sanitizeUsernameInput,
  validateInstagramName,
  validateInstagramUsername
} from '../utils/instagramUsername';

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
    label: 'New note',
    hint: 'A quick note, no media needed',
    Icon: PenLine
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

function ProfileEditModal({
  open,
  onClose,
  brandName,
  slug,
  logoUrl,
  bannerUrl,
  bio,
  category,
  location,
  onSave
}) {
  const titleId = useId();
  const [draftName, setDraftName] = useState('');
  const [draftUsername, setDraftUsername] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftLogo, setDraftLogo] = useState('');
  const [draftBanner, setDraftBanner] = useState('');
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    if (!open) return;
    const displayName = String(brandName || '').trim() || 'Business';
    setDraftName(displayName.slice(0, IG_NAME_MAX));
    setDraftUsername(formatUsernameDisplay(slug, displayName));
    setDraftBio(String(bio || ''));
    setDraftCategory(String(category || ''));
    setDraftLocation(String(location || ''));
    setDraftLogo(logoUrl || '');
    setDraftBanner(bannerUrl || '');
    setNameError('');
    setUsernameError('');
  }, [open, brandName, slug, bio, category, location, logoUrl, bannerUrl]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const initial = (draftName.trim().charAt(0) || 'B').toUpperCase();

  const save = () => {
    const nameResult = validateInstagramName(draftName);
    const userResult = validateInstagramUsername(draftUsername);
    setNameError(nameResult.ok ? '' : nameResult.error);
    setUsernameError(userResult.ok ? '' : userResult.error);
    if (!nameResult.ok || !userResult.ok) return;

    onSave?.({
      brandName: nameResult.value,
      slug: userResult.value,
      bio: draftBio.trim(),
      category: draftCategory.trim(),
      location: draftLocation.trim(),
      logoUrl: draftLogo,
      bannerUrl: draftBanner
    });
    onClose?.();
  };

  return (
    <div
      className="bb-social-profile-edit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="bb-social-profile-edit-modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="bb-social-profile-edit-modal-panel">
        <header className="bb-social-profile-edit-modal-head">
          <div>
            <p className="bb-social-profile-edit-modal-eyebrow">Social</p>
            <h2 id={titleId} className="bb-social-profile-edit-modal-title">
              Edit profile
            </h2>
          </div>
          <button
            type="button"
            className="bb-social-profile-edit-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="bb-social-profile-edit-modal-body">
          <section className="bb-social-profile-edit-section" aria-label="Photos">
            <div className="bb-social-profile-edit-media-stage">
              <EditableImage
                editMode
                src={draftBanner}
                className="bb-social-profile-edit-banner-frame"
                imgClassName="bb-social-profile-edit-banner-img"
                storageFolder="social"
                preset="socialBanner"
                onChange={setDraftBanner}
                placeholderLabel="Add banner"
              />
              <div className="bb-social-profile-edit-avatar-slot">
                <EditableImage
                  editMode
                  src={draftLogo}
                  className="bb-social-profile-edit-avatar-frame"
                  imgClassName="bb-social-profile-edit-avatar-img"
                  storageFolder="brand"
                  preset="logo"
                  onChange={setDraftLogo}
                  placeholderLabel={initial}
                />
              </div>
            </div>
            <p className="bb-social-profile-edit-media-hint">
              Tap the banner or photo to replace
            </p>
          </section>

          <section className="bb-social-profile-edit-section" aria-label="About">
            <h3 className="bb-social-profile-edit-section-title">About</h3>

            <label className="bb-social-profile-edit-field">
              <span className="bb-social-profile-edit-field-label">Name</span>
              <input
                className="bb-social-profile-edit-input"
                type="text"
                value={draftName}
                maxLength={IG_NAME_MAX}
                autoComplete="nickname"
                placeholder="Display name"
                aria-invalid={Boolean(nameError)}
                onChange={(event) => {
                  setDraftName(event.target.value.slice(0, IG_NAME_MAX));
                  setNameError('');
                }}
              />
              {nameError ? (
                <span className="bb-social-profile-edit-error">{nameError}</span>
              ) : (
                <span className="bb-social-profile-edit-hint">
                  {draftName.length}/{IG_NAME_MAX}
                </span>
              )}
            </label>

            <label className="bb-social-profile-edit-field">
              <span className="bb-social-profile-edit-field-label">Username</span>
              <span className="bb-social-profile-edit-username">
                <span className="bb-social-profile-edit-at" aria-hidden="true">
                  @
                </span>
                <input
                  className="bb-social-profile-edit-input bb-social-profile-edit-input--username"
                  type="text"
                  value={draftUsername}
                  maxLength={IG_USERNAME_MAX}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  placeholder="username"
                  aria-invalid={Boolean(usernameError)}
                  onChange={(event) => {
                    setDraftUsername(sanitizeUsernameInput(event.target.value));
                    setUsernameError('');
                  }}
                />
              </span>
              {usernameError ? (
                <span className="bb-social-profile-edit-error">{usernameError}</span>
              ) : (
                <span className="bb-social-profile-edit-hint">
                  Letters, numbers, _ and . · {draftUsername.length}/{IG_USERNAME_MAX}
                </span>
              )}
            </label>

            <label className="bb-social-profile-edit-field">
              <span className="bb-social-profile-edit-field-label">Bio</span>
              <textarea
                className="bb-social-profile-edit-input bb-social-profile-edit-textarea"
                rows={3}
                value={draftBio}
                maxLength={150}
                placeholder="A short line about your business"
                onChange={(event) => setDraftBio(event.target.value.slice(0, 150))}
              />
              <span className="bb-social-profile-edit-hint">{draftBio.length}/150</span>
            </label>
          </section>

          <section className="bb-social-profile-edit-section" aria-label="Discoverability">
            <h3 className="bb-social-profile-edit-section-title">Discoverability</h3>
            <p className="bb-social-profile-edit-section-copy">
              Shown as chips under your name on the profile.
            </p>

            <div className="bb-social-profile-edit-field-row">
              <label className="bb-social-profile-edit-field">
                <span className="bb-social-profile-edit-field-label">Category</span>
                <input
                  className="bb-social-profile-edit-input"
                  type="text"
                  value={draftCategory}
                  maxLength={40}
                  placeholder="e.g. Bakery"
                  onChange={(event) => setDraftCategory(event.target.value.slice(0, 40))}
                />
              </label>

              <label className="bb-social-profile-edit-field">
                <span className="bb-social-profile-edit-field-label">Location</span>
                <input
                  className="bb-social-profile-edit-input"
                  type="text"
                  value={draftLocation}
                  maxLength={60}
                  placeholder="e.g. Cape Town"
                  onChange={(event) => setDraftLocation(event.target.value.slice(0, 60))}
                />
              </label>
            </div>
          </section>
        </div>

        <footer className="bb-social-profile-edit-modal-footer">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="bb-primary-btn" onClick={save}>
            Save changes
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Live Social profile chrome for Studio — same layout as public, with Edit + Post.
 */
export function SocialStudioCompose({
  brandName = '',
  slug = '',
  logoUrl = '',
  bannerUrl = '',
  bio = '',
  category = '',
  location = '',
  onUpdateWebsite,
  onUpdateProfile,
  onOpenCreate
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const displayName = brandName.trim() || 'Business';
  const username = formatUsernameDisplay(slug, displayName);
  const initial = displayName.charAt(0).toUpperCase() || 'B';
  const showCategory = Boolean(category);
  const showLocation = Boolean(location);
  const showMeta = showCategory || showLocation;
  const showBio = Boolean(String(bio || '').trim());

  const saveProfile = ({
    brandName: nextName,
    slug: nextSlug,
    bio: nextBio,
    category: nextCategory,
    location: nextLocation,
    logoUrl: nextLogo,
    bannerUrl: nextBanner
  }) => {
    onUpdateProfile?.({ brandName: nextName, slug: nextSlug });
    onUpdateWebsite?.({
      homeHeadline: nextName,
      headline: nextName,
      homeSubtext: nextBio,
      subcopy: nextBio,
      socialSubtext: nextBio,
      profileCategory: nextCategory,
      profileLocation: nextLocation,
      logoUrl: nextLogo,
      socialBannerUrl: nextBanner
    });
  };

  return (
    <>
      <section
        className="bb-public-profile-identity bb-social-studio-profile"
        aria-label="Social profile"
      >
        <div className="bb-public-profile-shell">
          <div className="bb-public-profile-banner-wrap">
            {bannerUrl ? (
              <div className="bb-public-profile-banner">
                <img src={bannerUrl} alt="" className="bb-public-profile-banner-img" />
              </div>
            ) : null}
          </div>

          <div className="bb-public-profile-card">
            <div className="bb-public-profile-avatar-ring">
              <div className="bb-public-profile-avatar-wrap">
                <div className="bb-public-profile-avatar">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="bb-public-profile-avatar-img" />
                  ) : (
                    <span aria-hidden="true">{initial}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bb-public-profile-main">
              <h1 className="bb-public-profile-name">{displayName}</h1>
              <p className="bb-public-profile-username">@{username}</p>

              {showMeta ? (
                <div className="bb-public-profile-meta">
                  {showCategory ? (
                    <span className="bb-public-profile-chip bb-public-profile-chip--category">
                      <span className="bb-public-profile-category">{category}</span>
                    </span>
                  ) : null}
                  {showLocation ? (
                    <span className="bb-public-profile-chip bb-public-profile-chip--location">
                      <span className="bb-public-profile-chip-icon" aria-hidden="true" />
                      <span className="bb-public-profile-location">{location}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showBio ? <p className="bb-public-profile-bio">{bio}</p> : null}
            </div>

            <div className="bb-public-profile-aside bb-social-studio-profile-aside">
              <button
                type="button"
                className="bb-ghost-btn bb-public-profile-action bb-public-profile-action--compact"
                onClick={() => setEditOpen(true)}
              >
                Edit
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

      <ProfileEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        brandName={brandName}
        slug={slug}
        logoUrl={logoUrl}
        bannerUrl={bannerUrl}
        bio={bio}
        category={category}
        location={location}
        onSave={saveProfile}
      />

      <CreateTypeModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onOpenCreate}
      />
    </>
  );
}
