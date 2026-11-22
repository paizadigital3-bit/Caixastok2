import React, { useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Image as ImageIcon,
  KeyRound,
  Plus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  creatorApprovePaymentProof,
  creatorGenerateCode,
  creatorRejectPaymentProof,
  creatorRevokeCode,
  creatorUpdateMonthlyPrice,
  creatorUpdateSubscriber,
  subscribeAllActivationCodes,
  subscribeAllPaymentProofs,
  subscribeAllUsers,
} from '../services/firestoreService';
import type { ActivationCode, PaymentProof, UserAccount } from '../types';
import { formatKz } from '../utils/formatters';

interface CreatorPanelModalProps {
  creatorEmail: string;
  monthlyPriceKz: number;
  onClose: () => void;
}

export const CreatorPanelModal: React.FC<CreatorPanelModalProps> = ({
  creatorEmail,
  monthlyPriceKz,
  onClose,
}) => {
  const [section, setSection] = useState<'proofs' | 'codes' | 'users' | 'plan'>('proofs');
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);

  const [months, setMonths] = useState(1);
  const [note, setNote] = useState('');
  const [priceInput, setPriceInput] = useState<number>(monthlyPriceKz);
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPriceInput(monthlyPriceKz);
  }, [monthlyPriceKz]);

  useEffect(() => {
    const u1 = subscribeAllActivationCodes(setCodes);
    const u2 = subscribeAllUsers(setUsers);
    const u3 = subscribeAllPaymentProofs(setProofs);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const code = await creatorGenerateCode(creatorEmail, months, note);
      setNote('');
      setFeedback(`Código gerado: ${code} (${months} ${months === 1 ? 'mês' : 'meses'})`);
      await copyCode(code);
    } finally {
      setBusy(false);
    }
  };

  const handleApproveProof = async (proof: PaymentProof) => {
    setBusy(true);
    setFeedback(null);
    try {
      const code = await creatorApprovePaymentProof(creatorEmail, proof);
      setFeedback(`Comprovativo aprovado! Código gerado para ${proof.userEmail}: ${code}`);
      await copyCode(code);
    } finally {
      setBusy(false);
    }
  };

  const pendingProofsCount = proofs.filter((p) => p.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#0E1814] border border-[#D4AF37]/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E3A2F] flex items-center justify-between gap-3 bg-[#111D18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Painel do Criador</h2>
              <p className="text-xs text-[#9BB5A8]">Administração exclusiva · {creatorEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white hover:bg-[#192D24]"
            aria-label="Fechar Painel do Criador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav */}
        <div className="px-5 py-3 border-b border-[#1E3A2F] flex gap-2 overflow-x-auto bg-[#0A110E]">
          <button
            type="button"
            onClick={() => setSection('proofs')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              section === 'proofs'
                ? 'bg-[#D4AF37] text-[#0A110E]'
                : 'bg-[#111D18] text-[#B8CEC2] border border-[#1E3A2F]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Comprovativos ({pendingProofsCount} pendentes)</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('codes')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              section === 'codes'
                ? 'bg-[#D4AF37] text-[#0A110E]'
                : 'bg-[#111D18] text-[#B8CEC2] border border-[#1E3A2F]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Códigos ({codes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('users')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              section === 'users'
                ? 'bg-[#D4AF37] text-[#0A110E]'
                : 'bg-[#111D18] text-[#B8CEC2] border border-[#1E3A2F]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Subscritores ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('plan')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
              section === 'plan'
                ? 'bg-[#D4AF37] text-[#0A110E]'
                : 'bg-[#111D18] text-[#B8CEC2] border border-[#1E3A2F]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Valor do Plano ({formatKz(monthlyPriceKz)})</span>
          </button>
        </div>

        {feedback && (
          <div className="mx-5 mt-3 rounded-xl bg-[#0E6B47]/30 border border-[#34D399]/50 px-4 py-2.5 text-xs font-semibold text-[#D1FAE5]">
            {feedback}
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-3 rounded-xl bg-red-950/60 border border-red-500/40 px-4 py-2.5 text-xs font-semibold text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {section === 'proofs' && (
            <div className="space-y-3">
              {proofs.length === 0 ? (
                <p className="text-sm text-[#9BB5A8] text-center py-8">
                  Nenhum comprovativo recebido até ao momento.
                </p>
              ) : (
                proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 flex flex-col sm:flex-row gap-4 justify-between"
                  >
                    <div className="flex gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setPreviewImg(proof.proofImageData)}
                        className="w-20 h-20 rounded-xl overflow-hidden border border-[#244637] bg-[#0A110E] shrink-0"
                        title="Ampliar comprovativo"
                      >
                        <img
                          src={proof.proofImageData}
                          alt={`Comprovativo ${proof.userName}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {proof.userName} · <span className="text-[#D4AF37] font-mono-num">{formatKz(proof.totalAmountKz)}</span>
                        </p>
                        <p className="text-xs text-[#B8CEC2] truncate">
                          {proof.userEmail} · Tel: {proof.phone}
                        </p>
                        <p className="text-xs text-[#9BB5A8]">
                          {proof.months} {proof.months === 1 ? 'mês' : 'meses'} · {proof.paymentChannel === 'multicaixa' ? 'Multicaixa Express' : 'IBAN'} · Entidade {proof.entity}
                        </p>
                        {proof.notes && (
                          <p className="text-xs text-[#9BB5A8] italic">"{proof.notes}"</p>
                        )}
                        {proof.generatedCode && (
                          <p className="text-xs font-mono-num text-[#34D399] font-semibold">
                            Código gerado: {proof.generatedCode}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          proof.status === 'approved'
                            ? 'text-[#34D399]'
                            : proof.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-[#D4AF37]'
                        }`}
                      >
                        {proof.status === 'approved'
                          ? 'Aprovado'
                          : proof.status === 'rejected'
                          ? 'Rejeitado'
                          : 'Pendente'}
                      </span>

                      {proof.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleApproveProof(proof)}
                            className="min-h-[40px] px-3 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Aprovar & Gerar Código</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => creatorRejectPaymentProof(proof.id)}
                            className="min-h-[40px] px-3 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Rejeitar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'codes' && (
            <div className="space-y-5">
              <form
                onSubmit={handleGenerateCode}
                className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                    Duração (Meses)
                  </label>
                  <select
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3 text-sm text-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 1 ? 'mês' : 'meses'} ({formatKz(m * monthlyPriceKz)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                    Nota / Cliente (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Ex: Loja do João - Multicaixa"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full min-h-[44px] rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Gerar Código</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {codes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold font-mono-num text-white tracking-wider">
                          {c.code}
                        </span>
                        <span className="text-xs text-[#9BB5A8]">
                          · {c.months} {c.months === 1 ? 'mês' : 'meses'}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            c.status === 'active'
                              ? 'text-[#34D399]'
                              : c.status === 'used'
                              ? 'text-[#D4AF37]'
                              : 'text-red-400'
                          }`}
                        >
                          · {c.status === 'active' ? 'Ativo' : c.status === 'used' ? 'Usado' : 'Revogado'}
                        </span>
                      </div>
                      <p className="text-xs text-[#9BB5A8]">
                        {c.usedByEmail ? `Usado por: ${c.usedByEmail}` : c.note || 'Sem nota'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="min-h-[40px] px-3 rounded-xl bg-[#192D24] hover:bg-[#233F33] text-[#D4AF37] text-xs font-semibold flex items-center gap-1.5"
                      >
                        {copiedCode === c.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCode === c.code ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      {c.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => creatorRevokeCode(c.code)}
                          className="min-h-[40px] px-3 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <Ban className="w-4 h-4" />
                          <span>Revogar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'users' && (
            <div className="space-y-2.5">
              {users.map((u) => {
                const nowMs = Date.now();
                const trialMs = u.trialEndsAt?.toMillis?.() ?? 0;
                const subMs = u.subscriptionEndsAt?.toMillis?.() ?? 0;
                const activeUntilMs = Math.max(trialMs, subMs);
                const daysLeft = Math.max(0, Math.ceil((activeUntilMs - nowMs) / 86400000));
                const isCreatorRow = u.role === 'creator';

                return (
                  <div
                    key={u.uid}
                    className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {u.displayName}{' '}
                        <span className="text-xs font-normal text-[#9BB5A8]">({u.email})</span>
                      </p>
                      <p className="text-xs text-[#B8CEC2]">
                        Estado:{' '}
                        <strong
                          className={
                            isCreatorRow
                              ? 'text-[#D4AF37]'
                              : u.subscriptionStatus === 'active'
                              ? 'text-[#34D399]'
                              : u.subscriptionStatus === 'revoked'
                              ? 'text-red-400'
                              : 'text-amber-300'
                          }
                        >
                          {isCreatorRow
                            ? 'Criador (Permanente)'
                            : u.subscriptionStatus === 'active'
                            ? `Ativo (${daysLeft} dias restantes)`
                            : u.subscriptionStatus === 'revoked'
                            ? 'Suspenso'
                            : `Teste (${daysLeft} dias restantes)`}
                        </strong>
                      </p>
                    </div>

                    {!isCreatorRow && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => creatorUpdateSubscriber(u.uid, 'active', 1)}
                          className="min-h-[38px] px-3 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white text-xs font-semibold"
                        >
                          +1 Mês
                        </button>
                        <button
                          type="button"
                          onClick={() => creatorUpdateSubscriber(u.uid, 'active', 12)}
                          className="min-h-[38px] px-3 rounded-xl bg-[#192D24] hover:bg-[#234033] text-[#D4AF37] text-xs font-semibold border border-[#D4AF37]/30"
                        >
                          +12 Meses
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            creatorUpdateSubscriber(
                              u.uid,
                              u.subscriptionStatus === 'revoked' ? 'trial' : 'revoked',
                              0
                            )
                          }
                          className="min-h-[38px] px-3 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-semibold"
                        >
                          {u.subscriptionStatus === 'revoked' ? 'Reativar' : 'Suspender'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {section === 'plan' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setFeedback(null);
                setErrorMsg(null);
                setBusy(true);
                try {
                  await creatorUpdateMonthlyPrice(priceInput);
                  setFeedback(`Valor mensal do plano atualizado para ${formatKz(priceInput)}/mês.`);
                } catch (err) {
                  setErrorMsg(
                    err instanceof Error ? err.message : 'Erro ao atualizar valor do plano.'
                  );
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-5 space-y-5"
            >
              <div>
                <h3 className="text-base font-bold text-white">Alterar Valor da Mensalidade</h3>
                <p className="text-xs text-[#9BB5A8] mt-1">
                  O novo valor aplica-se imediatamente ao ecrã de subscrição e ao cálculo automático de 1 a 24 meses.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">
                    Valor Mensal (Kz)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000000}
                    step={50}
                    required
                    value={priceInput || ''}
                    onChange={(e) => setPriceInput(Math.max(0, Number(e.target.value)))}
                    className="w-full min-h-[48px] rounded-xl bg-[#0A110E] border border-[#244637] px-4 text-lg font-bold font-mono-num text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[1500, 2000, 2500, 3000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPriceInput(preset)}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                        priceInput === preset
                          ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                          : 'bg-[#0A110E] text-[#B8CEC2] border-[#244637] hover:border-[#D4AF37]/60'
                      }`}
                    >
                      {formatKz(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#0A110E] border border-[#1A3329] p-4 text-xs">
                <div>
                  <span className="text-[#9BB5A8] block">1 mês</span>
                  <span className="text-sm font-bold font-mono-num text-white">
                    {formatKz(priceInput)}
                  </span>
                </div>
                <div>
                  <span className="text-[#9BB5A8] block">6 meses</span>
                  <span className="text-sm font-bold font-mono-num text-white">
                    {formatKz(priceInput * 6)}
                  </span>
                </div>
                <div>
                  <span className="text-[#9BB5A8] block">12 meses</span>
                  <span className="text-sm font-bold font-mono-num text-[#D4AF37]">
                    {formatKz(priceInput * 12)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-[#0E6B47] hover:bg-[#138559] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{busy ? 'A guardar...' : 'Guardar Novo Valor do Plano'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {previewImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <img
            src={previewImg}
            alt="Comprovativo ampliado"
            className="max-w-full max-h-[88vh] rounded-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
