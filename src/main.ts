/**
 * BH Agro Ltd. - Main Entry Point
 * Coordinates Modular Architecture, Router, and UI Rendering
 */

import { store } from './modules/store.ts';
import { router } from './modules/router.ts';
import { authModule } from './modules/auth.ts';
import { customerModule } from './modules/customers.ts';
import { productModule } from './modules/products.ts';
import { orderModule } from './modules/orders.ts';
import { reportModule } from './modules/reports.ts';
import { stockModule } from './modules/stock.ts';
import { renderTopNav, renderSRHeroBanner, showToast, showConfirmDialog } from './modules/ui.ts';
import { APP_RULES, canAccessTab, canLoginAs } from './config/appMode.ts';
import { getFirebaseConfig } from './config/firebase.ts';
import { initPwa } from './modules/pwa.ts';
import { openOrderPreview } from './modules/orderPreview.ts';
import { unitsNeeded, parseTiers, getFreeTiers, getDiscountPct, calcAdp, formatTiers, type FreeTier } from './modules/pricing.ts';

/** প্রোডাক্টের ছাড় ও ফ্রি-ধাপ একসাথে বসায় এবং দেখানোর লেখা (tradeOffer) ঠিক রাখে */
function setProductOffer(p: any, discountPct: number, tiers: FreeTier[]) {
  p.discountPct = discountPct;
  p.freeTiers = tiers;
  const parts: string[] = [];
  if (discountPct > 0) parts.push(`${discountPct}% Disc`);
  if (tiers.length) parts.push(formatTiers(tiers));
  p.tradeOffer = parts.length ? parts.join(' · ') : 'Standard';
}

