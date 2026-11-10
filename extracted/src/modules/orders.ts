/**
 * BH Agro Ltd. - Orders & Field Booking Module
 * Direct confirmed booking without Admin approval
 * Admin actions: Print Invoice & Delete Order
 */

import { priceLine, nextTierHint, getFreeTiers, formatTiers, unitsNeeded } from './pricing.ts';
import { store, Order, OrderItem } from './store.ts';

export class OrderModule {
  renderOrderBooking(onOrderPlaced: (id: string) => void): string {
    const isAdmin = store.authSession.role === 'admin';
    if (!isAdmin) return this.renderSrOrderBooking();
    const currentSrId = store.authSession.user?.id;
    const isBn = store.lang === 'bn';

    // RULE: For SR, only allow booking for customers assigned to this SR!
    const approvedCustomers = store.db.customers.filter(c => {
      if (c.status !== 'approved') return false;
      if (isAdmin) return true;
      return (c.assignedSrId || c.createdBy) === currentSrId;
    });

    // If currently selected cart customer is not in this SR's assigned list, auto-select their first customer
    if (approvedCustomers.length > 0 && !approvedCustomers.some(c => c.id === store.cart.customerId)) {
      store.cart.customerId = approvedCustomers[0].id;
    } else if (approvedCustomers.length === 0) {
      store.cart.customerId = '';
    }

    const categories = [
      { id: 'all', label: store.t('categoryAll') },
      { id: 'antibiotics', label: store.t('categoryAntibiotics') },
      { id: 'vaccines', label: store.t('categoryVaccines') },
      { id: 'supplements', label: store.t('categorySupplements') },
      { id: 'dewormers', label: store.t('categoryDewormers') },
    ];

    let filteredProducts = store.db.products.filter(p => {
      const matchCat = store.catalogCategory === 'all' || p.category === store.catalogCategory;
      const matchSearch = !store.catalogSearch || 
        p.name.toLowerCase().includes(store.catalogSearch.toLowerCase()) ||
        p.bnName.toLowerCase().includes(store.catalogSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(store.catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    const cartItemKeys = Object.keys(store.cart.items);
    let subtotal = 0;
    let totalFreeItems = 0;
    cartItemKeys.forEach(k => {
      const it = store.cart.items[k];
      subtotal += it.total;
      totalFreeItems += it.freeQty || 0;
    });
    const discount = Number(store.cart.discount) || 0;
    const grandTotal = Math.max(0, subtotal - discount);

    const selectedCust = approvedCustomers.find(c => c.id === store.cart.customerId);

    return `
      <div class="space-y-6">
        <!-- Title & Customer Picker in required format -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="shopping-cart" class="w-6 h-6 text-brand-600"></i>
              <span>${store.t('orderBooking')}</span>
            </h2>
            <p class="text-xs text-slate-500">
              ${!isAdmin ? (isBn ? `শুধুমাত্র আপনার জন্য নির্ধারিত গ্রাহকের অর্ডার বুকিং প্রযোজ্য (${store.authSession.user?.name})` : `Booking allowed only for customers assigned to you (${store.authSession.user?.name})`) : (isBn ? 'অর্ডার সাবমিট করলে সরাসরি নিশ্চিত হবে (অ্যাডমিন অনুমোদনের প্রয়োজন নেই)।' : 'Orders are instantly confirmed upon submission (No Admin approval needed).')}
            </p>
          </div>

          <!-- Customer Dropdown with BH0002 Amin Feed format -->
          <div class="w-full sm:w-auto min-w-[320px]">
            ${approvedCustomers.length === 0 ? `
              <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200">
                ${isBn ? 'আপনার অধীনে এখনও কোনো অনুমোদিত গ্রাহক নেই।' : 'No approved customers assigned to your SR account yet.'}
              </div>
            ` : `
              <select id="bookingCustomerSelect" onchange="window.OrderActions.setCustomer(this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-brand-500">
                <option value="">-- ${store.t('selectCustomer')} --</option>
                ${approvedCustomers.map(c => `
                  <option value="${c.id}" ${store.cart.customerId === c.id ? 'selected' : ''}>
                    ${c.id} ${c.shopName} (${c.address})
                  </option>
                `).join('')}
              </select>
            `}
          </div>
        </div>

        ${selectedCust ? `
          <div class="p-3.5 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-mono font-black text-brand-800 dark:text-brand-300 text-sm">${selectedCust.id}</span>
              <span class="font-extrabold text-slate-900 dark:text-white text-sm">${selectedCust.shopName}</span>
              <span class="text-slate-500">• ${selectedCust.address}</span>
            </div>
            <div class="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-semibold">
              <span>${isBn ? 'মোবাইল:' : 'Phone:'} <b class="font-mono">${selectedCust.phone}</b></span>
              <span>${store.t('creditLimit')}: <b>৳${(selectedCust.creditLimit || 0).toLocaleString()}</b></span>
            </div>
          </div>
        ` : ''}

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Catalog (8 Cols) -->
          <div class="lg:col-span-8 space-y-4">
            <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div class="flex items-center gap-2 overflow-x-auto pb-1">
                ${categories.map(cat => `
                  <button onclick="window.OrderActions.setCategory('${cat.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    store.catalogCategory === cat.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }">
                    ${cat.label}
                  </button>
                `).join('')}
              </div>

              <div class="relative">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                <input type="text" id="orderSearchInput" autocomplete="off" value="${store.catalogSearch}" oninput="window.OrderActions.setSearch(this.value)" placeholder="${store.t('searchPlaceholder')}" class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" />
              </div>
            </div>

            <!-- Product Grid with quantity controls -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${filteredProducts.map(p => {
                const cartItem = store.cart.items[p.id];
                const qtyInCart = cartItem ? cartItem.qty : 0;
                const isOutOfStock = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock < 10;
                return `
                  <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border ${qtyInCart > 0 ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col justify-between transition-all">
                    <div>
                      <div class="flex items-start justify-between gap-2 mb-2">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          p.category === 'antibiotics' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          (p.category === 'vaccines' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          (p.category === 'supplements' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'))
                        }">
                          ${store.t(p.category) || p.category}
                        </span>
                        <span class="text-[10px] font-bold ${
                          p.stock <= 0 ? 'text-rose-600' :
                          (p.stock < 10 ? 'text-amber-600 font-extrabold animate-pulse' : 'text-slate-500')
                        }">
                          ${isOutOfStock ? (isBn ? 'স্টক শেষ' : 'Out of Stock') : (isLow ? (isBn ? `স্বল্প: ${p.stock}` : `Low: ${p.stock}`) : (isBn ? `মজুদ: ${p.stock}` : `Stock: ${p.stock}`))}
                        </span>
                      </div>

                      <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">${isBn ? (p.bnName || p.name) : p.name}</h4>
                      <p class="text-xs text-slate-500 mt-0.5">${p.packSize} • <span class="font-mono text-[11px]">${p.sku}</span></p>

                      ${p.tradeOffer ? `
                        <div class="mt-2 text-[11px] font-bold text-tealbrand-700 dark:text-tealbrand-400 flex items-center gap-1">
                          <i data-lucide="tag" class="w-3 h-3"></i>
                          <span>${p.tradeOffer}</span>
                        </div>
                      ` : ''}

                      <div class="mt-3 flex items-baseline gap-2">
                        <span class="text-base font-black text-brand-700 dark:text-brand-400">৳${p.tradePrice}</span>
                        <span class="text-xs text-slate-400 line-through">MRP ৳${p.mrp}</span>
                        <span class="text-[10px] text-slate-400">/ ${isBn ? 'টিপি' : 'TP'}</span>
                      </div>
                    </div>

                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      ${isOutOfStock ? `
                        <div class="text-center py-1.5 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 rounded-xl">${isBn ? 'স্টক শেষ' : 'Out of Stock'}</div>
                      ` : (qtyInCart === 0 ? `
                        <button onclick="window.OrderActions.updateQty('${p.id}', 1)" class="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
                          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                          <span>${store.t('bookProduct')}</span>
                        </button>
                      ` : `
                        <div class="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                          <button onclick="window.OrderActions.updateQty('${p.id}', ${qtyInCart - 1})" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center font-bold hover:bg-rose-50 hover:text-rose-600 transition">
                            <i data-lucide="${qtyInCart === 1 ? 'trash-2' : 'minus'}" class="w-3.5 h-3.5"></i>
                          </button>
                          <span class="text-xs font-black px-2">${qtyInCart}</span>
                          <button onclick="window.OrderActions.updateQty('${p.id}', ${qtyInCart + 1})" class="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold hover:bg-brand-500 transition">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      `)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Sticky Cart (4 Cols) -->
          <div class="lg:col-span-4">
            <div class="sticky top-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-5 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-2">
                  <i data-lucide="receipt" class="w-5 h-5 text-brand-600"></i>
                  <h3 class="font-extrabold text-sm sm:text-base">${store.t('cartTitle')}</h3>
                </div>
                ${cartItemKeys.length > 0 ? `
                  <button onclick="window.OrderActions.clearCart()" class="text-xs text-rose-500 hover:underline">${isBn ? 'খালি করুন' : 'Clear'}</button>
                ` : ''}
              </div>

              ${cartItemKeys.length === 0 ? `
                <div class="text-center py-10 text-slate-400">
                  <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 opacity-30"></i>
                  <p class="text-xs font-medium">${store.t('emptyCart')}</p>
                </div>
              ` : `
                <div class="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  ${cartItemKeys.map(k => {
                    const it = store.cart.items[k];
                    return `
                      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div class="flex justify-between font-bold text-slate-800 dark:text-slate-100">
                          <span class="truncate max-w-[170px]">${isBn ? (it.product.bnName || it.product.name) : it.product.name}</span>
                          <span>৳${it.total.toLocaleString()}</span>
                        </div>
                        <div class="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span>${it.qty} × ৳${it.product.tradePrice}</span>
                          ${it.freeQty > 0 ? `<span class="text-tealbrand-600 font-bold">${isBn ? `+${it.freeQty} টি ফ্রি` : `+${it.freeQty} Free`}</span>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-1">${store.t('discount')}</label>
                    <input type="number" id="orderDiscountInput" min="0" value="${store.cart.discount}" oninput="window.OrderActions.setDiscount(this.value)" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" placeholder="0" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-1">${isBn ? 'মন্তব্য বা ডেলিভারি নোট' : 'Remarks / Delivery Note'}</label>
                    <input type="text" id="orderNotesInput" value="${store.cart.notes || ''}" oninput="window.OrderActions.setNotes(this.value)" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" placeholder="${isBn ? 'যেমন: সকালের মধ্যে ডেলিভারি দিন' : 'e.g. Urgent morning delivery'}" />
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <div class="flex justify-between text-slate-500">
                    <span>${store.t('subtotal')}</span>
                    <span>৳${subtotal.toLocaleString()}</span>
                  </div>
                  ${totalFreeItems > 0 ? `
                    <div class="flex justify-between text-tealbrand-600 font-bold">
                      <span>${store.t('freeQty')}</span>
                      <span>${totalFreeItems} ${isBn ? 'টি ফ্রি' : 'units free'}</span>
                    </div>
                  ` : ''}
                  ${discount > 0 ? `
                    <div class="flex justify-between text-rose-500 font-bold">
                      <span>${store.t('discount')}</span>
                      <span>-৳${discount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between text-slate-500">
                    <span>${store.t('vat')}</span>
                    <span>${isBn ? '৳০ (ভ্যাটমুক্ত)' : '৳0 (Exempt)'}</span>
                  </div>
                  <div class="flex justify-between text-sm sm:text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>${store.t('grandTotal')}</span>
                    <span class="text-brand-600">৳${grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <!-- Instant Direct Confirmation -->
                <button onclick="window.OrderActions.submitOrder()" class="w-full py-3 bg-gradient-to-r from-brand-600 to-tealbrand-600 hover:from-brand-500 hover:to-tealbrand-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-brand-500/25 active:scale-95 transition flex items-center justify-center gap-2">
                  <i data-lucide="check-circle" class="w-4 h-4"></i>
                  <span>${store.t('submitOrder')}</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }


  // ================= SR layout: Order Slip on top, product list below =================
  getSrCustomers() {
    const currentSrId = store.authSession.user?.id;
    const list = store.db.customers.filter(c => c.status === 'approved' && (c.assignedSrId || c.createdBy) === currentSrId);
    if (list.length > 0 && !list.some(c => c.id === store.cart.customerId)) {
      store.cart.customerId = list[0].id;
    } else if (list.length === 0) {
      store.cart.customerId = '';
    }
    return list;
  }

  getFilteredProducts() {
    const q = (store.catalogSearch || '').toLowerCase();
    return store.db.products.filter(p => {
      const matchCat = store.catalogCategory === 'all' || p.category === store.catalogCategory;
      const matchSearch = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.bnName || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }

  /** টাকার সংখ্যা: পূর্ণ হলে ১,২৩৪; দশমিক থাকলে সর্বোচ্চ ২ ঘর */
  money(n: number): string {
    return (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  renderCatalogRows(): string {
    const isBn = store.lang === 'bn';
    const products = this.getFilteredProducts();
    if (products.length === 0) {
      return `<div class="text-center py-10 text-xs text-slate-400">${isBn ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'No products found'}</div>`;
    }
    return products.map(p => {
      const cartItem = store.cart.items[p.id];
      const qty = cartItem ? cartItem.qty : 0;
      const isOut = p.stock <= 0;
      const isLow = p.stock > 0 && p.stock < 10;
      const line = priceLine(p, 1);
      const tiers = getFreeTiers(p);
      const canInc = store.canOrderQty(p, qty + 1);
      return `
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border ${qty > 0 ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200 dark:border-slate-800'} shadow-sm">
          <div class="min-w-0 flex-1">
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">${isBn ? (p.bnName || p.name) : p.name}</h4>
            <p class="text-xs text-slate-500 mt-0.5">${p.packSize} • <span class="font-mono">${p.sku}</span></p>
            <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span class="text-sm font-black text-brand-700 dark:text-brand-400">৳${this.money(line.adp)}</span>
              ${line.discountPct > 0 ? `
                <span class="text-slate-400 line-through">৳${this.money(p.tradePrice)}</span>
                <span class="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold">-${line.discountPct}%</span>
              ` : ''}
              <span class="text-slate-400">MRP ৳${this.money(p.mrp)}</span>
              <span class="font-bold ${isOut ? 'text-rose-600' : (isLow ? 'text-amber-600' : 'text-slate-500')}">
                ${isOut ? (isBn ? 'স্টক শেষ' : 'Out of Stock') : (isLow ? (isBn ? `স্বল্প: ${p.stock}` : `Low: ${p.stock}`) : (isBn ? `মজুদ: ${p.stock}` : `Stock: ${p.stock}`))}
              </span>
            </div>
            ${tiers.length ? `
              <div class="mt-1 inline-block px-2 py-0.5 rounded-lg bg-tealbrand-50 dark:bg-tealbrand-950/40 text-tealbrand-700 dark:text-tealbrand-400 text-[11px] font-bold">
                ${isBn ? 'ফ্রি অফার' : 'Free offer'}: ${formatTiers(tiers)}
              </div>
            ` : ''}
          </div>
          <div class="shrink-0">
            ${isOut ? '' : (qty === 0 ? `
              <button onclick="window.OrderActions.updateQty('${p.id}', 1)" class="px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>${store.t('bookProduct')}</span>
              </button>
            ` : `
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button onclick="window.OrderActions.updateQty('${p.id}', ${qty - 1})" class="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center">
                  <i data-lucide="${qty === 1 ? 'trash-2' : 'minus'}" class="w-3.5 h-3.5"></i>
                </button>
                <span class="text-xs font-black min-w-[24px] text-center">${qty}</span>
                <button onclick="window.OrderActions.updateQty('${p.id}', ${qty + 1})" class="w-9 h-9 rounded-lg ${canInc ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} flex items-center justify-center">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              ${canInc ? '' : `<div class="text-[10px] text-amber-600 font-bold text-center mt-0.5">${isBn ? 'স্টক সীমা' : 'Stock limit'}</div>`}
            `)}
          </div>
        </div>
      `;
    }).join('');
  }

  renderSlipItems(): string {
    const isBn = store.lang === 'bn';
    const keys = Object.keys(store.cart.items);
    if (keys.length === 0) {
      return `
        <div class="text-center py-5 text-slate-400">
          <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto mb-1 opacity-30"></i>
          <p class="text-xs font-medium">${store.t('emptyCart')}</p>
        </div>
      `;
    }
    return `
      <div class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        ${keys.map(k => {
          const it = store.cart.items[k];
          const p = it.product;
          const hint = nextTierHint(p, it.qty);
          const showHint = hint && store.canOrderQty(p, it.qty + hint.more);
          const canInc = store.canOrderQty(p, it.qty + 1);
          return `
            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
              <div class="flex items-center gap-2">
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-slate-800 dark:text-slate-100 truncate">${isBn ? (p.bnName || p.name) : p.name}</div>
                  <div class="text-xs text-slate-500">
                    ${it.qty} × ৳${this.money(it.adp)}
                    ${it.discountPct > 0 ? `<span class="text-slate-400 line-through">৳${this.money(p.tradePrice)}</span> <span class="text-rose-500 font-bold">-${it.discountPct}%</span>` : ''}
                    ${it.freeQty > 0 ? `<span class="text-tealbrand-600 font-bold"> +${it.freeQty} ${isBn ? 'ফ্রি' : 'Free'}</span>` : ''}
                  </div>
                </div>
                <div class="font-black text-slate-800 dark:text-slate-100">৳${it.total.toLocaleString()}</div>
                <div class="flex items-center gap-1">
                  <button onclick="window.OrderActions.updateQty('${p.id}', ${it.qty - 1})" class="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                    <i data-lucide="${it.qty === 1 ? 'trash-2' : 'minus'}" class="w-3 h-3"></i>
                  </button>
                  <button onclick="window.OrderActions.updateQty('${p.id}', ${it.qty + 1})" class="w-8 h-8 rounded-lg ${canInc ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} flex items-center justify-center">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>
              ${showHint ? `<div class="mt-1 text-[11px] font-bold text-amber-600">${isBn ? `আর ${hint!.more}টি নিলে ${hint!.free}টি ফ্রি` : `Add ${hint!.more} more to get ${hint!.free} free`}</div>` : ''}
              ${!canInc ? `<div class="mt-1 text-[11px] font-bold text-amber-600">${isBn ? `স্টকের কারণে আর বাড়ানো যাবে না (আছে ${p.stock}টি)` : `Stock limit reached (${p.stock} in stock)`}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderSlipTotals(): string {
    const isBn = store.lang === 'bn';
    const t = this.getCartTotals();
    if (t.count === 0) return '';
    return `
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
        ${t.productDiscount > 0 ? `
          <div class="flex justify-between text-slate-500">
            <span>${isBn ? 'TP অনুযায়ী মোট' : 'Total at TP'}</span>
            <span>৳${t.tpSubtotal.toLocaleString()}</span>
          </div>
          <div class="flex justify-between text-rose-500 font-bold">
            <span>${isBn ? 'প্রোডাক্ট ছাড়' : 'Product discount'}</span>
            <span>-৳${t.productDiscount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-slate-600 dark:text-slate-300 font-bold">
          <span>${store.t('subtotal')}${t.productDiscount > 0 ? ' (ADP)' : ''}</span>
          <span>৳${t.subtotal.toLocaleString()}</span>
        </div>
        ${t.free > 0 ? `
          <div class="flex justify-between text-tealbrand-600 font-bold">
            <span>${store.t('freeQty')}</span>
            <span>${t.free} ${isBn ? 'টি ফ্রি' : 'units free'}</span>
          </div>
        ` : ''}
        ${t.discount > 0 ? `
          <div class="flex justify-between text-rose-500 font-bold">
            <span>${isBn ? 'স্পেশাল ডিসকাউন্ট' : 'Special discount'}</span>
            <span>-৳${t.discount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-slate-500">
          <span>${store.t('vat')}</span>
          <span>${isBn ? '৳০ (অব্যাহতি)' : '৳0 (Exempt)'}</span>
        </div>
        <div class="flex justify-between text-sm sm:text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
          <span>${store.t('grandTotal')}</span>
          <span class="text-brand-600">৳${t.grand.toLocaleString()}</span>
        </div>
      </div>
      <button onclick="window.OrderActions.submitOrder()" class="w-full py-3 bg-gradient-to-r from-brand-600 to-tealbrand-600 hover:from-brand-500 hover:to-tealbrand-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
        <span>${store.t('submitOrder')}</span>
      </button>
    `;
  }

  renderSrOrderBooking(): string {
    const isBn = store.lang === 'bn';
    const customers = this.getSrCustomers();
    const selected = customers.find(c => c.id === store.cart.customerId);
    const hasItems = Object.keys(store.cart.items).length > 0;
    const categories = [
      { id: 'all', label: store.t('categoryAll') },
      { id: 'antibiotics', label: store.t('categoryAntibiotics') },
      { id: 'vaccines', label: store.t('categoryVaccines') },
      { id: 'supplements', label: store.t('categorySupplements') },
      { id: 'dewormers', label: store.t('categoryDewormers') },
    ];

    return `
      <div class="space-y-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="shopping-cart" class="w-6 h-6 text-brand-600"></i>
            <span>${store.t('orderBooking')}</span>
          </h2>
          <p class="text-xs text-slate-500">
            ${isBn ? `শুধু আপনার অ্যাসাইন করা কাস্টমারদের জন্য অর্ডার বুক করা যাবে (${store.authSession.user?.name})` : `Booking allowed only for customers assigned to you (${store.authSession.user?.name})`}
          </p>
        </div>

        ${customers.length === 0 ? `
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200">
            ${isBn ? 'এখনো কোনো অনুমোদিত কাস্টমার আপনার অ্যাসাইন করা নেই' : 'No approved customers assigned to your SR account yet.'}
          </div>
        ` : `
          <div class="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          <div class="lg:col-span-5 xl:col-span-4 lg:order-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-3xl">
          <!-- ORDER SLIP (top on mobile, right column on desktop) -->
          <div id="orderSlip" class="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-4 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <i data-lucide="receipt" class="w-5 h-5 text-brand-600"></i>
                <h3 class="font-extrabold text-sm sm:text-base">${store.t('cartTitle')}</h3>
              </div>
              <button id="orderSlipClear" onclick="window.OrderActions.clearCart()" class="${hasItems ? '' : 'hidden'} text-xs text-rose-500 hover:underline">${isBn ? 'মুছুন' : 'Clear'}</button>
            </div>

            <!-- Customer inside slip: tap to change -->
            <label class="relative block">
              <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60">
                <div class="min-w-0">
                  <div class="text-[10px] font-bold uppercase text-brand-700 dark:text-brand-300">${isBn ? 'কাস্টমার (বদলাতে ট্যাপ করুন)' : 'Customer (tap to change)'}</div>
                  <div class="font-black text-sm text-slate-900 dark:text-white truncate">
                    ${selected ? `<span class="font-mono text-brand-800 dark:text-brand-300">${selected.id}</span> ${selected.shopName}` : `-- ${store.t('selectCustomer')} --`}
                  </div>
                  ${selected ? `
                    <div class="text-[11px] text-slate-500 truncate">
                      ${selected.address} • ${selected.phone} • ${store.t('creditLimit')}: ৳${(selected.creditLimit || 0).toLocaleString()}
                    </div>
                  ` : ''}
                </div>
                <i data-lucide="chevrons-up-down" class="w-5 h-5 text-brand-600 shrink-0"></i>
              </div>
              <select id="bookingCustomerSelect" onchange="window.OrderActions.setCustomer(this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base">
                <option value="">-- ${store.t('selectCustomer')} --</option>
                ${customers.map(c => `
                  <option value="${c.id}" ${store.cart.customerId === c.id ? 'selected' : ''}>${c.id} ${c.shopName} (${c.address})</option>
                `).join('')}
              </select>
            </label>

            <div id="orderSlipItems">${this.renderSlipItems()}</div>

            <div id="orderSlipInputs" class="${hasItems ? '' : 'hidden'} space-y-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">${store.t('discount')}</label>
                <input type="number" inputmode="numeric" min="0" id="orderDiscountInput" value="${store.cart.discount || ''}" placeholder="0" oninput="window.OrderActions.setDiscount(this.value)" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">${isBn ? 'মন্তব্য / ডেলিভারি নোট' : 'Remarks / Delivery Note'}</label>
                <input type="text" id="orderNotesInput" value="${store.cart.notes || ''}" oninput="window.OrderActions.setNotes(this.value)" class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>

            <div id="orderSlipTotals" class="space-y-3">${this.renderSlipTotals()}</div>
          </div>

          </div>
          <div class="lg:col-span-7 xl:col-span-8 lg:order-1 space-y-4">
          <!-- PRODUCT LIST (below on mobile, left column on desktop) -->
          <div class="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              ${categories.map(cat => `
                <button onclick="window.OrderActions.setCategory('${cat.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  store.catalogCategory === cat.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }">${cat.label}</button>
              `).join('')}
            </div>
            <div class="relative">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
              <input type="text" id="orderSearchInput" autocomplete="off" value="${store.catalogSearch}" oninput="window.OrderActions.setSearch(this.value)" placeholder="${store.t('searchPlaceholder')}" class="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div id="orderCatalogList" class="flex flex-col gap-2">${this.renderCatalogRows()}</div>
          <div class="h-20 lg:hidden"></div>
          </div>
          </div>

          <!-- Floating order bar (mobile): slip দেখা না গেলে নিচে মোট হিসাব -->
          <div id="orderFloatBar" class="${hasItems ? '' : 'hidden'} lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pointer-events-none" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));">
            <button onclick="window.OrderActions.scrollToSlip()" class="pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-tealbrand-600 text-white shadow-xl active:scale-[0.99] transition">
              <span id="orderFloatCount" class="text-xs font-bold">${this.floatCountText()}</span>
              <span id="orderFloatTotal" class="text-base font-black">৳${this.getCartTotals().grand.toLocaleString()}</span>
              <span class="text-xs font-bold">${isBn ? 'স্লিপ দেখুন ↑' : 'View slip ↑'}</span>
            </button>
          </div>
        `}
      </div>
    `;
  }


  // ---- cart totals & floating bar ----
  getCartTotals() {
    const keys = Object.keys(store.cart.items);
    let subtotal = 0;
    let tpSubtotal = 0;
    let free = 0;
    keys.forEach(k => {
      const it = store.cart.items[k];
      subtotal += it.total;
      tpSubtotal += it.qty * it.product.tradePrice;
      free += it.freeQty || 0;
    });
    const discount = Number(store.cart.discount) || 0;
    return {
      count: keys.length, subtotal, tpSubtotal, productDiscount: Math.max(0, tpSubtotal - subtotal),
      free, discount, grand: Math.max(0, subtotal - discount)
    };
  }

  floatCountText(): string {
    const n = this.getCartTotals().count;
    return store.lang === 'bn' ? `${n}টি আইটেম` : `${n} item${n === 1 ? '' : 's'}`;
  }

  private slipInView = true;
  private floatObserver: IntersectionObserver | null = null;
  isSubmitting = false;

  updateFloatBar() {
    const bar = document.getElementById('orderFloatBar');
    if (!bar) return;
    const t = this.getCartTotals();
    const countEl = document.getElementById('orderFloatCount');
    const totalEl = document.getElementById('orderFloatTotal');
    if (countEl) countEl.textContent = this.floatCountText();
    if (totalEl) totalEl.textContent = `৳${t.grand.toLocaleString()}`;
    bar.classList.toggle('hidden', !(t.count > 0 && !this.slipInView));
  }

  /** পেজ আঁকার পর: স্লিপ স্ক্রিনে আছে কিনা দেখে ভাসমান বার দেখায়/লুকায় */
  attachOrderUi() {
    if (this.floatObserver) { this.floatObserver.disconnect(); this.floatObserver = null; }
    const slip = document.getElementById('orderSlip');
    if (!slip) return;
    if (typeof IntersectionObserver === 'undefined') {
      this.slipInView = false;
      this.updateFloatBar();
      return;
    }
    this.slipInView = true;
    this.floatObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { this.slipInView = e.isIntersecting; });
      this.updateFloatBar();
    }, { threshold: [0, 0.05] });
    this.floatObserver.observe(slip);
  }

  scrollToSlip() {
    const slip = document.getElementById('orderSlip');
    if (slip && typeof slip.scrollIntoView === 'function') slip.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- partial refresh helpers: input box কখনো নতুন করে আঁকা হয় না, তাই কীবোর্ড বন্ধ হয় না ----
  private refreshIcons() {
    (window as any).App?.refreshIcons?.();
  }

  /** শুধু প্রোডাক্ট লিস্ট আপডেট (সার্চ করার সময়) */
  refreshCatalogOnly(): boolean {
    const list = document.getElementById('orderCatalogList');
    if (!list) return false;
    list.innerHTML = this.renderCatalogRows();
    this.refreshIcons();
    return true;
  }

  /** শুধু মোট হিসাব আপডেট (ডিসকাউন্ট লেখার সময়) */
  refreshTotalsOnly(): boolean {
    const totals = document.getElementById('orderSlipTotals');
    if (!totals) return false;
    totals.innerHTML = this.renderSlipTotals();
    this.updateFloatBar();
    this.refreshIcons();
    return true;
  }

  /** অর্ডার স্লিপ + প্রোডাক্ট লিস্ট আপডেট (পরিমাণ বদলালে); ইনপুট বক্স অক্ষত থাকে */
  refreshOrderPartial(): boolean {
    const items = document.getElementById('orderSlipItems');
    const totals = document.getElementById('orderSlipTotals');
    const list = document.getElementById('orderCatalogList');
    if (!items || !totals || !list) return false;
    const has = Object.keys(store.cart.items).length > 0;
    items.innerHTML = this.renderSlipItems();
    totals.innerHTML = this.renderSlipTotals();
    list.innerHTML = this.renderCatalogRows();
    document.getElementById('orderSlipInputs')?.classList.toggle('hidden', !has);
    document.getElementById('orderSlipClear')?.classList.toggle('hidden', !has);
    if (!has) {
      const d = document.getElementById('orderDiscountInput') as HTMLInputElement | null;
      const n = document.getElementById('orderNotesInput') as HTMLInputElement | null;
      if (d) d.value = store.cart.discount ? String(store.cart.discount) : '';
      if (n) n.value = store.cart.notes || '';
    }
    this.updateFloatBar();
    this.refreshIcons();
    return true;
  }

  submitOrder(onOrderPlaced: (id: string) => void, showToast: (msg: string, type?: string) => void) {
    if (this.isSubmitting) return; // ডাবল-ট্যাপে একই অর্ডার দুইবার যাবে না
    this.isSubmitting = true;
    try {
      this.submitOrderInner(onOrderPlaced, showToast);
    } finally {
      this.isSubmitting = false;
    }
  }

  private submitOrderInner(onOrderPlaced: (id: string) => void, showToast: (msg: string, type?: string) => void) {
    const isBn = store.lang === 'bn';
    if (!store.cart.customerId) {
      showToast(isBn ? 'অনুগ্রহ করে প্রথমে একজন গ্রাহক নির্বাচন করুন!' : 'Please select a customer first!', 'error');
      return;
    }
    const itemKeys = Object.keys(store.cart.items);
    if (itemKeys.length === 0) {
      showToast(isBn ? 'কমপক্ষে একটি ওষুধ অর্ডার স্লিপে যোগ করুন!' : 'Add at least one medicine to the order slip!', 'error');
      return;
    }

    const customer = store.db.customers.find(c => c.id === store.cart.customerId);
    if (!customer) return;

    const isAdmin = store.authSession.role === 'admin';
    const currentSrId = store.authSession.user?.id;
    if (!isAdmin && (customer.assignedSrId || customer.createdBy) !== currentSrId) {
      showToast(isBn ? 'নিরাপত্তা ত্রুটি: শুধুমাত্র আপনার নির্ধারিত গ্রাহকের জন্য অর্ডার বুকিং প্রযোজ্য!' : 'Security Error: You are only permitted to book orders for customers assigned to you!', 'error');
      return;
    }

    // সর্বশেষ প্রোডাক্ট তথ্য (দাম, ছাড়, ফ্রি-ধাপ, স্টক) দিয়ে আবার হিসাব ও স্টক যাচাই
    let subtotal = 0;
    let tpSubtotal = 0;
    const items: OrderItem[] = [];
    for (const k of itemKeys) {
      const it = store.cart.items[k];
      const prod = store.db.products.find(p => p.id === it.product.id) || it.product;
      if (!store.canOrderQty(prod, it.qty)) {
        showToast(isBn
          ? `${prod.bnName || prod.name}: স্টকে কুলাচ্ছে না (ফ্রিসহ ${unitsNeeded(prod, it.qty)}টি লাগবে, আছে ${prod.stock}টি)। পরিমাণ কমান।`
          : `${prod.name}: not enough stock (${unitsNeeded(prod, it.qty)} needed incl. free, ${prod.stock} available). Reduce quantity.`, 'error');
        return;
      }
      const line = priceLine(prod, it.qty);
      subtotal += line.total;
      tpSubtotal += line.tpTotal;
      items.push({
        productId: prod.id,
        name: prod.name,
        packSize: prod.packSize,
        qty: it.qty,
        freeQty: line.freeQty,
        tp: prod.tradePrice,
        discountPct: line.discountPct,
        adp: line.adp,
        total: line.total
      });
    }

    const discount = Number(store.cart.discount) || 0;
    const grandTotal = Math.max(0, subtotal - discount);

    // অর্ডার আইডি: মাস + এসআর আইডি + ক্রমিক নম্বর (একাধিক এসআর বা অফলাইন অবস্থায়ও আইডি মেলে না)
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const idTag = store.authSession.user?.id || 'ADM';
    let seq = store.db.orders.filter(o => o.id.startsWith(`BHA-ORD-${ym}-${idTag}-`)).length + 1;
    let newOrderId = '';
    do {
      newOrderId = `BHA-ORD-${ym}-${idTag}-${String(seq).padStart(3, '0')}`;
      seq++;
    } while (store.db.orders.some(o => o.id === newOrderId));

    const newOrder: Order = {
      id: newOrderId,
      date: new Date().toISOString().split('T')[0],
      srId: store.authSession.user?.id || 'SR',
      srName: store.authSession.user?.name || 'Sales Rep',
      customerId: customer.id,
      customerShopName: customer.shopName,
      customerName: customer.name,
      customerAddress: customer.address,
      territory: customer.territory,
      items: items,
      subtotal: subtotal,
      tpSubtotal: tpSubtotal,
      productDiscount: Math.max(0, tpSubtotal - subtotal),
      discount: discount,
      grandTotal: grandTotal,
      status: 'confirmed', // Direct confirmation without admin approval!
      paymentStatus: 'Credit Account',
      notes: store.cart.notes || ''
    };

    // Deduct stock
    items.forEach(it => {
      const prod = store.db.products.find(p => p.id === it.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.qty - (it.freeQty || 0)); // কেনা + ফ্রি, দুটোই স্টক থেকে
      }
    });

    store.db.orders.unshift(newOrder);
    store.saveDatabase();

    store.cart.items = {};
    store.cart.discount = 0;
    store.cart.notes = '';
    store.persistCart();

    // নেট না থাকলে স্পষ্ট বলা: অর্ডার ফোনে সেভ আছে, নেট এলে নিজে থেকে জমা হবে
    const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || store.cloudConnected === false;
    showToast(offline
      ? (isBn ? `অর্ডার ${newOrderId} ফোনে সেভ হয়েছে, নেট এলে নিজে থেকে জমা হবে` : `Order ${newOrderId} saved on this device and will sync when you are online`)
      : (isBn ? `অর্ডার ${newOrderId} সফলভাবে নিশ্চিত হয়েছে!` : `Order ${newOrderId} confirmed successfully!`));
    onOrderPlaced(newOrderId);
  }
}

export const orderModule = new OrderModule();
