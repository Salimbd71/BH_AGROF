/**
 * BH Agro Ltd. - Product & Inventory Module
 * Category filtering, in-place search, stock checker,
 * Add New Product Modal, and Price & Discount Manager
 */

import { store, Product } from './store.ts';

export class ProductModule {
  renderProductCard(p: Product): string {
    const isLow = p.stock > 0 && p.stock < 10;
    const isOut = p.stock <= 0;

    return `
      <div class="product-item-card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-brand-500/40 transition" data-name="${(p.name || '').toLowerCase()} ${(p.bnName || '').toLowerCase()}" data-sku="${(p.sku || '').toLowerCase()}" data-cat="${p.category}" data-stock="${p.stock}">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
              p.category === 'antibiotics' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
              (p.category === 'vaccines' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
              (p.category === 'supplements' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'))
            }">
              ${store.t(p.category) || p.category}
            </span>
            <span class="text-[10px] font-bold ${isOut ? 'text-rose-600' : (isLow ? 'text-amber-600 font-extrabold animate-pulse' : 'text-slate-500')}">
              ${isOut ? (store.lang === 'bn' ? 'স্টক শেষ' : 'Out of Stock') : (isLow ? (store.lang === 'bn' ? `স্বল্প স্টক: ${p.stock}` : `Low Stock: ${p.stock}`) : (store.lang === 'bn' ? `মজুদ: ${p.stock}` : `Stock: ${p.stock}`))}
            </span>
          </div>

          <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
            ${store.lang === 'bn' ? (p.bnName || p.name) : p.name}
          </h4>
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
            <span class="text-[10px] text-slate-400">/ ${store.lang === 'bn' ? 'টিপি' : 'TP'}</span>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          ${isOut ? `
            <div class="text-center py-1.5 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 rounded-xl">${store.lang === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}</div>
          ` : `
            <button onclick="window.ProductActions.quickOrder('${p.id}')" class="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>${store.t('bookProduct')}</span>
            </button>
          `}
        </div>
      </div>
    `;
  }

  // SR View: Products List
  renderProductSection(): string {
    const products = store.db.products;
    const categories = [
      { id: 'all', label: store.t('categoryAll') },
      { id: 'low_stock', label: `⚠️ ${store.t('lowStock')} (< 10)`, isAlert: true },
      { id: 'antibiotics', label: store.t('categoryAntibiotics') },
      { id: 'vaccines', label: store.t('categoryVaccines') },
      { id: 'supplements', label: store.t('categorySupplements') },
      { id: 'dewormers', label: store.t('categoryDewormers') },
    ];

    return `
      <div class="space-y-4">
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div class="flex items-center gap-2 overflow-x-auto pb-1" id="productCatTabContainer">
            ${categories.map(cat => `
              <button onclick="window.ProductActions.filterCategory('${cat.id}')" data-cat="${cat.id}" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                cat.id === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : (cat.isAlert ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200')
              }">
                ${cat.label}
              </button>
            `).join('')}
          </div>

          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="productSearchInput"
              placeholder="${store.t('searchPlaceholder')}" 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearProductSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div id="productCountNotice" class="text-xs font-semibold text-slate-500 px-1">
          Showing ${products.length} veterinary medicines
        </div>

        <div id="productListGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${products.map(p => this.renderProductCard(p)).join('')}
        </div>
      </div>
    `;
  }

