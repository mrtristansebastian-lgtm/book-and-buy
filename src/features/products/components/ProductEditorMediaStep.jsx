import { ChevronDown, ChevronUp, ImagePlus, Trash2 } from 'lucide-react';

export function ProductEditorMediaStep({
  imageUrls,
  busy,
  fileRef,
  onPick,
  moveImage,
  removeImage
}) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Media</h3>
      <p className="bb-services-section-lede">
        First image is the catalog cover.
      </p>
      <div className="bb-products-gallery-grid">
        {imageUrls.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={`bb-products-gallery-item${
              index === 0 ? ' is-cover' : ''
            }`}
          >
            <img src={src} alt="" />
            <div className="bb-products-gallery-actions">
              <button
                type="button"
                aria-label="Move earlier"
                disabled={index === 0}
                onClick={() => moveImage(index, -1)}
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                aria-label="Move later"
                disabled={index === imageUrls.length - 1}
                onClick={() => moveImage(index, 1)}
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => removeImage(index)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="bb-products-gallery-add"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={18} />
          <strong>Upload</strong>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </section>
  );
}
