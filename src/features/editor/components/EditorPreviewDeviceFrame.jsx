import { lazy, Suspense } from 'react';
import {
  Battery,
  RefreshCw,
  Signal,
  Wifi
} from 'lucide-react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { BrandLoader, LazySectionFallback } from '../../../components/AppLoading';
import { getPreviewScale } from '../utils/editorPreviewModel';

const EditorBookingPreview = lazy(() => (
  import('./EditorBookingPreview').then((module) => ({ default: module.EditorBookingPreview }))
));

export function EditorPreviewDeviceFrame({
  bookingPreviewSettings,
  device,
  editorPreviewFrame,
  editorPreviewFrameClass,
  editorPreviewScrollRef,
  handleBookingComplete,
  handleEditorDeviceChange,
  handleSettingChange,
  handleSettingImageUpload,
  isCompactEditorViewport,
  previewKey,
  previewStep,
  previewStepLocksScroll,
  scale,
  settings,
  shouldMountEditorPreview,
  showPortraitDesktopEditorPrompt
}) {
  const previewScale = getPreviewScale({ scale, editorPreviewFrame });

  if (showPortraitDesktopEditorPrompt) {
    return (
      <div className="editor-portrait-desktop-prompt" role="status" aria-live="polite">
        <div>
          <RefreshCw size={20} />
          <span>PC mockup</span>
        </div>
        <h3>Please rotate your phone.</h3>
        <p>Landscape gives the PC preview enough room to edit without squashing the page.</p>
        <button type="button" onClick={() => handleEditorDeviceChange('mobile')}>Back to mobile</button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${editorPreviewFrame.width}px`,
        height: `${editorPreviewFrame.height}px`,
        transform: `scale(${previewScale})`,
        transformOrigin: isCompactEditorViewport ? 'top center' : 'center center'
      }}
      className="editor-preview-mount-shell"
    >
      <div
        style={{
          width: `${editorPreviewFrame.width}px`,
          height: `${editorPreviewFrame.height}px`,
          '--booking-preview-input-color': settings.headingColor || '#050505'
        }}
        className={`editor-preview-frame ${device === 'mobile' ? 'is-mobile-preview' : 'is-desktop-preview'} relative flex flex-col shrink-0 bg-white shadow-[0_100px_200px_-50px_rgba(0,0,0,0.15)] border-black overflow-hidden ${editorPreviewFrameClass}`}
      >
        {device === 'mobile' && (
          <>
            <div className={`editor-device-status-bar absolute left-10 right-10 z-[100] flex justify-between items-center text-black font-bold tracking-tight ${isCompactEditorViewport ? 'top-4 text-[11px]' : 'top-5 text-[13px]'}`}>
              <span>9:41</span><div className="flex gap-2 items-center"><Signal size={14} /><Wifi size={14} /><Battery size={18} strokeWidth={2} /></div>
            </div>
            <div className={`absolute -left-[10px] w-1 bg-black rounded-r-lg z-[100] ${isCompactEditorViewport ? 'top-28 h-14' : 'top-32 h-16'}`} />
            <div className={`absolute -left-[10px] w-1 bg-black rounded-r-lg z-[100] ${isCompactEditorViewport ? 'top-44 h-10' : 'top-52 h-12'}`} />
            <div className={`absolute -right-[10px] w-1 bg-black rounded-l-lg z-[100] ${isCompactEditorViewport ? 'top-36 h-20' : 'top-44 h-24'}`} />
          </>
        )}

        <div className={`flex-shrink-0 border-b flex items-center justify-between editor-device-browser-bar ${device === 'desktop' ? (isCompactEditorViewport ? 'px-10 h-20 bg-neutral-50/50' : 'px-16 h-24 bg-neutral-50/50') : (isCompactEditorViewport ? 'px-7 h-20 pt-5 bg-white' : 'px-8 h-24 pt-7 bg-white')}`} style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          <div className="flex gap-3 w-16">
            {device === 'desktop' && <><div className="w-3.5 h-3.5 rounded-full bg-red-400/80" /><div className="w-3.5 h-3.5 rounded-full bg-amber-400/80" /><div className="w-3.5 h-3.5 rounded-full bg-green-400/80" /></>}
          </div>
          <div className={`flex items-center justify-center gap-2 rounded-full bg-black/5 font-bold text-neutral-500 uppercase overflow-hidden ${device === 'desktop' ? 'px-8 py-2.5 text-[10px] tracking-[0.3em] w-1/2 max-w-[400px]' : 'px-5 py-2 text-[8px] tracking-[0.2em] max-w-[200px]'}`}>
            <span className="truncate whitespace-nowrap">/book/{settings.slug || 'studio'}</span>
          </div>
          <div className="w-16" />
        </div>

        <div
          ref={editorPreviewScrollRef}
          className={`flex-1 ${previewStepLocksScroll ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden no-scrollbar relative group/simulator`}
          style={{
            backgroundColor: settings.backgroundColor,
            overscrollBehavior: previewStepLocksScroll ? 'none' : 'auto',
            overscrollBehaviorX: 'none',
            touchAction: previewStepLocksScroll ? 'none' : 'pan-y'
          }}
        >
          {shouldMountEditorPreview ? (
            <Suspense fallback={<LazySectionFallback label="Loading preview" />}>
              <AppErrorBoundary compact label="Live Preview" resetKey={previewKey}>
                <EditorBookingPreview
                  previewKey={previewKey}
                  settings={bookingPreviewSettings}
                  previewStep={previewStep}
                  onSettingChange={handleSettingChange}
                  onMediaUpload={(key, file) => handleSettingImageUpload(key, file, 'brand')}
                  onComplete={handleBookingComplete}
                />
              </AppErrorBoundary>
            </Suspense>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <BrandLoader label="Loading preview" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
