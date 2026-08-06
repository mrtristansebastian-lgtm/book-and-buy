import { useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'team', label: 'Team' },
  { id: 'notifications', label: 'Notifications' }
];

export function ProfilePage() {
  const {
    workspace,
    staff,
    updateProfile,
    updateNotifications,
    upsertStaff,
    removeStaff
  } = useWorkspace();
  const [section, setSection] = useState('account');
  const [memberDraft, setMemberDraft] = useState({
    name: '',
    email: '',
    role: '',
    accessRole: 'Staff'
  });

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Profile</h1>
          <p className="bb-muted m-0">Account, team access, and notification basics.</p>
        </div>
        <PeriodSegmentedControl
          ariaLabel="Profile section"
          value={section}
          onChange={setSection}
          options={SECTIONS}
        />
      </header>

      {section === 'account' ? (
        <section className="bb-panel p-5 grid gap-3 max-w-xl">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Business name</span>
            <input
              className="native-control-input px-4"
              value={workspace.brandName || ''}
              onChange={(event) => updateProfile({ brandName: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Public slug</span>
            <input
              className="native-control-input px-4"
              value={workspace.slug || ''}
              onChange={(event) =>
                updateProfile({
                  slug: event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                })
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Email</span>
            <input
              className="native-control-input px-4"
              value={workspace.email || ''}
              onChange={(event) => updateProfile({ email: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Phone</span>
            <input
              className="native-control-input px-4"
              value={workspace.phone || ''}
              onChange={(event) => updateProfile({ phone: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Tagline</span>
            <input
              className="native-control-input px-4"
              value={workspace.tagline || ''}
              onChange={(event) => updateProfile({ tagline: event.target.value })}
            />
          </label>
        </section>
      ) : null}

      {section === 'team' ? (
        <section className="grid gap-4 max-w-3xl">
          <div className="bb-panel p-5 grid gap-3">
            <h2 className="bb-page-title text-xl m-0">Add team member</h2>
            <p className="bb-muted m-0 text-sm">
              Invite stub for now — members are stored on this workspace until Firebase auth invites
              land.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                className="native-control-input px-4"
                placeholder="Name"
                value={memberDraft.name}
                onChange={(event) =>
                  setMemberDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="native-control-input px-4"
                placeholder="Email"
                value={memberDraft.email}
                onChange={(event) =>
                  setMemberDraft((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <input
                className="native-control-input px-4"
                placeholder="Role title"
                value={memberDraft.role}
                onChange={(event) =>
                  setMemberDraft((prev) => ({ ...prev, role: event.target.value }))
                }
              />
              <select
                value={memberDraft.accessRole}
                onChange={(event) =>
                  setMemberDraft((prev) => ({ ...prev, accessRole: event.target.value }))
                }
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <button
              type="button"
              className="bb-primary-btn justify-self-start"
              onClick={() => {
                if (!memberDraft.name.trim()) return;
                upsertStaff(memberDraft);
                setMemberDraft({ name: '', email: '', role: '', accessRole: 'Staff' });
              }}
            >
              Add member
            </button>
          </div>

          <div className="grid gap-3">
            {staff.map((member) => (
              <article
                key={member.id}
                className="bb-panel p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="grid gap-0.5">
                  <strong>{member.name}</strong>
                  <span className="bb-muted text-sm">
                    {[member.role, member.accessRole, member.email].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {member.accessRole !== 'Owner' ? (
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={() => removeStaff(member.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {section === 'notifications' ? (
        <section className="bb-panel p-5 grid gap-3 max-w-xl">
          {[
            ['emailBookingRequests', 'Email booking requests'],
            ['emailProductOrders', 'Email product orders'],
            ['emailSupportMessages', 'Email support messages']
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={Boolean(workspace.notifications?.[key])}
                onChange={(event) =>
                  updateNotifications({ [key]: event.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </section>
      ) : null}
    </div>
  );
}
