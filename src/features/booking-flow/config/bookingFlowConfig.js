export const bookingStyleDirections = ['native-precision', 'command-flow'];

export const previewTimeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

export const previewServiceSamples = [
  {
    id: 'preview-service-primary',
    name: 'Service name',
    category: 'Category',
    description: 'Short service description appears here.',
    duration: '60',
    price: '',
    active: true,
    imageUrls: [],
    isPreviewPlaceholder: true
  },
  {
    id: 'preview-service-secondary',
    name: 'Second service',
    category: 'Category',
    description: 'Use this empty state to tune service layout.',
    duration: '30',
    price: '',
    active: true,
    imageUrls: [],
    isPreviewPlaceholder: true
  }
];

export const previewFaqItems = [
  {
    q: 'How do I know my booking is confirmed?',
    a: 'Your request is sent to the business first. Once they approve the slot, your booking status and updates are handled from the booking page flow.',
    isPreviewPlaceholder: true
  },
  {
    q: 'What happens if payment is needed?',
    a: 'You can place the booking request first. If the business needs payment, the checkout step or follow-up instructions will guide you clearly.',
    isPreviewPlaceholder: true
  }
];

export const createPreviewSocialLinks = () => [
  { key: 'preview-instagram', label: 'Instagram', href: '#', isPreviewPlaceholder: true },
  { key: 'preview-tiktok', label: 'TikTok', href: '#', isPreviewPlaceholder: true },
  { key: 'preview-facebook', label: 'Facebook', href: '#', isPreviewPlaceholder: true },
  { key: 'preview-website', label: 'Website', href: '#', isPreviewPlaceholder: true }
];
