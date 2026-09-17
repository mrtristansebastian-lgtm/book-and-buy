export const LIKE_REACTION = {
  id: 'like',
  label: 'Like'
};

export const REACTIONS = [LIKE_REACTION];
export const REACTION_IDS = ['like'];
export const DEFAULT_REACTION = 'like';

export function getReactionMeta(id) {
  return String(id || '') === 'like' ? LIKE_REACTION : null;
}

export function isReactionId(value) {
  return String(value || '') === 'like';
}
