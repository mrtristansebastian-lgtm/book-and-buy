import { APP_NAME } from '../../config/appConfig';
import { navigate } from '../../app/routing';

export function AppLoginScreen() {
  return (
    <div className="bb-shell native-ui min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md grid gap-8">
        <header className="grid gap-3">
          <div className="bb-brand-mark text-3xl">{APP_NAME}</div>
          <h1 className="bb-page-title text-4xl m-0">
            Welcome to <span className="native-accent-text">{APP_NAME}</span>.
          </h1>
          <p className="bb-muted m-0 text-base leading-relaxed">
            Sign in, create your workspace, or take the demo for a spin.
          </p>
        </header>

        <div className="grid gap-3">
          <button type="button" className="bb-ink-btn" onClick={() => navigate('/dashboard/overview')}>
            Open Workspace
          </button>
          <button type="button" className="bb-primary-btn" onClick={() => navigate('/dashboard/overview')}>
            Create Account
          </button>
          <button type="button" className="bb-ghost-btn" onClick={() => navigate('/demo')}>
            View Demo As Guest
          </button>
          <button type="button" className="bb-ghost-btn" onClick={() => navigate('/dashboard/clients')}>
            Client Portal
          </button>
        </div>

        <footer className="flex flex-wrap gap-4 text-sm bb-muted">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Support</span>
        </footer>
      </div>
    </div>
  );
}
