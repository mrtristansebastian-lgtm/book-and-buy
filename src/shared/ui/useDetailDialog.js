import { useRef } from 'react';
import { useDialogFocus } from './useDialogFocus';

export function useDetailDialog(open, onClose, isPage = false) {
  const ref = useRef(null);
  useDialogFocus(ref, open && !isPage, onClose);
  return ref;
}
