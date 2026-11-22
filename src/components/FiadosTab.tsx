import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Phone, UserCheck } from 'lucide-react';
import type { Sale } from '../types';
import { formatDatePT, formatKz, getDeviceTodayISO } from '../utils/formatters';

interface FiadosTabProps {
  sales: Sale[];
  selectedDateISO: string;
  onConfirmPayment: (
    sale: Sale,
    method: 'dinheiro' | 'multicaixa',
    paidDate: string
  ) => Promise<void>;
}

export const FiadosTab: React.FC<FiadosTabProps> = ({
  sales,
  selectedDateISO,
  onConfirmPayment,
}) => {
  const [filter, setFilter] = useState<'pending' | 'overdue' | 'paid'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const todayISO = getDeviceTodayISO();

  const fiados = useMemo(
    () => sales.filter((s) => s.paymentMethod === 'fiado'),
    [sales]
  );

  const pendingList = fiados.filter((s) => s.status === 'pending');
  const overdueList = pendingList.filter((s) => s.dueDate && s.dueDate < todayISO);
  const paidList = fiados.filter((s) => s.status === 'paid');

  const visibleList =
    filter === 'pending'
      ? pendingList
      : filter === 'overdue'
      ? overdueList
      : paidList;

  const totalPendingAmount = pendingList.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleSettle = async (sale: Sale, method: 'dinheiro' | 'multicaixa') => {
    setBusyId(sale.id);
    try {
      await onConfirmPayment(sale, method, selectedDateISO || todayISO);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#9BB5A8]">Total a Receber (Fiados Pendentes)</p>
          <p className="text-3xl font-bold text-amber-300 font-mono-num mt-1">
            {formatKz(totalPendingAmount)}
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              { id: 'pending', label: `Pendentes (${pendingList.length})` },
              { id: 'overdue', label: `Em Atraso (${overdueList.length})` },
              { id: 'paid', label: `Recebidos (${paidList.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === t.id
                  ? 'bg-[#D4AF37] text-[#0A110E]'
                  : 'bg-[#0A110E] text-[#B8CEC2] border border-[#244637]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {visibleList.length === 0 ? (
        <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-10 text-center space-y-2">
          <UserCheck className="w-10 h-10 text-[#34D399] mx-auto" />
          <p className="text-sm font-medium text-[#D1E2D8]">
            {filter === 'pending'
              ? 'Não existem fiados pendentes no momento.'
              : filter === 'overdue'
              ? 'Nenhum fiado com prazo vencido.'
              : 'Ainda não existem fiados liquidados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {visibleList.map((s) => {
            const isOverdue = s.status === 'pending' && s.dueDate && s.dueDate < todayISO;
            return (
              <div
                key={s.id}
                className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">
                        {s.customerName || 'Cliente'}
                      </h3>
                      <p className="text-xs text-[#9BB5A8]">
                        {s.productName} · {s.totalUnitsSold} un · Venda em {formatDatePT(s.saleDate)}
                      </p>
                    </div>
                    <span className="text-lg font-bold font-mono-num text-[#D4AF37] shrink-0">
                      {formatKz(s.totalAmount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#B8CEC2]">
                    {s.customerPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#9BB5A8]" />
                        {s.customerPhone}
                      </span>
                    )}
                    {s.dueDate && (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isOverdue ? 'text-red-400' : 'text-amber-300'
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        Prazo: {formatDatePT(s.dueDate)}
                        {isOverdue ? ' (Em Atraso)' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {s.status === 'pending' ? (
                  <div className="pt-3 border-t border-[#1A3329] space-y-2">
                    <p className="text-[11px] font-medium text-[#9BB5A8]">
                      Confirmar Pagamento (entra em Capital + Lucro):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleSettle(s, 'dinheiro')}
                        className="min-h-[42px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Dinheiro</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleSettle(s, 'multicaixa')}
                        className="min-h-[42px] rounded-xl bg-[#192D24] hover:bg-[#234033] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Multicaixa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#1A3329] text-xs text-[#34D399] font-semibold">
                    Recebido em {formatDatePT(s.paidDate)} via{' '}
                    {s.paidMethod === 'multicaixa' ? 'Multicaixa Express' : 'Dinheiro'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
