export type EditorPreviewStep = "select" | "cart" | "details" | "payment" | "success";

export type EditorRoomId =
  | "introduction"
  | "services"
  | "cart"
  | "checkout"
  | "client-form"
  | "success"
  | "faq"
  | "colours"
  | "typography"
  | "style";

export interface EditorRoomScene {
  id: EditorRoomId;
  number: string;
  title: string;
  prompt: string;
}

export interface EditorRuntimeState {
  device: "desktop" | "mobile";
  previewStep: EditorPreviewStep;
  studioModal: EditorRoomId | null;
  collapsed: boolean;
  mobileNavCollapsed: boolean;
  isCompactViewport: boolean;
}
