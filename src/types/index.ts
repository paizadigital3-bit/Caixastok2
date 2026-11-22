import type { Timestamp } from 'firebase/firestore';

export type TabId = 'painel' | 'stock' | 'fiados' | 'relatorios';

export type PaymentMethod = 'dinheiro' | 'multicaixa' | 'fiado';
export type PaidMethod = '' | 'dinheiro' | 'multicaixa';
export type SaleMode = 'unit' | 'box' | 'both';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: 'merchant' | 'creator';
  subscriptionStatus: 'trial' | 'active' | 'revoked';
  trialStartAt: Timestamp;
  trialEndsAt: Timestamp;
  subscriptionEndsAt?: Timestamp | null;
  subscriptionMonths: number;
  activatedCode?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MerchantConfig {
  uid: string;
  liquidCapital: number;
  pinCode: string;
  archivedMonths: string[];
  updatedAt: Timestamp;
}

export interface Product {
  id: string;
  uid: string;
  name: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  boxPrice: number;
  unitsPerBox: number;
  stockUnits: number;
  minStockAlert: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Sale {
  id: string;
  uid: string;
  productId: string;
  productName: string;
  saleMode: SaleMode;
  unitsQty: number;
  boxesQty: number;
  totalUnitsSold: number;
  unitCostAtSale: number;
  totalAmount: number;
  capitalPortion: number;
  profitPortion: number;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'pending';
  customerName: string;
  customerPhone: string;
  dueDate: string;
  paidDate: string;
  paidMethod: PaidMethod;
  saleDate: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Expense {
  id: string;
  uid: string;
  type: 'expense' | 'stock_purchase';
  description: string;
  category: string;
  amount: number;
  paymentMethod: 'dinheiro' | 'multicaixa' | 'capital';
  expenseDate: string;
  productId: string;
  unitsAdded: number;
  transportCost: number;
  createdAt?: Timestamp;
}

export interface MonthlyReport {
  id: string;
  uid: string;
  monthKey: string;
  totalSales: number;
  totalCash: number;
  totalMulticaixa: number;
  totalExpenses: number;
  netProfit: number;
  liquidCapitalSnapshot: number;
  closedDate: string;
  closedAt?: Timestamp;
}

export interface ActivationCode {
  id: string;
  code: string;
  months: number;
  status: 'active' | 'used' | 'revoked';
  createdByEmail: string;
  usedByUid?: string | null;
  usedByEmail?: string | null;
  note: string;
  createdAt?: Timestamp;
  usedAt?: Timestamp | null;
}

export interface PaymentProof {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  phone: string;
  entity: 'Caixastok';
  recipientEmail: 'paizadigital3@gmail.com';
  months: number;
  totalAmountKz: number;
  paymentChannel: 'multicaixa' | 'iban';
  proofImageData: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  generatedCode?: string | null;
  createdAt?: Timestamp;
  reviewedAt?: Timestamp | null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
