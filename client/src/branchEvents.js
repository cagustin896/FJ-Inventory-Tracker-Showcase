export const BRANCHES_UPDATED_EVENT = 'fj-branches-updated';
export const BRANCHES_UPDATED_STORAGE_KEY = 'fj-branches-updated-at';

export function announceBranchesUpdated() {
  localStorage.setItem(BRANCHES_UPDATED_STORAGE_KEY, String(Date.now()));
  window.dispatchEvent(new Event(BRANCHES_UPDATED_EVENT));
}

export function subscribeToBranchUpdates(callback) {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') callback();
  };
  const handleStorage = (event) => {
    if (event.key === BRANCHES_UPDATED_STORAGE_KEY) callback();
  };

  window.addEventListener(BRANCHES_UPDATED_EVENT, callback);
  window.addEventListener('focus', callback);
  window.addEventListener('storage', handleStorage);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    window.removeEventListener(BRANCHES_UPDATED_EVENT, callback);
    window.removeEventListener('focus', callback);
    window.removeEventListener('storage', handleStorage);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
