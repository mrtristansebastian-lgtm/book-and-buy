import { Images, MapPin, Monitor, Plus, Scissors, Trash2, Wand2 } from 'lucide-react';
import { GooglePlaceAutocompleteInput } from '../../maps/GooglePlaceAutocompleteInput';

const MediaPreview = ({ children, className = 'h-36 md:h-44' }) => (
  <div className={`business-media-preview ${className}`}>
    {children}
  </div>
);

const UploadButton = ({ children, multiple, onChange }) => (
  <label className="business-primary-button">
    <Plus size={14} strokeWidth={3} />
    {children}
    <input
      type="file"
      accept="image/*"
      multiple={multiple}
      className="hidden"
      onChange={onChange}
    />
  </label>
);

const MediaActionButton = ({ children, danger, icon, onClick }) => {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`business-secondary-button ${danger ? 'is-danger' : ''}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
};

export const ProfileBusinessMediaSection = ({
  onImageCrop,
  onImageRemove,
  onImageUpload,
  onOpenStyleRoom,
  onRemoveVenuePhoto,
  onSettingChange,
  onVenuePhotoUpload,
  settings,
  venuePhotos
}) => {
  const hasExactGooglePlace = settings.mapPlace?.placeId || settings.mapPlace?.lat != null;

  const handleAddressChange = (value) => {
    onSettingChange('address', value);
    if (settings.mapPlace) onSettingChange('mapPlace', null);
  };

  const handlePlaceSelect = (mapPlace) => {
    const readableAddress = mapPlace?.formattedAddress || mapPlace?.displayName || settings.address || '';
    onSettingChange('address', readableAddress);
    onSettingChange('mapPlace', mapPlace);
  };

  const handleLocationClear = () => {
    onSettingChange('address', '');
    onSettingChange('mapPlace', null);
  };

  return (
  <section className="business-settings-panel business-media-panel">
    <div className="business-settings-group">
      <div className="business-pane-actions">
        <button
          type="button"
          onClick={onOpenStyleRoom}
          className="business-secondary-button business-style-room-button"
        >
          <Wand2 size={13} />
          Style room
        </button>
      </div>
      <article className="business-media-card business-banner-card">
        <div className="business-media-card-grid">
          <MediaPreview className="aspect-[16/5]">
            {settings.bannerImage ? (
              <img src={settings.bannerImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="business-media-empty">
                <span>
                  <Monitor size={22} className="mx-auto mb-2" />
                  <span>Optional booking banner</span>
                </span>
              </div>
            )}
          </MediaPreview>
          <div className="business-media-copy">
            <p>Booking banner</p>
            <small>A short landscape image near the top of the public page.</small>
            <div className="business-button-row">
              <UploadButton onChange={(event) => {
                const file = event.target.files[0];
                onImageUpload('bannerImage', file, 'brand');
                event.target.value = '';
              }}>
                Upload
              </UploadButton>
              {settings.bannerImage && (
                <>
                  <MediaActionButton icon={Scissors} onClick={() => onImageCrop('bannerImage', 'brand')}>Crop</MediaActionButton>
                  <MediaActionButton danger icon={Trash2} onClick={() => onImageRemove('bannerImage')}>Remove</MediaActionButton>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      <article className="business-media-card">
        <div className="business-gallery-head">
          <div>
            <p>Venue gallery</p>
            <small>Add a few clean photos of the space, studio, or service environment.</small>
          </div>
          <UploadButton multiple onChange={(event) => {
            onVenuePhotoUpload(event.target.files);
            event.target.value = '';
          }}>
            Photos
          </UploadButton>
        </div>
        <div className="business-location-card">
          <div className="business-location-input">
            <div className="business-location-title">
              <span className="business-settings-row-icon">
                <MapPin size={16} />
              </span>
              <span className="business-location-copy">
                <span>Venue address</span>
                <small>{hasExactGooglePlace ? 'Exact Google place saved' : 'Manual address fallback'}</small>
              </span>
            </div>
            <GooglePlaceAutocompleteInput
              value={settings.address || ''}
              onValueChange={handleAddressChange}
              onPlaceSelect={handlePlaceSelect}
              onClear={handleLocationClear}
              className="business-location-field"
              placeholder="Search your venue address"
            />
          </div>
          <div className="business-location-note">
            <p>Map and directions</p>
            <small>Choose the exact place clients should see with these venue photos.</small>
            <strong>
              {hasExactGooglePlace ? 'Map embed enabled' : 'Falls back to address search'}
            </strong>
          </div>
        </div>
        {venuePhotos.length > 0 ? (
          <div className="business-venue-grid">
            {venuePhotos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="business-venue-photo group">
                <img src={photo} alt={`Venue photo ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <button
                  type="button"
                  onClick={() => onRemoveVenuePhoto(photo)}
                  className="business-venue-remove"
                  aria-label={`Remove venue photo ${index + 1}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="business-empty-gallery">
            <span>
              <Images size={20} />
              <strong>No venue photos yet</strong>
            </span>
          </div>
        )}
      </article>
    </div>
  </section>
  );
};
