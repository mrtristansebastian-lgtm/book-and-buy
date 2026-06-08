import { normalizeHexColor } from '../../../utils/theme';

const rgbToHsl = (red, green, blue) => {
  let r = red / 255;
  let g = green / 255;
  let b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    if (max === g) hue = (b - r) / delta + 2;
    if (max === b) hue = (r - g) / delta + 4;
    hue *= 60;
  }

  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
};

const paletteIdFromHsl = ({ hue, saturation, lightness }) => {
  if (saturation < 16 || lightness < 10 || lightness > 94) return 'neutral';
  if (hue >= 345 || hue < 15) return 'red';
  if (hue >= 15 && hue < 38) return 'orange';
  if (hue >= 38 && hue < 75) return 'yellow';
  if (hue >= 75 && hue < 175) return 'green';
  if (hue >= 175 && hue < 255) return 'blue';
  if (hue >= 255 && hue < 295) return 'purple';
  return 'pink';
};

const inferStyleFromBrandSignal = ({ palette, dominantHsl, neutralShare, darkShare, lightShare, vividShare, contrastRange }) => {
  if (neutralShare > 0.78 && contrastRange > 120) return darkShare > 0.45 ? 'luxury' : 'minimal';
  if (darkShare > 0.52 && vividShare > 0.12) return palette === 'blue' || palette === 'purple' ? 'tech' : 'night';
  if (vividShare > 0.42 && dominantHsl?.saturation > 58) return palette === 'yellow' || palette === 'orange' ? 'commerce' : 'bold';
  if (['green', 'yellow'].includes(palette) && dominantHsl?.saturation < 58) return 'organic';
  if (['pink', 'red', 'purple'].includes(palette) && lightShare > 0.42) return 'luxury';
  if (['blue', 'neutral'].includes(palette) && neutralShare > 0.45) return 'modern';
  return 'modern';
};

