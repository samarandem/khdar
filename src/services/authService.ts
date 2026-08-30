import { ShopSettings } from '../types';

const AUTH_STORAGE_KEYS = {
  IS_LOGGED_IN: 'khudar_fruits_is_auth_v1',
  AUTH_USER: 'khudar_fruits_auth_user_v1',
  REMEMBER_ME: 'khudar_fruits_remember_me_v1',
};

export interface AuthSession {
  isLoggedIn: boolean;
  username: string;
  loginTime: string;
}

export const getAuthSession = (): AuthSession => {
  try {
    const isRemembered = localStorage.getItem(AUTH_STORAGE_KEYS.REMEMBER_ME) === 'true';
    const storage = isRemembered ? localStorage : sessionStorage;
    const isAuth = storage.getItem(AUTH_STORAGE_KEYS.IS_LOGGED_IN) === 'true';
    const username = storage.getItem(AUTH_STORAGE_USER_KEY) || 'admin';
    const loginTime = storage.getItem('khudar_fruits_auth_time') || '';

    return {
      isLoggedIn: isAuth,
      username,
      loginTime,
    };
  } catch (err) {
    console.error('Error reading auth session', err);
    return { isLoggedIn: false, username: '', loginTime: '' };
  }
};

const AUTH_STORAGE_USER_KEY = 'khudar_fruits_auth_user_v1';

export const verifyCredentials = (
  inputUser: string,
  inputPass: string,
  settings?: ShopSettings
): boolean => {
  const cleanUser = inputUser.trim().toLowerCase();
  const cleanPass = inputPass.trim();

  const configuredUser = (settings?.username || 'user').trim().toLowerCase();
  const configuredPass = (settings?.password || 'pass').trim();

  // 1. Matches configured user credentials
  if (cleanUser === configuredUser && cleanPass === configuredPass) {
    return true;
  }

  // 2. Direct exact match for "user" and "pass"
  if (cleanUser === 'user' && cleanPass === 'pass') {
    return true;
  }

  return false;
};

export const loginSession = (
  username: string,
  rememberMe = true
): void => {
  try {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_STORAGE_KEYS.IS_LOGGED_IN, 'true');
    storage.setItem(AUTH_STORAGE_KEYS.AUTH_USER, username.trim() || 'user');
    storage.setItem('khudar_fruits_auth_time', new Date().toISOString());
    localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving auth session', err);
  }
};

export const logoutSession = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.IS_LOGGED_IN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.IS_LOGGED_IN);
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_USER);
  } catch (err) {
    console.error('Error clearing auth session', err);
  }
};
