import { EditableText, EditableImage, EditSection } from '../editable';
import { sectionLayoutClass } from './sectionLayout';

export function VenueSection({
  website,
  venueImages,
  editMode,
  layout,
  onCycleLayout,
  hidden,
  patchVenue,
  patchWebsite
}) {
  const gridClass =
    layout === 1
      ? 'bb-public-venue-grid bb-public-venue-grid--mosaic'
      : layout === 2
        ? 'bb-public-venue-grid bb-public-venue-grid--strip'
        : 'bb-public-venue-grid';

  return (
    <EditSection
      editMode={editMode}
      title="Venue"
      sectionId="venue"
      layout={layout}
      onCycleLayout={onCycleLayout}
      hidden={hidden}
      coach="Add 2–4 venue photos."
      className={`bb-public-home-block bb-public-gutter ${sectionLayoutClass(layout)}`}
    >
      <div key={layout} className="bb-sec-layout-stage bb-public-measure grid gap-5">
        <EditableText
          as="h2"
          className="bb-page-title text-3xl md:text-4xl m-0"
          editMode={editMode}
          value={website.venueTitle || 'Our space'}
          placeholder="Venue title"
          onChange={(value) => patchWebsite({ venueTitle: value })}
        />
        <div className={gridClass}>
          {venueImages.length === 0 && editMode ? (
            <p className="bb-edit-section-coach m-0">Add a venue photo to show your space.</p>
          ) : null}
          {venueImages.map((image, index) => (
            <figure
              key={image.id}
              className={`bb-public-venue-card${index === 0 && layout === 1 ? ' is-feature' : ''}`}
            >
              <EditableImage
                editMode={editMode}
                src={image.url || ''}
                className="bb-public-venue-media"
                imgClassName="w-full h-full object-cover"
                storageFolder="venue"
                onChange={(url) => patchVenue(image.id, 'url', url)}
              />
              <figcaption>
                <EditableText
                  as="span"
                  editMode={editMode}
                  value={image.caption || ''}
                  placeholder="Caption"
                  onChange={(value) => patchVenue(image.id, 'caption', value)}
                />
              </figcaption>
            </figure>
          ))}
        </div>
        {editMode && venueImages.length < 4 ? (
          <button
            type="button"
            className="bb-ghost-btn justify-self-start"
            onClick={() =>
              patchWebsite({
                venueImages: [...venueImages, { id: `v-${Date.now()}`, url: '', caption: '' }]
              })
            }
          >
            Add venue photo
          </button>
        ) : null}
      </div>
    </EditSection>
  );
}
