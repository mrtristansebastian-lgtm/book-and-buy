import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { navigate } from '../../../app/routing';

export function AccountSettingsPage() {
  const { user, signOut, isLocalMode } = useAuth();
  const { workspace, exitDemoMode } = useWorkspace();

  return (
    <div className="bb-settings-content bb-settings-content--account">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">{workspace.isDemo ? 'Demo workspace' : user ? 'Signed in' : 'Local workspace'}</h2>
        <p className="bb-muted m-0 text-sm">
          {workspace.isDemo ? 'You are exploring a sample business. This is not a signed-in business account.' : user?.email || (isLocalMode ? 'Saved on this device. No cloud account is signed in.' : 'Not signed in')}
        </p>
        {workspace.isDemo ? (
          <button type="button" className="bb-ghost-btn justify-self-start" onClick={() => exitDemoMode?.()}>
            Exit demo
          </button>
        ) : null}
        {!workspace.isDemo && user ? <button
          type="button"
          className="bb-primary-btn justify-self-start"
          onClick={async () => {
            try {
              await signOut?.();
            } catch {
              /* ignore */
            }
            navigate('/');
          }}
        >
          Sign out
        </button> : null}
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Data</h2>
        <div className="bb-settings-stub">
          Self-service workspace export and deletion are not available yet. No data is removed from this page.
        </div>
      </section>
    </div>
  );
}
