import { PublicSurfaceRenderer } from './PublicSurfaceRenderer';

/**
 * Phone/desktop frame that mounts the real public surface tree.
 */
export function DevicePreviewFrame({
  workspace,
  page,
  device = 'phone',
  editMode = false,
  onUpdateWebsite,
  onUpdateProfile,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const isPhone = device === 'phone';

  return (
    <div
      className={`bb-device-preview ${
        isPhone ? 'bb-device-preview--phone' : 'bb-device-preview--desktop'
      }`}
    >
      <div className="bb-device-bezel">
        {isPhone ? <div className="bb-device-notch" aria-hidden="true" /> : null}
        <div className="bb-device-screen">
          <PublicSurfaceRenderer
            workspace={workspace}
            page={page}
            preview
            editMode={editMode}
            showHeader
            onUpdateWebsite={onUpdateWebsite}
            onUpdateProfile={onUpdateProfile}
            onUpdateSocialPost={onUpdateSocialPost}
            onAddSocialPost={onAddSocialPost}
            showDrafts={showDrafts}
          />
        </div>
      </div>
    </div>
  );
}
