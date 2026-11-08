/**
 * BH Agro Ltd. - Orders & Field Booking Module
 * Direct confirmed booking without Admin approval
 * Admin actions: Print Invoice & Delete Order
 */

import { store, Order, OrderItem } from './store.ts';

export class OrderModule {
  renderOrderBooking(onOrderPlaced: (id: string) => void): string {
    const isAdmin = store.authSession.role === 'admin';
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
                <input type="text" value="${store.catalogSearch}" oninput="window.OrderActions.setSearch(this.value)" placeholder="${store.t('searchPlaceholder')}" class="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" />
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
                    <input type="number" min="0" value="${store.cart.discount}" oninput="window.OrderActions.setDiscount(this.value)" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" placeholder="0" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-1">${isBn ? 'মন্তব্য বা ডেলিভারি নোট' : 'Remarks / Delivery Note'}</label>
                    <input type="text" value="${store.cart.notes || ''}" oninput="window.OrderActions.setNotes(this.value)" class="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" placeholder="${isBn ? 'যেমন: সকালের মধ্যে ডেলিভারি দিন' : 'e.g. Urgent morning delivery'}" />
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

  submitOrder(onOrderPlaced: (id: string) => void, showToast: (msg: string, type?: string) => void) {
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

    let subtotal = 0;
    const items: OrderItem[] = itemKeys.map(k => {
      const it = store.cart.items[k];
      subtotal += it.total;
      return {
        productId: it.product.id,
        name: it.product.name,
        packSize: it.product.packSize,
        qty: it.qty,
        freeQty: it.freeQty || 0,
        tp: it.product.tradePrice,
        total: it.total
      };
    });

    const discount = Number(store.cart.discount) || 0;
    const grandTotal = Math.max(0, subtotal - discount);

    const newOrderId = `BHA-ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(store.db.orders.length + 1).padStart(3, '0')}`;
    
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
        prod.stock = Math.max(0, prod.stock - it.qty);
      }
    });

    store.db.orders.unshift(newOrder);
    store.saveDatabase();

    store.cart.items = {};
    store.cart.discount = 0;
    store.cart.notes = '';

    showToast(isBn ? `অর্ডার ${newOrderId} সফলভাবে কনফার্ম করা হয়েছে!` : `Order ${newOrderId} confirmed successfully!`);
    onOrderPlaced(newOrderId);
  }
}

export const orderModule = new OrderModule();
