import {
  ArrowRight,
  Eye,
  MessagesSquare
} from 'lucide-react';
import { BuildABookingMark } from '../../../components/BuildABookingBrand';

export function AppLoginScreen({
  authDialog,
  legalDialog,
  user,
  onClientLogin,
  onGuestDashboard,
  onLegalPanel,
  onOpenWorkspace,
  onOwnerSignIn,
  onOwnerSignup
}) {
  const signedIn = Boolean(user);

  return (
    <div className="native-ui app-login-screen min-h-screen bg-white text-black selection:bg-black selection:text-white">
      {authDialog}
      {legalDialog}

      <header className="app-login-header">
        <button type="button" onClick={onOpenWorkspace} className="app-login-brand" aria-label="Open Build A Booking">
          <BuildABookingMark className="app-login-brand-mark" variant="dark" />
          <span>Build A Booking</span>
        </button>
        <div className="app-login-header-actions">
          <button type="button" onClick={onClientLogin} className="app-login-text-button">Client Portal</button>
          <button type="button" onClick={signedIn ? onOpenWorkspace : onOwnerSignIn} className="app-login-header-button">
            {signedIn ? 'Workspace' : 'Sign In'}
          </button>
        </div>
      </header>

      <main className="app-login-main">
        <section className="app-login-copy" aria-labelledby="app-login-title">
          <span className="app-login-mark-wrap">
            <BuildABookingMark className="app-login-mark" variant="dark" />
          </span>
          <p className="app-login-kicker">Build A Booking</p>
          <h1 id="app-login-title">Welcome back.</h1>
          <p className="app-login-body">
            Sign in to manage your booking workspace.
          </p>

          <div className="app-login-actions">
            <button type="button" onClick={signedIn ? onOpenWorkspace : onOwnerSignIn} className="app-login-primary">
              {signedIn ? 'Open Workspace' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
            {!signedIn && (
              <button type="button" onClick={onOwnerSignup} className="app-login-secondary">
                Create Account
              </button>
            )}
          </div>

          <div className="app-login-secondary-actions" aria-label="Preview options">
            <button type="button" onClick={onGuestDashboard}>
              <Eye size={15} />
              Browse Demo
            </button>
            <button type="button" onClick={onClientLogin}>
              <MessagesSquare size={15} />
              Client Portal
            </button>
          </div>
        </section>
      </main>

      <footer className="app-login-footer">
        <button type="button" onClick={() => onLegalPanel('privacy')}>Privacy</button>
        <span />
        <button type="button" onClick={() => onLegalPanel('terms')}>Terms</button>
        <span />
        <button type="button" onClick={() => onLegalPanel('support')}>Support</button>
      </footer>
    </div>
  );
}
