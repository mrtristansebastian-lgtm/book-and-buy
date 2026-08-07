import { useMemo, useState } from 'react';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { EditableText } from '../../website/components/editable';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialPostsGrid } from './SocialPostsGrid';
import { SocialVideosPanel } from './SocialVideosPanel';
import { SocialTextTimeline } from './SocialTextTimeline';

const TABS = [
  { id: 'posts', label: 'Posts', kind: 'image' },
  { id: 'videos', label: 'Videos', kind: 'video' },
  { id: 'text', label: 'Text', kind: 'text' }
];

export function SocialFeed({
  workspace,
  editMode = false,
  showDrafts = false,
  onUpdateWebsite,
  onUpdateSocialPost,
  onAddSocialPost
}) {
  const website = workspace.website || {};
  const [tab, setTab] = useState('posts');

  const allPosts = useMemo(
    () =>
      [...(workspace.socialPosts || [])]
        .filter((post) => (editMode && showDrafts ? true : post.published !== false))
        .sort(
          (a, b) =>
            (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0)
        ),
    [workspace.socialPosts, editMode, showDrafts]
  );

  const counts = useMemo(() => {
    const next = { image: 0, video: 0, text: 0 };
    for (const post of allPosts) {
      next[getSocialPostKind(post)] += 1;
    }
    return next;
  }, [allPosts]);

  const tabOptions = TABS.map((item) => ({
    id: item.id,
    label: item.label,
    count: counts[item.kind]
  }));

  const activeKind = TABS.find((item) => item.id === tab)?.kind || 'image';
  const filtered = allPosts.filter((post) => getSocialPostKind(post) === activeKind);

  const addForTab = () => {
    if (tab === 'videos') {
      onAddSocialPost?.({
        type: 'video',
        title: 'New video',
        caption: 'Describe this video…',
        mediaUrl: '',
        posterUrl: '',
        duration: '',
        published: false
      });
      return;
    }
    if (tab === 'text') {
      onAddSocialPost?.({
        type: 'text',
        title: '',
        caption: 'What’s happening?',
        published: false
      });
      return;
    }
    onAddSocialPost?.({
      type: 'image',
      caption: 'Write a caption…',
      mediaUrl: '',
      published: false
    });
  };

  const addLabel =
    tab === 'videos' ? 'Add video' : tab === 'text' ? 'Add text' : 'Add photo';

  return (
    <section className="bb-public-social bb-public-gutter">
      <div className="bb-public-measure-wide grid gap-6">
        <header className="bb-public-social-header grid gap-3">
          <EditableText
            as="h1"
            className="bb-page-title"
            editMode={editMode}
            value={website.socialHeadline || 'Social'}
            placeholder="Social headline"
            onChange={(value) => onUpdateWebsite?.({ socialHeadline: value })}
          />
          <EditableText
            as="p"
            className="bb-public-lede m-0"
            editMode={editMode}
            multiline
            value={website.socialSubtext || `Updates from ${workspace.brandName}.`}
            placeholder="Social supporting line"
            onChange={(value) => onUpdateWebsite?.({ socialSubtext: value })}
          />
        </header>

        <div className="bb-social-toolbar">
          <div className="bb-social-tabs">
            <PeriodSegmentedControl
              ariaLabel="Social feed type"
              value={tab}
              onChange={setTab}
              options={tabOptions}
            />
          </div>
          {editMode ? (
            <button type="button" className="bb-primary-btn" onClick={addForTab}>
              {addLabel}
            </button>
          ) : null}
        </div>

        {tab === 'posts' ? (
          <SocialPostsGrid
            posts={filtered}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}
        {tab === 'videos' ? (
          <SocialVideosPanel
            posts={filtered}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}
        {tab === 'text' ? (
          <SocialTextTimeline
            posts={filtered}
            brandName={workspace.brandName}
            editMode={editMode}
            onUpdateSocialPost={onUpdateSocialPost}
          />
        ) : null}
      </div>
    </section>
  );
}
