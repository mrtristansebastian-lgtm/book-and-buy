import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, ChevronRight, Clock3, Mail, Pencil, Phone, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ScheduleAvailabilityEditor } from '../../schedule/components/ScheduleAvailabilityEditor';
import { navigate, scrollAppToTop, workspacePagePath } from '../../../app/routing';
import { normalizeStaffAvailabilityEntry, WEEKDAY_KEYS } from '../../../utils/staffAvailability';
import { buildTeamOverview, filterTeamMembers, formatTeamMinutes, isTeamMemberActive, normalizeTeamMember, TEAM_STATUS_LABELS, teamInitials, teamServiceChanges, validateTeamMember } from '../teamManagement';
import '../teams.css';

function TeamAvatar({ member, large = false }) {
  const photo = member.photoURL || member.avatarUrl || member.imageUrl;
  return <span className={`bb-team-avatar${large ? ' is-large' : ''}`} aria-hidden="true">
    {photo ? <img src={photo} alt="" onError={event => { event.currentTarget.hidden = true; }} /> : null}
    <span>{teamInitials(member.name)}</span>
  </span>;
}

function MemberStatus({ status }) {
  return <span className={`bb-team-status is-${status}`}><i aria-hidden="true" />{TEAM_STATUS_LABELS[status]}</span>;
}

