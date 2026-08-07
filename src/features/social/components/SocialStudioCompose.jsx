import { ImagePostComposer } from './ImagePostComposer';
import { VideoPostComposer } from './VideoPostComposer';
import { TextPostComposer } from './TextPostComposer';

export function SocialStudioCompose({ tab, brandName, onAddSocialPost }) {
  if (tab === 'videos') {
    return <VideoPostComposer onAddSocialPost={onAddSocialPost} />;
  }
  if (tab === 'text') {
    return <TextPostComposer brandName={brandName} onAddSocialPost={onAddSocialPost} />;
  }
  return <ImagePostComposer onAddSocialPost={onAddSocialPost} />;
}
