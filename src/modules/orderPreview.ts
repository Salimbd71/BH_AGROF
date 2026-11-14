/**
 * BH Agro Ltd. - Order preview dialog (Invoice Preview + Admin edit)
 *  - অ্যাডমিন: নিচে Print, Download, Edit, Close আইকন
 *  - এসআর: শুধু প্রিভিউ (Close ছাড়া কোনো অ্যাকশন নেই; প্রিন্ট/ডাউনলোড/এডিট/ডিলিট নেই)
 */
import { store, Order, OrderItem } from './store.ts';
import { buildInvoiceHtml, printInvoiceDocument, generateInvoicePDF, invoiceFileName } from './invoice.ts';
import { calcFreeQty, unitsNeeded } from './pricing.ts';
import { showToast } from './ui.ts';

const MODAL_ID = 'orderPreviewModal';
const INVOICE_WIDTH = 794;

interface DraftItem {
  productId: string; name: string; packSize: string; tp: number; discountPct: number; adp: number;
  qty0: number; free0: number; total0: number;
  qty: number; free: number; total: number;
}
interface Draft { items: DraftItem[]; discount: number; notes: string }

let currentId = '';
let mode: 'preview' | 'edit' = 'preview';
let draft: Draft | null = null;

const isAdmin = () => store.authSession.role === 'admin';
const isBn = () => store.lang === 'bn';
const money = (n: number) => (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function getOrder(): Order | undefined {
  const ord = store.db.orders.find(o => o.id === currentId);
  if (!ord) return undefined;
  // এসআর শুধু নিজের অর্ডার দেখতে পারবে
  if (!isAdmin() && ord.srId !== store.authSession.user?.id) return undefined;
  return ord;
}

function iconBtn(icon: string, label: string, onclick: string, cls: string): string {
  return `<button type="button" onclick="${onclick}" title="${label}" aria-label="${label}"
    class="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl ${cls} min-w-[68px] active:scale-95 transition">
      <i data-lucide="${icon}" class="w-5 h-5"></i><span class="text-[10px] font-bold leading-none">${label}</span>
    </button>`;
}

function refreshIcons() {
  (window as any).App?.refreshIcons?.();
}

/** প্রিভিউ পর্দার প্রস্থে ঢোকাতে স্কেল */
function fitInvoice() {
  const body = document.getElementById('orderPreviewBody');
  const wrap = document.getElementById('invoiceScaleWrap');
  const doc = document.getElementById('invoicePreviewDoc');
  if (!body || !wrap || !doc) return;
  const avail = body.clientWidth - 16;
  const k = Math.min(1, avail > 0 ? avail / INVOICE_WIDTH : 1);
  doc.style.transformOrigin = 'top left';
  doc.style.transform = `scale(${k})`;
  wrap.style.width = `${INVOICE_WIDTH * k}px`;
  wrap.style.height = `${doc.offsetHeight * k}px`;
}

// ---------------- Draft (edit mode) ----------------
function makeDraft(ord: Order): Draft {
  return {
    items: ord.items.map(it => ({
      productId: it.productId, name: it.name, packSize: it.packSize, tp: it.tp,
      discountPct: it.discountPct || 0,
      adp: typeof it.adp === 'number' ? it.adp : it.tp,
      qty0: it.qty, free0: it.freeQty || 0, total0: it.total,
      qty: it.qty, free: it.freeQty || 0, total: it.total
    })),
    discount: ord.discount || 0,
    notes: ord.notes || ''
  };
}

function recalc(d: DraftItem) {
  if (d.qty === d.qty0) { d.free = d.free0; d.total = d.total0; return; }
  const prod = store.db.products.find(p => p.id === d.productId);
  d.free = prod ? calcFreeQty(prod, d.qty) : d.free0;
  d.total = Math.round(d.qty * d.tp * (100 - d.discountPct) / 100);
}

/** এই পরিমাণ স্টকে কুলায় কিনা (অর্ডারের আগের পরিমাণ ফেরত ধরে) */
function canQty(d: DraftItem, q: number): boolean {
  if (q <= 0) return true;
  const prod = store.db.products.find(p => p.id === d.productId);
  if (!prod) return q <= d.qty0;
  return unitsNeeded(prod, q) <= prod.stock + d.qty0 + d.free0;
}

function draftTotals() {
  const items = draft!.items.filter(i => i.qty > 0);
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tpSubtotal = items.reduce((s, i) => s + i.qty * i.tp, 0);
  const special = Math.max(0, draft!.discount || 0);
  return {
    count: items.length, subtotal, tpSubtotal,
    productDiscount: Math.max(0, tpSubtotal - subtotal), special,
    free: items.reduce((s, i) => s + i.free, 0),
    grand: Math.max(0, subtotal - special)
  };
}

function totalsHtml(): string {
  const t = draftTotals();
  const row = (l: string, v: string, cls = '') => `<div class="flex justify-between ${cls}"><span>${l}</span><span>${v}</span></div>`;
  return `
    <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
      ${t.productDiscount > 0 ? row(isBn() ? 'TP অনুযায়ী মোট' : 'Total at TP', '৳' + money(t.tpSubtotal), 'text-slate-500') : ''}
      ${t.productDiscount > 0 ? row(isBn() ? 'প্রোডাক্ট ছাড়' : 'Product discount', '-৳' + money(t.productDiscount), 'text-rose-500 font-bold') : ''}
      ${row(isBn() ? 'সাব-টোটাল (ADP)' : 'Sub total (ADP)', '৳' + money(t.subtotal), 'font-bold')}
      ${t.free > 0 ? row(isBn() ? 'ফ্রি ইউনিট' : 'Free units', String(t.free), 'text-tealbrand-600 font-bold') : ''}
      ${t.special > 0 ? row(isBn() ? 'স্পেশাল ডিসকাউন্ট' : 'Special discount', '-৳' + money(t.special), 'text-rose-500 font-bold') : ''}
      ${row(isBn() ? 'নিট পেয়েবল' : 'Net payable', '৳' + money(t.grand), 'text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700')}
    </div>`;
}

function editorBodyHtml(ord: Order): string {
  const d = draft!;
  const inputCls = 'px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';
  return `
    <div class="p-3 sm:p-4 space-y-3">
      <div class="text-xs text-slate-500">
        <span class="font-mono font-bold text-brand-700">${ord.customerId}</span> ${ord.customerShopName || ord.customerName}
        • ${ord.srName} • ${ord.date}
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table class="w-full text-xs min-w-[560px]">
          <thead>
            <tr class="text-left font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
              <th class="p-2">${isBn() ? 'প্রোডাক্ট' : 'Product'}</th>
              <th class="p-2 text-center">${isBn() ? 'পরিমাণ' : 'Qty'}</th>
              <th class="p-2 text-center">${isBn() ? 'ফ্রি' : 'Free'}</th>
              <th class="p-2 text-right">ADP</th>
              <th class="p-2 text-right">${isBn() ? 'মোট' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${d.items.map((it, i) => `
              <tr class="${it.qty === 0 ? 'opacity-40' : ''}">
                <td class="p-2">
                  <div class="font-bold text-slate-900 dark:text-white ${it.qty === 0 ? 'line-through' : ''}">${it.name}</div>
                  <div class="text-[11px] text-slate-400">${it.packSize}${it.discountPct > 0 ? ` • -${it.discountPct}%` : ''}</div>
                </td>
                <td class="p-2">
                  <div class="flex items-center justify-center gap-1">
                    <button type="button" onclick="window.OrderPreviewActions.stepQty(${i}, -1)" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 font-black">−</button>
                    <input type="number" min="0" id="editQty-${i}" value="${it.qty}" onchange="window.OrderPreviewActions.setQty(${i}, this.value)" class="w-14 text-center font-bold ${inputCls}" />
                    <button type="button" onclick="window.OrderPreviewActions.stepQty(${i}, 1)" class="w-8 h-8 rounded-lg ${canQty(it, it.qty + 1) ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} font-black">+</button>
                  </div>
                </td>
                <td class="p-2 text-center font-bold text-tealbrand-600">${it.free > 0 ? '+' + it.free : '-'}</td>
                <td class="p-2 text-right">৳${money(it.adp)}</td>
                <td class="p-2 text-right font-black">৳${it.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-500 mb-1">${isBn() ? 'স্পেশাল ডিসকাউন্ট (৳)' : 'Special discount (৳)'}</label>
          <input type="number" min="0" id="editDiscount" value="${d.discount || ''}" placeholder="0" oninput="window.OrderPreviewActions.setDiscount(this.value)" class="w-full ${inputCls}" />
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-500 mb-1">${isBn() ? 'মন্তব্য / নোট' : 'Notes'}</label>
          <input type="text" id="editNotes" value="${(d.notes || '').replace(/"/g, '&quot;')}" oninput="window.OrderPreviewActions.setNotes(this.value)" class="w-full ${inputCls}" />
        </div>
      </div>
      <div id="orderEditTotals">${totalsHtml()}</div>
      <p class="text-[11px] text-slate-500">${isBn()
        ? 'পরিমাণ বদলালে ফ্রি ইউনিট বর্তমান ফ্রি-ধাপ অনুযায়ী আবার হিসাব হয় এবং স্টক নিজে থেকে মিলে যায়। যে আইটেমের পরিমাণ বদলায়নি তার ছাড়/ফ্রি অপরিবর্তিত থাকে।'
        : 'When a quantity changes, free units are recalculated from the current free tiers and stock is adjusted automatically. Unchanged lines keep their original discount/free units.'}</p>
    </div>`;
}

// ---------------- Modal ----------------
function paint() {
  const modal = document.getElementById(MODAL_ID);
  const ord = getOrder();
  if (!modal || !ord) return;
  const admin = isAdmin();
  const editing = mode === 'edit' && admin;

  const title = editing
    ? (isBn() ? 'অর্ডার এডিট' : 'Edit Order')
    : (isBn() ? 'ইনভয়েস প্রিভিউ' : 'Invoice Preview');

  let footer = '';
  if (editing) {
    footer = [
      iconBtn('check', isBn() ? 'সেভ' : 'Save', 'window.OrderPreviewActions.saveEdit()', 'bg-brand-600 text-white hover:bg-brand-500'),
      iconBtn('undo-2', isBn() ? 'বাতিল' : 'Cancel', 'window.OrderPreviewActions.cancelEdit()', 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'),
      iconBtn('x', isBn() ? 'বন্ধ' : 'Close', 'window.OrderPreviewActions.close()', 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200')
    ].join('');
  } else if (admin) {
    footer = [
      iconBtn('printer', isBn() ? 'প্রিন্ট' : 'Print', 'window.OrderPreviewActions.print()', 'bg-brand-600 text-white hover:bg-brand-500'),
      store.isOrderConfirmed(ord) ? '' : iconBtn('check-circle', isBn() ? 'কনফার্ম' : 'Confirm', 'window.OrderPreviewActions.confirm()', 'bg-emerald-600 text-white hover:bg-emerald-500'),
      iconBtn('download', isBn() ? 'ডাউনলোড' : 'Download', 'window.OrderPreviewActions.download()', 'bg-sky-600 text-white hover:bg-sky-500'),
      iconBtn('pencil', isBn() ? 'এডিট' : 'Edit', 'window.OrderPreviewActions.edit()', 'bg-amber-500 text-white hover:bg-amber-400'),
      iconBtn('x', isBn() ? 'বন্ধ' : 'Close', 'window.OrderPreviewActions.close()', 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200')
    ].join('');
  } else {
    // এসআর: শুধু প্রিভিউ
    footer = iconBtn('x', isBn() ? 'বন্ধ' : 'Close', 'window.OrderPreviewActions.close()', 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200');
  }

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[calc(100dvh-1rem)] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
      <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">${title}</h3>
          <p class="text-[11px] text-slate-500 font-mono truncate">${ord.id}${ord.editedAt ? ` • ${isBn() ? 'এডিট করা' : 'edited'}` : ''}</p>
        </div>
      </div>
      <div id="orderPreviewBody" class="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 ${editing ? '' : 'p-2 sm:p-4'}">
        ${editing
          ? editorBodyHtml(ord)
          : `<div id="invoiceScaleWrap" class="mx-auto shadow-lg">${buildInvoiceHtml(ord, 'invoicePreviewDoc', INVOICE_WIDTH + 'px')}</div>`}
      </div>
      <div class="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 sm:gap-3 flex-wrap" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));">
        ${footer}
      </div>
    </div>`;
  refreshIcons();
  if (!editing) fitInvoice();
}