// Main Application Controller
export const App = {
  navigate(tab: string) {
    router.navigate(tab, () => this.render());
  },

  openMobileMenu() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
      drawer.classList.remove('hidden');
      this.refreshIcons();
    }
  },

  closeMobileMenu() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
      drawer.classList.add('hidden');
    }
  },

  render() {
    // যেকোনো পেজে টাইপ করার সময় পুরো পেজ নতুন করে আঁকলেও ফোকাস/কার্সর ফিরিয়ে দেয়
    const ae = document.activeElement as HTMLInputElement | null;
    const keep = (ae && ae.id && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA'))
      ? { id: ae.id, start: ae.selectionStart, end: ae.selectionEnd } : null;
    App.renderInner();
    if (keep) {
      const el = document.getElementById(keep.id) as HTMLInputElement | null;
      if (el && el !== document.activeElement) {
        el.focus({ preventScroll: true });
        try { if (keep.start !== null && keep.end !== null) el.setSelectionRange(keep.start, keep.end); } catch { /* number inputs */ }
      }
    }
  },
  renderInner() {
    const root = document.getElementById('app');
    if (!root) return;

    // এই সাইটের রুলস: টাইটেল ও অনুমোদিত ট্যাব
    document.title = APP_RULES.title;
    if (!canAccessTab(store.activeTab)) {
      store.activeTab = APP_RULES.defaultTab;
    }

    // Check Authentication
    if (!store.authSession.isLoggedIn || !store.authSession.user) {
      root.innerHTML = authModule.renderLoginScreen();
      this.refreshIcons();
      return;
    }

    // ডিলিট করা এসআরের চলমান সেশন বন্ধ
    if (store.authSession.role === 'sr') {
      const me = store.db.srs.find(s => s.id === store.authSession.user?.id);
      if ((me && me.deletedAt) || (!me && store.db.srs.length > 0)) {
        store.logout();
        root.innerHTML = authModule.renderLoginScreen();
        this.refreshIcons();
        return;
      }
    }

    const isAdmin = store.authSession.role === 'admin';

    root.innerHTML = `
      ${renderTopNav(isAdmin)}
      <div class="flex-1 flex max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6 gap-6">
        ${this.renderSidebar(isAdmin)}
        <main class="flex-1 min-w-0 pb-16">
          ${this.renderContent(isAdmin)}
        </main>
      </div>
      ${this.renderFooter(isAdmin)}
    `;

    this.refreshIcons();

    // Attach search event listeners that don't destroy DOM inputs
    if (store.activeTab === 'home' || store.activeTab === 'customers') {
      customerModule.attachSearchListener();
    } else if (store.activeTab === 'products' || store.activeTab === 'pricing_manager') {
      productModule.attachSearchListener();
    } else if (store.activeTab === 'sr_management') {
      authModule.attachSearchListener();
    } else if (store.activeTab === 'order_booking' && !isAdmin) {
      orderModule.attachOrderUi();
    } else if (store.activeTab === 'stock_manage' || store.activeTab === 'order_booking') {
      stockModule.attachSearchListener();
    } else if (store.activeTab === 'reports') {
      reportModule.attachSearchListener();
    }
  },

  renderSidebar(isAdmin: boolean): string {
    const pendingCount = store.db.customers.filter(c => c.status === 'pending').length;

    const navItems = isAdmin ? [
      { id: 'dashboard', label: store.t('dashboard'), icon: 'layout-dashboard' },
      { id: 'stock_manage', label: store.t('stockManage'), icon: 'boxes' },
      { id: 'orders_management', label: store.t('ordersManagement'), icon: 'clipboard-list' },
      { id: 'approvals', label: store.t('pendingApprovals'), icon: 'user-check', badge: pendingCount },
      { id: 'customers', label: store.t('customerList'), icon: 'users' },
      { id: 'sr_management', label: store.t('srManagement'), icon: 'user-cog' },
      { id: 'products', label: store.t('productsInventory'), icon: 'package' },
      { id: 'pricing_manager', label: store.t('pricingManager'), icon: 'tags' },
      { id: 'reports', label: store.t('reportsAnalytics'), icon: 'bar-chart-3' },
    ] : [
      { id: 'home', label: store.t('homeCustomers'), icon: 'home' },
      { id: 'order_booking', label: store.t('orderBooking'), icon: 'shopping-cart' },
      { id: 'products', label: store.t('medicinesList'), icon: 'package' },
      { id: 'my_orders', label: store.t('todayBooking'), icon: 'calendar-check' },
      { id: 'reports', label: store.t('reportsAnalytics'), icon: 'bar-chart-3' },
    ];

    return `
      <!-- Desktop Sidebar -->
      <aside class="w-64 shrink-0 hidden md:block">
        <div class="sticky top-20 space-y-4">
          
          <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl ${isAdmin ? 'bg-purple-600' : 'bg-brand-600'} text-white flex items-center justify-center font-bold text-base shadow-sm">
                ${isAdmin ? '<i data-lucide="shield" class="w-6 h-6"></i>' : '<i data-lucide="user" class="w-6 h-6"></i>'}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">${store.authSession.user?.name}</h4>
                <p class="text-xs ${isAdmin ? 'text-purple-600' : 'text-brand-600'} font-bold">
                  ${isAdmin ? 'Central Admin' : `SR ID: ${store.authSession.user?.id}`}
                </p>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
              <span class="truncate">${store.authSession.user?.territory}</span>
            </div>
          </div>

          <nav class="space-y-1 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            ${navItems.map(item => `
              <button onclick="window.App.navigate('${item.id}')" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                store.activeTab === item.id
                  ? (isAdmin ? 'bg-purple-700 text-white shadow-md shadow-purple-700/20' : 'bg-brand-600 text-white shadow-md shadow-brand-600/20')
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }">
                <div class="flex items-center gap-3">
                  <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                  <span>${item.label}</span>
                </div>
                ${item.badge && item.badge > 0 ? `
                  <span class="px-2 py-0.5 text-xs rounded-full font-bold bg-amber-500 text-white animate-pulse">
                    ${item.badge}
                  </span>
                ` : ''}
              </button>
            `).join('')}
          </nav>

          ${!isAdmin ? `
            <div class="p-4 rounded-2xl bg-gradient-to-br from-brand-800 to-tealbrand-700 text-white shadow-md">
              <div class="flex items-center gap-2 mb-2 font-bold text-sm">
                <i data-lucide="plus-circle" class="w-4 h-4 text-amber-300"></i>
                <span>${store.t('addCustomer')}</span>
              </div>
              <p class="text-xs text-brand-100 mb-3">Add new poultry/dairy farm for central approval.</p>
              <button onclick="window.CustomerActions.openAddModal()" class="w-full py-2 bg-white text-brand-800 rounded-xl text-xs font-bold hover:bg-brand-50 transition shadow">
                + Request Customer
              </button>
            </div>
          ` : ''}

        </div>
      </aside>

      <!-- Mobile Navigation Drawer / Modal (Controlled by Hamburger Toggle) -->
      <div id="mobileNavDrawer" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden md:hidden flex justify-start transition-opacity">
        <div class="w-72 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between shadow-2xl overflow-y-auto">
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-xl ${isAdmin ? 'bg-purple-600' : 'bg-brand-600'} text-white flex items-center justify-center font-bold">
                  ${isAdmin ? '<i data-lucide="shield" class="w-5 h-5"></i>' : '<i data-lucide="user" class="w-5 h-5"></i>'}
                </div>
                <div>
                  <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">${store.authSession.user?.name}</h4>
                  <p class="text-[11px] font-bold ${isAdmin ? 'text-purple-600' : 'text-brand-600'}">${isAdmin ? 'Central Admin' : `SR ID: ${store.authSession.user?.id}`}</p>
                </div>
              </div>
              <button onclick="window.App.closeMobileMenu()" class="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <nav class="space-y-1">
              ${navItems.map(item => `
                <button onclick="window.App.navigate('${item.id}'); window.App.closeMobileMenu();" class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  store.activeTab === item.id
                    ? (isAdmin ? 'bg-purple-700 text-white shadow-md' : 'bg-brand-600 text-white shadow-md')
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }">
                  <div class="flex items-center gap-3">
                    <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                    <span>${item.label}</span>
                  </div>
                  ${item.badge && item.badge > 0 ? `
                    <span class="px-2 py-0.5 text-xs rounded-full font-bold bg-amber-500 text-white">
                      ${item.badge}
                    </span>
                  ` : ''}
                </button>
              `).join('')}
            </nav>
          </div>

          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button onclick="window.App.logout()" class="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold text-xs flex items-center justify-center gap-2">
              <i data-lucide="log-out" class="w-4 h-4"></i>
              <span>${store.t('logout')}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderContent(isAdmin: boolean): string {
    if (!isAdmin) {
      switch (store.activeTab) {
        case 'home':
        case 'customers':
          // Home page with Hero banner and Customer list
          return `
            ${renderSRHeroBanner()}
            ${customerModule.renderCustomerSection((cId) => {
              store.cart.customerId = cId;
              this.navigate('order_booking');
            })}
          `;
        case 'order_booking':
          return orderModule.renderOrderBooking((orderId) => {
            this.navigate('my_orders');
          });
        case 'products':
          return productModule.renderProductSection();
        case 'my_orders':
          return this.renderSROrders();
        case 'reports':
          return reportModule.renderReportsSection();
        default:
          return `
            ${renderSRHeroBanner()}
            ${customerModule.renderCustomerSection((cId) => {
              store.cart.customerId = cId;
              this.navigate('order_booking');
            })}
          `;
      }
    } else {
      switch (store.activeTab) {
        case 'dashboard':
          return this.renderAdminDashboard();
        case 'stock_manage':
        case 'order_booking':
          return stockModule.renderStockManagementSection();
        case 'orders_management':
          return this.renderAdminOrders();
        case 'approvals':
          return customerModule.renderAdminApprovals(() => this.render());
        case 'customers':
          return customerModule.renderCustomerSection((cId) => {
            store.cart.customerId = cId;
            this.navigate('order_booking');
          });
        case 'sr_management':
          return authModule.renderSRManagementSection();
        case 'products':
          return productModule.renderAdminProductSection();
        case 'pricing_manager':
          return productModule.renderPriceAndDiscountManager();
        case 'reports':
          return reportModule.renderReportsSection();
        default:
          return this.renderAdminDashboard();
      }
    }
  },

  renderSROrders(): string {
    const srId = store.authSession.user?.id;
    const myOrders = store.db.orders.filter(o => o.srId === srId);
    const isBn = store.lang === 'bn';

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="calendar-check" class="w-6 h-6 text-brand-600"></i>
              <span>${isBn ? 'আমার ফিল্ড বুকিং ও ইনভয়েস' : 'My Field Bookings & Invoices'}</span>
            </h2>
            <p class="text-xs text-slate-500">${isBn ? 'আপনার নেওয়া সব অর্ডার। ইনভয়েস দেখতে "প্রিভিউ" চাপুন।' : 'Orders placed by you. Tap Preview to view the invoice.'}</p>
          </div>
          <button onclick="window.App.navigate('order_booking')" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow hover:bg-brand-500 transition">
            ${isBn ? '+ নতুন বুকিং' : '+ New Booking'}
          </button>
        </div>

        <div class="space-y-3">
          ${myOrders.length === 0 ? `
            <div class="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 opacity-30"></i>
              <p class="text-xs font-bold">${isBn ? 'আজকে এখনও কোনো অর্ডার সম্পন্ন হয়নি।' : 'No orders placed yet today.'}</p>
            </div>
          ` : myOrders.map(o => `
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono font-bold text-xs text-brand-700 dark:text-brand-400">${o.id}</span>
                  <span class="text-xs text-slate-400">• ${o.date}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ${isBn ? 'নিশ্চিত' : 'CONFIRMED'}
                  </span>
                </div>
                <h4 class="font-extrabold text-base text-slate-900 dark:text-white">
                  <span class="font-mono text-brand-700">${o.customerId}</span> ${o.customerShopName || o.customerName}
                </h4>
                <p class="text-xs text-slate-500 mt-1">${o.customerAddress || o.territory}</p>
                <p class="text-xs text-slate-500 mt-1">${o.items.length} ${isBn ? 'টি ওষুধ' : 'medicines'} • ${isBn ? 'মোট:' : 'Total:'} <span class="font-black text-brand-700 dark:text-brand-400">৳${o.grandTotal.toLocaleString()}</span></p>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="window.App.previewOrder('${o.id}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                  <span>${isBn ? 'প্রিভিউ' : 'Preview'}</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderAdminOrders(): string {
    const orders = store.db.orders;
    const isBn = store.lang === 'bn';

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="clipboard-list" class="w-6 h-6 text-brand-600"></i>
              <span>${isBn ? 'সকল ফিল্ড অর্ডার ও ইনভয়েস' : 'All Field Orders & Invoices'}</span>
            </h2>
            <p class="text-xs text-slate-500">${isBn ? 'অর্ডারসমূহ স্বয়ংক্রিয়ভাবে নিশ্চিত হয়। অ্যাডমিন ইনভয়েস প্রিন্ট বা অর্ডার ডিলিট করতে পারেন।' : 'Orders are confirmed automatically. Admin can print invoice or delete orders.'}</p>
          </div>
        </div>

        <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                <th class="pb-3">${isBn ? 'অর্ডার আইডি' : 'Order ID'}</th>
                <th class="pb-3">${isBn ? 'তারিখ' : 'Date'}</th>
                <th class="pb-3">${isBn ? 'এসআর-এর নাম' : 'SR Name'}</th>
                <th class="pb-3">${isBn ? 'গ্রাহক (আইডি ও নাম)' : 'Customer (ID & Name)'}</th>
                <th class="pb-3">${isBn ? 'ঠিকানা' : 'Address'}</th>
                <th class="pb-3">${isBn ? 'মোট টাকা' : 'Total (BDT)'}</th>
                <th class="pb-3">${isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th class="pb-3 text-right">${store.t('action')}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${orders.map(o => `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td class="py-3 font-mono font-bold text-brand-700 dark:text-brand-400">${o.id}</td>
                  <td class="py-3 text-slate-500 font-mono">${o.date}</td>
                  <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">${o.srName}</td>
                  <td class="py-3 font-bold text-slate-900 dark:text-white">
                    <span class="font-mono text-brand-700">${o.customerId}</span> ${o.customerShopName || o.customerName}
                  </td>
                  <td class="py-3 text-slate-500 max-w-[180px] truncate">${o.customerAddress || o.territory}</td>
                  <td class="py-3 font-black text-slate-900 dark:text-white">৳${o.grandTotal.toLocaleString()}</td>
                  <td class="py-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ${isBn ? 'নিশ্চিত' : 'Confirmed'}
                    </span>
                  </td>
                  <td class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="window.App.previewOrder('${o.id}')" class="px-2.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1" title="${store.t('printInvoice')}">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>${isBn ? 'প্রিভিউ / প্রিন্ট' : 'Preview / Print'}</span>
                      </button>
                      <button onclick="window.App.deleteOrder('${o.id}')" class="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 text-[11px]" title="${isBn ? 'অর্ডার মুছুন' : 'Delete Order'}">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAdminDashboard(): string {
    const totalSales = store.db.orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOrders = store.db.orders.length;
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthOrdersList = store.db.orders.filter(o => (o.date || '').slice(0, 7) === monthKey);
    const monthSales = monthOrdersList.reduce((sum, o) => sum + o.grandTotal, 0);
    const pendingApprovals = store.db.customers.filter(c => c.status === 'pending').length;
    const totalInventoryValue = store.db.products.reduce((sum, p) => sum + (p.stock * p.tradePrice), 0);
    const lowStockProducts = store.db.products.filter(p => p.stock > 0 && p.stock < 10);
    const isBn = store.lang === 'bn';

    return `
      <div class="space-y-6">
        <div class="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-xl border border-brand-900/50">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                ${isBn ? 'সেন্ট্রাল অ্যাডমিন কন্ট্রোল সেন্টার' : 'Central Admin • Control Centre'}
              </span>
              <h2 class="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">${isBn ? 'বিএইচ এগ্রো লি. হেডকোয়ার্টার' : 'BH Agro Ltd. HQ'}</h2>
              <p class="text-sm text-slate-300 mt-1">${isBn ? 'জাতীয় ভেটেরিনারি বিক্রয় বিশ্লেষণ ও কেন্দ্রীয় ইনভেন্টরি কন্ট্রোল।' : 'Live national veterinary sales analytics and inventory control.'}</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.App.navigate('orders_management')" class="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-500 transition shadow flex items-center gap-2">
                <i data-lucide="clipboard-list" class="w-4 h-4"></i>
                <span>${store.t('ordersManagement')}</span>
              </button>
              <button onclick="window.App.navigate('reports')" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2">
                <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
                <span>${store.t('reportsAnalytics')}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-brand-600 mb-2">
              <span class="text-xs font-bold uppercase text-slate-400">${isBn ? 'মোট বিক্রয়' : 'Total Sales'}</span>
              <div class="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60"><i data-lucide="banknote" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">৳${totalSales.toLocaleString()}</div>
            <div class="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1">${isBn ? 'চলতি মাস' : 'This month'}: ৳${monthSales.toLocaleString()} (${monthOrdersList.length})</div>
            <div class="text-xs text-emerald-600 font-semibold mt-1">${totalOrders} ${isBn ? 'টি সম্পন্ন অর্ডার' : 'orders processed'}</div>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-amber-600 mb-2">
              <span class="text-xs font-bold uppercase text-slate-400">${isBn ? 'অপেক্ষমাণ আবেদন' : 'Pending Approvals'}</span>
              <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60"><i data-lucide="user-plus" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black ${pendingApprovals > 0 ? 'text-amber-600' : ''}">${pendingApprovals}</div>
            <button onclick="window.App.navigate('approvals')" class="text-xs text-brand-600 font-bold hover:underline mt-1 block">
              ${isBn ? 'আবেদন দেখুন →' : 'Review requests →'}
            </button>
          </div>

          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-purple-600 mb-2">
              <span class="text-xs font-bold uppercase text-slate-400">${isBn ? 'স্টক মূল্য (টিপি)' : 'Inventory Value (TP)'}</span>
              <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60"><i data-lucide="layers" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">৳${totalInventoryValue.toLocaleString()}</div>
            <div class="text-xs text-slate-500 mt-1 font-medium">${store.db.products.length} ${isBn ? 'টি ওষুধ মজুদ আছে' : 'medicines in stock'}</div>
          </div>

          <!-- Clickable Low Stock Card: Opens Low Stock Modal / Filtered Products -->
          <div onclick="window.ProductActions.openLowStockModal()" class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm cursor-pointer hover:border-rose-500 hover:shadow-md transition group" title="${isBn ? 'স্বল্প স্টকের তালিকা দেখতে ক্লিক করুন' : 'Click to view Low Stock Products'}">
            <div class="flex items-center justify-between text-rose-600 mb-2">
              <span class="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <span>${store.t('lowStock')}</span>
                <span class="text-[10px] text-rose-500 group-hover:underline">${isBn ? '(তালিকা দেখুন →)' : '(View List →)'}</span>
              </span>
              <div class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60"><i data-lucide="alert-circle" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-rose-600">${lowStockProducts.length}</div>
            <div class="text-xs text-rose-500 font-semibold mt-1">${isBn ? 'মজুদ ১০ ইউনিটের নিচে রয়েছে' : 'Stock is below 10 units threshold'}</div>
          </div>
        </div>
      </div>
    `;
  },

  deleteOrder(orderId: string) {
    if (store.authSession.role !== 'admin') return; // এসআর অর্ডার ডিলিট করতে পারবে না
    const ord = store.db.orders.find(o => o.id === orderId);
    if (!ord) return;
    showConfirmDialog({
      title: 'Delete Order Confirmation',
      message: `Are you sure you want to delete order ${orderId}? This restores inventory stock automatically.`,
      confirmText: 'Yes, Delete Order',
      type: 'danger',
      onConfirm: () => {
        if (ord && ord.items) {
          ord.items.forEach(it => {
            const p = store.db.products.find(prod => prod.id === it.productId);
            if (p) p.stock += it.qty + (it.freeQty || 0); // কেনা + ফ্রি, দুটোই ফেরত
          });
        }
        store.db.orders = store.db.orders.filter(o => o.id !== orderId);
        store.saveDatabase();
        showToast(`Order ${orderId} deleted and inventory stock restored!`, 'info');
        this.render();
      }
    });
  },

  /** অর্ডার প্রিভিউ ডায়ালগ (অ্যাডমিনে Print/Download/Edit/Close, এসআরে শুধু প্রিভিউ) */
  previewOrder(orderId: string) {
    openOrderPreview(orderId);
  },

  openFirebaseModal() {
    if (!APP_RULES.canConfigureDatabase) return; // SR সাইটে ডাটাবেস সেটিংস বন্ধ
    const currentConfig = getFirebaseConfig() || {};
    const modalHtml = `
      <div id="firebaseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full ${store.isFirebaseReady ? 'bg-emerald-500' : 'bg-amber-500'}"></div>
              <h3 class="font-extrabold text-base">Firebase Realtime DB (Admin Only)</h3>
            </div>
            <button onclick="document.getElementById('firebaseModal').remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <div class="mt-4 space-y-3 text-xs">
            <div>
              <label class="block font-bold mb-1">databaseURL *</label>
              <input type="text" id="fbDbUrl" value="${currentConfig.databaseURL || ''}" placeholder="https://your-project-default-rtdb.firebaseio.com" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">apiKey</label>
                <input type="text" id="fbApiKey" value="${currentConfig.apiKey || ''}" placeholder="AIzaSy..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]" />
              </div>
              <div>
                <label class="block font-bold mb-1">projectId</label>
                <input type="text" id="fbProjectId" value="${currentConfig.projectId || ''}" placeholder="bioherbs-agrovet" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]" />
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 border-t">
              <button type="button" onclick="window.App.clearFirebase()" class="text-rose-600 font-bold hover:underline">Reset Local</button>
              <button type="button" onclick="window.App.saveFirebase()" class="px-5 py-2 bg-brand-600 text-white font-bold rounded-xl shadow">Save & Sync</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.refreshIcons();
  },

  saveFirebase() {
    const config = {
      databaseURL: (document.getElementById('fbDbUrl') as HTMLInputElement).value.trim(),
      apiKey: (document.getElementById('fbApiKey') as HTMLInputElement).value.trim(),
      projectId: (document.getElementById('fbProjectId') as HTMLInputElement).value.trim()
    };
    localStorage.setItem('bioherbs_agrovet_fb_config', JSON.stringify(config));
    document.getElementById('firebaseModal')?.remove();
    showToast('Firebase configuration saved. Initializing...', 'info');
    store.tryInitFirebase();
    this.render();
  },

  clearFirebase() {
    localStorage.removeItem('bioherbs_agrovet_fb_config');
    store.isFirebaseReady = false;
    document.getElementById('firebaseModal')?.remove();
    showToast('Reset to local storage.');
    this.render();
  },

  toggleTheme() {
    store.toggleTheme();
    this.render();
  },

  toggleLang() {
    store.setLang(store.lang === 'bn' ? 'en' : 'bn');
    this.render();
  },

  logout() {
    store.logout();
    this.render();
  },

  renderFooter(isAdmin: boolean): string {
    const isBn = store.lang === 'bn';
    return `
      <footer class="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 text-slate-600 dark:text-slate-400 text-xs">
        <div class="max-w-7xl mx-auto px-4 space-y-4">
          <!-- Top row: App branding & ERP System Info -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-brand-700 dark:text-brand-400 text-sm">BH Agro Ltd.</span>
              <span class="hidden sm:inline">•</span>
              <span class="font-medium">${isBn ? 'প্রাণিসম্পদ স্বাস্থ্য ও ওষুধ ব্যবস্থাপনা ইআরপি' : 'Veterinary Pharmaceuticals & Animal Health ERP'}</span>
            </div>
            <div class="flex items-center gap-3 font-semibold">
              <span>Portal: <b class="${isAdmin ? 'text-purple-600' : 'text-brand-600'}">${isAdmin ? (isBn ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control') : (isBn ? 'এসআর ফিল্ড বুকিং' : 'SR Field Booking')}</b></span>
              <span>•</span>
              <span class="${store.isFirebaseReady && store.cloudConnected !== false ? 'text-emerald-600' : 'text-amber-600'} flex items-center gap-1.5 font-bold">
                <span class="w-2 h-2 rounded-full ${store.isFirebaseReady && store.cloudConnected !== false ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
                <span>${store.isFirebaseReady && store.cloudConnected !== false ? (isBn ? 'ক্লাউড লাইভ সিঙ্ক' : 'Firebase Connected') : (isBn ? 'অফলাইন মোড' : 'Offline Mode')}</span>
              </span>
            </div>
          </div>

          <!-- Bottom row: Developer Information Badge (Requested by User) -->
          <div class="flex flex-col md:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                ${isBn ? 'ডেভেলপার' : 'Developer'}
              </span>
              <span class="font-black text-slate-900 dark:text-white tracking-wide text-sm">
                MD. SALIM HOSSAIN
              </span>
            </div>

            <!-- Contact & Social Action Buttons -->
            <div class="flex flex-wrap items-center justify-center gap-2 font-mono">
              <!-- Phone with Call Button -->
              <a 
                href="tel:01737462871" 
                class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950 text-slate-800 dark:text-slate-100 hover:text-brand-600 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 font-bold shadow-2xs active:scale-95"
                title="Call 01737462871"
              >
                <i data-lucide="phone-call" class="w-3.5 h-3.5 text-brand-600"></i>
                <span>01737462871</span>
              </a>

              <!-- Clickable WhatsApp Logo -->
              <a 
                href="https://wa.me/8801737462871" 
                target="_blank" 
                rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 font-bold shadow-2xs active:scale-95"
                title="Chat on WhatsApp"
              >
                <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>WhatsApp</span>
              </a>

              <!-- Email Link -->
              <a 
                href="mailto:salimbd.ga@gmail.com" 
                class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-800 dark:text-slate-100 hover:text-blue-600 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 font-bold shadow-2xs active:scale-95"
                title="salimbd.ga@gmail.com"
              >
                <i data-lucide="mail" class="w-3.5 h-3.5 text-blue-600"></i>
                <span class="text-xs">salimbd.ga@gmail.com</span>
              </a>

              <!-- Clickable Facebook Logo -->
              <a 
                href="https://fb.com/salim.naogaon" 
                target="_blank" 
                rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5 font-bold shadow-2xs active:scale-95"
                title="Facebook: fb.com/salim.naogaon"
              >
                <i data-lucide="facebook" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>fb.com/salim.naogaon</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    `;
  },

  refreshIcons() {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }
};