function TeamEditor({ member, services, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({ name: '', email: '', phone: '', role: '', notes: '', active: true, ...member }));
  const [assigned, setAssigned] = useState(() => services.filter(service => (service.staffIds || []).includes(member?.id)).map(service => service.id));
  const [baseline] = useState(() => ({ member: member?.id ? JSON.stringify(member) : '', assigned: services.filter(service => (service.staffIds || []).includes(member?.id)).map(service => service.id).sort().join('|') }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setError(''); };
  const save = async event => {
    event.preventDefault();
    const problem = validateTeamMember(draft);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try { await onSave(normalizeTeamMember(draft), assigned, baseline); }
    catch (problem) { setError(problem.message || 'We couldn’t update this profile. Please try again.'); setSaving(false); }
  };
  const assignable = services.filter(service => service.active !== false || assigned.includes(service.id));
  return <AppSheet onClose={saving ? undefined : onClose} title={member?.id ? 'Edit team member' : 'Add team member'} eyebrow="Your people" lede="Contact details, responsibilities and the services they provide." panelClassName="bb-team-editor" footer={<><Button action="cancel" onClick={onClose} disabled={saving}>Cancel</Button><Button action="save" variant="primary" type="submit" form="team-member-form" busy={saving} busyLabel="Updating…">{member?.id ? 'Update profile' : 'Add member'}</Button></>}>
    <form id="team-member-form" className="bb-team-form" onSubmit={save}>
      <div className="bb-team-form-fields">
        <label>Name<input autoFocus required maxLength={120} autoComplete="name" value={draft.name} onChange={event => change('name', event.target.value)} placeholder="Full name" /></label>
        <label>Job title <span>Optional</span><input maxLength={120} value={draft.role} onChange={event => change('role', event.target.value)} placeholder="e.g. Senior stylist" /></label>
        <label>Email <span>Optional</span><input type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={event => change('email', event.target.value)} placeholder="name@example.com" /></label>
        <label>Phone <span>Optional</span><input type="tel" maxLength={40} autoComplete="tel" value={draft.phone} onChange={event => change('phone', event.target.value)} placeholder="+27" /></label>
      </div>
      <fieldset className="bb-team-service-picker"><legend>Service responsibilities</legend><p>Choose the services this person can be assigned to.</p>
        {assignable.length ? <div>{assignable.map(service => <label key={service.id} className={assigned.includes(service.id) ? 'is-checked' : ''}><input type="checkbox" checked={assigned.includes(service.id)} onChange={event => setAssigned(previous => event.target.checked ? [...previous, service.id] : previous.filter(id => id !== service.id))} /><span className="bb-team-service-check" aria-hidden="true">{assigned.includes(service.id) ? <Check size={13} /> : null}</span><span>{service.name}{service.active === false ? <small>Inactive service</small> : null}</span></label>)}</div> : <div className="bb-team-form-empty">Add services to your catalogue to assign them here.</div>}
      </fieldset>
      <label className="bb-team-form-notes">Team notes <span>Optional · private to your office</span><textarea rows={3} maxLength={1000} value={draft.notes} onChange={event => change('notes', event.target.value)} placeholder="Responsibilities or useful details for your team." /></label>
      <div className="bb-team-access-note"><ShieldCheck size={18} aria-hidden="true" /><p>This creates a roster profile. Team sign-in invitations aren’t available yet.</p></div>
      {error ? <p className="bb-team-error" role="alert">{error}</p> : null}
    </form>
  </AppSheet>;
}

function TeamDetail({ row, workspace, onEdit, onAvailability, onDeactivate, onBack }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { setConfirming(false); }, [row?.member.id]);
  if (!row) return <aside className="bb-team-detail bb-team-detail--empty"><span className="bb-team-empty-icon"><Users size={26} /></span><h2>Your team, in focus.</h2><p>Select a person to see their services, availability and upcoming work.</p></aside>;
  const { member } = row;
  const availability = normalizeStaffAvailabilityEntry(workspace.staffAvailability?.[member.id] || {}, member.id, workspace.availabilityRules?.businessOpenTime, workspace.availabilityRules?.businessCloseTime);
  const active = isTeamMemberActive(member);
  const nextDate = row.next?.dateKey === row.todayKey ? 'Today' : row.next?.dateKey;
  return <aside className="bb-team-detail" aria-label={`${member.name} details`}>
    <div className="bb-team-detail-top"><button type="button" className="bb-team-detail-back" onClick={onBack}><ArrowLeft size={16} />Team</button><span>Team profile</span><button type="button" className="bb-team-icon-button" aria-label={`Edit ${member.name}`} onClick={onEdit}><Pencil size={16} /></button></div>
    <div className="bb-team-detail-identity"><TeamAvatar member={member} large /><h2>{member.name}</h2><p>{member.role || 'Team member'}</p><MemberStatus status={row.status} /></div>
    <div className="bb-team-detail-contacts">
      {member.email ? <a href={`mailto:${member.email}`}><Mail size={16} aria-hidden="true" /><span>{member.email}</span><ArrowUpRight size={14} aria-hidden="true" /></a> : null}
      {member.phone ? <a href={`tel:${member.phone.replace(/[^+\d]/g, '')}`}><Phone size={16} aria-hidden="true" /><span>{member.phone}</span><ArrowUpRight size={14} aria-hidden="true" /></a> : null}
      {!member.email && !member.phone ? <button type="button" onClick={onEdit}><Mail size={16} />Add contact details<ChevronRight size={14} /></button> : null}
    </div>
    <div className="bb-team-detail-metrics"><div><strong>{row.todayCount}</strong><span>Sessions today</span></div><div><strong>{formatTeamMinutes(row.scheduledMinutes)}</strong><span>Scheduled today</span></div><div><strong>{row.upcomingCount}</strong><span>Upcoming</span></div></div>
    <section className="bb-team-detail-section"><div className="bb-team-section-title"><h3>Services</h3><span>{row.services.length}</span></div>{row.services.length ? <div className="bb-team-service-tags">{row.services.map(service => <span key={service.id}>{service.name}{service.active === false ? ' · Inactive' : ''}</span>)}</div> : <p className="bb-team-detail-empty">No services assigned yet.</p>}</section>
    <section className="bb-team-detail-section"><div className="bb-team-section-title"><h3>Weekly availability</h3><Clock3 size={15} aria-hidden="true" /></div><div className="bb-team-week">{WEEKDAY_KEYS.map(day => <div key={day} className={availability.weekTemplate[day].open ? 'is-open' : ''}><span>{day.slice(0, 1).toUpperCase()}</span><i aria-hidden="true" /></div>)}</div><p className="bb-team-week-note">Regular working days. Date changes and leave are managed in availability.</p><Button action="calendar" icon={CalendarDays} onClick={onAvailability} className="bb-team-availability-action">Manage availability</Button></section>
    <section className="bb-team-detail-section"><div className="bb-team-section-title"><h3>Next booking</h3><CalendarDays size={15} aria-hidden="true" /></div>{row.next ? <div className="bb-team-next"><span>{nextDate} · {row.next.time}</span><strong>{row.next.serviceName}</strong><p>{row.next.clientName}</p></div> : <p className="bb-team-detail-empty">No upcoming confirmed bookings.</p>}</section>
    {member.notes ? <section className="bb-team-detail-section"><div className="bb-team-section-title"><h3>Team notes</h3></div><p className="bb-team-notes">{member.notes}</p></section> : null}
    <div className="bb-team-detail-access"><ShieldCheck size={15} aria-hidden="true" /><span>{member.accessRole === 'Owner' ? 'Business owner profile' : 'Roster profile · no account access'}</span></div>
    {member.accessRole !== 'Owner' ? <div className="bb-team-detail-lifecycle">{confirming ? <div className="bb-team-deactivate-confirm"><strong>Deactivate {member.name.split(' ')[0]}?</strong><p>Keep their bookings, service assignments and history. Reactivate them whenever needed.</p><div><Button action="cancel" onClick={() => setConfirming(false)}>Keep active</Button><Button action="confirm" variant="destructive" onClick={() => { onDeactivate(false); setConfirming(false); }}>Deactivate</Button></div></div> : <button type="button" className="bb-team-lifecycle-button" onClick={() => active ? setConfirming(true) : onDeactivate(true)}>{active ? 'Deactivate member' : 'Reactivate member'}</button>}</div> : null}
  </aside>;
}

