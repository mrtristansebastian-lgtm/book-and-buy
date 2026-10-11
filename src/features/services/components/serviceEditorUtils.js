import { parseDurationMinutes } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function buildSetupSteps(scheduleType, hasTemplate = false) {
  const isSpot = scheduleType === 'class_session';
  return [
    {
      id: 'type',
      label: 'Service type',
      lede: 'Choose a Slot or Spot.'
    },
    { id: 'classification', label: 'Discovery Category', lede: 'Choose a main category and subcategory for Discovery.' },
    {
      id: 'details',
      label: 'Details',
      lede: 'Name it, describe it, and set the base price.'
    },
    ...(hasTemplate ? [{ id: 'configuration', label: 'Service details', lede: 'Add the details that matter for this service.' }] : []),
    {
      id: 'variants',
      label: 'Options',
      lede: isSpot ? 'Optional options for the same session.' : 'Optional options with their own price and duration.'
    },
    {
      id: 'photo',
      label: 'Photo',
      lede: 'Add a catalog photo clients will see on Book.'
    },
    {
          id: 'when',
          label: 'When',
          lede: 'Choose fixed dates, available times, or timing agreed with your client.'
        },
    ...(!isSpot ? [{
          id: 'duration',
          label: 'Duration',
          lede: 'Used with Schedule hours to calculate bookable times.'
        }] : []),
    {
      id: 'category',
      label: 'Store Category',
      lede: 'Optional — helps clients browse your Book page.'
    },
    {
      id: 'review',
      label: 'Review',
      lede: 'Check everything, assign staff, then save.'
    }
  ];
}

export function durationSummary(draft) {
  if (draft.fixedDuration === false) {
    const mins = parseDurationMinutes(draft.minDuration);
    return mins ? `Min ${mins} min` : 'Minimum not set';
  }
  const mins = parseDurationMinutes(draft.duration);
  return mins ? `${mins} min` : 'Not set';
}

export function typeSummary(draft) {
  return getScheduleTypeMeta(draft.scheduleType).setupLabel;
}