// Global Window Bridges for Clean Onclick Handlers
(window as any).App = App;

(window as any).CustomerActions = {
  bookOrder: (cId: string) => {
    store.cart.customerId = cId;
    App.navigate('order_booking');
  },
  openAddModal: () => {
    customerModule.openAddCustomerModal(() => App.render());
  },
  approveCustomer: (cId: string) => {
    const cust = store.db.customers.find(c => c.id === cId);
    if (cust) {
      const nextId = store.getNextCustomerId();
      cust.id = nextId;
      cust.status = 'approved';
      const assignSelect = document.getElementById(`approveAssignSr-${cId}`) as HTMLSelectElement | null;
      if (assignSelect) {
        cust.assignedSrId = assignSelect.value;
      }
      store.saveDatabase();
      showToast(`Customer "${cust.shopName}" approved with ID: ${nextId}! Assigned to ${cust.assignedSrId || cust.createdBy}.`);
      App.render();
    }
  },
  rejectCustomer: (cId: string) => {
    const cust = store.db.customers.find(c => c.id === cId);
    showConfirmDialog({
      title: 'Reject Customer Request',
      message: `Are you sure you want to reject customer request for "${cust?.shopName || cId}"?`,
      confirmText: 'Yes, Reject',
      type: 'danger',
      onConfirm: () => {
        store.db.customers = store.db.customers.filter(c => c.id !== cId);
        store.saveDatabase();
        showToast('Customer request rejected.', 'info');
        App.render();
      }
    });
  },
  deleteCustomer: (cId: string) => {
    const cust = store.db.customers.find(c => c.id === cId);
    if (!cust) {
      showToast('Customer not found!', 'error');
      return;
    }
    
    showConfirmDialog({
      title: 'Delete Customer Confirmation',
      message: `Are you sure you want to delete customer "${cust.shopName}"? This action cannot be undone.`,
      details: `
        <div class="space-y-1">
          <div class="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span class="font-mono text-brand-600 dark:text-brand-400">${cust.id}</span>
            <span>${cust.shopName}</span>
          </div>
          <div class="text-slate-500 font-medium">${cust.name} • ${cust.phone}</div>
          <div class="text-slate-400 text-[11px]">${cust.address}</div>
        </div>
      `,
      confirmText: 'Yes, Delete Customer',
      type: 'danger',
      onConfirm: () => {
        // 1. Remove from in-memory array
        store.db.customers = store.db.customers.filter(c => c.id !== cId);

        // 2. Persist to LocalStorage and Firebase Realtime Database
        store.saveDatabase();

        // 3. If currently in cart, clear cart customer
        if (store.cart.customerId === cId) {
          store.cart.customerId = '';
        }

        // 4. Immediately remove card from DOM without losing page scroll
        const card = document.querySelector(`.customer-card[data-id="${cId}"]`);
        if (card) {
          card.remove();
        }

        // 5. Update notice count
        const notice = document.getElementById('customerCountNotice');
        if (notice) {
          const remaining = store.db.customers.length;
          notice.innerText = `Showing ${remaining} registered customers`;
        }

        showToast(`Customer "${cust.shopName}" (${cId}) deleted and database synced!`, 'info');

        // 6. Refresh view
        App.render();
      }
    });
  },
  reassignSR: (cId: string, srId: string) => {
    const cust = store.db.customers.find(c => c.id === cId);
    if (cust) {
      cust.assignedSrId = srId;
      store.saveDatabase();
      showToast(`Customer "${cust.shopName}" reassigned to SR: ${srId}!`);
    }
  },
  filterBySr: (srId: string) => {
    const grid = document.getElementById('customerListGrid');
    const notice = document.getElementById('customerCountNotice');
    if (!grid) return;
    const cards = grid.querySelectorAll<HTMLElement>('.customer-card');
    let visible = 0;
    const targetSr = (srId || 'all').trim().toLowerCase();
    const searchInput = document.getElementById('customerSearchInput') as HTMLInputElement | null;
    const q = (searchInput?.value || '').trim().toLowerCase();

    cards.forEach(card => {
      const cardSrId = (card.getAttribute('data-srid') || '').trim().toLowerCase();
      const srMatches = targetSr === 'all' || cardSrId === targetSr;

      const id = card.getAttribute('data-id')?.toLowerCase() || '';
      const name = card.getAttribute('data-name')?.toLowerCase() || '';
      const addr = card.getAttribute('data-address')?.toLowerCase() || '';
      const phone = card.getAttribute('data-phone')?.toLowerCase() || '';
      const searchMatches = !q || id.includes(q) || name.includes(q) || addr.includes(q) || phone.includes(q);

      if (srMatches && searchMatches) {
        card.style.display = '';
        visible++;
      } else {
        card.style.display = 'none';
      }
    });
    if (notice) {
      const isBn = store.lang === 'bn';
      if (q) {
        notice.innerText = isBn ? `"${searchInput?.value}" এর সাথে মিলেছে ${visible} জন গ্রাহক` : `Found ${visible} customer(s) matching "${searchInput?.value}"`;
      } else if (targetSr === 'all') {
        notice.innerText = isBn ? `মোট ${visible} জন গ্রাহক প্রদর্শিত` : `Showing all ${visible} registered customers`;
      } else {
        notice.innerText = isBn ? `এসআর (${srId}) এর অধীনে ${visible} জন গ্রাহক প্রদর্শিত` : `Showing ${visible} customer(s) assigned to SR: ${srId}`;
      }
    }
  },
  downloadTemplate: () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel library loading...', 'info');
      return;
    }
    const templateData = [
      {
        'Customer ID': 'BH0010',
        'Shop / Farm Name': 'Green Valley Agro Farm',
        'Owner Name': 'Md. Jahangir Alam',
        'Mobile Phone': '01711223344',
        'Category': 'dairy_farm',
        'Full Address': 'Masterbari, Gazipur Sadar, Gazipur',
        'Territory': 'Gazipur (শ্রীপুর-জয়দেবপুর)',
        'Assigned SR ID': 'SR01',
        'Credit Limit': 150000,
        'Opening Balance': 0
      },
      {
        'Customer ID': 'BH0011',
        'Shop / Farm Name': 'Sonali Feed & Chicks Store',
        'Owner Name': 'Haji Moklesur Rahman',
        'Mobile Phone': '01812345678',
        'Category': 'feed_mill',
        'Full Address': 'Sherpur Road, Bogura',
        'Territory': 'Bogura Dairy Zone (শেরপুর)',
        'Assigned SR ID': 'SR02',
        'Credit Limit': 250000,
        'Opening Balance': 20000
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer_Template");
    XLSX.writeFile(wb, "BH_Agro_Customer_Import_Template.xlsx");
    showToast('Customer Excel template downloaded!');
  },
  handleUpload: (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel parser loading...', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt: ProgressEvent<FileReader>) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          showToast('Uploaded customer sheet is empty!', 'error');
          return;
        }

        let added = 0;
        let updated = 0;

        rows.forEach((r) => {
          const shopName = (r['Shop / Farm Name'] || r['Shop Name'] || r['Farm Name'] || r['shopName'] || '').toString().trim();
          if (!shopName) return;

          let rawId = (r['Customer ID'] || r['id'] || r['ID'] || '').toString().trim();
          const ownerName = (r['Owner Name'] || r['Proprietor Name'] || r['name'] || shopName).toString().trim();
          const phone = (r['Mobile Phone'] || r['Phone'] || r['phone'] || '').toString().trim();
          let cat = (r['Category'] || r['category'] || 'feed_mill').toString().toLowerCase().trim();
          if (cat.includes('dairy')) cat = 'dairy_farm';
          else if (cat.includes('poultry')) cat = 'poultry_farm';
          else if (cat.includes('pharmacy')) cat = 'pharmacy';
          else cat = 'feed_mill';

          const address = (r['Full Address'] || r['Address'] || r['address'] || 'Bangladesh').toString().trim();
          const territory = (r['Territory'] || r['territory'] || 'Regional Territory').toString().trim();
          const assignedSrId = (r['Assigned SR ID'] || r['SR ID'] || r['assignedSrId'] || 'SR01').toString().trim().toUpperCase();
          const creditLimit = Number(r['Credit Limit'] || r['creditLimit'] || 100000);
          const balance = Number(r['Opening Balance'] || r['Balance'] || r['balance'] || 0);

          // Check if customer ID already exists or match by shopName + phone
          let existing = rawId ? store.db.customers.find(c => c.id.toLowerCase() === rawId.toLowerCase()) : null;
          if (!existing && phone) {
            existing = store.db.customers.find(c => c.phone === phone);
          }

          if (existing) {
            existing.shopName = shopName;
            existing.name = ownerName;
            existing.phone = phone || existing.phone;
            existing.category = cat as any;
            existing.address = address;
            existing.territory = territory;
            existing.assignedSrId = assignedSrId;
            existing.creditLimit = creditLimit;
            if (balance) existing.balance = balance;
            existing.status = 'approved';
            updated++;
          } else {
            const nextId = rawId && rawId.startsWith('BH') ? rawId : store.getNextCustomerId();
            store.db.customers.unshift({
              id: nextId,
              shopName: shopName,
              name: ownerName,
              phone: phone,
              category: cat as any,
              address: address,
              territory: territory,
              status: 'approved',
              creditLimit: creditLimit,
              balance: balance,
              createdBy: 'ADMIN',
              assignedSrId: assignedSrId,
              createdAt: new Date().toISOString().split('T')[0]
            });
            added++;
          }
        });

        store.saveDatabase();
        showToast(`Customers: ${added} added, ${updated} updated! Realtime DB Synced.`);
        App.render();
      } catch (err: any) {
        showToast('Failed to import customers: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    input.value = '';
  }
};

