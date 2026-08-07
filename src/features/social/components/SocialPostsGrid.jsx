import { EditableImage, EditableText } from '../../website/components/editable';

export function SocialPostsGrid({
  posts,
  editMode = false,
  onUpdateSocialPost
}) {
  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a photo to fill the Posts grid.' : 'No photos published yet.'}
      </div>
    );
  }

  return (
    <div className="bb-social-posts-grid">
      {posts.map((post) => (
        <article key={post.id} className="bb-social-post-cell">
          {editMode && post.published === false ? (
            <div className="bb-edit-section-badge bb-social-draft-badge">Draft</div>
          ) : null}
          <EditableImage
            editMode={editMode}
            src={post.mediaUrl || ''}
            className="bb-social-post-media"
            imgClassName="w-full h-full object-cover"
            storageFolder="social"
            placeholderLabel="Add photo"
            onChange={(url) =>
              onUpdateSocialPost?.(post.id, { mediaUrl: url, type: 'image' })
            }
          />
          <div className="bb-social-post-meta">
            <EditableText
              as="p"
              className="bb-social-post-caption"
              editMode={editMode}
              multiline
              value={post.caption || ''}
              placeholder="Caption"
              onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
            />
            {editMode ? (
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
          </div>
        </article>
      ))}
    </div>
  );
}
