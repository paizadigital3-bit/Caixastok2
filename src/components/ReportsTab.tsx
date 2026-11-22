import React, { useState } from 'react';
import {
  Archive,
  Check,
  Download,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Expense, MerchantConfig, MonthlyReport, Sale } from '../types';
import {
  formatDatePT,
  formatKz,
  formatMonthLabel,
  getMonthKey,
  type FinancialSummary,
} from '../utils/formatters';

interface ReportsTabProps {
  config: MerchantConfig;
  summary: FinancialSummary;
  sales: Sale[];
  expenses: Expense[];
  reports: MonthlyReport[];
  selectedDateISO: string;
  onUpdatePin: (newPin: string) => Promise<void>;
  onArchiveMonth: (monthKey: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  config,
  summary,
  sales,
  expenses,
  reports,
  selectedDateISO,
  onUpdatePin,
  onArchiveMonth,
  onClearAllData,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [newPin, setNewPin] = useState('');
  const [pinSavedMsg, setPinSavedMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentMonthKey = getMonthKey(selectedDateISO);
  const isCurrentMonthArchived = config.archivedMonths.includes(currentMonthKey);
  const isPrevMonthArchived = config.archivedMonths.includes(summary.prevMonthKey);

  const handleDigit = (d: string) => {
    setPinError(null);
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      if (next === config.pinCode) {
        setUnlocked(true);
        setPinInput('');
      } else {
        setPinError('PIN incorreto. O padrão inicial é 0000.');
        setTimeout(() => setPinInput(''), 350);
      }
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(newPin)) {
      setPinSavedMsg('O PIN deve ter exatamente 4 dígitos numéricos.');
      return;
    }
    setBusy(true);
    try {
      await onUpdatePin(newPin);
      setNewPin('');
      setPinSavedMsg('PIN alterado com sucesso.');
      setTimeout(() => setPinSavedMsg(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  const handleExportCSV = () => {
    const lines = [
      'Tipo;Data;Descricao;Metodo;Valor(Kz);Lucro(Kz)',
      ...sales.map(
        (s) =>
          `Venda;${s.saleDate};${s.productName} (${s.totalUnitsSold} un);${s.paymentMethod};${s.totalAmount};${s.profitPortion}`
      ),
      ...expenses.map(
        (e) =>
          `${e.type === 'stock_purchase' ? 'CompraStock' : 'Despesa'};${e.expenseDate};${e.description};${e.paymentMethod};-${e.amount};0`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixastok_relatorio_${selectedDateISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto py-6">
        <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-6 space-y-5 text-center shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Relatórios Protegidos</h2>
            <p className="text-xs text-[#9BB5A8]">
              Insira o PIN de 4 dígitos (padrão inicial: <strong className="text-white">0000</strong>)
            </p>
          </div>

          <div className="flex justify-center gap-3 py-1">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl font-bold font-mono-num ${
                  pinInput.length > idx
                    ? 'bg-[#0E6B47]/30 border-[#D4AF37] text-white'
                    : 'bg-[#0A110E] border-[#244637] text-[#7B9889]'
                }`}
              >
                {pinInput.length > idx ? '•' : ''}
              </div>
            ))}
          </div>

          {pinError && <p className="text-xs text-red-400 font-medium">{pinError}</p>}

          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="min-h-[52px] rounded-xl bg-[#0A110E] hover:bg-[#192D24] border border-[#244637] text-lg font-bold text-white font-mono-num transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPinInput('')}
              className="min-h-[52px] rounded-xl bg-[#0A110E] hover:bg-[#192D24] border border-[#244637] text-xs font-semibold text-[#9BB5A8]"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="min-h-[52px] rounded-xl bg-[#0A110E] hover:bg-[#192D24] border border-[#244637] text-lg font-bold text-white font-mono-num"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPinInput((p) => p.slice(0, -1))}
              className="min-h-[52px] rounded-xl bg-[#0A110E] hover:bg-[#192D24] border border-[#244637] text-xs font-semibold text-[#9BB5A8]"
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#34D399]" />
          <div>
            <h2 className="text-xl font-bold text-white">Relatórios & Fecho de Caixa</h2>
            <p className="text-xs text-[#9BB5A8]">
              Mês selecionado: {formatMonthLabel(currentMonthKey)} · Dia: {formatDatePT(selectedDateISO)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[42px] px-4 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setUnlocked(false)}
            className="min-h-[42px] px-4 rounded-xl bg-[#111D18] border border-[#244637] text-[#B8CEC2] text-xs font-semibold flex items-center gap-1.5"
          >
            <Lock className="w-4 h-4" />
            <span>Bloquear</span>
          </button>
        </div>
      </div>

      {/* Daily & Monthly Cash Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Fecho do Dia ({formatDatePT(selectedDateISO)})
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Dinheiro Físico</span>
              <span className="font-bold font-mono-num text-white">{formatKz(summary.dailyCashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Multicaixa Express</span>
              <span className="font-bold font-mono-num text-white">{formatKz(summary.dailyMulticaixaTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Despesas Operacionais</span>
              <span className="font-bold font-mono-num text-red-400">-{formatKz(summary.dailyExpensesTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#1A3329]">
              <span className="font-semibold text-[#D1E2D8]">Lucro Líquido do Dia</span>
              <span className="font-bold font-mono-num text-[#34D399]">{formatKz(summary.dailyProfit)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Resumo do Mês ({formatMonthLabel(currentMonthKey)})
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Total Dinheiro</span>
              <span className="font-bold font-mono-num text-white">{formatKz(summary.monthlyCashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Total Multicaixa</span>
              <span className="font-bold font-mono-num text-white">{formatKz(summary.monthlyMulticaixaTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Despesas do Mês</span>
              <span className="font-bold font-mono-num text-red-400">-{formatKz(summary.monthlyExpensesTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#1A3329]">
              <span className="font-semibold text-[#D1E2D8]">Lucro Mensal (c/ transito)</span>
              <span className="font-bold font-mono-num text-[#D4AF37]">{formatKz(summary.monthlyProfitTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Month Archiving Section */}
      <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Arquivamento de Meses</h3>
            <p className="text-xs text-[#9BB5A8]">
              Arquivar um mês encerra o seu lucro para que não continue a somar no mês seguinte.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isPrevMonthArchived && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onArchiveMonth(summary.prevMonthKey);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="min-h-[42px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] text-xs font-bold flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>Arquivar {formatMonthLabel(summary.prevMonthKey)}</span>
              </button>
            )}

            <button
              type="button"
              disabled={busy || isCurrentMonthArchived}
              onClick={async () => {
                setBusy(true);
                try {
                  await onArchiveMonth(currentMonthKey);
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-[42px] px-4 rounded-xl bg-[#0E6B47] hover:bg-[#138559] disabled:opacity-45 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4" />
              <span>
                {isCurrentMonthArchived
                  ? `${formatMonthLabel(currentMonthKey)} Arquivado`
                  : `Arquivar ${formatMonthLabel(currentMonthKey)}`}
              </span>
            </button>
          </div>
        </div>

        {reports.length > 0 && (
          <div className="divide-y divide-[#1A3329] rounded-2xl bg-[#0A110E] border border-[#1A3329]">
            {reports.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-white">{formatMonthLabel(r.monthKey)}</p>
                  <p className="text-[#9BB5A8]">Fechado em {formatDatePT(r.closedDate)}</p>
                </div>
                <div className="text-right font-mono-num">
                  <p className="font-bold text-[#34D399]">Lucro: {formatKz(r.netProfit)}</p>
                  <p className="text-[#9BB5A8]">Vendas: {formatKz(r.totalSales)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security & Maintenance: Change PIN & Clear Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form
          onSubmit={handleChangePin}
          className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <KeyRound className="w-4 h-4 text-[#D4AF37]" />
            <span>Alterar PIN de Segurança</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Novo PIN (4 dígitos)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="flex-1 min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-[44px] px-4 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar</span>
            </button>
          </div>
          {pinSavedMsg && <p className="text-xs text-[#34D399] font-medium">{pinSavedMsg}</p>}
        </form>

        <div className="rounded-3xl bg-[#111D18] border border-red-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-red-300">
            <Trash2 className="w-4 h-4" />
            <span>Limpeza de Dados</span>
          </div>
          <p className="text-xs text-[#9BB5A8]">
            Remove todos os produtos, vendas, fiados, despesas e relatórios desta conta.
          </p>
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] px-4 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold"
            >
              Limpar Todos os Dados
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onClearAllData();
                    setConfirmClear(false);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Confirmar Limpeza Total
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[44px] px-4 rounded-xl bg-[#0A110E] border border-[#244637] text-[#B8CEC2] text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
