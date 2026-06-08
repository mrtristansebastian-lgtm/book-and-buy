import { GripVertical } from 'lucide-react';

export function EditorPreviewRoomNav({
  device,
  editorRoomNavOffset,
  editorRoomScenes,
  editorStudioModal,
  endEditorRoomNavDrag,
  moveEditorRoomNavDrag,
  openEditorRoom,
  setEditorRoomNavOffset,
  startEditorRoomNavDrag
}) {
  return (
    <div
      className={`editor-preview-room-nav ${device === 'mobile' ? 'is-phone' : 'is-desktop'} ${editorRoomNavOffset.x || editorRoomNavOffset.y ? 'is-custom-position' : ''}`}
      aria-label="Preview editing rooms"
      style={{
        '--editor-room-nav-x': `${editorRoomNavOffset.x}px`,
        '--editor-room-nav-y': `${editorRoomNavOffset.y}px`
      }}
    >
      <button
        type="button"
        className="editor-preview-room-nav-grip"
        aria-label="Move editor toolbar"
        title="Drag to move toolbar. Double click to reset."
        onPointerDown={startEditorRoomNavDrag}
        onPointerMove={moveEditorRoomNavDrag}
        onPointerUp={endEditorRoomNavDrag}
        onPointerCancel={endEditorRoomNavDrag}
        onDoubleClick={() => setEditorRoomNavOffset({ x: 0, y: 0 })}
      >
        <GripVertical size={14} />
        <span>Move</span>
      </button>
      {editorRoomScenes.map((scene) => {
        const SceneIcon = scene.icon;
        const isActive = (editorStudioModal || 'introduction') === scene.id;
        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => openEditorRoom(scene.id)}
            className={isActive ? 'is-active' : ''}
            title={scene.title}
          >
            <SceneIcon size={13} />
            <span>{scene.title}</span>
          </button>
        );
      })}
    </div>
  );
}
