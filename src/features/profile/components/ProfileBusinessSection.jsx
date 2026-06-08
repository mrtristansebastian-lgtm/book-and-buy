import { ProfileBusinessIdentitySection } from './ProfileBusinessIdentitySection';
import { ProfileBusinessMediaSection } from './ProfileBusinessMediaSection';
import { ProfileBusinessSocialSection } from './ProfileBusinessSocialSection';

export const ProfileBusinessSection = ({
  activeProfileSection,
  onCopyReferral,
  onImageCrop,
  onImageRemove,
  onImageUpload,
  onOpenStyleRoom,
  onRemoveVenuePhoto,
  onSaveProfile,
  onSettingChange,
  onVenuePhotoUpload,
  referralUrl,
  settings,
  venuePhotos
}) => (
  <div data-tour="profile-business-info" className={`profile-section profile-section-business ${activeProfileSection === 'business' ? 'block' : 'hidden'} bg-white p-5 sm:p-6 md:p-8 rounded-lg`}>
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
      <div>
        <p className="text-[10px] font-bold uppercase text-neutral-300 mb-3">Business profile</p>
        <h3 className="text-2xl md:text-3xl font-black text-black">Business details</h3>
      </div>
      <p className="text-sm text-neutral-500 max-w-md">Set up the public booking identity, media, client trust copy, and links in one clean flow.</p>
    </div>
    <div className="space-y-5">
      <ProfileBusinessIdentitySection
        onImageCrop={onImageCrop}
        onImageRemove={onImageRemove}
        onImageUpload={onImageUpload}
        onSettingChange={onSettingChange}
        settings={settings}
      />
      <ProfileBusinessMediaSection
        onImageCrop={onImageCrop}
        onImageRemove={onImageRemove}
        onImageUpload={onImageUpload}
        onOpenStyleRoom={onOpenStyleRoom}
        onRemoveVenuePhoto={onRemoveVenuePhoto}
        onSettingChange={onSettingChange}
        onVenuePhotoUpload={onVenuePhotoUpload}
        settings={settings}
        venuePhotos={venuePhotos}
      />
      <ProfileBusinessSocialSection
        onCopyReferral={onCopyReferral}
        onSaveProfile={onSaveProfile}
        onSettingChange={onSettingChange}
        referralUrl={referralUrl}
        settings={settings}
      />
    </div>
  </div>
);
