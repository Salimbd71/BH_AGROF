/**
 * BH Agro Ltd. - UI Layout Components
 * Top header with Product List Icon, Hero Banner with Target/Achievement/Today's bookings,
 * and Toast notification system
 */

import { store } from './store.ts';
import { APP_RULES } from '../config/appMode.ts';

export function showToast(message: string, type: string = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : (type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white');
  toast.className = `${bg} px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium transform transition-all duration-300 translate-y-3 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle-2' : (type === 'error' ? 'alert-triangle' : 'info')}" class="w-5 h-5 shrink-0"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  if ((window as any).lucide) (window as any).lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showConfirmDialog(options: ConfirmDialogOptions) {
  // Remove existing confirm modal if any
  const existing = document.getElementById('appConfirmModal');
  if (existing) existing.remove();

  const isDanger = options.type !== 'info' && options.type !== 'warning';
  const confirmBtnBg = isDanger ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white';
  const iconBg = isDanger ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400';
  const iconName = isDanger ? 'trash-2' : 'alert-circle';

  const modalHtml = `
    <div id="appConfirmModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div class="flex items-start gap-3.5">
          <div class="w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0">
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1 flex-1">
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              ${options.title}
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              ${options.message}
            </p>
          </div>
        </div>

        ${options.details ? `
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-medium">
            ${options.details}
          </div>
        ` : ''}

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button id="confirmCancelBtn" type="button" class="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            ${options.cancelText || 'Cancel'}
          </button>
          <button id="confirmActionBtn" type="button" class="px-5 py-2.5 rounded-xl ${confirmBtnBg} text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
            <span>${options.confirmText || 'Yes, Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if ((window as any).lucide) (window as any).lucide.createIcons();

  const modal = document.getElementById('appConfirmModal');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const confirmBtn = document.getElementById('confirmActionBtn');

  const closeDialog = () => {
    modal?.remove();
    if (options.onCancel) options.onCancel();
  };

  cancelBtn?.addEventListener('click', closeDialog);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeDialog();
  });

  confirmBtn?.addEventListener('click', () => {
    modal?.remove();
    options.onConfirm();
  });
}

export function renderTopNav(isAdmin: boolean): string {
  const isSR = !isAdmin;

  return `
    <header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        
        <!-- Brand Identity & Mobile Menu Toggle -->
        <div class="flex items-center gap-2.5">
          <!-- Mobile Hamburger Menu Button (Allows opening sidebar anytime on mobile) -->
          <button onclick="window.App.openMobileMenu()" class="p-2 -ml-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 md:hidden hover:bg-slate-200" title="Open Navigation Menu">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>

          <div class="flex items-center gap-3 cursor-pointer" onclick="window.App.navigate('${isAdmin ? 'dashboard' : 'home'}')">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-tealbrand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <i data-lucide="leaf" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-lg sm:text-xl tracking-tight text-brand-900 dark:text-brand-300">BH AGRO</span>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold uppercase ${isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'}">
                  LTD.
                </span>
              </div>
              <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">${store.authSession.user?.name} • ${store.authSession.user?.territory}</p>
            </div>
          </div>
        </div>

        <!-- Controls & Specific SR Header Icons -->
        <div class="flex items-center gap-2 sm:gap-3">
          
          <!-- TOP HEADER PRODUCT LIST ICON & REPORTS (For SR quick access) -->
          ${isSR ? `
            <button onclick="window.App.navigate('products')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 font-bold text-xs hover:bg-brand-100 transition shadow-sm active:scale-95" title="${store.lang === 'bn' ? 'ওষুধ ক্যাটালগ' : 'Medicines Catalog'}">
              <i data-lucide="package" class="w-4 h-4 text-brand-600"></i>
              <span class="hidden sm:inline">${store.lang === 'bn' ? 'ওষুধের তালিকা' : 'Medicines'}</span>
            </button>

            <button onclick="window.App.navigate('my_orders')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 transition shadow-sm" title="${store.lang === 'bn' ? 'আমার বুকিং' : 'My Bookings'}">
              <i data-lucide="calendar-check" class="w-4 h-4 text-tealbrand-600"></i>
              <span class="hidden sm:inline">${store.lang === 'bn' ? 'বুকিং' : 'Orders'}</span>
            </button>

            <button onclick="window.App.navigate('reports')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition shadow-sm" title="${store.t('reportsAnalytics')}">
              <i data-lucide="bar-chart-3" class="w-4 h-4 text-purple-600"></i>
              <span class="hidden sm:inline">${store.lang === 'bn' ? 'সেলস রিপোর্ট' : 'Reports'}</span>
            </button>
          ` : ''}

          <!-- Admin-Only Firebase Realtime DB Settings -->
          ${isAdmin && APP_RULES.canConfigureDatabase ? `
            <button onclick="window.App.openFirebaseModal()" class="flex items-center gap-2 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all ${
              store.isFirebaseReady
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }">
              <span class="w-2 h-2 rounded-full animate-pulse ${store.isFirebaseReady ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
              <span class="hidden md:inline">${store.isFirebaseReady ? store.t('onlineFirebase') : store.t('localDemo')}</span>
              <i data-lucide="database" class="w-3.5 h-3.5 opacity-70"></i>
            </button>
          ` : ''}

          <!-- Language Switcher -->
          <button onclick="window.App.toggleLang()" class="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-500 transition-colors">
            <i data-lucide="languages" class="w-3.5 h-3.5 text-brand-600"></i>
            <span>${store.lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>

          <!-- Theme Toggle -->
          <button onclick="window.App.toggleTheme()" class="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-brand-600 transition-colors" title="Toggle Theme">
            <i data-lucide="${store.theme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>
          </button>

          <!-- Logout Button -->
          <button onclick="window.App.logout()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold text-xs transition">
            <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">${store.t('logout')}</span>
          </button>

        </div>
      </div>
    </header>
  `;
}

