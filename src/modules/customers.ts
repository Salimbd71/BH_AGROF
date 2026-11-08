/**
 * BH Agro Ltd. - Customer Management Module
 * Customer format: BH0002 Amin Feed (Bold), Full Address (1/2 bonani, bogura)
 * Real-time in-place filtering without keyboard collapse
 */

import { store, Customer } from './store.ts';

export class CustomerModule {
  renderCustomerCard(c: Customer, onBookOrder: (id: string) => void, index: number = 0): string {
    const isApproved = c.status === 'approved';
    const isAdmin = store.authSession.role === 'admin';
    const isBn = store.lang === 'bn';

    return `
      <div class="customer-card p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-500/50 transition" data-id="${c.id}" data-name="${(c.shopName || '').toLowerCase()} ${(c.name || '').toLowerCase()}" data-address="${(c.address || '').toLowerCase()}" data-phone="${(c.phone || '').toLowerCase()}" data-srid="${(c.assignedSrId || c.createdBy || '').toLowerCase()}">
        <div class="flex items-start gap-3.5 flex-1 min-w-0">
          <!-- 1, 2, 3 Numbering Badge -->
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
            ${index + 1}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                c.category === 'dairy_farm' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                (c.category === 'poultry_farm' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                (c.category === 'pharmacy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'))
              }">
                ${store.t(c.category) || c.category}
              </span>
              ${isAdmin ? `
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Assigned SR">
                  SR: ${c.assignedSrId || c.createdBy || 'SR01'}
                </span>
              ` : ''}
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }">
                ${isApproved ? (isBn ? 'অনুমোদিত' : 'Approved') : (isBn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval')}
              </span>
            </div>

            <!-- Customer ID & Shop Name -->
            <h3 class="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight truncate">
              <span class="text-brand-700 dark:text-brand-400 font-mono">${c.id}</span> - ${c.shopName}
            </h3>

            <!-- Address -->
            <div class="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-start gap-1.5 font-medium">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0"></i>
              <span class="break-words">${c.address}</span>
            </div>

            <!-- Proprietor & Phone -->
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <div>
                <span class="text-slate-400 text-[11px]">${store.t('proprietorCol')}:</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 ml-1">${c.name}</span>
              </div>
              <div>
                <span class="text-slate-400 text-[11px]">${isBn ? 'যোগাযোগ:' : 'Contact:'}</span>
                <a href="tel:${c.phone}" class="font-mono font-bold text-brand-600 hover:underline ml-1">${c.phone}</a>
              </div>
              ${c.territory ? `
                <div>
                  <span class="text-slate-400 text-[11px]">${store.t('territory')}:</span>
                  <span class="font-semibold text-slate-700 dark:text-slate-300 ml-1">${c.territory}</span>
                </div>
              ` : ''}
            </div>

            ${isAdmin ? `
              <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px]">
                <span class="text-slate-400">${store.t('assignedSrRep')}:</span>
                <select onchange="window.CustomerActions.reassignSR('${c.id}', this.value)" class="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                  ${store.db.srs.map(s => `
                    <option value="${s.id}" ${(c.assignedSrId || c.createdBy) === s.id ? 'selected' : ''}>
                      ${s.id} - ${s.name}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          ${isApproved ? `
            <button onclick="window.CustomerActions.bookOrder('${c.id}')" class="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95">
              <i data-lucide="shopping-cart" class="w-4 h-4"></i>
              <span>${store.t('orderBooking')}</span>
            </button>
          ` : `
            <div class="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold text-center border border-amber-200 dark:border-amber-800">
              ${isBn ? 'অনুমোদনের অপেক্ষায়' : 'Pending'}
            </div>
          `}
          <a href="https://wa.me/88${c.phone.replace(/[^0-9]/g, '')}" target="_blank" class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 transition" title="WhatsApp">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
          </a>
          ${isAdmin ? `
            <button onclick="window.CustomerActions.deleteCustomer('${c.id}')" class="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition" title="${isBn ? 'গ্রাহক মুছুন' : 'Delete Customer'}">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCustomerSection(onBookOrder: (id: string) => void): string {
    const isAdmin = store.authSession.role === 'admin';
    const currentSrId = store.authSession.user?.id;
    const isBn = store.lang === 'bn';

    // RULE: An SR only sees customers assigned to them! Admin sees all.
    const customers = isAdmin
      ? store.db.customers
      : store.db.customers.filter(c => (c.assignedSrId || c.createdBy) === currentSrId);

    return `
      <div class="space-y-4">
        <!-- Search & Filter Bar (Never re-rendered on keystroke!) -->
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[260px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="customerSearchInput"
              placeholder="${store.t('searchCustomerPlaceholder')}" 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearCustomerSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          ${isAdmin ? `
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">${store.t('filterBySR')}</span>
              <select id="adminSrCustomerFilter" onchange="window.CustomerActions.filterBySr(this.value)" class="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                <option value="all">${store.t('allSRsOption')} (${store.db.customers.length})</option>
                ${store.db.srs.map(s => {
                  const cnt = store.db.customers.filter(c => (c.assignedSrId || c.createdBy || '').trim().toLowerCase() === (s.id || '').trim().toLowerCase()).length;
                  return `<option value="${s.id}">${s.id} - ${s.name} (${cnt})</option>`;
                }).join('')}
              </select>
            </div>
          ` : `
            <div class="text-xs px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300 font-bold border border-brand-200 dark:border-brand-800 flex items-center gap-1.5">
              <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
              <span>${store.t('assignedToYou')} (${store.authSession.user?.name})</span>
            </div>
          `}

          ${isAdmin ? `
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="window.CustomerActions.downloadTemplate()" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm" title="${store.t('downloadTemplate')}">
                <i data-lucide="download" class="w-3.5 h-3.5 text-brand-600"></i>
                <span class="hidden sm:inline">${store.t('template')}</span>
              </button>

              <input type="file" id="excelCustomerFileInput" accept=".xlsx, .xls, .csv" class="hidden" onchange="window.CustomerActions.handleUpload(event)" />
              <button onclick="document.getElementById('excelCustomerFileInput').click()" class="px-3 py-2 rounded-xl bg-tealbrand-600 hover:bg-tealbrand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm" title="${store.t('importExcel')}">
                <i data-lucide="file-up" class="w-3.5 h-3.5"></i>
                <span>${store.t('importExcel')}</span>
              </button>
            </div>
          ` : ''}

          <button onclick="window.CustomerActions.openAddModal()" class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow flex items-center gap-1.5 transition active:scale-95">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>${isAdmin ? (isBn ? '+ নতুন গ্রাহক' : '+ Add Customer') : store.t('addCustomer')}</span>
          </button>
        </div>

        <!-- Filter Count Indicator -->
        <div id="customerCountNotice" class="text-xs font-semibold text-slate-500 px-1">
          ${isBn ? `মোট ${customers.length} জন গ্রাহক প্রদর্শিত` : `Showing ${customers.length} registered customers`}
        </div>

        <!-- Customer List Container: Clean list layout with numbering -->
        <div id="customerListGrid" class="flex flex-col gap-3">
          ${customers.length === 0 ? `
            <div class="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <i data-lucide="users" class="w-12 h-12 mx-auto mb-2 opacity-30"></i>
              <p class="text-xs font-bold text-slate-600 dark:text-slate-300">${store.t('noCustomersAssigned')}</p>
              <p class="text-[11px] text-slate-400 mt-1">${store.t('noCustomersAssignedSub')}</p>
            </div>
          ` : customers.map((c, idx) => this.renderCustomerCard(c, onBookOrder, idx)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach robust listeners that do NOT destroy the input element,
   * fixing the bug where typing hides the mobile keyboard!
   */
  attachSearchListener() {
    const input = document.getElementById('customerSearchInput') as HTMLInputElement | null;
    const clearBtn = document.getElementById('clearCustomerSearchBtn');
    const grid = document.getElementById('customerListGrid');
    const notice = document.getElementById('customerCountNotice');

    if (!input || !grid) return;

    const performFilter = (query: string) => {
      const q = query.trim().toLowerCase();
      const srSelect = document.getElementById('adminSrCustomerFilter') as HTMLSelectElement | null;
      const targetSr = (srSelect?.value || 'all').trim().toLowerCase();
      const cards = grid.querySelectorAll<HTMLElement>('.customer-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const id = card.getAttribute('data-id')?.toLowerCase() || '';
        const name = card.getAttribute('data-name') || '';
        const addr = card.getAttribute('data-address') || '';
        const phone = card.getAttribute('data-phone') || '';
        const cardSrId = (card.getAttribute('data-srid') || '').trim().toLowerCase();

        const srMatches = targetSr === 'all' || cardSrId === targetSr;
        const textMatches = !q || id.includes(q) || name.includes(q) || addr.includes(q) || phone.includes(q);

        if (srMatches && textMatches) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (notice) {
        const isBn = store.lang === 'bn';
        if (q) {
          notice.innerText = isBn ? `"${query}" এর সাথে মিলেছে ${visibleCount} জন গ্রাহক` : `Found ${visibleCount} customer(s) matching "${q}"`;
        } else if (targetSr === 'all') {
          notice.innerText = isBn ? `মোট ${visibleCount} জন গ্রাহক প্রদর্শিত` : `Showing ${visibleCount} registered customers`;
        } else {
          notice.innerText = isBn ? `এসআর (${srSelect?.value}) এর অধীনে ${visibleCount} জন গ্রাহক প্রদর্শিত` : `Showing ${visibleCount} customer(s) assigned to SR: ${srSelect?.value}`;
        }
      }

      if (clearBtn) {
        if (q) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
      }
    };

    // Auto-filter in real-time as the user types without losing focus
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      performFilter(target.value);
    });

    // When enter is pressed, blur input to hide mobile keyboard cleanly
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        input.blur();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        performFilter('');
        input.focus();
      });
    }
  }

