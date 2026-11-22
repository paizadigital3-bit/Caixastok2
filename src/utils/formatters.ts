import type { Expense, Product, Sale } from '../types';

export function formatKz(value: number, showDecimals = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(safe);
  return `${formatted} Kz`;
}

export function getDeviceTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDatePT(dateISO: string): string {
  if (!dateISO || dateISO.length < 10) return dateISO;
  const [y, m, d] = dateISO.split('-');
  return `${d}/${m}/${y}`;
}

export function getMonthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const idx = Math.max(0, Math.min(11, Number(mStr) - 1));
  return `${months[idx]} ${yStr}`;
}

export function getWeekBounds(dateISO: string): { startISO: string; endISO: string } {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 = Sun, 1 = Mon
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(dt);
  start.setDate(dt.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const toISO = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { startISO: toISO(start), endISO: toISO(end) };
}

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function generateActivationCodeString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CS-${pick(4)}-${pick(4)}`;
}

export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function fuzzyMatchScore(query: string, target: string): number {
  const q = normalizeSearch(query);
  const t = normalizeSearch(target);
  if (!q) return 0;
  if (t.startsWith(q)) return 100;
  if (t.includes(q)) return 80;
  // Subsequence / approximate character match
  let qi = 0;
  let gaps = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
    } else if (qi > 0) {
      gaps++;
    }
  }
  if (qi === q.length) {
    return Math.max(20, 65 - gaps * 3);
  }
  return 0;
}

export interface FinancialSummary {
  stockRemainingValue: number;
  potentialProfit: number;
  totalToReceiveFiado: number;
  overdueFiadosCount: number;
  lowStockCount: number;
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfitBase: number;
  carriedOverPrevMonthProfit: number;
  monthlyProfitTotal: number;
  prevMonthKey: string;
  prevMonthArchived: boolean;
  dailySalesTotal: number;
  dailyCashTotal: number;
  dailyMulticaixaTotal: number;
  dailyExpensesTotal: number;
  monthlySalesTotal: number;
  monthlyCashTotal: number;
  monthlyMulticaixaTotal: number;
  monthlyExpensesTotal: number;
}

export function calculateFinancialSummary(
  products: Product[],
  sales: Sale[],
  expenses: Expense[],
  selectedDateISO: string,
  archivedMonths: string[]
): FinancialSummary {
  const stockRemainingValue = products.reduce(
    (sum, p) => sum + p.stockUnits * p.unitCost,
    0
  );
  const potentialProfit = products.reduce(
    (sum, p) => sum + p.stockUnits * Math.max(0, p.unitPrice - p.unitCost),
    0
  );
  const lowStockCount = products.filter((p) => p.stockUnits <= p.minStockAlert).length;

  const todayISO = getDeviceTodayISO();
  const pendingFiados = sales.filter((s) => s.status === 'pending');
  const totalToReceiveFiado = pendingFiados.reduce((sum, s) => sum + s.totalAmount, 0);
  const overdueFiadosCount = pendingFiados.filter(
    (s) => s.dueDate && s.dueDate < todayISO
  ).length;

  // Determine effective cash recognition date for a sale (paidDate for settled fiado, saleDate otherwise)
  const getEffectiveDate = (s: Sale) => (s.paymentMethod === 'fiado' ? s.paidDate : s.saleDate);
  const getEffectiveMethod = (s: Sale) =>
    s.paymentMethod === 'fiado' ? s.paidMethod : s.paymentMethod;

  const paidSales = sales.filter((s) => s.status === 'paid');

  const { startISO: weekStart, endISO: weekEnd } = getWeekBounds(selectedDateISO);
  const currentMonthKey = getMonthKey(selectedDateISO);
  const prevMonthKey = getPreviousMonthKey(currentMonthKey);
  const prevMonthArchived = archivedMonths.includes(prevMonthKey);

  let dailyProfitSales = 0;
  let weeklyProfitSales = 0;
  let monthlyProfitSales = 0;
  let prevMonthProfitSales = 0;

  let dailySalesTotal = 0;
  let dailyCashTotal = 0;
  let dailyMulticaixaTotal = 0;

  let monthlySalesTotal = 0;
  let monthlyCashTotal = 0;
  let monthlyMulticaixaTotal = 0;

  for (const s of paidSales) {
    const effDate = getEffectiveDate(s);
    const effMethod = getEffectiveMethod(s);
    if (!effDate) continue;

    if (effDate === selectedDateISO) {
      dailyProfitSales += s.profitPortion;
      dailySalesTotal += s.totalAmount;
      if (effMethod === 'dinheiro') dailyCashTotal += s.totalAmount;
      if (effMethod === 'multicaixa') dailyMulticaixaTotal += s.totalAmount;
    }

    if (effDate >= weekStart && effDate <= weekEnd) {
      weeklyProfitSales += s.profitPortion;
    }

    const mk = getMonthKey(effDate);
    if (mk === currentMonthKey) {
      monthlyProfitSales += s.profitPortion;
      monthlySalesTotal += s.totalAmount;
      if (effMethod === 'dinheiro') monthlyCashTotal += s.totalAmount;
      if (effMethod === 'multicaixa') monthlyMulticaixaTotal += s.totalAmount;
    } else if (mk === prevMonthKey) {
      prevMonthProfitSales += s.profitPortion;
    }
  }

  let dailyExpensesTotal = 0;
  let weeklyExpensesTotal = 0;
  let monthlyExpensesTotal = 0;
  let prevMonthExpensesTotal = 0;

  for (const e of expenses) {
    if (e.type !== 'expense') continue;
    if (e.expenseDate === selectedDateISO) dailyExpensesTotal += e.amount;
    if (e.expenseDate >= weekStart && e.expenseDate <= weekEnd) weeklyExpensesTotal += e.amount;
    const mk = getMonthKey(e.expenseDate);
    if (mk === currentMonthKey) monthlyExpensesTotal += e.amount;
    else if (mk === prevMonthKey) prevMonthExpensesTotal += e.amount;
  }

  const dailyProfit = dailyProfitSales - dailyExpensesTotal;
  const weeklyProfit = weeklyProfitSales - weeklyExpensesTotal;
  const monthlyProfitBase = monthlyProfitSales - monthlyExpensesTotal;

  const prevMonthNet = prevMonthProfitSales - prevMonthExpensesTotal;
  const carriedOverPrevMonthProfit =
    !prevMonthArchived && prevMonthNet > 0 ? prevMonthNet : 0;
  const monthlyProfitTotal = monthlyProfitBase + carriedOverPrevMonthProfit;

  return {
    stockRemainingValue,
    potentialProfit,
    totalToReceiveFiado,
    overdueFiadosCount,
    lowStockCount,
    dailyProfit,
    weeklyProfit,
    monthlyProfitBase,
    carriedOverPrevMonthProfit,
    monthlyProfitTotal,
    prevMonthKey,
    prevMonthArchived,
    dailySalesTotal,
    dailyCashTotal,
    dailyMulticaixaTotal,
    dailyExpensesTotal,
    monthlySalesTotal,
    monthlyCashTotal,
    monthlyMulticaixaTotal,
    monthlyExpensesTotal,
  };
}

export async function compressImageToDataURL(
  file: File,
  maxDimension = 960,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponível.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