(window as any).ProductActions = {
  quickOrder: (pId: string) => {
    const p = store.db.products.find(prod => prod.id === pId);
    if (p) {
      const current = store.cart.items[pId] ? store.cart.items[pId].qty : 0;
      if (!store.canOrderQty(p, current + 1)) {
        showToast(store.lang === 'bn'
          ? `স্টকের কারণে আর বাড়ানো যাবে না (আছে ${p.stock}টি)`
          : `Stock limit reached (${p.stock} in stock)`, 'error');
        return;
      }
      store.setCartItem(p, current + 1);
      store.persistCart();
      showToast(store.lang === 'bn' ? `${p.bnName || p.name} অর্ডার স্লিপে যোগ হয়েছে` : `Added ${p.name} to order slip! Opening slip...`);
      App.navigate('order_booking');
    }
  },
  restockProduct: (pId: string, addQty: number) => {
    const p = store.db.products.find(prod => prod.id === pId);
    if (!p) return;
    const qty = Math.max(1, Number(addQty) || 0);
    p.stock += qty;
    store.saveDatabase();
    showToast(`Added +${qty} units to ${p.name}! New stock: ${p.stock}`);

    const modal = document.getElementById('lowStockModal');
    if (modal) {
      modal.remove();
      productModule.openLowStockModal();
    } else {
      App.render();
    }
  },
  setProductStock: (pId: string, newStock: number) => {
    const p = store.db.products.find(prod => prod.id === pId);
    if (!p) return;
    const stock = Math.max(0, Number(newStock) || 0);
    p.stock = stock;
    store.saveDatabase();
    showToast(`Stock updated for ${p.name}! Current stock: ${p.stock}`);

    const modal = document.getElementById('lowStockModal');
    if (modal) {
      modal.remove();
      productModule.openLowStockModal();
    } else {
      App.render();
    }
  },
  openAddModal: () => {
    productModule.openAddProductModal(() => {
      showToast('New product added successfully!');
      App.render();
    });
  },
  openLowStockModal: () => {
    productModule.openLowStockModal();
  },
  deleteProduct: (pId: string) => {
    const p = store.db.products.find(prod => prod.id === pId);
    if (!p) return;
    showConfirmDialog({
      title: 'Delete Product Confirmation',
      message: `Are you sure you want to delete product "${p.name}"?`,
      details: `
        <div class="font-bold text-slate-900 dark:text-white">${p.name} (${p.sku})</div>
        <div class="text-slate-500 font-medium">Stock: ${p.stock} • TP: ৳${p.tradePrice}</div>
      `,
      confirmText: 'Yes, Delete Product',
      type: 'danger',
      onConfirm: () => {
        store.db.products = store.db.products.filter(prod => prod.id !== pId);
        store.saveDatabase();
        showToast(`Deleted ${p.name}`);
        App.render();
      }
    });
  },
  previewAdp: (pId: string) => {
    const tp = Number((document.getElementById(`tpInput-${pId}`) as HTMLInputElement | null)?.value) || 0;
    const d = Math.min(100, Math.max(0, Number((document.getElementById(`discInput-${pId}`) as HTMLInputElement | null)?.value) || 0));
    const cell = document.getElementById(`adpCell-${pId}`);
    if (cell) cell.textContent = (Math.round(tp * (100 - d)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  },
  saveRowPrice: (pId: string) => {
    const tpInput = document.getElementById(`tpInput-${pId}`) as HTMLInputElement | null;
    const mrpInput = document.getElementById(`mrpInput-${pId}`) as HTMLInputElement | null;
    const discInput = document.getElementById(`discInput-${pId}`) as HTMLInputElement | null;
    const tiersInput = document.getElementById(`tiersInput-${pId}`) as HTMLInputElement | null;
    const p = store.db.products.find(prod => prod.id === pId);
    if (!(p && tpInput && mrpInput && discInput && tiersInput)) return;
    const tp = Number(tpInput.value);
    const mrp = Number(mrpInput.value);
    if (!(tp > 0) || !(mrp > 0)) {
      showToast(store.lang === 'bn' ? 'TP ও MRP শূন্যের বেশি হতে হবে' : 'TP and MRP must be greater than zero', 'error');
      return;
    }
    const disc = Math.min(100, Math.max(0, Number(discInput.value) || 0));
    const tiers = parseTiers(tiersInput.value);
    if (tiersInput.value.trim() && tiers.length === 0) {
      showToast(store.lang === 'bn' ? 'ফ্রি অফার ভুল ফরম্যাটে। এভাবে লিখুন: 10+1, 20+3' : 'Invalid free offer. Use format: 10+1, 20+3', 'error');
      return;
    }
    p.tradePrice = tp;
    p.mrp = mrp;
    setProductOffer(p, disc, tiers);
    store.syncCartWithProducts();
    store.saveDatabase();
    showToast(store.lang === 'bn' ? `${p.name} সেভ হয়েছে (ADP ৳${calcAdp(p)})` : `Saved ${p.name} (ADP ৳${calcAdp(p)})`);
    App.render();
  },
  applyBulkDiscount: () => {
    const cat = (document.getElementById('bulkCategorySelect') as HTMLSelectElement | null)?.value || 'all';
    const raw = (document.getElementById('bulkDiscountInput') as HTMLInputElement | null)?.value;
    const d = Number(raw);
    if (raw === undefined || raw === '' || !(d >= 0 && d <= 100)) {
      showToast(store.lang === 'bn' ? '০ থেকে ১০০ এর মধ্যে ছাড় % লিখুন' : 'Enter a discount % between 0 and 100', 'error');
      return;
    }
    let count = 0;
    store.db.products.forEach(p => {
      if (cat === 'all' || p.category === cat) { setProductOffer(p, d, getFreeTiers(p)); count++; }
    });
    store.syncCartWithProducts();
    store.saveDatabase();
    showToast(store.lang === 'bn' ? `${count}টি প্রোডাক্টে ${d}% ছাড় বসেছে` : `Applied ${d}% discount to ${count} products`);
    App.render();
  },
  applyBulkFree: () => {
    const cat = (document.getElementById('bulkCategorySelect') as HTMLSelectElement | null)?.value || 'all';
    const tiers = parseTiers((document.getElementById('bulkFreeInput') as HTMLInputElement | null)?.value || '');
    if (tiers.length === 0) {
      showToast(store.lang === 'bn' ? 'ফ্রি অফার লিখুন, যেমন: 10+1, 20+3' : 'Type a free offer, e.g. 10+1, 20+3', 'error');
      return;
    }
    let count = 0;
    store.db.products.forEach(p => {
      if (cat === 'all' || p.category === cat) { setProductOffer(p, getDiscountPct(p), tiers); count++; }
    });
    store.syncCartWithProducts();
    store.saveDatabase();
    showToast(store.lang === 'bn' ? `${count}টি প্রোডাক্টে ফ্রি অফার বসেছে` : `Applied free offer to ${count} products`);
    App.render();
  },
  clearBulkFree: () => {
    const cat = (document.getElementById('bulkCategorySelect') as HTMLSelectElement | null)?.value || 'all';
    let count = 0;
    store.db.products.forEach(p => {
      if (cat === 'all' || p.category === cat) { setProductOffer(p, getDiscountPct(p), []); count++; }
    });
    store.syncCartWithProducts();
    store.saveDatabase();
    showToast(store.lang === 'bn' ? `${count}টি প্রোডাক্টের ফ্রি অফার মোছা হয়েছে` : `Removed free offers from ${count} products`);
    App.render();
  },
  downloadTemplate: () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel export library loading...', 'info');
      return;
    }
    const templateData = [
      {
        'SKU': 'BHA-101',
        'Product Name': 'Bio-Enro 10% Solution',
        'বাংলা নাম': 'বায়ো-এনরো ১০% সলিউশন',
        'Category': 'antibiotics',
        'Pack Size': '100ml',
        'Trade Price': 320,
        'MRP': 380,
        'Stock': 200,
        'Discount %': 5,
        'Free Offer': '10+1, 20+2',
        'Batch No': 'B26-001',
        'Dosage': 'Poultry CRD & Colibacillosis'
      },
      {
        'SKU': 'BHA-201',
        'Product Name': 'BH-CalciPlus Gold',
        'বাংলা নাম': 'বিএইচ-ক্যালসিপ্লাস গোল্ড',
        'Category': 'supplements',
        'Pack Size': '1 Liter',
        'Trade Price': 450,
        'MRP': 540,
        'Stock': 150,
        'Discount %': 5,
        'Free Offer': '',
        'Batch No': 'B26-002',
        'Dosage': 'High-yield Dairy Cow & Layer'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product_Template");
    XLSX.writeFile(wb, "BH_Agro_Product_Upload_Template.xlsx");
    showToast('Downloaded Excel template!');
  },
  handleUpload: (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel parser loading...', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt: ProgressEvent<FileReader>) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          showToast('Uploaded sheet is empty!', 'error');
          return;
        }

        let updated = 0;
        let added = 0;

        rows.forEach((r, idx) => {
          const sku = (r['SKU'] || r['sku'] || `BHA-${Date.now().toString().slice(-3)}${idx}`).toString().trim();
          const name = (r['Product Name'] || r['name'] || r['Name'] || 'Veterinary Product').toString().trim();
          const bnName = (r['বাংলা নাম'] || r['bnName'] || name).toString().trim();
          const cat = (r['Category'] || r['category'] || 'supplements').toString().toLowerCase().trim();
          const pack = (r['Pack Size'] || r['packing'] || '100ml').toString().trim();
          const tp = Number(r['Trade Price'] || r['tradePrice'] || r['TP'] || 100);
          const mrp = Number(r['MRP'] || r['mrp'] || Math.round(tp * 1.2));
          const stock = Number(r['Stock'] || r['stock'] || 100);
          const offer = (r['Trade Offer'] || r['offer'] || 'Standard').toString().trim();
          const discRaw = r['Discount %'] ?? r['Discount'] ?? r['discount'];
          const freeRaw = r['Free Offer'] ?? r['free'] ?? r['Free'];

          const existingIndex = store.db.products.findIndex(p => p.sku.toLowerCase() === sku.toLowerCase());
          if (existingIndex >= 0) {
            store.db.products[existingIndex].name = name;
            store.db.products[existingIndex].bnName = bnName;
            store.db.products[existingIndex].category = cat as any;
            store.db.products[existingIndex].packSize = pack;
            store.db.products[existingIndex].tradePrice = tp;
            store.db.products[existingIndex].mrp = mrp;
            store.db.products[existingIndex].stock = stock;
            const ex = store.db.products[existingIndex];
            if (discRaw !== undefined || freeRaw !== undefined) {
              const d = (discRaw !== undefined && String(discRaw).trim() !== '') ? Math.min(100, Math.max(0, Number(discRaw) || 0)) : getDiscountPct(ex);
              const tiers = freeRaw !== undefined ? parseTiers(String(freeRaw)) : getFreeTiers(ex);
              setProductOffer(ex, d, tiers);
            } else if (ex.freeTiers === undefined && ex.discountPct === undefined) {
              ex.tradeOffer = offer; // পুরনো ধাঁচের অফার লেখা
            }
            updated++;
          } else {
            store.db.products.push({
              id: `PROD-${Date.now().toString().slice(-4)}${idx}`,
              name,
              bnName,
              sku,
              category: cat as any,
              packSize: pack,
              tradePrice: tp,
              mrp,
              stock,
              tradeOffer: offer,
              batchNo: `B26-${Date.now().toString().slice(-3)}`
            });
            if (discRaw !== undefined || freeRaw !== undefined) {
              const np = store.db.products[store.db.products.length - 1];
              const d = (discRaw !== undefined && String(discRaw).trim() !== '') ? Math.min(100, Math.max(0, Number(discRaw) || 0)) : 0;
              setProductOffer(np, d, freeRaw !== undefined ? parseTiers(String(freeRaw)) : []);
            }
            added++;
          }
        });

        store.saveDatabase();
        showToast(`Excel Import: ${added} added, ${updated} updated!`);
        App.render();
      } catch (err: any) {
        showToast('Failed to parse Excel file: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    input.value = '';
  }
};

(window as any).OrderActions = {
  setCustomer: (val: string) => {
    store.cart.customerId = val;
    store.persistCart();
    App.render();
  },
  setCategory: (val: string) => {
    store.catalogCategory = val;
    App.render();
  },
  setSearch: (val: string) => {
    store.catalogSearch = val;
    // শুধু প্রোডাক্ট লিস্ট আপডেট, সার্চ বক্স নতুন করে আঁকা হয় না (কীবোর্ড বন্ধ হয় না)
    if (!orderModule.refreshCatalogOnly()) App.render();
  },
  updateQty: (pId: string, qty: number) => {
    const prod = store.db.products.find(p => p.id === pId);
    if (!prod) return;
    const want = Math.max(0, Math.floor(Number(qty) || 0));
    if (want > 0 && !store.canOrderQty(prod, want)) {
      const need = unitsNeeded(prod, want);
      showToast(store.lang === 'bn'
        ? `স্টকের কারণে আর বাড়ানো যাবে না: ফ্রিসহ ${need}টি লাগবে, আছে ${prod.stock}টি`
        : `Stock limit: ${need} units needed incl. free, only ${prod.stock} in stock`, 'error');
      return;
    }
    store.setCartItem(prod, want);
    store.persistCart();
    if (!orderModule.refreshOrderPartial()) App.render();
  },
  clearCart: () => {
    store.cart.items = {};
    store.cart.discount = 0;
    store.cart.notes = '';
    store.persistCart();
    if (!orderModule.refreshOrderPartial()) App.render();
  },
  setDiscount: (val: string) => {
    store.cart.discount = Math.max(0, Number(val) || 0);
    store.persistCart();
    // শুধু মোট হিসাব আপডেট, ডিসকাউন্ট বক্স নতুন করে আঁকা হয় না
    if (!orderModule.refreshTotalsOnly()) App.render();
  },
  setNotes: (val: string) => {
    store.cart.notes = val;
    store.persistCart();
  },
  scrollToSlip: () => orderModule.scrollToSlip(),
  submitOrder: () => {
    if (orderModule.isSubmitting) return;
    const isBn = store.lang === 'bn';
    const keys = Object.keys(store.cart.items);
    const customer = store.db.customers.find(c => c.id === store.cart.customerId);
    const doSubmit = () => {
      orderModule.submitOrder(() => {
        App.navigate('my_orders');
      }, showToast);
    };
    // কাস্টমার/আইটেম না থাকলে সরাসরি ত্রুটির বার্তা দেখাবে
    if (!customer || keys.length === 0) { doSubmit(); return; }

    const t = orderModule.getCartTotals();
    const lines = keys.map(k => {
      const it = store.cart.items[k];
      const name = isBn ? (it.product.bnName || it.product.name) : it.product.name;
      return `<div class="flex justify-between gap-3"><span class="truncate">${name} × ${it.qty}${it.freeQty ? ` (+${it.freeQty} ${isBn ? 'ফ্রি' : 'free'})` : ''}</span><b>৳${it.total.toLocaleString()}</b></div>`;
    }).join('');
    showConfirmDialog({
      title: isBn ? 'অর্ডার জমা দেবেন?' : 'Submit this order?',
      message: `${customer.id} ${customer.shopName}`,
      details: `<div class="space-y-1 max-h-48 overflow-y-auto">${lines}</div>
        <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-0.5">
          ${t.discount > 0 ? `<div class="flex justify-between text-rose-500"><span>${store.t('discount')}</span><b>-৳${t.discount.toLocaleString()}</b></div>` : ''}
          <div class="flex justify-between text-sm font-black text-slate-900 dark:text-white"><span>${store.t('grandTotal')}</span><span>৳${t.grand.toLocaleString()}</span></div>
        </div>`,
      confirmText: isBn ? 'হ্যাঁ, জমা দিন' : 'Yes, Submit',
      cancelText: isBn ? 'ফিরে যান' : 'Go back',
      type: 'info',
      onConfirm: doSubmit
    });
  }
};

(window as any).AuthActions = {
  switchMode: (mode: 'sr' | 'admin') => {
    const srTab = document.getElementById('loginTabSr');
    const adminTab = document.getElementById('loginTabAdmin');
    const srSec = document.getElementById('srLoginFormSection');
    const adminSec = document.getElementById('adminLoginFormSection');
    if (!srTab || !adminTab || !srSec || !adminSec) return;

    if (mode === 'admin') {
      adminTab.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow';
      srTab.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-white';
      srSec.classList.add('hidden');
      adminSec.classList.remove('hidden');
    } else {
      srTab.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow';
      adminTab.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-white';
      adminSec.classList.add('hidden');
      srSec.classList.remove('hidden');
    }
    App.refreshIcons();
  },
  submitSR: () => {
    if (!canLoginAs('sr')) {
      showToast(store.lang === 'bn' ? 'এসআর লগইন এই লিংকে বন্ধ। অ্যাডমিন লিংক ব্যবহার করুন।' : 'SR login is not available on this site.', 'error');
      return;
    }
    const userInput = (document.getElementById('srLoginUsername') as HTMLInputElement).value.trim();
    const passInput = (document.getElementById('srLoginPassword') as HTMLInputElement).value.trim();

    const foundSR = store.getActiveSrs().find(s => 
      (s.username === userInput || s.id.toLowerCase() === userInput.toLowerCase()) && 
      (s.password === passInput || s.pin === passInput)
    );

    if (foundSR) {
      store.setAuth(foundSR, 'sr');
      showToast(store.lang === 'bn' ? `স্বাগতম ${foundSR.name}!` : `Welcome ${foundSR.name}!`);
      App.render();
    } else {
      showToast(store.lang === 'bn' ? 'ভুল এসআর ইউজারনেম বা পাসওয়ার্ড!' : 'Invalid SR username or password!', 'error');
    }
  },
  submitAdmin: () => {
    if (!canLoginAs('admin')) {
      showToast(store.lang === 'bn' ? 'অ্যাডমিন লগইন এই লিংকে বন্ধ। এসআর পোর্টালের লিংক ব্যবহার করুন।' : 'Admin login is not available on this site.', 'error');
      return;
    }
    const userInput = (document.getElementById('adminLoginUsername') as HTMLInputElement).value.trim();
    const passInput = (document.getElementById('adminLoginPassword') as HTMLInputElement).value.trim();

    const admins = store.db.admins || [];
    const foundAdmin = admins.find(a => 
      (a.username === userInput || a.id.toLowerCase() === userInput.toLowerCase()) && 
      (a.password === passInput || a.pin === passInput)
    );

    if (foundAdmin) {
      store.setAuth(foundAdmin, 'admin');
      showToast(store.lang === 'bn' ? `স্বাগতম অ্যাডমিন ${foundAdmin.name}!` : `Welcome Admin ${foundAdmin.name}!`);
      App.render();
    } else {
      showToast(store.lang === 'bn' ? 'ভুল অ্যাডমিন ইউজারনেম বা পাসওয়ার্ড!' : 'Invalid Admin credentials!', 'error');
    }
  },
  openAddAdminModal: () => {
    if (!canLoginAs('admin')) return; // শুধু অ্যাডমিন সাইটে অ্যাডমিন তৈরি করা যাবে
    authModule.openAddAdminModal(() => {
      showToast('New Admin account created and synced to Firebase!');
      App.render();
    });
  },
  deleteAdmin: (id: string) => {
    const adm = (store.db.admins || []).find(a => a.id === id);
    showConfirmDialog({
      title: 'Remove Admin Account',
      message: `Are you sure you want to remove admin account "${adm?.name || id}"?`,
      confirmText: 'Yes, Remove Admin',
      type: 'danger',
      onConfirm: () => {
        if (!store.db.admins) return;
        store.db.admins = store.db.admins.filter(a => a.id !== id);
        store.saveDatabase();
        showToast('Admin account removed.');
        App.render();
      }
    });
  },
  openAddSRModal: () => {
    authModule.openAddSRModal(() => App.render());
  },
  editSR: (id: string) => {
    if (store.authSession.role !== 'admin') return; // শুধু অ্যাডমিন এসআর এডিট করতে পারে
    authModule.openAddSRModal(() => App.render(), id);
  },
  deleteSR: (id: string) => {
    const sr = store.db.srs.find(s => s.id === id);
    if (!sr) return;
    const isBN = store.lang === 'bn';
    const assigned = (store.db.customers || []).filter(c => (c.assignedSrId || c.createdBy) === id).length;
    showConfirmDialog({
      title: isBN ? 'এসআর অ্যাকাউন্ট ডিলিট' : 'Delete SR Account',
      message: isBN
        ? `"${sr.name}" (${sr.id}) আর লগইন করতে পারবে না। তার সব অর্ডার ও বিক্রির তথ্য থেকে যাবে।${assigned ? ` তার অধীনে ${assigned} জন কাস্টমার আছে, পরে অন্য এসআরকে দিন।` : ''}`
        : `"${sr.name}" (${sr.id}) will no longer be able to log in. All orders and sales data are kept.${assigned ? ` ${assigned} customer(s) are assigned to this SR - reassign them afterwards.` : ''}`,
      confirmText: isBN ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete SR',
      type: 'danger',
      onConfirm: () => {
        sr.deletedAt = new Date().toISOString();
        sr.active = false;
        store.saveDatabase();
        showToast(isBN ? 'এসআর ডিলিট হয়েছে। বিক্রির তথ্য সংরক্ষিত আছে।' : 'SR removed. Sales data is kept.');
        App.render();
      }
    });
  },
  restoreSR: (id: string) => {
    const sr = store.db.srs.find(s => s.id === id);
    if (!sr) return;
    delete sr.deletedAt;
    sr.active = true;
    store.saveDatabase();
    showToast(store.lang === 'bn' ? 'এসআর আবার চালু হয়েছে।' : 'SR restored.');
    App.render();
  },
  downloadTemplate: () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel library loading...', 'info');
      return;
    }
    const templateData = [
      {
        'SR ID': 'SR04',
        'Full Name': 'Md. Masud Rana',
        'Username': 'masud_sr',
        'Password': '123',
        'Mobile Phone': '01712000111',
        'Assigned Territory': 'Rangpur Dairy & Poultry Belt',
        'Monthly Target': 350000,
        'Email': 'masud.sr@bhagroltd.com',
        'Active': 'Yes'
      },
      {
        'SR ID': 'SR05',
        'Full Name': 'Md. Al-Amin Hossain',
        'Username': 'alamin_sr',
        'Password': '123',
        'Mobile Phone': '01819000222',
        'Assigned Territory': 'Cumilla Feed & Dairy Zone',
        'Monthly Target': 400000,
        'Email': 'alamin.sr@bhagroltd.com',
        'Active': 'Yes'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SR_Template");
    XLSX.writeFile(wb, "BH_Agro_SR_Import_Template.xlsx");
    showToast('SR Excel template downloaded!');
  },
  handleUpload: (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast('Excel parser loading...', 'info');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt: ProgressEvent<FileReader>) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          showToast('Uploaded SR sheet is empty!', 'error');
          return;
        }

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let nextNum = parseInt(store.getNextSrId().replace(/\D/g, ''), 10);

        rows.forEach((r, idx) => {
          const name = (r['Full Name'] || r['Name'] || r['name'] || '').toString().trim();
          if (!name) return;

          let srId = (r['SR ID'] || r['id'] || r['ID'] || `SR${String(nextNum++).padStart(2, '0')}`).toString().trim().toUpperCase();
          const username = (r['Username'] || r['username'] || srId.toLowerCase()).toString().trim().toLowerCase();
          const password = (r['Password'] || r['password'] || '123').toString().trim();
          const phone = (r['Mobile Phone'] || r['Phone'] || r['phone'] || '01700-000000').toString().trim();
          const territory = (r['Assigned Territory'] || r['Territory'] || r['territory'] || 'Regional Field').toString().trim();
          const target = Number(r['Monthly Target'] || r['target'] || 350000);
          const email = (r['Email'] || r['email'] || `${username}@bhagroltd.com`).toString().trim();
          const activeStr = (r['Active'] || r['active'] || 'yes').toString().toLowerCase();
          const isActive = !activeStr.includes('no') && !activeStr.includes('inactive');

          const existingIndex = store.db.srs.findIndex(s => s.id.toUpperCase() === srId || (!s.deletedAt && s.username === username));
          // ডিলিট করা এসআরের আইডি বা অর্ডারে ব্যবহৃত পুরনো আইডি আবার ব্যবহার করা যাবে না
          if (existingIndex >= 0 && store.db.srs[existingIndex].deletedAt) { skipped++; return; }
          if (existingIndex < 0 && store.isSrIdUsed(srId)) { skipped++; return; }
          if (existingIndex >= 0) {
            store.db.srs[existingIndex].name = name;
            store.db.srs[existingIndex].password = password;
            store.db.srs[existingIndex].phone = phone;
            store.db.srs[existingIndex].territory = territory;
            store.db.srs[existingIndex].target = target;
            store.db.srs[existingIndex].email = email;
            store.db.srs[existingIndex].active = isActive;
            updated++;
          } else {
            store.db.srs.push({
              id: srId,
              username: username,
              password: password,
              name: name,
              phone: phone,
              territory: territory,
              target: target,
              email: email,
              active: isActive
            });
            added++;
          }
        });

        store.saveDatabase();
        showToast(`SR Accounts: ${added} added, ${updated} updated${skipped ? `, ${skipped} skipped (ID already used/deleted)` : ''}! Realtime DB Synced.`);
        App.render();
      } catch (err: any) {
        showToast('Failed to import SRs: ' + err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    input.value = '';
  },
  toggleLang: () => {
    store.setLang(store.lang === 'bn' ? 'en' : 'bn');
    App.render();
  },
  toggleTheme: () => {
    store.toggleTheme();
    App.render();
  }
};

(window as any).ReportActions = {
  setMonth: (m: string) => {
    reportModule.setMonth(m);
    App.render();
  },
  exportSRWise: () => reportModule.exportSRWiseToExcel(showToast),
  exportCustomerWise: () => reportModule.exportCustomerWiseToExcel(showToast),
  exportDaywise: () => reportModule.exportDaywiseToExcel(showToast),
  exportProductSales: () => reportModule.exportProductSalesToExcel(showToast),
  exportStock: () => reportModule.exportStockToExcel(showToast),
  filterCategory: (cat: string) => {
    const sections = document.querySelectorAll<HTMLElement>('[data-report-section]');
    sections.forEach(sec => {
      const secCat = sec.getAttribute('data-report-section');
      if (cat === 'all' || secCat === cat) {
        sec.style.display = '';
      } else {
        sec.style.display = 'none';
      }
    });

    // Re-apply any active search filter within the visible section
    const searchInput = document.getElementById('reportSearchInput') as HTMLInputElement | null;
    if (searchInput && searchInput.value) {
      searchInput.dispatchEvent(new Event('input'));
    }
  }
};

// Application Bootstrap with Veterinary Splash Screen Transition
const dismissSplashScreen = () => {
  const splash = document.getElementById('appSplashScreen');
  if (splash) {
    const statusText = document.getElementById('splashStatusText');
    if (statusText) {
      statusText.innerText = store.lang === 'bn' ? 'সিস্টেম প্রস্তুত!' : 'System Ready!';
    }
    setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.transform = 'scale(1.02)';
      splash.style.pointerEvents = 'none';
      setTimeout(() => {
        splash.remove();
      }, 700);
    }, 450);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  router.init(() => App.render());
  App.render();
  initPwa();

  // ডেস্কটপ: "/" চাপলে পেজের সার্চ বক্সে ফোকাস
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const box = document.querySelector<HTMLInputElement>('main input[id*="earch"]');
      if (box) { e.preventDefault(); box.focus(); box.select(); }
    }
  });

  // Natural splash duration (app displays veterinary emblem and circular spinner)
  setTimeout(dismissSplashScreen, 950);
});
