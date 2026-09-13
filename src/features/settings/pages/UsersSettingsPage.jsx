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
    <div className="grid gap-4 max-w-3xl">
      <section className="bb-panel p-5 grid gap-3">
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
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="native-control-input px-4"
            placeholder="Email"
            value={memberDraft.email}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            className="native-control-input px-4"
            placeholder="Role title"
            value={memberDraft.role}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, role: event.target.value }))}
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
      </section>

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
