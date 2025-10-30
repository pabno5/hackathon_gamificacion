type Stored = {
  clickedIds: string[];
};

let userKey = 'guest';
let clicked = new Set<string>();
let registered = new Set<string>();

const storageKey = (u: string) => `buttonProgress:${u}`;

function loadForUser(u: string) {
  userKey = u || 'guest';
  clicked = new Set<string>();
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (raw) {
      const parsed: Stored = JSON.parse(raw);
      parsed.clickedIds?.forEach((id) => clicked.add(id));
    }
  } catch (e) {
    // noop
  }
}

function persist() {
  try {
    const payload: Stored = { clickedIds: Array.from(clicked) };
    localStorage.setItem(storageKey(userKey), JSON.stringify(payload));
  } catch (e) {
    // noop
  }
}

export function initProgressTracker(forUserKey?: string) {
  loadForUser(forUserKey || 'guest');
  // notify initial state
  dispatchUpdate();
}

export function registerButton(id: string) {
  if (!id) return;
  registered.add(id);
  // update listeners with new total
  dispatchUpdate();
}

export function notifyClick(id: string) {
  if (!id) return;
  if (!registered.has(id)) {
    // ensure it's registered so totals include it
    registered.add(id);
  }
  if (!clicked.has(id)) {
    clicked.add(id);
    persist();
    dispatchUpdate();
  }
}

export function getProgressInfo() {
  const total = registered.size;
  const clickedCount = clicked.size;
  const percent = total > 0 ? Math.round((clickedCount / total) * 100) : 0;
  return { total, clickedCount, percent, clicked: Array.from(clicked) };
}

function dispatchUpdate() {
  const info = getProgressInfo();
  // Dispatch a custom event on window
  try {
    const ev = new CustomEvent('progressTracker:update', { detail: info });
    window.dispatchEvent(ev);
  } catch (e) {
    // fallback: no-op
  }
}

export function resetForUser(u?: string) {
  const k = u || userKey || 'guest';
  localStorage.removeItem(storageKey(k));
  if (k === userKey) {
    clicked.clear();
    registered.clear();
    dispatchUpdate();
  }
}

export default {
  initProgressTracker,
  registerButton,
  notifyClick,
  getProgressInfo,
  resetForUser,
};
