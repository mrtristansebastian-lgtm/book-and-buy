import type {
  EditorPreviewStep,
  EditorRoomId,
  EditorRuntimeState
} from '../../shared/contracts/editor';

export type EditorDevice = 'desktop' | 'mobile';
export type EditorLaunchPanel = 'booking' | null;

export interface EditorPreviewRuntime {
  containerRef: unknown;
  frame: {
    width: number;
    height: number;
    maxScale: number;
    minScale: number;
    paddingX: number;
    paddingY: number;
  };
  frameClass: string;
  isCompactViewport: boolean;
  key: number;
  previewStep: EditorPreviewStep;
  roomNavOffset: { x: number; y: number };
  scale: number;
  shouldMount: boolean;
  showPortraitDesktopPrompt: boolean;
}

export interface EditorColourRuntime {
  categoryId: string;
  detectedBrandSignal: unknown;
  onApplyPatch: (patch: Record<string, unknown>) => void | Promise<void>;
  onReset: () => void | Promise<void>;
  setCategoryId: (categoryId: string) => void;
}

export interface EditorBookingPageRuntime {
  copyToClipboard: (value: string, label?: string) => void | Promise<void>;
  launchPanel: EditorLaunchPanel;
  onOpen: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  route: string;
  setLaunchPanel: (panel: EditorLaunchPanel | ((panel: EditorLaunchPanel) => EditorLaunchPanel)) => void;
  url: string;
}

export interface EditorPageRuntime extends EditorRuntimeState {
  device: EditorDevice;
  studioModal: EditorRoomId | null;
}

export interface EditorFormRuntime {
  collectsClientEmail: boolean;
  collectsClientNotes: boolean;
  collectsClientPhone: boolean;
  emailUpdatesEnabled: boolean;
}
