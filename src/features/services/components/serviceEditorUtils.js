import { parseDurationMinutes } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function buildSetupSteps(scheduleType, hasTemplate = false, isEvent = false) {
  const isSpot = scheduleType === 'class_session';
  return [
    {
      id: 'type',
      label: 'Service type',
      lede: 'Choose a Slot, Spot or Event.'
    },
    { id: 'classification', label: 'Category', lede: 'Choose a main category and subcategory.' },
    {
      id: 'details',
      label: 'Details',
      lede: 'Name it, describe it, and set the base price.'
    },
    ...(hasTemplate ? [{ id: 'configuration', label: 'Service details', lede: 'Add the details that matter for this service.' }] : []),
    {
      id: 'variants',
      label: 'Variants',
      lede: isEvent ? 'Add ticket types and prices for this event.' : isSpot ? 'Optional ticket or package options for the same session.' : 'Optional packages with their own price and duration.'
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
          lede: isEvent ? 'Set the event’s start and end date and time.' : 'Set the start and end date and time for this class or programme.'
        }
      : {
          id: 'duration',
          label: 'Duration',
          lede: 'Used with Schedule hours to calculate bookable times.'
        },
    {
      id: 'category',
      label: 'Browse label',
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
