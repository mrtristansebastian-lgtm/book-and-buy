import { ImagePostComposer } from './ImagePostComposer';
import { VideoPostComposer } from './VideoPostComposer';
import { TextPostComposer } from './TextPostComposer';

export function SocialStudioCompose({ tab, onAddSocialPost }) {
  if (tab === 'videos') {
    return <VideoPostComposer onAddSocialPost={onAddSocialPost} />;
  }
  if (tab === 'text') {
    return <TextPostComposer onAddSocialPost={onAddSocialPost} />;
  }
  return <ImagePostComposer onAddSocialPost={onAddSocialPost} />;
}
