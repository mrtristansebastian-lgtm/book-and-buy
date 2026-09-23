import { useState } from 'react';
import { BellRing, LoaderCircle, SlidersHorizontal } from 'lucide-react';
import { enableSocialPushNotifications, socialMutations } from '../socialApi';

const DEFAULTS = {
  inApp: true,
  push: false,
  likes: true,
  shares: true,
  comments: true,
  replies: true,
  follows: true
};

export function SocialNotificationControls({ audience = 'client', ownerId = '', demo = false }) {
  const storageKey = `bb-social-notification-preferences:${audience}:${ownerId || 'me'}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch {
      return DEFAULTS;
    }
  });

  const save = async (next) => {
    setPreferences(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (!demo) {
      await socialMutations.setNotificationPreferences({ audience, ownerId, preferences: next });
    }
  };

  const enablePush = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (demo) {
        setMessage('Push alerts are available after you connect a real account.');
        return;
      }
      const result = await enableSocialPushNotifications({ audience, ownerId });
      if (!result.enabled) {
        setMessage(result.reason === 'not-configured'
          ? 'Push is ready for launch and activates when its Firebase key is added.'
          : 'This browser did not enable push alerts. You can try again later.');
        return;
      }
      await save({ ...preferences, push: true });
      setMessage('Browser alerts are on.');
    } catch {
      setMessage('Push could not be enabled just now. Your in-app notifications still work.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (key) => {
    setBusy(true);
    setMessage('');
    try {
      await save({ ...preferences, [key]: !preferences[key] });
    } catch {
      setMessage('That preference could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-social-notification-controls">
      <button type="button" className="bb-social-notification-settings" onClick={() => setOpen((value) => !value)}>
        <SlidersHorizontal size={16} /> Preferences
      </button>
      {open ? (
        <section className="bb-social-notification-preferences" aria-label="Notification preferences">
          <div className="bb-social-notification-preferences-head">
            <div><strong>Choose your activity alerts</strong><span>In-app alerts stay free. Browser push is optional.</span></div>
            <button type="button" onClick={enablePush} disabled={busy || preferences.push}>
              {busy ? <LoaderCircle className="bb-spin" size={15} /> : <BellRing size={15} />}
              {preferences.push ? 'Push on' : 'Enable push'}
            </button>
          </div>
          <div className="bb-social-notification-preference-grid">
            {[
              ['likes', 'Likes'],
              ['comments', 'Comments'],
              ['replies', 'Replies'],
              ['shares', 'Shares'],
              ['follows', 'New followers']
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input type="checkbox" checked={preferences[key]} onChange={() => toggle(key)} disabled={busy} />
              </label>
            ))}
          </div>
          {message ? <p role="status">{message}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
