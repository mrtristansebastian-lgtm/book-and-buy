import { useEffect } from 'react';

export function useDesignerFontLoader({
  activeTab,
  editorTab,
  isMobileEditorRuntime,
  publicSlug
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldLoadDesignerFonts = publicSlug || (
      activeTab === 'editor' &&
      ['typography', 'style'].includes(editorTab) &&
      !isMobileEditorRuntime
    );
    if (shouldLoadDesignerFonts) {
      window.__loadBuildABookingFonts?.();
      window.dispatchEvent(new Event('build-a-booking:load-fonts'));
    }
  }, [activeTab, editorTab, isMobileEditorRuntime, publicSlug]);
}
