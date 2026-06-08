export const editorPreviewSteps = [
  { id: 'select', label: 'Booking', roomId: 'introduction' },
  { id: 'cart', label: 'Cart', roomId: 'cart' },
  { id: 'details', label: 'Checkout', roomId: 'checkout' },
  { id: 'success', label: 'Success', roomId: 'success' }
];

export const buildPreviewPublicStaff = (staffList = []) => (
  (Array.isArray(staffList) ? staffList : [])
    .filter(staff => staff?.id && staff.accessEnabled !== false)
    .map(staff => ({
      id: staff.id,
      name: staff.name || staff.displayName || 'Team member',
      color: staff.color || '#111827',
      photoURL: staff.photoURL || ''
    }))
);

export const getPreviewStepRoomId = (stepId) => (
  editorPreviewSteps.find(step => step.id === stepId)?.roomId || ''
);

export const getPreviewScale = ({ scale, editorPreviewFrame }) => (
  Math.min(
    Number.isFinite(scale) ? scale : editorPreviewFrame.maxScale,
    editorPreviewFrame.maxScale
  )
);