  // Admin View: Product Inventory Management with Add New Product & Excel
  renderAdminProductSection(): string {
    const products = store.db.products;

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="package" class="w-6 h-6 text-brand-600"></i>
              <span>${store.t('productsInventory')}</span>
            </h2>
            <p class="text-xs text-slate-500">
              ${store.lang === 'bn' ? 'নতুন ওষুধ যোগ করুন, মজুদ সমন্বয় করুন এবং এক্সেলে ইনভেন্টরি পরিচালনা করুন।' : 'Add new products, adjust stock levels, and upload inventory via Excel.'}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.ProductActions.openAddModal()" class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>${store.t('addNewProduct')}</span>
            </button>

            <button onclick="window.ProductActions.downloadTemplate()" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm">
              <i data-lucide="download" class="w-3.5 h-3.5 text-brand-600"></i>
              <span>${store.t('downloadTemplate')}</span>
            </button>

            <input type="file" id="excelAdminFileInput" accept=".xlsx, .xls, .csv" class="hidden" onchange="window.ProductActions.handleUpload(event)" />
            <button onclick="document.getElementById('excelAdminFileInput').click()" class="px-3.5 py-2 rounded-xl bg-tealbrand-600 hover:bg-tealbrand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <i data-lucide="file-up" class="w-3.5 h-3.5"></i>
              <span>${store.t('uploadExcel')}</span>
            </button>
          </div>
        </div>

        <!-- Admin Inventory Search Bar -->
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[260px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="adminProductSearchInput"
              placeholder="${store.t('searchPlaceholder')}" 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearAdminProductSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div id="adminProductCountNotice" class="text-xs font-bold text-slate-500">
            ${store.lang === 'bn' ? `মোট ${products.length} টি ওষুধ নিবন্ধিত` : `Showing ${products.length} registered products`}
          </div>
        </div>

        <!-- Inventory Table -->
        <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                <th class="pb-3">SKU</th>
                <th class="pb-3">${store.lang === 'bn' ? 'ওষুধের নাম' : 'Product Name'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'প্যাকিং' : 'Packing'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'ট্রেড প্রাইস (টিপি)' : 'Trade Price (TP)'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'এম.আর.পি' : 'MRP'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'মজুদ' : 'Stock'}</th>
                <th class="pb-3">${store.lang === 'bn' ? 'ট্রেড অফার' : 'Trade Offer'}</th>
                <th class="pb-3 text-right">${store.t('action')}</th>
              </tr>
            </thead>
            <tbody id="adminInventoryTableBody" class="divide-y divide-slate-100 dark:divide-slate-800">
              ${products.map(p => `
                <tr 
                  class="admin-prod-row hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  data-name="${(p.name || '').toLowerCase()} ${(p.bnName || '').toLowerCase()}"
                  data-sku="${(p.sku || '').toLowerCase()}"
                  data-cat="${p.category.toLowerCase()}"
                >
                  <td class="py-3 font-mono font-bold text-slate-500">${p.sku}</td>
                  <td class="py-3 font-bold text-slate-900 dark:text-white">
                    ${store.lang === 'bn' ? (p.bnName || p.name) : p.name}
                    <div class="text-[11px] font-normal text-slate-400">${store.lang === 'bn' ? p.name : (p.bnName || '')}</div>
                  </td>
                  <td class="py-3 capitalize">${store.t(p.category) || p.category}</td>
                  <td class="py-3 text-slate-500">${p.packSize}</td>
                  <td class="py-3 font-black text-brand-700 dark:text-brand-400">৳${p.tradePrice}</td>
                  <td class="py-3 text-slate-400">৳${p.mrp}</td>
                  <td class="py-3">
                    <span class="px-2 py-0.5 rounded-full font-bold ${
                      p.stock <= 0 ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
                      (p.stock < 10 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')
                    }">
                      ${p.stock}
                    </span>
                  </td>
                  <td class="py-3 text-tealbrand-600 font-semibold">${p.tradeOffer || '-'}</td>
                  <td class="py-3 text-right">
                    <button onclick="window.ProductActions.deleteProduct('${p.id}')" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="${store.lang === 'bn' ? 'ওষুধ মুছুন' : 'Delete Product'}">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Admin View: Price and Discount Manager
  renderPriceAndDiscountManager(): string {
    const products = store.db.products;

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="tags" class="w-6 h-6 text-brand-600"></i>
              <span>${store.t('pricingManager')}</span>
            </h2>
            <p class="text-xs text-slate-500">Manage Trade Price (TP), M.R.P., and Trade Offers across all veterinary medicines.</p>
          </div>
          <button onclick="window.ProductActions.openAddModal()" class="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow hover:bg-brand-500 transition">
            + Add New Product
          </button>
        </div>

        <!-- Bulk Discount / Offer Manager Card -->
        <div class="p-5 rounded-3xl bg-gradient-to-r from-brand-900 via-tealbrand-900 to-slate-900 text-white shadow-lg space-y-4">
          <div class="flex items-center gap-2">
            <i data-lucide="sparkles" class="w-5 h-5 text-amber-300"></i>
            <h3 class="font-extrabold text-sm sm:text-base">Bulk Category Offer & Price Updater</h3>
          </div>
          <p class="text-xs text-slate-300">Quickly apply promotional trade offers or percentage discounts to an entire product category.</p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div>
              <label class="block font-bold text-slate-200 mb-1">Target Category</label>
              <select id="bulkCategorySelect" class="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold">
                <option value="all">All Categories</option>
                <option value="antibiotics">Antibiotics</option>
                <option value="vaccines">Vaccines</option>
                <option value="supplements">Feed Supplements</option>
                <option value="dewormers">Dewormers</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-200 mb-1">Trade Offer Preset</label>
              <input type="text" id="bulkOfferPreset" placeholder="e.g. 10+1 Free or 5% Cash Discount" class="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border border-slate-700" />
            </div>
            <div class="flex items-end">
              <button onclick="window.ProductActions.applyBulkOffer()" class="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow transition active:scale-95">
                Apply to Selected Category
              </button>
            </div>
          </div>
        </div>

        <!-- Live Price & Discount Interactive Table -->
        <div class="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-white">Individual Product Price & Offer Editor</h3>
              <p class="text-xs text-slate-500 font-medium">Click "Save" on any row to instantly update price & sync to Firebase</p>
            </div>
          </div>

          <!-- Price Manager Search Input -->
          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="priceManagerSearchInput"
              placeholder="ওষুধের নাম, SKU বা ক্যাটাগরি দিয়ে মূল্য তালিকায় খুঁজুন..." 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearPriceSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-400 uppercase">
                  <th class="pb-3">SKU</th>
                  <th class="pb-3">Medicine Description</th>
                  <th class="pb-3">Category</th>
                  <th class="pb-3 w-28">Trade Price (৳)</th>
                  <th class="pb-3 w-28">M.R.P. (৳)</th>
                  <th class="pb-3 w-48">Trade Offer / Discount</th>
                  <th class="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="priceManagerTableBody" class="divide-y divide-slate-100 dark:divide-slate-800">
                ${products.map(p => `
                  <tr 
                    class="price-editor-row hover:bg-slate-50/50 dark:hover:bg-slate-800/40" 
                    id="priceRow-${p.id}"
                    data-name="${(p.name || '').toLowerCase()}"
                    data-sku="${(p.sku || '').toLowerCase()}"
                    data-cat="${p.category.toLowerCase()}"
                  >
                    <td class="py-3 font-mono font-bold text-slate-400">${p.sku}</td>
                    <td class="py-3">
                      <div class="font-bold text-slate-900 dark:text-white">${p.name}</div>
                      <div class="text-[11px] text-slate-400">${p.packSize}</div>
                    </td>
                    <td class="py-3 capitalize">${p.category}</td>
                    <td class="py-3">
                      <input type="number" min="1" id="tpInput-${p.id}" value="${p.tradePrice}" class="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-brand-700 dark:text-brand-400 text-xs" />
                    </td>
                    <td class="py-3">
                      <input type="number" min="1" id="mrpInput-${p.id}" value="${p.mrp}" class="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-xs" />
                    </td>
                    <td class="py-3">
                      <input type="text" id="offerInput-${p.id}" value="${p.tradeOffer || 'Standard'}" class="w-44 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-tealbrand-700 dark:text-tealbrand-400 text-xs" />
                    </td>
                    <td class="py-3 text-right">
                      <button onclick="window.ProductActions.saveRowPrice('${p.id}')" class="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] shadow-sm transition active:scale-95">
                        Save
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  attachSearchListener() {
    // 1. SR Product Catalog Grid Search
    const input = document.getElementById('productSearchInput') as HTMLInputElement | null;
    const clearBtn = document.getElementById('clearProductSearchBtn');
    const grid = document.getElementById('productListGrid');
    const notice = document.getElementById('productCountNotice');

    let selectedCat = 'all';

    if (input && grid) {
      const performFilter = () => {
        const q = input.value.trim().toLowerCase();
        const cards = grid.querySelectorAll<HTMLElement>('.product-item-card');
        let visible = 0;

        cards.forEach(card => {
          const name = card.getAttribute('data-name') || '';
          const sku = card.getAttribute('data-sku') || '';
          const cat = card.getAttribute('data-cat') || '';
          const stock = parseInt(card.getAttribute('data-stock') || '0', 10);

          let matchesCat = false;
          if (selectedCat === 'all') {
            matchesCat = true;
          } else if (selectedCat === 'low_stock') {
            matchesCat = stock > 0 && stock < 10;
          } else {
            matchesCat = cat === selectedCat;
          }

          const matchesQuery = !q || name.includes(q) || sku.includes(q);

          if (matchesCat && matchesQuery) {
            card.style.display = '';
            visible++;
          } else {
            card.style.display = 'none';
          }
        });

        if (notice) {
          notice.innerText = `Showing ${visible} of ${cards.length} medicines`;
        }
        if (clearBtn) {
          if (q) clearBtn.classList.remove('hidden');
          else clearBtn.classList.add('hidden');
        }
      };

      input.addEventListener('input', () => performFilter());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') input.blur();
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          input.value = '';
          performFilter();
          input.focus();
        });
      }

      (window as any).ProductActions = {
        ...(window as any).ProductActions,
        filterCategory: (catId: string) => {
          selectedCat = catId;
          const pills = document.querySelectorAll('.cat-pill');
          pills.forEach(p => {
            if (p.getAttribute('data-cat') === catId) {
              p.className = 'cat-pill px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-brand-600 text-white shadow-sm';
            } else {
              p.className = 'cat-pill px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200';
            }
          });
          performFilter();
        }
      };
    }

    // 2. Admin Inventory Table Search
    const adminInput = document.getElementById('adminProductSearchInput') as HTMLInputElement | null;
    const adminClearBtn = document.getElementById('clearAdminProductSearchBtn');
    const adminTableBody = document.getElementById('adminInventoryTableBody');
    const adminNotice = document.getElementById('adminProductCountNotice');

    if (adminInput && adminTableBody) {
      const performAdminFilter = (query: string) => {
        const q = query.trim().toLowerCase();
        const rows = adminTableBody.querySelectorAll<HTMLElement>('.admin-prod-row');
        let visible = 0;

        rows.forEach(row => {
          const name = row.getAttribute('data-name') || '';
          const sku = row.getAttribute('data-sku') || '';
          const cat = row.getAttribute('data-cat') || '';

          const matches = !q || name.includes(q) || sku.includes(q) || cat.includes(q);
          if (matches) {
            row.style.display = '';
            visible++;
          } else {
            row.style.display = 'none';
          }
        });

        if (adminNotice) {
          adminNotice.innerText = q ? `Found ${visible} product(s) matching "${q}"` : `Showing ${rows.length} registered products`;
        }
        if (adminClearBtn) {
          if (q) adminClearBtn.classList.remove('hidden');
          else adminClearBtn.classList.add('hidden');
        }
      };

      adminInput.addEventListener('input', (e) => {
        performAdminFilter((e.target as HTMLInputElement).value);
      });
      adminInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') adminInput.blur();
      });
      if (adminClearBtn) {
        adminClearBtn.addEventListener('click', () => {
          adminInput.value = '';
          performAdminFilter('');
          adminInput.focus();
        });
      }
    }

