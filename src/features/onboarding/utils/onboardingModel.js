import { normalizeServiceList } from '../../../utils/services';

const weekdaySlots = ['09:00', '10:00', '11:30', '13:00', '14:30', '16:00'];
const eveningSlots = ['12:00', '14:00', '16:00', '18:00', '19:30'];
const weekendSlots = ['09:00', '10:30', '12:00', '13:30', '15:00'];

export const industryPresets = {
  salon: {
    label: 'Beauty salon',
    goal: 'Fill my calendar',
    tagline: 'Beauty bookings made simple',
    accent: '#16A34A',
    welcome: 'Choose your treatment and we will take care of the rest.',
    services: [
      { name: 'Signature Appointment', category: 'Beauty', description: 'A focused session with your preferred professional.', price: '450', duration: '60' },
      { name: 'Express Treatment', category: 'Beauty', description: 'A quicker option for clients who need a neat refresh.', price: '250', duration: '30' },
      { name: 'Consultation', category: 'Planning', description: 'A short visit to understand the client goal before booking.', price: '150', duration: '20' }
    ]
  },
  fitness: {
    label: 'Personal trainer or gym',
    goal: 'Book more sessions',
    tagline: 'Train with a plan',
    accent: '#F97316',
    welcome: 'Reserve a session and arrive ready to move.',
    services: [
      { name: 'Personal Training', category: 'Training', description: 'One-on-one coaching matched to your goals.', price: '350', duration: '60' },
      { name: 'Small Group Class', category: 'Classes', description: 'A high-energy session for a small focused group.', price: '120', duration: '45' },
      { name: 'Goal Check-in', category: 'Coaching', description: 'Review progress and plan the next training block.', price: '200', duration: '30' }
    ]
  },
  rentals: {
    label: 'Space rental business',
    goal: 'Reserve time slots',
    tagline: 'Reserve the space in minutes',
    accent: '#7C3AED',
    welcome: 'Pick a slot, add your details, and we will prepare the space.',
    services: [
      { name: 'Hourly Rental', category: 'Space', description: 'Book the space for a flexible hourly session.', price: '300', duration: '60' },
      { name: 'Half-day Booking', category: 'Space', description: 'Reserve a longer block for shoots, workshops, or meetings.', price: '950', duration: '240' },
      { name: 'Site Visit', category: 'Planning', description: 'View the space before confirming your larger booking.', price: '0', duration: '30' }
    ]
  },
  classes: {
    label: 'Class or workshop studio',
    goal: 'Organise attendees',
    tagline: 'Simple class reservations',
    accent: '#DB2777',
    welcome: 'Choose your class and we will save your spot.',
    services: [
      { name: 'Beginner Class', category: 'Classes', description: 'A friendly first session for new participants.', price: '180', duration: '60' },
      { name: 'Advanced Workshop', category: 'Workshops', description: 'A deeper session for returning clients.', price: '450', duration: '120' },
      { name: 'Private Lesson', category: 'Private', description: 'Individual help tailored to the client goal.', price: '500', duration: '60' }
    ]
  },
  barber: {
    label: 'Barber shop',
    goal: 'Keep chairs booked',
    tagline: 'Fresh cuts, easy bookings',
    accent: '#111827',
    welcome: 'Choose your barber service and grab a time that works.',
    services: [
      { name: 'Haircut', category: 'Barbering', description: 'A clean cut shaped to the client style.', price: '180', duration: '45' },
      { name: 'Cut & Beard', category: 'Barbering', description: 'Haircut plus beard trim and line-up.', price: '260', duration: '60' },
      { name: 'Kids Cut', category: 'Barbering', description: 'A simpler appointment for younger clients.', price: '130', duration: '30' }
    ]
  },
  spa: {
    label: 'Spa & massage',
    goal: 'Sell relaxing sessions',
    tagline: 'Relaxation reserved online',
    accent: '#14B8A6',
    welcome: 'Pick your treatment and arrive ready to unwind.',
    services: [
      { name: 'Full Body Massage', category: 'Massage', description: 'A restorative session for deep relaxation.', price: '650', duration: '60' },
      { name: 'Back & Neck Massage', category: 'Massage', description: 'Focused relief for common tension areas.', price: '420', duration: '30' },
      { name: 'Spa Package', category: 'Packages', description: 'A longer combined treatment experience.', price: '950', duration: '120' }
    ]
  },
  nails: {
    label: 'Nails & lashes',
    goal: 'Manage beauty appointments',
    tagline: 'Polished appointments',
    accent: '#EC4899',
    welcome: 'Choose your look and request your appointment.',
    services: [
      { name: 'Gel Manicure', category: 'Nails', description: 'Long-lasting colour and nail care.', price: '280', duration: '60' },
      { name: 'Lash Set', category: 'Lashes', description: 'A fresh lash application appointment.', price: '550', duration: '120' },
      { name: 'Fill / Touch-up', category: 'Maintenance', description: 'Maintain your previous set.', price: '320', duration: '75' }
    ]
  },
  tutor: {
    label: 'Tutor or lesson teacher',
    goal: 'Schedule learning time',
    tagline: 'Lessons booked in a few clicks',
    accent: '#F59E0B',
    welcome: 'Choose a lesson type and request your preferred time.',
    services: [
      { name: 'One-on-one Lesson', category: 'Tutoring', description: 'Focused support for one learner.', price: '280', duration: '60' },
      { name: 'Exam Prep Session', category: 'Tutoring', description: 'Targeted revision and practice.', price: '350', duration: '90' },
      { name: 'Group Lesson', category: 'Groups', description: 'A shared learning session for small groups.', price: '160', duration: '60' }
    ]
  },
  childcare: {
    label: 'Childcare activity provider',
    goal: 'Manage parent bookings',
    tagline: 'Kids activities made easy',
    accent: '#F43F5E',
    welcome: 'Choose an activity or care slot and send your request.',
    services: [
      { name: 'Activity Session', category: 'Activities', description: 'A structured session for children.', price: '150', duration: '60' },
      { name: 'Half-day Care', category: 'Care', description: 'A longer care block for busy parents.', price: '420', duration: '240' },
      { name: 'Holiday Program', category: 'Programs', description: 'Reserve a place in an upcoming program.', price: '750', duration: '360' }
    ]
  },
  venue: {
    label: 'Event venue',
    goal: 'Qualify event requests',
    tagline: 'Reserve the right space',
    accent: '#8B5CF6',
    welcome: 'Tell us what you need and request a venue slot.',
    services: [
      { name: 'Venue Viewing', category: 'Planning', description: 'Visit the venue before confirming an event.', price: '0', duration: '45' },
      { name: 'Half-day Event', category: 'Venue hire', description: 'Reserve the venue for a half-day event.', price: '2500', duration: '240' },
      { name: 'Full-day Event', category: 'Venue hire', description: 'Reserve the venue for a full-day event.', price: '4500', duration: '480' }
    ]
  },
  photography: {
    label: 'Photography studio',
    goal: 'Book shoots',
    tagline: 'Photo sessions made simple',
    accent: '#0F172A',
    welcome: 'Choose a shoot type and request your session.',
    services: [
      { name: 'Portrait Session', category: 'Photography', description: 'A focused shoot for individuals or couples.', price: '900', duration: '60' },
      { name: 'Family Shoot', category: 'Photography', description: 'A relaxed session for families.', price: '1400', duration: '90' },
      { name: 'Studio Rental', category: 'Studio', description: 'Book the studio for your own shoot.', price: '450', duration: '60' }
    ]
  },
  musicstudio: {
    label: 'Music or recording studio',
    goal: 'Book studio sessions',
    tagline: 'Record your vocals. Mix your sound.',
    accent: '#111827',
    welcome: 'Choose a studio session and request your time.',
    services: [
      { name: 'Recording Session', category: 'Studio', description: 'Book time in the studio for vocals or instruments.', price: '450', duration: '60' },
      { name: 'Mixing Session', category: 'Production', description: 'Reserve a focused mixing session for your track.', price: '900', duration: '120' },
      { name: 'Studio Consultation', category: 'Planning', description: 'Talk through your project before booking studio time.', price: '0', duration: '30' }
    ]
  },
  events: {
    label: 'Event service provider',
    goal: 'Manage enquiries',
    tagline: 'Event help without the admin',
    accent: '#D946EF',
    welcome: 'Choose the event support you need and request a slot.',
    services: [
      { name: 'Event Consultation', category: 'Planning', description: 'Discuss the event needs and next steps.', price: '350', duration: '45' },
      { name: 'Setup Crew Booking', category: 'Event support', description: 'Reserve a team for event setup.', price: '1200', duration: '180' },
      { name: 'Full Event Package', category: 'Packages', description: 'Request a quote for a complete event service.', price: '', priceType: 'quote', duration: '60' }
    ]
  },
  restaurant: {
    label: 'Restaurant & tastings',
    goal: 'Take table requests',
    tagline: 'Tables and tastings reserved',
    accent: '#DC2626',
    welcome: 'Choose your dining experience and request a time.',
    services: [
      { name: 'Table Reservation', category: 'Dining', description: 'Reserve a table for your party.', price: '0', duration: '90' },
      { name: 'Tasting Experience', category: 'Experiences', description: 'A curated tasting session.', price: '650', duration: '120' },
      { name: 'Private Dining Enquiry', category: 'Events', description: 'Request a private dining slot.', price: '', priceType: 'quote', duration: '60' }
    ]
  },
  accommodation: {
    label: 'Guest house or stay',
    goal: 'Handle stay enquiries',
    tagline: 'Stay requests made simple',
    accent: '#0284C7',
    welcome: 'Request a stay, viewing, or guest service.',
    services: [
      { name: 'Room Enquiry', category: 'Accommodation', description: 'Ask about room availability.', price: '', priceType: 'quote', duration: '30' },
      { name: 'Property Viewing', category: 'Viewing', description: 'View the property before booking.', price: '0', duration: '45' },
      { name: 'Guest Service Slot', category: 'Guest services', description: 'Reserve a service during your stay.', price: '250', duration: '30' }
    ]
  },
  cleaning: {
    label: 'Cleaning services',
    goal: 'Schedule site work',
    tagline: 'Cleaning slots without back-and-forth',
    accent: '#22C55E',
    welcome: 'Choose a cleaning service and request your slot.',
    services: [
      { name: 'Standard Clean', category: 'Cleaning', description: 'Routine cleaning for a home or small office.', price: '500', duration: '120' },
      { name: 'Deep Clean', category: 'Cleaning', description: 'A detailed clean for tougher jobs.', price: '950', duration: '240' },
      { name: 'Site Assessment', category: 'Planning', description: 'Assess the site before confirming the work.', price: '0', duration: '30' }
    ]
  },
  trades: {
    label: 'Repair or trade service',
    goal: 'Qualify jobs faster',
    tagline: 'Repair visits made easier',
    accent: '#EA580C',
    welcome: 'Choose the job type and request a visit.',
    services: [
      { name: 'Call-out Visit', category: 'Repairs', description: 'A site visit to inspect the job.', price: '350', duration: '60' },
      { name: 'Small Repair', category: 'Repairs', description: 'Book time for a smaller repair task.', price: '650', duration: '120' },
      { name: 'Quote Appointment', category: 'Quotes', description: 'Assess a larger job before quoting.', price: '0', duration: '45' }
    ]
  },
  automotive: {
    label: 'Automotive services',
    goal: 'Book vehicle slots',
    tagline: 'Vehicle care on schedule',
    accent: '#334155',
    welcome: 'Choose the vehicle service and request a time.',
    services: [
      { name: 'Vehicle Inspection', category: 'Auto', description: 'A check before service or repair.', price: '350', duration: '45' },
      { name: 'Car Wash & Detail', category: 'Detailing', description: 'Exterior and interior cleaning.', price: '450', duration: '90' },
      { name: 'Service Booking', category: 'Service', description: 'Reserve a workshop slot for your vehicle.', price: '', priceType: 'quote', duration: '120' }
    ]
  },
  petcare: {
    label: 'Pet care & grooming',
    goal: 'Book pets safely',
    tagline: 'Pet appointments, less admin',
    accent: '#A16207',
    welcome: 'Choose the service your pet needs and request a time.',
    services: [
      { name: 'Pet Grooming', category: 'Grooming', description: 'A grooming appointment for your pet.', price: '420', duration: '90' },
      { name: 'Pet Care Check', category: 'Care', description: 'A simple grooming or care check.', price: '300', duration: '30' },
      { name: 'Pet Sitting Meet-up', category: 'Sitting', description: 'Meet before confirming pet sitting.', price: '0', duration: '30' }
    ]
  },
  consulting: {
    label: 'Consultant or advisor',
    goal: 'Book discovery calls',
    tagline: 'Consultations without calendar chaos',
    accent: '#4F46E5',
    welcome: 'Choose a consultation type and request your time.',
    services: [
      { name: 'Discovery Call', category: 'Consulting', description: 'A first call to understand the client need.', price: '0', duration: '30' },
      { name: 'Strategy Session', category: 'Consulting', description: 'A focused session for planning and decisions.', price: '1200', duration: '90' },
      { name: 'Follow-up Session', category: 'Consulting', description: 'Continue work after the first consultation.', price: '750', duration: '60' }
    ]
  },
  realestate: {
    label: 'Real estate & viewings',
    goal: 'Schedule property visits',
    tagline: 'Property viewings made simple',
    accent: '#059669',
    welcome: 'Choose a property service and request a viewing time.',
    services: [
      { name: 'Property Viewing', category: 'Viewings', description: 'Book a time to view the property.', price: '0', duration: '45' },
      { name: 'Valuation Visit', category: 'Valuation', description: 'Schedule a property valuation appointment.', price: '0', duration: '60' },
      { name: 'Buyer Consultation', category: 'Consultation', description: 'Discuss requirements and next steps.', price: '0', duration: '30' }
    ]
  },
  creative: {
    label: 'Creative studio',
    goal: 'Book project calls',
    tagline: 'Creative work starts with a slot',
    accent: '#9333EA',
    welcome: 'Choose the creative support you need and request a time.',
    services: [
      { name: 'Creative Brief Call', category: 'Planning', description: 'Talk through the project direction.', price: '0', duration: '30' },
      { name: 'Design Session', category: 'Design', description: 'A focused creative working session.', price: '850', duration: '90' },
      { name: 'Project Review', category: 'Review', description: 'Review progress and feedback.', price: '450', duration: '45' }
    ]
  },
  nonprofit: {
    label: 'Community organisation',
    goal: 'Coordinate people',
    tagline: 'Community sessions organised',
    accent: '#15803D',
    welcome: 'Choose a session, meeting, or support slot.',
    services: [
      { name: 'Community Session', category: 'Community', description: 'Reserve a place in a community session.', price: '0', duration: '60' },
      { name: 'Volunteer Meeting', category: 'Volunteers', description: 'Schedule a meeting with volunteers.', price: '0', duration: '45' },
      { name: 'Support Appointment', category: 'Support', description: 'Request a private support slot.', price: '0', duration: '30' }
    ]
  },
  custom: {
    label: 'Something else',
    goal: 'Get set up faster',
    tagline: 'Bookings made easier',
    accent: '#111827',
    welcome: 'Choose a service and send your request.',
    services: [
      { name: 'Standard Booking', category: 'Appointments', description: 'Your main appointment or reservation option.', price: '350', duration: '60' },
      { name: 'Quick Session', category: 'Appointments', description: 'A shorter option for simple requests.', price: '200', duration: '30' }
    ]
  }
};

