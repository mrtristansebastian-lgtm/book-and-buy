import { EditableText } from '../../website/components/editable';

function formatStamp(createdAt) {
  const ts = Number(createdAt) || 0;
  if (!ts) return { date: '', time: '', label: '' };
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
  return { date, time, label: `${date} · ${time}` };
}

/**
 * Editorial note timeline — reading column with centred hairline separators.
 */
export function SocialTextTimeline({
  posts,
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a note to start the feed.' : 'No notes published yet.'}
      </div>
    );
  }

  return (
    <div className="bb-social-notes">
      {posts.map((post) => {
        const stamp = formatStamp(post.createdAt);
        return (
          <article key={post.id} className="bb-social-note">
            <header className="bb-social-note-meta">
              {stamp.label ? (
                <time
                  className="bb-social-note-stamp"
                  dateTime={new Date(post.createdAt).toISOString()}
                >
                  {stamp.label}
                </time>
              ) : null}
              <span className="bb-social-note-mark bb-public-native-fill" aria-hidden="true" />
              {editMode && showPublishToggle && post.published === false ? (
                <span className="bb-edit-section-badge">Draft</span>
              ) : null}
            </header>

            {editMode || post.title ? (
              <EditableText
                as="h2"
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

            {editMode ? (
              <div className="bb-social-edit-actions">
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
          </article>
        );
      })}
    </div>
  );
}
