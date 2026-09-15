import { BUSINESS_AVAILABILITY_ID } from '../../../utils/staffAvailability';
import { staffInitials, staffPhoto } from './availabilityEditorUtils';

export function StaffAvailabilitySwitcher({
  staff = [],
  staffId = '',
  onSelect,
  businessName = 'Business',
  businessLogoUrl = '',
  showBusiness = true
}) {
  if (!showBusiness && !staff.length) return null;
  return (
    <div className="bb-schedule-avail-avatars" role="tablist" aria-label="Availability profile">
      {showBusiness ? (
        <button
          type="button"
          role="tab"
          aria-selected={staffId === BUSINESS_AVAILABILITY_ID}
          aria-label={businessName || 'Business'}
          title={businessName || 'Business'}
          className={`bb-schedule-avail-avatar is-business${
            staffId === BUSINESS_AVAILABILITY_ID ? ' is-active' : ''
          }`}
          style={{ '--staff-color': '#0f766e' }}
          onClick={() => onSelect?.(BUSINESS_AVAILABILITY_ID)}
        >
          <span className="bb-schedule-avail-avatar-face">
            {businessLogoUrl ? (
              <img src={businessLogoUrl} alt="" />
            ) : (
              staffInitials(businessName || 'Business')
            )}
          </span>
          <span className="bb-schedule-avail-avatar-name">{businessName || 'Business'}</span>
        </button>
      ) : null}
      {staff.map((member) => {
        const photo = staffPhoto(member);
        const active = member.id === staffId;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={member.name}
            title={member.name}
            className={`bb-schedule-avail-avatar${active ? ' is-active' : ''}`}
            style={{ '--staff-color': member.color || '#101828' }}
            onClick={() => onSelect?.(member.id)}
          >
            <span className="bb-schedule-avail-avatar-face">
              {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
            </span>
            <span className="bb-schedule-avail-avatar-name">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
