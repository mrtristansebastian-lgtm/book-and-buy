import { getFontFamily } from '../../../data/fonts';
import { getLocalDateStr } from '../../../utils/dates';
import { withColorAlpha } from '../../../utils/theme';

const alignments = ['left', 'center', 'right'];
const visualStyles = ['minimal', 'outline', 'solid'];
const legacyDropdownServiceStyles = ['signature', 'cards', 'menu', 'gallery', 'compact', 'luxury'];
const displayLooks = {
  calendar: ['studio', 'classic', 'editorial', 'compact', 'glow'],
  time: ['pill', 'blocks', 'minimal', 'luxury', 'compact'],
  faq: ['accordion', 'cards', 'minimal', 'numbered', 'split'],
  venue: ['mosaic', 'editorial', 'filmstrip', 'postcard', 'minimal'],
  maps: ['button', 'card', 'footer', 'dock', 'none'],
  social: ['icons', 'labels', 'dock', 'minimal', 'solid']
};

export const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const getOptionalLetterSpacing = (value, min, max) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return `${clampNumber(value, min, max, 0)}px`;
};

export const getAlign = (value) => alignments.includes(value) ? value : 'left';

export const getVisualStyle = (value, fallback = 'minimal') => (
  visualStyles.includes(value) ? value : fallback
);

export const getDisplayLook = (group, value, fallback) => (
  displayLooks[group]?.includes(value) ? value : fallback
);

export const getServiceCategoryDisplayMode = ({
  defaultMode = 'dropdown',
  serviceDisplayStyle,
  serviceDropdownEnabled
} = {}) => {
  const savedStyle = String(serviceDisplayStyle || '').trim().toLowerCase();
  if (savedStyle === 'rail' || savedStyle === 'tiles') return 'rail';
  if (savedStyle === 'dropdown' || legacyDropdownServiceStyles.includes(savedStyle)) return 'dropdown';
  if (serviceDropdownEnabled === false) return 'rail';
  if (serviceDropdownEnabled === true) return 'dropdown';
  return defaultMode === 'rail' ? 'rail' : 'dropdown';
};

const buildBookingDateOption = (date, extra = {}) => ({
  full: date.toDateString(),
  dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
  dayNum: date.getDate(),
  month: date.toLocaleDateString('en-US', { month: 'long' }),
  year: date.getFullYear(),
  localDateStr: getLocalDateStr(date),
  ...extra
});

export const buildAvailableBookingDates = (schedule = {}) => {
  const dates = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  let daysChecked = 0;

  while (dates.length < 14 && daysChecked < 365) {
    const localDateStr = getLocalDateStr(date);
    const dayConfig = schedule?.[localDateStr];
    const isAvailable = dayConfig ? dayConfig.available : true;
    if (isAvailable) dates.push(buildBookingDateOption(date));
    date.setDate(date.getDate() + 1);
    daysChecked++;
  }

  return dates;
};

