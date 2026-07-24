import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  ClipboardList,
  CreditCard,
  Grid2X2,
  HelpCircle,
  Images,
  MessageSquare,
  Share2,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

export const editorRoomScenes = [
  {
    id: 'style',
    number: '00',
    icon: Sparkles,
    title: 'Page Style',
    navLabel: 'Page',
    category: 'Global',
    prompt: 'Set the overall visual direction for this booking experience.',
    settings: ['Direction']
  },
  {
    id: 'introduction',
    number: '01',
    icon: MessageSquare,
    title: 'Hero Section',
    navLabel: 'Hero',
    category: 'Section',
    prompt: 'Business name, intro copy, and the first action clients see.',
    settings: ['Copy', 'CTA']
  },
  {
    id: 'services',
    number: '02',
    icon: Grid2X2,
    title: 'Services Section',
    navLabel: 'Services',
    category: 'Section',
    prompt: 'Choose how services are browsed and how selected cards feel.',
    settings: ['Layout', 'Cards', 'Colours']
  },
  {
    id: 'calendar',
    number: '03',
    icon: CalendarDays,
    title: 'Calendar Section',
    navLabel: 'Calendar',
    category: 'Section',
    prompt: 'Set the date-picker colours used on your booking page.',
    settings: ['Layout', 'Selection', 'Colours']
  },
  {
    id: 'time-slots',
    number: '04',
    icon: Clock3,
    title: 'Time Slots',
    navLabel: 'Times',
    category: 'Section',
    prompt: 'Control how available and selected booking times appear.',
    settings: ['Layout', 'Selection', 'Colours']
  },
  {
    id: 'faq',
    number: '05',
    icon: HelpCircle,
    title: 'FAQ Section',
    navLabel: 'FAQ',
    category: 'Section',
    prompt: 'Manage questions, answers, layout, and section colours.',
    settings: ['Questions', 'Layout', 'Colours']
  },
  {
    id: 'venue',
    number: '06',
    icon: Images,
    title: 'Venue Section',
    navLabel: 'Venue',
    category: 'Section',
    prompt: 'Choose the gallery and map presentation clients will see.',
    settings: ['Gallery', 'Map', 'Colours']
  },
  {
    id: 'social',
    number: '07',
    icon: Share2,
    title: 'Social Section',
    navLabel: 'Socials',
    category: 'Section',
    prompt: 'Set social links and footer presentation.',
    settings: ['Links', 'Layout', 'Colours']
  },
  {
    id: 'cart',
    number: '01',
    icon: ShoppingBag,
    title: 'Cart Section',
    navLabel: 'Cart',
    category: 'Section',
    prompt: 'Review screen heading, helper copy, and next button.',
    settings: ['Copy', 'CTA']
  },
  {
    id: 'checkout',
    number: '01',
    icon: CreditCard,
    title: 'Checkout Section',
    navLabel: 'Checkout',
    category: 'Section',
    prompt: 'Checkout heading, helper text, details intro, and request button.',
    settings: ['Copy', 'CTA', 'Details']
  },
  {
    id: 'client-form',
    number: '02',
    icon: ClipboardList,
    title: 'Client Details',
    navLabel: 'Details',
    category: 'Section',
    prompt: 'Choose which details clients must provide before requesting.',
    settings: ['Fields', 'Contact']
  },
  {
    id: 'success',
    number: '01',
    icon: BadgeCheck,
    title: 'Success Section',
    navLabel: 'Success',
    category: 'Section',
    prompt: 'Confirmation copy, next-step message, and restart link.',
    settings: ['Copy', 'Next step']
  },
];

const previewStepRoomIds = {
  select: ['style', 'introduction', 'services', 'calendar', 'time-slots', 'faq', 'venue', 'social'],
  cart: ['style', 'cart'],
  details: ['style', 'checkout', 'client-form'],
  success: ['style', 'success']
};

export const previewStepPrimaryRoom = {
  select: 'introduction',
  cart: 'cart',
  details: 'checkout',
  success: 'success'
};

export const getEditorRoomId = (roomId, fallback = 'style') => (
  editorRoomScenes.some(scene => scene.id === roomId) ? roomId : fallback
);

export const getEditorRoomScenesForPreviewStep = (previewStep = 'select') => {
  const roomIds = previewStepRoomIds[previewStep] || previewStepRoomIds.select;
  return roomIds
    .map(roomId => editorRoomScenes.find(scene => scene.id === roomId))
    .filter(Boolean);
};
