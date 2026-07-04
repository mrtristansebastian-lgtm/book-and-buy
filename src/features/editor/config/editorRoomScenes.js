import { FileQuestion, FileText, MessageSquare, Pipette, Sparkles, Type } from 'lucide-react';

export const editorRoomScenes = [
  { id: 'introduction', number: '01', icon: MessageSquare, title: 'Booking', prompt: 'Opening booking page copy and first-step button text.' },
  { id: 'cart', number: '02', icon: FileText, title: 'Cart', prompt: 'Cart heading, helper copy, and checkout button text.' },
  { id: 'checkout', number: '03', icon: MessageSquare, title: 'Checkout Text', prompt: 'Checkout heading, helper copy, notes, and request button text.' },
  { id: 'client-form', number: '04', icon: FileText, title: 'Client Form', prompt: 'Fields clients fill in before sending the checkout request.' },
  { id: 'success', number: '05', icon: FileText, title: 'Success', prompt: 'Request confirmation copy and next-step messaging.' },
  { id: 'faq', number: '06', icon: FileQuestion, title: 'FAQ', prompt: 'Booking questions clients can read before they place a request.' },
  { id: 'colours', number: '07', icon: Pipette, title: 'Page Colours', prompt: 'Manual colour categories for the booking page.' },
  { id: 'typography', number: '08', icon: Type, title: 'Typography', prompt: 'Font system for headings, labels, and body text.' },
  { id: 'style', number: '09', icon: Sparkles, title: 'Style System', prompt: 'Visual direction and service browsing style for the booking journey.' }
];

const previewStepRoomIds = {
  select: ['introduction', 'faq', 'colours', 'typography', 'style'],
  cart: ['cart', 'colours'],
  details: ['checkout', 'client-form', 'colours'],
  success: ['success', 'colours']
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
