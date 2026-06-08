import { ImagePlus, Images, MapPin, Monitor, Scissors, Trash2, Wand2 } from 'lucide-react';
import { GooglePlaceAutocompleteInput } from '../../maps/GooglePlaceAutocompleteInput';

const MediaPreview = ({ children, className = 'h-36 md:h-44' }) => (
  <div className={`${className} w-full overflow-hidden rounded-lg bg-transparent shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]`}>
    {children}
  </div>
);

const UploadButton = ({ children, multiple, onChange }) => (
  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-4 text-[10px] font-black uppercase text-white transition-colors hover:bg-neutral-800">
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
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-[10px] font-black uppercase shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)] transition-colors hover:text-black ${danger ? 'text-red-500' : 'text-black'}`}
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
  <section className="rounded-lg bg-white">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase text-neutral-400">Booking page media</p>
        <h4 className="mt-1 text-xl font-black text-black">Photos clients see while booking</h4>
      </div>
      <button
        type="button"
        onClick={onOpenStyleRoom}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-neutral-50 px-4 text-[10px] font-black uppercase text-black shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-colors hover:bg-neutral-100"
      >
        <Wand2 size={13} />
        Style room
      </button>
    </div>

    <div className="grid gap-4">
      <article className="rounded-lg bg-neutral-50/80 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <MediaPreview className="aspect-[16/7]">
            {settings.bannerImage ? (
              <img src={settings.bannerImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-center text-neutral-300">
                <span>
                  <Monitor size={22} className="mx-auto mb-2" />
                  <span className="text-[10px] font-black uppercase">Optional booking banner</span>
                </span>
              </div>
            )}
          </MediaPreview>
          <div className="min-w-0">
            <p className="text-sm font-black text-black">Booking banner</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-500">A short landscape image near the top of the public page.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <UploadButton onChange={(event) => {
                const file = event.target.files[0];
                onImageUpload('bannerImage', file, 'brand');
                event.target.value = '';
              }}>
                <ImagePlus size={13} />
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

      <article className="rounded-lg bg-neutral-50/80 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-black">Venue gallery</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-500">Add a few clean photos of the space, studio, or service environment.</p>
          </div>
          <UploadButton multiple onChange={(event) => {
            onVenuePhotoUpload(event.target.files);
            event.target.value = '';
          }}>
            <ImagePlus size={13} />
            Photos
          </UploadButton>
        </div>
        <div className="mb-4 grid gap-4 rounded-lg bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-black">
                <MapPin size={16} />
              </span>
              <span>
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">Venue address</span>
                <span className="mt-1 block text-xs font-bold text-neutral-500">{hasExactGooglePlace ? 'Exact Google place saved' : 'Manual address fallback'}</span>
              </span>
            </div>
            <GooglePlaceAutocompleteInput
              value={settings.address || ''}
              onValueChange={handleAddressChange}
              onPlaceSelect={handlePlaceSelect}
              onClear={handleLocationClear}
              className="w-full bg-transparent pr-9 text-sm font-bold text-black outline-none placeholder:text-neutral-300"
              placeholder="Search your venue address"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-black">Map and directions</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-500">Choose the exact place clients should see with these venue photos.</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-300">
              {hasExactGooglePlace ? 'Map embed enabled' : 'Falls back to address search'}
            </p>
          </div>
        </div>
        {venuePhotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {venuePhotos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
                <img src={photo} alt={`Venue photo ${index + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <button
                  type="button"
                  onClick={() => onRemoveVenuePhoto(photo)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-red-500 shadow-sm opacity-100 transition-opacity sm:opacity-0 group-hover:opacity-100"
                  aria-label={`Remove venue photo ${index + 1}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-28 place-items-center rounded-lg bg-white text-center text-neutral-400 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]">
            <span>
              <Images size={20} className="mx-auto mb-2 text-black" />
              <span className="text-xs font-bold">No venue photos yet</span>
            </span>
          </div>
        )}
      </article>
    </div>
  </section>
  );
};
