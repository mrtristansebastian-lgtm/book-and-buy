import { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { emailMessageKeys, normalizeCommunications } from '../../../config/appConfig';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, functions, isFirebaseConfigured } from '../../../services/firebase';

const defaultReminders = { enabled: true, client24h: true, client2h: true };

const emailTemplates = [
  { key: 'bookingReceived', title: 'Request received', note: 'Sent after a client submits a booking request.' },
  { key: 'confirmed', title: 'Booking approved', note: 'Sent when you confirm a request.' },
  { key: 'declined', title: 'Request declined', note: 'Optional update if a request cannot be approved.' },
  { key: 'waitlist', title: 'Waitlist update', note: 'Sent when moving or messaging a waitlist client.' },
  { key: 'runningLate', title: 'Running late', note: 'Sent manually when the business is behind schedule.' },
  { key: 'review', title: 'Review follow-up', note: 'Sent manually after a completed appointment.' },
  { key: 'reminder24h', title: '24h reminder', note: 'Sent alongside the client portal reminder.' },
  { key: 'reminder2h', title: '2h reminder', note: 'Sent alongside the close-arrival reminder.' }
];

const emailChannelRows = [
  { key: 'ownerNewBooking', title: 'Owner new booking emails', note: 'Alert workspace owners when a new request arrives.' },
  { key: 'clientBookingReceived', title: 'Client request received emails', note: 'Requires the client email-updates checkbox.' },
  { key: 'bookingUpdates', title: 'Client booking update emails', note: 'Approvals, waitlist, running late, and reviews.' },
  { key: 'reminders', title: 'Client reminder emails', note: '24h and 2h reminders for confirmed bookings.' }
];

const inAppRows = [
  { key: 'ownerNewBooking', title: 'Owner booking alerts', note: 'New requests stay visible in the workspace.' },
  { key: 'clientBookingReceived', title: 'Client portal updates', note: 'Requests appear in the client portal automatically.' },
  { key: 'bookingUpdates', title: 'Booking status updates', note: 'Approval, waitlist, decline, and reschedule notices.' },
  { key: 'messages', title: 'Message notifications', note: 'Support inbox and client chat stay connected.' }
];

