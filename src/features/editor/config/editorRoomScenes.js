import { FileQuestion, FileText, LayoutList, MessageSquare, Pipette, Sparkles, Type } from 'lucide-react';

export const editorRoomScenes = [
  { id: 'introduction', number: '01', icon: MessageSquare, title: 'Booking', prompt: 'Opening booking page copy and first-step button text.' },
  { id: 'services', number: '02', icon: LayoutList, title: 'Services', prompt: 'Choose how clients browse and select services.' },
  { id: 'cart', number: '03', icon: FileText, title: 'Cart', prompt: 'Cart heading, helper copy, and checkout button text.' },
  { id: 'checkout', number: '04', icon: MessageSquare, title: 'Checkout Text', prompt: 'Checkout heading, helper copy, notes, and request button text.' },
  { id: 'client-form', number: '05', icon: FileText, title: 'Client Form', prompt: 'Fields clients fill in before sending the checkout request.' },
  { id: 'success', number: '06', icon: FileText, title: 'Success', prompt: 'Request confirmation copy and next-step messaging.' },
  { id: 'faq', number: '07', icon: FileQuestion, title: 'FAQ', prompt: 'Booking questions clients can read before they place a request.' },
  { id: 'colours', number: '08', icon: Pipette, title: 'Page Colours', prompt: 'Manual colour categories for the booking page.' },
  { id: 'typography', number: '09', icon: Type, title: 'Typography', prompt: 'Font system for headings, labels, and body text.' },
  { id: 'style', number: '10', icon: Sparkles, title: 'Style System', prompt: 'One curated visual direction for the complete booking journey.' }
];

const previewStepRoomIds = {
  select: ['introduction', 'services', 'faq', 'colours', 'typography', 'style'],
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