  openAddCustomerModal(onCustomerAdded: () => void) {
    const isAdmin = store.authSession.role === 'admin';
    const isBn = store.lang === 'bn';
    const modalHtml = `
      <div id="customerAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="font-extrabold text-base sm:text-lg flex items-center gap-2">
              <i data-lucide="user-plus" class="w-5 h-5 text-brand-600"></i>
              <span>${isAdmin ? (isBn ? 'নতুন অনুমোদিত গ্রাহক যোগ' : 'Add Approved Customer') : store.t('addCustomer')}</span>
            </h3>
            <button onclick="document.getElementById('customerAddModal').remove()" class="p-1 rounded-lg text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="newCustForm" class="mt-4 space-y-3.5 text-xs">
            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('shopName')} *</label>
              <input type="text" id="custShopName" required placeholder="${isBn ? 'যেমন: আমিন ফিড / গ্রিন ডেইরি ফার্ম' : 'Ex: Amin Feed / Green Valley Farm'}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('address')} *</label>
              <input type="text" id="custAddress" required placeholder="${isBn ? 'যেমন: ১/২ বনানী, বগুড়া' : 'Ex: 1/2 bonani, bogura'}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('customerName')} *</label>
              <input type="text" id="custOwnerName" required placeholder="${isBn ? 'মালিক বা ডাক্তারের নাম' : 'Owner or Manager Name'}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('phone')} *</label>
                <input type="tel" id="custPhone" required placeholder="017XXXXXXXX" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('category')} *</label>
                <select id="custCategory" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold">
                  <option value="feed_mill">${store.t('feedMill')}</option>
                  <option value="dairy_farm">${store.t('dairyFarm')}</option>
                  <option value="poultry_farm">${store.t('poultryFarm')}</option>
                  <option value="pharmacy">${store.t('pharmacy')}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('territory')} *</label>
              <input type="text" id="custTerritory" value="${store.authSession.user?.territory || (isBn ? 'বগুড়া ডেইরি জোন' : 'Bogura Dairy Zone')}" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>

            ${isAdmin ? `
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('assignedSrRep')} *</label>
                <select id="custAssignedSr" class="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-slate-800 font-bold text-purple-900 dark:text-purple-300">
                  ${store.db.srs.map(s => `
                    <option value="${s.id}">${s.id} - ${s.name} (${s.territory})</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <div>
              <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('creditLimit')}</label>
              <input type="number" id="custCreditLimit" value="100000" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
            </div>

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button type="button" onclick="document.getElementById('customerAddModal').remove()" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
                ${store.t('cancel')}
              </button>
              <button type="submit" class="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-md">
                ${isAdmin ? (isBn ? 'গ্রাহক সংরক্ষণ করুন' : 'Save Customer') : (isBn ? 'অনুমোদনের জন্য আবেদন' : 'Submit for Admin Approval')}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if ((window as any).lucide) (window as any).lucide.createIcons();

    const form = document.getElementById('newCustForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const shopName = (document.getElementById('custShopName') as HTMLInputElement).value.trim();
        const address = (document.getElementById('custAddress') as HTMLInputElement).value.trim();
        const ownerName = (document.getElementById('custOwnerName') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('custPhone') as HTMLInputElement).value.trim();
        const category = (document.getElementById('custCategory') as HTMLSelectElement).value as any;
        const territory = (document.getElementById('custTerritory') as HTMLInputElement).value.trim();
        const creditLimit = Number((document.getElementById('custCreditLimit') as HTMLInputElement).value) || 0;
        const assignedSrInput = document.getElementById('custAssignedSr') as HTMLSelectElement | null;
        const assignedSrId = assignedSrInput ? assignedSrInput.value : (store.authSession.user?.id || 'SR01');

        const assignedId = isAdmin ? store.getNextCustomerId() : `REQ-${Date.now().toString().slice(-4)}`;

        const newCust: Customer = {
          id: assignedId,
          name: ownerName,
          shopName: shopName,
          phone: phone,
          category: category,
          territory: territory,
          address: address,
          creditLimit: creditLimit,
          balance: 0,
          status: isAdmin ? 'approved' : 'pending',
          createdBy: store.authSession.user?.id || 'SR',
          assignedSrId: assignedSrId,
          createdAt: new Date().toISOString().split('T')[0]
        };

        store.db.customers.unshift(newCust);
        store.saveDatabase();
        document.getElementById('customerAddModal')?.remove();
        onCustomerAdded();
      });
    }
  }

  renderAdminApprovals(onAction: () => void): string {
    const pending = store.db.customers.filter(c => c.status === 'pending');
    const isBn = store.lang === 'bn';

    return `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="user-check" class="w-6 h-6 text-amber-500"></i>
              <span>${store.t('pendingApprovals')}</span>
            </h2>
            <p class="text-xs text-slate-500">
              ${isBn ? 'ফিল্ড এসআরদের পাঠানো নতুন গ্রাহকের আবেদন অনুমোদন বা বাতিল করুন।' : 'Approve or reject customer requests submitted by field SRs.'}
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            ${isBn ? `${pending.length} টি আবেদন অপেক্ষমাণ` : `${pending.length} Requests Pending`}
          </span>
        </div>

        ${pending.length === 0 ? `
          <div class="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
            <i data-lucide="check-circle-2" class="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-80"></i>
            <h4 class="font-bold text-sm text-slate-700 dark:text-slate-200">${isBn ? 'কোনো অপেক্ষমাণ আবেদন নেই' : 'No Pending Requests'}</h4>
            <p class="text-xs mt-1">${isBn ? 'সকল ফিল্ড গ্রাহক একাউন্ট অনুমোদিত ও যাচাইকৃত।' : 'All field customer accounts are approved and verified.'}</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${pending.map(c => `
              <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider">${c.shopName}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">${store.t(c.category) || c.category}</span>
                  </div>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white">${c.name} • <span class="font-mono text-xs text-slate-500">${c.phone}</span></h4>
                  <p class="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">${store.t('address')}: <b>${c.address}</b></p>
                  <p class="text-[11px] text-brand-700 dark:text-brand-400 mt-1 font-semibold">${store.t('territory')}: ${c.territory} • ${isBn ? 'আবেদনকারী:' : 'Submitted by:'} <b>${c.createdBy}</b></p>
                  <div class="mt-2 flex items-center gap-2 text-xs">
                    <span class="font-bold text-slate-500">${store.t('assignedSrRep')}</span>
                    <select id="approveAssignSr-${c.id}" class="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-xs">
                      ${store.db.srs.map(s => `
                        <option value="${s.id}" ${(c.assignedSrId || c.createdBy) === s.id ? 'selected' : ''}>
                          ${s.id} - ${s.name}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button onclick="window.CustomerActions.rejectCustomer('${c.id}')" class="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 text-xs font-bold transition">
                    ${store.t('reject')}
                  </button>
                  <button onclick="window.CustomerActions.approveCustomer('${c.id}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i>
                    <span>${isBn ? 'অনুমোদন ও বিএইচ আইডি বরাদ্দ' : 'Approve & Assign BH ID'}</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
}

export const customerModule = new CustomerModule();
