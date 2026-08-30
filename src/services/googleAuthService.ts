import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('khudar_fruits_gs_token');

export const initAuthListener = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  // Check redirect result on mobile
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          localStorage.setItem('khudar_fruits_gs_token', cachedAccessToken);
          if (onSuccess) onSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect auth check notice:', err);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('khudar_fruits_gs_token');
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استرجاع رمز الوصول من حساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('khudar_fruits_gs_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.log('User cancelled Google sign-in popup.');
      const cancelErr: any = new Error('تم إغلاق نافذة تسجيل الدخول.');
      cancelErr.code = error.code;
      cancelErr.isUserCancelled = true;
      throw cancelErr;
    }

    console.error('Sign in error:', error);
    // If popup blocked on mobile, offer redirect flow
    if (error?.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        console.error('Redirect also failed:', redirectErr);
      }
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken || localStorage.getItem('khudar_fruits_gs_token');
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('khudar_fruits_gs_token');
};
