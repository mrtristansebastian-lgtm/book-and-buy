export const stripLegacyEditorFields = (settings = {}) => {
  const {
    draftAutosavedAt,
    draftSavedAt,
    draftStatus,
    draftName,
    ...publishableSettings
  } = settings || {};
  return publishableSettings;
};
