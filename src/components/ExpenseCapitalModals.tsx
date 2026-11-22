import React, { useState } from 'react';
import { Receipt, Wallet, X } from 'lucide-react';
import { formatKz, getDeviceTodayISO } from '../utils/formatters';

interface ExpenseModalProps {
  defaultDateISO: string;
  onSaveExpense: (input: {
    description: string;
    category: string;
    amount: number;
    paymentMethod: 'dinheiro' | 'multicaixa' | 'capital';
    expenseDate: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  defaultDateISO,
  onSaveExpense,
  onClose,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Operacional');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'multicaixa' | 'capital'>('dinheiro');
  const [expenseDate, setExpenseDate] = useState(defaultDateISO || getDeviceTodayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!description.trim() || amount <= 0) {
      setError('Indique a descrição e um valor maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await onSaveExpense({
        description,
        category,
        amount,
        paymentMethod,
        expenseDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar despesa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Registar Despesa</h3>
              <p className="text-xs text-[#9BB5A8]">Gastos operacionais do negócio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Descrição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Sacos, Energia, Alimentação, Táxi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3 text-sm text-white"
              >
                <option value="Operacional">Operacional</option>
                <option value="Transporte">Transporte</option>
                <option value="Energia / Água">Energia / Água</option>
                <option value="Aluguer">Aluguer</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Data</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Valor (Kz) *</label>
            <input
              type="number"
              min={1}
              required
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              placeholder="Ex: 2500"
              className="w-full min-h-[46px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-base font-bold font-mono-num text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">Origem do Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'multicaixa', label: 'MCX' },
                  { id: 'capital', label: 'Capital Líq.' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`min-h-[40px] rounded-xl border text-xs font-semibold ${
                    paymentMethod === m.id
                      ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                      : 'bg-[#0A110E] text-[#B8CEC2] border-[#244637]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-bold text-sm"
          >
            {saving ? 'A guardar...' : 'Confirmar Despesa'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface AdjustCapitalModalProps {
  currentCapital: number;
  onSaveCapital: (newAmount: number) => Promise<void>;
  onClose: () => void;
}

export const AdjustCapitalModal: React.FC<AdjustCapitalModalProps> = ({
  currentCapital,
  onSaveCapital,
  onClose,
}) => {
  const [amount, setAmount] = useState(currentCapital);
  const [delta, setDelta] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveCapital(amount);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ajustar Capital Líquido</h3>
              <p className="text-xs text-[#9BB5A8]">Atual: {formatKz(currentCapital)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
              Definir Novo Saldo de Capital Líquido (Kz)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full min-h-[48px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-lg font-bold font-mono-num text-[#D4AF37]"
            />
          </div>

          <div className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-3.5 space-y-2.5">
            <p className="text-xs text-[#9BB5A8]">Ou somar / retirar rapidamente:</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                placeholder="Valor Kz"
                value={delta || ''}
                onChange={(e) => setDelta(Math.max(0, Number(e.target.value)))}
                className="flex-1 min-h-[40px] rounded-xl bg-[#111D18] border border-[#244637] px-3 text-sm font-mono-num text-white"
              />
              <button
                type="button"
                onClick={() => setAmount((prev) => prev + delta)}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#0E6B47] text-white text-xs font-bold"
              >
                + Somar
              </button>
              <button
                type="button"
                onClick={() => setAmount((prev) => prev - delta)}
                className="min-h-[40px] px-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs font-bold"
              >
                - Retirar
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-bold text-sm"
          >
            {saving ? 'A atualizar...' : `Guardar Capital (${formatKz(amount)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
