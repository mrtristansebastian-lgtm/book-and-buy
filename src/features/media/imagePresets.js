/**
 * Named image crop presets — common display sizes for Book and Buy surfaces.
 * Social posts match Instagram feed portrait (4:5 @ 1080×1350).
 */

export const IMAGE_PRESETS = {
  socialPost: {
    id: 'socialPost',
    label: 'Post',
    aspect: 4 / 5,
    width: 1080,
    height: 1350,
    mime: 'image/jpeg',
    quality: 0.92,
    // Posts keep the photo's own shape; grid tiles crop to squares on display.
    flexible: true,
    minAspect: 0.3,
    maxAspect: 3.5
  },
  hero: {
    id: 'hero',
    label: 'Hero',
    aspect: 16 / 9,
    width: 1920,
    height: 1080,
    mime: 'image/jpeg',
    quality: 0.9
  },
  about: {
    id: 'about',
    label: 'About',
    aspect: 1,
    width: 1080,
    height: 1080,
    mime: 'image/jpeg',
    quality: 0.92
  },
  venue: {
    id: 'venue',
    label: 'Venue',
    aspect: 3 / 2,
    width: 1500,
    height: 1000,
    mime: 'image/jpeg',
    quality: 0.9
  },
  catalogCard: {
    id: 'catalogCard',
    label: 'Catalog',
    aspect: 16 / 9,
    width: 1280,
    height: 720,
    mime: 'image/jpeg',
    quality: 0.9
  },
  catalogDetail: {
    id: 'catalogDetail',
    label: 'Detail',
    aspect: 4 / 5,
    width: 1080,
    height: 1350,
    mime: 'image/jpeg',
    quality: 0.92
  },
  videoPoster: {
    id: 'videoPoster',
    label: 'Poster',
    aspect: 16 / 9,
    width: 1280,
    height: 720,
    mime: 'image/jpeg',
    quality: 0.9,
    // Posters keep the video's own shape — never letterboxed into 16:9.
    flexible: true,
    minAspect: 0.3,
    maxAspect: 3.5
  }
};

export function resolveImagePreset(presetOrId = 'socialPost') {
  if (presetOrId && typeof presetOrId === 'object' && presetOrId.aspect) {
    return { ...IMAGE_PRESETS.socialPost, ...presetOrId };
  }
  return IMAGE_PRESETS[presetOrId] || IMAGE_PRESETS.socialPost;
}

/**
 * Frame shape for an upload: flexible presets keep the photo's own aspect
 * (only extreme panoramas are reined in); fixed presets use the preset aspect.
 */
export function resolveFrameAspect(naturalAspect, presetOrId = 'socialPost') {
  const preset = resolveImagePreset(presetOrId);
  if (!preset.flexible || !Number.isFinite(naturalAspect) || naturalAspect <= 0) {
    return preset.aspect;
  }
  const min = preset.minAspect || preset.aspect;
  const max = preset.maxAspect || preset.aspect;
  return Math.min(max, Math.max(min, naturalAspect));
}
