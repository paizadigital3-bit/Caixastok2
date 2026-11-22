import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { Expense, MerchantConfig, Product, Sale, TabId } from '../types';
import {
  formatDatePT,
  formatKz,
  formatMonthLabel,
  type FinancialSummary,
} from '../utils/formatters';

interface DashboardTabProps {
  config: MerchantConfig;
  summary: FinancialSummary;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  selectedDateISO: string;
  onOpenSale: () => void;
  onOpenExpense: () => void;
  onOpenNewProduct: () => void;
  onOpenAdjustCapital: () => void;
  onNavigateTab: (tab: TabId) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  config,
  summary,
  products,
  sales,
  expenses,
  selectedDateISO,
  onOpenSale,
  onOpenExpense,
  onOpenNewProduct,
  onOpenAdjustCapital,
  onNavigateTab,
}) => {
  const daySales = sales.filter(
    (s) => s.saleDate === selectedDateISO || s.paidDate === selectedDateISO
  );
  const dayExpenses = expenses.filter((e) => e.expenseDate === selectedDateISO);
  const lowStockProducts = products.filter((p) => p.stockUnits <= p.minStockAlert);

  return (
    <div className="space-y-6">
      {/* Quick Actions Strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenSale}
          className="min-h-[52px] rounded-2xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-bold text-xs sm:text-sm px-3 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#D4AF37]/15"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="truncate">Nova Venda</span>
        </button>

        <button
          type="button"
          onClick={onOpenNewProduct}
          className="min-h-[52px] rounded-2xl bg-[#0E6B47] hover:bg-[#138559] text-white font-semibold text-xs sm:text-sm px-3 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="truncate">Compra / Stock</span>
        </button>

        <button
          type="button"
          onClick={onOpenExpense}
          className="min-h-[52px] rounded-2xl bg-[#111D18] hover:bg-[#192D24] border border-[#244637] text-[#F4F7F5] font-semibold text-xs sm:text-sm px-3 flex items-center justify-center gap-2 transition-colors"
        >
          <Receipt className="w-4 h-4 shrink-0 text-red-400" />
          <span className="truncate">Despesa</span>
        </button>
      </div>

      {/* Primary Hero Metric: Capital Líquido + Stock & Lucro Potencial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#0E6B47]/35 via-[#111D18] to-[#0E1814] border border-[#25513E] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                <Wallet className="w-4 h-4" />
                <span>Capital Líquido (Reinvestimento)</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-white font-mono-num tracking-tight">
                {formatKz(config.liquidCapital)}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdjustCapital}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#0A110E]/80 hover:bg-[#192D24] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustar</span>
            </button>
          </div>
          <p className="text-xs text-[#B8CEC2] leading-relaxed">
            Sobe com o retorno de capital das vendas e recebimentos de fiado; diminui na compra de stock.
          </p>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-xs text-[#9BB5A8]">
              <span>Stock Restante</span>
              <Package className="w-4 h-4 text-[#34D399]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white font-mono-num">
                {formatKz(summary.stockRemainingValue)}
              </p>
              <p className="text-xs text-[#9BB5A8] mt-1">
                {products.length} {products.length === 1 ? 'produto' : 'produtos'} no catálogo
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 sm:p-5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between text-xs text-[#9BB5A8]">
              <span>Lucro Potencial</span>
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-mono-num">
                {formatKz(summary.potentialProfit)}
              </p>
              <p className="text-xs text-[#9BB5A8] mt-1">
                Margem estimada no stock atual
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('fiados')}
            className="text-left rounded-2xl bg-[#111D18] hover:bg-[#16261F] border border-[#1E3A2F] p-4 sm:p-5 flex flex-col justify-between gap-2 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-[#9BB5A8]">
              <span>Total Fiados</span>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-amber-300 font-mono-num">
                {formatKz(summary.totalToReceiveFiado)}
              </p>
              <p className="text-xs text-[#9BB5A8] mt-1">
                {summary.overdueFiadosCount > 0
                  ? `${summary.overdueFiadosCount} em atraso`
                  : 'Pagamentos pendentes'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Period Profits: Diário, Semanal, Mensal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#D1E2D8] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <span>Lucro do Período · Ref. {formatDatePT(selectedDateISO)}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 sm:p-5 space-y-1.5">
            <span className="text-xs font-medium text-[#9BB5A8]">Lucro Diário</span>
            <p
              className={`text-2xl font-bold font-mono-num ${
                summary.dailyProfit >= 0 ? 'text-[#34D399]' : 'text-red-400'
              }`}
            >
              {formatKz(summary.dailyProfit)}
            </p>
            <p className="text-xs text-[#7B9889] tabular-nums">
              Vendas do dia: {formatKz(summary.dailySalesTotal)}
            </p>
          </div>

          <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 sm:p-5 space-y-1.5">
            <span className="text-xs font-medium text-[#9BB5A8]">Lucro Semanal</span>
            <p
              className={`text-2xl font-bold font-mono-num ${
                summary.weeklyProfit >= 0 ? 'text-[#34D399]' : 'text-red-400'
              }`}
            >
              {formatKz(summary.weeklyProfit)}
            </p>
            <p className="text-xs text-[#7B9889]">Semana corrente da data selecionada</p>
          </div>

          <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 sm:p-5 space-y-1.5">
            <span className="text-xs font-medium text-[#9BB5A8]">Lucro Mensal</span>
            <p
              className={`text-2xl font-bold font-mono-num ${
                summary.monthlyProfitTotal >= 0 ? 'text-[#D4AF37]' : 'text-red-400'
              }`}
            >
              {formatKz(summary.monthlyProfitTotal)}
            </p>
            <p className="text-xs text-[#7B9889] leading-snug">
              {summary.carriedOverPrevMonthProfit > 0
                ? `Inclui +${formatKz(summary.carriedOverPrevMonthProfit)} de ${formatMonthLabel(
                    summary.prevMonthKey
                  )} (não arquivado)`
                : `Mês de ${formatMonthLabel(selectedDateISO.slice(0, 7))}`}
            </p>
          </div>
        </div>
      </section>

      {/* Alerts: Low Stock & Overdue Fiados */}
      {(lowStockProducts.length > 0 || summary.overdueFiadosCount > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lowStockProducts.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('stock')}
              className="text-left rounded-2xl bg-amber-950/30 hover:bg-amber-950/45 border border-amber-500/35 p-4 flex items-start gap-3 transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-200">
                  Alerta de Stock Baixo ({lowStockProducts.length})
                </p>
                <p className="text-xs text-amber-100/80 truncate mt-0.5">
                  {lowStockProducts.map((p) => `${p.name} (${p.stockUnits} un)`).join(' · ')}
                </p>
              </div>
            </button>
          )}

          {summary.overdueFiadosCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('fiados')}
              className="text-left rounded-2xl bg-red-950/30 hover:bg-red-950/45 border border-red-500/35 p-4 flex items-start gap-3 transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-200">
                  Fiados com Prazo Vencido ({summary.overdueFiadosCount})
                </p>
                <p className="text-xs text-red-100/80 mt-0.5">
                  Toque para ver clientes e registar cobrança.
                </p>
              </div>
            </button>
          )}
        </section>
      )}

      {/* Activity of Selected Date */}
      <section className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1A3329] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Movimentos de {formatDatePT(selectedDateISO)}
          </h3>
          <span className="text-xs text-[#9BB5A8] tabular-nums">
            {daySales.length} vendas · {dayExpenses.length} saídas
          </span>
        </div>

        {daySales.length === 0 && dayExpenses.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#9BB5A8]">
            Sem vendas ou despesas registadas nesta data.
          </div>
        ) : (
          <div className="divide-y divide-[#1A3329]">
            {daySales.map((s) => (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {s.productName}{' '}
                    <span className="text-xs font-normal text-[#9BB5A8]">
                      ({s.totalUnitsSold} un)
                    </span>
                  </p>
                  <p className="text-xs text-[#9BB5A8]">
                    {s.paymentMethod === 'dinheiro'
                      ? 'Dinheiro'
                      : s.paymentMethod === 'multicaixa'
                      ? 'Multicaixa Express'
                      : s.status === 'paid'
                      ? `Fiado pago (${s.paidMethod === 'multicaixa' ? 'MCX' : 'Dinheiro'}) · ${s.customerName}`
                      : `Fiado pendente · ${s.customerName}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono-num text-white">
                    {formatKz(s.totalAmount)}
                  </p>
                  <p
                    className={`text-[11px] font-semibold font-mono-num ${
                      s.status === 'pending' ? 'text-amber-300' : 'text-[#34D399]'
                    }`}
                  >
                    {s.status === 'pending'
                      ? 'Por receber'
                      : `Lucro ${formatKz(s.profitPortion)}`}
                  </p>
                </div>
              </div>
            ))}

            {dayExpenses.map((e) => (
              <div key={e.id} className="px-5 py-3.5 flex items-center justify-between gap-3 bg-[#0D1713]/60">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F4F7F5] truncate">{e.description}</p>
                  <p className="text-xs text-[#9BB5A8]">
                    {e.type === 'stock_purchase' ? 'Compra de Stock' : `Despesa · ${e.category}`}
                  </p>
                </div>
                <p className="text-sm font-bold font-mono-num text-red-400 shrink-0">
                  -{formatKz(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
