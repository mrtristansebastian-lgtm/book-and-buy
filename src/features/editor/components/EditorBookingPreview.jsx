import { BookingFlow } from '../../../components/BookingFlow';

export function EditorBookingPreview({
  onComplete,
  onMediaUpload,
  onSettingChange,
  previewKey,
  previewStep,
  settings
}) {
  return (
    <BookingFlow
      key={previewKey}
      settings={settings}
      isPreview={true}
      previewStep={previewStep}
      onSettingChange={onSettingChange}
      onMediaUpload={onMediaUpload}
      onComplete={onComplete}
    />
  );
}
