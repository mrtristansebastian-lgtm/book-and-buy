import { useWorkspace } from '../../workspace/WorkspaceContext';

export function LocationsSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Primary venue</h2>
        <p className="bb-muted m-0 text-sm">Single location for V1. Multi-location comes later.</p>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Address</span>
          <input
            className="native-control-input px-4"
            value={website.address || ''}
            onChange={(event) => updateWebsite({ address: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Map link URL</span>
          <input
            className="native-control-input px-4"
            value={website.mapLinkUrl || ''}
            onChange={(event) => updateWebsite({ mapLinkUrl: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Map embed URL</span>
          <input
            className="native-control-input px-4"
            value={website.mapEmbedUrl || ''}
            onChange={(event) => updateWebsite({ mapEmbedUrl: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Google Place ID</span>
          <input
            className="native-control-input px-4"
            value={website.googlePlaceId || ''}
            onChange={(event) => updateWebsite({ googlePlaceId: event.target.value })}
          />
        </label>
      </section>
    </div>
  );
}
