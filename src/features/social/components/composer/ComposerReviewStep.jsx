import { Play, Scissors } from 'lucide-react';
import { PlaceLocationField } from '../PlaceLocationField';
import { formatDurationLabel } from '../../utils/socialPostType';
import { aspectStyle } from '../../utils/videoMedia';
import { CAPTION_SOFT_LIMIT } from './composerMeta';
import { CharacterCount } from './CharacterCount';
import { ExploreCategoryPicker } from '../../../../shared/ui/ExploreCategoryPicker';

export function ComposerReviewStep({ c }) {
  const discoveryPicker = (
    <ExploreCategoryPicker
      mode="all"
      itemLabel={c.type === 'video' ? 'film' : c.type === 'vertical' ? 'vertical' : 'post'}
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
  );
  if (c.type === 'image') {
    return (
      <div className="bb-composer-caption-step">
        <div className="bb-composer-caption-media">
          <div className="bb-composer-cover-block">
            <div className="bb-composer-cover-head">
              <p className="bb-composer-cover-title">Cover</p>
              <span className="bb-composer-cover-note">
                {c.items[0]?.kind === 'video'
                  ? 'Pick the frame people see first'
                  : 'First slide is your cover'}
              </span>
            </div>

            <div className="bb-composer-carousel-preview bb-composer-cover-preview">
              {c.items[0] ? (
                <img
                  src={
                    c.items[0].kind === 'video'
                      ? c.items[0].posterUrl || c.items[0].url
                      : c.items[0].url
                  }
                  alt=""
                  className="bb-composer-cover-still"
                />
              ) : (
                <span className="bb-composer-arrange-empty">No media</span>
              )}
              {c.items[0]?.kind === 'video' ? (
                <>
                  <span className="bb-composer-media-badge">
                    {c.items[0].durationLabel || 'Video'}
                  </span>
                  <button
                    type="button"
                    className="bb-composer-cover-set"
                    disabled={c.busy}
                    onClick={() => c.setCoverPickerOpen(true)}
                  >
                    <Scissors size={14} strokeWidth={2.3} />
                    Set cover
                  </button>
                </>
              ) : null}
            </div>

            {c.items.length > 1 ? (
              <div className="bb-composer-cover-picks" role="list">
                {c.items.map((item, index) => {
                  const thumb = item.kind === 'video' ? item.posterUrl || item.url : item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="listitem"
                      className={`bb-composer-cover-pick${index === 0 ? ' is-cover' : ''}`}
                      onClick={() => c.setCoverSlide(index)}
                      aria-label={index === 0 ? 'Current cover' : `Use slide ${index + 1} as cover`}
                    >
                      {thumb ? <img src={thumb} alt="" /> : null}
                      {item.kind === 'video' ? (
                        <span className="bb-composer-cover-pick-play" aria-hidden="true">
                          <Play size={10} fill="currentColor" />
                        </span>
                      ) : null}
                      {index === 0 ? (
                        <span className="bb-composer-cover-pick-badge">Cover</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <input
              ref={c.coverPosterRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file && c.items[0]?.id) {
                  c.applyCoverPoster(c.items[0].id, file);
                  c.setCoverPickerOpen(false);
                }
              }}
            />
          </div>
        </div>

        <div className="bb-composer-caption-copy">
          <p className="bb-composer-caption-kicker">Almost done</p>
          <label className="bb-social-field bb-social-field--grow">
            <span className="bb-composer-x-label-row">
              <span>Caption</span>
              <CharacterCount value={c.caption.length} limit={CAPTION_SOFT_LIMIT} />
            </span>
            <textarea
              className="native-control-input bb-social-compose-control bb-social-compose-caption"
              rows={5}
              value={c.caption}
              placeholder="Write a caption…"
              onChange={(event) => c.setCaption(event.target.value)}
            />
          </label>
          <PlaceLocationField
            value={c.location}
            onChange={c.setLocation}
            disabled={c.busy}
            placeholder="Search for a place or address"
          />
          {discoveryPicker}
        </div>
      </div>
    );
  }

  if (!c.isLongVideo) return null;

  return (
    <div className="bb-composer-fields">
      <div
        className="bb-composer-video-review bb-composer-video-review--soft bb-composer-video-review--cover"
        style={aspectStyle(c.videoAspect, c.videoFallbackAspect)}
      >
        {c.mediaUrl ? (
          <video src={c.mediaUrl} poster={c.posterUrl || undefined} muted playsInline />
        ) : null}
        {c.duration ? <span className="bb-composer-video-duration">{c.duration}</span> : null}
        {c.mediaUrl ? (
          <button
            type="button"
            className="bb-composer-cover-set"
            disabled={c.busy}
            onClick={() => c.setCoverPickerOpen(true)}
          >
            <Scissors size={14} strokeWidth={2.3} />
            Set cover
          </button>
        ) : null}
      </div>

      <label className="bb-social-field">
        <span>Title</span>
        <input
          className="native-control-input bb-social-compose-control"
          value={c.title}
          placeholder={`${c.videoNoun} title`}
          onChange={(event) => c.setTitle(event.target.value)}
        />
      </label>

      <div className="bb-composer-readout">
        <span>Length</span>
        <strong>{c.duration || formatDurationLabel(c.durationSeconds) || '—'}</strong>
      </div>

      <label className="bb-social-field bb-social-field--grow">
        <span>Description</span>
        <textarea
          className="native-control-input bb-social-compose-control bb-social-compose-caption"
          rows={5}
          value={c.caption}
          placeholder={`What is this ${c.videoNoun} about?`}
          onChange={(event) => c.setCaption(event.target.value)}
        />
      </label>

      <PlaceLocationField
        value={c.location}
        onChange={c.setLocation}
        disabled={c.busy}
        placeholder="Search for a place or address"
      />
      {discoveryPicker}
    </div>
  );
}
