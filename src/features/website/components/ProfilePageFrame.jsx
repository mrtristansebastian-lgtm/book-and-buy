import { useEffect, useRef } from 'react';
import { BusinessProfileHeader } from './BusinessProfileHeader';
import { ProfileCardFooter } from './ProfileCardFooter';
import { profileTabs, profileSectionTabs } from '../profileModel';
import { navigate, publicPagePath } from '../../../app/routing';

/** One card shell for detail pages and the checkout panels nested inside them. */
export function ProfilePageFrame({
  workspace,
  page = 'home',
  preview = false,
  editMode = false,
  onOpenPage,
  onUpdateWebsite,
  onUpdateProfile,
  scrollKey = '',
  children
}) {
  const modulesRef = useRef(null);
  const navigation = [
    ...profileTabs(workspace).map(item => item.id === 'home' ? { ...item, label: 'Business card' } : item),
    ...profileSectionTabs(workspace)
  ];
  const pageLabel = navigation.find(item => item.id === page)?.label || ({ cart: 'Cart', checkout: 'Checkout', success: 'Confirmation' }[page]) || 'Business profile';
  const openPage = id => {
    if (editMode) return;
    if (onOpenPage) { onOpenPage(id); return; }
    navigate(publicPagePath(workspace.slug, id));
  };

  useEffect(() => {
    modulesRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [workspace.slug, page, scrollKey]);

  return <div className={`bb-public-home-stack bb-public-profile bb-business-profile bb-profile-storyboard is-section-page${editMode ? ' is-editing' : ''}`}>
    <div className="bb-public-profile-rail">
      <BusinessProfileHeader workspace={workspace} preview={preview} editMode={editMode} compact
        patchWebsite={patch => onUpdateWebsite?.(patch)} onUpdateProfile={onUpdateProfile}
        navigation={navigation} activePage={page} onOpenTab={openPage} />
      <div ref={modulesRef} className="bb-public-profile-modules" data-scroll-root tabIndex={0} role="region" aria-label={pageLabel}>
        {children}
      </div>
      <ProfileCardFooter workspace={workspace} />
    </div>
  </div>;
}
