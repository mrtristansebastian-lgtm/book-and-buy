import { Button } from '../../../../shared/ui/Button';
import { EditableText, EditSection } from '../editable';
import { MapPin, Phone, Mail, ArrowUpRight } from 'lucide-react';
import { publicBranches } from '../../../../../functions/branchesDomain.js';
import './public-branches.css';

function directionsLink(branch) {
  if (branch.mapLinkUrl) { try { const url = new URL(branch.mapLinkUrl); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch { /* Use the address link below. */ } }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address || branch.name || '')}${branch.googlePlaceId ? `&query_place_id=${encodeURIComponent(branch.googlePlaceId)}` : ''}`;
}

export function MapSection({ website, editMode, preview = false, hidden, patchWebsite }) {
  const branches = publicBranches(website.branches);
  const hasLocation = [website.address, website.mapBody, website.mapLinkUrl, website.mapEmbedUrl]
    .some((value) => String(value || '').trim()) || branches.length > 0;

  if (!editMode && !hasLocation) return null;

  return (
    <EditSection
      editMode={editMode}
      title="Location"
      sectionId="map"
      hidden={hidden}
      coach="Paste a Google Maps embed URL."
      className="bb-public-home-block bb-public-map-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-visit">
          <div className="bb-public-visit-copy">
            <header className="bb-public-profile-section-head">
              <EditableText
                as="h2"
                className="bb-public-profile-heading bb-public-visit-title"
                editMode={editMode}
                value={website.mapTitle || 'Visit'}
                placeholder="Visit"
                website={website}
                patchWebsite={patchWebsite}
                onChange={(value) => patchWebsite({ mapTitle: value })}
              />
              {editMode || String(website.mapBody || '').trim() ? (
                <EditableText
                  as="p"
                  className="bb-public-profile-section-body"
                  editMode={editMode}
                  multiline
                  value={website.mapBody || ''}
                  placeholder="Short venue intro"
                  website={website}
                  patchWebsite={patchWebsite}
                  onChange={(value) => patchWebsite({ mapBody: value })}
                />
              ) : null}
            </header>
            {editMode || website.address ? <EditableText
              as="p"
              className="bb-public-visit-body"
              editMode={editMode}
              multiline
              value={website.address || ''}
              placeholder="Street address"
              website={website}
              patchWebsite={patchWebsite}
              onChange={(value) => patchWebsite({ address: value })}
            /> : null}
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
              <Button as="a" action="open"
                className="bb-public-section-action"
                href={website.mapLinkUrl || website.mapEmbedUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (editMode || preview) event.preventDefault();
                }}
              >
                Open in Maps
              </Button>
            ) : null}
          </div>
          {website.mapEmbedUrl || editMode ? <div className="bb-public-map-wrap">
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
          </div> : null}
        </div>
        {branches.length > 0 && <div className="bb-public-measure-wide bb-public-branches"><h3>Our branches</h3><div className="bb-public-branch-grid">{branches.map(branch => <article className="bb-public-branch-card" key={branch.id}><MapPin size={18} aria-hidden="true" /><div><h4>{branch.name}</h4><p>{branch.address}</p><div className="bb-public-branch-contact">{branch.phone && <a href={`tel:${branch.phone.replace(/[^+\d]/g, '')}`} onClick={event => { if (editMode || preview) event.preventDefault(); }}><Phone size={13} aria-hidden="true" />{branch.phone}</a>}{branch.email && <a href={`mailto:${encodeURIComponent(branch.email)}`} onClick={event => { if (editMode || preview) event.preventDefault(); }}><Mail size={13} aria-hidden="true" />{branch.email}</a>}</div><a className="bb-public-branch-directions" href={directionsLink(branch)} target="_blank" rel="noopener noreferrer" onClick={event => { if (editMode || preview) event.preventDefault(); }}>Directions <ArrowUpRight size={13} aria-hidden="true" /></a></div></article>)}</div></div>}
      </div>
    </EditSection>
  );
}
