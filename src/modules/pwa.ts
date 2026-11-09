/**
 * BH Agro - PWA support
 *  - Service worker রেজিস্ট্রেশন + আপডেট বার্তা
 *  - ইনস্টল প্রম্পট (Android/Desktop) ও iPhone-এর জন্য নির্দেশ
 *  - অফলাইন / সিঙ্ক অবস্থার ব্যানার (#netBanner, পেজের একদম উপরে)
 */
import { store } from './store.ts';

const INSTALL_DISMISS_KEY = 'bhagro_install_dismissed_v1';

let deferredPrompt: any = null;
let waitingWorker: ServiceWorker | null = null;

const isBn = () => store.lang === 'bn';
const isStandalone = () =>
  (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
  (typeof navigator !== 'undefined' && (navigator as any).standalone === true);
const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
const installDismissed = () => {
  try { return localStorage.getItem(INSTALL_DISMISS_KEY) === '1'; } catch { return false; }
};

function bar(color: string, inner: string): string {
  return `<div class="${color} text-xs font-bold px-3 py-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">${inner}</div>`;
}

export function renderNetBanner() {
  const el = document.getElementById('netBanner');
  if (!el) return;
  const offline = (typeof navigator !== 'undefined' && navigator.onLine === false) || store.cloudConnected === false;
  const pending = store.hasPendingSync;
  const parts: string[] = [];

  if (waitingWorker) {
    parts.push(bar('bg-emerald-600 text-white', `
      <span>${isBn() ? 'অ্যাপের নতুন সংস্করণ এসেছে' : 'A new version is available'}</span>
      <button onclick="window.PwaActions.applyUpdate()" class="px-3 py-0.5 rounded-lg bg-white text-emerald-700 font-black">${isBn() ? 'আপডেট করুন' : 'Update'}</button>`));
  }
  if (offline) {
    parts.push(bar('bg-amber-500 text-slate-900', `
      <span>${isBn()
        ? 'নেট নেই (অফলাইন): আপনার কাজ ফোনে সেভ হচ্ছে, নেট এলে নিজে থেকে জমা হবে'
        : 'You are offline: your work is saved on this device and will sync automatically when you are back online'}</span>
      ${pending ? `<span class="px-2 py-0.5 rounded-full bg-slate-900/15">${isBn() ? 'জমা বাকি আছে' : 'Pending sync'}</span>` : ''}`));
  } else if (pending) {
    parts.push(bar('bg-sky-600 text-white', `<span>${isBn() ? 'ডাটা জমা (সিঙ্ক) হচ্ছে...' : 'Syncing your data...'}</span>`));
  }
  if (!isStandalone() && !installDismissed()) {
    if (deferredPrompt) {
      parts.push(bar('bg-slate-800 text-white', `
        <span>${isBn() ? 'অ্যাপের মতো ব্যবহার করতে ইনস্টল করুন' : 'Install this app for quick, full-screen access'}</span>
        <button onclick="window.PwaActions.install()" class="px-3 py-0.5 rounded-lg bg-brand-500 text-white font-black">${isBn() ? 'ইনস্টল' : 'Install'}</button>
        <button onclick="window.PwaActions.dismissInstall()" class="px-2 py-0.5 rounded-lg bg-white/15">${isBn() ? 'পরে' : 'Later'}</button>`));
    } else if (isIos()) {
      parts.push(bar('bg-slate-800 text-white', `
        <span>${isBn() ? 'ইনস্টল করতে: Share বাটন চেপে "Add to Home Screen" বেছে নিন' : 'To install: tap Share, then "Add to Home Screen"'}</span>
        <button onclick="window.PwaActions.dismissInstall()" class="px-2 py-0.5 rounded-lg bg-white/15">${isBn() ? 'বন্ধ' : 'Close'}</button>`));
    }
  }
  el.innerHTML = parts.join('');
}

(window as any).PwaActions = {
  applyUpdate: () => {
    if (waitingWorker) waitingWorker.postMessage('SKIP_WAITING');
  },
  install: async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch { /* ignore */ }
    deferredPrompt = null;
    renderNetBanner();
  },
  dismissInstall: () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, '1'); } catch { /* ignore */ }
    renderNetBanner();
  }
};

export function initPwa() {
  window.addEventListener('online', renderNetBanner);
  window.addEventListener('offline', renderNetBanner);
  window.addEventListener('bhagro:net', renderNetBanner);
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    renderNetBanner();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    renderNetBanner();
  });
  renderNetBanner();

  // Service worker শুধু প্রোডাকশন বিল্ডে (ডেভেলপমেন্টে ক্যাশ বিভ্রান্তি এড়াতে)
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // প্রথমবার ইনস্টলে রিলোড নয়; শুধু আপডেট চালু হলে রিলোড
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting;
        renderNetBanner();
      }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorker = nw;
            renderNetBanner();
          }
        });
      });
      // অ্যাপ আবার সামনে এলে নতুন সংস্করণ আছে কিনা দেখা
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(err => console.warn('Service worker registration failed:', err));
  });
}
