import React, { useState } from 'react';
import { Check, Copy, KeyRound, Lock, LogOut, Send, ShieldAlert, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  IBAN_NUMBER,
  MULTICAIXA_EXPRESS_NUMBER,
} from '../lib/firebase';
import { redeemActivationCode } from '../services/firestoreService';
import type { UserAccount } from '../types';
import { formatKz } from '../utils/formatters';
import { ProofSubmitModal } from './ProofSubmitModal';

interface SubscriptionPaywallProps {
  user: User;
  account: UserAccount;
  monthlyPriceKz: number;
  isLocked: boolean;
  onClose?: () => void;
  onSignOut: () => Promise<void>;
}

export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  user,
  account,
  monthlyPriceKz,
  isLocked,
  onClose,
  onSignOut,
}) => {
  const [months, setMonths] = useState(1);
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'mcx' | 'iban' | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);

  const totalAmount = months * monthlyPriceKz;

  const copyText = async (text: string, key: 'mcx' | 'iban') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // clipboard fallback ignored
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!code.trim()) {
      setError('Insira o código de ativação.');
      return;
    }

    setActivating(true);
    try {
      const res = await redeemActivationCode(user, account, code);
      setSuccessMsg(`Conta ativada com sucesso por ${res.months} ${res.months === 1 ? 'mês' : 'meses'}!`);
      setCode('');
      if (!isLocked && onClose) {
        setTimeout(onClose, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido ou expirado.');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              {isLocked ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {isLocked ? 'Período Gratuito Terminado' : 'Subscrição CaixaStock'}
              </h1>
              <p className="text-xs sm:text-sm text-[#9BB5A8]">
                {account.subscriptionStatus === 'revoked'
                  ? 'Acesso suspenso. Contacte o suporte ou insira um código válido.'
                  : 'Ative a sua licença mensal para continuar a gerir o seu negócio sem limites.'}
              </p>
            </div>
          </div>

          {!isLocked && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white hover:bg-[#192D24]"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[44px] px-3 rounded-xl border border-[#244637] text-xs font-semibold text-[#B8CEC2] hover:text-white flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          )}
        </div>

        {isLocked && (
          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              Os seus dados na conta <strong>{user.email}</strong> estão guardados em segurança. Insira um código de ativação ou envie o comprovativo de pagamento para desbloquear imediatamente após aprovação.
            </p>
          </div>
        )}

        {/* Step 1: Enter Activation Code */}
        <form onSubmit={handleActivate} className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-4 sm:p-5 space-y-3">
          <label className="block text-sm font-semibold text-white">
            Já tem um Código de Ativação?
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="Ex: CS-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 min-h-[48px] rounded-xl bg-[#111D18] border border-[#244637] px-4 text-sm font-mono-num tracking-wider text-white uppercase focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={activating}
              className="min-h-[48px] px-6 rounded-xl bg-[#0E6B47] hover:bg-[#128257] disabled:opacity-60 text-white font-semibold text-sm transition-colors whitespace-nowrap"
            >
              {activating ? 'A validar...' : 'Ativar Código'}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
          {successMsg && <p className="text-xs text-[#34D399] font-semibold">{successMsg}</p>}
        </form>

        {/* Step 2: Plan Selection + Payment Info */}
        <div className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white">Plano Mensal: {formatKz(monthlyPriceKz)}/mês</h2>
              <p className="text-xs text-[#9BB5A8]">Escolha de 1 a 24 meses com cálculo automático</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-[#9BB5A8] block">Total a Pagar</span>
              <span className="text-2xl font-bold text-[#D4AF37] font-mono-num">
                {formatKz(totalAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#B8CEC2]">
              <span>Duração: <strong className="text-white">{months} {months === 1 ? 'mês' : 'meses'}</strong></span>
              <span>1 – 24 meses</span>
            </div>
            <input
              type="range"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-[#D4AF37] h-2 bg-[#172C23] rounded-lg cursor-pointer"
            />
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {[1, 3, 6, 12, 18, 24].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMonths(preset)}
                  className={`min-h-[40px] rounded-xl text-xs font-semibold border transition-colors ${
                    months === preset
                      ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                      : 'bg-[#111D18] text-[#B8CEC2] border-[#234234] hover:border-[#D4AF37]/60'
                  }`}
                >
                  {preset} {preset === 1 ? 'mês' : 'meses'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-[#111D18] border border-[#234234] p-3.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-[#9BB5A8]">Multicaixa Express</p>
                <p className="text-base font-bold text-white font-mono-num tracking-wide">
                  {MULTICAIXA_EXPRESS_NUMBER}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText(MULTICAIXA_EXPRESS_NUMBER, 'mcx')}
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-[#192D24] hover:bg-[#223E32] text-[#D4AF37] text-xs font-semibold flex items-center gap-1"
              >
                {copiedKey === 'mcx' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'mcx' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="rounded-xl bg-[#111D18] border border-[#234234] p-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#9BB5A8]">Transferência IBAN</p>
                <p className="text-xs sm:text-sm font-bold text-white font-mono-num truncate">
                  {IBAN_NUMBER}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText(IBAN_NUMBER.replace(/\s+/g, ''), 'iban')}
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-[#192D24] hover:bg-[#223E32] text-[#D4AF37] text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                {copiedKey === 'iban' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'iban' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProofModal(true)}
            className="w-full min-h-[50px] rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Comprovativo ({formatKz(totalAmount)})</span>
          </button>
        </div>
      </div>

      {showProofModal && (
        <ProofSubmitModal
          user={user}
          initialMonths={months}
          monthlyPriceKz={monthlyPriceKz}
          onClose={() => setShowProofModal(false)}
        />
      )}
    </div>
  );
};
