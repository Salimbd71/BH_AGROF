/**
 * BH Agro Ltd. - Invoice builder, Print & PDF download
 * কলাম: Sl, Product, Pack, Qty, Free, TP, Disc %, ADP, Amount
 * নিচে: TP মোট, প্রোডাক্ট ছাড়, ADP মোট, স্পেশাল ডিসকাউন্ট, নিট পেয়েবল
 * ফাইলের নাম: <customer_name>_<customer_id>_<ddmmyyyy>.pdf  (যেমন Amin_feed_BH0002_06112026.pdf)
 */

import { Order } from './store.ts';

const money = (n: number) => (n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

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

/** ইনভয়েসের HTML (শুধু inline style, তাই প্রিভিউ/প্রিন্ট/PDF সবখানে একই দেখায়) */
export function buildInvoiceHtml(ord: Order, idAttr: string, width: string = '794px'): string {
  const t = invoiceTotals(ord);
  const th = (label: string, w: string, align: string = 'right') =>
    `<th style="padding:6px 6px;border:1px solid #047857;text-align:${align};width:${w};">${label}</th>`;
  const td = (inner: string, align: string = 'right', extra: string = '') =>
    `<td style="padding:6px 6px;border:1px solid #e2e8f0;text-align:${align};${extra}">${inner}</td>`;

  const rows = ord.items.map((it, idx) => {
    const adp = typeof it.adp === 'number' ? it.adp : it.tp;
    const disc = it.discountPct || 0;
    return `
      <tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${td(String(idx + 1), 'center')}
        ${td(it.name, 'left', 'font-weight:bold;')}
        ${td(it.packSize, 'left', 'color:#64748b;')}
        ${td(String(it.qty), 'center', 'font-weight:bold;')}
        ${td(it.freeQty > 0 ? '+' + it.freeQty : '-', 'center', 'color:#047857;font-weight:bold;')}
        ${td('৳' + money(it.tp))}
        ${td(disc > 0 ? disc + '%' : '-', 'center', disc > 0 ? 'color:#dc2626;font-weight:bold;' : 'color:#94a3b8;')}
        ${td('৳' + money(adp))}
        ${td('৳' + money(it.total), 'right', 'font-weight:bold;')}
      </tr>`;
  }).join('');

  const line = (label: string, value: string, color: string = '#475569', bold: boolean = false) => `
    <tr>
      <td style="padding:4px 8px;color:${color};${bold ? 'font-weight:bold;' : ''}">${label}</td>
      <td style="padding:4px 8px;text-align:right;color:${color};font-weight:bold;">${value}</td>
    </tr>`;

  return `
    <div id="${idAttr}" style="padding:32px;background:#ffffff;color:#0f172a;font-family:Arial,sans-serif;width:${width};box-sizing:border-box;">

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
        <div style="width:55%;background-color:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">
          <div style="font-weight:bold;color:#047857;text-transform:uppercase;font-size:10px;margin-bottom:4px;">Billed To / Delivery Customer:</div>
          <div style="font-size:14px;font-weight:bold;color:#0f172a;">${ord.customerId} ${ord.customerShopName || ord.customerName}</div>
          <div style="font-size:11px;color:#334155;margin-top:3px;"><strong>Address:</strong> ${ord.customerAddress || ord.territory}</div>
          <div style="color:#64748b;margin-top:2px;">Proprietor: ${ord.customerName}</div>
          <div style="color:#64748b;">Payment Terms: ${ord.paymentStatus || 'Credit Account'}</div>
        </div>
        <div style="width:40%;background-color:#f8fafc;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">
          <div style="font-weight:bold;color:#047857;text-transform:uppercase;font-size:10px;margin-bottom:4px;">Order Details:</div>
          <div><strong>Invoice Date:</strong> ${ord.date}</div>
          <div><strong>Field SR:</strong> ${ord.srName} (${ord.srId})</div>
          <div><strong>Delivery Status:</strong> CONFIRMED</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px;">
        <thead>
          <tr style="background-color:#047857;color:white;">
            ${th('Sl', '28px', 'center')}
            ${th('Product Description', 'auto', 'left')}
            ${th('Pack', '58px', 'left')}
            ${th('Qty', '38px', 'center')}
            ${th('Free', '38px', 'center')}
            ${th('TP (৳)', '56px')}
            ${th('Disc %', '46px', 'center')}
            ${th('ADP (৳)', '58px')}
            ${th('Amount (৳)', '72px')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background-color:#ecfdf5;font-weight:bold;">
            <td colspan="3" style="padding:6px;border:1px solid #e2e8f0;text-align:right;">Total (${ord.items.length} items)</td>
            <td style="padding:6px;border:1px solid #e2e8f0;text-align:center;">${t.totalQty}</td>
            <td style="padding:6px;border:1px solid #e2e8f0;text-align:center;color:#047857;">${t.totalFree > 0 ? '+' + t.totalFree : '-'}</td>
            <td colspan="3" style="padding:6px;border:1px solid #e2e8f0;"></td>
            <td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">৳${money(t.subtotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:25px;">
        <div style="font-size:10px;color:#475569;max-width:48%;">
          ${t.totalFree > 0 ? `<div style="padding:6px 8px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;color:#047857;">
            <strong>Free goods:</strong> ${t.totalFree} unit(s), value at TP ৳${money(t.freeValue)} (no charge)
          </div>` : ''}
          ${(t.productDiscount + t.special) > 0 ? `<div style="margin-top:6px;">Customer saving (discounts): <strong>৳${money(t.productDiscount + t.special)}</strong></div>` : ''}
        </div>
        <table style="width:300px;font-size:11px;border-collapse:collapse;">
          ${t.productDiscount > 0 ? line('Total at TP:', '৳' + money(t.tpSubtotal)) : ''}
          ${t.productDiscount > 0 ? line('Product Discount:', '-৳' + money(t.productDiscount), '#dc2626') : ''}
          ${line(t.productDiscount > 0 ? 'Sub Total (ADP):' : 'Sub Total:', '৳' + money(t.subtotal))}
          ${t.special > 0 ? line('Special Discount:', '-৳' + money(t.special), '#dc2626') : ''}
          ${line('VAT / Tax (Exempted):', '৳0.00')}
          <tr style="border-top:2px solid #047857;border-bottom:2px solid #047857;">
            <td style="padding:6px 8px;font-weight:bold;font-size:13px;color:#047857;">Net Payable:</td>
            <td style="padding:6px 8px;text-align:right;font-weight:800;font-size:14px;color:#047857;">৳${money(t.net)}</td>
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
      </div>
    </div>`;
}

/** প্রিন্ট: লুকানো iframe দিয়ে (পপআপ ব্লক হয় না, PWA-তেও কাজ করে) */
export function printInvoiceDocument(ord: Order) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) { iframe.remove(); window.print(); return; }
  const doc = win.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoiceFileName(ord).replace('.pdf', '')}</title>
    <style>@page{size:A4;margin:10mm}html,body{margin:0;padding:0;background:#fff}</style></head>
    <body>${buildInvoiceHtml(ord, 'printInvoiceDoc', '100%')}</body></html>`);
  doc.close();
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { window.print(); }
    setTimeout(() => iframe.remove(), 2000);
  }, 300);
}

/** PDF ডাউনলোড */
export function generateInvoicePDF(ord: Order, showToast: (msg: string, type?: string) => void) {
  const targetPdfFileName = invoiceFileName(ord);
  const sandbox = document.getElementById('pdfInvoiceSandbox');
  if (!sandbox) {
    printInvoiceDocument(ord);
    return;
  }
  sandbox.innerHTML = buildInvoiceHtml(ord, 'printableInvoice', '794px');

  showToast(`Generating PDF: ${targetPdfFileName}...`);
  const element = document.getElementById('printableInvoice');
  const opt = {
    margin: 10,
    filename: targetPdfFileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  const html2pdf = (window as any).html2pdf;
  if (html2pdf) {
    html2pdf().set(opt).from(element).save()
      .then(() => showToast(`Invoice downloaded: ${targetPdfFileName}!`))
      .catch(() => printInvoiceDocument(ord));
  } else {
    printInvoiceDocument(ord);
  }
}
