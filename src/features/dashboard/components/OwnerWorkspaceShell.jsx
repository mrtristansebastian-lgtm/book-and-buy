import { LAUNCHER_TAB, appForTab } from '../../../config/appLauncher';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { MiniAppBar } from './MiniAppBar';

/**
 * App-style shell: Home launcher (bento tiles) or an immersive mini-app with
 * a Back bar. No sidebar, no dock.
 */
export function OwnerWorkspaceShell({ tab, children }) {
  const { workspace, exitDemoMode, resetDemoWorkspace, startOwnerOnboarding } = useWorkspace();
  const isLauncher = tab === LAUNCHER_TAB;
  const app = isLauncher ? null : appForTab(tab);
  const supportFlush = tab === 'communications';

  return (
    <div
      className={`bb-shell native-ui ${supportFlush ? 'is-support-flush' : 'min-h-screen'} ${
        isLauncher ? 'is-launcher' : 'is-miniapp'
      }`}
    >
      {workspace.isDemo ? (
        <div className="bb-demo-banner border-b border-black/8 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="bb-primary-btn py-1 px-3 text-xs pointer-events-none">Demo mode</span>
            <span className="bb-muted">
              Exploring <strong className="text-ink">{workspace.brandName}</strong> as a guest.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="bb-ghost-btn py-1.5 px-3 text-sm" onClick={() => resetDemoWorkspace()}>
              Reset demo
            </button>
            <button
              type="button"
              className="bb-ghost-btn py-1.5 px-3 text-sm"
              onClick={() => {
                exitDemoMode();
                navigate('/');
              }}
            >
              Exit demo
            </button>
            <button
              type="button"
              className="bb-ink-btn py-1.5 px-3 text-sm"
              onClick={() => {
                startOwnerOnboarding();
                navigate('/onboarding');
              }}
            >
              Create account
            </button>
          </div>
        </div>
      ) : null}

      <div className="bb-owner-layout">
        <div className="bb-owner-content">
          {!isLauncher ? <MiniAppBar app={app} tab={tab} /> : null}
          <main
            key={tab}
            className={`bb-owner-main ${supportFlush ? 'is-flush' : ''} ${
              isLauncher ? '' : 'bb-miniapp-enter'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
