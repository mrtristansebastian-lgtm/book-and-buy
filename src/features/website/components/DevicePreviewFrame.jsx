import { PublicSurfaceRenderer } from './PublicSurfaceRenderer';

/**
 * Phone/desktop frame that mounts the real public surface tree.
 */
export function DevicePreviewFrame({ workspace, page, device = 'phone' }) {
  const isPhone = device === 'phone';

  return (
    <div className={`bb-device-preview ${isPhone ? 'bb-device-preview--phone' : 'bb-device-preview--desktop'}`}>
      <div className="bb-device-bezel">
        {isPhone ? <div className="bb-device-notch" aria-hidden="true" /> : null}
        <div className="bb-device-screen">
          <PublicSurfaceRenderer workspace={workspace} page={page} preview showHeader />
        </div>
      </div>
    </div>
  );
}
