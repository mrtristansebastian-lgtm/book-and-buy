import { EditorPreviewDeviceFrame } from './EditorPreviewDeviceFrame';
import { EditorPreviewRoomNav } from './EditorPreviewRoomNav';
import { EditorPreviewToolbar } from './EditorPreviewToolbar';
import { buildPreviewPublicStaff } from '../utils/editorPreviewModel';

export const EditorPreviewWorkspace = ({
  containerRef,
  device,
  editorPreviewFrame,
  editorPreviewFrameClass,
  editorPreviewScrollRef,
  editorPreviewSettings,
  editorRoomNavOffset,
  editorRoomScenes,
  editorStudioModal,
  endEditorRoomNavDrag,
  handleAddToHomeScreen,
  handleBookingComplete,
  handleEditorDeviceChange,
  handleSettingChange,
  handleSettingImageUpload,
  isCompactEditorViewport,
  mobileNavCollapsed,
  moveEditorRoomNavDrag,
  openEditorRoom,
  previewKey,
  previewStep,
  scale,
  setEditorRoomNavOffset,
  setMobileNavCollapsed,
  setPreviewKey,
  setPreviewStep,
  shouldMountEditorPreview,
  showPortraitDesktopEditorPrompt,
  startEditorRoomNavDrag,
  staffList = [],
  settings
}) => {
  const previewPublicStaff = Array.isArray(editorPreviewSettings.publicStaff) && editorPreviewSettings.publicStaff.length
    ? editorPreviewSettings.publicStaff
    : buildPreviewPublicStaff(staffList);
  const bookingPreviewSettings = {
    ...editorPreviewSettings,
    publicStaff: previewPublicStaff
  };
  const previewStepLocksScroll = previewStep && previewStep !== 'select';

  return (
    <div ref={containerRef} className="mobile-editor-preview flex-1 bg-[#F5F5F7] flex flex-col items-center justify-center relative overflow-hidden p-6 md:p-8">
      <EditorPreviewToolbar
        device={device}
        editorPreviewScrollRef={editorPreviewScrollRef}
        handleAddToHomeScreen={handleAddToHomeScreen}
        handleEditorDeviceChange={handleEditorDeviceChange}
        mobileNavCollapsed={mobileNavCollapsed}
        openEditorRoom={openEditorRoom}
        previewStep={previewStep}
        setMobileNavCollapsed={setMobileNavCollapsed}
        setPreviewKey={setPreviewKey}
        setPreviewStep={setPreviewStep}
      />

      <EditorPreviewRoomNav
        device={device}
        editorRoomNavOffset={editorRoomNavOffset}
        editorRoomScenes={editorRoomScenes}
        editorStudioModal={editorStudioModal}
        endEditorRoomNavDrag={endEditorRoomNavDrag}
        moveEditorRoomNavDrag={moveEditorRoomNavDrag}
        openEditorRoom={openEditorRoom}
        setEditorRoomNavOffset={setEditorRoomNavOffset}
        startEditorRoomNavDrag={startEditorRoomNavDrag}
      />

      <EditorPreviewDeviceFrame
        bookingPreviewSettings={bookingPreviewSettings}
        device={device}
        editorPreviewFrame={editorPreviewFrame}
        editorPreviewFrameClass={editorPreviewFrameClass}
        editorPreviewScrollRef={editorPreviewScrollRef}
        handleBookingComplete={handleBookingComplete}
        handleEditorDeviceChange={handleEditorDeviceChange}
        handleSettingChange={handleSettingChange}
        handleSettingImageUpload={handleSettingImageUpload}
        isCompactEditorViewport={isCompactEditorViewport}
        previewKey={previewKey}
        previewStep={previewStep}
        previewStepLocksScroll={previewStepLocksScroll}
        scale={scale}
        settings={settings}
        shouldMountEditorPreview={shouldMountEditorPreview}
        showPortraitDesktopEditorPrompt={showPortraitDesktopEditorPrompt}
      />
    </div>
  );
};
