import { Scissors } from 'lucide-react';
import { MAX_MEDIA } from '../../utils/mediaIntake';
import { aspectStyle } from '../../utils/videoMedia';
import { PlaceLocationField } from '../PlaceLocationField';
import { CAPTION_SOFT_LIMIT } from './composerMeta';
import { CharacterCount } from './CharacterCount';
import { ComposerSlideStrip } from './ComposerSlideStrip';
import { MediaPreview } from './MediaPreview';

export function ComposerImageEdit({ c }) {
  return (
    <div className="bb-composer-edit bb-composer-edit--post">
      <div className="bb-composer-edit-media">
        <div
          className="bb-composer-carousel-preview"
          style={aspectStyle(c.frameAspectFor(c.activeItem))}
        >
          {c.activeItem ? (
            <MediaPreview
              item={c.activeItem}
              onAspect={(aspect) => c.setItemAspect(c.activeItem.id, aspect)}
            />
          ) : (
            <span className="bb-composer-arrange-empty">No media</span>
          )}
        </div>
        <ComposerSlideStrip
          items={c.items}
          activeId={c.activeId}
          uploads={c.uploads}
          canAdd={c.items.length < MAX_MEDIA}
          onAdd={() => c.mediaRef.current?.click()}
          onSelect={c.setActiveId}
          onGripPointerDown={c.onGripPointerDown}
          onGripPointerMove={c.onGripPointerMove}
          onGripPointerUp={c.onGripPointerUp}
          onRetry={c.retry}
          onCancel={c.cancel}
          onCrop={c.cropItem}
          onRemove={c.removeItem}
        />
        <input
          ref={c.mediaRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={c.onPostMediaPick}
        />
      </div>
      <div className="bb-composer-edit-copy">
        <label className="bb-social-field">
          <span>Title (optional)</span>
          <input
            className="native-control-input bb-social-compose-control"
            value={c.title}
            placeholder="Give this post a title"
            onChange={(event) => c.setTitle(event.target.value)}
          />
        </label>
        <label className="bb-social-field bb-social-field--grow">
          <span className="bb-composer-x-label-row">
            <span>Caption</span>
            <CharacterCount value={c.caption.length} limit={CAPTION_SOFT_LIMIT} />
          </span>
          <textarea
            data-autofocus="true"
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
        {c.items[0]?.kind === 'video' ? (
          <button
            type="button"
            className="bb-ghost-btn bb-composer-cover-set-inline"
            disabled={c.busy}
            onClick={() => c.setCoverPickerOpen(true)}
          >
            <Scissors size={14} strokeWidth={2.3} />
            Set cover frame
          </button>
        ) : null}
      </div>
    </div>
  );
}