const ToggleRow = ({ active, disabled, note, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex min-h-[4.5rem] items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-all ${active ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-black hover:border-black'} ${disabled ? 'cursor-default opacity-80' : ''}`}
  >
    <span className="min-w-0">
      <span className="block text-sm font-black tracking-tight">{title}</span>
      <span className={`mt-1 block text-xs font-semibold leading-relaxed ${active ? 'text-white/60' : 'text-neutral-500'}`}>{note}</span>
    </span>
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? 'border-white/25 bg-white text-black' : 'border-neutral-200 bg-neutral-50 text-transparent'}`}>
      <Check size={14} strokeWidth={3} />
    </span>
  </button>
);

export const ProfileNotificationsSection = ({
  activeProfileSection,
  communications,
  onCommunicationsChange,
  onSaveCommunications,
  onSettingChange,
  settings,
  showToast
}) => {
  const normalized = useMemo(() => normalizeCommunications(communications), [communications]);
  const reminders = { ...defaultReminders, ...(settings.reminders || {}) };
  const [providerStatus, setProviderStatus] = useState({ loading: true, configured: false, missing: [] });

  useEffect(() => {
    let cancelled = false;
    if (activeProfileSection !== 'notifications') return undefined;
    if (!isFirebaseConfigured || !functions || !FirebaseSDK.httpsCallable) {
      setProviderStatus({ loading: false, configured: false, missing: ['Firebase Functions'] });
      return undefined;
    }
    const loadStatus = async () => {
      setProviderStatus(prev => ({ ...prev, loading: true }));
      try {
        const callable = FirebaseSDK.httpsCallable(functions, 'getEmailProviderStatus');
        const result = await callable({ appId });
        if (!cancelled) setProviderStatus({ loading: false, ...(result.data || {}) });
      } catch (error) {
        console.error(error);
        if (!cancelled) setProviderStatus({ loading: false, configured: false, missing: ['Email status unavailable'] });
      }
    };
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [activeProfileSection]);

  const updateCommunications = (next) => {
    onCommunicationsChange(normalizeCommunications(next));
  };

  const updateEmailChannel = (key, value) => {
    updateCommunications({
      ...normalized,
      emailNotifications: {
        ...normalized.emailNotifications,
        [key]: value
      }
    });
  };

  const updateTemplate = (key, updates) => {
    updateCommunications({
      ...normalized,
      [key]: {
        ...(normalized[key] || {}),
        ...updates
      }
    });
  };

  const updateReminder = (key, value) => {
    onSettingChange('reminders', { ...reminders, [key]: value });
  };

  const saveAll = () => {
    onSaveCommunications(normalized);
  };

  const activeEmailCount = emailMessageKeys.filter(key => normalized[key]?.active !== false).length;

  return (
    <section className={`profile-section profile-section-notifications ${activeProfileSection === 'notifications' ? 'block' : 'hidden'} bg-white rounded-lg p-5 sm:p-6 md:p-8`}>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase text-neutral-300">Notifications Studio</p>
          <h3 className="text-2xl font-black text-black md:text-3xl">Emails and in-app alerts</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Manage the platform emails, client booking messages, and reminders without weakening the in-app notification system.
          </p>
        </div>
        <button
          type="button"
          onClick={saveAll}
          className="h-11 rounded-full bg-black px-6 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
        >
          Save notifications
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-neutral-100 bg-neutral-50 p-5">
          <Mail size={16} className="mb-4 text-black" />
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Email provider</p>
          <h4 className="mt-2 text-xl font-black text-black">{providerStatus.configured ? 'Resend ready' : 'Resend setup needed'}</h4>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-500">
            {providerStatus.loading ? 'Checking server status...' : providerStatus.configured ? 'Server email is connected.' : `Missing: ${(providerStatus.missing || []).join(', ') || 'provider secrets'}.`}
          </p>
        </article>
        <article className="rounded-lg border border-neutral-100 bg-neutral-50 p-5">
          <ShieldCheck size={16} className="mb-4 text-black" />
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Auth emails</p>
          <h4 className="mt-2 text-xl font-black text-black">Platform managed</h4>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-500">
            Verification and password reset emails are Build A Booking branded and sent from Functions.
          </p>
        </article>
        <article className="rounded-lg border border-neutral-100 bg-neutral-50 p-5">
          <BellRing size={16} className="mb-4 text-black" />
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Active templates</p>
          <h4 className="mt-2 text-xl font-black text-black">{activeEmailCount}/{emailMessageKeys.length}</h4>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-500">
            Email templates are editable. In-app booking records stay active for reliability.
          </p>
        </article>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-neutral-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Email channels</p>
              <h4 className="mt-1 text-xl font-black text-black">Resend delivery</h4>
            </div>
            <RefreshCw size={15} className="text-neutral-300" />
          </div>
          <div className="grid gap-3">
            {emailChannelRows.map(row => (
              <ToggleRow
                key={row.key}
                active={normalized.emailNotifications?.[row.key] !== false}
                note={row.note}
                onClick={() => updateEmailChannel(row.key, normalized.emailNotifications?.[row.key] === false)}
                title={row.title}
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-100 bg-white p-5">
          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">In-app channels</p>
            <h4 className="mt-1 text-xl font-black text-black">Always-on core alerts</h4>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-500">
              These keep the workspace, portal, and chat reliable even if email delivery is not configured.
            </p>
          </div>
          <div className="grid gap-3">
            {inAppRows.map(row => (
              <ToggleRow
                key={row.key}
                active
                disabled
                note={row.note}
                onClick={() => showToast?.('Core in-app notifications stay on for booking reliability.')}
                title={row.title}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-neutral-100 bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Client reminders</p>
            <h4 className="mt-1 text-xl font-black text-black">Portal and email reminders</h4>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-500">
              Reminder switches control the existing portal reminders and the matching Resend emails.
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateReminder('enabled', !reminders.enabled)}
            className={`h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest transition-all ${reminders.enabled ? 'bg-black text-white' : 'border border-neutral-200 bg-white text-neutral-500 hover:border-black hover:text-black'}`}
          >
            {reminders.enabled ? 'Reminders on' : 'Reminders off'}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            active={Boolean(reminders.client24h)}
            disabled={!reminders.enabled}
            note="Clients receive a portal reminder and, when enabled, an email the day before."
            onClick={() => updateReminder('client24h', !reminders.client24h)}
            title="24 hours before"
          />
          <ToggleRow
            active={Boolean(reminders.client2h)}
            disabled={!reminders.enabled}
            note="Clients receive a close-arrival portal reminder and, when enabled, an email."
            onClick={() => updateReminder('client2h', !reminders.client2h)}
            title="2 hours before"
          />
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-neutral-100 bg-white p-5">
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Templates</p>
          <h4 className="mt-1 text-xl font-black text-black">Client email copy</h4>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {emailTemplates.map(template => (
            <article key={template.key} className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h5 className="text-base font-black text-black">{template.title}</h5>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">{template.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateTemplate(template.key, { active: normalized[template.key]?.active === false })}
                  className={`flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-colors ${normalized[template.key]?.active === false ? 'bg-neutral-200' : 'bg-black'}`}
                  aria-pressed={normalized[template.key]?.active !== false}
                >
                  <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${normalized[template.key]?.active === false ? '' : 'translate-x-6'}`} />
                </button>
              </div>
              <textarea
                value={normalized[template.key]?.text || ''}
                onChange={(event) => updateTemplate(template.key, { text: event.target.value })}
                className="min-h-[112px] w-full resize-none rounded-lg border border-transparent bg-white p-4 text-sm font-semibold leading-relaxed text-black outline-none transition-colors focus:border-black"
              />
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};
