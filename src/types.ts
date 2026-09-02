export enum ProductCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  LEAFY = 'herbs',
  BOXES = 'boxes',
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory | 'vegetables' | 'fruits' | 'herbs' | 'boxes';
  image: string;
  unit: string; // e.g. 'كغ', 'حبة', 'ربطة', 'بكسة', 'شوال', 'علبة'
  price: number; // Unit price in JOD
  active: boolean;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  category: ProductCategory | 'vegetables' | 'fruits' | 'herbs' | 'boxes';
  image?: string;
  unit: string;
  quantity: number; // e.g. 2.350
  unitPrice: number; // e.g. 0.750
  total: number; // calculated quantity * unitPrice
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  address?: string;
  createdAt: string;
}

export interface Invoice {
  id: string; // e.g. 'INV-1006'
  date: string; // YYYY-MM-DD or formatted
  time: string; // HH:mm
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee?: number;
  discount: number;
  total: number;
  status: 'paid' | 'pending' | 'unpaid';
  paymentMethod?: 'cash' | 'card' | 'debt';
  notes?: string;
}

export interface ShopSettings {
  shopName: string;
  shopSubtitle: string;
  phone: string;
  whatsapp: string;
  address: string;
  slogan: string;
  logoUrl?: string;
  todayPricesTitle?: string;
  startingInvoiceNumber: number;
  decimalPlaces: number; // 2 or 3
  roundingMode: '2' | '3';
  currency: string;
  deliveryAvailable: boolean;
  footerMessage?: string;
  invoiceNote?: string;
  requireLogin?: boolean;
  username?: string;
  password?: string;
}

export type ActiveTab = 'home' | 'invoices' | 'new-invoice' | 'products' | 'customers' | 'more' | 'today-prices' | 'edit-prices' | 'settings' | 'journal';

export interface GoogleSheetsSyncStatus {
  isConnected: boolean;
  syncMode?: 'oauth' | 'webhook';
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  webhookUrl?: string;
  lastSyncedAt?: string;
  isSyncing: boolean;
  error?: string;
  userEmail?: string;
  autoSyncEnabled?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

export interface DailyReport {
  id: string;
  date: string;
  startingCapital: number;
  cashRevenue: number;
  debtRevenue: number;
  totalExpenses: number;
  netProfit: number;
}
