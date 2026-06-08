import { ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';

const FLUSH_PANEL_SCENES = new Set(['colours', 'introduction', 'cart', 'checkout', 'success', 'client-form']);

export const EditorSettingsPanel = ({
  children,
  editorCollapsed,
  editorContentRef,
  editorRoomScenes,
  editorStudioModal,
  launchControls,
  onCloseSettings,
  openEditorRoom
}) => {
  const scenes = editorRoomScenes;
  const activeSceneId = editorStudioModal || 'introduction';
  const activeIndex = Math.max(0, scenes.findIndex(scene => scene.id === activeSceneId));
  const activeScene = scenes[activeIndex] || scenes[0];
  const ActiveSceneIcon = activeScene.icon;
  const isFlushPanelScene = FLUSH_PANEL_SCENES.has(activeScene.id);
  const goScene = (sceneId) => {
    openEditorRoom(sceneId);
  };
  const goNext = () => goScene(scenes[Math.min(scenes.length - 1, activeIndex + 1)].id);
  const goPrev = () => goScene(scenes[Math.max(0, activeIndex - 1)].id);

  return (
    <div className={`mobile-editor-panel transition-all duration-700 ease-in-out bg-white border-r border-neutral-100 flex flex-col shadow-2xl relative z-40 overflow-hidden ${editorCollapsed ? 'mobile-editor-panel-collapsed w-0 opacity-0 pointer-events-none' : 'w-full md:w-[600px] lg:w-[700px]'}`}>
      {!editorCollapsed && (
        <>
          <header className="editor-panel-header editor-cinema-header flex-shrink-0">
            <div>
              <p className="editor-modal-kicker">Editing room</p>
              <h2>{activeScene?.title || 'Editor'}</h2>
            </div>
            <button type="button" onClick={onCloseSettings} className="editor-modal-close-button" aria-label="Close editor settings" title="Close editor settings">
              <X size={16} />
            </button>
          </header>

          <div ref={editorContentRef} className="editor-panel-scroll flex-1 overflow-y-auto p-5 sm:p-6 md:p-12 space-y-8 md:space-y-12 no-scrollbar">
            <div className="mobile-editor-portrait-guides md:hidden space-y-3">
              <div className="mobile-editor-rotate-prompt rounded-lg border border-black/10 bg-black text-white p-4 shadow-2xl items-start gap-3">
                <RefreshCw size={18} className="text-[#39FF14] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Rotate To Start Editing</p>
                  <p className="text-xs text-white/65 leading-relaxed">Turn your phone sideways to open the full editing workspace with the room timeline, settings, and live mockup together.</p>
                </div>
              </div>
            </div>
            <div className="editor-cinema-studio animate-in fade-in duration-700">
              <section className="editor-cinema-hero">
                <div className="editor-cinema-hero-copy">
                  <span>Live design</span>
                  <h3>Customize your page.</h3>
                  <p>Pick a room, tune it, preview it.</p>
                </div>
              </section>

              <section className={`editor-cinema-stage editor-cinema-scene-${activeScene.id}`}>
                <div className="editor-cinema-stage-head">
                  <div>
                    <span><ActiveSceneIcon size={16} /> Scene {activeScene.number}</span>
                    <h3>{activeScene.title}</h3>
                    <p>{activeScene.prompt}</p>
                  </div>
                  <div className="editor-cinema-nav-buttons">
                    <button type="button" onClick={goPrev} disabled={activeIndex === 0}><ChevronLeft size={15} /> Back</button>
                    <button type="button" onClick={goNext} disabled={activeIndex === scenes.length - 1}>Next layer <ChevronRight size={15} /></button>
                  </div>
                </div>

                <div className="editor-cinema-stage-body">
                  <div className={`editor-cinema-control-panel ${isFlushPanelScene ? 'editor-cinema-control-panel-flush' : ''}`}>
                    {children({ activeScene })}
                  </div>
                </div>
              </section>
            </div>
          </div>
          {launchControls}
        </>
      )}
    </div>
  );
};
