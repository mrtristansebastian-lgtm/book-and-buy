import { MapPin } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp, formatSocialTime } from '../utils/socialPostType';
import { SocialPostManageMenu } from './SocialPostManageMenu';

/**
 * Notes — Twitter / X-style feed (avatar, handle, relative time).
 */
export function SocialTextTimeline({
  posts,
  brandName = '',
  logoUrl = '',
  slug = '',
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost,
  onEditPost,
  renderActions = null,
  wrapMedia = null
}) {
  const displayName = brandName.trim() || 'Business';
  const handle = (slug || displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);

  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a note to start the feed.' : 'No notes published yet.'}
      </div>
    );
  }

  return (
    <div className="bb-social-notes" role="list">
      {posts.map((post) => {
        const relative = formatSocialTime(post.createdAt);
        const stamp = formatNoteStamp(post.createdAt);
        const place = String(post.location || '').trim();
        const rowName = String(post._brandName || displayName).trim() || 'Business';
        const rowLogo = post._logoUrl || logoUrl;
        const rowHandle = String(post._slug || handle || rowName)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '')
          .slice(0, 18);
        const rowInitial = rowName.charAt(0).toUpperCase() || 'B';

        return (
          <article key={post.id} className="bb-social-note" role="listitem">
            {rowLogo ? (
              <img src={rowLogo} alt="" className="bb-social-note-avatar" />
            ) : (
              <span className="bb-social-note-avatar bb-social-note-avatar--fallback" aria-hidden="true">
                {rowInitial}
              </span>
            )}

            <div className="bb-social-note-main">
              <header className="bb-social-note-head">
                <div className="bb-social-note-identity">
                  <span className="bb-social-note-name">{rowName}</span>
                  {rowHandle ? <span className="bb-social-note-handle">@{rowHandle}</span> : null}
                  {relative ? (
                    <>
                      <span className="bb-social-note-dot" aria-hidden="true">
                        ·
                      </span>
                      <time
                        className="bb-social-note-time"
                        dateTime={
                          post.createdAt ? new Date(post.createdAt).toISOString() : undefined
                        }
                        title={stamp || undefined}
                      >
                        {relative}
                      </time>
                    </>
                  ) : null}
                  {editMode && showPublishToggle && post.published === false ? (
                    <span className="bb-edit-section-badge">Draft</span>
                  ) : null}
                </div>

                {onEditPost || onRemoveSocialPost || onUpdateSocialPost ? (
                  <SocialPostManageMenu
                    post={post}
                    onEditPost={onEditPost}
                    onRemoveSocialPost={onRemoveSocialPost}
                    onUpdateSocialPost={onUpdateSocialPost}
                    showPublishToggle={showPublishToggle && Boolean(onUpdateSocialPost)}
                    className="bb-social-post-menu--note"
                    align="end"
                  />
                ) : null}
              </header>

              <div className="bb-social-note-copy">
                {(() => {
                  const copy = (
                    <>
                      {editMode || post.title ? (
                        <EditableText
                          as="p"
                          className="bb-social-note-title"
                          editMode={editMode}
                          value={post.title || ''}
                          placeholder="Title"
                          onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
                        />
                      ) : null}

                      <EditableText
                        as="p"
                        className="bb-social-note-text"
                        editMode={editMode}
                        multiline
                        value={post.caption || ''}
                        placeholder="Write your update…"
                        onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
                      />

                      {place ? (
                        <p className="bb-social-note-place">
                          <MapPin size={13} strokeWidth={2.2} aria-hidden="true" />
                          <span>{place}</span>
                        </p>
                      ) : null}
                    </>
                  );
                  return typeof wrapMedia === 'function' ? wrapMedia(post, copy) : copy;
                })()}
              </div>

              {typeof renderActions === 'function' ? (
                <div className="bb-social-note-engage">{renderActions(post)}</div>
              ) : null}

              {editMode && !onEditPost && !onRemoveSocialPost ? (
                <div className="bb-social-edit-actions bb-social-note-actions">
                  {showPublishToggle ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, { published: post.published === false })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                  {onRemoveSocialPost ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() => onRemoveSocialPost(post.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
