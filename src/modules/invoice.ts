/**
 * BH Agro Ltd. - Invoice builder, Print & PDF download
 * Invoice সবসময় English-এ। A4 পেজে ভাগ হয় (বেশি অর্ডার হলে ২য় পেজে যায়), প্রতি পেজে একই হেডিং + পেজ নম্বর।
 * কলাম: Sl, Product, Pack, Qty, Free, TP, Disc %, ADP, Amount
 * নিচে: TP মোট, প্রোডাক্ট ছাড়, ADP মোট, স্পেশাল ডিসকাউন্ট, নিট পেয়েবল
 * ফাইলের নাম: <customer_name>_<customer_id>_<ddmmyyyy>.pdf  (যেমন Amin_feed_BH0002_06112026.pdf)
 */

import type { Order } from './store.ts';

const money = (n: number) => (n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export function invoiceFileName(ord: Order): string {
  const rawCustName = (ord.customerShopName || ord.customerName || 'Customer').trim();
  const cleanCustName = rawCustName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
  const custId = ord.customerId || 'BH0000';
  let ddmmyyyy = '';
  if (ord.date && ord.date.includes('-')) {
    const parts = ord.date.split('-'); // [YYYY, MM, DD]
    ddmmyyyy = `${parts[2]}${parts[1]}${parts[0]}`;
  } else {
    const now = new Date();
    ddmmyyyy = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  }
  return `${cleanCustName}_${custId}_${ddmmyyyy}.pdf`;
}

/** অর্ডারের সারাংশ সংখ্যা (পুরনো অর্ডারেও কাজ করে) */
export function invoiceTotals(ord: Order) {
  const subtotal = ord.subtotal || 0;
  const tpSubtotal = typeof ord.tpSubtotal === 'number' ? ord.tpSubtotal : subtotal;
  const productDiscount = typeof ord.productDiscount === 'number' ? ord.productDiscount : Math.max(0, tpSubtotal - subtotal);
  const special = ord.discount || 0;
  const totalQty = ord.items.reduce((s, it) => s + it.qty, 0);
  const totalFree = ord.items.reduce((s, it) => s + (it.freeQty || 0), 0);
  const freeValue = ord.items.reduce((s, it) => s + (it.freeQty || 0) * it.tp, 0);
  return { subtotal, tpSubtotal, productDiscount, special, totalQty, totalFree, freeValue, net: ord.grandTotal };
}

// ---------------- A4 পেজ লেআউট ----------------
const PAGE_W = 794;          // A4 @96dpi
const PAGE_H = 1122;         // A4 @96dpi (297mm)
const PAD_X = 32;
const PAD_TOP = 28;
const FOOT_RESERVE = 46;     // পেজ নম্বর ফুটারের জায়গা
const CONTENT_W = PAGE_W - PAD_X * 2;
const MAX_H = PAGE_H - PAD_TOP - FOOT_RESERVE;
const FONT = 'Arial,Helvetica,sans-serif';

const COLS: { label: string; w: string; align: string }[] = [
  { label: 'Sl', w: '28px', align: 'center' },
  { label: 'Product Description', w: 'auto', align: 'left' },
  { label: 'Pack', w: '58px', align: 'left' },
  { label: 'Qty', w: '38px', align: 'center' },
  { label: 'Free', w: '38px', align: 'center' },
  { label: 'TP (Tk)', w: '62px', align: 'right' },
  { label: 'Disc %', w: '54px', align: 'center' },
  { label: 'ADP (Tk)', w: '62px', align: 'right' },
  { label: 'Amount (Tk)', w: '80px', align: 'right' }
];

const tdS = (inner: string, align: string = 'right', extra: string = '') =>
  `<td style="padding:6px 6px;border:1px solid #e2e8f0;text-align:${align};word-wrap:break-word;overflow-wrap:anywhere;${extra}">${inner}</td>`;

function rowHtml(it: Order['items'][number], idx: number): string {
  const adp = typeof it.adp === 'number' ? it.adp : it.tp;
  const disc = it.discountPct || 0;
  return `<tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
    ${tdS(String(idx + 1), 'center')}
    ${tdS(it.name, 'left', 'font-weight:bold;')}
    ${tdS(it.packSize, 'left', 'color:#64748b;')}
    ${tdS(String(it.qty), 'center', 'font-weight:bold;')}
    ${tdS(it.freeQty > 0 ? '+' + it.freeQty : '-', 'center', 'color:#047857;font-weight:bold;')}
    ${tdS(money(it.tp))}
    ${tdS(disc > 0 ? disc + '%' : '-', 'center', disc > 0 ? 'color:#dc2626;font-weight:bold;' : 'color:#94a3b8;')}
    ${tdS(money(adp))}
    ${tdS(money(it.total), 'right', 'font-weight:bold;')}
  </tr>`;
}

const colgroupHtml = () => `<colgroup>${COLS.map(c => `<col style="width:${c.w};">`).join('')}</colgroup>`;

const theadHtml = () => `<thead><tr style="background-color:#047857;color:white;">${COLS.map(c =>
  `<th style="padding:6px 6px;border:1px solid #047857;text-align:${c.align};">${c.label}</th>`).join('')}</tr></thead>`;

function tfootHtml(ord: Order): string {
  const t = invoiceTotals(ord);
  return `<tfoot><tr style="background-color:#ecfdf5;font-weight:bold;">
    <td colspan="3" style="padding:6px;border:1px solid #e2e8f0;text-align:right;">Total (${ord.items.length} items)</td>
    <td style="padding:6px;border:1px solid #e2e8f0;text-align:center;">${t.totalQty}</td>
    <td style="padding:6px;border:1px solid #e2e8f0;text-align:center;color:#047857;">${t.totalFree > 0 ? '+' + t.totalFree : '-'}</td>
    <td colspan="3" style="padding:6px;border:1px solid #e2e8f0;"></td>
    <td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">Tk ${money(t.subtotal)}</td>
  </tr></tfoot>`;
}

/** প্রতি পেজে একই হেডার + কাস্টমার/অর্ডার তথ্য */
function headerHtml(ord: Order): string {
  return `
    <div style="border-bottom:2px solid #059669;padding-bottom:15px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1 style="font-size:24px;font-weight:800;color:#047857;margin:0;letter-spacing:0.5px;">BH AGRO LTD.</h1>
        <p style="font-size:11px;font-weight:bold;color:#475569;margin:2px 0 0 0;">Veterinary Pharmaceuticals &amp; Animal Nutrition Division</p>
        <p style="font-size:10px;color:#64748b;margin:2px 0 0 0;">Head Office: 48 Motijheel C/A, Dhaka-1000 | Hotline: +880 1700-112233 | email: sales@bhagroltd.com</p>
      </div>
      <div style="text-align:right;">
        <div style="background-color:#047857;color:white;padding:4px 12px;font-size:11px;font-weight:bold;border-radius:4px;display:inline-block;">DELIVERY CHALLAN &amp; TAX INVOICE</div>
        <div style="font-family:monospace;font-size:13px;font-weight:bold;color:#0f172a;margin-top:6px;">INV: ${ord.id}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:11px;">
      <div style="width:55%;box-sizing:border-box;background-color:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">
        <div style="font-weight:bold;color:#047857;text-transform:uppercase;font-size:10px;margin-bottom:4px;">Billed To / Delivery Customer:</div>
        <div style="font-size:14px;font-weight:bold;color:#0f172a;">${ord.customerId} ${ord.customerShopName || ord.customerName}</div>
        <div style="font-size:11px;color:#334155;margin-top:3px;"><strong>Address:</strong> ${ord.customerAddress || ord.territory}</div>
        <div style="color:#64748b;margin-top:2px;">Proprietor: ${ord.customerName}</div>
        <div style="color:#64748b;">Payment Terms: ${ord.paymentStatus || 'Credit Account'}</div>
      </div>
      <div style="width:40%;box-sizing:border-box;background-color:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">
        <div style="font-weight:bold;color:#047857;text-transform:uppercase;font-size:10px;margin-bottom:4px;">Order Details:</div>
        <div><strong>Invoice Date:</strong> ${ord.date}</div>
        <div><strong>Field SR:</strong> ${ord.srName} (${ord.srId})</div>
        <div><strong>Delivery Status:</strong> CONFIRMED</div>
      </div>
    </div>`;
}

/** শেষ পেজের নিচের অংশ: সারাংশ, নোট, সই */
function lastBlockHtml(ord: Order): string {
  const t = invoiceTotals(ord);
  const line = (label: string, value: string, color: string = '#475569') => `
    <tr>
      <td style="padding:4px 8px;color:${color};">${label}</td>
      <td style="padding:4px 8px;text-align:right;color:${color};font-weight:bold;">${value}</td>
    </tr>`;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:25px;font-size:11px;">
      <div style="font-size:10px;color:#475569;max-width:48%;">
        ${t.totalFree > 0 ? `<div style="padding:6px 8px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;color:#047857;">
          <strong>Free goods:</strong> ${t.totalFree} unit(s), value at TP Tk ${money(t.freeValue)} (no charge)
        </div>` : ''}
        ${(t.productDiscount + t.special) > 0 ? `<div style="margin-top:6px;">Customer saving (discounts): <strong>Tk ${money(t.productDiscount + t.special)}</strong></div>` : ''}
      </div>
      <table style="width:300px;font-size:11px;border-collapse:collapse;">
        ${t.productDiscount > 0 ? line('Total at TP:', 'Tk ' + money(t.tpSubtotal)) : ''}
        ${t.productDiscount > 0 ? line('Product Discount:', '-Tk ' + money(t.productDiscount), '#dc2626') : ''}
        ${line(t.productDiscount > 0 ? 'Sub Total (ADP):' : 'Sub Total:', 'Tk ' + money(t.subtotal))}
        ${t.special > 0 ? line('Special Discount:', '-Tk ' + money(t.special), '#dc2626') : ''}
        ${line('VAT / Tax (Exempted):', 'Tk 0.00')}
        <tr style="border-top:2px solid #047857;border-bottom:2px solid #047857;">
          <td style="padding:6px 8px;font-weight:bold;font-size:13px;color:#047857;">Net Payable:</td>
          <td style="padding:6px 8px;text-align:right;font-weight:800;font-size:14px;color:#047857;">Tk ${money(t.net)}</td>
        </tr>
      </table>
    </div>

    <div style="font-size:10px;color:#64748b;margin-bottom:35px;border-left:3px solid #047857;padding-left:8px;">
      <div><strong>Special Notes:</strong> ${ord.notes || 'Goods received in good condition. Veterinary products once sold are not returnable without quality verification.'}</div>
      <div style="margin-top:2px;">Vaccines &amp; biologicals must be transferred immediately to 2°C - 8°C cold chain storage.</div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:10px;font-size:10px;text-align:center;">
      <div style="width:25%;border-top:1px dashed #94a3b8;padding-top:4px;"><strong>Field SR Signature</strong><div style="color:#64748b;">${ord.srName}</div></div>
      <div style="width:25%;border-top:1px dashed #94a3b8;padding-top:4px;"><strong>Warehouse In-charge</strong><div style="color:#64748b;">Depot Dispatch</div></div>
      <div style="width:25%;border-top:1px dashed #94a3b8;padding-top:4px;"><strong>Customer Signature</strong><div style="color:#64748b;">Seal &amp; Date</div></div>
    </div>

    <div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:25px;">
      This is a computer-generated invoice from BH Agro Ltd. ERP System.
    </div>`;
}

/** লুকানো জায়গায় মেপে দেখে কোন পেজে কোন আইটেম যাবে ঠিক করে */
function paginate(ord: Order): number[][] {
  const n = ord.items.length;
  if (n === 0) return [[]];
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_W}px;visibility:hidden;pointer-events:none;font-family:${FONT};`;
  host.innerHTML = `
    <div id="m-head" style="display:flow-root;">${headerHtml(ord)}</div>
    <div id="m-last" style="display:flow-root;">${lastBlockHtml(ord)}</div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;font-family:${FONT};">
      ${colgroupHtml()}${theadHtml()}
      <tbody>${ord.items.map((it, i) => rowHtml(it, i)).join('')}</tbody>
      ${tfootHtml(ord)}
    </table>`;
  document.body.appendChild(host);
  const h = (el: Element | null) => (el ? el.getBoundingClientRect().height : 0);
  const headH = h(host.querySelector('#m-head'));
  const lastH = h(host.querySelector('#m-last'));
  const theadH = h(host.querySelector('thead'));
  const totH = h(host.querySelector('tfoot'));
  const rowH = Array.from(host.querySelectorAll('tbody tr')).map(r => Math.ceil(h(r)) + 1);
  host.remove();

  const base = Math.ceil(headH) + Math.ceil(theadH) + 2;
  const pages: number[][] = [];
  let cur: number[] = [];
  let used = base;
  for (let i = 0; i < n; i++) {
    if (cur.length && used + rowH[i] > MAX_H) { pages.push(cur); cur = []; used = base; }
    cur.push(i);
    used += rowH[i];
  }
  pages.push(cur);

  // শেষ পেজে টোটাল + সারাংশ + সই না ঢুকলে শেষ আইটেম পরের পেজে নেওয়া হয়
  const need = Math.ceil(totH) + Math.ceil(lastH) + 2;
  const lastUsed = (idx: number[]) => base + idx.reduce((s, i) => s + rowH[i], 0) + need;
  let guard = 0;
  while (lastUsed(pages[pages.length - 1]) > MAX_H && guard++ < 50) {
    const last = pages[pages.length - 1];
    if (last.length > 1) pages.push([last.pop() as number]);
    else { pages.push([]); break; }
  }
  return pages;
}

function pageHtml(ord: Order, idxs: number[], pageNo: number, total: number): string {
  const isLast = pageNo === total;
  return `<div class="inv-page" style="position:relative;width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;padding:${PAD_TOP}px ${PAD_X}px 0 ${PAD_X}px;background:#ffffff;color:#0f172a;font-family:${FONT};overflow:hidden;">
    ${headerHtml(ord)}
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;margin-bottom:14px;font-family:${FONT};">
      ${colgroupHtml()}${theadHtml()}
      <tbody>${idxs.map(i => rowHtml(ord.items[i], i)).join('')}</tbody>
      ${isLast ? tfootHtml(ord) : ''}
    </table>
    ${isLast ? lastBlockHtml(ord) : ''}
    <div style="position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:18px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px;">
      <span>BH Agro Ltd. &#8226; INV: ${ord.id}</span>
      <span style="font-weight:bold;color:#334155;">Page ${pageNo} of ${total}</span>
    </div>
  </div>`;
}

/** সব পেজের HTML (প্রতিটি আলাদা A4 পেজ) */
export function buildInvoicePages(ord: Order): string[] {
  const pages = paginate(ord);
  return pages.map((idxs, i) => pageHtml(ord, idxs, i + 1, pages.length));
}

/** ইনভয়েস প্রিভিউয়ের HTML (A4 পেজগুলো উপর-নিচে; শুধু inline style, তাই প্রিভিউ/প্রিন্ট/PDF সবখানে একই) */
export function buildInvoiceHtml(ord: Order, idAttr: string, width: string = PAGE_W + 'px'): string {
  const pages = buildInvoicePages(ord)
    .map((p, i, arr) => `<div style="${i < arr.length - 1 ? 'margin-bottom:14px;' : ''}">${p}</div>`).join('');
  return `<div id="${idAttr}" style="width:${width};background:#cbd5e1;box-sizing:border-box;">${pages}</div>`;
}

/** প্রিন্ট: লুকানো iframe দিয়ে (পপআপ ব্লক হয় না, PWA-তেও কাজ করে) */
export function printInvoiceDocument(ord: Order) {
  const pagesHtml = buildInvoicePages(ord).join('');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) { iframe.remove(); window.print(); return; }
  const doc = win.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${invoiceFileName(ord).replace('.pdf', '')}</title>
    <style>
      @page{size:A4;margin:0}
      html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .inv-page{break-after:page;page-break-after:always}
      .inv-page:last-child{break-after:auto;page-break-after:auto}
    </style></head>
    <body>${pagesHtml}</body></html>`);
  doc.close();
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { window.print(); }
    setTimeout(() => iframe.remove(), 2000);
  }, 300);
}

// ---------------- PDF (A4, প্রতি পেজ আলাদা) ----------------
type JpegImg = { data: Uint8Array; w: number; h: number };

/** JPEG ছবিগুলো থেকে মাল্টি-পেজ A4 PDF বানায় (ছবি A4-এর প্রস্থে বসে, কিছু কাটে না) */
export function buildPdfFromJpegs(imgs: JpegImg[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(u); offset += u.length;
  };
  const PW = 595.28, PH = 841.89;
  const n = imgs.length;
  const begin = (id: number) => { offsets[id] = offset; push(`${id} 0 obj\n`); };

  push('%PDF-1.4\n');
  begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  begin(2);
  push(`<< /Type /Pages /Count ${n} /Kids [${imgs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>\nendobj\n`);
  imgs.forEach((im, i) => {
    const pageId = 3 + i * 3, contId = pageId + 1, imgId = pageId + 2;
    let dw = PW, dh = PW * im.h / im.w;
    if (dh > PH) { dh = PH; dw = PH * im.w / im.h; }
    const x = (PW - dw) / 2, y = PH - dh;
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
    begin(pageId);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contId} 0 R >>\nendobj\n`);
    begin(contId);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    begin(imgId);
    push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`);
    push(im.data);
    push('\nendstream\nendobj\n');
  });
  const total = 2 + n * 3;
  const xrefPos = offset;
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

function canvasToJpeg(canvas: HTMLCanvasElement): JpegImg {
  const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  const bin = atob(b64);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, w: canvas.width, h: canvas.height };
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

/** একটি A4 পেজকে (HTML) সরাসরি ক্যানভাসে আঁকে: SVG foreignObject দিয়ে, তাই পজিশন/স্ক্রল/ডান-বাম কাটার সমস্যা নেই */
async function renderPageToCanvas(pageHtml: string, scale: number = 2): Promise<HTMLCanvasElement> {
  const tmp = document.createElement('div');
  tmp.innerHTML = pageHtml;
  const node = tmp.firstElementChild as HTMLElement;
  node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const xhtml = new XMLSerializer().serializeToString(node);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}"><foreignObject x="0" y="0" width="${PAGE_W}" height="${PAGE_H}">${xhtml}</foreignObject></svg>`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('svg render failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W * scale;
  canvas.height = PAGE_H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, PAGE_W, PAGE_H);
  canvasToJpeg(canvas); // টেইন্টেড হলে এখানেই এরর, তখন ফলব্যাক
  return canvas;
}

/** ফলব্যাক: html2pdf (html2canvas) দিয়ে একটি পেজ ক্যানভাসে */
async function renderPageViaHtml2pdf(pageHtml: string): Promise<HTMLCanvasElement> {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) throw new Error('no html2pdf');
  const host = document.createElement('div');
  host.style.cssText = `position:absolute;left:0;top:0;width:${PAGE_W}px;margin:0;padding:0;background:#fff;`;
  host.innerHTML = pageHtml;
  document.body.appendChild(host);
  try {
    return await html2pdf()
      .set({ html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', x: 0, y: 0, scrollX: 0, scrollY: 0, windowWidth: PAGE_W } })
      .from(host.firstElementChild)
      .toCanvas()
      .get('canvas');
  } finally {
    host.remove();
  }
}

/** PDF ডাউনলোড: A4, একাধিক পেজ, প্রতি পেজে একই হেডিং ও পেজ নম্বর (প্রিন্ট/প্রিভিউয়ের সাথে একই লেআউট) */
export function generateInvoicePDF(ord: Order, showToast: (msg: string, type?: string) => void) {
  const targetPdfFileName = invoiceFileName(ord);
  showToast(`Generating PDF: ${targetPdfFileName}...`);
  const pages = buildInvoicePages(ord);
  (async () => {
    try {
      const jpegs: JpegImg[] = [];
      for (const pg of pages) {
        let canvas: HTMLCanvasElement;
        try { canvas = await renderPageToCanvas(pg); }
        catch { canvas = await renderPageViaHtml2pdf(pg); }
        jpegs.push(canvasToJpeg(canvas));
      }
      saveBlob(buildPdfFromJpegs(jpegs), targetPdfFileName);
      showToast(`Invoice downloaded: ${targetPdfFileName}!`);
    } catch {
      printInvoiceDocument(ord);
    }
  })();
}