export const buildPreviewCalendarDates = () => {
  const dates = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  while (dates.length < 14) {
    dates.push(buildBookingDateOption(date, { isPreviewPlaceholder: true }));
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

export const getAvailableTimesForDate = ({ activeDate, schedule = {}, availableTimes = [] }) => {
  if (!activeDate) return [];
  const dayConfig = schedule?.[activeDate.localDateStr];
  return dayConfig && Array.isArray(dayConfig.times)
    ? dayConfig.times
    : (Array.isArray(availableTimes) ? availableTimes : []);
};

export const getStaffAssignmentMode = (availabilityRules = {}) => (
  ['auto', 'client', 'later'].includes(availabilityRules.staffAssignmentMode)
    ? availabilityRules.staffAssignmentMode
    : 'auto'
);

export const getPublicStaffOptions = ({ selectedService, publicStaff = [] }) => {
  if (!selectedService?.id) return [];
  const staff = Array.isArray(publicStaff) && publicStaff.length
    ? publicStaff
    : [{ id: 'owner', name: 'Owner', color: '#111827', photoURL: '' }];
  const serviceStaffIds = new Set(Array.isArray(selectedService?.staffIds) ? selectedService.staffIds : []);
  return staff
    .filter(member => member?.id && (!serviceStaffIds.size || serviceStaffIds.has(member.id)))
    .map(member => ({
      id: member.id,
      name: member.name || 'Staff',
      color: member.color || '#111827',
      photoURL: member.photoURL || ''
    }));
};

export const getBookingStepLayout = ({ showServiceStep, showStaffSelection }) => {
  const dateSectionOrder = showServiceStep ? (showStaffSelection ? 3 : 2) : 1;
  const timeSectionOrder = showServiceStep ? (showStaffSelection ? 4 : 3) : 2;
  const faqSectionOrder = showServiceStep ? (showStaffSelection ? 5 : 4) : 3;
  return {
    staffStepNumber: '02',
    dateStepNumber: showServiceStep ? (showStaffSelection ? '03' : '02') : '01',
    timeStepNumber: showServiceStep ? (showStaffSelection ? '04' : '03') : '02',
    faqStepNumber: showServiceStep ? (showStaffSelection ? '05' : '04') : '03',
    dateSectionOrder,
    timeSectionOrder,
    faqSectionOrder,
    selectionActionOrder: faqSectionOrder + 1
  };
};

export const getFunnelPageSettings = ({ settings, key }) => {
  const pageColors = settings[`${key}PageColors`] || {};
  return {
    ...settings,
    ...pageColors,
    pageSurfaceColor: pageColors.surfaceColor || '#ffffff',
    pageBorderColor: pageColors.borderColor || withColorAlpha(pageColors.bodyColor || settings.bodyColor || '#000000', 10, '#000000')
  };
};

export const getLogoDisplay = ({ nativePrecisionHeroLayout, settings }) => {
  const display = nativePrecisionHeroLayout?.logoDisplay
    ? { ...(settings.logoDisplay || {}), ...nativePrecisionHeroLayout.logoDisplay }
    : settings.logoDisplay || {};
  const size = Number(display.size);
  const alignment = ['left', 'center', 'right'].includes(display.alignment) ? display.alignment : 'left';
  return {
    visible: display.visible !== false,
    alignment,
    placement: ['title', 'top', 'badge'].includes(display.placement) ? display.placement : 'title',
    size: Number.isFinite(size) ? Math.min(176, Math.max(48, size)) : 96
  };
};

export const getBannerDisplay = ({ nativePrecisionHeroLayout, settings }) => {
  const display = nativePrecisionHeroLayout?.bannerDisplay
    ? { ...(settings.bannerDisplay || {}), ...nativePrecisionHeroLayout.bannerDisplay }
    : settings.bannerDisplay || {};
  const height = Number(display.height);
  const opacity = Number(display.opacity);
  const position = ['top', 'center', 'bottom'].includes(display.position) ? display.position : 'center';
  return {
    visible: display.visible !== false,
    placement: ['hero', 'top'].includes(display.placement) ? display.placement : 'hero',
    height: Number.isFinite(height) ? Math.min(360, Math.max(120, height)) : 220,
    opacity: Number.isFinite(opacity) ? Math.min(100, Math.max(15, opacity)) : 100,
    objectPosition: position === 'top' ? 'center top' : position === 'bottom' ? 'center bottom' : 'center center'
  };
};

export const getBlockMargins = (align) => ({
  marginLeft: align === 'left' ? 0 : 'auto',
  marginRight: align === 'right' ? 0 : 'auto'
});

export const normalizeHandle = (value = '') => (
  value.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
);

export const normalizeWebsite = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const getDateSlotStyle = ({ isActive, settings, dateStyle }) => {
  const radius = settings.buttonStyle === 'pill' ? '32px' : '12px';
  const activeColor = settings.primaryColor || '#000000';
  const baseTextColor = settings.dateTextColor || '#666666';
  const activeTextColor = settings.dateActiveTextColor || activeColor;
  const activeBg = settings.dateActiveBgColor && settings.dateActiveBgColor !== 'transparent' ? settings.dateActiveBgColor : withColorAlpha(activeColor, 10, '#000000');
  const baseBg = settings.dateBgColor && settings.dateBgColor !== 'transparent' ? settings.dateBgColor : 'transparent';
  const fontFamily = getFontFamily(settings.dateFontFamily || settings.fontFamily);
  const activeShadow = settings.calendarShadow === false
    ? 'none'
    : settings.calendarGlow
      ? `0 0 0 2px ${withColorAlpha(activeColor, 34, '#000000')}, 0 18px 44px -18px ${activeColor}`
      : `0 16px 34px -22px ${activeColor}`;

  if (dateStyle === 'solid') {
    return {
      backgroundColor: isActive ? activeBg : (baseBg === 'transparent' ? `${settings.headingColor || '#000000'}08` : baseBg),
      color: isActive ? activeTextColor : baseTextColor,
      borderRadius: radius,
      border: '1px solid transparent',
      boxShadow: isActive ? activeShadow : 'none',
      fontFamily
    };
  }
  if (dateStyle === 'outline') {
    return {
      backgroundColor: isActive ? withColorAlpha(activeColor, 5, '#000000') : 'transparent',
      color: isActive ? activeColor : baseTextColor,
      borderRadius: radius,
      border: `1px solid ${isActive ? activeColor : withColorAlpha(baseTextColor, 14, '#666666')}`,
      boxShadow: isActive ? activeShadow : 'none',
      fontFamily
    };
  }
  return {
    backgroundColor: 'transparent',
    color: isActive ? activeColor : baseTextColor,
    borderRadius: '0px',
    border: '1px solid transparent',
    fontFamily
  };
};

export const getTimeSlotStyle = ({ isActive, settings, timeSlotStyle }) => {
  const isSolid = timeSlotStyle === 'solid';
  const isOutline = timeSlotStyle === 'outline';
  const radius = settings.buttonStyle === 'pill' ? '9999px' : '12px';
  const activeColor = settings.primaryColor;
  const baseTextColor = settings.slotTextColor || '#000000';
  const fontF = getFontFamily(settings.slotFontFamily || settings.fontFamily);
  const activeBg = settings.slotActiveBgColor || activeColor;
  const activeText = settings.slotActiveTextColor || '#000000';
  const activeShadow = settings.timeSlotShadow === false
    ? 'none'
    : settings.timeSlotGlow
      ? `0 0 0 2px ${withColorAlpha(activeColor, 34, '#000000')}, 0 14px 38px -18px ${activeColor}`
      : `0 14px 34px -24px ${withColorAlpha(activeColor, 45, '#000000')}`;

  if (isSolid) {
    return {
      backgroundColor: isActive ? activeBg : (settings.slotBgColor && settings.slotBgColor !== 'transparent' ? settings.slotBgColor : '#ffffff'),
      color: isActive ? activeText : baseTextColor,
      borderRadius: radius,
      border: `1px solid ${isActive ? withColorAlpha(activeBg, 28, '#000000') : withColorAlpha(baseTextColor, 9, '#000000')}`,
      boxShadow: isActive ? activeShadow : '0 6px 16px -16px rgba(15, 23, 42, 0.24)',
      fontFamily: fontF
    };
  }
  if (isOutline) {
    return {
      backgroundColor: isActive ? withColorAlpha(activeBg, 10, '#000000') : '#ffffff',
      color: isActive ? activeColor : baseTextColor,
      borderRadius: radius,
      border: `1px solid ${isActive ? activeColor : withColorAlpha(baseTextColor, 9, '#000000')}`,
      boxShadow: isActive ? activeShadow : '0 6px 16px -16px rgba(15, 23, 42, 0.24)',
      fontFamily: fontF
    };
  }
  return { backgroundColor: 'transparent', color: isActive ? activeColor : baseTextColor, border: '1px solid transparent', borderRadius: '0px', fontFamily: fontF };
};

export const getActionButtonStyle = ({ settings, actionButtonStyle }) => {
  const radius = settings.buttonStyle === 'pill' ? '9999px' : '8px';
  const accent = settings.buttonColor || settings.primaryColor || '#000000';
  const textColor = settings.buttonTextColor || '#000000';
  const fontFamily = getFontFamily(settings.buttonFontFamily || settings.fontFamily);
  if (actionButtonStyle === 'outline') {
    return { backgroundColor: 'transparent', color: accent, border: `1px solid ${accent}`, borderRadius: radius, fontFamily };
  }
  if (actionButtonStyle === 'minimal') {
    return { backgroundColor: 'transparent', color: settings.headingColor || accent, border: '1px solid transparent', borderBottom: `2px solid ${accent}`, borderRadius: '0px', boxShadow: 'none', fontFamily };
  }
  return { backgroundColor: accent, color: textColor, border: '1px solid transparent', borderRadius: radius, fontFamily };
};

export const getFaqItemStyle = ({ settings, faqStyle }) => {
  const bg = settings.faqBgColor || 'transparent';
  const borderColor = settings.faqBorderColor || `${settings.headingColor || '#000000'}18`;
  if (faqStyle === 'solid') return { backgroundColor: bg === 'transparent' ? `${settings.headingColor || '#000000'}08` : bg, border: '1px solid transparent', borderRadius: '16px', padding: '18px' };
  if (faqStyle === 'outline') return { backgroundColor: 'transparent', border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' };
  return { backgroundColor: 'transparent', borderBottom: `1px solid ${borderColor}`, borderRadius: '0px', paddingBottom: '16px' };
};

export const getSocialLinkStyle = ({ settings, socialIconStyle }) => {
  const accent = settings.socialIconColor || settings.primaryColor || settings.headingColor || '#000000';
  const bg = settings.socialIconBgColor || 'transparent';
  if (socialIconStyle === 'solid') return { backgroundColor: bg === 'transparent' ? accent : bg, color: settings.socialIconTextColor || settings.buttonTextColor || '#000000', border: '1px solid transparent' };
  if (socialIconStyle === 'outline') return { backgroundColor: 'transparent', color: accent, border: `1px solid ${accent}55` };
  return { backgroundColor: 'transparent', color: accent, border: '1px solid transparent' };
};

export const getServiceCardStyle = ({ isActive, settings, nativeAccent, serviceBorderStyle }) => {
  const accent = settings.primaryColor || '#000000';
  const heading = settings.headingColor || '#000000';
  const inactiveBg = settings.serviceBgColor && settings.serviceBgColor !== 'transparent'
    ? settings.serviceBgColor
    : '#FFFFFF';
  const inactiveBorder = settings.serviceBorderColor || withColorAlpha(heading, 9, '#000000');
  const activeBg = settings.serviceActiveBgColor || (nativeAccent ? (settings.serviceBgColor || settings.slotBgColor || '#FFFFFF') : withColorAlpha(accent, 7, '#000000'));
  const activeBorder = settings.serviceActiveBorderColor || settings.serviceBorderColor || (nativeAccent ? accent : withColorAlpha(accent, 80, '#000000'));
  if (serviceBorderStyle === 'minimal') {
    return {
      borderColor: isActive ? activeBorder : 'transparent',
      backgroundColor: isActive ? activeBg : 'transparent',
      borderBottomColor: isActive ? activeBorder : inactiveBorder
    };
  }
  if (serviceBorderStyle === 'outline') {
    return {
      borderColor: isActive ? activeBorder : inactiveBorder,
      backgroundColor: isActive ? activeBg : inactiveBg
    };
  }
  return {
    borderColor: isActive ? activeBorder : inactiveBorder,
    backgroundColor: isActive ? activeBg : inactiveBg
  };
};
