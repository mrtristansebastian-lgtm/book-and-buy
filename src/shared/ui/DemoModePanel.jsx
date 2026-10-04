import { Button } from './Button';
import { FlaskConical } from 'lucide-react';
import { navigate } from '../../app/routing';
import { useWorkspace } from '../../features/workspace/WorkspaceContext';
import { useClientProfile } from '../../features/client-app/ClientProfileContext';

/**
 * Compact demo controls — used in owner menu (under apps) and client account.
 */
export function DemoModePanel({
  className = '',
  brandName = '',
  onAction = null,
  variant = 'owner'
}) {
  const { workspace, exitDemoMode, resetDemoWorkspace, startOwnerOnboarding } = useWorkspace();
  const { profile, clearClientSession, enterDemoClient } = useClientProfile();

  const inDemo =
    Boolean(workspace?.isDemo) || (variant === 'client' && Boolean(profile?.isDemo));
  if (!inDemo) return null;

  const name = brandName || workspace?.brandName || 'this demo';
  const after = () => onAction?.();

  const leaveClientDemo = async () => {
    try {
      await clearClientSession();
    } catch {
      /* ignore */
    }
    exitDemoMode();
    after();
    navigate('/', { replace: true });
  };

  return (
    <section className={`bb-demo-panel ${className}`.trim()} aria-label="Demo mode">
      <header className="bb-demo-panel-head">
        <span className="bb-demo-panel-icon" aria-hidden="true">
          <FlaskConical size={18} strokeWidth={2} absoluteStrokeWidth />
        </span>
        <div className="bb-demo-panel-copy">
          <strong>Demo mode</strong>
          <p>Exploring {name} as a guest.</p>
        </div>
      </header>
      <div className="bb-demo-panel-actions">
        <Button action="reset" variant="secondary"
          type="button"
          className="bb-ghost-btn bb-demo-panel-btn"
          onClick={() => {
            if (variant === 'client') {
              resetDemoWorkspace();
              enterDemoClient();
            } else {
              resetDemoWorkspace();
            }
            after();
          }}
        >
          Reset demo
        </Button>
        <Button action="signOut" variant="secondary"
          type="button"
          className="bb-ghost-btn bb-demo-panel-btn"
          onClick={() => {
            if (variant === 'client') {
              leaveClientDemo();
              return;
            }
            exitDemoMode();
            after();
            navigate('/', { replace: true });
          }}
        >
          Exit demo
        </Button>
        {variant === 'owner' ? (
          <Button action="create" variant="primary"
            type="button"
            className="bb-ink-btn bb-demo-panel-btn"
            onClick={() => {
              startOwnerOnboarding();
              after();
              navigate('/onboarding');
            }}
          >
            Create account
          </Button>
        ) : (
          <Button action="create" variant="primary"
            type="button"
            className="bb-ink-btn bb-demo-panel-btn"
            onClick={() => {
              leaveClientDemo();
            }}
          >
            Create account
          </Button>
        )}
      </div>
    </section>
  );
}
