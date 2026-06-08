import {
  createDefaultSettings,
  defaultFaqItems,
  getEditorStyleDirection
} from '../../../config/appConfig';

export function createEditorSettingActions({
  markWorkspaceDirty,
  resetEditorPreviewScroll,
  setSettings,
  settings,
  showToast
}) {
  const handleSettingChange = (key, value) => {
    markWorkspaceDirty();
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyEditorColorPatch = (patch) => {
    markWorkspaceDirty();
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const resetEditorColors = () => {
    const defaults = createDefaultSettings();
    markWorkspaceDirty();
    setSettings(prev => ({
      ...prev,
      primaryColor: defaults.primaryColor,
      accentColor: '',
      backgroundColor: defaults.backgroundColor,
      headingColor: defaults.headingColor,
      bodyColor: defaults.bodyColor,
      slotBgColor: defaults.slotBgColor,
      slotTextColor: defaults.slotTextColor,
      slotActiveBgColor: defaults.dateActiveBgColor,
      slotActiveTextColor: defaults.dateActiveTextColor,
      serviceBgColor: defaults.serviceBgColor,
      serviceBorderColor: defaults.serviceBorderColor,
      serviceTextColor: defaults.serviceTextColor,
      serviceBodyColor: defaults.serviceBodyColor,
      serviceActiveBgColor: defaults.serviceActiveBgColor,
      serviceActiveBorderColor: defaults.serviceActiveBorderColor,
      dateBgColor: defaults.dateBgColor,
      dateTextColor: defaults.dateTextColor,
      dateActiveBgColor: defaults.dateActiveBgColor,
      dateActiveTextColor: defaults.dateActiveTextColor,
      buttonColor: defaults.primaryColor,
      buttonTextColor: defaults.buttonTextColor,
      faqBgColor: defaults.faqBgColor,
      faqBorderColor: defaults.faqBorderColor,
      faqTextColor: defaults.faqTextColor,
      faqAnswerColor: defaults.faqAnswerColor,
      venueBgColor: defaults.venueBgColor,
      venueBorderColor: defaults.venueBorderColor,
      venueTextColor: defaults.venueTextColor,
      venueBodyColor: defaults.venueBodyColor,
      socialIconBgColor: defaults.socialIconBgColor,
      socialIconColor: defaults.socialIconColor,
      socialIconTextColor: defaults.socialIconTextColor,
      nativeAccent: defaults.nativeAccent,
      editorPaletteFlowColor: defaults.editorPaletteFlowColor,
      editorColorDepth: defaults.editorColorDepth,
      editorColorDepths: {},
      editorColorMix: defaults.editorColorMix
    }));
    showToast('Colours reset to the clean default set.');
  };

  const applyEditorStyleDirection = (directionId) => {
    const direction = getEditorStyleDirection(directionId);
    markWorkspaceDirty();
    setSettings(prev => ({
      ...prev,
      ...direction.settings,
      logoDisplay: {
        ...(prev.logoDisplay || {}),
        ...(direction.settings.logoDisplay || {})
      },
      bannerDisplay: {
        ...(prev.bannerDisplay || {}),
        ...(direction.settings.bannerDisplay || {})
      },
      interfaceStyleDirection: direction.id
    }));
    resetEditorPreviewScroll();
    showToast(`${direction.label} style applied`);
  };

  const applyFontStylePreset = (preset) => {
    if (!preset) return;
    markWorkspaceDirty();
    setSettings(prev => ({
      ...prev,
      fontFamily: preset.fontFamily,
      headingFontFamily: preset.headingFontFamily,
      bodyFontFamily: preset.bodyFontFamily,
      buttonFontFamily: preset.buttonFontFamily,
      slotFontFamily: preset.slotFontFamily,
      dateFontFamily: preset.dateFontFamily,
      headingLetterSpacing: preset.headingLetterSpacing,
      subtextLetterSpacing: preset.subtextLetterSpacing
    }));
    showToast(`${preset.label} font style applied`);
  };

  const handleFeatureChange = (key, value) => {
    markWorkspaceDirty();
    setSettings(prev => {
      const nextFeatures = { ...prev.features, [key]: value };
      if (key === 'collectClientEmail' && value === false) {
        nextFeatures.emailUpdates = false;
      }
      return { ...prev, features: nextFeatures };
    });
  };

  const toggleFaqFeature = () => {
    markWorkspaceDirty();
    setSettings(prev => {
      const enabled = !prev.features?.faqEnabled;
      const existingFaqs = Array.isArray(prev.features?.faqs) ? prev.features.faqs : [];
      return {
        ...prev,
        features: {
          ...prev.features,
          faqEnabled: enabled,
          faqs: enabled && existingFaqs.length === 0 ? defaultFaqItems.map(item => ({ ...item })) : existingFaqs
        }
      };
    });
  };

  const updateFaqItem = (index, field, value) => {
    const faqs = [...(settings.features?.faqs || [])];
    faqs[index] = { ...(faqs[index] || { q: '', a: '' }), [field]: value };
    handleFeatureChange('faqs', faqs);
  };

  const addFaqItem = () => handleFeatureChange('faqs', [...(settings.features?.faqs || []), { q: '', a: '' }]);

  const removeFaqItem = (index) => handleFeatureChange('faqs', (settings.features?.faqs || []).filter((_, idx) => idx !== index));

  return {
    addFaqItem,
    applyEditorColorPatch,
    applyEditorStyleDirection,
    applyFontStylePreset,
    handleFeatureChange,
    handleSettingChange,
    removeFaqItem,
    resetEditorColors,
    toggleFaqFeature,
    updateFaqItem
  };
}
