import { normalizeCssColor } from '../../../utils/theme';
import {
  ClientFormRoom,
  FaqRoom,
  FunnelTextRoom,
  SectionDesignRoom,
  StyleDirectionRoom
} from '../rooms';
import { buildEditorColourFineTuneGroups } from '../utils/editorColourSystem';

const pageSettingGroups = [];

const combineColourGroups = (groups, ids, title) => ({
  id: `combined-${ids.join('-')}`,
  title,
  controls: groups
    .filter(group => ids.includes(group.id))
    .flatMap(group => group.controls)
});

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
    groups: [
      {
        id: 'social-layout',
        label: 'Footer layout',
        helper: 'Choose how social destinations appear at the page end.',
        settingKey: 'socialDisplayStyle',
        options: [
          { value: 'icons', label: 'Icons', detail: 'Recognisable marks' },
          { value: 'labels', label: 'Labels', detail: 'Platform names' },
          { value: 'dock', label: 'Dock', detail: 'Grouped footer bar' },
          { value: 'minimal', label: 'Minimal', detail: 'Low-key links' },
          { value: 'solid', label: 'Solid', detail: 'Strong buttons' }
        ]
      }
    ]
  }
};

export function EditorRoomRenderer({
  activeScene,
  actions,
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
    return (
      <div className="editor-section-room-stack">
        <StyleDirectionRoom
          settings={settings}
          value={settings.interfaceStyleDirection || 'native-precision'}
          onApply={actions.applyStyleDirection}
          onSettingChange={actions.onSettingChange}
          showServiceLayout={false}
        />
        <SectionDesignRoom
          groups={pageSettingGroups}
          onApplyControlColor={applyControlColor}
          onSettingChange={actions.onSettingChange}
          settings={settings}
        />
      </div>
    );
  }

  if (['introduction', 'cart', 'checkout', 'success'].includes(activeScene.id)) {
    const funnelColourGroup = previewStep === 'select'
      ? combineColourGroups(colourGroups, ['base', 'action'], 'Hero colours')
      : combineColourGroups(colourGroups, colourGroups.map(group => group.id), `${activeScene.title} colours`);
    return (
      <div className="editor-section-room-stack">
        <FunnelTextRoom
          page={activeScene.id}
          settings={settings}
          onSettingChange={actions.onSettingChange}
        />
        <SectionDesignRoom
          colourGroup={funnelColourGroup}
          onApplyControlColor={applyControlColor}
          onSettingChange={actions.onSettingChange}
          settings={settings}
        />
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