export const industryGroups = [
  {
    id: 'beauty',
    label: 'Beauty & self-care',
    description: 'Salons, grooming, massage, nails, lashes, and personal care.',
    businessTypes: ['salon', 'barber', 'spa', 'nails']
  },
  {
    id: 'fitness_learning',
    label: 'Fitness, classes & learning',
    description: 'Training sessions, workshops, lessons, tutoring, and kids activities.',
    businessTypes: ['fitness', 'classes', 'tutor', 'childcare']
  },
  {
    id: 'spaces_events',
    label: 'Spaces, events & hospitality',
    description: 'Venues, rentals, shoots, restaurants, stays, and event services.',
    businessTypes: ['rentals', 'venue', 'photography', 'musicstudio', 'events', 'restaurant', 'accommodation']
  },
  {
    id: 'home_vehicle_pets',
    label: 'Home, vehicle & pet services',
    description: 'Cleaning, repairs, trades, automotive work, and pet appointments.',
    businessTypes: ['cleaning', 'trades', 'automotive', 'petcare']
  },
  {
    id: 'professional',
    label: 'Professional & creative',
    description: 'Consulting, real estate, creative studios, and community services.',
    businessTypes: ['consulting', 'realestate', 'creative', 'nonprofit', 'custom']
  }
];

