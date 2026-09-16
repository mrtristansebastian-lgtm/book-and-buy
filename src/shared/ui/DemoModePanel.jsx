import { FlaskConical } from 'lucide-react';
import { navigate } from '../../app/routing';
import { useWorkspace } from '../../features/workspace/WorkspaceContext';

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
  if (!workspace?.isDemo) return null;

  const name = brandName || workspace.brandName || 'this demo';

  const after = () => onAction?.();

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
        <button
          type="button"
          className="bb-ghost-btn bb-demo-panel-btn"
          onClick={() => {
            resetDemoWorkspace();
            after();
          }}
        >
          Reset demo
        </button>
        <button
          type="button"
          className="bb-ghost-btn bb-demo-panel-btn"
          onClick={() => {
            exitDemoMode();
            after();
            navigate(variant === 'client' ? '/app/auth' : '/');
          }}
        >
          Exit demo
        </button>
        {variant === 'owner' ? (
          <button
            type="button"
            className="bb-ink-btn bb-demo-panel-btn"
            onClick={() => {
              startOwnerOnboarding();
              after();
              navigate('/onboarding');
            }}
          >
            Create account
          </button>
        ) : (
          <button
            type="button"
            className="bb-ink-btn bb-demo-panel-btn"
            onClick={() => {
              exitDemoMode();
              after();
              navigate('/app/auth');
            }}
          >
            Create account
          </button>
        )}
      </div>
    </section>
  );
}
