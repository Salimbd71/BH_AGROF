/**
 * BH Agro Ltd. - Sales Reports & SheetJS Excel Export Module
 * Day-wise, Customer-wise, and Product-wise sales reports
 * Real-time Firebase Database sync and personalized view for SRs & Admin
 */

import { store } from './store.ts';

export class ReportModule {
  /** নির্বাচিত মাস: "YYYY-MM" অথবা "all" (শুরুতে চলতি মাস) */
  selectedMonth: string = new Date().toISOString().slice(0, 7);

  setMonth(m: string) {
    this.selectedMonth = m || 'all';
  }

  /** নিজের (এসআর) অথবা সব (অ্যাডমিন) অর্ডার, মাসের ফিল্টার ছাড়া */
  scopedOrders(): import('./store.ts').Order[] {
    const isSR = store.authSession.role !== 'admin';
    const srId = store.authSession.user?.id;
    return isSR ? store.db.orders.filter(o => o.srId === srId) : store.db.orders;
  }

  /** নির্বাচিত মাসের অর্ডার */
  monthOrders(): import('./store.ts').Order[] {
    const base = this.scopedOrders();
    if (this.selectedMonth === 'all') return base;
    return base.filter(o => (o.date || '').slice(0, 7) === this.selectedMonth);
  }

