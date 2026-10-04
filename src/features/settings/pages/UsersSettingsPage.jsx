import { Button } from '../../../shared/ui/Button';
import { useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { validateTeamProfile } from '../settingsValidation';

export function UsersSettingsPage() {
  const { staff, upsertStaff, removeStaff } = useWorkspace();
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState('');
  const [memberDraft, setMemberDraft] = useState({
    name: '',
    email: '',
    role: '',
    accessRole: 'Staff'
  });

  return (
    <div className="bb-settings-content bb-settings-content--users">
      <form className="bb-panel p-5 grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        const problem = validateTeamProfile(memberDraft);
        setError(problem);
        if (problem) return;
        upsertStaff({ ...memberDraft, name: memberDraft.name.trim(), email: memberDraft.email.trim(), role: memberDraft.role.trim() });
        setMemberDraft({ name: '', email: '', role: '', accessRole: 'Staff' });
      }}>
        <h2 className="bb-page-title text-xl m-0">Add a team profile</h2>
        <p className="bb-muted m-0 text-sm">
          Add people to your scheduling roster. Team profiles do not create accounts or grant access
          to your business. Sign-in invitations are not available yet.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="bb-settings-field">Name<input
            className="native-control-input px-4"
            placeholder="Name"
            required maxLength={120} autoComplete="name"
            value={memberDraft.name}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, name: event.target.value }))}
          /></label>
          <label className="bb-settings-field">Email (optional)<input type="email"
            className="native-control-input px-4"
            placeholder="Email"
            maxLength={254} autoComplete="email"
            value={memberDraft.email}
            onChange={(event) => setMemberDraft((prev) => ({ ...prev, email: event.target.value }))}
          /></label>
          <label className="bb-settings-field">Job title (optional)<input
            className="native-control-input px-4"
            placeholder="Role title"
            maxLength={120}
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
        <Button action="addClient" variant="primary"
          type="submit"
          className="bb-primary-btn justify-self-start"
          disabled={!memberDraft.name.trim()}
        >
          Add team profile
        </Button>
        {error && <p className="bb-reschedule-error" role="alert">{error}</p>}
      </form>

      <div className="grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Your team</h2>
        {!staff.length && <p className="bb-muted">No team profiles yet. Add your first person above.</p>}
        {staff.map((member) => (
          <article
            key={member.id}
            className="bb-panel p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="bb-settings-team-copy grid gap-0.5">
              <strong>{member.name}</strong>
              <span className="bb-muted text-sm">
                {[member.role, member.accessRole, member.email].filter(Boolean).join(' · ')}
              </span>
            </div>
            {member.accessRole !== 'Owner' ? (
              removing === member.id ? <div className="bb-settings-remove-confirm" role="group" aria-label={`Remove ${member.name}`}>
                <span>Remove this team profile? Existing bookings are kept.</span>
                <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setRemoving('')}>Keep profile</Button>
                <Button action="delete" variant="destructive" type="button" className="bb-ghost-btn" onClick={() => { removeStaff(member.id); setRemoving(''); }}>Confirm removal</Button>
              </div> : <Button action="remove" variant="destructive" type="button" className="bb-ghost-btn" aria-label={`Remove ${member.name}`} onClick={() => setRemoving(member.id)}>Remove</Button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
