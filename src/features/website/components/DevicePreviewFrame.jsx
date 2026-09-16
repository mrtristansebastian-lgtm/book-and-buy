import { useEffect, useRef, useState } from 'react';
import { PublicSurfaceRenderer } from './PublicSurfaceRenderer';

/**
 * Flush studio surface (no device bezel). Phone mode is width-only (~390px).
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
  const surfaceRef = useRef(null);
  const [itemId, setItemId] = useState('');

  useEffect(() => {
    setItemId('');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page, device]);

  useEffect(() => {
    surfaceRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [itemId]);

  return (
    <div
      ref={surfaceRef}
      className={`bb-studio-surface bb-device-preview bb-device-screen ${
        isPhone
          ? 'bb-studio-surface--phone bb-device-preview--phone'
          : 'bb-studio-surface--desktop bb-device-preview--desktop'
      }`}
    >
      <PublicSurfaceRenderer
        workspace={workspace}
        page={page}
        itemId={itemId}
        preview
        editMode={editMode}
        showHeader
        onOpenItem={setItemId}
        onCloseItem={() => setItemId('')}
        onUpdateWebsite={onUpdateWebsite}
        onUpdateProfile={onUpdateProfile}
        onUpdateSocialPost={onUpdateSocialPost}
        onAddSocialPost={onAddSocialPost}
        showDrafts={showDrafts}
      />
    </div>
  );
}
