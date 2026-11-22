import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  CREATOR_EMAIL,
  MONTHLY_PRICE_KZ,
  PROOF_ENTITY,
  db,
  handleFirestoreError,
} from '../lib/firebase';
import {
  OperationType,
  type ActivationCode,
  type Expense,
  type MerchantConfig,
  type MonthlyReport,
  type PaidMethod,
  type PaymentMethod,
  type PaymentProof,
  type Product,
  type Sale,
  type SaleMode,
  type UserAccount,
} from '../types';
import { generateActivationCodeString, getDeviceTodayISO, makeSafeId } from '../utils/formatters';

export async function ensureUserAccountAndConfig(user: User): Promise<void> {
  const uid = user.uid;
  const userRef = doc(db, 'users', uid);
  const configRef = doc(db, 'users', uid, 'config', 'main');

  try {
    const userSnap = await getDoc(userRef);
    const isCreator = (user.email || '').toLowerCase() === CREATOR_EMAIL.toLowerCase();

    if (!userSnap.exists()) {
      const trialEndsMs = Date.now() + 14 * 24 * 60 * 60 * 1000;
      await setDoc(userRef, {
        uid,
        email: user.email || '',
        displayName: (user.displayName || user.email?.split('@')[0] || 'Comerciante').slice(0, 100),
        photoURL: user.photoURL ? user.photoURL.slice(0, 500) : null,
        role: isCreator ? 'creator' : 'merchant',
        subscriptionStatus: isCreator ? 'active' : 'trial',
        trialStartAt: serverTimestamp(),
        trialEndsAt: Timestamp.fromMillis(trialEndsMs),
        subscriptionEndsAt: null,
        subscriptionMonths: isCreator ? 240 : 0,
        activatedCode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      await setDoc(configRef, {
        uid,
        liquidCapital: 0,
        pinCode: '0000',
        archivedMonths: [],
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export function subscribeUserAccount(
  uid: string,
  cb: (account: UserAccount | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      cb(snap.exists() ? (snap.data() as UserAccount) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeMerchantConfig(
  uid: string,
  cb: (config: MerchantConfig | null) => void
): Unsubscribe {
  const path = `users/${uid}/config/main`;
  return onSnapshot(
    doc(db, 'users', uid, 'config', 'main'),
    (snap) => {
      cb(snap.exists() ? (snap.data() as MerchantConfig) : null);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeProducts(uid: string, cb: (items: Product[]) => void): Unsubscribe {
  const path = `users/${uid}/products`;
  const q = query(collection(db, 'users', uid, 'products'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Product[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, 'id'>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeSales(uid: string, cb: (items: Sale[]) => void): Unsubscribe {
  const path = `users/${uid}/sales`;
  const q = query(collection(db, 'users', uid, 'sales'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Sale[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Sale, 'id'>),
      }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeExpenses(uid: string, cb: (items: Expense[]) => void): Unsubscribe {
  const path = `users/${uid}/expenses`;
  const q = query(collection(db, 'users', uid, 'expenses'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Expense[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, 'id'>),
      }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeReports(uid: string, cb: (items: MonthlyReport[]) => void): Unsubscribe {
  const path = `users/${uid}/reports`;
  const q = query(collection(db, 'users', uid, 'reports'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: MonthlyReport[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MonthlyReport, 'id'>),
      }));
      list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function createProduct(
  uid: string,
  input: {
    name: string;
    category: string;
    unitCost: number;
    unitPrice: number;
    boxPrice: number;
    unitsPerBox: number;
    stockUnits: number;
    minStockAlert: number;
    transportCost: number;
    deductFromCapital: boolean;
    purchaseDate: string;
  }
): Promise<void> {
  const productId = makeSafeId('prod');
  const productRef = doc(db, 'users', uid, 'products', productId);
  const configRef = doc(db, 'users', uid, 'config', 'main');

  try {
    const batch = writeBatch(db);
    const totalBatchCost = input.stockUnits * input.unitCost + input.transportCost;
    const realUnitCost =
      input.stockUnits > 0 ? Math.round((totalBatchCost / input.stockUnits) * 100) / 100 : input.unitCost;

    batch.set(productRef, {
      uid,
      name: input.name.trim().slice(0, 100),
      category: (input.category.trim() || 'Geral').slice(0, 60),
      unitCost: Math.max(0, realUnitCost),
      unitPrice: Math.max(0, input.unitPrice),
      boxPrice: Math.max(0, input.boxPrice),
      unitsPerBox: Math.max(1, Math.round(input.unitsPerBox)),
      stockUnits: Math.max(0, input.stockUnits),
      minStockAlert: Math.max(0, input.minStockAlert),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (input.stockUnits > 0 && totalBatchCost > 0) {
      const expId = makeSafeId('exp');
      batch.set(doc(db, 'users', uid, 'expenses', expId), {
        uid,
        type: 'stock_purchase',
        description: `Compra inicial: ${input.name.trim()}`.slice(0, 160),
        category: 'Compra de Stock',
        amount: Math.round(totalBatchCost * 100) / 100,
        paymentMethod: input.deductFromCapital ? 'capital' : 'dinheiro',
        expenseDate: input.purchaseDate || getDeviceTodayISO(),
        productId,
        unitsAdded: input.stockUnits,
        transportCost: input.transportCost,
        createdAt: serverTimestamp(),
      });

      if (input.deductFromCapital) {
        batch.update(configRef, {
          liquidCapital: increment(-Math.round(totalBatchCost * 100) / 100),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/products/${productId}`);
  }
}

export async function updateProductDetails(
  uid: string,
  productId: string,
  updates: {
    name: string;
    category: string;
    unitCost: number;
    unitPrice: number;
    boxPrice: number;
    unitsPerBox: number;
    minStockAlert: number;
  }
): Promise<void> {
  const path = `users/${uid}/products/${productId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'products', productId), {
      name: updates.name.trim().slice(0, 100),
      category: (updates.category.trim() || 'Geral').slice(0, 60),
      unitCost: Math.max(0, updates.unitCost),
      unitPrice: Math.max(0, updates.unitPrice),
      boxPrice: Math.max(0, updates.boxPrice),
      unitsPerBox: Math.max(1, Math.round(updates.unitsPerBox)),
      minStockAlert: Math.max(0, updates.minStockAlert),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function restockProduct(
  uid: string,
  product: Product,
  input: {
    unitsToAdd: number;
    lotCost: number;
    transportCost: number;
    deductFromCapital: boolean;
    purchaseDate: string;
  }
): Promise<void> {
  const path = `users/${uid}/products/${product.id}`;
  try {
    const batch = writeBatch(db);
    const unitsAdded = Math.max(1, input.unitsToAdd);
    const totalOutlay = Math.max(0, input.lotCost + input.transportCost);
    const newBatchUnitCost = totalOutlay > 0 ? totalOutlay / unitsAdded : product.unitCost;
    const prevValue = product.stockUnits * product.unitCost;
    const nextStock = product.stockUnits + unitsAdded;
    const weightedUnitCost =
      totalOutlay > 0
        ? Math.round(((prevValue + totalOutlay) / nextStock) * 100) / 100
        : product.unitCost;

    batch.update(doc(db, 'users', uid, 'products', product.id), {
      stockUnits: nextStock,
      unitCost: weightedUnitCost > 0 ? weightedUnitCost : newBatchUnitCost,
      updatedAt: serverTimestamp(),
    });

    if (totalOutlay > 0) {
      const expId = makeSafeId('exp');
      batch.set(doc(db, 'users', uid, 'expenses', expId), {
        uid,
        type: 'stock_purchase',
        description: `Reposição: ${product.name} (+${unitsAdded} un)`.slice(0, 160),
        category: 'Compra de Stock',
        amount: Math.round(totalOutlay * 100) / 100,
        paymentMethod: input.deductFromCapital ? 'capital' : 'dinheiro',
        expenseDate: input.purchaseDate || getDeviceTodayISO(),
        productId: product.id,
        unitsAdded,
        transportCost: input.transportCost,
        createdAt: serverTimestamp(),
      });

      if (input.deductFromCapital) {
        batch.update(doc(db, 'users', uid, 'config', 'main'), {
          liquidCapital: increment(-Math.round(totalOutlay * 100) / 100),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProduct(uid: string, productId: string): Promise<void> {
  const path = `users/${uid}/products/${productId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function registerSale(
  uid: string,
  product: Product,
  input: {
    saleMode: SaleMode;
    unitsQty: number;
    boxesQty: number;
    totalUnitsSold: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    customerName: string;
    customerPhone: string;
    dueDate: string;
    saleDate: string;
  }
): Promise<void> {
  const saleId = makeSafeId('sale');
  const path = `users/${uid}/sales/${saleId}`;
  if (input.totalUnitsSold > product.stockUnits) {
    throw new Error('Quantidade superior ao stock disponível.');
  }

  try {
    const batch = writeBatch(db);
    const capitalPortion = Math.round(input.totalUnitsSold * product.unitCost * 100) / 100;
    const profitPortion = Math.round((input.totalAmount - capitalPortion) * 100) / 100;
    const isFiado = input.paymentMethod === 'fiado';

    batch.set(doc(db, 'users', uid, 'sales', saleId), {
      uid,
      productId: product.id,
      productName: product.name.slice(0, 100),
      saleMode: input.saleMode,
      unitsQty: input.unitsQty,
      boxesQty: input.boxesQty,
      totalUnitsSold: input.totalUnitsSold,
      unitCostAtSale: product.unitCost,
      totalAmount: Math.round(input.totalAmount * 100) / 100,
      capitalPortion,
      profitPortion,
      paymentMethod: input.paymentMethod,
      status: isFiado ? 'pending' : 'paid',
      customerName: (input.customerName || '').trim().slice(0, 100),
      customerPhone: (input.customerPhone || '').trim().slice(0, 30),
      dueDate: isFiado ? input.dueDate : '',
      paidDate: isFiado ? '' : input.saleDate,
      paidMethod: (isFiado ? '' : input.paymentMethod) as PaidMethod,
      saleDate: input.saleDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'users', uid, 'products', product.id), {
      stockUnits: Math.max(0, product.stockUnits - input.totalUnitsSold),
      updatedAt: serverTimestamp(),
    });

    if (!isFiado) {
      batch.update(doc(db, 'users', uid, 'config', 'main'), {
        liquidCapital: increment(capitalPortion),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function confirmFiadoPayment(
  uid: string,
  sale: Sale,
  paidMethod: 'dinheiro' | 'multicaixa',
  paidDate: string
): Promise<void> {
  const path = `users/${uid}/sales/${sale.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'sales', sale.id), {
      status: 'paid',
      paidDate,
      paidMethod,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', uid, 'config', 'main'), {
      liquidCapital: increment(sale.capitalPortion),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function registerExpense(
  uid: string,
  input: {
    description: string;
    category: string;
    amount: number;
    paymentMethod: 'dinheiro' | 'multicaixa' | 'capital';
    expenseDate: string;
  }
): Promise<void> {
  const expId = makeSafeId('exp');
  const path = `users/${uid}/expenses/${expId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'expenses', expId), {
      uid,
      type: 'expense',
      description: input.description.trim().slice(0, 160),
      category: (input.category.trim() || 'Operacional').slice(0, 60),
      amount: Math.round(input.amount * 100) / 100,
      paymentMethod: input.paymentMethod,
      expenseDate: input.expenseDate,
      productId: '',
      unitsAdded: 0,
      transportCost: 0,
      createdAt: serverTimestamp(),
    });

    if (input.paymentMethod === 'capital') {
      batch.update(doc(db, 'users', uid, 'config', 'main'), {
        liquidCapital: increment(-Math.round(input.amount * 100) / 100),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adjustLiquidCapital(uid: string, newCapital: number): Promise<void> {
  const path = `users/${uid}/config/main`;
  try {
    await updateDoc(doc(db, 'users', uid, 'config', 'main'), {
      liquidCapital: Math.round(newCapital * 100) / 100,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePinCode(uid: string, newPin: string): Promise<void> {
  const path = `users/${uid}/config/main`;
  try {
    await updateDoc(doc(db, 'users', uid, 'config', 'main'), {
      pinCode: newPin,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function archiveMonthReport(
  uid: string,
  config: MerchantConfig,
  report: {
    monthKey: string;
    totalSales: number;
    totalCash: number;
    totalMulticaixa: number;
    totalExpenses: number;
    netProfit: number;
    closedDate: string;
  }
): Promise<void> {
  const reportId = `rep_${report.monthKey}`;
  const path = `users/${uid}/reports/${reportId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'reports', reportId), {
      uid,
      monthKey: report.monthKey,
      totalSales: Math.round(report.totalSales * 100) / 100,
      totalCash: Math.round(report.totalCash * 100) / 100,
      totalMulticaixa: Math.round(report.totalMulticaixa * 100) / 100,
      totalExpenses: Math.round(report.totalExpenses * 100) / 100,
      netProfit: Math.round(report.netProfit * 100) / 100,
      liquidCapitalSnapshot: config.liquidCapital,
      closedDate: report.closedDate,
      closedAt: serverTimestamp(),
    });

    const nextArchived = Array.from(new Set([...config.archivedMonths, report.monthKey])).slice(0, 120);
    batch.update(doc(db, 'users', uid, 'config', 'main'), {
      archivedMonths: nextArchived,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearAllMerchantData(uid: string): Promise<void> {
  const base = `users/${uid}`;
  try {
    const subcols = ['products', 'sales', 'expenses', 'reports'] as const;
    const docsToDelete: { col: string; id: string }[] = [];

    for (const colName of subcols) {
      const snap = await getDocs(query(collection(db, 'users', uid, colName), where('uid', '==', uid)));
      snap.forEach((d) => docsToDelete.push({ col: colName, id: d.id }));
    }

    // Batch in chunks of 400
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docsToDelete.slice(i, i + 400);
      for (const item of chunk) {
        batch.delete(doc(db, 'users', uid, item.col, item.id));
      }
      await batch.commit();
    }

    await updateDoc(doc(db, 'users', uid, 'config', 'main'), {
      liquidCapital: 0,
      archivedMonths: [],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, base);
  }
}

export async function redeemActivationCode(
  user: User,
  account: UserAccount,
  rawCode: string
): Promise<{ months: number }> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(code)) {
    throw new Error('Formato de código inválido.');
  }

  const codeRef = doc(db, 'activationCodes', code);
  const userRef = doc(db, 'users', user.uid);

  let codeSnap;
  try {
    codeSnap = await getDoc(codeRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `activationCodes/${code}`);
  }

  if (!codeSnap.exists()) {
    throw new Error('Código de ativação não encontrado.');
  }
  const codeData = codeSnap.data() as ActivationCode;
  if (codeData.status !== 'active') {
    throw new Error(
      codeData.status === 'used'
        ? 'Este código já foi utilizado.'
        : 'Este código foi revogado.'
    );
  }

  const months = codeData.months;
  const nowMs = Date.now();
  const currentEndMs = account.subscriptionEndsAt?.toMillis?.() ?? 0;
  const baseMs = Math.max(nowMs, currentEndMs);
  const newEndMs = baseMs + months * 30 * 24 * 60 * 60 * 1000;

  try {
    const batch = writeBatch(db);
    batch.update(codeRef, {
      status: 'used',
      usedByUid: user.uid,
      usedByEmail: user.email || '',
      usedAt: serverTimestamp(),
    });
    batch.update(userRef, {
      subscriptionStatus: 'active',
      subscriptionMonths: months,
      subscriptionEndsAt: Timestamp.fromMillis(newEndMs),
      activatedCode: code,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return { months };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `activationCodes/${code}`);
  }
}

export async function submitPaymentProof(
  user: User,
  input: {
    userName: string;
    phone: string;
    months: number;
    monthlyPriceKz: number;
    paymentChannel: 'multicaixa' | 'iban';
    proofImageData: string;
    notes: string;
  }
): Promise<void> {
  const proofId = makeSafeId('proof');
  const path = `paymentProofs/${proofId}`;
  try {
    await setDoc(doc(db, 'paymentProofs', proofId), {
      uid: user.uid,
      userName: input.userName.trim().slice(0, 100),
      userEmail: (user.email || '').slice(0, 120),
      phone: input.phone.trim().slice(0, 30),
      entity: PROOF_ENTITY,
      recipientEmail: CREATOR_EMAIL,
      months: input.months,
      totalAmountKz: input.months * input.monthlyPriceKz,
      paymentChannel: input.paymentChannel,
      proofImageData: input.proofImageData,
      notes: input.notes.trim().slice(0, 300),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeBillingPrice(cb: (monthlyPriceKz: number) => void): Unsubscribe {
  const path = 'appSettings/billing';
  return onSnapshot(
    doc(db, 'appSettings', 'billing'),
    (snap) => {
      if (snap.exists()) {
        const val = Number((snap.data() as { monthlyPriceKz?: number }).monthlyPriceKz);
        if (Number.isFinite(val) && val >= 100) {
          cb(val);
          return;
        }
      }
      cb(MONTHLY_PRICE_KZ);
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

// ==================== CREATOR EXCLUSIVE (paizadigital3@gmail.com) ====================

export function subscribeAllActivationCodes(cb: (codes: ActivationCode[]) => void): Unsubscribe {
  const q = query(collection(db, 'activationCodes'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivationCode, 'id'>),
        }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'activationCodes')
  );
}

export function subscribeAllUsers(cb: (users: UserAccount[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as UserAccount));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'users')
  );
}

export function subscribeAllPaymentProofs(cb: (proofs: PaymentProof[]) => void): Unsubscribe {
  const q = query(collection(db, 'paymentProofs'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PaymentProof, 'id'>),
        }))
      );
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'paymentProofs')
  );
}

export async function creatorGenerateCode(
  creatorEmail: string,
  months: number,
  note: string
): Promise<string> {
  const code = generateActivationCodeString();
  const path = `activationCodes/${code}`;
  try {
    await setDoc(doc(db, 'activationCodes', code), {
      code,
      months: Math.max(1, Math.min(24, months)),
      status: 'active',
      createdByEmail: creatorEmail,
      note: note.trim().slice(0, 120),
      createdAt: serverTimestamp(),
    });
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function creatorRevokeCode(code: string): Promise<void> {
  const path = `activationCodes/${code}`;
  try {
    await updateDoc(doc(db, 'activationCodes', code), {
      status: 'revoked',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function creatorApprovePaymentProof(
  creatorEmail: string,
  proof: PaymentProof
): Promise<string> {
  const code = generateActivationCodeString();
  const codeRef = doc(db, 'activationCodes', code);
  const proofRef = doc(db, 'paymentProofs', proof.id);
  try {
    const batch = writeBatch(db);
    batch.set(codeRef, {
      code,
      months: proof.months,
      status: 'active',
      createdByEmail: creatorEmail,
      note: `Aprovado p/ ${proof.userEmail} (${proof.phone})`.slice(0, 120),
      createdAt: serverTimestamp(),
    });
    batch.update(proofRef, {
      status: 'approved',
      generatedCode: code,
      reviewedAt: serverTimestamp(),
    });
    await batch.commit();
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `paymentProofs/${proof.id}`);
  }
}

export async function creatorRejectPaymentProof(proofId: string): Promise<void> {
  const path = `paymentProofs/${proofId}`;
  try {
    await updateDoc(doc(db, 'paymentProofs', proofId), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function creatorUpdateSubscriber(
  targetUid: string,
  status: 'trial' | 'active' | 'revoked',
  monthsToAdd: number
): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    const nowMs = Date.now();
    const endMs = nowMs + Math.max(1, monthsToAdd) * 30 * 24 * 60 * 60 * 1000;
    await updateDoc(doc(db, 'users', targetUid), {
      subscriptionStatus: status,
      subscriptionMonths: status === 'active' ? monthsToAdd : 0,
      subscriptionEndsAt: status === 'active' ? Timestamp.fromMillis(endMs) : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function creatorUpdateMonthlyPrice(newPriceKz: number): Promise<void> {
  const cleanPrice = Math.round(newPriceKz);
  if (!Number.isFinite(cleanPrice) || cleanPrice < 100 || cleanPrice > 10000000) {
    throw new Error('O valor do plano deve estar entre 100 Kz e 10.000.000 Kz.');
  }
  const path = 'appSettings/billing';
  try {
    await setDoc(doc(db, 'appSettings', 'billing'), {
      monthlyPriceKz: cleanPrice,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
