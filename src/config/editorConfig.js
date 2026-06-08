export const editorStyleDirections = [
  {
    id: 'native-precision',
    label: 'Native Precision',
    summary: 'The cleanest all-rounder: iOS-like controls, calm rhythm, and strong booking clarity.',
    settings: {
      logoDisplay: { visible: true, alignment: 'left', size: 104, placement: 'badge' },
      bannerDisplay: { visible: true, height: 190, position: 'center', placement: 'top', opacity: 100 },
      serviceDisplayStyle: 'compact',
      serviceDropdownEnabled: true,
      serviceBorderStyle: 'solid',
      calendarDisplayStyle: 'studio',
      dateStyle: 'solid',
      calendarShadow: true,
      calendarGlow: false,
      timeDisplayStyle: 'pill',
      timeSlotStyle: 'solid',
      availabilityStyle: 'solid',
      timeSlotShadow: true,
      timeSlotGlow: false,
      actionButtonStyle: 'solid',
      buttonStyle: 'pill',
      faqDisplayStyle: 'accordion',
      faqStyle: 'minimal',
      venueGalleryStyle: 'mosaic',
      mapDisplayStyle: 'card',
      socialDisplayStyle: 'icons',
      socialIconStyle: 'outline'
    },
    sections: ['Dropdown services', 'Native calendar', 'Pill slots', 'Accordion FAQ', 'Pill action', 'Mosaic venue', 'Icon socials']
  },
  {
    id: 'command-flow',
    label: 'Command Flow',
    summary: 'Fast and operational: compact decisions, high signal states, and a stronger app-like footer system.',
    settings: {
      logoDisplay: { visible: true, alignment: 'left', size: 104, placement: 'badge' },
      bannerDisplay: { visible: true, height: 190, position: 'center', placement: 'top', opacity: 100 },
      serviceDisplayStyle: 'compact',
      serviceDropdownEnabled: true,
      serviceBorderStyle: 'solid',
      calendarDisplayStyle: 'compact',
      dateStyle: 'solid',
      calendarShadow: false,
      calendarGlow: true,
      timeDisplayStyle: 'blocks',
      timeSlotStyle: 'solid',
      availabilityStyle: 'solid',
      timeSlotShadow: true,
      timeSlotGlow: true,
      actionButtonStyle: 'solid',
      buttonStyle: 'pill',
      faqDisplayStyle: 'accordion',
      faqStyle: 'minimal',
      venueGalleryStyle: 'filmstrip',
      mapDisplayStyle: 'dock',
      socialDisplayStyle: 'dock',
      socialIconStyle: 'solid'
    },
    sections: ['Dropdown services', 'Compact calendar', 'Session blocks', 'Accordion FAQ', 'Fast action', 'Venue reel', 'Social dock']
  }
];

export const getEditorStyleDirection = (directionId) => (
  editorStyleDirections.find(direction => direction.id === directionId) || editorStyleDirections[0]
);

export const defaultFaqItems = [
  { q: 'How do I know my booking is confirmed?', a: 'You will see a confirmation on this page and receive a message when the business approves your request.' },
  { q: 'Can I join a waitlist if the day is full?', a: 'Yes. If waitlist is enabled, you can leave your details and the business can contact you when a slot opens.' }
];

export const fontStylePresets = [
  {
    id: 'native',
    label: 'Native',
    note: 'Build A Booking modern',
    fontFamily: 'figtree',
    headingFontFamily: 'plus-jakarta',
    bodyFontFamily: 'figtree',
    buttonFontFamily: 'space-grotesk',
    slotFontFamily: 'plus-jakarta',
    dateFontFamily: 'plus-jakarta',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'studio',
    label: 'Studio',
    note: 'Creative sans',
    fontFamily: 'outfit',
    headingFontFamily: 'outfit',
    bodyFontFamily: 'dm-sans',
    buttonFontFamily: 'outfit',
    slotFontFamily: 'dm-sans',
    dateFontFamily: 'outfit',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'boutique',
    label: 'Boutique',
    note: 'Soft premium',
    fontFamily: 'manrope',
    headingFontFamily: 'bricolage',
    bodyFontFamily: 'manrope',
    buttonFontFamily: 'manrope',
    slotFontFamily: 'manrope',
    dateFontFamily: 'bricolage',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.2
  },
  {
    id: 'impact',
    label: 'Impact',
    note: 'Confident brand',
    fontFamily: 'urbanist',
    headingFontFamily: 'urbanist',
    bodyFontFamily: 'figtree',
    buttonFontFamily: 'space-grotesk',
    slotFontFamily: 'space-grotesk',
    dateFontFamily: 'urbanist',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'friendly',
    label: 'Friendly',
    note: 'Warm modern',
    fontFamily: 'figtree',
    headingFontFamily: 'lexend',
    bodyFontFamily: 'figtree',
    buttonFontFamily: 'figtree',
    slotFontFamily: 'lexend',
    dateFontFamily: 'lexend',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'precision',
    label: 'Precision',
    note: 'Tech calm',
    fontFamily: 'ibm-plex-sans',
    headingFontFamily: 'space-grotesk',
    bodyFontFamily: 'ibm-plex-sans',
    buttonFontFamily: 'ibm-plex-sans',
    slotFontFamily: 'ibm-plex-sans',
    dateFontFamily: 'space-grotesk',
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.4
  }
];

export const editorPreviewFrames = {
  desktop: {
    full: { width: 1100, height: 720, maxScale: 0.84, minScale: 0.28, paddingX: 150, paddingY: 160 },
    compact: { width: 900, height: 380, maxScale: 0.92, minScale: 0.26, paddingX: 22, paddingY: 118 }
  },
  mobile: {
    full: { width: 470, height: 880, maxScale: 0.82, minScale: 0.28, paddingX: 96, paddingY: 146 },
    compact: { width: 360, height: 520, maxScale: 0.82, minScale: 0.3, paddingX: 20, paddingY: 106 }
  }
};

export const getEditorPreviewFrame = (device, compact) => {
  const frameSet = editorPreviewFrames[device] || editorPreviewFrames.desktop;
  return frameSet[compact ? 'compact' : 'full'];
};
