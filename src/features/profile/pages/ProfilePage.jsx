import { useEffect } from 'react';
import { navigate } from '../../../app/routing';

/** @deprecated Profile moved to Settings — redirects for old links. */
export function ProfilePage() {
  useEffect(() => {
    navigate('/dashboard/settings/general', { replace: true });
  }, []);
  return null;
}
