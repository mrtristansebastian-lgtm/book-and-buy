import { useEffect, useRef, useState } from 'react';

import { getEditorPreviewFrame } from '../../../config/appConfig';
import {
  getEditorRoomId,
  getEditorRoomScenesForPreviewStep,
  previewStepPrimaryRoom
} from '../config/editorRoomScenes';
import { useEditorAudio } from './useEditorAudio';
import { useEditorPreviewScale } from './useEditorPreviewScale';
import { useEditorResponsiveState } from './useEditorResponsiveState';
import { useEditorRoomNavDrag } from './useEditorRoomNavDrag';
import {
  getEditorFrameClass,
  getPreviewStepForEditorRoom,
  isInitialMobileDevice
} from '../utils/editorRuntimeModel';

export function useEditorRuntime({ activeTab, setEditorTab, sidebarCollapsed }) {
  const [studioModal, setStudioModal] = useState(null);
  const [device, setDevice] = useState(() => (isInitialMobileDevice() ? 'mobile' : 'desktop'));
  const [previewStep, setPreviewStep] = useState('select');
  const [previewKey, setPreviewKey] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavCollapsed, setMobileNavCollapsed] = useState(false);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const previewScrollRef = useRef(null);

  const shouldMountPreview = activeTab === 'editor';
  const { isMobileRuntime, isPortraitMobileRuntime } = useEditorResponsiveState();
  const { isCompactViewport, scale } = useEditorPreviewScale({
    activeTab,
    collapsed,
    containerRef,
    device,
    mobileNavCollapsed,
    shouldMountPreview,
    sidebarCollapsed,
    studioModal
  });
  const {
    endRoomNavDrag,
    moveRoomNavDrag,
    roomNavOffset,
    setRoomNavOffset,
    startRoomNavDrag
  } = useEditorRoomNavDrag();
  const { playMobileNavSound, playStudioSound } = useEditorAudio();

  const isMobileEditorRuntime = isMobileRuntime || isCompactViewport;
  const frame = getEditorPreviewFrame(device, isCompactViewport);
  const frameClass = getEditorFrameClass(device, isCompactViewport);
  const showPortraitDesktopPrompt = isPortraitMobileRuntime && device === 'desktop';

  useEffect(() => {
    if (!studioModal) return;
    const availableRooms = getEditorRoomScenesForPreviewStep(previewStep);
    if (availableRooms.some(room => room.id === studioModal)) return;
    const fallbackRoomId = previewStepPrimaryRoom[previewStep] || previewStepPrimaryRoom.select;
    setStudioModal(fallbackRoomId);
    setEditorTab(fallbackRoomId);
  }, [previewStep, setEditorTab, studioModal]);

  useEffect(() => {
    if (activeTab !== 'editor' || typeof window === 'undefined') return undefined;
    let lastLandscape = window.matchMedia('(orientation: landscape)').matches;
    let settleTimer = 0;

    const resetMobileEditorPosition = () => {
      setCollapsed(false);
      setMobileNavCollapsed(false);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
        containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    const handleOrientationSettle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const nextLandscape = window.matchMedia('(orientation: landscape)').matches;
        if (nextLandscape === lastLandscape) return;
        lastLandscape = nextLandscape;
        resetMobileEditorPosition();
      }, 180);
    };

    window.addEventListener('orientationchange', handleOrientationSettle);
    window.addEventListener('resize', handleOrientationSettle);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('orientationchange', handleOrientationSettle);
      window.removeEventListener('resize', handleOrientationSettle);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'editor') {
      setMobileNavCollapsed(false);
    }
  }, [activeTab]);

  const openRoom = (roomId) => {
    const normalizedRoomId = getEditorRoomId(roomId);
    const nextPreviewStep = getPreviewStepForEditorRoom(normalizedRoomId);
    setStudioModal(normalizedRoomId);
    setEditorTab(normalizedRoomId);
    if (nextPreviewStep) setPreviewStep(nextPreviewStep);
    playStudioSound('step');
  };

  const resetPreviewScroll = () => {
    requestAnimationFrame(() => {
      const scroller = previewScrollRef.current;
      if (scroller) {
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }
    });
  };

  const handleDeviceChange = async (nextDevice) => {
    setDevice(nextDevice);
    if (nextDevice !== 'desktop' || !isPortraitMobileRuntime) return;
    setStudioModal(null);
    try {
      await window.screen?.orientation?.lock?.('landscape');
    } catch {
      // The rotate prompt in the preview handles locked-orientation browsers.
    }
  };

  return {
    collapsed,
    containerRef,
    contentRef,
    device,
    endRoomNavDrag,
    frame,
    frameClass,
    handleDeviceChange,
    isCompactViewport,
    isMobileEditorRuntime,
    isMobileRuntime,
    isPortraitMobileRuntime,
    mobileNavCollapsed,
    moveRoomNavDrag,
    openRoom,
    playMobileNavSound,
    previewKey,
    previewStep,
    previewScrollRef,
    resetPreviewScroll,
    roomNavOffset,
    scale,
    setCollapsed,
    setMobileNavCollapsed,
    setPreviewKey,
    setPreviewStep,
    setRoomNavOffset,
    setStudioModal,
    shouldMountPreview,
    showPortraitDesktopPrompt,
    startRoomNavDrag,
    studioModal
  };
}
