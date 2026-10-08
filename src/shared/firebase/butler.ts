import { httpsCallable } from 'firebase/functions';
import { getFirebase } from './client';
export async function butlerCall(name: string, workspaceId: string, data: object = {}): Promise<any> {
  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) throw new Error('Sign in as the business owner to use Butler.');
  return (await httpsCallable(firebase.functions, name)({ ...data, workspaceId })).data;
}
