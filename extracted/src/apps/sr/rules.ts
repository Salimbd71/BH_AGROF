/**
 * ===== SR (ইউজার) সাইটের রুলস =====
 * এসআর শুধু নিজের কাজ করবে: কাস্টমার, অর্ডার বুকিং, প্রোডাক্ট দেখা, নিজের রিপোর্ট।
 * ডাটাবেসে শুধু orders / customers / products (স্টক) লিখতে পারবে।
 * srs ও admins কখনো ওভাররাইট করবে না।
 */
import type { AppRules } from '../types.ts';

export const SR_RULES: AppRules = {
  mode: 'sr',
  title: 'BH Agro Ltd. - SR Portal',
  allowedRoles: ['sr'],
  defaultTab: 'home',
  tabs: ['home', 'customers', 'order_booking', 'products', 'my_orders', 'reports'],
  writablePaths: ['orders', 'customers', 'products'],
  canConfigureDatabase: false,
  canCreateFirstAdmin: false,
  indexable: true
};