/**
 * Hero Banner on SR Home Page
 * Shows Target, Achievement %, Today's order booking count and value
 */
export function renderSRHeroBanner(): string {
  const isBN = store.lang === 'bn';
  const srId = store.authSession.user?.id || '';
  const myOrders = (store.db.orders || []).filter(o => o.srId === srId);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = myOrders.filter(o => o.date === todayStr);
  
  const todayBookingCount = todayOrders.length;
  const todayBookingValue = todayOrders.reduce((acc, o) => acc + o.grandTotal, 0);
  // মাসিক টার্গেটের সাথে শুধু চলতি মাসের বিক্রি মেলানো হয় (আগের মাসের বিক্রি যোগ হয় না)
  const monthKey = todayStr.slice(0, 7);
  const totalSalesAchieved = myOrders.filter(o => (o.date || '').slice(0, 7) === monthKey).reduce((acc, o) => acc + o.grandTotal, 0);
  
  const target = (store.authSession.user as any)?.target || 350000;
  const achievementPct = target > 0 ? Math.min(100, Math.round((totalSalesAchieved / target) * 100)) : 0;

  return `
    <div class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm mb-6">
      <div class="space-y-4">
        
        <!-- Header badge & Greeting -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              ${store.authSession.user?.territory || (isBN ? 'ফিল্ড টেরিটরি' : 'Territory Field')}
            </span>
            <h2 class="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-white">
              ${isBN ? 'স্বাগতম' : 'Welcome'}, ${store.authSession.user?.name || (isBN ? 'এসআর অফিসার' : 'SR Officer')}
            </h2>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2">
            <button onclick="window.App.navigate('order_booking')" class="px-3.5 sm:px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 active:scale-95">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>${store.t('orderBooking')}</span>
            </button>
            <button onclick="window.App.navigate('reports')" class="px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-95">
              <i data-lucide="bar-chart-3" class="w-4 h-4 text-brand-600"></i>
              <span>${store.lang === 'bn' ? 'সেলস রিপোর্ট' : 'Reports'}</span>
            </button>
            <button onclick="window.App.navigate('products')" class="px-3.5 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl font-bold text-xs border border-slate-200 dark:border-slate-700 transition hidden sm:flex items-center gap-1.5">
              <i data-lucide="package" class="w-4 h-4"></i>
              <span>${store.lang === 'bn' ? 'ওষুধ তালিকা' : 'Medicines'}</span>
            </button>
          </div>
        </div>

        <!-- 4 Key Metrics Bar (Target, Achievement, Today Count, Today Value) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          
          <!-- Monthly Target -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80">
            <div class="text-[11px] font-bold text-slate-400 uppercase">${store.t('target')}</div>
            <div class="text-xl sm:text-2xl font-black mt-0.5 text-slate-800 dark:text-slate-100">৳${target.toLocaleString()}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">
              ${isBN ? 'মাসিক নির্ধারিত লক্ষ্য' : 'Monthly Territory Goal'}
            </div>
          </div>

          <!-- Total Achievement -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80">
            <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">${store.t('achievement')} (${achievementPct}%)</div>
            <div class="text-xl sm:text-2xl font-black mt-0.5 text-amber-600 dark:text-amber-400">৳${totalSalesAchieved.toLocaleString()}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">
              ${isBN ? `${myOrders.length} টি নিশ্চিত অর্ডার` : `${myOrders.length} confirmed orders`}
            </div>
          </div>

          <!-- Today's Booking Number -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80">
            <div class="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase">${store.t('todayBookingCount')}</div>
            <div class="text-xl sm:text-2xl font-black mt-0.5 text-brand-700 dark:text-brand-300">${todayBookingCount} টি</div>
            <div class="text-[10px] text-slate-500 mt-0.5">
              ${isBN ? `আজকের বুকিং (${todayStr})` : `Bookings today (${todayStr})`}
            </div>
          </div>

          <!-- Today's Booking Value -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80">
            <div class="text-[11px] font-bold text-tealbrand-600 dark:text-tealbrand-400 uppercase">${store.t('todayBookingValue')}</div>
            <div class="text-xl sm:text-2xl font-black mt-0.5 text-tealbrand-700 dark:text-tealbrand-300">৳${todayBookingValue.toLocaleString()}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">
              ${isBN ? 'দৈনিক মোট বুকিং মূল্য' : 'Gross daily volume'}
            </div>
          </div>

        </div>

        <!-- Target Progress Bar -->
        <div class="pt-2">
          <div class="flex items-center justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
            <span>${isBN ? 'মাসিক অর্জনের অগ্রগতি' : 'Monthly Achievement Progress'}</span>
            <span class="font-bold text-brand-600 dark:text-brand-400">${achievementPct}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
            <div class="h-full bg-brand-600 rounded-full transition-all duration-500" style="width: ${achievementPct}%"></div>
          </div>
        </div>

      </div>
    </div>
  `;
}
