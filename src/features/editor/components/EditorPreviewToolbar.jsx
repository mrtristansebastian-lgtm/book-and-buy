import {
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Share2
} from 'lucide-react';
import {
  editorPreviewSteps,
  getPreviewStepRoomId
} from '../utils/editorPreviewModel';

export function EditorPreviewToolbar({
  device,
  editorPreviewScrollRef,
  handleAddToHomeScreen,
  handleEditorDeviceChange,
  mobileNavCollapsed,
  openEditorRoom,
  previewStep,
  setMobileNavCollapsed,
  setPreviewKey,
  setPreviewStep
}) {
  const handlePreviewStepChange = (stepId) => {
    setPreviewStep?.(stepId);
    const roomId = getPreviewStepRoomId(stepId);
    if (roomId) openEditorRoom?.(roomId);
    requestAnimationFrame(() => {
      if (editorPreviewScrollRef?.current) {
        editorPreviewScrollRef.current.scrollTop = 0;
      }
    });
  };

  return (
    <>
      <div className="mobile-editor-preview-toolbar absolute top-4 md:top-8 z-50">
        <div className="editor-preview-control-row">
          <div className="mobile-editor-device-switcher editor-preview-device-switcher flex bg-white/60 backdrop-blur-xl p-1.5 rounded-full border border-white/80 shadow-sm">
            <button onClick={() => handleEditorDeviceChange('desktop')} className={`mobile-editor-device-option editor-preview-device-option px-8 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-[0.4em] transition-all duration-700 ${device === 'desktop' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:text-black'}`}>PC</button>
            <button onClick={() => handleEditorDeviceChange('mobile')} className={`mobile-editor-device-option editor-preview-device-option px-8 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-[0.4em] transition-all duration-700 ${device === 'mobile' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:text-black'}`}>Mobile</button>
          </div>
          <div className="mobile-editor-device-switcher editor-preview-step-switcher flex bg-white/60 backdrop-blur-xl p-1.5 rounded-full border border-white/80 shadow-sm overflow-x-auto no-scrollbar">
            {editorPreviewSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => handlePreviewStepChange(step.id)}
                className={`mobile-editor-device-option editor-preview-step-option px-4 md:px-5 py-2 rounded-full text-[8px] font-bold uppercase tracking-[0.28em] transition-all duration-500 whitespace-nowrap ${previewStep === step.id ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:text-black'}`}
              >
                {step.label}
              </button>
            ))}
          </div>
          <div className="mobile-editor-toolbar-actions hidden md:flex items-center gap-2">
            <button onClick={handleAddToHomeScreen} className="mobile-editor-install-action hidden h-11 px-4 rounded-full bg-black text-white shadow-lg border border-black transition-all items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest">
              <Share2 size={15} />
              Home Screen
            </button>
            <button type="button" aria-label="Refresh booking preview" onClick={() => setPreviewKey(prev => prev + 1)} className="mobile-editor-refresh-action p-3 rounded-full bg-white text-neutral-400 hover:text-black shadow-lg border border-white/80 transition-all hidden md:block"><RefreshCw size={16} /></button>
          </div>
        </div>
      </div>

      <div className="mobile-editor-compact-controls md:hidden absolute right-4 bottom-4 z-[180] items-center gap-2 rounded-full bg-black/80 p-1.5 shadow-2xl backdrop-blur-xl border border-white/10">
        <button
          type="button"
          onClick={() => setMobileNavCollapsed(prev => !prev)}
          className={`h-10 px-3 rounded-full flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest transition-all ${mobileNavCollapsed ? 'bg-[#39FF14] text-black' : 'bg-white/10 text-white'}`}
          aria-pressed={mobileNavCollapsed}
        >
          {mobileNavCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          Nav
        </button>
      </div>
    </>
  );
}
