import { PanelRightClose, PanelRightOpen } from 'lucide-react';

import { EditorLaunchControls } from '../components/EditorLaunchControls';
import { EditorPreviewWorkspace } from '../components/EditorPreviewWorkspace';
import { EditorRoomRenderer } from '../components/EditorRoomRenderer';
import { EditorSettingsPanel } from '../components/EditorSettingsPanel';
import { getEditorRoomScenesForPreviewStep } from '../config/editorRoomScenes';

export function EditorPage({
  actions,
  bookingPage,
  colour,
  editor,
  form,
  preview,
  settings,
  staffList = []
}) {
  const activeEditorRoomScenes = getEditorRoomScenesForPreviewStep(preview.previewStep);

  return (
    <div className={`flex-1 flex overflow-hidden mobile-editor-shell editor-fullscreen-workspace editor-preview-device-${editor.device} bg-[#F5F5F7] ${editor.studioModal ? 'mobile-editor-room-open' : ''} ${editor.isPortraitMobileRuntime ? 'mobile-editor-portrait-runtime' : ''} ${editor.collapsed ? 'mobile-editor-panel-is-collapsed' : ''} ${editor.mobileNavCollapsed ? 'mobile-editor-nav-is-collapsed' : ''}`}>
      <EditorSettingsPanel
        editorCollapsed={editor.collapsed}
        editorContentRef={editor.contentRef}
        editorRoomScenes={activeEditorRoomScenes}
        editorStudioModal={editor.studioModal}
        onCloseSettings={() => editor.setStudioModal(null)}
        openEditorRoom={actions.openRoom}
        launchControls={(
          <EditorLaunchControls
            bookingPageRoute={bookingPage.route}
            bookingPageUrl={bookingPage.url}
            copyToClipboard={bookingPage.copyToClipboard}
            editorLaunchPanel={bookingPage.launchPanel}
            onOpenBookingPage={bookingPage.onOpen}
            onSave={bookingPage.onSave}
            setEditorLaunchPanel={bookingPage.setLaunchPanel}
          />
        )}
      >
        {({ activeScene }) => (
          <EditorRoomRenderer
            activeScene={activeScene}
            actions={actions}
            bookingPage={bookingPage}
            colour={colour}
            form={form}
            previewStep={preview.previewStep}
            settings={settings}
          />
        )}
      </EditorSettingsPanel>

      <button
        type="button"
        onClick={() => editor.setCollapsed(!editor.collapsed)}
        aria-label={editor.collapsed ? 'Expand editor controls' : 'Collapse editor controls'}
        title={editor.collapsed ? 'Expand editor controls' : 'Collapse editor controls'}
        className="desktop-editor-panel-toggle hidden md:flex fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100] w-12 h-12 bg-white border border-neutral-100 rounded-full shadow-2xl items-center justify-center text-neutral-400 hover:text-black transition-all hover:scale-110"
      >
        {editor.collapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
      </button>

      <EditorPreviewWorkspace
        containerRef={preview.containerRef}
        device={editor.device}
        editorPreviewFrame={preview.frame}
        editorPreviewFrameClass={preview.frameClass}
        editorPreviewScrollRef={preview.scrollRef}
        editorPreviewSettings={preview.settings}
        editorRoomNavOffset={preview.roomNavOffset}
        editorRoomScenes={activeEditorRoomScenes}
        editorStudioModal={editor.studioModal}
        endEditorRoomNavDrag={preview.endRoomNavDrag}
        handleAddToHomeScreen={actions.onAddToHomeScreen}
        handleBookingComplete={actions.onBookingComplete}
        handleEditorDeviceChange={actions.onDeviceChange}
        handleSettingChange={actions.onSettingChange}
        handleSettingImageUpload={actions.onSettingImageUpload}
        isCompactEditorViewport={preview.isCompactViewport}
        mobileNavCollapsed={editor.mobileNavCollapsed}
        moveEditorRoomNavDrag={preview.moveRoomNavDrag}
        openEditorRoom={actions.openRoom}
        previewKey={preview.key}
        previewStep={preview.previewStep}
        scale={preview.scale}
        setEditorRoomNavOffset={preview.setRoomNavOffset}
        setMobileNavCollapsed={editor.setMobileNavCollapsed}
        setPreviewKey={preview.setKey}
        setPreviewStep={preview.setPreviewStep}
        shouldMountEditorPreview={preview.shouldMount}
        showPortraitDesktopEditorPrompt={preview.showPortraitDesktopPrompt}
        startEditorRoomNavDrag={preview.startRoomNavDrag}
        staffList={staffList}
        settings={settings}
      />
    </div>
  );
}
