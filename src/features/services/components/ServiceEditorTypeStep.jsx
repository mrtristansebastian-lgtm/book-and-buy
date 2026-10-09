import { CalendarClock, UsersRound, Ticket, Check, ArrowUpRight } from 'lucide-react';
import { getServiceBookingFormat } from '../../../../functions/serviceTemplates';

export function ServiceEditorTypeStep({ draft, patch }) {
  const selected = draft.id ? getServiceBookingFormat(draft) : draft.bookingFormat;
  const types = [
    { id: 'slot', label: 'Slot', icon: CalendarClock, title: 'A time just for them.', description: 'Clients choose an available time for an appointment or one-to-one service.', hint: 'Availability · Duration · Team' },
    { id: 'spot', label: 'Spot', icon: UsersRound, title: 'A place in your session.', description: 'Clients reserve a place in a class, workshop or programme with a shared start time.', hint: 'Session dates · Price per spot · Capacity' },
    { id: 'event', label: 'Event', icon: Ticket, title: 'An occasion worth attending.', description: 'Sell admission to a scheduled event with a venue, ticket options and attendee capacity.', hint: 'Event dates · Tickets · Venue' }
  ];
  const choose = id => {
    if (draft.id || selected === id) return;
    patch({ bookingFormat: id, scheduleType: id === 'slot' ? 'appointment' : 'class_session', capacity: id === 'slot' ? '1' : String(Number(draft.capacity) > 1 ? draft.capacity : 8),
      catalogTemplateId: '', exploreMainCategoryId: '', exploreSubcategoryId: '',
      variants: (draft.variants || []).map(variant => ({ ...variant, minDuration: id === 'slot' ? variant.minDuration || draft.duration || '60' : '' })) });
  };
  return <section className="bb-services-section">
    <h3 className="bb-services-section-title">How will clients book?</h3>
    <p className="bb-services-section-lede">Choose the format first. We’ll guide you through the right setup.</p>
    <div className="bb-service-format-choices" role="group" aria-label="Service type">{types.map(type => {
      const Icon = type.icon;
      return <button key={type.id} type="button" className={`bb-service-format-choice${selected === type.id ? ' is-selected' : ''}`} aria-label={type.label} aria-pressed={selected === type.id} disabled={Boolean(draft.id) && selected !== type.id} onClick={() => choose(type.id)}>
        <span className="bb-service-format-top"><span className="bb-service-format-icon"><Icon size={24} strokeWidth={1.5}/></span><span className="bb-service-format-check">{selected === type.id ? <Check size={17}/> : <ArrowUpRight size={17}/>}</span></span>
        <strong>{type.label}</strong><span className="bb-service-format-title">{type.title}</span><span className="bb-service-format-description">{type.description}</span><small>{type.hint}</small>
      </button>;
    })}</div>
    {draft.id && <p className="bb-services-field-hint">Your existing booking format stays the same. Create a separate service for a different booking format.</p>}
  </section>;
}
