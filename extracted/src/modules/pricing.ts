/**
 * BH Agro Ltd. - Pricing engine (একটাই জায়গায় সব হিসাব)
 *
 *  ছাড় (%):     প্রোডাক্টের নিজস্ব শতাংশ। শুধু দাম দেওয়া ইউনিটে লাগে।
 *  ADP:          After Discount Price = TP - ছাড়
 *  লাইন টোটাল:   পরিমাণ x ADP (পূর্ণ টাকায় একবার রাউন্ড)
 *  ফ্রি ইউনিট:   অ্যাডমিনের সেট করা ধাপ (tier), ক্রেতা যে সর্বোচ্চ ধাপে পৌঁছেছে শুধু সেটাই।
 *                যেমন 10+1, 20+2, 30+4। ফ্রি ইউনিটের দাম শূন্য।
 *  স্টক:         কেনা পরিমাণ + ফ্রি, দুটোই স্টক থেকে কমে।
 */
import type { Product } from './store.ts';

export interface FreeTier {
  minQty: number;
  free: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** ছাড় %: প্রোডাক্টে সেট থাকলে সেটা; না থাকলে পুরনো অফার লেখা থেকে (যেমন "5% Cash Discount"); নইলে ০ */
export function getDiscountPct(p: Pick<Product, 'discountPct' | 'tradeOffer'>): number {
  if (typeof p.discountPct === 'number' && p.discountPct >= 0) return Math.min(100, p.discountPct);
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(p.tradeOffer || '');
  return m ? Math.min(100, parseFloat(m[1])) : 0;
}

/** ফ্রি ধাপের তালিকা (ছোট থেকে বড়)। freeTiers না থাকলে পুরনো "N+M" অফার থেকে N+M ও 2N+2M ধাপ */
export function getFreeTiers(p: Pick<Product, 'freeTiers' | 'tradeOffer'>): FreeTier[] {
  let tiers: FreeTier[] = [];
  if (Array.isArray(p.freeTiers)) {
    tiers = p.freeTiers;
  } else {
    const m = /(\d+)\s*\+\s*(\d+)/.exec(p.tradeOffer || '');
    if (m) {
      const n = parseInt(m[1], 10);
      const f = parseInt(m[2], 10);
      if (n > 0 && f > 0) tiers = [{ minQty: n, free: f }, { minQty: 2 * n, free: 2 * f }];
    }
  }
  return tiers
    .filter(t => t && t.minQty > 0 && t.free > 0)
    .map(t => ({ minQty: Math.floor(t.minQty), free: Math.floor(t.free) }))
    .sort((a, b) => a.minQty - b.minQty);
}

/** ফ্রি ইউনিট: ক্রেতা যে সর্বোচ্চ ধাপে পৌঁছেছে শুধু সেটা */
export function calcFreeQty(p: Pick<Product, 'freeTiers' | 'tradeOffer'>, qty: number): number {
  let free = 0;
  getFreeTiers(p).forEach(t => { if (qty >= t.minQty) free = t.free; });
  return free;
}

/** ADP = TP - ছাড় (২ দশমিক পর্যন্ত) */
export function calcAdp(p: Pick<Product, 'tradePrice' | 'discountPct' | 'tradeOffer'>): number {
  return r2(p.tradePrice * (100 - getDiscountPct(p)) / 100);
}

/** লাইন টোটাল = পরিমাণ x ADP, পূর্ণ টাকায় একবার রাউন্ড */
export function calcLineTotal(p: Pick<Product, 'tradePrice' | 'discountPct' | 'tradeOffer'>, qty: number): number {
  return Math.round(qty * p.tradePrice * (100 - getDiscountPct(p)) / 100);
}

/** স্টক থেকে যত ইউনিট যাবে: কেনা + ফ্রি */
export function unitsNeeded(p: Pick<Product, 'freeTiers' | 'tradeOffer'>, qty: number): number {
  return qty + calcFreeQty(p, qty);
}

/** স্টক অনুযায়ী সর্বোচ্চ কত পরিমাণ অর্ডার করা যায় (কেনা + ফ্রি <= স্টক) */
export function maxOrderableQty(p: Pick<Product, 'freeTiers' | 'tradeOffer' | 'stock'>): number {
  for (let q = Math.max(0, p.stock); q >= 1; q--) {
    if (unitsNeeded(p, q) <= p.stock) return q;
  }
  return 0;
}

/** পরের ধাপ পেতে আর কত লাগবে (নেই হলে null) */
export function nextTierHint(p: Pick<Product, 'freeTiers' | 'tradeOffer'>, qty: number): { more: number; free: number } | null {
  const next = getFreeTiers(p).find(t => t.minQty > qty);
  return next ? { more: next.minQty - qty, free: next.free } : null;
}

/** দেখানোর লেখা: "10+1 · 20+2" */
export function formatTiers(tiers: FreeTier[]): string {
  return tiers.map(t => `${t.minQty}+${t.free}`).join(' · ');
}

/** টেক্সট থেকে ধাপ: "10+1, 20+2" বা "10=1; 20=2" */
export function parseTiers(text: string): FreeTier[] {
  const out: FreeTier[] = [];
  const re = /(\d+)\s*[+=:]\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ''))) {
    const minQty = parseInt(m[1], 10);
    const free = parseInt(m[2], 10);
    if (minQty > 0 && free > 0) out.push({ minQty, free });
  }
  const byQty = new Map<number, FreeTier>();
  out.forEach(t => byQty.set(t.minQty, t));
  return Array.from(byQty.values()).sort((a, b) => a.minQty - b.minQty);
}

/** অর্ডারের আইটেমের জন্য সম্পূর্ণ হিসাব */
export function priceLine(p: Product, qty: number) {
  const discountPct = getDiscountPct(p);
  return {
    discountPct,
    adp: calcAdp(p),
    freeQty: calcFreeQty(p, qty),
    total: calcLineTotal(p, qty),
    tpTotal: p.tradePrice * qty
  };
}
