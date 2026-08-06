import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { E_BUSINESS_PLATFORM_NAME } from '../../../config/eBusinessPlatform';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { DevicePreviewFrame } from '../../website/components/DevicePreviewFrame';

export function SocialStudioPage() {
  const { workspace, addSocialPost, updateSocialPost, removeSocialPost } = useWorkspace();
  const posts = workspace.socialPosts || [];
  const [draft, setDraft] = useState({
    type: 'text',
    title: '',
    caption: '',
    mediaUrl: '',
    published: false
  });
  const [showPreview, setShowPreview] = useState(true);

  const sorted = useMemo(
    () =>
      [...posts].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0)
      ),
    [posts]
  );

  const publish = () => {
    if (!draft.caption.trim() && !draft.mediaUrl.trim()) return;
    addSocialPost(draft);
    setDraft({ type: 'text', title: '', caption: '', mediaUrl: '', published: false });
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
            {E_BUSINESS_PLATFORM_NAME}
          </p>
          <h1 className="bb-page-title text-3xl m-0">Social</h1>
          <p className="bb-muted m-0 max-w-2xl">
            Compose image URL + caption posts for your public Social page — draft or publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? 'Hide mockup' : 'Show mockup'}
          </button>
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => navigate(publicPagePath(workspace.slug, 'social'))}
          >
            <ExternalLink size={15} /> View Social page
          </button>
        </div>
      </header>

      <section className="bb-studio-split">
        <div className="grid gap-4 content-start">
          <div className="bb-panel p-5 grid gap-3 content-start">
            <h2 className="bb-page-title text-xl m-0">New post</h2>
            <div className="bb-segment">
              {[
                { id: 'text', label: 'Text' },
                { id: 'image', label: 'Image' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={draft.type === option.id}
                  onClick={() => setDraft((prev) => ({ ...prev, type: option.id }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {draft.type === 'text' ? (
              <input
                className="native-control-input px-4"
                placeholder="Title (optional)"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            ) : (
              <input
                className="native-control-input px-4"
                placeholder="Image URL"
                value={draft.mediaUrl}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, mediaUrl: event.target.value }))
                }
              />
            )}
            <textarea
              className="native-control-input px-4 py-3"
              rows={4}
              placeholder="Caption"
              value={draft.caption}
              onChange={(event) => setDraft((prev) => ({ ...prev, caption: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, published: event.target.checked }))
                }
              />
              Publish immediately
            </label>
            <button type="button" className="bb-primary-btn justify-self-start" onClick={publish}>
              Add post
            </button>
          </div>

          <div className="grid gap-3 content-start">
            {sorted.length === 0 ? (
              <div className="bb-panel p-6 bb-muted">No posts yet.</div>
            ) : (
              sorted.map((post) => (
                <article key={post.id} className="bb-panel overflow-hidden grid">
                  {post.type === 'image' && post.mediaUrl ? (
                    <div className="h-44 bg-black/5">
                      <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="p-4 grid gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-black/40">
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    {post.title ? (
                      <h3 className="bb-page-title text-lg m-0">{post.title}</h3>
                    ) : null}
                    <p className="m-0 text-sm">{post.caption}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="bb-ghost-btn"
                        onClick={() =>
                          updateSocialPost(post.id, { published: !post.published })
                        }
                      >
                        {post.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        className="bb-ghost-btn"
                        onClick={() => removeSocialPost(post.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        {showPreview ? (
          <div className="bb-panel p-5 grid gap-3 content-start">
            <h2 className="bb-page-title text-xl m-0">Public Social mockup</h2>
            <p className="bb-muted m-0 text-sm">
              Only published posts appear here — same feed as{' '}
              <code className="text-xs">#/w/{workspace.slug}/social</code>.
            </p>
            <DevicePreviewFrame workspace={workspace} page="social" device="phone" />
          </div>
        ) : null}
      </section>
    </div>
  );
}
