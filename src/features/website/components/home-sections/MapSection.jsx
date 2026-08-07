import { EditableText, EditSection } from '../editable';

export function MapSection({ website, editMode, preview, hidden, patchWebsite }) {
  return (
    <EditSection
      editMode={editMode}
      title="Visit / Map"
      sectionId="map"
      hidden={hidden}
      coach="Paste a Google Maps embed URL."
      className="bb-public-home-block bb-public-gutter bb-public-home-block--soft"
    >
      <div className="bb-public-measure bb-public-visit">
        <div className="bb-public-visit-copy grid gap-3 content-start">
          <h2 className="bb-page-title text-3xl m-0">Visit</h2>
          <EditableText
            as="p"
            className="bb-public-lede m-0"
            editMode={editMode}
            multiline
            value={website.address || ''}
            placeholder="Street address"
            onChange={(value) => patchWebsite({ address: value })}
          />
          {editMode ? (
            <div className="grid gap-3 max-w-xl">
              <label className="grid gap-1 text-xs font-semibold">
                Map embed URL
                <input
                  className="native-control-input px-3 py-2 text-sm"
                  value={website.mapEmbedUrl || ''}
                  placeholder="https://maps.google.com/maps?...&output=embed"
                  onChange={(event) => patchWebsite({ mapEmbedUrl: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold">
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
              className="bb-ghost-btn justify-self-start"
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
    </EditSection>
  );
}
