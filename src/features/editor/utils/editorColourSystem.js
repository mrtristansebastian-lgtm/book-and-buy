import { normalizeHexColor } from '../../../utils/theme';

export const getDetectedBrandSwatches = (detectedBrandSignal) => Array.from(new Set([
  detectedBrandSignal?.brandColor,
  detectedBrandSignal?.accentColor,
  detectedBrandSignal?.dominantColor,
  ...(detectedBrandSignal?.colors || [])
].map(color => normalizeHexColor(color, '')).filter(Boolean))).slice(0, 8);

const pageColorKeys = {
  cart: { title: 'Cart colours', key: 'cartPageColors' },
  details: { title: 'Checkout colours', key: 'checkoutPageColors' },
  success: { title: 'Success colours', key: 'successPageColors' }
};

const bookingColourFallbacks = (settings) => ({
  backgroundColor: settings.backgroundColor || '#ffffff',
  headingColor: settings.headingColor || '#050505',
  bodyColor: settings.bodyColor || '#666666',
  primaryColor: settings.primaryColor || '#050505',
  buttonTextColor: settings.buttonTextColor || '#ffffff',
  surfaceColor: '#ffffff',
  borderColor: '#0000001A'
});

export const getBookingPageColourScheme = (settings) => bookingColourFallbacks(settings);

export const getPageColourScheme = (settings, previewStep) => {
  const page = pageColorKeys[previewStep];
  return page ? { ...bookingColourFallbacks(settings), ...(settings[page.key] || {}) } : bookingColourFallbacks(settings);
};