  monthLabel(m: string): string {
    if (m === 'all') return store.lang === 'bn' ? 'সব সময়' : 'All time';
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, (mo || 1) - 1, 1).toLocaleDateString(store.lang === 'bn' ? 'bn-BD' : 'en-GB', { month: 'long', year: 'numeric' });
  }

  /** মাসভিত্তিক সারাংশ (নতুন থেকে পুরনো) */
  monthSummaries() {
    const map: Record<string, { month: string; orders: number; sales: number; discount: number; free: number; customers: Set<string> }> = {};
    const current = new Date().toISOString().slice(0, 7);
    map[current] = { month: current, orders: 0, sales: 0, discount: 0, free: 0, customers: new Set() };
    this.scopedOrders().forEach(o => {
      const m = (o.date || '').slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, orders: 0, sales: 0, discount: 0, free: 0, customers: new Set() };
      const row = map[m];
      row.orders += 1;
      row.sales += o.grandTotal;
      row.discount += (o.productDiscount || 0) + (o.discount || 0);
      row.free += o.items.reduce((sum, it) => sum + (it.freeQty || 0), 0);
      row.customers.add(o.customerId);
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }

  renderMonthPicker(isBN: boolean): string {
    const rows = this.monthSummaries();
    const sel = this.selectedMonth;
    const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const total = rows.reduce((a, r) => ({ orders: a.orders + r.orders, sales: a.sales + r.sales, discount: a.discount + r.discount, free: a.free + r.free }), { orders: 0, sales: 0, discount: 0, free: 0 });
    return `
      <div class="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="calendar-range" class="w-5 h-5 text-brand-600"></i>
              <span>${isBN ? 'মাস অনুযায়ী বিক্রয় রিপোর্ট' : 'Monthly sales report'}</span>
            </h3>
            <p class="text-xs text-slate-500">${isBN ? 'নিচের সব রিপোর্ট ও Excel এক্সপোর্ট বাছাই করা মাসের জন্য' : 'All reports and Excel exports below follow the selected month'}</p>
          </div>
          <select id="reportMonthSelect" onchange="window.ReportActions.setMonth(this.value)" class="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white">
            ${rows.map(r => `<option value="${r.month}" ${sel === r.month ? 'selected' : ''}>${this.monthLabel(r.month)}</option>`).join('')}
            <option value="all" ${sel === 'all' ? 'selected' : ''}>${this.monthLabel('all')}</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs min-w-[520px]">
            <thead>
              <tr class="text-left font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">
                <th class="py-2">${isBN ? 'মাস' : 'Month'}</th>
                <th class="py-2 text-right">${isBN ? 'অর্ডার' : 'Orders'}</th>
                <th class="py-2 text-right">${isBN ? 'কাস্টমার' : 'Customers'}</th>
                <th class="py-2 text-right">${isBN ? 'বিক্রয় (৳)' : 'Sales (৳)'}</th>
                <th class="py-2 text-right">${isBN ? 'ছাড় (৳)' : 'Discounts (৳)'}</th>
                <th class="py-2 text-right">${isBN ? 'ফ্রি ইউনিট' : 'Free units'}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${rows.map(r => `
                <tr onclick="window.ReportActions.setMonth('${r.month}')" class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${sel === r.month ? 'bg-brand-50 dark:bg-brand-950/40 font-bold' : ''}">
                  <td class="py-2 text-slate-900 dark:text-white">${this.monthLabel(r.month)}</td>
                  <td class="py-2 text-right">${r.orders}</td>
                  <td class="py-2 text-right">${r.customers.size}</td>
                  <td class="py-2 text-right font-black text-brand-700 dark:text-brand-400">৳${money(r.sales)}</td>
                  <td class="py-2 text-right text-rose-500">${r.discount > 0 ? '৳' + money(r.discount) : '-'}</td>
                  <td class="py-2 text-right text-tealbrand-600">${r.free > 0 ? r.free : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                <td class="py-2">${isBN ? 'সর্বমোট' : 'Total'}</td>
                <td class="py-2 text-right">${total.orders}</td>
                <td class="py-2"></td>
                <td class="py-2 text-right text-brand-700 dark:text-brand-400">৳${money(total.sales)}</td>
                <td class="py-2 text-right text-rose-500">${total.discount > 0 ? '৳' + money(total.discount) : '-'}</td>
                <td class="py-2 text-right text-tealbrand-600">${total.free > 0 ? total.free : '-'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  renderReportsSection(): string {
    const isSR = store.authSession.role !== 'admin';
    const currentSr = store.authSession.user;
    const currentSrId = currentSr?.id || 'SR01';

    // Filter data: An SR only sees their own orders & assigned customers! Admin sees all.
    const orders = this.monthOrders();

    const customers = isSR
      ? store.db.customers.filter(c => (c.assignedSrId || c.createdBy) === currentSrId)
      : store.db.customers;

    const srs = isSR
      ? store.db.srs.filter(s => s.id === currentSrId)
      : store.getReportSrList();

    // 1. SR-wise aggregation (For Admin comparative view or SR target card)
    const srReportList = srs.map(sr => {
      const srOrders = orders.filter(o => o.srId === sr.id);
      const totalAmount = srOrders.reduce((acc, o) => acc + o.grandTotal, 0);
      const totalItems = srOrders.reduce((acc, o) => acc + o.items.reduce((s, it) => s + it.qty, 0), 0);
      const target = sr.target || 350000;
      const pct = Math.min(100, Math.round((totalAmount / target) * 100));

      return {
        id: sr.id,
        name: sr.name,
        territory: sr.territory,
        phone: sr.phone,
        target: target,
        orderCount: srOrders.length,
        totalItems: totalItems,
        totalAmount: totalAmount,
        achievementPct: pct
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    // 2. Customer-wise aggregation
    const custReportMap: Record<string, {
      id: string;
      shopName: string;
      name: string;
      category: string;
      territory: string;
      phone: string;
      orderCount: number;
      totalItems: number;
      totalAmount: number;
      balance: number;
      creditLimit: number;
    }> = {};

    // Initialize with approved customers
    customers.forEach(c => {
      custReportMap[c.id] = {
        id: c.id,
        shopName: c.shopName,
        name: c.name,
        category: c.category,
        territory: c.territory,
        phone: c.phone,
        orderCount: 0,
        totalItems: 0,
        totalAmount: 0,
        balance: c.balance || 0,
        creditLimit: c.creditLimit || 0
      };
    });

    // Populate order totals
    orders.forEach(o => {
      if (custReportMap[o.customerId]) {
        custReportMap[o.customerId].orderCount += 1;
        custReportMap[o.customerId].totalAmount += o.grandTotal;
        custReportMap[o.customerId].totalItems += o.items.reduce((s, it) => s + it.qty, 0);
      }
    });

    const custReportList = Object.values(custReportMap).sort((a, b) => b.totalAmount - a.totalAmount);

    // 3. Day-wise aggregation
    const daywiseMap: Record<string, { date: string; orderCount: number; totalAmount: number; totalItems: number }> = {};
    orders.forEach(o => {
      if (!daywiseMap[o.date]) {
        daywiseMap[o.date] = { date: o.date, orderCount: 0, totalAmount: 0, totalItems: 0 };
      }
      daywiseMap[o.date].orderCount += 1;
      daywiseMap[o.date].totalAmount += o.grandTotal;
      daywiseMap[o.date].totalItems += o.items.reduce((s, it) => s + it.qty, 0);
    });
    const daywiseList = Object.values(daywiseMap).sort((a, b) => b.date.localeCompare(a.date));

    // 4. Product-wise aggregation
    const prodSalesMap: Record<string, { name: string; packSize: string; unitPrice: number; totalQty: number; totalRevenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(it => {
        if (!prodSalesMap[it.productId]) {
          prodSalesMap[it.productId] = { name: it.name, packSize: it.packSize, unitPrice: it.tp, totalQty: 0, totalRevenue: 0 };
        }
        prodSalesMap[it.productId].totalQty += it.qty;
        prodSalesMap[it.productId].totalRevenue += it.total;
      });
    });
    const prodSalesList = Object.values(prodSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Summary calculation
    const totalSalesAmount = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalUnitsSold = orders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty, 0), 0);
    const srTarget = (currentSr as any)?.target || 350000;
    const srPct = Math.min(100, Math.round((totalSalesAmount / srTarget) * 100));

    const isBN = store.lang === 'bn';

    return `
      <div class="space-y-6">
        
        ${this.renderMonthPicker(isBN)}

        <!-- Header Banner -->
        <div class="p-6 rounded-3xl ${isSR ? 'bg-gradient-to-r from-brand-900 via-brand-850 to-tealbrand-900' : 'bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900'} text-white shadow-xl border border-brand-800/40">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  ${isSR 
                    ? (isBN ? `এসআর সেলস রিপোর্ট • ${currentSr?.name || ''} (${currentSrId})` : `SR Field Sales Report • ${currentSr?.name || ''} (${currentSrId})`)
                    : (isBN ? 'সেন্ট্রাল হেডকোয়ার্টার • সেলস ও অ্যানালিটিক্স' : 'Central HQ • Sales & Analytics Control')}
                </span>
                <span class="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>${store.t('databaseSynced')}</span>
                </span>
              </div>
              <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ${isSR 
                  ? (isBN ? 'ফিল্ড সেলস রিপোর্ট' : 'Field Sales Reports') 
                  : (isBN ? 'বিএইচ এগ্রো লি. - কেন্দ্রীয় সেলস রিপোর্ট' : 'BH Agro Ltd. - Central Sales Report')}
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 mt-1">
                ${isSR 
                  ? (isBN ? `${currentSr?.territory || ''} টেরিটরির দৈনিক, গ্রাহকভিত্তিক ও পণ্যভিত্তিক বিক্রয় বিবরণী` : `Territory daily, customer-wise and product sales reports for ${currentSr?.territory || ''}`)
                  : (isBN ? 'সারাদেশের সকল এসআর, গ্রাহক ও পণ্যের লাইভ বিক্রয় বিশ্লেষণ' : 'Real-time sales performance across all SRs, customers, and medicines')}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="window.ReportActions.exportDaywise()" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition backdrop-blur-sm">
                <i data-lucide="download" class="w-3.5 h-3.5 text-tealbrand-300"></i>
                <span>${isBN ? 'দৈনিক এক্সেল (.xlsx)' : 'Day-wise (.xlsx)'}</span>
              </button>
              <button onclick="window.ReportActions.exportCustomerWise()" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>${isBN ? 'গ্রাহকভিত্তিক এক্সেল (.xlsx)' : 'Customer-wise (.xlsx)'}</span>
              </button>
            </div>
          </div>

          <!-- SR Target Progress Bar (When SR is viewing) -->
          ${isSR ? `
            <div class="mt-5 pt-4 border-t border-white/10">
              <div class="flex justify-between items-center text-xs font-bold mb-1.5">
                <span class="text-slate-200">${isBN ? 'মাসিক সেলস টার্গেট অগ্রগতি:' : 'Monthly Sales Target Progress:'}</span>
                <span class="text-amber-300 font-mono">৳${totalSalesAmount.toLocaleString()} / ৳${srTarget.toLocaleString()} (${srPct}%)</span>
              </div>
              <div class="w-full bg-black/40 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                <div class="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500" style="width: ${srPct}%"></div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Metrics Overview Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-brand-600 mb-2">
              <span class="text-[11px] font-bold uppercase text-slate-400">${store.t('totalRevenue')}</span>
              <div class="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60"><i data-lucide="banknote" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-brand-700 dark:text-brand-400">৳${totalSalesAmount.toLocaleString()}</div>
            <div class="text-[11px] text-slate-500 font-medium mt-1">
              ${isBN ? 'মোট বিক্রয় সম্পন্ন' : 'Gross sales volume'}
            </div>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-tealbrand-600 mb-2">
              <span class="text-[11px] font-bold uppercase text-slate-400">${store.t('totalOrdersCount')}</span>
              <div class="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60"><i data-lucide="clipboard-check" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              ${isBN ? `${orders.length} টি` : `${orders.length} orders`}
            </div>
            <div class="text-[11px] text-slate-500 font-medium mt-1">
              ${isBN ? 'নিশ্চিত অর্ডার স্লিপ' : 'Confirmed bookings'}
            </div>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-blue-600 mb-2">
              <span class="text-[11px] font-bold uppercase text-slate-400">${store.t('totalUnitsDelivered')}</span>
              <div class="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60"><i data-lucide="package" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              ${isBN ? `${totalUnitsSold.toLocaleString()} টি` : `${totalUnitsSold.toLocaleString()} units`}
            </div>
            <div class="text-[11px] text-slate-500 font-medium mt-1">
              ${isBN ? 'পণ্য সরবরাহ সম্পন্ন' : 'Items delivered'}
            </div>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between text-purple-600 mb-2">
              <span class="text-[11px] font-bold uppercase text-slate-400">${store.t('totalAssignedCustomers')}</span>
              <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60"><i data-lucide="users" class="w-4 h-4"></i></div>
            </div>
            <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              ${isBN ? `${customers.length} টি` : `${customers.length} clients`}
            </div>
            <div class="text-[11px] text-purple-600 font-bold mt-1">
              ${isSR ? (isBN ? 'আপনার অধীনস্থ গ্রাহক' : 'Assigned in your territory') : (isBN ? 'মোট নিবন্ধিত গ্রাহক' : 'Total active customers')}
            </div>
          </div>
        </div>

        <!-- Report Category Medium Dropdown (Above Search Option) -->
        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <i data-lucide="layers" class="w-5 h-5"></i>
            </div>
            <div>
              <label for="reportCategoryFilter" class="block font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                ${isBN ? 'রিপোর্ট ক্যাটাগরি নির্বাচন করুন' : 'Select Report Category'}
              </label>
              <p class="text-[11px] text-slate-400">
                ${isBN ? 'যে ক্যাটাগরি সিলেক্ট করবেন নিচে কেবল সেই রিপোর্টটি প্রদর্শিত হবে' : 'Choose a specific report view or show all reports combined'}
              </p>
            </div>
          </div>

          <div class="w-full sm:w-auto min-w-[260px]">
            <select 
              id="reportCategoryFilter" 
              onchange="window.ReportActions.filterCategory(this.value)" 
              class="w-full px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 shadow-sm transition"
            >
              <option value="all" selected>
                📊 ${isBN ? 'সকল রিপোর্ট (All Report)' : 'All Reports (Default)'}
              </option>
              <option value="daywise">
                📅 ${isBN ? 'দৈনিক বিক্রয় রিপোর্ট (Day-wise Report)' : 'Day-wise Sales Report'}
              </option>
              <option value="customer">
                👥 ${isBN ? 'গ্রাহকভিত্তিক রিপোর্ট (Customer-wise Report)' : 'Customer-wise Sales Report'}
              </option>
              <option value="product">
                📦 ${isBN ? 'পণ্যভিত্তিক রিপোর্ট (Product-wise Sales)' : 'Product-wise Sales Report'}
              </option>
              ${!isSR ? `
                <option value="sr">
                  🏆 ${isBN ? 'এসআর পারফরম্যান্স রিপোর্ট (SR-wise Report)' : 'SR-wise Performance Report'}
                </option>
              ` : `
                <option value="sr">
                  🎯 ${isBN ? 'আমার টার্গেট ও পারফরম্যান্স (My SR Target)' : 'My SR Target & Performance'}
                </option>
              `}
            </select>
          </div>
        </div>

        <!-- Real-time Report Search Input -->
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[260px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="reportSearchInput"
              placeholder="${store.t('filterReportsPlaceholder')}" 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearReportSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="text-xs font-semibold text-slate-500">
            ${isBN ? 'রিয়েল-টাইম ডাটাবেস ফিল্টারিং' : 'Real-time Database Live Search'}
          </div>
        </div>

        <!-- 1. DAY-WISE SALES REPORT -->
        <div data-report-section="daywise" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600">
                <i data-lucide="calendar" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white">
                  ${store.t('daywiseReportTitle')}
                </h3>
                <p class="text-[11px] text-slate-500">
                  ${store.t('daywiseReportSubtitle')}
                </p>
              </div>
            </div>
            <button onclick="window.ReportActions.exportDaywise()" class="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>${isBN ? 'দৈনিক এক্সেল (.xlsx)' : 'Export Day-wise (.xlsx)'}</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                  <th class="pb-2.5">${store.t('dateCol')}</th>
                  <th class="pb-2.5">${store.t('ordersCol')}</th>
                  <th class="pb-2.5">${store.t('unitsCol')}</th>
                  <th class="pb-2.5 text-right">${store.t('amountCol')}</th>
                </tr>
              </thead>
              <tbody id="dayReportTableBody" class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                ${daywiseList.length === 0 ? `
                  <tr><td colspan="4" class="py-8 text-center text-slate-400 text-xs">
                    ${isBN ? 'কোন দৈনিক বিক্রয় তথ্য নেই' : 'No daily sales records found'}
                  </td></tr>
                ` : daywiseList.map(d => `
                  <tr class="day-report-row hover:bg-slate-50/50 dark:hover:bg-slate-800/40" data-date="${d.date}">
                    <td class="py-3 font-mono font-bold text-brand-700 dark:text-brand-400">${d.date}</td>
                    <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">
                      ${isBN ? `${d.orderCount} টি অর্ডার` : `${d.orderCount} orders`}
                    </td>
                    <td class="py-3 text-slate-600 dark:text-slate-400">
                      ${isBN ? `${d.totalItems} টি ইউনিট` : `${d.totalItems} units`}
                    </td>
                    <td class="py-3 text-right font-black text-brand-700 dark:text-brand-400">৳${d.totalAmount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. CUSTOMER-WISE SALES REPORT -->
        <div data-report-section="customer" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                <i data-lucide="users" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white">
                  ${store.t('custwiseReportTitle')}
                </h3>
                <p class="text-[11px] text-slate-500">
                  ${store.t('custwiseReportSubtitle')}
                </p>
              </div>
            </div>
            <button onclick="window.ReportActions.exportCustomerWise()" class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>${isBN ? 'গ্রাহক এক্সেল (.xlsx)' : 'Export Customer (.xlsx)'}</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                  <th class="pb-2.5">${isBN ? 'আইডি' : 'Customer ID'}</th>
                  <th class="pb-2.5">${store.t('customerCol')}</th>
                  <th class="pb-2.5">${store.t('category')}</th>
                  <th class="pb-2.5">${store.t('territory')}</th>
                  <th class="pb-2.5">${store.t('ordersCol')}</th>
                  <th class="pb-2.5">${store.t('unitsCol')}</th>
                  <th class="pb-2.5">${store.t('amountCol')}</th>
                  <th class="pb-2.5 text-right">${store.t('dueBalanceCol')}</th>
                </tr>
              </thead>
              <tbody id="custReportTableBody" class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                ${custReportList.length === 0 ? `
                  <tr><td colspan="8" class="py-8 text-center text-slate-400 text-xs">
                    ${isBN ? 'কোন গ্রাহক বিক্রয় তথ্য পাওয়া যায়নি' : 'No customer sales records found'}
                  </td></tr>
                ` : custReportList.map(c => `
                  <tr 
                    class="cust-report-row hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    data-id="${c.id.toLowerCase()}"
                    data-name="${c.shopName.toLowerCase()} ${c.name.toLowerCase()}"
                    data-phone="${c.phone.toLowerCase()}"
                    data-territory="${c.territory.toLowerCase()}"
                  >
                    <td class="py-3 font-mono font-bold text-brand-700 dark:text-brand-400">${c.id}</td>
                    <td class="py-3">
                      <div class="font-bold text-slate-900 dark:text-white">${c.shopName}</div>
                      <div class="text-[10px] text-slate-400 font-normal">${c.name} • <span class="font-mono">${c.phone}</span></div>
                    </td>
                    <td class="py-3 uppercase text-[10px] font-bold text-slate-500">${store.t(c.category) || c.category}</td>
                    <td class="py-3 text-slate-600 dark:text-slate-300">${c.territory}</td>
                    <td class="py-3 font-bold text-slate-700 dark:text-slate-300">
                      ${isBN ? `${c.orderCount} টি` : `${c.orderCount} orders`}
                    </td>
                    <td class="py-3 text-slate-500">
                      ${isBN ? `${c.totalItems} টি` : `${c.totalItems} units`}
                    </td>
                    <td class="py-3 font-black text-blue-700 dark:text-blue-400">৳${c.totalAmount.toLocaleString()}</td>
                    <td class="py-3 text-right font-mono font-bold ${c.balance > 0 ? 'text-amber-600' : 'text-slate-400'}">
                      ৳${c.balance.toLocaleString()}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. PRODUCT-WISE SALES REPORT -->
        <div data-report-section="product" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
                <i data-lucide="pie-chart" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white">
                  ${store.t('prodwiseReportTitle')}
                </h3>
                <p class="text-[11px] text-slate-500">
                  ${store.t('prodwiseReportSubtitle')}
                </p>
              </div>
            </div>
            <button onclick="window.ReportActions.exportProductSales()" class="px-3.5 py-1.5 rounded-xl bg-tealbrand-600 hover:bg-tealbrand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>${isBN ? 'পণ্য বিক্রয় এক্সেল (.xlsx)' : 'Export Product Sales (.xlsx)'}</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                  <th class="pb-2.5">${store.t('productNameCol')}</th>
                  <th class="pb-2.5">${store.t('packSizeCol')}</th>
                  <th class="pb-2.5">${store.t('rateCol')}</th>
                  <th class="pb-2.5">${store.t('quantityCol')}</th>
                  <th class="pb-2.5 text-right">${store.t('revenueCol')}</th>
                </tr>
              </thead>
              <tbody id="prodReportTableBody" class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                ${prodSalesList.length === 0 ? `
                  <tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">
                    ${isBN ? 'কোন পণ্য বিক্রয় রেকর্ড নেই' : 'No product sales records found'}
                  </td></tr>
                ` : prodSalesList.map(p => `
                  <tr class="prod-report-row hover:bg-slate-50/50 dark:hover:bg-slate-800/40" data-name="${p.name.toLowerCase()}">
                    <td class="py-3 font-bold text-slate-900 dark:text-white">${p.name}</td>
                    <td class="py-3 text-slate-500">${p.packSize}</td>
                    <td class="py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">৳${p.unitPrice || 0}</td>
                    <td class="py-3 font-bold text-tealbrand-700 dark:text-tealbrand-400">
                      ${isBN ? `${p.totalQty} টি` : `${p.totalQty} units`}
                    </td>
                    <td class="py-3 text-right font-black text-slate-900 dark:text-white">৳${p.totalRevenue.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. ADMIN-ONLY REPORTS (SR Ranking & Inventory Valuation) -->
        <!-- 4. SR PERFORMANCE & INVENTORY REPORTS -->
        ${!isSR ? `
          <!-- SR-WISE SALES REPORT (Admin) -->
          <div data-report-section="sr" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600"><i data-lucide="trophy" class="w-4 h-4"></i></div>
                <div>
                  <h3 class="font-extrabold text-sm sm:text-base">${store.t('srWiseReport')}</h3>
                  <p class="text-[11px] text-slate-400">Territory performance and monthly sales target achievements</p>
                </div>
              </div>
              <button onclick="window.ReportActions.exportSRWise()" class="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>Export SR Report (.xlsx)</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                    <th class="pb-2">SR ID</th>
                    <th class="pb-2">SR Name</th>
                    <th class="pb-2">Territory</th>
                    <th class="pb-2">Monthly Target (৳)</th>
                    <th class="pb-2">Orders Placed</th>
                    <th class="pb-2">Units Sold</th>
                    <th class="pb-2">Achieved Sales (৳)</th>
                    <th class="pb-2 text-right">Target Progress</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  ${srReportList.map(sr => `
                    <tr class="sr-report-row hover:bg-slate-50/50" data-name="${sr.name.toLowerCase()}" data-id="${sr.id.toLowerCase()}">
                      <td class="py-3 font-mono font-bold text-brand-700 dark:text-brand-400">${sr.id}</td>
                      <td class="py-3 font-bold text-slate-900 dark:text-white">
                        ${sr.name}
                        <div class="text-[10px] text-slate-400 font-normal font-mono">${sr.phone}</div>
                      </td>
                      <td class="py-3 text-slate-600 dark:text-slate-300">${sr.territory}</td>
                      <td class="py-3 font-mono text-slate-500">৳${sr.target.toLocaleString()}</td>
                      <td class="py-3 font-bold text-slate-700 dark:text-slate-300">${sr.orderCount} orders</td>
                      <td class="py-3 text-slate-500">${sr.totalItems} units</td>
                      <td class="py-3 font-black text-brand-700 dark:text-brand-400">৳${sr.totalAmount.toLocaleString()}</td>
                      <td class="py-3 text-right">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sr.achievementPct >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          (sr.achievementPct >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300')
                        }">
                          ${sr.achievementPct}%
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- INVENTORY & STOCK VALUATION REPORT (Admin) -->
          <div data-report-section="product" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600"><i data-lucide="archive" class="w-4 h-4"></i></div>
                <h3 class="font-extrabold text-sm sm:text-base">${store.t('inventoryReport')}</h3>
              </div>
              <button onclick="window.ReportActions.exportStock()" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>${store.t('exportExcel')}</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                    <th class="pb-2">SKU</th>
                    <th class="pb-2">Product</th>
                    <th class="pb-2">Current Stock</th>
                    <th class="pb-2">Unit TP</th>
                    <th class="pb-2 text-right">Total TP Valuation (৳)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${store.db.products.map(p => `
                    <tr class="hover:bg-slate-50/50">
                      <td class="py-2 font-mono text-slate-400">${p.sku}</td>
                      <td class="py-2 font-bold">${p.name}</td>
                      <td class="py-2">
                        <span class="font-bold ${p.stock < 10 ? 'text-rose-600 font-black' : ''}">${p.stock}</span>
                      </td>
                      <td class="py-2">৳${p.tradePrice}</td>
                      <td class="py-2 text-right font-black">৳${(p.stock * p.tradePrice).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <!-- SR Target & Territory Performance Card (SR Site) -->
          <div data-report-section="sr" class="report-section-card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
                <i data-lucide="target" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white">
                  ${isBN ? 'আমার টার্গেট ও পারফরম্যান্স বিশ্লেষণ' : 'My Target & Sales Performance'}
                </h3>
                <p class="text-[11px] text-slate-500">
                  ${isBN ? `${currentSr?.territory || ''} টেরিটরির সেলস লক্ষ্য ও অর্জন` : `Monthly targets and achievement progress for ${currentSr?.territory || ''}`}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <div class="text-[11px] font-bold text-slate-400 uppercase">${store.t('target')}</div>
                <div class="text-xl font-black mt-1 text-slate-900 dark:text-white">৳${srTarget.toLocaleString()}</div>
              </div>
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <div class="text-[11px] font-bold text-amber-600 uppercase">${store.t('achievement')} (${srPct}%)</div>
                <div class="text-xl font-black mt-1 text-amber-600">৳${totalSalesAmount.toLocaleString()}</div>
              </div>
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <div class="text-[11px] font-bold text-brand-600 uppercase">${isBN ? 'অর্ডারের সংখ্যা' : 'Total Bookings'}</div>
                <div class="text-xl font-black mt-1 text-brand-700 dark:text-brand-300">${orders.length} টি</div>
              </div>
            </div>

            <div class="pt-2">
              <div class="flex justify-between text-xs font-bold mb-1">
                <span class="text-slate-600 dark:text-slate-400">${isBN ? 'টার্গেট পূরণ:' : 'Goal Completed:'}</span>
                <span class="text-brand-600 font-mono">${srPct}%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div class="bg-brand-600 h-full rounded-full transition-all duration-500" style="width: ${srPct}%"></div>
              </div>
            </div>
          </div>
        `}

      </div>
    `;
  }

  attachSearchListener() {
    const input = document.getElementById('reportSearchInput') as HTMLInputElement | null;
    const clearBtn = document.getElementById('clearReportSearchBtn');

    if (!input) return;

    const performFilter = (query: string) => {
      const q = query.trim().toLowerCase();

      // Filter Day-wise rows
      const dayRows = document.querySelectorAll<HTMLElement>('.day-report-row');
      dayRows.forEach(row => {
        const date = row.getAttribute('data-date') || '';
        row.style.display = (!q || date.includes(q)) ? '' : 'none';
      });

      // Filter Customer-wise rows
      const custRows = document.querySelectorAll<HTMLElement>('.cust-report-row');
      custRows.forEach(row => {
        const id = row.getAttribute('data-id') || '';
        const name = row.getAttribute('data-name') || '';
        const phone = row.getAttribute('data-phone') || '';
        const territory = row.getAttribute('data-territory') || '';

        const matches = !q || id.includes(q) || name.includes(q) || phone.includes(q) || territory.includes(q);
        row.style.display = matches ? '' : 'none';
      });

      // Filter Product-wise rows
      const prodRows = document.querySelectorAll<HTMLElement>('.prod-report-row');
      prodRows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = (!q || name.includes(q)) ? '' : 'none';
      });

      if (clearBtn) {
        if (q) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
    };

    input.addEventListener('input', (e) => {
      performFilter((e.target as HTMLInputElement).value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') input.blur();
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        performFilter('');
        input.focus();
      });
    }
  }

  exportSRWiseToExcel(showToast: (m: string) => void) {
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const orders = this.monthOrders();
    const rows = store.getReportSrList().map(sr => {
      const srOrders = orders.filter(o => o.srId === sr.id);
      const totalAmount = srOrders.reduce((acc, o) => acc + o.grandTotal, 0);
      const totalItems = srOrders.reduce((acc, o) => acc + o.items.reduce((s, it) => s + it.qty, 0), 0);
      const target = sr.target || 350000;
      const pct = Math.min(100, Math.round((totalAmount / target) * 100));

      return {
        'SR ID': sr.id,
        'SR Name': sr.name,
        'Territory': sr.territory,
        'Mobile': sr.phone,
        'Monthly Target (BDT)': target,
        'Total Orders Placed': srOrders.length,
        'Total Units Sold': totalItems,
        'Achieved Revenue (BDT)': totalAmount,
        'Target Achievement %': `${pct}%`
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SR_Wise_Sales");
    XLSX.writeFile(wb, `BH_Agro_SR_Wise_Sales_${this.selectedMonth}.xlsx`);
    showToast("SR-wise sales report exported to Excel!");
  }

  exportCustomerWiseToExcel(showToast: (m: string) => void) {
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const isSR = store.authSession.role !== 'admin';
    const currentSrId = store.authSession.user?.id || 'SR01';

    const orders = this.monthOrders();

    const customers = isSR
      ? store.db.customers.filter(c => (c.assignedSrId || c.createdBy) === currentSrId)
      : store.db.customers;

    const custMap: Record<string, any> = {};

    customers.forEach(c => {
      custMap[c.id] = {
        'Customer ID': c.id,
        'Shop / Farm Name': c.shopName,
        'Proprietor Name': c.name,
        'Category': c.category,
        'Territory': c.territory,
        'Mobile': c.phone,
        'Total Orders Placed': 0,
        'Total Units Purchased': 0,
        'Total Revenue (BDT)': 0,
        'Credit Limit': c.creditLimit || 0,
        'Current Balance': c.balance || 0
      };
    });

    orders.forEach(o => {
      if (custMap[o.customerId]) {
        custMap[o.customerId]['Total Orders Placed'] += 1;
        custMap[o.customerId]['Total Revenue (BDT)'] += o.grandTotal;
        custMap[o.customerId]['Total Units Purchased'] += o.items.reduce((s, it) => s + it.qty, 0);
      }
    });

    const ws = XLSX.utils.json_to_sheet(Object.values(custMap));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer_Wise_Sales");
    const filename = isSR 
      ? `BH_Agro_Customer_Wise_Sales_${currentSrId}_${this.selectedMonth}.xlsx`
      : `BH_Agro_Customer_Wise_Sales_${this.selectedMonth}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast("Customer-wise sales report exported to Excel!");
  }

  exportDaywiseToExcel(showToast: (m: string) => void) {
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const isSR = store.authSession.role !== 'admin';
    const currentSrId = store.authSession.user?.id || 'SR01';

    const orders = this.monthOrders();

    const rows = orders.map(o => ({
      'Order ID': o.id,
      'Date': o.date,
      'SR ID': o.srId,
      'SR Name': o.srName,
      'Customer ID': o.customerId,
      'Customer / Farm': o.customerShopName || o.customerName,
      'Full Address': o.customerAddress || o.territory,
      'Items Count': o.items.length,
      'Subtotal (TP)': o.subtotal,
      'Discount': o.discount,
      'Net Payable (BDT)': o.grandTotal,
      'Status': o.status
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daywise_Sales");
    const filename = isSR 
      ? `BH_Agro_Daywise_Sales_${currentSrId}_${this.selectedMonth}.xlsx`
      : `BH_Agro_Daywise_Sales_${this.selectedMonth}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast("Day-wise sales exported to Excel!");
  }

  exportProductSalesToExcel(showToast: (m: string) => void) {
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const isSR = store.authSession.role !== 'admin';
    const currentSrId = store.authSession.user?.id || 'SR01';

    const orders = this.monthOrders();

    const prodMap: Record<string, any> = {};
    orders.forEach(o => {
      o.items.forEach(it => {
        if (!prodMap[it.name]) {
          prodMap[it.name] = { 'Product Name': it.name, 'Pack Size': it.packSize, 'Unit TP': it.tp, 'Total Quantity Sold': 0, 'Total Revenue (BDT)': 0 };
        }
        prodMap[it.name]['Total Quantity Sold'] += it.qty;
        prodMap[it.name]['Total Revenue (BDT)'] += it.total;
      });
    });
    const ws = XLSX.utils.json_to_sheet(Object.values(prodMap));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product_Sales");
    const filename = isSR 
      ? `BH_Agro_Product_Sales_${currentSrId}_${this.selectedMonth}.xlsx`
      : `BH_Agro_Product_Sales_${this.selectedMonth}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast("Product sales exported to Excel!");
  }

  exportStockToExcel(showToast: (m: string) => void) {
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const rows = store.db.products.map(p => ({
      'SKU': p.sku,
      'Product Name': p.name,
      'Category': p.category,
      'Pack Size': p.packSize,
      'Trade Price (TP)': p.tradePrice,
      'MRP': p.mrp,
      'Stock On Hand': p.stock,
      'Total Valuation (BDT)': p.stock * p.tradePrice,
      'Status': p.stock <= 0 ? 'OUT OF STOCK' : (p.stock < 10 ? 'LOW STOCK ALERT (<10)' : 'Normal')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Valuation");
    XLSX.writeFile(wb, `BH_Agro_Inventory_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Stock report exported to Excel!");
  }
}

export const reportModule = new ReportModule();
