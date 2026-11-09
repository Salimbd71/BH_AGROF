/**
 * BH Agro Ltd. - Authentication & SR Account Management Module
 * Admin creates SR ID with Username & Password, synced to Realtime DB
 */

import { store, SRUser, AdminUser } from './store.ts';
import { showToast } from './ui.ts';
import { APP_RULES } from '../config/appMode.ts';

export class AuthModule {
  renderLoginScreen(): string {
    const isBN = store.lang === 'bn';
    const hasAdmins = (store.db.admins || []).length > 0;
    const hasSrs = store.getActiveSrs().length > 0;

    return `
      <div class="min-h-screen bg-gradient-to-br from-brand-950 via-slate-900 to-tealbrand-950 flex flex-col justify-center items-center p-4">
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
          
          <div class="text-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-tealbrand-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/30 mb-3">
              <i data-lucide="leaf" class="w-8 h-8"></i>
            </div>
            <h1 class="text-2xl font-black text-brand-900 dark:text-brand-300 tracking-tight">
              ${isBN ? 'বিএইচ এগ্রো লি.' : 'BH AGRO LTD.'}
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${store.t('tagline')}</p>
          </div>

          <!-- Portal Selector -->
          ${APP_RULES.allowedRoles.length > 1 ? `
          <div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6">
            <button id="loginTabSr" onclick="window.AuthActions.switchMode('sr')" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow">
              ${store.t('roleSR')}
            </button>
            <button id="loginTabAdmin" onclick="window.AuthActions.switchMode('admin')" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-white">
              ${store.t('roleAdmin')}
            </button>
          </div>
          ` : ''}

          <!-- SR Login Form -->
          ${APP_RULES.allowedRoles.includes('sr') ? `
          <div id="srLoginFormSection">
            <form onsubmit="event.preventDefault(); window.AuthActions.submitSR();" class="space-y-4 text-xs">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('srUsername')} / ID</label>
                <input type="text" id="srLoginUsername" required placeholder="${isBN ? 'এসআর ইউজারনেম বা আইডি' : 'Enter SR username or ID'}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${store.t('srPassword')}</label>
                <input type="password" id="srLoginPassword" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm" />
              </div>

              <button type="submit" class="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-black text-sm shadow-lg shadow-brand-600/30 active:scale-95 transition flex items-center justify-center gap-2">
                <i data-lucide="log-in" class="w-4 h-4"></i>
                <span>${isBN ? 'এসআর পোর্টালে লগইন করুন' : 'Sign In to SR Portal'}</span>
              </button>

              ${!hasSrs ? `
                <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                  <div class="font-bold flex items-center gap-1.5">
                    <i data-lucide="info" class="w-3.5 h-3.5 text-amber-600"></i>
                    <span>${store.t('noSrFound')}</span>
                  </div>
                  <p class="leading-relaxed">
                    ${isBN ? 'আপনার সিস্টেমে এখনো কোনো এসআর অ্যাকাউন্ট নিবন্ধিত নেই। অনুগ্রহ করে সেন্ট্রাল অ্যাডমিনের সাথে যোগাযোগ করুন।' : 'No SR accounts registered in system. Please contact central administration.'}
                  </p>
                </div>
              ` : ''}
            </form>
          </div>
          ` : ''}

          ${APP_RULES.allowedRoles.includes('admin') ? `
          <div id="adminLoginFormSection" class="${APP_RULES.allowedRoles.includes('sr') ? 'hidden' : ''}">
            <form onsubmit="event.preventDefault(); window.AuthActions.submitAdmin();" class="space-y-4 text-xs">
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${isBN ? 'অ্যাডমিন ইউজারনেম' : 'Admin Username'}</label>
                <input type="text" id="adminLoginUsername" required placeholder="${isBN ? 'অ্যাডমিন ইউজারনেম' : 'Enter Admin username'}" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 dark:text-slate-300 mb-1">${isBN ? 'অ্যাডমিন পাসওয়ার্ড' : 'Admin Password'}</label>
                <input type="password" id="adminLoginPassword" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm" />
              </div>

