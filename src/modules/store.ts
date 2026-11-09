/**
 * BH Agro Ltd. - Store & State Management Module
 * Synchronized with Firebase Realtime Database & LocalStorage
 */

export interface Product {
  id: string;
  name: string;
  bnName: string;
  sku: string;
  category: 'antibiotics' | 'vaccines' | 'supplements' | 'dewormers';
  packSize: string;
  tradePrice: number;
  mrp: number;
  stock: number;
  tradeOffer: string;
  batchNo: string;
  dosage?: string;
}

export interface Customer {
  id: string; // e.g. BH0001, BH0002...
  name: string;
  shopName: string;
  bnShopName?: string;
  phone: string;
  category: 'dairy_farm' | 'poultry_farm' | 'pharmacy' | 'feed_mill';
  address: string; // Full address provided during registration
  territory: string;
  status: 'approved' | 'pending';
  creditLimit: number;
  balance: number;
  createdBy: string;
  assignedSrId?: string; // SR ID to whom this customer is assigned (e.g. SR01, SR02)
  createdAt?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  packSize: string;
  qty: number;
  freeQty: number;
  tp: number;
  total: number;
}

export interface Order {
  id: string;
  date: string;
  srId: string;
  srName: string;
  customerId: string;
  customerShopName: string;
  customerName: string;
  customerAddress: string;
  territory: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  status: 'confirmed';
  paymentStatus: string;
  notes?: string;
}

export interface SRUser {
  id: string;
  username: string;
  password: string;
  name: string;
  bnName?: string;
  phone: string;
  territory: string;
  email?: string;
  target: number;
  active: boolean;
  /** সফট ডিলিটের সময়। থাকলে এসআর লগইন করতে পারবে না, কিন্তু অর্ডার/রিপোর্টে থাকবে */
  deletedAt?: string;
  pin?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  bnName?: string;
  phone: string;
  territory: string;
  email?: string;
  role: 'admin';
  pin?: string;
}

export const DB_STORAGE_KEY = 'bioherbs_agrovet_db_v5';
import { FIREBASE_CONFIG_KEY, getFirebaseConfig } from '../config/firebase.ts';

const CART_STORAGE_KEY = 'bhagro_cart_v1';
const PENDING_SYNC_KEY = 'bhagro_pending_sync_v1';
const SYNCED_IDS_KEY = 'bhagro_synced_ids_v1';
import { APP_RULES, canLoginAs } from '../config/appMode.ts';
export { FIREBASE_CONFIG_KEY };
export const PREF_LANG_KEY = 'bioherbs_lang';
export const PREF_THEME_KEY = 'bioherbs_theme';
export const SESSION_AUTH_KEY = 'bioherbs_auth_session_v5';

