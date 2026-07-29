import { normalizeCssColor } from '../../../utils/theme';
import {
  ClientFormRoom,
  FaqRoom,
  FunnelTextRoom,
  PublishRoom,
  SectionDesignRoom,
  StyleDirectionRoom
} from '../rooms';
import { buildEditorColourFineTuneGroups } from '../utils/editorColourSystem';

const pageSettingGroups = [];
const pageStyleFields = [
  { key: 'bookingCtaLabel', label: 'Button text', placeholder: 'Add booking to cart', fullWidth: true }
];

const combineColourGroups = (groups, ids, title) => ({
  id: `combined-${ids.join('-')}`,
  title,
  controls: groups
    .filter(group => ids.includes(group.id))
    .flatMap(group => group.controls)
});

const buildNativeGradientControls = ({ applyColorPatch, settings }) => (settings.nativeAccent ? [] : [
  {
    id: 'heading-underline',
    label: 'Heading underline',
    note: 'Underline accent beneath section headings.',
    value: settings.headingUnderlineColor || settings.primaryColor,
    fallback: settings.primaryColor || '#050505',
    onApply: (color) => applyColorPatch({ headingUnderlineColor: color })
  },
  {
    id: 'button-fill',
    label: 'Button fill',
    note: 'Primary action button background.',
    value: settings.buttonColor || settings.primaryColor,
    fallback: '#050505',
    onApply: (color) => applyColorPatch({ buttonColor: color })
  },
  {
    id: 'date-active-bg',
    label: 'Selected day',
    note: 'Selected date background.',
    value: settings.dateActiveBgColor,
    fallback: settings.primaryColor || '#050505',
    onApply: (color) => applyColorPatch({ dateActiveBgColor: color })
  },
  {
    id: 'slot-active-bg',
    label: 'Selected time',
    note: 'Chosen time background.',
    value: settings.slotActiveBgColor,
    fallback: settings.primaryColor || '#050505',
    onApply: (color) => applyColorPatch({ slotActiveBgColor: color })
  },
  {
    id: 'service-active-line',
    label: 'Selected service border',
    note: 'Selected service card highlight.',
    value: settings.serviceActiveBorderColor,
    fallback: settings.primaryColor || '#050505',
    onApply: (color) => applyColorPatch({ serviceActiveBorderColor: color })
  },
  {
    id: 'service-category-active',
    label: 'Category highlight',
    note: 'Selected service category highlight.',
    value: settings.serviceCategoryActiveColor,
    fallback: settings.primaryColor || '#050505',
    onApply: (color) => applyColorPatch({ serviceCategoryActiveColor: color })
  }
]);

const buildTimelineLayoutControls = ({ applyColorPatch, settings }) => (
  settings.bookingPageLayout === 'timeline' ? [
    ...(!settings.nativeAccent ? [
      {
        id: 'timeline-icon-fill',
        label: 'Timeline icon fill',
        note: 'Selected and completed timeline icon background.',
        value: settings.timelineIconColor || settings.timelineButtonColor || settings.buttonColor || settings.primaryColor,
        fallback: settings.timelineButtonColor || settings.buttonColor || settings.primaryColor || '#050505',
        onApply: (color) => applyColorPatch({ timelineIconColor: color })
      },
      {
        id: 'timeline-icon-text',
        label: 'Timeline icon symbol',
        note: 'Selected and completed timeline icon symbol.',
        value: settings.timelineIconTextColor || settings.timelineButtonTextColor || settings.buttonTextColor,
        fallback: settings.timelineButtonTextColor || settings.buttonTextColor || '#FFFFFF',
        onApply: (color) => applyColorPatch({ timelineIconTextColor: color })
      }
    ] : []),
    {
      id: 'timeline-button-fill',
      label: 'Timeline button fill',
      note: 'Back and next button background.',
      value: settings.timelineButtonColor || settings.buttonColor || settings.primaryColor,
      fallback: settings.buttonColor || settings.primaryColor || '#050505',
      onApply: (color) => applyColorPatch({ timelineButtonColor: color })
    },
    {
      id: 'timeline-button-text',
      label: 'Timeline button text',
      note: 'Back and next button text.',
      value: settings.timelineButtonTextColor || settings.buttonTextColor,
      fallback: settings.buttonTextColor || '#FFFFFF',
      onApply: (color) => applyColorPatch({ timelineButtonTextColor: color })
    }
  ] : []
);

