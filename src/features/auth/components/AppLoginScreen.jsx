import {
  ArrowRight,
  Eye,
  LogIn,
  MessagesSquare,
  Sparkles,
  UserPlus
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
          <p className="app-login-kicker"><Sparkles size={14} /> Build A Booking</p>
          <h1 id="app-login-title">Welcome to Build A Booking.</h1>
          <p className="app-login-body">
            Sign in, create your workspace, or take the demo for a spin.
          </p>

          <div className="app-login-actions" aria-label="Workspace actions">
            <button type="button" onClick={signedIn ? onOpenWorkspace : onOwnerSignIn} className="app-login-primary">
              <LogIn size={16} />
              {signedIn ? 'Open Workspace' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
            {!signedIn && (
              <button type="button" onClick={onOwnerSignup} className="app-login-secondary">
                <UserPlus size={16} />
                Create Account
              </button>
            )}
            <button type="button" onClick={onGuestDashboard} className="app-login-demo">
              <Eye size={16} />
              View Demo As Guest
            </button>
            <button type="button" onClick={onClientLogin} className="app-login-client">
              <MessagesSquare size={16} />
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
