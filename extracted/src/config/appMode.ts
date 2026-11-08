/**
 * কোন সাইট বিল্ড হচ্ছে তা Vite mode থেকে ঠিক হয়:
 *   vite build --mode sr     -> SR সাইট
 *   vite build --mode admin  -> অ্যাডমিন সাইট
 * ভুল/অনুপস্থিত হলে নিরাপদ দিক (sr) ধরা হয়।
 */
import type { AppRules } from '../apps/types.ts';
import { SR_RULES } from '../apps/sr/rules.ts';
import { ADMIN_RULES } from '../apps/admin/rules.ts';

const mode = import.meta.env.MODE;

export const APP_RULES: AppRules = mode === 'admin' ? ADMIN_RULES : SR_RULES;
export const APP_MODE = APP_RULES.mode;

export function canAccessTab(tab: string): boolean {
  return APP_RULES.tabs.includes(tab);
}

export function canLoginAs(role: 'sr' | 'admin' | null): boolean {
  return !!role && APP_RULES.allowedRoles.includes(role);
}