export function openOrderPreview(orderId: string) {
  currentId = orderId;
  mode = 'preview';
  draft = null;
  if (!getOrder()) {
    showToast(isBn() ? 'অর্ডার পাওয়া যায়নি' : 'Order not found!', 'error');
    return;
  }
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4';
    modal.addEventListener('click', (e) => { if (e.target === modal) closePreview(); });
    document.body.appendChild(modal);
  }
  paint();
}

function closePreview() {
  document.getElementById(MODAL_ID)?.remove();
  draft = null;
  mode = 'preview';
}

function requireAdmin(): Order | undefined {
  if (!isAdmin()) return undefined; // এসআর কখনো প্রিন্ট/ডাউনলোড/এডিট করতে পারবে না
  return getOrder();
}

let listenersAttached = false;
function attachGlobalListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener('resize', () => { if (document.getElementById(MODAL_ID) && mode === 'preview') fitInvoice(); });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && document.getElementById(MODAL_ID)) closePreview();
  });
}

(window as any).OrderPreviewActions = {
  close: () => closePreview(),
  print: () => { const o = requireAdmin(); if (o) printInvoiceDocument(o); },
  confirm: async () => {
    const o = requireAdmin();
    if (!o) return;
    const ok = await store.confirmOrder(o.id);
    showToast(ok
      ? (isBn() ? `অর্ডার ${o.id} নিশ্চিত হয়েছে` : `Order ${o.id} confirmed`)
      : (isBn() ? 'কনফার্ম সংরক্ষণ হয়নি। ইন্টারনেট ও Firebase Rules দেখুন।' : 'Could not save confirmation. Check internet and Firebase rules.'),
      ok ? 'success' : 'error');
    if (document.getElementById(MODAL_ID)) paint();
    (window as any).App?.render?.();
  },
  download: () => { const o = requireAdmin(); if (o) generateInvoicePDF(o, showToast); },
  edit: () => {
    const o = requireAdmin();
    if (!o) return;
    draft = makeDraft(o);
    mode = 'edit';
    paint();
  },
  cancelEdit: () => { mode = 'preview'; draft = null; paint(); },
  stepQty: (i: number, delta: number) => {
    if (!draft || !draft.items[i]) return;
    (window as any).OrderPreviewActions.setQty(i, draft.items[i].qty + delta);
  },
  setQty: (i: number, raw: string | number) => {
    if (!draft || !isAdmin() || !draft.items[i]) return;
    const it = draft.items[i];
    let q = Math.max(0, Math.floor(Number(raw) || 0));
    if (!canQty(it, q)) {
      const prod = store.db.products.find(p => p.id === it.productId);
      const need = prod ? unitsNeeded(prod, q) : q;
      showToast(isBn()
        ? `স্টকের কারণে বাড়ানো যাবে না (ফ্রিসহ ${need}টি লাগবে)`
        : `Stock limit: ${need} units needed incl. free`, 'error');
      while (q > 0 && !canQty(it, q)) q--;
    }
    it.qty = q;
    recalc(it);
    paint();
  },
  setDiscount: (v: string) => {
    if (!draft) return;
    draft.discount = Math.max(0, Number(v) || 0);
    const el = document.getElementById('orderEditTotals');
    if (el) el.innerHTML = totalsHtml();
  },
  setNotes: (v: string) => { if (draft) draft.notes = v; },
  saveEdit: () => {
    const ord = requireAdmin();
    if (!ord || !draft) return;
    const active = draft.items.filter(i => i.qty > 0);
    if (active.length === 0) {
      showToast(isBn() ? 'অর্ডারে অন্তত একটি আইটেম থাকতে হবে। পুরো অর্ডার বাদ দিতে ডিলিট করুন।' : 'An order needs at least one item. Use Delete to remove the whole order.', 'error');
      return;
    }
    // ১) স্টক যাচাই (কোনো পরিবর্তন করার আগে)
    for (const it of draft.items) {
      const prod = store.db.products.find(p => p.id === it.productId);
      if (!prod) continue;
      const units1 = it.qty > 0 ? it.qty + it.free : 0;
      if (prod.stock + it.qty0 + it.free0 - units1 < 0) {
        showToast(isBn() ? `${it.name}: স্টকে কুলাচ্ছে না` : `${it.name}: not enough stock`, 'error');
        return;
      }
    }
    // ২) স্টক সমন্বয় (কেনা + ফ্রি)
    draft.items.forEach(it => {
      const prod = store.db.products.find(p => p.id === it.productId);
      if (!prod) return;
      const units1 = it.qty > 0 ? it.qty + it.free : 0;
      prod.stock = prod.stock + it.qty0 + it.free0 - units1;
    });
    // ৩) অর্ডার আপডেট
    const t = draftTotals();
    ord.items = active.map((it): OrderItem => ({
      productId: it.productId, name: it.name, packSize: it.packSize, qty: it.qty, freeQty: it.free,
      tp: it.tp, discountPct: it.discountPct, adp: it.adp, total: it.total
    }));
    ord.subtotal = t.subtotal;
    ord.tpSubtotal = t.tpSubtotal;
    ord.productDiscount = t.productDiscount;
    ord.discount = t.special;
    ord.grandTotal = t.grand;
    ord.notes = draft.notes;
    ord.editedAt = new Date().toISOString();
    store.saveDatabase();
    showToast(isBn() ? 'অর্ডার আপডেট হয়েছে, স্টক মিলিয়ে নেওয়া হয়েছে' : 'Order updated and stock adjusted');
    mode = 'preview';
    draft = null;
    paint();
    (window as any).App?.render?.();
  }
};

attachGlobalListeners();
