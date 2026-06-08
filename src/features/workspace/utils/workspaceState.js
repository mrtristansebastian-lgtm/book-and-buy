export { stripLegacyEditorFields } from '../../../shared/settings/publishableSettings';

export const areJsonEqual = (left, right) => {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

export const mergeStateIfChanged = (current, incoming) => {
  const next = { ...current, ...incoming };
  return areJsonEqual(current, next) ? current : next;
};