const sectionRoomConfigs = {
  services: {
    colourGroupId: 'services',
    fieldGroupTitle: 'Services copy',
    fieldGroupHelper: 'Set the heading and supporting line above your services.',
    fields: [
      { key: 'serviceHeading', label: 'Heading', placeholder: 'Choose your service', fullWidth: true },
      { key: 'serviceSubtext', label: 'Subtext', placeholder: 'Select the option that works best for you.', fullWidth: true }
    ],
    groups: [
      {
        id: 'service-browsing',
        label: 'Browsing layout',
        helper: 'How clients move between service categories.',
        settingKey: 'serviceDisplayStyle',
        options: [
          {
            value: 'rail',
            label: 'Category tiles',
            detail: 'Fast, visual browsing',
            patch: { serviceDropdownEnabled: false, serviceDisplayStyle: 'rail' },
            isSelected: (settings) => ['rail', 'tiles'].includes(settings.serviceDisplayStyle) || settings.serviceDropdownEnabled === false
          },
          {
            value: 'dropdown',
            label: 'Dropdown',
            detail: 'Compact category menu',
            patch: { serviceDropdownEnabled: true, serviceDisplayStyle: 'dropdown' },
            isSelected: (settings) => !(['rail', 'tiles'].includes(settings.serviceDisplayStyle) || settings.serviceDropdownEnabled === false)
          }
        ]
      }
    ]
  },
  calendar: {
    colourGroupId: 'calendar',
    fieldGroupTitle: 'Calendar copy',
    fieldGroupHelper: 'Set the heading clients see above the date picker.',
    fields: [
      { key: 'dateLabel', label: 'Heading', placeholder: 'Pick your booking date', fullWidth: true },
      { key: 'dateSubtext', label: 'Subtext', placeholder: 'Choose an available day for your booking.', fullWidth: true }
    ],
    groups: []
  },
  'time-slots': {
    colourGroupId: 'time',
    fieldGroupTitle: 'Time slots copy',
    fieldGroupHelper: 'Set the heading and supporting line above available times.',
    fields: [
      { key: 'timeLabel', label: 'Heading', placeholder: 'What time works?', fullWidth: true },
      { key: 'timeSubtext', label: 'Subtext', placeholder: 'Choose the time that suits you best.', fullWidth: true }
    ],
    groups: []
  },
  faq: {
    colourGroupId: 'faq',
    fieldGroupTitle: 'FAQ copy',
    fieldGroupHelper: 'Introduce the common questions clients can open below.',
    fields: [
      { key: 'faqHeading', label: 'Heading', placeholder: 'Questions before booking', fullWidth: true },
      { key: 'faqSubtext', label: 'Subtext', placeholder: 'Helpful answers before you confirm.', fullWidth: true }
    ],
    groups: []
  },
  venue: {
    colourGroupId: 'venue',
    fieldGroupTitle: 'Venue copy',
    fieldGroupHelper: 'Introduce the space clients will see in the gallery.',
    fields: [
      { key: 'venueTitle', label: 'Heading', placeholder: 'Inside the space', fullWidth: true },
      { key: 'venueIntro', label: 'Subtext', placeholder: 'See the place before you book.', fullWidth: true }
    ],
    groups: []
  },
  social: {
    colourGroupId: 'social',
    fieldGroupTitle: 'Social copy and links',
    fieldGroupHelper: 'Set the section introduction, then add your social destinations.',
    fields: [
      { key: 'socialHeading', label: 'Heading', placeholder: 'Stay connected', fullWidth: true },
      { key: 'socialSubtext', label: 'Subtext', placeholder: 'Find us online and keep in touch.', fullWidth: true },
      { objectKey: 'socials', key: 'instagram', label: 'Instagram', placeholder: '@yourbusiness' },
      { objectKey: 'socials', key: 'tiktok', label: 'TikTok', placeholder: '@yourbusiness' },
      { objectKey: 'socials', key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/yourbusiness' },
      { objectKey: 'socials', key: 'website', label: 'Website', placeholder: 'yourbusiness.com' }
    ],
    groups: []
  }
};

export function EditorRoomRenderer({
  activeScene,
  actions,
  bookingPage,
  colour,
  form,
  previewStep,
  settings
}) {
  const colourGroups = buildEditorColourFineTuneGroups({
    settings,
    applyColorPatch: colour.onApplyPatch,
    previewStep
  });
  const applyControlColor = (control, color) => {
    const cssColor = normalizeCssColor(color, '');
    if (!control || !cssColor) return;
    control.onApply(cssColor);
    actions.showToast(`${control.label} set to ${cssColor}`);
  };

  if (activeScene.id === 'style') {
    const pageColourGroup = combineColourGroups(colourGroups, ['base'], 'Page colours');
    const nativeGradientColourControls = buildNativeGradientControls({ applyColorPatch: colour.onApplyPatch, settings });
    const timelineLayoutColourControls = buildTimelineLayoutControls({ applyColorPatch: colour.onApplyPatch, settings });
    const buttonColourGroup = {
      ...combineColourGroups(colourGroups, ['action'], 'Add to Cart Button'),
      controls: combineColourGroups(colourGroups, ['action'], 'Add to Cart Button').controls
        .filter(control => control.id !== 'button-fill')
    };
    const pageColourSettingGroups = [
      {
        id: 'booking-page-layout',
        label: 'Page layout',
        helper: 'Choose how clients move through services, day, and time.',
        settingKey: 'bookingPageLayout',
        options: [
          { value: 'stacked', label: 'Stacked', detail: 'Classic vertical flow' },
          { value: 'timeline', label: 'Timeline steps', detail: 'Horizontal step-by-step flow' }
        ],
        colourControls: timelineLayoutColourControls,
        colourTitle: 'Timeline buttons',
        colourHelper: 'These colours style the back and next buttons for this layout.'
      },
      {
        id: 'native-gradient',
        label: 'Native gradient',
        helper: 'Keep the app gradient on, or turn it off to edit the affected solid colours here.',
        settingKey: 'nativeAccent',
        options: [
          { value: true, label: 'On', detail: 'Use native gradient' },
          { value: false, label: 'Off', detail: 'Edit solid fills' }
        ],
        colourControls: nativeGradientColourControls,
        colourHelper: 'These colours replace gradient-driven selected states and primary accents.'
      }
    ];
    return (
      <div className="editor-section-room-stack editor-style-room-stack">
        <StyleDirectionRoom
          settings={settings}
          value={settings.interfaceStyleDirection || 'native-precision'}
          onApply={actions.applyStyleDirection}
          onSettingChange={actions.onSettingChange}
          showServiceLayout={false}
        />
        <SectionDesignRoom
          colourGroup={pageColourGroup}
          groups={pageColourSettingGroups}
          onApplyControlColor={applyControlColor}
          onSettingChange={actions.onSettingChange}
          settings={settings}
        />
        <SectionDesignRoom
          colourGroup={buttonColourGroup}
          colourInFieldGroup
          fieldGroupHelper="Label and colours for the primary booking action."
          fieldGroupTitle="Add to Cart Button"
          fields={pageStyleFields}
          groups={pageSettingGroups}
          onApplyControlColor={applyControlColor}
          onSettingChange={actions.onSettingChange}
          settings={settings}
        />
      </div>
    );
  }

  if (activeScene.id === 'publish') {
    return (
      <PublishRoom
        bookingPageRoute={bookingPage?.route}
        bookingPageUrl={bookingPage?.url}
        copyToClipboard={bookingPage?.copyToClipboard}
        onOpenBookingPage={bookingPage?.onOpen}
        onSave={bookingPage?.onSave}
        onSettingChange={actions.onSettingChange}
        settings={settings}
      />
    );
  }

  if (['introduction', 'cart', 'checkout', 'success'].includes(activeScene.id)) {
    const funnelColourGroup = previewStep === 'select'
      ? null
      : combineColourGroups(colourGroups, colourGroups.map(group => group.id), `${activeScene.title} colours`);
    return (
      <div className="editor-section-room-stack">
        <FunnelTextRoom
          page={activeScene.id}
          settings={settings}
          onSettingChange={actions.onSettingChange}
        />
        {funnelColourGroup ? (
          <SectionDesignRoom
            colourGroup={funnelColourGroup}
            onApplyControlColor={applyControlColor}
            onSettingChange={actions.onSettingChange}
            settings={settings}
          />
        ) : null}
      </div>
    );
  }

  const sectionConfig = sectionRoomConfigs[activeScene.id];
  if (sectionConfig) {
    const sectionColourGroup = colourGroups.find(group => group.id === sectionConfig.colourGroupId) || null;
    const sectionControls = (
      <SectionDesignRoom
        colourGroup={sectionColourGroup}
        fieldGroupHelper={sectionConfig.fieldGroupHelper}
        fieldGroupTitle={sectionConfig.fieldGroupTitle}
        fields={sectionConfig.fields}
        groups={sectionConfig.groups}
        onApplyControlColor={applyControlColor}
        onSettingChange={actions.onSettingChange}
        settings={settings}
      />
    );

    if (activeScene.id === 'faq') {
      return (
        <div className="editor-section-room-stack">
          {sectionControls}
          <FaqRoom
            onAddFaqItem={actions.addFaqItem}
            onRemoveFaqItem={actions.removeFaqItem}
            onToggleFaqFeature={actions.toggleFaqFeature}
            onUpdateFaqItem={actions.updateFaqItem}
            settings={settings}
          />
        </div>
      );
    }

    return sectionControls;
  }

  if (activeScene.id === 'client-form') {
    return (
      <ClientFormRoom
        collectsClientEmail={form.collectsClientEmail}
        collectsClientNotes={form.collectsClientNotes}
        collectsClientPhone={form.collectsClientPhone}
        emailUpdatesEnabled={form.emailUpdatesEnabled}
        onFeatureChange={actions.onFeatureChange}
        settings={settings}
      />
    );
  }

  return null;
}
