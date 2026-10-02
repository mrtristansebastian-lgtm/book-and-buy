import { useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function UsersSettingsPage() {
  const { staff, upsertStaff, removeStaff } = useWorkspace();
  const [memberDraft, setMemberDraft] = useState({
    name: '',
    email: '',
    role: '',
    accessRole: 'Staff'
  });

  return (
    <div className="bb-settings-content bb-settings-content--users">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Add a team profile</h2>
        <p className="bb-muted m-0 text-sm">
          Add people to your scheduling roster. Team profiles do not create accounts or grant access
          to your business. Sign-in invitations are not available yet.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="bb-settings-field">Name<input
            className="native-control-input px-4"
            placeholder="Name"
            value={memberDraft.name}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, name: event.target.value }))}
          /></label>
          <label className="bb-settings-field">Email (optional)<input type="email"
            className="native-control-input px-4"
            placeholder="Email"
            value={memberDraft.email}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, email: event.target.value }))}
          /></label>
          <label className="bb-settings-field">Job title (optional)<input
            className="native-control-input px-4"
            placeholder="Role title"
            value={memberDraft.role}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, role: event.target.value }))}
          /></label>
          <label className="bb-settings-field">Roster role<select
            value={memberDraft.accessRole}
            onChange={(event) =>
              setMemberDraft((prev) => ({ ...prev, accessRole: event.target.value }))
            }
          >
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select></label>
        </div>
        <button
          type="button"
          className="bb-primary-btn justify-self-start"
          disabled={!memberDraft.name.trim()}
          onClick={() => {
            if (!memberDraft.name.trim()) return;
            upsertStaff(memberDraft);
            setMemberDraft({ name: '', email: '', role: '', accessRole: 'Staff' });
          }}
        >
          Add team profile
        </button>
      </section>

      <div className="grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Your team</h2>
        {!staff.length && <p className="bb-muted">No team profiles yet. Add your first person above.</p>}
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
              <button type="button" className="bb-ghost-btn" onClick={() => removeStaff(member.id)}>
                Remove
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
