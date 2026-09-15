export const TEXT_SOFT_LIMIT = 280;
export const CAPTION_SOFT_LIMIT = 2200;

export const VIDEO_JOB_ID = 'primary-video';
export const POSTER_JOB_ID = 'primary-poster';

export const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const META = {
  posts: {
    eyebrowCreate: 'New post',
    eyebrowEdit: 'Edit post',
    titleCreate: 'New post'
  },
  films: {
    eyebrowCreate: 'New Film',
    eyebrowEdit: 'Edit Film',
    titleCreate: 'New Film'
  },
  videos: {
    eyebrowCreate: 'New Film',
    eyebrowEdit: 'Edit Film',
    titleCreate: 'New Film'
  },
  verticals: {
    eyebrowCreate: 'New Vertical',
    eyebrowEdit: 'Edit Vertical',
    titleCreate: 'New Vertical'
  },
  text: {
    eyebrowCreate: 'New note',
    eyebrowEdit: 'Edit note',
    titleCreate: 'New update'
  }
};

export const POST_STEPS = [
  { id: 'select', label: 'Select' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'caption', label: 'Caption' }
];

export const VIDEO_STEPS = [
  { id: 'source', label: 'Source' },
  { id: 'details', label: 'Details' }
];

export function isBlobUrl(url) {
  return String(url || '').startsWith('blob:');
}

export function draftKey(kind, postId) {
  return `bb-composer-draft:${kind}:${postId || 'new'}`;
}

export function newMediaItem(partial = {}) {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'image',
    url: '',
    remoteUrl: '',
    file: null,
    posterUrl: '',
    remotePosterUrl: '',
    posterFile: null,
    durationSeconds: 0,
    sourceDurationSeconds: 0,
    durationLabel: '',
    trimStart: 0,
    trimEnd: 0,
    aspectRatio: 0,
    alt: '',
    ...partial
  };
}

export function hasFiles(event) {
  const types = [...(event.dataTransfer?.types || [])];
  return types.includes('Files');
}