// Default clean state: No mock SRs, No mock Admin, No mock Customers, No mock Orders
export const INITIAL_SR_LIST: SRUser[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_ORDERS: Order[] = [];

export const I18N: Record<string, Record<string, string>> = {
  en: {
    appName: 'BH Agro Ltd.',
    tagline: 'Veterinary Pharmaceuticals & Animal Health ERP',
    dashboard: 'Dashboard',
    orderBooking: 'Order Booking',
    customerList: 'Customer Directory',
    homeCustomers: 'Home & Customers',
    medicinesList: 'Medicines Catalog',
    stockManage: 'Stock Management',
    ordersManagement: 'All Orders & Invoicing',
    addCustomer: 'Request New Customer',
    pendingApprovals: 'Customer Approvals',
    productsInventory: 'Products & Inventory',
    pricingManager: 'Price & Discounts',
    srWiseReport: 'SR-wise Sales Report',
    customerWiseReport: 'Customer-wise Sales Report',
    srManagement: 'SR Accounts Management',
    reportsAnalytics: 'Sales Reports & Analytics',
    dbSettings: 'Firebase Realtime DB',
    logout: 'Log Out',
    roleSR: 'Field Sales Rep (SR)',
    roleAdmin: 'Central Admin',
    currentRole: 'Active Profile',
    onlineFirebase: 'Firebase Online 🟢',
    localDemo: 'Local Offline 🟡',
    todayBooking: "Today's Orders",
    monthlyRevenue: 'Monthly Sales',
    approvedCustomers: 'Active Customers',
    pendingOrders: 'Pending Approval',
    productCatalog: 'Veterinary Medicines',
    categoryAll: 'All Products',
    categoryAntibiotics: 'Antibiotics',
    categoryVaccines: 'Vaccines',
    categorySupplements: 'Feed Supplements',
    categoryDewormers: 'Dewormers',
    searchPlaceholder: 'Search medicines by name or SKU...',
    searchCustomerPlaceholder: 'Search customer by ID, shop name or mobile...',
    cartTitle: 'Order Slip / Cart',
    emptyCart: 'No medicines added to cart yet',
    selectCustomer: 'Select Customer',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal (Trade Price)',
    discount: 'Special Discount (BDT)',
    vat: 'VAT (0% Animal Health Exemption)',
    grandTotal: 'Net Payable Amount',
    submitOrder: 'Confirm & Place Order',
    inStock: 'In Stock',
    lowStock: 'Low Stock (< 10)',
    outOfStock: 'Out of Stock',
    tradeOffer: 'Special Offer',
    unitTP: 'Trade Price (TP)',
    mrp: 'M.R.P.',
    freeQty: 'Free Items',
    statusConfirmed: 'Confirmed',
    statusPending: 'Pending Approval',
    statusApproved: 'Approved',
    exportExcel: 'Export to Excel (.xlsx)',
    uploadExcel: 'Upload Products Excel',
    downloadTemplate: 'Download Excel Template',
    printInvoice: 'Print PDF Invoice',
    deleteOrder: 'Delete Order',
    action: 'Actions',
    approve: 'Approve Customer',
    reject: 'Reject',
    save: 'Save Changes',
    cancel: 'Cancel',
    customerName: 'Proprietor / Doctor Name',
    shopName: 'Farm / Shop / Pharmacy Name',
    phone: 'Mobile Phone',
    category: 'Category',
    address: 'Full Address',
    territory: 'Territory / Area',
    creditLimit: 'Credit Limit (BDT)',
    balance: 'Current Balance (BDT)',
    filterDate: 'Filter Date',
    filterCategory: 'Category Filter',
    daywiseSales: 'Day-wise Sales Report',
    productwiseSales: 'Product-wise Sales Analysis',
    inventoryReport: 'Storage & Stock Valuation',
    resetDemo: 'Clear Local Cache',
    srStaffId: 'SR ID',
    srUsername: 'Username',
    srPassword: 'Password',
    monthlyTarget: 'Monthly Sales Target (BDT)',
    addSR: 'Create New SR Account',
    dairyFarm: 'Dairy Farm',
    poultryFarm: 'Poultry Farm',
    pharmacy: 'Vet Pharmacy',
    feedMill: 'Feed Mill & Dealer',
    target: 'Monthly Target',
    achievement: 'Achievement',
    todayBookingCount: "Today's Orders Count",
    todayBookingValue: "Today's Booking Value",
    units: 'Units',
    pcs: 'Pcs',
    welcome: 'Welcome',
    createFirstAdmin: 'Create Initial Admin Account',
    noAdminFound: 'No Admin account found in database. Create one to get started.',
    noSrFound: 'No SR accounts registered yet in database.',
    syncFromDb: 'Sync from Database',
    connectFirebase: 'Connect Firebase Database',
    databaseSynced: 'Database Synced',
    fieldSalesReport: 'Field Sales Report',
    centralSalesReport: 'Central Sales & Analytics Control',
    allSrsAndTerritories: 'All SRs and Territory Performance',
    srTerritorySales: 'Territory daily, customer-wise and product sales',
    daywiseReportTitle: '1. Day-wise Sales Report',
    daywiseReportSubtitle: 'Total orders, units, and sales revenue grouped by date',
    custwiseReportTitle: '2. Customer-wise Sales Report',
    custwiseReportSubtitle: 'All customers with order count, purchase volume, and balance due',
    prodwiseReportTitle: '3. Product-wise Sales Analysis',
    prodwiseReportSubtitle: 'Sold medicine quantities and gross revenue breakdown',
    dateCol: 'Date',
    ordersCol: 'Orders Count',
    unitsCol: 'Units Sold',
    amountCol: 'Total Sales (BDT)',
    customerCol: 'Customer / Farm Name',
    proprietorCol: 'Proprietor',
    dueBalanceCol: 'Due Balance',
    productNameCol: 'Product Name',
    packSizeCol: 'Pack Size',
    rateCol: 'Rate (TP)',
    quantityCol: 'Quantity Sold',
    revenueCol: 'Total Revenue',
    filterReportsPlaceholder: 'Search reports by date, customer name, mobile, or medicine...',
    monthlyTargetProgress: 'Monthly Target Progress',
    totalRevenue: 'Total Booked Sales',
    totalOrdersCount: 'Total Orders Placed',
    totalUnitsDelivered: 'Total Units Delivered',
    totalAssignedCustomers: 'Registered Customers',
    bookProduct: 'Book Product',
    quickOrder: 'Quick Order',
    allCategories: 'All Categories',
    emergencyRestock: 'Emergency Restock Needed',
    warehouseTotal: 'Warehouse Total Stock',
    tradePriceValuation: 'Trade Price Valuation',
    stockManagementTitle: 'Stock Management & Inventory',
    stockManagementSubtitle: 'Directly adjust medicine stock levels. Changes sync with database instantly.',
    addNewProduct: '+ Add New Product',
    totalMedicineItems: 'Total Medicine Items',
    totalStockUnits: 'Total Stock Units',
    lowStockItems: 'Low Stock Items (<10)',
    totalInventoryValuation: 'Total Inventory Valuation (TP)',
    showingMedicines: 'Showing {count} medicines',
    showingCustomers: 'Showing {count} customers',
    showingSrs: 'Showing {count} Field SR Accounts',
    template: 'Download Template',
    importExcel: 'Import Excel',
    createAdminBtn: '+ Create Admin',
    systemAdmins: 'System Admin Accounts',
    assignedSrRep: 'Assigned SR Rep:',
    filterBySR: 'Filter by SR:',
    allSRsOption: 'All SRs',
    assignedToYou: 'Assigned to You',
    noCustomersAssigned: 'No Customers Assigned',
    noCustomersAssignedSub: 'Please request new customer registration or ask the head office to assign customers to your SR ID.',
  },
  bn: {
    appName: 'বিএইচ এগ্রো লি.',
    tagline: 'ভেটেরিনারি ওষুধ ও প্রাণিস্বাস্থ্য পণ্য ইআরপি',
    dashboard: 'ড্যাশবোর্ড',
    orderBooking: 'অর্ডার বুকিং',
    customerList: 'গ্রাহকের তালিকা',
    homeCustomers: 'হোম ও গ্রাহক তালিকা',
    medicinesList: 'ওষুধের তালিকা',
    stockManage: 'স্টক ম্যানেজমেন্ট',
    ordersManagement: 'সকল অর্ডার ও ইনভয়েস',
    addCustomer: 'নতুন গ্রাহক আবেদন',
    pendingApprovals: 'গ্রাহক অনুমোদন',
    productsInventory: 'পণ্য ও ইনভেন্টরি',
    pricingManager: 'মূল্য ও ডিসকাউন্ট',
    srWiseReport: 'এসআরভিত্তিক বিক্রয় রিপোর্ট',
    customerWiseReport: 'গ্রাহকভিত্তিক বিক্রয় রিপোর্ট',
    srManagement: 'এসআর একাউন্টস',
    reportsAnalytics: 'সেলস রিপোর্ট ও বিশ্লেষণ',
    dbSettings: 'ফায়ারবেস ডাটাবেস',
    logout: 'লগআউট',
    roleSR: 'ফিল্ড সেলস রিপ্রেজেন্টেটিভ (এসআর)',
    roleAdmin: 'সেন্ট্রাল অ্যাডমিন',
    currentRole: 'বর্তমান প্রোফাইল',
    onlineFirebase: 'ফায়ারবেস অনলাইন 🟢',
    localDemo: 'লোকাল ডেমো মোড 🟡',
    todayBooking: 'আজকের বুকিং',
    monthlyRevenue: 'মাসিক মোট বিক্রয়',
    approvedCustomers: 'অনুমোদিত গ্রাহক',
    pendingOrders: 'অপেক্ষমাণ',
    productCatalog: 'ভেটেরিনারি ওষুধ ক্যাটালগ',
    categoryAll: 'সকল ওষুধ',
    categoryAntibiotics: 'অ্যান্টিবায়োটিক',
    categoryVaccines: 'ভ্যাকসিন',
    categorySupplements: 'ফিড সাপ্লিমেন্ট ও ভিটামিন',
    categoryDewormers: 'কৃমিনাশক (ডিওয়ার্মার)',
    searchPlaceholder: 'ওষুধের নাম বা এসকেইউ কোড দিয়ে খুঁজুন...',
    searchCustomerPlaceholder: 'আইডি, ফার্মের নাম অথবা মোবাইল দিয়ে খুঁজুন...',
    cartTitle: 'অর্ডার স্লিপ / কার্ট',
    emptyCart: 'কার্টে কোন ওষুধ যোগ করা হয়নি',
    selectCustomer: 'গ্রাহক নির্বাচন করুন',
    orderSummary: 'অর্ডারের বিবরণ',
    subtotal: 'মোট ট্রেড প্রাইস (টিপি)',
    discount: 'বিশেষ ছাড় (টাকা)',
    vat: 'ভ্যাট (ভেটেরিনারি ভ্যাটমুক্ত)',
    grandTotal: 'সর্বমোট প্রদেয় টাকা',
    submitOrder: 'অর্ডার নিশ্চিত ও সাবমিট করুন',
    inStock: 'মজুদ আছে',
    lowStock: 'স্বল্প স্টক (< ১০)',
    outOfStock: 'স্টক শেষ',
    tradeOffer: 'বিশেষ অফার',
    unitTP: 'ট্রেড প্রাইস (টিপি)',
    mrp: 'এম.আর.পি.',
    freeQty: 'ফ্রি ওষুধ',
    statusConfirmed: 'নিশ্চিত অর্ডার',
    statusPending: 'অনুমোদনের অপেক্ষায়',
    statusApproved: 'অনুমোদিত',
    exportExcel: 'এক্সেলে ডাউনলোড (.xlsx)',
    uploadExcel: 'এক্সেল দিয়ে পণ্য আপলোড',
    downloadTemplate: 'এক্সেল টেমপ্লেট ডাউনলোড',
    printInvoice: 'পিডিএফ ইনভয়েস প্রিন্ট',
    deleteOrder: 'অর্ডার ডিলিট',
    action: 'অ্যাকশন',
    approve: 'গ্রাহক অনুমোদন দিন',
    reject: 'বাতিল',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    customerName: 'মালিক / ডাক্তারের নাম',
    shopName: 'ফার্ম / দোকানের নাম',
    phone: 'মোবাইল নম্বর',
    category: 'ক্যাটাগরি',
    address: 'সম্পূর্ণ ঠিকানা',
    territory: 'টেরিটরি / এলাকা',
    creditLimit: 'বাকি নেওয়ার সীমা (টাকা)',
    balance: 'বর্তমান বকেয়া (টাকা)',
    filterDate: 'তারিখ নির্বাচন',
    filterCategory: 'ক্যাটাগরি ফিল্টার',
    daywiseSales: 'দৈনিক সেলস রিপোর্ট',
    productwiseSales: 'পণ্যভিত্তিক বিক্রয় বিশ্লেষণ',
    inventoryReport: 'গুদাম মজুদ ও স্টক মূল্যায়ন',
    resetDemo: 'লোকাল ক্যাশ পরিষ্কার',
    srStaffId: 'এসআর আইডি',
    srUsername: 'ইউজারনেম',
    srPassword: 'পাসওয়ার্ড',
    monthlyTarget: 'মাসিক সেলস টার্গেট (টাকা)',
    addSR: 'নতুন এসআর আইডি তৈরি করুন',
    dairyFarm: 'ডেইরি খামার',
    poultryFarm: 'পোল্ট্রি খামার',
    pharmacy: 'ভেট ফার্মেসি',
    feedMill: 'ফিড মিল ও ডিলার',
    target: 'মাসিক টার্গেট',
    achievement: 'অর্জিত',
    todayBookingCount: 'আজকের মোট অর্ডার',
    todayBookingValue: 'আজকের বুকিং মূল্য',
    units: 'টি',
    pcs: 'পিস',
    welcome: 'স্বাগতম',
    createFirstAdmin: 'প্রাথমিক অ্যাডমিন একাউন্ট তৈরি করুন',
    noAdminFound: 'ডাটাবেজে কোনো অ্যাডমিন একাউন্ট পাওয়া যায়নি। শুরু করতে প্রথম অ্যাডমিন তৈরি করুন।',
    noSrFound: 'ডাটাবেজে কোনো এসআর একাউন্ট নিবন্ধিত নেই।',
    syncFromDb: 'ডাটাবেস থেকে সিঙ্ক করুন',
    connectFirebase: 'ফায়ারবেস ডাটাবেস সংযুক্ত করুন',
    databaseSynced: 'ডাটাবেস সিঙ্ক সম্পন্ন',
    fieldSalesReport: 'ফিল্ড সেলস রিপোর্ট',
    centralSalesReport: 'কেন্দ্রীয় সেলস ও অ্যানালিটিক্স কন্ট্রোল',
    allSrsAndTerritories: 'সকল এসআর ও টেরিটরির লাইভ বিক্রয় বিশ্লেষণ',
    srTerritorySales: 'টেরিটরির দৈনিক, গ্রাহকভিত্তিক ও পণ্যভিত্তিক বিক্রয় বিবরণী',
    daywiseReportTitle: '১. দৈনিক সেলস রিপোর্ট',
    daywiseReportSubtitle: 'তারিখ অনুযায়ী মোট অর্ডার ও বিক্রয়ের বিস্তারিত হিসাব',
    custwiseReportTitle: '২. গ্রাহকভিত্তিক সেলস রিপোর্ট',
    custwiseReportSubtitle: 'সকল গ্রাহকের মোট অর্ডার, ক্রয়কৃত ইউনিট ও বকেয়ার বিবরণী',
    prodwiseReportTitle: '৩. পণ্যভিত্তিক বিক্রয় বিশ্লেষণ',
    prodwiseReportSubtitle: 'বিক্রিত ওষুধের পরিমাণ ও মোট রাজস্বের বিবরণ',
    dateCol: 'তারিখ',
    ordersCol: 'অর্ডার সংখ্যা',
    unitsCol: 'বিক্রিত ইউনিট',
    amountCol: 'মোট বিক্রয় (টাকা)',
    customerCol: 'গ্রাহক / ফার্মের নাম',
    proprietorCol: 'মালিক',
    dueBalanceCol: 'বর্তমান বকেয়া',
    productNameCol: 'ওষুধের নাম',
    packSizeCol: 'প্যাক সাইজ',
    rateCol: 'ট্রেড প্রাইস',
    quantityCol: 'বিক্রিত পরিমাণ',
    revenueCol: 'মোট রাজস্ব',
    filterReportsPlaceholder: 'তারিখ, গ্রাহকের নাম, মোবাইল অথবা ওষুধের নাম দিয়ে রিপোর্ট খুঁজুন...',
    monthlyTargetProgress: 'মাসিক সেলস টার্গেট অগ্রগতি',
    totalRevenue: 'মোট বুকিং বিক্রয়',
    totalOrdersCount: 'মোট অর্ডার সংখ্যা',
    totalUnitsDelivered: 'মোট ওষুধ ইউনিট',
    totalAssignedCustomers: 'নিবন্ধিত গ্রাহক সংখ্যা',
    bookProduct: 'অর্ডার স্লিপে নিন',
    quickOrder: 'দ্রুত বুকিং',
    allCategories: 'সকল ক্যাটাগরি',
    emergencyRestock: 'জরুরি রিস্টক প্রয়োজন',
    warehouseTotal: 'ওয়্যারহাউজ মোট স্টক',
    tradePriceValuation: 'ট্রেড প্রাইস মূল্যায়ন',
    stockManagementTitle: 'স্টক কন্ট্রোল ও ম্যানেজমেন্ট',
    stockManagementSubtitle: 'প্রতিটি ওষুধের মজুদ সরাসরি বাড়ান বা কমান। সাথে সাথে ডাটাবেজে সিঙ্ক হয়।',
    addNewProduct: '+ নতুন ওষুধ যোগ করুন',
    totalMedicineItems: 'মোট ওষুধ আইটেম',
    totalStockUnits: 'মোট মজুদ ইউনিট',
    lowStockItems: 'স্বল্প স্টক আইটেম (< ১০)',
    totalInventoryValuation: 'মোট স্টক মূল্য (টিপি)',
    showingMedicines: 'মোট {count} টি ওষুধ প্রদর্শিত',
    showingCustomers: 'মোট {count} জন গ্রাহক প্রদর্শিত',
    showingSrs: 'মোট {count} টি এসআর একাউন্ট',
    template: 'টেমপ্লেট ডাউনলোড',
    importExcel: 'এক্সেল ইমপোর্ট',
    createAdminBtn: '+ নতুন অ্যাডমিন',
    systemAdmins: 'সিস্টেম অ্যাডমিন একাউন্টস',
    assignedSrRep: 'নিযুক্ত এসআর:',
    filterBySR: 'এসআর ফিল্টার:',
    allSRsOption: 'সকল এসআর',
    assignedToYou: 'আপনার অধীনে',
    noCustomersAssigned: 'কোন গ্রাহক পাওয়া যায়নি',
    noCustomersAssignedSub: 'নতুন গ্রাহক রিকোয়েস্ট পাঠান অথবা অ্যাডমিন থেকে আপনার এসআর আইডিতে গ্রাহক অ্যাসাইন করুন।',
  }
};

export interface DBState {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  srs: SRUser[];
  admins: AdminUser[];
  lastUpdated: string;
}

export class Store {
  lang: string;
  theme: string;
  authSession: {
    isLoggedIn: boolean;
    user: SRUser | AdminUser | null;
    role: 'sr' | 'admin' | null;
  };
  activeTab: string;
  customerSearchQuery: string;
  catalogCategory: string;
  catalogSearch: string;
  cart: {
    customerId: string;
    items: Record<string, { product: Product; qty: number; freeQty: number; total: number }>;
    discount: number;
    notes: string;
  };
  db!: DBState;
  firebaseApp: any;
  firebaseDb: any;
  isFirebaseReady: boolean;
  /** Firebase সার্ভারের সাথে এখন যুক্ত কিনা (null = জানা নেই) */
  cloudConnected: boolean | null = null;
  private saveSeq = 0;
  private resyncStarted = false;

  constructor() {
    this.lang = localStorage.getItem(PREF_LANG_KEY) || 'en'; // Default English
    this.theme = localStorage.getItem(PREF_THEME_KEY) || 'light'; // Default Light
    
    // Auth session: restored from localStorage on page reload
    const savedAuth = localStorage.getItem(SESSION_AUTH_KEY);
    this.authSession = savedAuth ? JSON.parse(savedAuth) : {
      isLoggedIn: false,
      user: null,
      role: null
    };
    // এই সাইটের রুলস অনুযায়ী অনুমোদিত নয় এমন সেশন (যেমন SR সাইটে admin সেশন) বাতিল
    if (this.authSession.isLoggedIn && !canLoginAs(this.authSession.role)) {
      this.authSession = { isLoggedIn: false, user: null, role: null };
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(this.authSession));
    }

    // Initialize active tab from URL hash or user role
    const hashTab = (typeof window !== 'undefined' && window.location.hash) ? window.location.hash.replace('#', '') : '';
    if (hashTab && APP_RULES.tabs.includes(hashTab)) {
      this.activeTab = hashTab;
    } else {
      this.activeTab = APP_RULES.defaultTab;
    }
    this.customerSearchQuery = '';
    this.catalogCategory = 'all';
    this.catalogSearch = '';

    this.cart = {
      customerId: '',
      items: {},
      discount: 0,
      notes: ''
    };

    this.firebaseApp = null;
    this.firebaseDb = null;
    this.isFirebaseReady = false;

    this.initTheme();
    this.loadDatabase();
    if (this.authSession.isLoggedIn) this.restoreCart();
  }

  initTheme() {
    if (this.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(PREF_THEME_KEY, this.theme);
    this.initTheme();
  }

  setLang(lang: string) {
    this.lang = lang;
    localStorage.setItem(PREF_LANG_KEY, lang);
    document.documentElement.lang = lang;
  }

  t(key: string): string {
    return (I18N[this.lang] && I18N[this.lang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  formatCurrency(val: number): string {
    const num = (val || 0).toLocaleString();
    return this.lang === 'bn' ? `৳${num}` : `৳${num}`;
  }

  formatQty(qty: number): string {
    return this.lang === 'bn' ? `${qty} টি` : `${qty} units`;
  }

  loadDatabase() {
    // Purge legacy mock storage keys
    localStorage.removeItem('bioherbs_agrovet_db_v3');
    localStorage.removeItem('bioherbs_agrovet_db_v4');

    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      this.seedInitialData();
    } else {
      try {
        const parsed = JSON.parse(raw);
        // Ensure arrays and load all saved data
        this.db = {
          products: Array.isArray(parsed.products) ? parsed.products : [],
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          srs: Array.isArray(parsed.srs) ? parsed.srs : [],
          admins: Array.isArray(parsed.admins) ? parsed.admins : [],
          lastUpdated: parsed.lastUpdated || new Date().toISOString()
        };
      } catch (e) {
        this.seedInitialData();
      }
    }
    this.tryInitFirebase();
  }

  seedInitialData(syncToCloud: boolean = true) {
    this.db = {
      products: [],
      customers: [],
      orders: [],
      srs: [],
      admins: [],
      lastUpdated: new Date().toISOString()
    };
    if (syncToCloud) {
      this.saveDatabase();
    } else {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.db));
    }
  }


  // ================= Cart helpers (কার্ট ফোনে সেভ থাকে) =================
  /** ফ্রি ইউনিট হিসাব (ট্রেড অফার অনুযায়ী) */
  calcFreeQty(prod: Product, qty: number): number {
    const offer = prod.tradeOffer || '';
    if (offer.includes('10+1')) return Math.floor(qty / 10);
    if (offer.includes('20+2')) return Math.floor(qty / 20) * 2;
    if (offer.includes('25+3')) return Math.floor(qty / 25) * 3;
    if (offer.includes('15+1')) return Math.floor(qty / 15);
    return 0;
  }

  /** কার্টে প্রোডাক্টের পরিমাণ বসায় (০ হলে সরিয়ে দেয়) */
  setCartItem(prod: Product, qty: number) {
    if (qty <= 0) {
      delete this.cart.items[prod.id];
      return;
    }
    this.cart.items[prod.id] = {
      product: prod,
      qty,
      freeQty: this.calcFreeQty(prod, qty),
      total: qty * prod.tradePrice
    };
  }

  persistCart() {
    try {
      const owner = this.authSession.user?.id;
      if (!owner) return;
      const items: Record<string, number> = {};
      Object.keys(this.cart.items).forEach(k => { items[k] = this.cart.items[k].qty; });
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        owner, customerId: this.cart.customerId, discount: this.cart.discount, notes: this.cart.notes, items
      }));
    } catch { /* storage full/blocked */ }
  }

  /** লগইনকারীর সেভ করা কার্ট ফিরিয়ে আনে (অন্যের কার্ট কখনো না) */
  restoreCart() {
    try {
      const owner = this.authSession.user?.id;
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!owner || !raw) return;
      const saved = JSON.parse(raw);
      if (saved.owner !== owner) return;
      this.cart = { customerId: saved.customerId || '', items: {}, discount: Number(saved.discount) || 0, notes: saved.notes || '' };
      Object.keys(saved.items || {}).forEach(id => {
        const prod = (this.db.products || []).find(p => p.id === id);
        const qty = Math.min(Number(saved.items[id]) || 0, prod ? prod.stock : 0);
        if (prod && qty > 0) this.setCartItem(prod, qty);
      });
    } catch { /* ignore corrupt cart */ }
  }

  /** দাম/স্টক বদলালে কার্টের আইটেম নতুন প্রোডাক্ট তথ্যের সাথে মিলিয়ে নেয় */
  syncCartWithProducts() {
    Object.keys(this.cart.items).forEach(id => {
      const prod = (this.db.products || []).find(p => p.id === id);
      if (!prod || prod.stock <= 0) { delete this.cart.items[id]; return; }
      this.setCartItem(prod, Math.min(this.cart.items[id].qty, prod.stock));
    });
  }

  // ================= অফলাইন সিঙ্ক =================
  get hasPendingSync(): boolean {
    try { return localStorage.getItem(PENDING_SYNC_KEY) === '1'; } catch { return false; }
  }

  private setPending(v: boolean) {
    try {
      if (v) localStorage.setItem(PENDING_SYNC_KEY, '1'); else localStorage.removeItem(PENDING_SYNC_KEY);
    } catch { /* ignore */ }
    if (!v) this.resyncStarted = false;
    this.emitNetChange();
  }

  emitNetChange() {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bhagro:net'));
      }
    } catch { /* ignore */ }
  }

  private loadSyncedIds(): { orders: Set<string>; customers: Set<string> } {
    try {
      const raw = JSON.parse(localStorage.getItem(SYNCED_IDS_KEY) || '{}');
      return { orders: new Set<string>(raw.orders || []), customers: new Set<string>(raw.customers || []) };
    } catch {
      return { orders: new Set<string>(), customers: new Set<string>() };
    }
  }

  private saveSyncedIds(orders: string[], customers: string[]) {
    try { localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify({ orders, customers })); } catch { /* ignore */ }
  }

  private buildCloudPayload(): Record<string, any> {
    const payload: Record<string, any> = { lastUpdated: this.db.lastUpdated };
    APP_RULES.writablePaths.forEach(path => { payload[path] = (this.db as any)[path] || []; });
    return payload;
  }

  private pushToCloud() {
    if (!(this.isFirebaseReady && this.firebaseDb)) return;
    const track = APP_RULES.mode === 'sr';
    const seq = ++this.saveSeq;
    try {
      this.firebaseDb.ref('bioherbs_agrovet').update(this.buildCloudPayload())
        .then(() => { if (track && seq === this.saveSeq) this.setPending(false); })
        .catch((err: any) => console.warn('Firebase sync warning:', err));
    } catch (e) {
      console.warn('Firebase sync failed:', e);
    }
  }

  /**
   * ফোনে সেভ হয়েছে কিন্তু ক্লাউডে পৌঁছায়নি এমন নতুন অর্ডার/কাস্টমার ক্লাউডের ডাটার সাথে জুড়ে দেয়।
   * (অ্যাডমিন যা মুছে দিয়েছে তা ফিরে আসে না)
   */
  private mergeUnsynced(remote: { products: Product[]; customers: Customer[]; orders: Order[]; srs: SRUser[]; admins: AdminUser[] }) {
    const synced = this.loadSyncedIds();
    const remoteOrderIds = new Set(remote.orders.map(o => o.id));
    const remoteCustIds = new Set(remote.customers.map(c => c.id));
    const newOrders = (this.db.orders || []).filter(o => !remoteOrderIds.has(o.id) && !synced.orders.has(o.id));
    const newCustomers = (this.db.customers || []).filter(c => !remoteCustIds.has(c.id) && !synced.customers.has(c.id));

    const products = remote.products.map(p => ({ ...p }));
    newOrders.forEach(o => o.items.forEach(it => {
      const prod = products.find(p => p.id === it.productId);
      if (prod) prod.stock = Math.max(0, prod.stock - it.qty);
    }));

    return {
      merged: {
        ...remote,
        products,
        orders: [...newOrders, ...remote.orders],
        customers: [...remote.customers, ...newCustomers]
      },
      added: newOrders.length + newCustomers.length
    };
  }

  saveDatabase() {
    this.db.lastUpdated = new Date().toISOString();
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.db));

    // এসআর সাইট: ক্লাউডে পৌঁছানো নিশ্চিত না হওয়া পর্যন্ত "সিঙ্ক বাকি" চিহ্ন থাকে
    if (APP_RULES.mode === 'sr') this.setPending(true);
    this.pushToCloud();
  }

  clearLocalCache() {
    localStorage.removeItem(DB_STORAGE_KEY);
    // শুধু লোকাল ক্যাশ খালি হবে; ক্লাউড ডাটাবেসে কিছু লেখা হবে না
    this.seedInitialData(false);
    if (this.isFirebaseReady && this.firebaseDb) {
      this.tryInitFirebase();
    }
  }

  tryInitFirebase() {
    const config = getFirebaseConfig();
    if (!config) return;
    try {
      const fb = (window as any).firebase;
      if (config && config.databaseURL && fb) {
        if (!fb.apps.length) {
          this.firebaseApp = fb.initializeApp(config);
        } else {
          this.firebaseApp = fb.app();
        }
        this.firebaseDb = fb.database();
        this.isFirebaseReady = true;

        const updateFromSnapshot = (val: any) => {
          if (!val) return;
          const target = val.bioherbs_agrovet ? val.bioherbs_agrovet : val;
          const products = Array.isArray(target.products) ? target.products : (target.products ? Object.values(target.products) : []);
          const customers = Array.isArray(target.customers) ? target.customers : (target.customers ? Object.values(target.customers) : []);
          const orders = Array.isArray(target.orders) ? target.orders : (target.orders ? Object.values(target.orders) : []);
          const srs = Array.isArray(target.srs) ? target.srs : (target.srs ? Object.values(target.srs) : []);
          const admins = Array.isArray(target.admins) ? target.admins : (target.admins ? Object.values(target.admins) : []);

          const remote = {
            products: products as Product[],
            customers: customers as Customer[],
            orders: orders as Order[],
            srs: srs as SRUser[],
            admins: admins as AdminUser[]
          };
          const remoteOrderIds = remote.orders.map(o => o.id);
          const remoteCustomerIds = remote.customers.map(c => c.id);
          let mergedCount = 0;
          if (APP_RULES.mode === 'sr' && this.hasPendingSync) {
            const result = this.mergeUnsynced(remote);
            this.db = { ...result.merged, lastUpdated: target.lastUpdated || new Date().toISOString() };
            mergedCount = result.added;
          } else {
            this.db = { ...remote, lastUpdated: target.lastUpdated || new Date().toISOString() };
          }
          this.saveSyncedIds(remoteOrderIds, remoteCustomerIds);
          localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.db));
          this.syncCartWithProducts();
          this.persistCart();
          // আগের সেশনে ক্লাউডে পৌঁছানো নিশ্চিত হয়নি: একবার আবার পাঠিয়ে নিশ্চিত করা (ack এলে চিহ্ন মুছে যায়)
          if (APP_RULES.mode === 'sr' && this.hasPendingSync && (mergedCount > 0 || !this.resyncStarted)) {
            this.resyncStarted = true;
            this.pushToCloud();
          }
          if ((window as any).App && (window as any).App.render) {
            (window as any).App.render();
          }
        };

        // সার্ভারের সাথে সংযোগ আছে কিনা (অফলাইন সংকেতের জন্য)
        try {
          this.firebaseDb.ref('.info/connected').on('value', (snap: any) => {
            this.cloudConnected = !!snap.val();
            this.emitNetChange();
          });
        } catch { /* ignore */ }

        // Listen on /bioherbs_agrovet
        this.firebaseDb.ref('bioherbs_agrovet').on('value', (snapshot: any) => {
          const val = snapshot.val();
          if (val) {
            updateFromSnapshot(val);
          } else {
            // Also check root if user uploaded at root
            this.firebaseDb.ref().once('value', (rootSnap: any) => {
              const rootVal = rootSnap.val();
              if (rootVal && (rootVal.products || rootVal.srs || rootVal.admins || rootVal.customers)) {
                updateFromSnapshot(rootVal);
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn('Firebase initialization skipped/failed:', e);
      this.isFirebaseReady = false;
    }
  }

  setAuth(user: SRUser | AdminUser | null, role: 'sr' | 'admin' | null) {
    this.authSession = {
      isLoggedIn: !!user,
      user: user,
      role: role
    };
    localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(this.authSession));
    this.activeTab = role === 'admin' ? 'dashboard' : 'home';
    // কার্ট: লগআউটে খালি, লগইনে নিজের সেভ করা কার্ট ফিরে আসে
    this.cart = { customerId: '', items: {}, discount: 0, notes: '' };
    if (user) this.restoreCart();
  }

  logout() {
    this.setAuth(null, null);
  }

  // ===== SR helpers (সফট ডিলিট + আইডি নিরাপত্তা) =====
  /** ডিলিট না হওয়া এসআরদের তালিকা (লগইন, ড্রপডাউন, তালিকার জন্য) */
  getActiveSrs(): SRUser[] {
    return (this.db.srs || []).filter(s => !s.deletedAt);
  }

  /** ডিলিট করা এসআরদের তালিকা */
  getDeletedSrs(): SRUser[] {
    return (this.db.srs || []).filter(s => !!s.deletedAt);
  }

  /** এই আইডি কখনো ব্যবহার হয়েছে কিনা (এসআর তালিকা, অর্ডার বা কাস্টমারে) */
  isSrIdUsed(id: string): boolean {
    const key = (id || '').trim().toLowerCase();
    if (!key) return false;
    return (this.db.srs || []).some(s => (s.id || '').trim().toLowerCase() === key)
      || (this.db.orders || []).some(o => (o.srId || '').trim().toLowerCase() === key)
      || (this.db.customers || []).some(c =>
          (c.assignedSrId || '').trim().toLowerCase() === key || (c.createdBy || '').trim().toLowerCase() === key);
  }

  /** পরবর্তী এসআর আইডি: এ পর্যন্ত ব্যবহৃত সর্বোচ্চ নম্বরের পরেরটা (ডিলিট করা আইডি কখনো ফেরত আসে না) */
  getNextSrId(): string {
    let max = 0;
    const scan = (id?: string) => {
      const m = /^SR(\d+)$/i.exec((id || '').trim());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    };
    (this.db.srs || []).forEach(s => scan(s.id));
    (this.db.orders || []).forEach(o => scan(o.srId));
    (this.db.customers || []).forEach(c => { scan(c.assignedSrId); scan(c.createdBy); });
    return `SR${String(max + 1).padStart(2, '0')}`;
  }

  /**
   * রিপোর্টের জন্য এসআর তালিকা: চালু এসআর + অর্ডার আছে এমন ডিলিট করা এসআর ("প্রাক্তন" লেবেলসহ)
   * + অর্ডারে আছে কিন্তু তালিকায় নেই এমন পুরনো এসআর। ফলে মোট বিক্রির সাথে এসআরদের যোগফল মেলে।
   */
  getReportSrList(): SRUser[] {
    const suffix = this.lang === 'bn' ? ' (প্রাক্তন)' : ' (Former)';
    const orders = this.db.orders || [];
    const all = this.db.srs || [];
    const hasOrders = (id: string) => orders.some(o => o.srId === id);
    const list: SRUser[] = all
      .filter(s => !s.deletedAt || hasOrders(s.id))
      .map(s => s.deletedAt ? { ...s, name: `${s.name}${suffix}` } : s);
    const known = new Set(all.map(s => s.id));
    const added = new Set<string>();
    orders.forEach(o => {
      if (o.srId && !known.has(o.srId) && !added.has(o.srId)) {
        added.add(o.srId);
        list.push({
          id: o.srId, username: '', password: '', name: `${o.srName || o.srId}${suffix}`,
          phone: '', territory: o.territory || '', target: 0, active: false, deletedAt: 'legacy'
        });
      }
    });
    return list;
  }

  getNextCustomerId(): string {
    let maxNum = 0;
    this.db.customers.forEach(c => {
      if (c.id && c.id.startsWith('BH')) {
        const num = parseInt(c.id.replace('BH', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return 'BH' + String(maxNum + 1).padStart(4, '0');
  }
}

export const store = new Store();
