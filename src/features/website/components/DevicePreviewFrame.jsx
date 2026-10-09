import { useEffect, useRef, useState } from 'react';
import { profileCatalog } from '../profileModel';


import { PublicSurfaceRenderer } from './PublicSurfaceRenderer';

/**
 * Flush studio surface (no device bezel). Phone mode is width-only (~390px).
 */
export function DevicePreviewFrame({
  workspace,
  page,
  device = 'phone',
  bezel = false,
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
  const [currentPage, setCurrentPage] = useState(page);

  const capabilities = profileCatalog(workspace);
  const buyerWorkspace = { ...workspace, profileCapabilities: { book: capabilities.book, buy: capabilities.buy } };

  useEffect(() => {
    setItemId('');
    surfaceRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setCurrentPage(page);
  }, [page, device]);

  useEffect(() => {
    surfaceRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentPage]);

  useEffect(() => {
    surfaceRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [itemId]);

  return (
    <div className={bezel ? `bb-profile-device bb-profile-device--${isPhone ? 'phone' : 'desktop'}` : 'bb-profile-device--plain'}>
      {bezel ? <div className="bb-profile-device-chrome" aria-hidden="true">{isPhone ? <span className="bb-profile-device-speaker" /> : <><span /><span /><span /><div className="bb-profile-device-address">{workspace.brandName} · Business profile</div></>}</div> : null}
    <div
      ref={surfaceRef}
      className={`bb-studio-surface bb-device-preview bb-device-screen ${
        isPhone
          ? 'bb-studio-surface--phone bb-device-preview--phone'
          : 'bb-studio-surface--desktop bb-device-preview--desktop'
      }`}
    >
      <PublicSurfaceRenderer
        workspace={buyerWorkspace}
        page={currentPage}
        itemId={itemId}
        preview
        editMode={editMode}
        showHeader
        onOpenPage={(next) => { setCurrentPage(next); setItemId(''); }}
        onOpenItem={(id, kind) => { if (kind) setCurrentPage(kind); setItemId(id); }}
        onCloseItem={() => setItemId('')}
        onUpdateWebsite={onUpdateWebsite}
        onUpdateProfile={onUpdateProfile}
        onUpdateSocialPost={onUpdateSocialPost}
        onAddSocialPost={onAddSocialPost}
        showDrafts={showDrafts}
      />
    </div>
    </div>
  );
}
