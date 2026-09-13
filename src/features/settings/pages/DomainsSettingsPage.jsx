import { useWorkspace } from '../../workspace/WorkspaceContext';
import { publicPagePath } from '../../../app/routing';

export function DomainsSettingsPage() {
  const { workspace, updateProfile } = useWorkspace();
  const preview = publicPagePath(workspace.slug || 'your-business');

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Book and Buy URL</h2>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Public slug</span>
          <input
            className="native-control-input px-4"
            value={workspace.slug || ''}
            onChange={(event) =>
              updateProfile({
                slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
              })
            }
          />
        </label>
        <p className="bb-muted m-0 text-sm">
          Preview:{' '}
          <a href={`#${preview}`} className="underline">
            {preview}
          </a>
        </p>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Custom domain</h2>
        <div className="bb-settings-stub">
          Connect your own domain (Business plan) — coming soon. DNS and SSL setup will live here.
        </div>
      </section>
    </div>
  );
}
