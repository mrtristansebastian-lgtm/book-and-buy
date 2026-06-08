export const clientAuthPrefillStorageKey = 'build-a-booking-client-auth-prefill';

const safeStorageGet = (storage, key) => {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
};

const safeStorageSet = (storage, key, value) => {
  try {
    storage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeSessionGet = (key) => safeStorageGet(typeof window !== 'undefined' ? window.sessionStorage : null, key);
export const safeSessionSet = (key, value) => safeStorageSet(typeof window !== 'undefined' ? window.sessionStorage : null, key, value);
