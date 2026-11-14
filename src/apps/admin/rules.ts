/**
 * ===== অ্যাডমিন সাইটের রুলস =====
 * অ্যাডমিন সব পেজে ঢুকতে পারবে এবং ডাটাবেসের সব অংশ লিখতে পারবে।
 */
import type { AppRules } from '../types.ts';

export const ADMIN_RULES: AppRules = {
  mode: 'admin',
  title: 'Bioherbs Agrovet - Admin Panel',
  allowedRoles: ['admin'],
  defaultTab: 'dashboard',
  tabs: [
    'dashboard', 'stock_manage', 'order_booking', 'orders_management', 'approvals',
    'customers', 'sr_management', 'products', 'pricing_manager', 'reports'
  ],
  writablePaths: ['products', 'customers', 'orders', 'srs'],  // অ্যাডমিন একাউন্ট এখন Firebase Auth-এ, ডাটাবেজে না
  canConfigureDatabase: true,
  canCreateFirstAdmin: false,
  indexable: false
};
