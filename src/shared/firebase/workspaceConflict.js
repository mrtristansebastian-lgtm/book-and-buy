import { WORKSPACE_SECTIONS } from '../../../functions/workspaceDomain.js';
import { captureWorkspaceIntent, prepareWorkspaceIntent } from './workspaceSaveIntent.js';

export const workspaceDraftFingerprint = workspace => JSON.stringify(Object.fromEntries(Object.values(WORKSPACE_SECTIONS).flat().map(key => [key,workspace[key]])));
export function createWorkspaceConflictReview(baseline, draft, remote) {
  const changes = prepareWorkspaceIntent(captureWorkspaceIntent(baseline,draft),remote).map(change => ({...change,expectedRevision:remote.sectionRevisions?.[change.section] || 0}));
  return {ownerId:draft.ownerId,fingerprint:workspaceDraftFingerprint(draft),changes,
    rows:changes.flatMap(change => Object.entries(change.patch).map(([field,after]) => ({section:change.section,field,before:remote[field] ?? null,after})))};
}
export function assertWorkspaceConflictCurrent(review,draft) {
  if (!review || review.ownerId !== draft.ownerId || review.fingerprint !== workspaceDraftFingerprint(draft)) throw new Error('Your draft changed while this review was open. Close it and review the latest changes.');
}