              <button type="submit" class="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-black text-sm shadow-lg shadow-purple-700/30 active:scale-95 transition flex items-center justify-center gap-2">
                <i data-lucide="shield" class="w-4 h-4"></i>
                <span>${isBN ? 'অ্যাডমিন পোর্টালে লগইন করুন' : 'Sign In to Admin Portal'}</span>
              </button>

              <div class="pt-1 text-center">
                <button type="button" onclick="window.App.openFirebaseModal()" class="text-xs text-purple-700 dark:text-purple-300 font-bold hover:underline inline-flex items-center gap-1.5">
                  <i data-lucide="database" class="w-3.5 h-3.5 text-purple-600"></i>
                  <span>${store.t('dbSettings')}</span>
                </button>
              </div>

              ${!hasAdmins && APP_RULES.canCreateFirstAdmin ? `
                <div class="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-2.5">
                  <div class="font-black text-sm flex items-center gap-2">
                    <i data-lucide="shield-alert" class="w-4 h-4 text-purple-600"></i>
                    <span>${store.t('noAdminFound')}</span>
                  </div>
                  <p class="text-[11px] leading-relaxed">
                    ${isBN ? 'ডাটাবেজে কোনো অ্যাডমিন অ্যাকাউন্ট তৈরি করা নেই। এখনই প্রাথমিক অ্যাডমিন তৈরি করুন অথবা আপনার ফায়ারবেস ডাটাবেসের সাথে সংযুক্ত করুন।' : 'No admin credentials exist in local state. Create your first admin profile or connect your Firebase Realtime DB.'}
                  </p>
                  <div class="flex flex-col sm:flex-row gap-2 pt-1">
                    <button type="button" onclick="window.AuthActions.openAddAdminModal()" class="flex-1 py-2 px-3 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition">
                      <i data-lucide="shield-plus" class="w-3.5 h-3.5"></i>
                      <span>${store.t('createFirstAdmin')}</span>
                    </button>
                    <button type="button" onclick="window.App.openFirebaseModal()" class="flex-1 py-2 px-3 border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition">
                      <i data-lucide="database" class="w-3.5 h-3.5"></i>
                      <span>${store.t('connectFirebase')}</span>
                    </button>
                  </div>
                </div>
              ` : ''}
            </form>
          </div>
          ` : ''}

          <!-- Bottom Actions: Language and Theme -->
          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <button onclick="window.AuthActions.toggleLang()" class="flex items-center gap-1.5 hover:text-brand-600 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <i data-lucide="languages" class="w-3.5 h-3.5 text-brand-600"></i>
              <span>${isBN ? 'English' : 'বাংলা'}</span>
            </button>
            <button onclick="window.AuthActions.toggleTheme()" class="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:text-brand-600">
              <i data-lucide="${store.theme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Developer Info (Requested by User) -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 space-y-2">
            <div class="flex items-center justify-center gap-1.5">
              <span class="text-[10px] font-bold uppercase text-slate-400">Developer:</span>
              <span class="font-black text-slate-800 dark:text-slate-100">MD. SALIM HOSSAIN</span>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2 pt-0.5 font-mono text-[11px]">
              <a href="tel:01737462871" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:text-brand-600 flex items-center gap-1">
                <i data-lucide="phone-call" class="w-3 h-3 text-brand-600"></i>
                <span>01737462871</span>
              </a>
              <a href="https://wa.me/8801737462871" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition" title="WhatsApp">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              </a>
              <a href="mailto:salimbd.ga@gmail.com" class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition" title="salimbd.ga@gmail.com">
                <i data-lucide="mail" class="w-3.5 h-3.5"></i>
              </a>
              <a href="https://fb.com/salim.naogaon" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 hover:bg-blue-100 transition" title="Facebook: fb.com/salim.naogaon">
                <i data-lucide="facebook" class="w-3.5 h-3.5"></i>
              </a>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  renderSRManagementSection(): string {
    const srs = store.getActiveSrs();
    const formerSrs = store.getDeletedSrs();
    const admins = store.db.admins || [];
    const isBN = store.lang === 'bn';

    return `
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="user-cog" class="w-6 h-6 text-brand-600"></i>
              <span>${store.t('srManagement')}</span>
            </h2>
            <p class="text-xs text-slate-500">
              ${isBN ? 'সেন্ট্রাল অ্যাডমিন নতুন এসআর তৈরি করতে পারেন। তথ্য তাৎক্ষণিকভাবে ডাটাবেজে সংরক্ষিত ও সিঙ্ক হয়।' : 'Admin creates SR accounts with Username & Password, synced with Firebase Realtime DB.'}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="window.AuthActions.openAddAdminModal()" class="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95">
              <i data-lucide="shield-plus" class="w-4 h-4"></i>
              <span>${store.t('createAdminBtn')}</span>
            </button>

