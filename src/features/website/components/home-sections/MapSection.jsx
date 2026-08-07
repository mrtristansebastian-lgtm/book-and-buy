import { EditableText, EditSection } from '../editable';

export function MapSection({ website, editMode, preview, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="Visit / Map"
      sectionId="map"
      hidden={hidden}
      coach="Paste a Google Maps embed URL."
      className="bb-public-home-block bb-public-map-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-visit">
          <div className="bb-public-visit-copy">
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              Find us
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-visit-title"
                editMode={editMode}
                value={website.mapTitle || 'Visit'}
                placeholder="Visit title"
                onChange={(value) => patchWebsite({ mapTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
            <EditableText
              as="p"
              className="bb-public-visit-body"
              editMode={editMode}
              multiline
              value={website.address || ''}
              placeholder="Street address"
              onChange={(value) => patchWebsite({ address: value })}
            />
            {editMode ? (
              <div className="bb-public-visit-fields">
                <label className="bb-public-visit-field">
                  Map embed URL
                  <input
                    className="native-control-input px-3 py-2 text-sm"
                    value={website.mapEmbedUrl || ''}
                    placeholder="https://maps.google.com/maps?...&output=embed"
                    onChange={(event) => patchWebsite({ mapEmbedUrl: event.target.value })}
                  />
                </label>
                <label className="bb-public-visit-field">
                  Google Place ID (optional)
                  <input
                    className="native-control-input px-3 py-2 text-sm"
                    value={website.googlePlaceId || ''}
                    placeholder="ChIJ…"
                    onChange={(event) => patchWebsite({ googlePlaceId: event.target.value })}
                  />
                </label>
              </div>
            ) : null}
            {website.mapLinkUrl || website.mapEmbedUrl ? (
              <a
                className="bb-ghost-btn"
                href={website.mapLinkUrl || website.mapEmbedUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (editMode || preview) event.preventDefault();
                }}
              >
                Open in Maps
              </a>
            ) : null}
          </div>
          <div className="bb-public-map-wrap">
            <span className="bb-public-map-frame-accent bb-public-native-fill" aria-hidden="true" />
            <div className="bb-public-map-frame">
              {website.mapEmbedUrl ? (
                <iframe
                  title="Map"
                  src={website.mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="bb-public-empty h-full grid place-items-center">
                  {editMode ? 'Add a Google Maps embed URL' : 'Map coming soon'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </EditSection>
  );
}
