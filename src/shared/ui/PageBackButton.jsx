import { ArrowLeft } from 'lucide-react';
import { LAUNCHER_TAB } from '../../config/appLauncher';
import { navigate } from '../../app/routing';

/** Circular back control for owner mini-app page headings. */
export function PageBackButton({
  ariaLabel = 'Back to Home',
  onClick = null,
  className = ''
}) {
  return (
    <button
      type="button"
      className={`bb-page-back${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      onClick={
        onClick ||
        (() => {
          navigate(`/dashboard/${LAUNCHER_TAB}`);
        })
      }
    >
      <ArrowLeft size={18} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
