import { parseDurationMinutes } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function buildSetupSteps(scheduleType) {
  const isSpot = scheduleType === 'class_session';
  return [
    {
      id: 'type',
      label: 'Type',
      lede: 'How do clients book this?'
    },
    {
      id: 'details',
      label: 'Details',
      lede: 'Name it, describe it, and set the base price.'
    },
    {
      id: 'variants',
      label: 'Variants',
      lede: 'Optional packages with their own price and minimum duration.'
    },
    {
      id: 'photo',
      label: 'Photo',
      lede: 'Add a catalog photo clients will see on Book.'
    },
    isSpot
      ? {
          id: 'when',
          label: 'When',
          lede: 'Set the start and end date and time for this class or programme.'
        }
      : {
          id: 'duration',
          label: 'Duration',
          lede: 'Used with Schedule hours to calculate bookable times.'
        },
    {
      id: 'category',
      label: 'Category',
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
