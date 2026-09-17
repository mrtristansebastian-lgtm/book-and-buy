import { createDemoWorkspace, hydrateDemoWorkspace } from '../../data/demoWorkspace';
import { createBlankWorkspace } from '../../data/blankWorkspace';

export const MODE_KEY = 'book-and-buy.workspace-mode';
export const OWNER_KEY = 'book-and-buy.owner-workspace';
export const DEMO_KEY = 'book-and-buy.demo-workspace';

export function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function readInitialWorkspace() {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    if (mode === 'demo') {
      return hydrateDemoWorkspace(safeParse(localStorage.getItem(DEMO_KEY), null));
    }
    if (mode === 'owner' || mode === 'blank') {
      return safeParse(
        localStorage.getItem(OWNER_KEY),
        createBlankWorkspace({ onboardingComplete: false, isDemo: false })
      );
    }
  } catch {
    /* ignore */
  }
  // Fresh install / unknown mode: blank owner shell — never auto-load Flame & Flour.
  return createBlankWorkspace({ onboardingComplete: false, isDemo: false });
}

export function persistWorkspace(next) {
  try {
    if (next.isDemo) {
      localStorage.setItem(MODE_KEY, 'demo');
      localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      return;
    }
    localStorage.setItem(MODE_KEY, 'owner');
    localStorage.setItem(OWNER_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
