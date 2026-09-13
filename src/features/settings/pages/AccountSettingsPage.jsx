import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { navigate } from '../../../app/routing';

export function AccountSettingsPage() {
  const { user, signOut, isLocalMode } = useAuth();
  const { workspace, exitDemoMode } = useWorkspace();

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Signed in</h2>
        <p className="bb-muted m-0 text-sm">
          {user?.email || workspace.email || (isLocalMode ? 'Local mode (no cloud user)' : 'Not signed in')}
        </p>
        {workspace.isDemo ? (
          <button type="button" className="bb-ghost-btn justify-self-start" onClick={() => exitDemoMode?.()}>
            Exit demo
          </button>
        ) : null}
        <button
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
        </button>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Data</h2>
        <div className="bb-settings-stub">
          Export and delete workspace data will land here. Contact support for urgent account
          removal until then.
        </div>
      </section>
    </div>
  );
}