export const analyzePaletteFromImageSource = (source) => new Promise((resolve) => {
  const emptySignal = { palette: '', style: '', confidence: 0, colors: [], brandColor: '', accentColor: '', dominantColor: '' };
  if (!source || typeof window === 'undefined') {
    resolve(emptySignal);
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = 144;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const scale = Math.min(size / Math.max(image.naturalWidth || image.width || 1, 1), size / Math.max(image.naturalHeight || image.height || 1, 1));
      const drawWidth = Math.max(1, Math.round((image.naturalWidth || image.width || size) * scale));
      const drawHeight = Math.max(1, Math.round((image.naturalHeight || image.height || size) * scale));
      context.clearRect(0, 0, size, size);
      context.drawImage(image, Math.round((size - drawWidth) / 2), Math.round((size - drawHeight) / 2), drawWidth, drawHeight);
      const pixels = context.getImageData(0, 0, size, size).data;
      const buckets = {};
      const samples = new Map();
      let neutralScore = 0;
      let colorScore = 0;
      let darkScore = 0;
      let lightScore = 0;
      let vividScore = 0;
      let minLuma = 255;
      let maxLuma = 0;
      let sampled = 0;

      const quantize = (value) => Math.max(0, Math.min(255, Math.round(value / 12) * 12));
      const toHex = (red, green, blue) => `#${[red, green, blue].map(value => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

      for (let index = 0; index < pixels.length; index += 16) {
        const alpha = pixels[index + 3];
        if (alpha < 96) continue;
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const hsl = rgbToHsl(red, green, blue);
        const isPaperWhite = hsl.lightness > 96 && hsl.saturation < 18;
        const luma = (red * 0.299) + (green * 0.587) + (blue * 0.114);
        const palette = paletteIdFromHsl(hsl);
        const chroma = Math.max(0.02, hsl.saturation / 100);
        const centerWeight = 0.72 + ((1 - Math.min(1, Math.abs(hsl.lightness - 52) / 52)) * 0.56);
        const alphaWeight = alpha / 255;
        const paletteWeight = palette === 'neutral'
          ? (hsl.lightness < 28 ? 0.92 : 0.22)
          : 1.16 + chroma;
        const whiteWeight = isPaperWhite ? 0.025 : 1;
        const weight = Math.max(0.001, alphaWeight * centerWeight * paletteWeight * whiteWeight);
        const key = toHex(quantize(red), quantize(green), quantize(blue));
        const current = samples.get(key) || { red: 0, green: 0, blue: 0, weight: 0, count: 0, palette, hsl, luma };
        current.red += red * weight;
        current.green += green * weight;
        current.blue += blue * weight;
        current.weight += weight;
        current.count += 1;
        current.palette = current.palette === 'neutral' && palette !== 'neutral' ? palette : current.palette;
        current.hsl = current.weight > weight ? current.hsl : hsl;
        current.luma = luma;
        samples.set(key, current);
        buckets[palette] = (buckets[palette] || 0) + weight;
        sampled += 1;
        minLuma = Math.min(minLuma, luma);
        maxLuma = Math.max(maxLuma, luma);
        if (palette === 'neutral') neutralScore += weight;
        else colorScore += weight;
        if (hsl.lightness < 26) darkScore += weight;
        if (hsl.lightness > 76) lightScore += weight;
        if (hsl.saturation > 52 && hsl.lightness > 18 && hsl.lightness < 82) vividScore += weight;
      }

      const rankedSamples = Array.from(samples.values())
        .map(sample => {
          const red = sample.red / Math.max(sample.weight, 0.001);
          const green = sample.green / Math.max(sample.weight, 0.001);
          const blue = sample.blue / Math.max(sample.weight, 0.001);
          const hsl = rgbToHsl(red, green, blue);
          return {
            ...sample,
            red,
            green,
            blue,
            hsl,
            palette: paletteIdFromHsl(hsl),
            hex: toHex(red, green, blue)
          };
        })
        .filter(sample => sample.count >= 2 || sample.weight > 0.5)
        .sort((a, b) => b.weight - a.weight);

      const usefulSamples = rankedSamples.filter(sample => !(sample.hsl.lightness > 94 && sample.hsl.saturation < 18));
      const colorSamples = usefulSamples.filter(sample => sample.palette !== 'neutral');
      const darkNeutralSample = usefulSamples.find(sample => sample.palette === 'neutral' && sample.hsl.lightness < 42);
      const dominantSample = usefulSamples[0] || rankedSamples[0];
      const accentSample = colorSamples[0] || darkNeutralSample || dominantSample;
      const sortedBuckets = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
      const [bucketWinner, winnerScore = 0] = sortedBuckets[0] || [];
      const colorWinner = Object.entries(buckets)
        .filter(([palette]) => palette !== 'neutral')
        .sort((a, b) => b[1] - a[1])[0];
      const totalScore = Object.values(buckets).reduce((sum, score) => sum + score, 0) || 1;
      const palette = colorWinner && colorWinner[1] > neutralScore * 0.22 ? colorWinner[0] : (bucketWinner || (sampled ? 'neutral' : ''));
      const brandColor = normalizeHexColor(accentSample?.hex, '');
      const signal = {
        palette,
        style: palette ? inferStyleFromBrandSignal({
          palette,
          dominantHsl: accentSample?.hsl || dominantSample?.hsl,
          neutralShare: neutralScore / totalScore,
          darkShare: darkScore / totalScore,
          lightShare: lightScore / totalScore,
          vividShare: vividScore / Math.max(colorScore || totalScore, 1),
          contrastRange: maxLuma - minLuma
        }) : '',
        confidence: Math.min(1, winnerScore / totalScore),
        colors: usefulSamples.slice(0, 8).map(sample => sample.hex),
        brandColor,
        accentColor: normalizeHexColor((colorSamples[0] || accentSample)?.hex, brandColor),
        dominantColor: normalizeHexColor(dominantSample?.hex, brandColor),
        neutralColor: normalizeHexColor((darkNeutralSample || usefulSamples.find(sample => sample.palette === 'neutral'))?.hex, ''),
        neutralShare: neutralScore / totalScore,
        contrastRange: maxLuma - minLuma
      };
      resolve(signal);
    } catch (error) {
      resolve(emptySignal);
    }
  };
  image.onerror = () => resolve(emptySignal);
  image.src = source;
});
