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
    quality: 0.92
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
    quality: 0.9
  }
};

export function resolveImagePreset(presetOrId = 'socialPost') {
  if (presetOrId && typeof presetOrId === 'object' && presetOrId.aspect) {
    return { ...IMAGE_PRESETS.socialPost, ...presetOrId };
  }
  return IMAGE_PRESETS[presetOrId] || IMAGE_PRESETS.socialPost;
}
