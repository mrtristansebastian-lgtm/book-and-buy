import { PlaceLocationField } from '../PlaceLocationField';
import { TEXT_SOFT_LIMIT } from './composerMeta';
import { CharacterCount } from './CharacterCount';
import { ExploreCategoryPicker } from '../../../../shared/ui/ExploreCategoryPicker';

export function ComposerTextStep({ c }) {
  return (
    <div className="bb-composer-text">
      <div className="bb-composer-x">
        <div className="bb-composer-x-avatar" aria-hidden="true">
          {(c.businessName || 'B').trim().charAt(0).toUpperCase()}
        </div>
        <div className="bb-composer-x-main">
          <label className="bb-social-field">
            <span>Title (optional)</span>
            <input
              className="native-control-input bb-social-compose-control"
              value={c.title}
              placeholder="Add a title"
              onChange={(event) => c.setTitle(event.target.value)}
            />
          </label>
          <label className="bb-social-field bb-social-field--grow">
            <span className="bb-composer-x-label-row">
              <span>What&apos;s happening?</span>
              <CharacterCount value={c.caption.length} limit={TEXT_SOFT_LIMIT} />
            </span>
            <textarea
              data-autofocus="true"
              className="native-control-input bb-social-compose-control bb-composer-x-input"
              rows={6}
              value={c.caption}
              placeholder="Share an update…"
              onChange={(event) => c.setCaption(event.target.value)}
            />
          </label>
          <PlaceLocationField
            value={c.location}
            onChange={c.setLocation}
            disabled={c.busy}
            placeholder="Search for a place or address"
          />
          <ExploreCategoryPicker
            mode="all"
            itemLabel="note"
            optional
            value={{
              exploreMainCategoryId: c.exploreMainCategoryId,
              exploreSubcategoryId: c.exploreSubcategoryId
            }}
            onChange={({ exploreMainCategoryId, exploreSubcategoryId }) => {
              c.setExploreMainCategoryId(exploreMainCategoryId);
              c.setExploreSubcategoryId(exploreSubcategoryId);
            }}
          />
        </div>
      </div>

      <div className="bb-composer-bubble-preview" aria-label="Preview">
        <p className="bb-composer-bubble-preview-label">Live preview</p>
        <article className="bb-social-note bb-social-note--preview">
          <span
            className="bb-social-note-avatar bb-social-note-avatar--fallback"
            aria-hidden="true"
          >
            {(c.businessName || 'B').trim().charAt(0).toUpperCase()}
          </span>
          <div className="bb-social-note-main">
            <header className="bb-social-note-head">
              <div className="bb-social-note-identity">
                <span className="bb-social-note-name">
                  {c.businessName.trim() || 'Your business'}
                </span>
                <span className="bb-social-note-handle">
                  @
                  {(c.businessName || 'you')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '')
                    .slice(0, 18) || 'you'}
                </span>
                <span className="bb-social-note-dot" aria-hidden="true">
                  ·
                </span>
                <span className="bb-social-note-time">now</span>
              </div>
            </header>
            <div className="bb-social-note-copy">
              {c.title.trim() ? <h2 className="bb-social-note-title">{c.title.trim()}</h2> : null}
              <p className="bb-social-note-text">
                {c.caption.trim() || 'Your update will show here…'}
              </p>
              {c.location?.label ? (
                <p className="bb-social-note-place">
                  <span>{c.location.label}</span>
                </p>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
