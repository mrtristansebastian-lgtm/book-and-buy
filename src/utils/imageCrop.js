export const IMAGE_CROP_RATIOS = {
  square: { ratio: '1 / 1', width: 900, height: 900 },
  banner: { ratio: '2560 / 423', width: 2560, height: 423 },
  gallery: { ratio: '4 / 3', width: 1200, height: 900 },
  wide: { ratio: '16 / 9', width: 1600, height: 900 }
};

const cropOutputFormats = {
  png: { mimeType: 'image/png', extension: 'png' },
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg', quality: 0.9 }
};

const loadImageForCrop = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

export const buildCroppedImageFile = async (crop) => {
  const preset = IMAGE_CROP_RATIOS[crop?.ratioKey || 'square'] || IMAGE_CROP_RATIOS.square;
  const image = await loadImageForCrop(crop.source);
  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext('2d');
  const zoom = Math.max(1, Number(crop.zoom || 1));
  const positionX = Math.max(0, Math.min(100, Number(crop.positionX ?? 50)));
  const positionY = Math.max(0, Math.min(100, Number(crop.positionY ?? 50)));
  const coverScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * zoom;
  const drawWidth = image.naturalWidth * coverScale;
  const drawHeight = image.naturalHeight * coverScale;
  const offsetX = Math.max(0, drawWidth - canvas.width) * (positionX / 100);
  const offsetY = Math.max(0, drawHeight - canvas.height) * (positionY / 100);
  const outputFormat = crop.preserveTransparency ? cropOutputFormats.png : cropOutputFormats.jpeg;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!crop.preserveTransparency) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, -offsetX, -offsetY, drawWidth, drawHeight);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputFormat.mimeType, outputFormat.quality));
  if (!blob) throw new Error('Could not crop image.');
  const cleanName = String(crop.fileName || 'image').replace(/\.[a-z0-9]+$/i, '');
  return new File([blob], `${cleanName || 'image'}-cropped.${outputFormat.extension}`, { type: outputFormat.mimeType });
};
