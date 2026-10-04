import { useState } from 'react';
import { Button } from './Button';
import { FilterChip } from './FilterChip';
import { StatusBadge } from './StatusBadge';
import { DateField } from './DateField';
import { TimeField } from './TimeField';
import { PeriodSegmentedControl } from './PeriodSegmentedControl';

/** Local-only review surface; no workspace data or server writes. */
export function ControlReview() {
  const [filter, setFilter] = useState('pending');
  const [period, setPeriod] = useState('week');
  const [date, setDate] = useState('2026-10-03');
  const [time, setTime] = useState('09:00');
  const [notice, setNotice] = useState('');
  const [selectedAction, setSelectedAction] = useState(false);
  return <main className="bb-control-review native-ui">
    <header className="bb-page-title-wrap"><div><div className="bb-page-header-glow" aria-hidden="true" /><h1 className="bb-page-title">One family. Clear purpose.</h1><p>Local design review · no live actions</p></div></header>
    <section><h2>Actions</h2><div className="bb-control-review-row">
      <Button action="save" variant="primary" onClick={() => setNotice('Save preview selected')}>Save changes</Button>
      <Button action="view" onClick={() => setNotice('View preview selected')}>View file</Button>
      <Button action="accept" variant="positive" onClick={() => setNotice('Accept preview selected')}>Accept booking</Button>
      <Button action="decline" variant="destructive" onClick={() => setNotice('Decline preview selected')}>Decline</Button>
      <Button action="connect" disabled>Connect unavailable</Button>
      <Button action="save" variant="primary" busy busyLabel="Saving…">Save changes</Button>
    </div><p>Resting actions keep a quiet border. Hover an action to see the native accent; the selected example keeps it.</p><div className="bb-control-review-row"><Button action="edit" variant="primary" selected={selectedAction} aria-pressed={selectedAction} onClick={() => setSelectedAction((value) => !value)}>Selected example</Button><Button action="chat">Open chat</Button><Button action="download">Download file</Button><Button action="refresh">Refresh</Button></div><p role="status">{notice}</p></section>
    <section><h2>Filters</h2><div className="bb-control-review-row">{[['pending','Pending',2],['confirmed','Confirmed',120],['waitlist','Waitlist',0],['reschedule','Reschedule requested',12345]].map(([id,label,count])=><FilterChip key={id} selected={filter===id} count={count} onClick={()=>setFilter(filter===id?'':id)}>{label}</FilterChip>)}</div></section>
    <section><h2>Fields</h2><div className="bb-control-review-fields">
      <label>Name<input className="native-control-input" placeholder="Your name" /></label>
      <label>Reference<input className="native-control-input" value="Read-only example" readOnly /></label>
      <label>Service<select defaultValue="appointment"><option value="appointment">Appointment</option><option value="class">Class</option></select></label>
      <label>Unavailable<input className="native-control-input" disabled placeholder="Disabled field" /></label>
      <DateField label="Date" value={date} onChange={setDate} />
      <TimeField label="Time" value={time} onChange={setTime} />
    </div></section>
    <section><h2>Statuses</h2><div className="bb-control-review-row">{['confirmed','accepted','paid','pending','awaiting payment','shipped','processing','reschedule requested','waitlisted','cancelled','failed','draft'].map(status=><StatusBadge key={status} status={status} label={status[0].toUpperCase()+status.slice(1)} />)}</div></section>
    <section><h2>Your period toggle</h2><PeriodSegmentedControl variant="period" value={period} onChange={setPeriod} options={[{id:'all',label:'All time',shortLabel:'All'},{id:'day',label:'Day'},{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'custom',label:'Custom'}]} /></section>
  </main>;
}
