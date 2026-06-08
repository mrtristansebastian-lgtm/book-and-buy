import { useLayoutEffect, useRef, useState } from 'react';
import { getEditorPreviewFrame } from '../../../config/appConfig';

export function useEditorPreviewScale({
  activeTab,
  collapsed,
  containerRef,
  device,
  mobileNavCollapsed,
  shouldMountPreview,
  sidebarCollapsed,
  studioModal
}) {
  const [scale, setScale] = useState(1);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const scaleRef = useRef(1);
  const compactViewportRef = useRef(false);

  useLayoutEffect(() => {
    if (activeTab !== 'editor' || !shouldMountPreview) return undefined;

    let frameRequest = 0;
    const isMobileEditorViewport = (container = containerRef.current) => {
      const rect = container?.getBoundingClientRect();
      const constrainedStage = rect ? rect.height < 650 : false;
      const mobileLandscape = window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(orientation: landscape)').matches;
      return (
        window.innerWidth < 768 ||
        window.innerHeight <= 560 ||
        constrainedStage ||
        mobileLandscape
      );
    };
    const updateScale = () => {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = window.requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const compact = activeTab === 'editor' && isMobileEditorViewport(containerRef.current);
        if (compactViewportRef.current !== compact) {
          compactViewportRef.current = compact;
          setIsCompactViewport(compact);
        }
        const shortLandscapeEditor = compact
          && device === 'desktop'
          && window.matchMedia('(orientation: landscape)').matches
          && window.innerHeight <= 700
          && window.innerWidth <= 1400;
        const baseFrame = getEditorPreviewFrame(device, compact);
        const nextFrame = shortLandscapeEditor
          ? {
              ...baseFrame,
              maxScale: Math.min(baseFrame.maxScale, 0.72),
              paddingX: Math.max(baseFrame.paddingX, 120),
              paddingY: Math.max(baseFrame.paddingY, 190)
            }
          : baseFrame;
        const collapsedNavGain = compact && mobileNavCollapsed ? 24 : 0;
        const collapsedPanelGain = collapsed ? (compact ? 16 : 28) : 0;
        const paddingX = Math.max(12, nextFrame.paddingX - collapsedPanelGain);
        const paddingY = Math.max(58, nextFrame.paddingY - collapsedNavGain);
        const roomPanelReserve = studioModal && !compact && window.innerWidth > 900
          ? Math.min(Math.max(window.innerWidth * 0.32, 352), 448) + 54
          : 0;
        const availablePreviewWidth = Math.max(260, rect.width - roomPanelReserve);
        const nextScale = Math.min(
          (availablePreviewWidth - paddingX) / nextFrame.width,
          (rect.height - paddingY) / nextFrame.height,
          nextFrame.maxScale
        );
        const boundedScale = Math.max(nextFrame.minScale, nextScale);
        if (Math.abs(scaleRef.current - boundedScale) > 0.002) {
          scaleRef.current = boundedScale;
          setScale(boundedScale);
        }
      });
    };

    updateScale();
    const t1 = setTimeout(updateScale, 50);
    const t2 = setTimeout(updateScale, 400);
    const t3 = setTimeout(updateScale, 800);
    const t4 = setTimeout(updateScale, 1200);
    const resizeObserver = typeof ResizeObserver !== 'undefined' && containerRef.current
      ? new ResizeObserver(updateScale)
      : null;
    if (resizeObserver && containerRef.current) resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateScale);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.cancelAnimationFrame(frameRequest);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [activeTab, collapsed, containerRef, device, mobileNavCollapsed, shouldMountPreview, sidebarCollapsed, studioModal]);

  return { isCompactViewport, scale };
}