export const getIndustryGroupForBusinessType = (businessType = 'custom') => (
  industryGroups.find(group => group.businessTypes.includes(businessType)) || industryGroups[0]
);

export const availabilityPresets = {
  weekdays: {
    label: 'Default schedule',
    availableTimes: weekdaySlots,
    schedule: {
      monday: weekdaySlots,
      tuesday: weekdaySlots,
      wednesday: weekdaySlots,
      thursday: weekdaySlots,
      friday: weekdaySlots
    }
  },
  evenings: {
    label: 'Later hours',
    availableTimes: eveningSlots,
    schedule: {
      monday: eveningSlots,
      tuesday: eveningSlots,
      wednesday: eveningSlots,
      thursday: eveningSlots
    }
  },
  weekends: {
    label: 'Weekend hours',
    availableTimes: weekendSlots,
    schedule: {
      saturday: weekendSlots,
      sunday: weekendSlots
    }
  },
  flexible: {
    label: 'Flexible starter',
    availableTimes: weekdaySlots,
    schedule: {
      monday: weekdaySlots,
      wednesday: weekdaySlots,
      friday: weekdaySlots,
      saturday: weekendSlots
    }
  }
};

export const getOnboardingStatus = ({ settings = {}, user, workspaceRole = 'guest', forceOpen = false }) => {
  const canRun = Boolean(user && (workspaceRole === 'owner' || workspaceRole === 'admin'));
  const completed = Boolean(settings.onboardingCompletedAt);
  const skipped = Boolean(settings.onboardingSkippedAt);
  return {
    canRun,
    completed,
    skipped,
    shouldShow: Boolean(forceOpen || (canRun && !completed && !skipped))
  };
};

