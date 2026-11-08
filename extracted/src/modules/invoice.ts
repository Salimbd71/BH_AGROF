/**
 * BH Agro Ltd. - PDF Invoice & Delivery Challan Generation Module
 * Formats file name as: <customer_name>_<customer_id>_<ddmmyyyy>.pdf
 * Example: Amin_feed_BH0002_06112026.pdf
 */

import { Order } from './store.ts';

export function generateInvoicePDF(ord: Order, showToast: (msg: string, type?: string) => void) {
  // Format customer name for file name (e.g. Amin Feed -> Amin_feed)
  const rawCustName = (ord.customerShopName || ord.customerName || 'Customer').trim();
  const cleanCustName = rawCustName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
  const custId = ord.customerId || 'BH0000';
  
  // Format Date to DDMMYYYY (e.g., 2026-11-06 -> 06112026)
  let ddmmyyyy = '';
  if (ord.date && ord.date.includes('-')) {
    const parts = ord.date.split('-'); // [YYYY, MM, DD]
    ddmmyyyy = `${parts[2]}${parts[1]}${parts[0]}`;
  } else {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    ddmmyyyy = `${d}${m}${y}`;
  }

  // Target filename strictly following: Amin_feed_BH0002_06112026.pdf
  const targetPdfFileName = `${cleanCustName}_${custId}_${ddmmyyyy}.pdf`;

  const sandbox = document.getElementById('pdfInvoiceSandbox');
  if (!sandbox) {
    window.print();
    return;
  }

  sandbox.innerHTML = `
    <div id="printableInvoice" class="p-8 bg-white text-slate-900 font-sans" style="font-family: Arial, sans-serif;">
      
      <!-- Company Header -->
      <div style="border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: #047857; margin: 0; letter-spacing: 0.5px;">BH AGRO LTD.</h1>
          <p style="font-size: 11px; font-weight: bold; color: #475569; margin: 2px 0 0 0;">Veterinary Pharmaceuticals & Animal Nutrition Division</p>
          <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Head Office: 48 Motijheel C/A, Dhaka-1000 | Hotline: +880 1700-112233 | email: sales@bhagroltd.com</p>
        </div>
        <div style="text-align: right;">
          <div style="background-color: #047857; color: white; padding: 4px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; display: inline-block;">
            DELIVERY CHALLAN & TAX INVOICE
          </div>
          <div style="font-family: monospace; font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 6px;">
            INV: ${ord.id}
          </div>
        </div>
      </div>

      <!-- Customer & Order Meta -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px;">
        <div style="width: 55%; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #047857; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">Billed To / Delivery Customer:</div>
          <div style="font-size: 14px; font-weight: bold; color: #0f172a;">
            <strong>${ord.customerId} ${ord.customerShopName || ord.customerName}</strong>
          </div>
          <div style="font-size: 11px; color: #334155; margin-top: 3px;">
            <strong>Address:</strong> ${ord.customerAddress || ord.territory}
          </div>
          <div style="color: #64748b; margin-top: 2px;">Proprietor: ${ord.customerName}</div>
          <div style="color: #64748b;">Payment Terms: ${ord.paymentStatus || 'Credit Account'}</div>
        </div>
        <div style="width: 40%; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #047857; text-transform: uppercase; font-size: 10px; margin-bottom: 4px;">Order Details:</div>
          <div><strong>Invoice Date:</strong> ${ord.date}</div>
          <div><strong>Field SR:</strong> ${ord.srName} (${ord.srId})</div>
          <div><strong>Delivery Status:</strong> CONFIRMED</div>
          <div><strong>File Ref:</strong> <code style="font-size: 10px; color: #047857;">${targetPdfFileName}</code></div>
        </div>
      </div>

      <!-- Itemized Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #047857; color: white; text-align: left;">
            <th style="padding: 6px 8px; border: 1px solid #047857; width: 35px;">Sl</th>
            <th style="padding: 6px 8px; border: 1px solid #047857;">Product Description</th>
            <th style="padding: 6px 8px; border: 1px solid #047857;">Pack Size</th>
            <th style="padding: 6px 8px; border: 1px solid #047857; text-align: center;">Order Qty</th>
            <th style="padding: 6px 8px; border: 1px solid #047857; text-align: center;">Free Qty</th>
            <th style="padding: 6px 8px; border: 1px solid #047857; text-align: right;">Unit TP (৳)</th>
            <th style="padding: 6px 8px; border: 1px solid #047857; text-align: right;">Total Amount (৳)</th>
          </tr>
        </thead>
        <tbody>
          ${ord.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${it.name}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; color: #64748b;">${it.packSize}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${it.qty}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; color: #047857; font-weight: bold;">${it.freeQty > 0 ? '+' + it.freeQty : '-'}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right;">৳${it.tp.toLocaleString()}</td>
              <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">৳${it.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Financial Calculations -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <table style="width: 280px; font-size: 11px; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 8px; color: #475569;">Subtotal (Trade Price):</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold;">৳${ord.subtotal.toLocaleString()}</td>
          </tr>
          ${ord.discount > 0 ? `
            <tr>
              <td style="padding: 4px 8px; color: #dc2626;">Trade Discount:</td>
              <td style="padding: 4px 8px; text-align: right; color: #dc2626; font-weight: bold;">-৳${ord.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding: 4px 8px; color: #475569;">VAT / Tax (Exempted):</td>
            <td style="padding: 4px 8px; text-align: right; font-weight: bold;">৳0.00</td>
          </tr>
          <tr style="border-top: 2px solid #047857; border-bottom: 2px solid #047857;">
            <td style="padding: 6px 8px; font-weight: bold; font-size: 13px; color: #047857;">Net Payable:</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 800; font-size: 14px; color: #047857;">৳${ord.grandTotal.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- Notes & Terms -->
      <div style="font-size: 10px; color: #64748b; margin-bottom: 35px; border-left: 3px solid #047857; padding-left: 8px;">
        <div><strong>Special Notes:</strong> ${ord.notes || 'Goods received in good condition. Veterinary products once sold are not returnable without quality verification.'}</div>
        <div style="margin-top: 2px;">Vaccines & biologicals must be transferred immediately to 2°C - 8°C cold chain storage.</div>
      </div>

      <!-- Signatures Section -->
      <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; font-size: 10px; text-align: center;">
        <div style="width: 25%; border-top: 1px dashed #94a3b8; padding-top: 4px;">
          <strong>Field SR Signature</strong>
          <div style="color: #64748b;">${ord.srName}</div>
        </div>
        <div style="width: 25%; border-top: 1px dashed #94a3b8; padding-top: 4px;">
          <strong>Warehouse In-charge</strong>
          <div style="color: #64748b;">Depot Dispatch</div>
        </div>
        <div style="width: 25%; border-top: 1px dashed #94a3b8; padding-top: 4px;">
          <strong>Customer Signature</strong>
          <div style="color: #64748b;">Seal & Date</div>
        </div>
      </div>

      <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 25px;">
        This is a computer-generated invoice from BH Agro Ltd. ERP System.
      </div>

    </div>
  `;

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
      .catch(() => window.print());
  } else {
    window.print();
  }
}
