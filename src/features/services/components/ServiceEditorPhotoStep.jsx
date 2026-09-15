import { ImagePlus, Replace } from 'lucide-react';

export function ServiceEditorPhotoStep({ draft, busy, fileRef, onPick }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Photo</h3>
      <button
        type="button"
        className={`bb-services-photo${draft.image ? ' has-media' : ''}`}
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {draft.image ? (
          <img src={draft.image} alt="" />
        ) : (
          <span className="bb-services-photo-empty">
            <ImagePlus size={20} />
            <strong>Add photo</strong>
            <span>16:9 catalog crop</span>
          </span>
        )}
      </button>
      {draft.image ? (
        <button
          type="button"
          className="bb-ghost-btn bb-services-photo-replace"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Replace size={14} />
          Replace
        </button>
      ) : null}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </section>
  );
}