export const createIndustryPreset = (industryId = 'custom') => (
  industryPresets[industryId] || industryPresets.custom
);

export const buildOnboardingDefaults = (draft = {}, currentSettings = {}) => {
  const industry = draft.industry || currentSettings.serviceIndustry || 'custom';
  const preset = createIndustryPreset(industry);
  const availability = availabilityPresets[draft.availability] || availabilityPresets.weekdays;
  const brandName = String(draft.brandName || currentSettings.brandName || 'Your Business').trim();
  const accent = draft.accent || preset.accent;
  const businessDescription = String(draft.businessDescription || currentSettings.businessDescription || draft.welcomeMessage || preset.welcome || '').trim();
  const personalProfileKey = draft.personalProfileKey || '';
  const existingPersonalProfile = personalProfileKey
    ? currentSettings.accountProfiles?.[personalProfileKey] || {}
    : {};
  const personalPhone = String(draft.personalPhoneNumber || '').trim()
    ? [draft.personalPhoneDialCode, draft.personalPhoneNumber].filter(Boolean).join(' ')
    : String(draft.personalPhone || existingPersonalProfile.mobile || existingPersonalProfile.phone || '').trim();
  const personalProfile = personalProfileKey
    ? {
        ...existingPersonalProfile,
        uid: draft.personalUid || existingPersonalProfile.uid || '',
        firstName: String(draft.personalFirstName || existingPersonalProfile.firstName || '').trim(),
        lastName: String(draft.personalLastName || existingPersonalProfile.lastName || '').trim(),
        email: String(draft.personalEmail || existingPersonalProfile.email || '').trim(),
        mobile: personalPhone,
        phone: personalPhone,
        country: String(draft.personalCountry || existingPersonalProfile.country || '').trim(),
        updatedAt: Date.now()
      }
    : null;
  const selectedServices = Array.isArray(draft.services) && draft.services.length
    ? draft.services
    : (Array.isArray(currentSettings.services) ? currentSettings.services : []);
  const defaultSlots = Array.isArray(draft.defaultSlots) && draft.defaultSlots.length
    ? draft.defaultSlots
    : availability.availableTimes;
  const existingFeatures = currentSettings.features || {};
  const bookingRules = draft.rules || {};

  return {
    ...(personalProfileKey && personalProfile ? {
      accountProfiles: {
        ...(currentSettings.accountProfiles || {}),
        [personalProfileKey]: personalProfile
      }
    } : {}),
    brandName,
    slug: brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || currentSettings.slug || 'your-business',
    tagline: draft.tagline || preset.tagline,
    businessDescription,
    welcomeMessage: businessDescription || draft.welcomeMessage || preset.welcome,
    businessEmail: draft.businessEmail || currentSettings.businessEmail || '',
    venuePhotos: Array.isArray(draft.venuePhotos) && draft.venuePhotos.length
      ? draft.venuePhotos
      : currentSettings.venuePhotos || [],
    address: draft.address || currentSettings.address || '',
    mapPlace: draft.mapPlace || currentSettings.mapPlace || null,
    locationMode: draft.locationMode || currentSettings.locationMode || 'my_location',
    primaryColor: accent,
    dateActiveBgColor: accent,
    serviceIndustry: industry,
    commerceTypes: Array.isArray(draft.commerceTypes) && draft.commerceTypes.length
      ? draft.commerceTypes
      : currentSettings.commerceTypes || ['bookable_service'],
    services: normalizeServiceList(selectedServices.map((service, index) => ({
      ...service,
      id: service.id || `onboarding-service-${industry}-${index + 1}`,
      currency: service.currency || currentSettings.currency || 'R',
      priceType: service.priceType || 'fixed',
      active: true
    }))),
    availableTimes: defaultSlots,
    schedule: Object.fromEntries(Object.keys(availability.schedule || {}).map(day => [day, defaultSlots])),
    availabilityRules: {
      ...(currentSettings.availabilityRules || {}),
      enabled: true,
      scheduleMode: ['time_slots', 'first_come'].includes(bookingRules.scheduleMode)
        ? bookingRules.scheduleMode
        : 'time_slots',
      holdMode: bookingRules.holdMode || 'pending_confirmed',
      bookingNotice: bookingRules.bookingNotice || '',
      maxAdvanceBooking: bookingRules.maxAdvanceBooking || '',
      cancellationWindow: bookingRules.cancellationWindow || '',
      reschedulingAllowed: bookingRules.reschedulingAllowed !== false,
      repeatBookingsAllowed: false
    },
    reminders: {
      enabled: true,
      client24h: true,
      client2h: true
    },
    features: {
      ...existingFeatures,
      waitlist: bookingRules.waitlist !== false,
      collectClientName: true,
      collectClientPhone: true,
      collectClientEmail: true,
      collectClientNotes: true,
      emailUpdates: true,
      faqEnabled: existingFeatures.faqEnabled !== false,
      socialLinks: Boolean(currentSettings.socials?.instagram || currentSettings.socials?.website)
    },
    onboardingChecklist: {
      industry: true,
      brand: true,
      services: true,
      availability: true,
      rules: true,
      publish: true,
      paymentsRecommended: true,
      notificationsRecommended: true,
      googleCalendarRecommended: true,
      teamRecommended: true,
      migrationRecommended: true
    },
    onboardingCompletedAt: Date.now(),
    onboardingSkippedAt: 0
  };
};
