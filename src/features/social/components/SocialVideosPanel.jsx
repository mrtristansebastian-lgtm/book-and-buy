import { useEffect, useState } from 'react';
import { EditableImage, EditableText } from '../../website/components/editable';
import { BbVideoPlayer } from './BbVideoPlayer';

export function SocialVideosPanel({
  posts,
  editMode = false,
  onUpdateSocialPost,
  onRemoveSocialPost,
  initialActiveId = ''
}) {
  const [activeId, setActiveId] = useState(initialActiveId || posts[0]?.id || '');

  useEffect(() => {
    if (initialActiveId && posts.some((post) => post.id === initialActiveId)) {
      setActiveId(initialActiveId);
      return;
    }
    if (!posts.some((post) => post.id === activeId)) {
      setActiveId(posts[0]?.id || '');
    }
  }, [posts, activeId, initialActiveId]);

  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a video to open the player.' : 'No videos published yet.'}
      </div>
    );
  }

  const active = posts.find((post) => post.id === activeId) || posts[0];

  return (
    <div className="bb-social-videos bb-social-bone">
      <div className="bb-social-video-stage">
        <div className="bb-social-bone-bar">
          <span className="bb-social-bone-label">Now playing</span>
          {active.duration ? (
            <span className="bb-social-bone-meta">{active.duration}</span>
          ) : null}
        </div>
        <div className="bb-social-video-player-frame">
          {active.mediaUrl ? (
            <BbVideoPlayer
              key={active.id}
              className="bb-social-video-player"
              src={active.mediaUrl}
              poster={active.posterUrl || ''}
              title={active.title || 'Video'}
            />
          ) : (
            <div className="bb-social-video-player bb-social-video-player--empty">
              {editMode ? 'Paste a video URL below' : 'Video unavailable'}
            </div>
          )}
        </div>
        <div className="bb-social-video-stage-copy">
          <EditableText
            as="h2"
            className="bb-social-video-title"
            editMode={editMode}
            value={active.title || ''}
            placeholder="Video title"
            onChange={(value) => onUpdateSocialPost?.(active.id, { title: value })}
          />
          <EditableText
            as="p"
            className="bb-social-video-caption"
            editMode={editMode}
            multiline
            value={active.caption || ''}
            placeholder="Video description"
            onChange={(value) => onUpdateSocialPost?.(active.id, { caption: value })}
          />
        </div>
      </div>

      <aside className="bb-social-video-list">
        <div className="bb-social-bone-bar">
          <span className="bb-social-bone-label">Up next</span>
          <span className="bb-social-bone-meta">{posts.length}</span>
        </div>
        <div className="bb-social-video-list-body">
          {posts.map((post) => {
            const selected = post.id === active.id;
            return (
              <article
                key={post.id}
                className={`bb-social-video-row ${selected ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="bb-social-video-row-hit"
                  onClick={() => setActiveId(post.id)}
                  aria-pressed={selected}
                >
                  <span className="bb-social-video-thumb">
                    {post.posterUrl || post.mediaUrl ? (
                      <img src={post.posterUrl || post.mediaUrl} alt="" />
                    ) : null}
                    {post.duration ? (
                      <span className="bb-social-video-duration">{post.duration}</span>
                    ) : null}
                  </span>
                  <span className="bb-social-video-row-copy">
                    <strong>{post.title || 'Untitled video'}</strong>
                    <span>{post.caption || ''}</span>
                  </span>
                </button>

                {editMode ? (
                  <div className="bb-social-video-edit">
                    {post.published === false ? (
                      <div className="bb-edit-section-badge">Draft</div>
                    ) : null}
                    <EditableImage
                      editMode
                      src={post.posterUrl || ''}
                      className="bb-social-video-poster-edit"
                      imgClassName="w-full h-full object-cover"
                      storageFolder="social"
                      preset="videoPoster"
                      placeholderLabel="Poster image"
                      onChange={(url) =>
                        onUpdateSocialPost?.(post.id, { posterUrl: url, type: 'video' })
                      }
                    />
                    <label className="grid gap-1 text-xs font-semibold">
                      Video URL
                      <input
                        className="native-control-input px-3 py-2 text-sm"
                        value={post.mediaUrl || ''}
                        placeholder="https://…/video.mp4"
                        onChange={(event) =>
                          onUpdateSocialPost?.(post.id, {
                            mediaUrl: event.target.value,
                            type: 'video'
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold max-w-[8rem]">
                      Duration
                      <input
                        className="native-control-input px-3 py-2 text-sm"
                        value={post.duration || ''}
                        placeholder="3:42"
                        onChange={(event) =>
                          onUpdateSocialPost?.(post.id, { duration: event.target.value })
                        }
                      />
                    </label>
                    <EditableText
                      as="p"
                      className="bb-page-title text-base m-0"
                      editMode
                      value={post.title || ''}
                      placeholder="Title"
                      onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
                    />
                    <EditableText
                      as="p"
                      className="bb-muted m-0 text-sm"
                      editMode
                      multiline
                      value={post.caption || ''}
                      placeholder="Description"
                      onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
                    />
                    <button
                      type="button"
                      className="bb-ghost-btn py-1.5 px-3 text-xs justify-self-start"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, { published: post.published === false })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                    {onRemoveSocialPost ? (
                      <button
                        type="button"
                        className="bb-ghost-btn py-1.5 px-3 text-xs justify-self-start"
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
      </aside>
    </div>
  );
}