export const buildEditorColourFineTuneGroups = ({ settings, applyColorPatch, previewStep = 'select' }) => {
  const page = pageColorKeys[previewStep];
  if (page) {
    const values = getPageColourScheme(settings, previewStep);
    const applyPageColorPatch = (patch) => applyColorPatch({
      [page.key]: {
        ...(settings[page.key] || {}),
        ...patch
      }
    });

    return [
      {
        id: 'page-base',
        title: page.title,
        controls: [
          { id: 'page-bg', label: 'Background', note: 'This page background only.', value: values.backgroundColor, fallback: '#ffffff', onApply: (color) => applyPageColorPatch({ backgroundColor: color }) },
          { id: 'page-surface', label: 'Surface', note: 'Cards and panels on this page.', value: values.surfaceColor, fallback: '#ffffff', onApply: (color) => applyPageColorPatch({ surfaceColor: color }) },
          { id: 'page-line', label: 'Lines', note: 'Borders and dividers on this page.', value: values.borderColor, fallback: '#000000', onApply: (color) => applyPageColorPatch({ borderColor: color }) }
        ]
      },
      {
        id: 'page-type',
        title: 'Page Text',
        controls: [
          { id: 'page-heading', label: 'Heading text', note: 'Titles and strong labels on this page.', value: values.headingColor, fallback: '#050505', onApply: (color) => applyPageColorPatch({ headingColor: color }) },
          { id: 'page-body', label: 'Body text', note: 'Helper copy and muted labels on this page.', value: values.bodyColor, fallback: '#666666', onApply: (color) => applyPageColorPatch({ bodyColor: color }) }
        ]
      },
      {
        id: 'page-action',
        title: 'Page Action',
        controls: [
          { id: 'page-accent', label: 'Button fill', note: 'Primary action on this page.', value: values.primaryColor, fallback: '#050505', onApply: (color) => applyPageColorPatch({ primaryColor: color }) },
          { id: 'page-button-text', label: 'Button text', note: 'Primary action label on this page.', value: values.buttonTextColor, fallback: '#ffffff', onApply: (color) => applyPageColorPatch({ buttonTextColor: color }) }
        ]
      }
    ];
  }

  const baseControls = [
    { id: 'background', label: 'Background', note: 'Main booking page surface.', value: settings.backgroundColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ backgroundColor: color }) },
    { id: 'heading', label: 'Heading text', note: 'Business name and section titles.', value: settings.headingColor, fallback: '#050505', onApply: (color) => applyColorPatch({ headingColor: color }) },
    { id: 'body', label: 'Body text', note: 'Descriptions, labels, and helper copy.', value: settings.bodyColor, fallback: '#666666', onApply: (color) => applyColorPatch({ bodyColor: color }) },
    ...(!settings.nativeAccent ? [
      { id: 'primary', label: 'Underline accent', note: 'Section heading underline colour.', value: settings.primaryColor, fallback: '#050505', onApply: (color) => applyColorPatch({ primaryColor: color, accentColor: color }) }
    ] : [])
  ];

  const actionControls = [
    { id: 'button-fill', label: 'Button fill', note: 'Confirm booking button background.', value: settings.buttonColor || settings.primaryColor, fallback: '#050505', onApply: (color) => applyColorPatch({ buttonColor: color }) },
    { id: 'button-text', label: 'Button text', note: 'Confirm booking button label.', value: settings.buttonTextColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ buttonTextColor: color }) }
  ];

  const actionGroups = [
    {
      id: 'action',
      title: 'Action',
      controls: actionControls
    }
  ];

  return [
  {
    id: 'base',
    title: 'Base',
    controls: baseControls
  },
  ...actionGroups,
  {
    id: 'calendar',
    title: 'Calendar',
    controls: [
      { id: 'date-active-bg', label: 'Selected day', note: 'Selected date background.', value: settings.dateActiveBgColor, fallback: settings.primaryColor || '#050505', onApply: (color) => applyColorPatch({ dateActiveBgColor: color }) },
      { id: 'date-active-text', label: 'Selected day text', note: 'Selected date label.', value: settings.dateActiveTextColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ dateActiveTextColor: color }) },
      { id: 'date-bg', label: 'Day tile', note: 'Unselected date background.', value: settings.dateBgColor === 'transparent' ? '' : settings.dateBgColor, fallback: '#f8fafc', onApply: (color) => applyColorPatch({ dateBgColor: color }) },
      { id: 'date-text', label: 'Day tile text', note: 'Unselected date label.', value: settings.dateTextColor, fallback: '#64748b', onApply: (color) => applyColorPatch({ dateTextColor: color }) }
    ]
  },
  {
    id: 'time',
    title: 'Time',
    controls: [
      { id: 'slot-bg', label: 'Slot fill', note: 'Available time background.', value: settings.slotBgColor, fallback: '#f8fafc', onApply: (color) => applyColorPatch({ slotBgColor: color }) },
      { id: 'slot-text', label: 'Slot text', note: 'Available time label.', value: settings.slotTextColor, fallback: '#050505', onApply: (color) => applyColorPatch({ slotTextColor: color }) },
      { id: 'slot-active-bg', label: 'Selected time', note: 'Chosen time background.', value: settings.slotActiveBgColor, fallback: settings.primaryColor || '#050505', onApply: (color) => applyColorPatch({ slotActiveBgColor: color }) },
      { id: 'slot-active-text', label: 'Selected time text', note: 'Chosen time label.', value: settings.slotActiveTextColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ slotActiveTextColor: color }) }
    ]
  },
  {
    id: 'services',
    title: 'Services',
    controls: [
      { id: 'service-bg', label: 'Service surface', note: 'Service tiles and dropdown fill.', value: settings.serviceBgColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ serviceBgColor: color }) },
      { id: 'service-line', label: 'Service line', note: 'Service tile and dropdown border.', value: settings.serviceBorderColor, fallback: '#000000', onApply: (color) => applyColorPatch({ serviceBorderColor: color }) },
      { id: 'service-title', label: 'Service text', note: 'Service names and key labels.', value: settings.serviceTextColor || settings.bodyColor, fallback: '#050505', onApply: (color) => applyColorPatch({ serviceTextColor: color }) },
      { id: 'service-copy', label: 'Service copy', note: 'Service descriptions and helper text.', value: settings.serviceBodyColor || settings.bodyColor, fallback: '#666666', onApply: (color) => applyColorPatch({ serviceBodyColor: color }) },
      { id: 'service-active', label: 'Selected service', note: 'Chosen service surface.', value: settings.serviceActiveBgColor, fallback: settings.primaryColor || '#050505', onApply: (color) => applyColorPatch({ serviceActiveBgColor: color }) },
      { id: 'service-active-line', label: 'Selected service line', note: 'Chosen service border colour.', value: settings.serviceActiveBorderColor, fallback: settings.primaryColor || '#050505', onApply: (color) => applyColorPatch({ serviceActiveBorderColor: color }) }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    controls: [
      { id: 'faq-bg', label: 'FAQ surface', note: 'Question area background.', value: settings.faqBgColor === 'transparent' ? '' : settings.faqBgColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ faqBgColor: color }) },
      { id: 'faq-border', label: 'FAQ line', note: 'Accordion and card border.', value: settings.faqBorderColor, fallback: '#000000', onApply: (color) => applyColorPatch({ faqBorderColor: color }) },
      { id: 'faq-question', label: 'Question text', note: 'FAQ question copy.', value: settings.faqTextColor || settings.bodyColor, fallback: '#050505', onApply: (color) => applyColorPatch({ faqTextColor: color }) },
      { id: 'faq-answer', label: 'Answer text', note: 'FAQ answer copy.', value: settings.faqAnswerColor || settings.bodyColor, fallback: '#666666', onApply: (color) => applyColorPatch({ faqAnswerColor: color }) }
    ]
  },
  {
    id: 'venue',
    title: 'Venue',
    controls: [
      { id: 'venue-bg', label: 'Venue surface', note: 'Gallery and map section fill.', value: settings.venueBgColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ venueBgColor: color }) },
      { id: 'venue-line', label: 'Venue line', note: 'Gallery, map, and photo borders.', value: settings.venueBorderColor, fallback: '#000000', onApply: (color) => applyColorPatch({ venueBorderColor: color }) },
      { id: 'venue-title', label: 'Venue text', note: 'Venue section title and photo labels.', value: settings.venueTextColor || settings.bodyColor, fallback: '#050505', onApply: (color) => applyColorPatch({ venueTextColor: color }) },
      { id: 'venue-copy', label: 'Venue copy', note: 'Venue intro and metadata copy.', value: settings.venueBodyColor || settings.bodyColor, fallback: '#666666', onApply: (color) => applyColorPatch({ venueBodyColor: color }) }
    ]
  },
  {
    id: 'social',
    title: 'Social footer',
    controls: [
      { id: 'social-bg', label: 'Icon fill', note: 'Social icon background.', value: settings.socialIconBgColor === 'transparent' ? '' : settings.socialIconBgColor, fallback: '#ffffff', onApply: (color) => applyColorPatch({ socialIconBgColor: color }) },
      { id: 'social-icon', label: 'Icon mark', note: 'Social icon symbol.', value: settings.socialIconColor || settings.primaryColor, fallback: '#050505', onApply: (color) => applyColorPatch({ socialIconColor: color }) },
      { id: 'social-text', label: 'Icon label', note: 'Social footer text.', value: settings.socialIconTextColor || settings.bodyColor, fallback: '#666666', onApply: (color) => applyColorPatch({ socialIconTextColor: color }) }
    ]
  }
];
};
