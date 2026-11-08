/**
 * Firebase কনফিগ: প্রথমে বিল্ড-টাইম env থেকে (দুই সাইটেই একই মান),
 * না থাকলে অ্যাডমিন সাইটের "Database Settings" থেকে সেভ করা localStorage।
 * (Firebase ওয়েব কনফিগ গোপন তথ্য নয়।)
 */
export const FIREBASE_CONFIG_KEY = 'bioherbs_agrovet_fb_config';

export function getFirebaseConfig(): Record<string, string> | null {
  const env = import.meta.env;
  const fromEnv: Record<string, string> = {};
  const map: Record<string, string | undefined> = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };
  Object.entries(map).forEach(([k, v]) => { if (v) fromEnv[k] = v; });
  if (fromEnv.databaseURL) return fromEnv;

  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved && saved.databaseURL ? saved : null;
  } catch {
    return null;
  }
}