export function TeamsPage() {
  const { staff = [], services = [], bookings = [], workspace = {}, upsertStaff, upsertService, upsertStaffAvailability, updateAvailabilityRules, saveStatus, saveError, saveConflict, retrySave, reviewSaveConflict } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [selectedId, setSelectedId] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [editor, setEditor] = useState(null);
  const [availabilityId, setAvailabilityId] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (mobileDetail && window.matchMedia('(max-width: 820px)').matches) scrollAppToTop(); }, [mobileDetail, selectedId]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(''), 4500); return () => window.clearTimeout(timer); }, [notice]);
  const overview = useMemo(() => buildTeamOverview({ staff, services, bookings, workspace, now }), [staff, services, bookings, workspace, now]);
  const visible = useMemo(() => filterTeamMembers(staff, query, filter), [staff, query, filter]);
  const selected = overview.members.find(row => row.member.id === selectedId) || overview.members.find(row => row.member.id === visible[0]?.id) || null;
  const dateLabel = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${overview.todayKey}T12:00:00Z`));
  const saveMember = (member, assigned, baseline) => {
    if (member.id && (JSON.stringify(staff.find(person => person.id === member.id)) !== baseline.member || services.filter(service => (service.staffIds || []).includes(member.id)).map(service => service.id).sort().join('|') !== baseline.assigned)) {
      throw new Error('This team profile changed while you were editing. Close it and reopen the latest details before updating.');
    }
    const next = { ...member, id: member.id || `staff-${crypto.randomUUID()}`, accessRole: member.accessRole || 'Staff' };
    upsertStaff(next);
    teamServiceChanges(services, next.id, assigned).forEach(upsertService);
    setSelectedId(next.id);
    setFilter(isTeamMemberActive(next) ? 'active' : 'inactive');
    setQuery('');
    setEditor(null);
    setNotice(member.id ? 'Team profile updated.' : `${next.name} added to your team.`);
  };
  const activate = active => {
    if (!selected) return;
    upsertStaff({ ...selected.member, active });
    setFilter(active ? 'active' : 'inactive');
    setNotice(`${selected.member.name} ${active ? 'reactivated' : 'deactivated'}.`);
  };
  return <div className={`bb-teams-page${mobileDetail ? ' is-detail-open' : ''}`}>
    <header className="bb-teams-header"><div><div className="bb-page-title-wrap"><PageBackButton /><span className="bb-page-title-main"><div className="bb-page-header-glow" aria-hidden="true" /><h1 className="bb-page-title">Team</h1></span></div><p>The people behind your business.</p></div><Button action="add" icon={UserPlus} variant="primary" onClick={() => setEditor({})}>Add member</Button></header>
    {(saveError || saveConflict) ? <div className="bb-team-save-error" role="alert"><p>{saveConflict ? 'Your team changes need a review because this workspace changed elsewhere.' : saveError}</p><Button action="retry" onClick={saveConflict ? reviewSaveConflict : retrySave}>{saveConflict ? 'Review changes' : 'Retry save'}</Button></div> : null}
    <div className="bb-team-stats" aria-label={`Team overview for ${dateLabel}`}><div><span><Users size={16} />Active team</span><strong>{overview.counts.active}<small>{overview.counts.inactive ? `${overview.counts.inactive} inactive` : 'Your people'}</small></strong></div><div><span><Clock3 size={16} />On shift now</span><strong>{overview.counts.onShift}<small>From availability</small></strong></div><div><span><CalendarDays size={16} />Sessions today</span><strong>{overview.counts.sessions}<small>{dateLabel}</small></strong></div><div className={overview.counts.unassigned ? 'needs-attention' : ''}><span><BriefcaseBusiness size={16} />Unassigned today</span><strong>{overview.counts.unassigned}<small>{overview.counts.unassigned ? 'Review your schedule' : 'All assigned'}</small></strong></div></div>
    <div className="bb-team-workspace"><section className="bb-team-roster" aria-label="Team roster"><div className="bb-team-toolbar"><label className="bb-team-search"><Search size={17} aria-hidden="true" /><input aria-label="Search team" placeholder="Search your team" value={query} onChange={event => setQuery(event.target.value)} />{query ? <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button> : null}</label><div className="bb-team-filters" role="group" aria-label="Member status">{['active', 'inactive', 'all'].map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === 'all' ? 'All' : key === 'active' ? 'Active' : 'Inactive'}<span>{overview.counts[key]}</span></button>)}</div></div>
      <div className="bb-team-roster-heading"><h2>Your people <span>{visible.length}</span></h2><span>{saveStatus === 'saving' ? 'Saving changes…' : workspace.isDemo ? 'Saved on this device' : 'Business roster'}</span></div>
      {visible.length ? <div className="bb-team-grid">{visible.map(member => {
        const row = overview.members.find(item => item.member.id === member.id);
        return <button type="button" key={member.id} className={`bb-team-card${selected?.member.id === member.id ? ' is-selected' : ''}${isTeamMemberActive(member) ? '' : ' is-inactive'}`} aria-pressed={selected?.member.id === member.id} aria-label={`View ${member.name}`} onClick={() => { setSelectedId(member.id); setMobileDetail(true); }}><div className="bb-team-card-top"><TeamAvatar member={member} /><MemberStatus status={row.status} /></div><h3>{member.name}</h3><p>{member.role || 'Team member'}</p><div className="bb-team-card-services"><BriefcaseBusiness size={14} aria-hidden="true" /><span>{row.services.length ? `${row.services.length} service${row.services.length === 1 ? '' : 's'} assigned` : 'No services assigned'}</span><ChevronRight size={14} aria-hidden="true" /></div><div className="bb-team-card-footer"><span><CalendarDays size={14} aria-hidden="true" /><strong>{row.todayCount}</strong>today</span><span>{row.next ? `Next ${row.next.dateKey === overview.todayKey ? row.next.time : row.next.dateKey.slice(5)}` : 'No upcoming bookings'}</span></div></button>;
      })}</div> : <div className="bb-team-empty"><span className="bb-team-empty-icon"><Users size={28} /></span><h3>{staff.length ? 'No matching people' : 'Build your team'}</h3><p>{staff.length ? 'Try another name or change the status filter.' : 'Add your first team member, assign their services and set up their availability.'}</p><Button action={staff.length ? 'clear' : 'add'} onClick={() => staff.length ? (setQuery(''), setFilter('all')) : setEditor({})}>{staff.length ? 'Clear filters' : 'Add your first member'}</Button></div>}
      <div className="bb-team-roster-footnote"><ShieldCheck size={15} aria-hidden="true" /><p>Roster profiles organise services and schedules. They don’t grant sign-in access.</p><button type="button" onClick={() => navigate(workspacePagePath('schedule'))}>Open schedule<ArrowUpRight size={14} /></button></div>
    </section><TeamDetail row={selected ? { ...selected, todayKey: overview.todayKey } : null} workspace={workspace} onEdit={() => setEditor(selected.member)} onAvailability={() => setAvailabilityId(selected.member.id)} onDeactivate={activate} onBack={() => setMobileDetail(false)} /></div>
    {notice ? <div className="bb-team-notice" role="status"><Check size={16} aria-hidden="true" />{notice}</div> : null}
    {editor ? <TeamEditor key={editor.id || 'new-member'} member={editor} services={services} onClose={() => setEditor(null)} onSave={saveMember} /> : null}
    {availabilityId ? <AppSheet title="Team availability" lede="Manage working hours, date changes and leave." onClose={() => setAvailabilityId('')} panelClassName="bb-team-availability-sheet"><ScheduleAvailabilityEditor staff={staff} staffId={availabilityId} onStaffIdChange={setAvailabilityId} staffAvailability={workspace.staffAvailability || {}} availabilityRules={workspace.availabilityRules || {}} onSaveEntry={upsertStaffAvailability} onUpdateRules={updateAvailabilityRules} /></AppSheet> : null}
  </div>;
}
