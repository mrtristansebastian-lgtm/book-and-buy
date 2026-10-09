import { Users } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { workspacePagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function UsersSettingsPage() {
  const { staff = [] } = useWorkspace();
  const active = staff.filter(member => member.active !== false).length;
  return <div className="bb-settings-content bb-settings-content--users">
    <section className="bb-panel p-5 grid gap-3">
      <div className="bb-settings-section-heading"><h2>Your team is in Office</h2><p>Manage contact details, service responsibilities, availability and active profiles together.</p></div>
      <p className="bb-muted m-0 text-sm">{active} active team member{active === 1 ? '' : 's'}. Roster profiles organise your business; they don’t grant account access.</p>
      <Button as="a" action="open" icon={Users} variant="primary" href={`#${workspacePagePath('teams')}`} className="justify-self-start">Open Teams</Button>
    </section>
  </div>;
}