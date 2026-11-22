import React, { useState } from 'react';
import { CheckCircle2, ImagePlus, Send, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  CREATOR_EMAIL,
  IBAN_NUMBER,
  MULTICAIXA_EXPRESS_NUMBER,
  PROOF_ENTITY,
} from '../lib/firebase';
import { submitPaymentProof } from '../services/firestoreService';
import { compressImageToDataURL, formatKz } from '../utils/formatters';

interface ProofSubmitModalProps {
  user: User;
  initialMonths: number;
  monthlyPriceKz: number;
  onClose: () => void;
}

export const ProofSubmitModal: React.FC<ProofSubmitModalProps> = ({
  user,
  initialMonths,
  monthlyPriceKz,
  onClose,
}) => {
  const [userName, setUserName] = useState(
    user.displayName || user.email?.split('@')[0] || 'Comerciante'
  );
  const [phone, setPhone] = useState('');
  const [months, setMonths] = useState(initialMonths);
  const [paymentChannel, setPaymentChannel] = useState<'multicaixa' | 'iban'>('multicaixa');
  const [notes, setNotes] = useState('');
  const [proofImageData, setProofImageData] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalAmountKz = months * monthlyPriceKz;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageToDataURL(file, 900, 0.72);
      if (compressed.length > 640000) {
        const tighter = await compressImageToDataURL(file, 720, 0.58);
        setProofImageData(tighter);
      } else {
        setProofImageData(compressed);
      }
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar imagem.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 9) {
      setError('Indique um número de telefone válido com pelo menos 9 dígitos.');
      return;
    }
    if (!proofImageData) {
      setError('Carregue a foto do comprovativo de pagamento.');
      return;
    }

    setSubmitting(true);
    try {
      await submitPaymentProof(user, {
        userName,
        phone: phone.trim(),
        months,
        monthlyPriceKz,
        paymentChannel,
        proofImageData,
        notes,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar o comprovativo. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Enviar Comprovativo</h3>
            <p className="text-xs text-[#9BB5A8]">
              Entidade: <strong className="text-[#D4AF37]">{PROOF_ENTITY}</strong> · Destino: {CREATOR_EMAIL}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white hover:bg-[#1A2E25]"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#0E6B47]/30 border border-[#0E6B47] flex items-center justify-center text-[#34D399]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white">Comprovativo Enviado</h4>
              <p className="text-sm text-[#E2EFE8] leading-relaxed bg-[#0A110E] border border-[#1E3A2F] rounded-2xl p-4">
                Obrigado! Recebemos a tua mensagem, receberá um código de ativação caso o comprovativo seja aprovado! Isso pode demorar 12h.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-[#0E6B47] hover:bg-[#128257] text-white font-semibold text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#234234] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Conta Google</label>
                <input
                  type="email"
                  readOnly
                  value={user.email || ''}
                  className="w-full min-h-[44px] rounded-xl bg-[#0D1713] border border-[#1B3329] px-3.5 text-sm text-[#9BB5A8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                  Telefone / WhatsApp <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 923 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#234234] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                  Meses ({formatKz(monthlyPriceKz)}/mês)
                </label>
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#234234] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? 'mês' : 'meses'} — {formatKz(m * monthlyPriceKz)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">Canal Utilizado</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentChannel('multicaixa')}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    paymentChannel === 'multicaixa'
                      ? 'bg-[#0E6B47]/30 border-[#D4AF37] text-white'
                      : 'bg-[#0A110E] border-[#234234] text-[#9BB5A8]'
                  }`}
                >
                  Multicaixa ({MULTICAIXA_EXPRESS_NUMBER})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentChannel('iban')}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    paymentChannel === 'iban'
                      ? 'bg-[#0E6B47]/30 border-[#D4AF37] text-white'
                      : 'bg-[#0A110E] border-[#234234] text-[#9BB5A8]'
                  }`}
                >
                  IBAN ({IBAN_NUMBER.slice(-8)})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">
                Foto do Comprovativo <span className="text-[#D4AF37]">*</span>
              </label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2B5442] bg-[#0A110E] p-4 cursor-pointer hover:border-[#D4AF37] transition-colors">
                {proofImageData ? (
                  <div className="w-full space-y-2 text-center">
                    <img
                      src={proofImageData}
                      alt="Pré-visualização do comprovativo"
                      className="max-h-44 mx-auto rounded-xl object-contain"
                    />
                    <p className="text-xs text-[#34D399] font-medium truncate">{fileName}</p>
                  </div>
                ) : (
                  <>
                    <ImagePlus className="w-7 h-7 text-[#D4AF37]" />
                    <span className="text-xs font-medium text-[#B8CEC2]">
                      Toque para carregar captura ou foto do talão
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                maxLength={250}
                placeholder="Ex: Transferência feita hoje às 14h"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#234234] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="rounded-xl bg-[#0A110E] border border-[#1E3A2F] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#9BB5A8]">Total a validar ({PROOF_ENTITY})</span>
              <span className="text-base font-bold text-[#D4AF37] font-mono-num">
                {formatKz(totalAmountKz)}
              </span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] disabled:opacity-60 text-[#0A110E] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'A enviar comprovativo...' : 'Enviar para Aprovação'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
