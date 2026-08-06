import { navigate } from '../../app/routing';

export function PublicSurfaceError({ message = 'This page could not be found.' }) {
  return (
    <div className="bb-shell native-ui min-h-screen grid place-items-center px-5">
      <div className="grid gap-4 text-center max-w-md">
        <h1 className="bb-page-title text-3xl m-0">Page unavailable</h1>
        <p className="bb-muted m-0">{message}</p>
        <button type="button" className="bb-ink-btn justify-self-center" onClick={() => navigate('/')}>
          Back to Book and Buy
        </button>
      </div>
    </div>
  );
}