            <button onclick="window.AuthActions.downloadTemplate()" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm">
              <i data-lucide="download" class="w-3.5 h-3.5 text-brand-600"></i>
              <span>${store.t('template')}</span>
            </button>

            <input type="file" id="excelSrFileInput" accept=".xlsx, .xls, .csv" class="hidden" onchange="window.AuthActions.handleUpload(event)" />
            <button onclick="document.getElementById('excelSrFileInput').click()" class="px-3.5 py-2 rounded-xl bg-tealbrand-600 hover:bg-tealbrand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <i data-lucide="file-up" class="w-3.5 h-3.5"></i>
              <span>${store.t('importExcel')}</span>
            </button>

            <button onclick="window.AuthActions.openAddSRModal()" class="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow flex items-center gap-1.5 hover:bg-brand-500 transition active:scale-95">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>${store.t('addSR')}</span>
            </button>
          </div>
        </div>

        <!-- Registered Admins List Section -->
        <div class="p-5 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <i data-lucide="shield" class="w-5 h-5 text-purple-600"></i>
              <h3 class="font-extrabold text-sm sm:text-base">${store.t('systemAdmins')} (${admins.length})</h3>
            </div>
            <button onclick="window.AuthActions.openAddAdminModal()" class="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-sm">
              ${store.t('createAdminBtn')}
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${admins.length === 0 ? `
              <div class="col-span-3 text-center py-6 text-slate-400 text-xs font-semibold">
                ${isBN ? 'কোনো অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি। "+ নতুন অ্যাডমিন" বাটনে ক্লিক করে তৈরি করুন।' : 'No Admin accounts found. Click "+ Create Admin" to add one.'}
              </div>
            ` : admins.map(a => `
              <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 shadow-sm flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-md">${a.id}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      ${isBN ? 'সেন্ট্রাল অ্যাডমিন' : 'Central Admin'}
                    </span>
                  </div>
                  <h4 class="font-black text-sm text-slate-900 dark:text-white">${a.name}</h4>
                  <div class="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-mono space-y-0.5">
                    <div class="flex justify-between text-slate-500">
                      <span>${isBN ? 'ইউজারনেম:' : 'Username:'}</span>
                      <span class="font-bold text-purple-700 dark:text-purple-300">${a.username}</span>
                    </div>
                    <div class="flex justify-between text-slate-500">
                      <span>${isBN ? 'পাসওয়ার্ড:' : 'Password:'}</span>
                      <span class="font-bold text-slate-800 dark:text-slate-100">${a.password}</span>
                    </div>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-2">${a.territory || 'HQ'} • <span class="font-mono">${a.phone}</span></p>
                </div>
                <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button onclick="window.AuthActions.deleteAdmin('${a.id}')" class="text-xs text-rose-500 hover:underline">
                    ${isBN ? 'মুছে ফেলুন' : 'Remove'}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SR Search Bar -->
        <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[260px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input 
              type="text" 
              id="srSearchInput"
              placeholder="${isBN ? 'এসআর আইডি, নাম, ফোন নম্বর অথবা ইউজারনেম দিয়ে খুঁজুন...' : 'Search SR by ID, name, mobile, username or territory...'}" 
              autocomplete="off"
              class="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-brand-500 transition" 
            />
            <button id="clearSrSearchBtn" class="hidden absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div id="srCountNotice" class="text-xs font-bold text-slate-500">
            ${store.t('showingSrs').replace('{count}', String(srs.length))}
          </div>
        </div>

        <div id="srCardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${srs.length === 0 ? `
            <div class="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <i data-lucide="user-x" class="w-12 h-12 mx-auto mb-2 opacity-30"></i>
              <p class="text-xs font-bold text-slate-600 dark:text-slate-300">
                ${isBN ? 'কোনো এসআর অ্যাকাউন্ট নিবন্ধিত নেই' : 'No Field SR Accounts Registered'}
              </p>
              <p class="text-[11px] text-slate-400 mt-1">
                ${isBN ? 'উপরে "+ নতুন এসআর আইডি তৈরি করুন" বাটনে ক্লিক করে এসআর একাউন্ট তৈরি করুন।' : 'Click "+ Create New SR Account" above to register sales representatives.'}
              </p>
            </div>
          ` : srs.map(sr => {
            const srOrders = (store.db.orders || []).filter(o => (o.srId || '').trim().toLowerCase() === (sr.id || '').trim().toLowerCase());
            const sales = srOrders.reduce((sum, o) => sum + o.grandTotal, 0);
            const assignedCount = (store.db.customers || []).filter(c => (c.assignedSrId || c.createdBy || '').trim().toLowerCase() === (sr.id || '').trim().toLowerCase()).length;
            return `
              <div 
                class="sr-account-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                data-id="${(sr.id || '').toLowerCase()}"
                data-name="${(sr.name || '').toLowerCase()}"
                data-username="${(sr.username || '').toLowerCase()}"
                data-phone="${(sr.phone || '').toLowerCase()}"
                data-territory="${(sr.territory || '').toLowerCase()}"
              >
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-mono font-black text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-md">${sr.id}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sr.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                      ${sr.active ? (isBN ? 'সক্রিয়' : 'Active') : (isBN ? 'নিষ্ক্রিয়' : 'Inactive')}
                    </span>
                  </div>
                  
                  <h4 class="font-extrabold text-base text-slate-900 dark:text-white">${sr.name}</h4>

                  <!-- Explicit Assigned Customer Count Badge -->
                  <div class="mt-2">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-extrabold text-xs shadow-xs">
                      <i data-lucide="users" class="w-3.5 h-3.5"></i>
                      <span>Assigned customer (${assignedCount})</span>
                    </span>
                  </div>
                  
                  <div class="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-mono">
                    <div class="flex justify-between text-slate-500">
                      <span>${isBN ? 'ইউজারনেম:' : 'Username:'}</span>
                      <span class="font-bold text-brand-700 dark:text-brand-300">${sr.username || sr.id.toLowerCase()}</span>
                    </div>
                    <div class="flex justify-between text-slate-500 mt-1">
                      <span>${isBN ? 'পাসওয়ার্ড:' : 'Password:'}</span>
                      <span class="font-bold text-slate-800 dark:text-slate-100">${sr.password || sr.pin || '123'}</span>
                    </div>
                  </div>

                  <div class="mt-3 space-y-1 text-xs text-slate-500">
                    <div>${isBN ? 'টেরিটরি:' : 'Territory:'} <b class="text-slate-800 dark:text-slate-200">${sr.territory}</b></div>
                    <div>${isBN ? 'মোবাইল:' : 'Phone:'} <b class="font-mono">${sr.phone}</b></div>
                    <div>${isBN ? 'টার্গেট:' : 'Target:'} <b>৳${(sr.target || 0).toLocaleString()}</b></div>
                    <div class="text-brand-600 font-black">
                      ${isBN ? `মোট বিক্রয়: ৳${sales.toLocaleString()} (${srOrders.length} টি অর্ডার)` : `Booked Sales: ৳${sales.toLocaleString()} (${srOrders.length} orders)`}
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button onclick="window.AuthActions.deleteSR('${sr.id}')" class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 text-xs" title="${isBN ? 'এসআর মুছুন' : 'Delete SR'}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${formerSrs.length > 0 ? `
        <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h3 class="font-extrabold text-sm text-slate-700 dark:text-slate-200 mb-1">
            ${isBN ? 'প্রাক্তন এসআর' : 'Former SRs'} (${formerSrs.length})
          </h3>
          <p class="text-[11px] text-slate-500 mb-3">
            ${isBN ? 'এরা লগইন করতে পারে না। তাদের অর্ডার ও বিক্রির তথ্য রিপোর্টে থাকে।' : 'They cannot log in. Their orders and sales stay in reports.'}
          </p>
          <div class="space-y-2">
            ${formerSrs.map(sr => `
              <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div class="min-w-0">
                  <span class="font-mono font-black text-slate-500">${sr.id}</span>
                  <span class="font-bold text-slate-800 dark:text-slate-100 ml-2">${sr.name}</span>
                  <span class="text-slate-400 ml-2">${sr.deletedAt ? new Date(sr.deletedAt).toLocaleDateString() : ''}</span>
                </div>
                <button onclick="window.AuthActions.restoreSR('${sr.id}')" class="px-3 py-1.5 rounded-lg border border-brand-300 text-brand-700 dark:text-brand-300 font-bold hover:bg-brand-50 dark:hover:bg-brand-950">
                  ${isBN ? 'আবার চালু করুন' : 'Restore'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  attachSearchListener() {
    const input = document.getElementById('srSearchInput') as HTMLInputElement | null;
    const clearBtn = document.getElementById('clearSrSearchBtn');
    const grid = document.getElementById('srCardsGrid');
    const notice = document.getElementById('srCountNotice');

    if (!input || !grid) return;

    const performFilter = (query: string) => {
      const q = query.trim().toLowerCase();
      const cards = grid.querySelectorAll<HTMLElement>('.sr-account-card');
      let visible = 0;

      cards.forEach(card => {
        const id = card.getAttribute('data-id') || '';
        const name = card.getAttribute('data-name') || '';
        const user = card.getAttribute('data-username') || '';
        const phone = card.getAttribute('data-phone') || '';
        const territory = card.getAttribute('data-territory') || '';

        const matches = !q || id.includes(q) || name.includes(q) || user.includes(q) || phone.includes(q) || territory.includes(q);
        if (matches) {
          card.style.display = '';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      if (notice) {
        notice.innerText = q ? `Found ${visible} SR(s) matching "${q}"` : `Showing ${cards.length} Field SR Accounts`;
      }
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

  openAddSRModal(onSaved: () => void) {
    const nextId = store.getNextSrId();
    const modalHtml = `
      <div id="srModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center justify-between pb-3 border-b">
            <h3 class="font-extrabold text-base">${store.t('addSR')}</h3>
            <button onclick="document.getElementById('srModal').remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form id="newSrForm" class="mt-4 space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">${store.t('srStaffId')}</label>
                <input type="text" id="newSrId" required value="${nextId}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">Full Name *</label>
                <input type="text" id="newSrName" required placeholder="Md. Aminul Islam" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">${store.t('srUsername')} *</label>
                <input type="text" id="newSrUsername" required placeholder="amin_sr" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">${store.t('srPassword')} *</label>
                <input type="text" id="newSrPassword" required value="123" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold" />
              </div>
            </div>

            <div>
              <label class="block font-bold mb-1">Mobile Phone *</label>
              <input type="tel" id="newSrPhone" required placeholder="017XXXXXXXX" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
            </div>

            <div>
              <label class="block font-bold mb-1">Assigned Territory *</label>
              <input type="text" id="newSrTerritory" required placeholder="Bogura Dairy Zone (শেরপুর)" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
            </div>

            <div>
              <label class="block font-bold mb-1">${store.t('monthlyTarget')}</label>
              <input type="number" id="newSrTarget" required value="350000" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onclick="document.getElementById('srModal').remove()" class="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-brand-600 text-white font-bold rounded-xl shadow-md">Create SR Account</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if ((window as any).lucide) (window as any).lucide.createIcons();

    const form = document.getElementById('newSrForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const srId = (document.getElementById('newSrId') as HTMLInputElement).value.trim();
        const name = (document.getElementById('newSrName') as HTMLInputElement).value.trim();
        const username = (document.getElementById('newSrUsername') as HTMLInputElement).value.trim().toLowerCase();
        const password = (document.getElementById('newSrPassword') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('newSrPhone') as HTMLInputElement).value.trim();
        const territory = (document.getElementById('newSrTerritory') as HTMLInputElement).value.trim();
        const target = Number((document.getElementById('newSrTarget') as HTMLInputElement).value) || 300000;

        if (store.isSrIdUsed(srId)) {
          showToast('This SR ID was already used (or belongs to a deleted SR). Use a new ID.', 'error');
          return;
        }
        if (store.getActiveSrs().some(x => x.username === username)) {
          showToast('This username is already taken by another SR!', 'error');
          return;
        }

        const newSr: SRUser = {
          id: srId,
          username: username,
          password: password,
          name: name,
          phone: phone,
          territory: territory,
          target: target,
          active: true
        };

        store.db.srs.push(newSr);
        store.saveDatabase();
        document.getElementById('srModal')?.remove();
        onSaved();
      });
    }
  }

  openAddAdminModal(onSaved: () => void) {
    const adminsCount = (store.db.admins || []).length;
    const nextId = `ADMIN${String(adminsCount + 1).padStart(2, '0')}`;
    const modalHtml = `
      <div id="adminCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-200 dark:border-purple-900">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
              <h3 class="font-extrabold text-base">Create New Admin Account</h3>
            </div>
            <button onclick="document.getElementById('adminCreateModal').remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form id="newAdminForm" class="mt-4 space-y-3.5 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">Admin ID</label>
                <input type="text" id="newAdminId" required value="${nextId}" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">Admin Full Name *</label>
                <input type="text" id="newAdminName" required placeholder="e.g. Md. Tariqul Islam" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">Login Username *</label>
                <input type="text" id="newAdminUsername" required placeholder="tariq_admin" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold" />
              </div>
              <div>
                <label class="block font-bold mb-1">Login Password *</label>
                <input type="text" id="newAdminPassword" required value="123" placeholder="Set Password" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold mb-1">Mobile Phone *</label>
                <input type="tel" id="newAdminPhone" required placeholder="017XXXXXXXX" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
              </div>
              <div>
                <label class="block font-bold mb-1">Department / Branch *</label>
                <input type="text" id="newAdminTerritory" required value="Head Office (Central HQ)" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium" />
              </div>
            </div>

            <div>
              <label class="block font-bold mb-1">Email (Optional)</label>
              <input type="email" id="newAdminEmail" placeholder="admin@bhagroltd.com" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono" />
            </div>

            <div class="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300">
              ℹ️ এই অ্যাডমিন অ্যাকাউন্টটি তৈরি করার সাথে সাথেই Firebase Realtime Database এ সিঙ্ক হয়ে যাবে এবং যেকোনো ডিভাইস থেকে এই ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করা যাবে।
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onclick="document.getElementById('adminCreateModal').remove()" class="px-4 py-2 border rounded-xl font-bold">Cancel</button>
              <button type="submit" class="px-5 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl shadow-md">Create Admin Account</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if ((window as any).lucide) (window as any).lucide.createIcons();

    const form = document.getElementById('newAdminForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const adminId = (document.getElementById('newAdminId') as HTMLInputElement).value.trim();
        const name = (document.getElementById('newAdminName') as HTMLInputElement).value.trim();
        const username = (document.getElementById('newAdminUsername') as HTMLInputElement).value.trim().toLowerCase();
        const password = (document.getElementById('newAdminPassword') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('newAdminPhone') as HTMLInputElement).value.trim();
        const territory = (document.getElementById('newAdminTerritory') as HTMLInputElement).value.trim();
        const email = (document.getElementById('newAdminEmail') as HTMLInputElement).value.trim() || `${username}@bhagroltd.com`;

        if (!store.db.admins) store.db.admins = [];

        // Check if username already exists
        if (store.db.admins.some(a => a.username === username)) {
          showToast('This username is already taken by another admin!', 'error');
          return;
        }

        const newAdmin: AdminUser = {
          id: adminId,
          username: username,
          password: password,
          name: name,
          phone: phone,
          territory: territory,
          email: email,
          role: 'admin'
        };

        store.db.admins.push(newAdmin);
        store.saveDatabase();
        document.getElementById('adminCreateModal')?.remove();
        onSaved();
      });
    }
  }
}

export const authModule = new AuthModule();
