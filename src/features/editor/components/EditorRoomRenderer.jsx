import { normalizeCssColor } from '../../../utils/theme';
import {
  ClientFormRoom,
  ColourRoom,
  FaqRoom,
  FunnelTextRoom,
  ServicesRoom,
  StyleDirectionRoom,
  TypographyRoom
} from '../rooms';
import {
  buildEditorColourFineTuneGroups,
  getBookingPageColourScheme,
  getDetectedBrandSwatches
} from '../utils/editorColourSystem';

const pageColourKeys = {
  cart: { key: 'cartPageColors', label: 'Cart' },
  details: { key: 'checkoutPageColors', label: 'Checkout' },
  success: { key: 'successPageColors', label: 'Success' }
};

export function EditorRoomRenderer({
  activeScene,
  actions,
  colour,
  form,
  previewStep,
  settings
}) {
  const detectedBrandSwatches = getDetectedBrandSwatches(colour.detectedBrandSignal);
  const activePageColour = pageColourKeys[previewStep] || null;
  const colourGroups = buildEditorColourFineTuneGroups({
    settings,
    applyColorPatch: colour.onApplyPatch,
    previewStep
  });
  const activeColourGroup = colourGroups.find(group => group.id === colour.categoryId) || null;
  const applyControlColor = (control, color) => {
    const cssColor = normalizeCssColor(color, '');
    if (!control || !cssColor) return;
    control.onApply(cssColor);
    actions.showToast(`${control.label} set to ${cssColor}`);
  };

  if (activeScene.id === 'style') {
    return (
      <StyleDirectionRoom
        value={settings.interfaceStyleDirection || 'native-precision'}
        onApply={actions.applyStyleDirection}
      />
    );
  }

  if (activeScene.id === 'colours') {
    return (
      <ColourRoom
        activeGroup={activeColourGroup}
        detectedBrandSwatches={detectedBrandSwatches}
        groups={colourGroups}
        nativeAccent={settings.nativeAccent}
        onApplyControlColor={applyControlColor}
        onBack={() => colour.setCategoryId('')}
        onNativeAccentChange={(value) => actions.onSettingChange('nativeAccent', value)}
        onResetColors={colour.onReset}
        onSelectCategory={colour.setCategoryId}
        onUseBookingColors={activePageColour ? () => {
          colour.onApplyPatch({ [activePageColour.key]: getBookingPageColourScheme(settings) });
          actions.showToast(`${activePageColour.label} colours now match Booking.`);
        } : null}
        scopeLabel={activePageColour?.label || ''}
      />
    );
  }

  if (activeScene.id === 'typography') {
    return (
      <TypographyRoom
        settings={settings}
        onApplyPreset={actions.applyFontStylePreset}
      />
    );
  }

  if (activeScene.id === 'services') {
    return (
      <ServicesRoom
        settings={settings}
        onSettingChange={actions.onSettingChange}
      />
    );
  }

  if (['introduction', 'cart', 'checkout', 'success'].includes(activeScene.id)) {
    return (
      <FunnelTextRoom
        page={activeScene.id}
        settings={settings}
        onSettingChange={actions.onSettingChange}
      />
    );
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

  if (activeScene.id === 'faq') {
    return (
      <FaqRoom
        onAddFaqItem={actions.addFaqItem}
        onRemoveFaqItem={actions.removeFaqItem}
        onToggleFaqFeature={actions.toggleFaqFeature}
        onUpdateFaqItem={actions.updateFaqItem}
        settings={settings}
      />
    );
  }

  return null;
}
