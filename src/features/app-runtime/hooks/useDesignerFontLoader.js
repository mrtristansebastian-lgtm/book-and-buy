import { useEffect } from 'react';

export function useDesignerFontLoader({
  activeTab,
  editorTab,
  isMobileEditorRuntime,
  publicSlug
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldLoadDesignerFonts = Boolean(publicSlug || activeTab === 'editor');
    if (shouldLoadDesignerFonts) {
      window.__loadBuildABookingFonts?.();
      window.dispatchEvent(new Event('build-a-booking:load-fonts'));
    }
  }, [activeTab, editorTab, isMobileEditorRuntime, publicSlug]);
}
