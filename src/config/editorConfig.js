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
    brandNameFontFamily: 'plus-jakarta',
    brandNameSize: 76,
    taglineFontFamily: 'figtree',
    taglineSize: 9,
    welcomeFontFamily: 'figtree',
    welcomeSize: 20,
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
    brandNameFontFamily: 'outfit',
    brandNameSize: 76,
    taglineFontFamily: 'dm-sans',
    taglineSize: 9,
    welcomeFontFamily: 'dm-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'boutique',
    label: 'Boutique',
    note: 'Luxury editorial',
    fontFamily: 'manrope',
    headingFontFamily: 'fraunces',
    bodyFontFamily: 'manrope',
    buttonFontFamily: 'manrope',
    slotFontFamily: 'manrope',
    dateFontFamily: 'fraunces',
    brandNameFontFamily: 'fraunces',
    brandNameSize: 66,
    taglineFontFamily: 'manrope',
    taglineSize: 9,
    welcomeFontFamily: 'manrope',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.15
  },
  {
    id: 'impact',
    label: 'Impact',
    note: 'Bold display',
    fontFamily: 'public-sans',
    headingFontFamily: 'archivo-black',
    bodyFontFamily: 'public-sans',
    buttonFontFamily: 'space-grotesk',
    slotFontFamily: 'space-grotesk',
    dateFontFamily: 'archivo-black',
    brandNameFontFamily: 'archivo-black',
    brandNameSize: 60,
    taglineFontFamily: 'public-sans',
    taglineSize: 9,
    welcomeFontFamily: 'public-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'friendly',
    label: 'Friendly',
    note: 'Rounded modern',
    fontFamily: 'nunito-sans',
    headingFontFamily: 'rubik',
    bodyFontFamily: 'nunito-sans',
    buttonFontFamily: 'rubik',
    slotFontFamily: 'rubik',
    dateFontFamily: 'rubik',
    brandNameFontFamily: 'rubik',
    brandNameSize: 72,
    taglineFontFamily: 'nunito-sans',
    taglineSize: 9,
    welcomeFontFamily: 'nunito-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'precision',
    label: 'Precision',
    note: 'Technical clarity',
    fontFamily: 'ibm-plex-sans',
    headingFontFamily: 'ibm-plex-sans',
    bodyFontFamily: 'ibm-plex-sans',
    buttonFontFamily: 'ibm-plex-mono',
    slotFontFamily: 'ibm-plex-mono',
    dateFontFamily: 'ibm-plex-mono',
    brandNameFontFamily: 'ibm-plex-sans',
    brandNameSize: 72,
    taglineFontFamily: 'ibm-plex-sans',
    taglineSize: 9,
    welcomeFontFamily: 'ibm-plex-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.22
  },
  {
    id: 'editorial',
    label: 'Editorial',
    note: 'Fashion serif',
    fontFamily: 'source-sans-3',
    headingFontFamily: 'playfair-display',
    bodyFontFamily: 'source-sans-3',
    buttonFontFamily: 'work-sans',
    slotFontFamily: 'playfair-display',
    dateFontFamily: 'playfair-display',
    brandNameFontFamily: 'playfair-display',
    brandNameSize: 66,
    taglineFontFamily: 'source-sans-3',
    taglineSize: 9,
    welcomeFontFamily: 'source-sans-3',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.14
  },
  {
    id: 'classic',
    label: 'Classic',
    note: 'High-contrast serif',
    fontFamily: 'manrope',
    headingFontFamily: 'bodoni-moda',
    bodyFontFamily: 'manrope',
    buttonFontFamily: 'manrope',
    slotFontFamily: 'bodoni-moda',
    dateFontFamily: 'bodoni-moda',
    brandNameFontFamily: 'bodoni-moda',
    brandNameSize: 64,
    taglineFontFamily: 'manrope',
    taglineSize: 9,
    welcomeFontFamily: 'manrope',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.18
  },
  {
    id: 'calm',
    label: 'Calm',
    note: 'Balanced utility',
    fontFamily: 'work-sans',
    headingFontFamily: 'public-sans',
    bodyFontFamily: 'work-sans',
    buttonFontFamily: 'public-sans',
    slotFontFamily: 'work-sans',
    dateFontFamily: 'public-sans',
    brandNameFontFamily: 'public-sans',
    brandNameSize: 74,
    taglineFontFamily: 'work-sans',
    taglineSize: 9,
    welcomeFontFamily: 'work-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0
  },
  {
    id: 'mono',
    label: 'Mono',
    note: 'Code sharp',
    fontFamily: 'ibm-plex-sans',
    headingFontFamily: 'jetbrains-mono',
    bodyFontFamily: 'ibm-plex-sans',
    buttonFontFamily: 'jetbrains-mono',
    slotFontFamily: 'jetbrains-mono',
    dateFontFamily: 'jetbrains-mono',
    brandNameFontFamily: 'jetbrains-mono',
    brandNameSize: 60,
    taglineFontFamily: 'ibm-plex-sans',
    taglineSize: 9,
    welcomeFontFamily: 'ibm-plex-sans',
    welcomeSize: 20,
    headingLetterSpacing: 0,
    subtextLetterSpacing: 0.12
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