    // 3. Price & Discount Manager Search
    const priceInput = document.getElementById('priceManagerSearchInput') as HTMLInputElement | null;
    const priceClearBtn = document.getElementById('clearPriceSearchBtn');
    const priceTableBody = document.getElementById('priceManagerTableBody');

    if (priceInput && priceTableBody) {
      const performPriceFilter = (query: string) => {
        const q = query.trim().toLowerCase();
        const rows = priceTableBody.querySelectorAll<HTMLElement>('.price-editor-row');

        rows.forEach(row => {
          const name = row.getAttribute('data-name') || '';
          const sku = row.getAttribute('data-sku') || '';
          const cat = row.getAttribute('data-cat') || '';

          const matches = !q || name.includes(q) || sku.includes(q) || cat.includes(q);
          if (matches) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });

        if (priceClearBtn) {
          if (q) priceClearBtn.classList.remove('hidden');
          else priceClearBtn.classList.add('hidden');
        }
      };

      priceInput.addEventListener('input', (e) => {
        performPriceFilter((e.target as HTMLInputElement).value);
      });
      priceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') priceInput.blur();
      });
      if (priceClearBtn) {
        priceClearBtn.addEventListener('click', () => {
          priceInput.value = '';
          performPriceFilter('');
          priceInput.focus();
        });
      }
    }
  }

  openAddProductModal(onSaved: () => void) {
    const modalHtml = `
      <div id="productAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-extrabold text-base flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-5 h-5 text-brand-600"></i>
              <span>Add New Veterinary Medicine</span>
            </h3>
            <button onclick="document.getElementById('productAddModal').remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form id="newProductForm" class="mt-4 space-y-3.5 text-xs">
            <div>
              <label class="block font-bold mb-1">Product Name (English) *</label>
              <input type="text" id="newProdName" required placeholder="e.g. Bio-Cavit Oral Solution" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold" />
            </div>

            <div>
              <label class="block font-bold mb-1">Product Name (বাংলা)</label>
              <input type="text" id="newProdBnName" placeholder="যেমন: বায়ো-ক্যাভিট ওরাল সলিউশন" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">SKU Code *</label>
                <input type="text" id="newProdSku" required value="BHA-${Date.now().toString().slice(-4)}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">Category *</label>
                <select id="newProdCat" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold">
                  <option value="antibiotics">Antibiotics</option>
                  <option value="vaccines">Vaccines</option>
                  <option value="supplements">Feed Supplements</option>
                  <option value="dewormers">Dewormers</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block font-bold mb-1">Packing *</label>
                <input type="text" id="newProdPack" required placeholder="100ml / 1kg" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </div>
              <div>
                <label class="block font-bold mb-1">Trade Price (৳) *</label>
                <input type="number" id="newProdTp" required placeholder="350" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black" />
              </div>
              <div>
                <label class="block font-bold mb-1">M.R.P. (৳) *</label>
                <input type="number" id="newProdMrp" required placeholder="420" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">Initial Stock (Units) *</label>
                <input type="number" id="newProdStock" required value="150" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">Trade Offer / Discount</label>
                <input type="text" id="newProdOffer" value="10+1 Free" placeholder="e.g. 10+1 Free" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold" />
              </div>
            </div>

            <div>
              <label class="block font-bold mb-1">Indications & Dosage Notes</label>
              <input type="text" id="newProdDosage" placeholder="e.g. Broiler, Layer and Dairy Cattle nutrition" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onclick="document.getElementById('productAddModal').remove()" class="px-4 py-2 border rounded-xl font-bold">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-500">Save Product</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if ((window as any).lucide) (window as any).lucide.createIcons();

    const form = document.getElementById('newProductForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('newProdName') as HTMLInputElement).value.trim();
        const bnName = (document.getElementById('newProdBnName') as HTMLInputElement).value.trim() || name;
        const sku = (document.getElementById('newProdSku') as HTMLInputElement).value.trim();
        const cat = (document.getElementById('newProdCat') as HTMLSelectElement).value as any;
        const pack = (document.getElementById('newProdPack') as HTMLInputElement).value.trim();
        const tp = Number((document.getElementById('newProdTp') as HTMLInputElement).value) || 100;
        const mrp = Number((document.getElementById('newProdMrp') as HTMLInputElement).value) || Math.round(tp * 1.2);
        const stock = Number((document.getElementById('newProdStock') as HTMLInputElement).value) || 0;
        const offer = (document.getElementById('newProdOffer') as HTMLInputElement).value.trim() || 'Standard';
        const dosage = (document.getElementById('newProdDosage') as HTMLInputElement).value.trim();

        const newProd: Product = {
          id: `PROD-${Date.now().toString().slice(-4)}`,
          name: name,
          bnName: bnName,
          sku: sku,
          category: cat,
          packSize: pack,
          tradePrice: tp,
          mrp: mrp,
          stock: stock,
          tradeOffer: offer,
          batchNo: `B26-${Date.now().toString().slice(-3)}`,
          dosage: dosage
        };

        store.db.products.unshift(newProd);
        store.saveDatabase();
        document.getElementById('productAddModal')?.remove();
        onSaved();
      });
    }
  }

  openLowStockModal(onProductAction?: () => void) {
    const lowStockItems = store.db.products.filter(p => p.stock > 0 && p.stock < 10);
    const cartCount = Object.keys(store.cart.items).length;

    const isBn = store.lang === 'bn';

    const modalHtml = `
      <div id="lowStockModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 max-h-[90vh] flex flex-col">
          
          <!-- Header -->
          <div class="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600">
                <i data-lucide="alert-triangle" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>${isBn ? 'স্বল্প স্টক ও ইনভেন্টরি সতর্কতা' : 'Low Stock & Inventory Alerts'}</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    ${lowStockItems.length} ${isBn ? 'টি আইটেম' : 'Items'}
                  </span>
                </h3>
                <p class="text-xs text-rose-500 font-semibold">${isBn ? 'যেসব ওষুধের মজুদ ১০ ইউনিটের নিচে রয়েছে' : 'Medicines with stock quantity below 10 units'}</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="document.getElementById('lowStockModal').remove(); window.App.navigate('stock_manage');" class="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition">
                <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                <span>${store.t('stockManage')}</span>
              </button>
              <button onclick="document.getElementById('lowStockModal').remove()" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <!-- Notice explaining options -->
          <div class="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-2">
              <i data-lucide="info" class="w-4 h-4 shrink-0 text-amber-600"></i>
              <span>${isBn ? 'মজুদ দ্রুত বাড়াতে +১০, +৫০, +১০০ চাপুন অথবা সংখ্যা লিখে যোগ করুন।' : 'Quickly increase stock with +10, +50, +100 buttons or type exact quantity.'}</span>
            </div>
            <button onclick="document.getElementById('lowStockModal').remove(); window.App.navigate('stock_manage');" class="whitespace-nowrap px-3 py-1 rounded-lg bg-white dark:bg-slate-800 font-bold text-[11px] text-brand-700 dark:text-brand-300 shadow-sm border border-amber-200 hover:bg-amber-100">
              ${isBn ? 'সম্পূর্ণ স্টক ম্যানেজমেন্ট →' : 'All Stock Management →'}
            </button>
          </div>

          <!-- Products List -->
          <div class="overflow-y-auto my-3 flex-1 pr-1 space-y-3">
            ${lowStockItems.length === 0 ? `
              <div class="text-center py-12 text-slate-400">
                <i data-lucide="check-circle-2" class="w-12 h-12 mx-auto mb-2 text-emerald-500 opacity-80"></i>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-200">${isBn ? 'কোনো স্বল্প স্টক ওষুধ নেই' : 'No Low Stock Items!'}</p>
                <p class="text-xs mt-1">${isBn ? 'সব ওষুধের মজুদ সন্তোষজনক রয়েছে।' : 'All medicine stock levels are currently adequate.'}</p>
              </div>
            ` : `
              ${lowStockItems.map(p => `
                <div class="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-rose-200/80 dark:border-rose-900/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-rose-400 transition">
                  
                  <!-- Product Info -->
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono font-bold text-xs text-brand-700 dark:text-brand-400">${p.sku}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">${store.t(p.category) || p.category}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                        ${isBn ? `মজুদ: ${p.stock} টি` : `Stock: ${p.stock} units`}
                      </span>
                    </div>

                    <h4 class="font-extrabold text-sm text-slate-900 dark:text-white">${isBn ? (p.bnName || p.name) : p.name}</h4>
                    <p class="text-xs text-slate-500">${isBn ? p.name : (p.bnName || '')} • ${p.packSize}</p>
                    <div class="text-xs font-bold text-brand-700 dark:text-brand-400 flex items-center gap-3 pt-0.5">
                      <span>${store.t('unitTP')}: ৳${p.tradePrice}</span>
                      <span>${store.t('mrp')}: ৳${p.mrp}</span>
                      ${p.tradeOffer ? `<span class="text-tealbrand-600 font-semibold">• ${p.tradeOffer}</span>` : ''}
                    </div>
                  </div>

                  <!-- Actions: Restock + Order Slip -->
                  <div class="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    <!-- Quick Restock Pill Buttons -->
                    <div class="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span class="text-[10px] font-bold text-slate-400 px-1">${isBn ? 'যোগ:' : 'Add:'}</span>
                      <button onclick="window.ProductActions.restockProduct('${p.id}', 10)" class="px-2 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 shadow-sm border border-slate-200 dark:border-slate-600 transition">
                        +10
                      </button>
                      <button onclick="window.ProductActions.restockProduct('${p.id}', 50)" class="px-2 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 shadow-sm border border-slate-200 dark:border-slate-600 transition">
                        +50
                      </button>
                      <button onclick="window.ProductActions.restockProduct('${p.id}', 100)" class="px-2 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 shadow-sm border border-slate-200 dark:border-slate-600 transition">
                        +100
                      </button>
                    </div>

                    <!-- Custom Qty Input -->
                    <div class="flex items-center gap-1">
                      <input 
                        type="number" 
                        id="customStock-${p.id}" 
                        placeholder="${isBn ? 'সংখ্যা' : 'Qty'}" 
                        class="w-16 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-center" 
                      />
                      <button onclick="const el = document.getElementById('customStock-${p.id}'); if(el && el.value) window.ProductActions.restockProduct('${p.id}', Number(el.value));" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition">
                        ${isBn ? 'যোগ' : 'Add'}
                      </button>
                    </div>

                    <!-- Add to Order Slip Button -->
                    <button onclick="document.getElementById('lowStockModal').remove(); window.ProductActions.quickOrder('${p.id}');" class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow flex items-center gap-1.5 active:scale-95 transition">
                      <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                      <span>${isBn ? 'স্লিপে নিন' : 'Add to Order'}</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            `}
          </div>

          <!-- Footer -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between shrink-0 gap-3 text-xs">
            <div class="text-slate-500 font-medium">
              ${isBn ? `মোট স্বল্প-স্টক ওষুধ: ${lowStockItems.length} টি` : `Total low stock items: ${lowStockItems.length}`}
            </div>
            
            <div class="flex items-center gap-2">
              <button onclick="document.getElementById('lowStockModal').remove(); window.App.navigate('stock_manage');" class="px-4 py-2 rounded-xl border border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold hover:bg-brand-100 flex items-center gap-1.5 shadow-sm">
                <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                <span>${store.t('stockManage')}</span>
              </button>

              <button onclick="document.getElementById('lowStockModal').remove()" class="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700">
                ${store.t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if ((window as any).lucide) (window as any).lucide.createIcons();
  }
}

export const productModule = new ProductModule();
