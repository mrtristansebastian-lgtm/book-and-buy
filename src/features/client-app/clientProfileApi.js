import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../shared/firebase/client';
import { userProfilePath } from '../../shared/firebase/paths';
import { emptyClientProfile } from './clientProfile';

export async function loadUserProfile(uid) {
  const firebase = getFirebase();
  if (!firebase || !uid) return null;
  const snap = await getDoc(doc(firebase.db, ...userProfilePath(APP_ID, uid)));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return { uid, id: snap.id, ...data };
}

export async function ensureClientProfile(user, { displayName } = {}) {
  const firebase = getFirebase();
  if (!firebase || !user?.uid) return null;
  const path = userProfilePath(APP_ID, user.uid);
  const ref = doc(firebase.db, ...path);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() || {};
    return { uid: user.uid, id: snap.id, ...data };
  }
  const profile = emptyClientProfile({
    kind: 'client',
    email: String(user.email || '').toLowerCase(),
    displayName:
      displayName ||
      user.displayName ||
      String(user.email || '').split('@')[0] ||
      'Client',
    photoURL: user.photoURL || '',
    savedPlaceSlugs: [],
    createdAt: Date.now()
  });
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

export async function ensureOwnerProfile(user) {
  const firebase = getFirebase();
  if (!firebase || !user?.uid) return null;
  const path = userProfilePath(APP_ID, user.uid);
  const ref = doc(firebase.db, ...path);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: user.uid, id: snap.id, ...(snap.data() || {}) };
  }
  const profile = {
    kind: 'owner',
    email: String(user.email || '').toLowerCase(),
    displayName: user.displayName || String(user.email || '').split('@')[0] || 'Owner',
    photoURL: user.photoURL || '',
    createdAt: Date.now()
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

export async function updateClientSavedPlaceSlugs(uid, savedPlaceSlugs) {
  const firebase = getFirebase();
  if (!firebase || !uid || String(uid).startsWith('demo')) return;
  await updateDoc(doc(firebase.db, ...userProfilePath(APP_ID, uid)), {
    savedPlaceSlugs: [...new Set((savedPlaceSlugs || []).map(String).filter(Boolean))]
  });
}

export async function updateClientProfileFields(uid, patch = {}) {
  const firebase = getFirebase();
  if (!firebase || !uid || String(uid).startsWith('demo')) return;
  const allowed = {};
  if (patch.displayName != null) allowed.displayName = String(patch.displayName);
  if (patch.email != null) allowed.email = String(patch.email).trim().toLowerCase();
  if (patch.photoURL != null) allowed.photoURL = String(patch.photoURL).trim();
  if (!Object.keys(allowed).length) return;
  await updateDoc(doc(firebase.db, ...userProfilePath(APP_ID, uid)), allowed);
}

export { isFirebaseConfigured };
