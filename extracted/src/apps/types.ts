/**
 * BH Agro Ltd. - App Rules Type
 * প্রতিটি সাইট (SR / Admin) এই ফরম্যাটে নিজের রুলস ঘোষণা করে।
 */
export type AppMode = 'sr' | 'admin';
export type AppRole = 'sr' | 'admin';
export type DbPath = 'products' | 'customers' | 'orders' | 'srs' | 'admins';

export interface AppRules {
  mode: AppMode;
  /** ব্রাউজার ট্যাবের টাইটেল */
  title: string;
  /** এই সাইটে কোন রোল লগইন করতে পারবে */
  allowedRoles: AppRole[];
  /** লগইনের পর প্রথম পেজ */
  defaultTab: string;
  /** এই সাইটে যে যে পেজ/ট্যাব খোলা যাবে */
  tabs: string[];
  /** এই সাইট ডাটাবেসের কোন কোন অংশ লিখতে পারবে (বাকি অংশ কখনো ওভাররাইট হবে না) */
  writablePaths: DbPath[];
  /** Firebase ডাটাবেস সেটিংস মডাল দেখা যাবে কিনা */
  canConfigureDatabase: boolean;
  /** ডাটাবেসে অ্যাডমিন না থাকলে "প্রথম অ্যাডমিন তৈরি" বাটন দেখাবে কিনা */
  canCreateFirstAdmin: boolean;
  /** সার্চ ইঞ্জিনে সাইট আসবে কিনা */
  indexable: boolean;
}
