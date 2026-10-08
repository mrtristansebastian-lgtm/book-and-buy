import { workspaceChanges } from '../../../functions/workspaceDomain.js';

/** Capture what this editor changed before a later server snapshot arrives. */
export function captureWorkspaceIntent(baseline, desired, precedingDesired = baseline) {
  const sections = new Map();
  for (const change of [...workspaceChanges(baseline, desired), ...workspaceChanges(precedingDesired, desired)]) {
    sections.set(change.section, { ...change, patch: { ...sections.get(change.section)?.patch, ...change.patch } });
  }
  return [...sections.values()].map(change => ({ ...change,
    expectedRevision: desired.sectionRevisions?.[change.section] ?? change.expectedRevision
  }));
}

/** Rebase only revisions produced by this editor's earlier successful saves. */
export function prepareWorkspaceIntent(intent, current, committed = []) {
  return intent.flatMap(change => {
    const patch = Object.fromEntries(Object.entries(change.patch).filter(([key,value]) => JSON.stringify(current[key]) !== JSON.stringify(value)));
    if (!Object.keys(patch).length) return [];
    let expectedRevision = change.expectedRevision;
    for (const receipt of committed) if (receipt.section === change.section && receipt.from === expectedRevision) expectedRevision = receipt.to;
    return [{ ...change, patch, expectedRevision }];
  });
}
