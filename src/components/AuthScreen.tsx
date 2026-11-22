import React, { useState } from 'react';
import { ShieldCheck, TrendingUp, Package, Smartphone, ArrowRight } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

import { formatKz } from '../utils/formatters';

interface AuthScreenProps {
  monthlyPriceKz: number;
  onLoginGoogle: () => Promise<void>;
  loading: boolean;
  errorMsg: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  monthlyPriceKz,
  onLoginGoogle,
  loading,
  errorMsg,
}) => {
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await onLoginGoogle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex flex-col justify-between p-5 sm:p-8">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4 pt-safe">
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt="CaixaStock"
            className="w-10 h-10 rounded-xl border border-[#D4AF37]/40"
          />
          <span className="text-xl font-bold tracking-tight text-white">CaixaStock</span>
        </div>
        <PWAInstallButton compact />
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
              Gestão Comercial em Angola · Kwanzas (Kz)
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              Controle o seu stock, vendas e lucro real sem perder um Kwanza.
            </h1>
            <p className="text-base sm:text-lg text-[#B8CEC2] max-w-xl leading-relaxed">
              Cada venda separa automaticamente o Capital Líquido para reposição do Lucro do Período. Acompanhe fiados, caixas, despesas e relatórios na nuvem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 space-y-1.5">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              <p className="text-sm font-semibold text-white">Capital & Lucro</p>
              <p className="text-xs text-[#9BB5A8]">Divisão automática por venda e lucro diário, semanal e mensal.</p>
            </div>
            <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 space-y-1.5">
              <Package className="w-5 h-5 text-[#34D399]" />
              <p className="text-sm font-semibold text-white">Unidade & Caixa</p>
              <p className="text-xs text-[#9BB5A8]">Venda avulso, à caixa ou ambos com abate imediato do stock.</p>
            </div>
            <div className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 space-y-1.5">
              <Smartphone className="w-5 h-5 text-[#D4AF37]" />
              <p className="text-sm font-semibold text-white">Nuvem + Offline</p>
              <p className="text-xs text-[#9BB5A8]">Sincronizado com a sua conta Google para telemóvel e computador.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-[#111D18] border border-[#1F3D30] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-semibold">14 dias grátis para testar</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Entrar no CaixaStock</h2>
              <p className="text-sm text-[#9BB5A8]">
                Inicie sessão com a sua conta Google para guardar os seus produtos, vendas e fiados com segurança.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-950/60 border border-red-500/40 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={loading || busy}
              onClick={handleSignIn}
              className="w-full min-h-[52px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] disabled:opacity-60 text-white font-semibold text-base flex items-center justify-center gap-3 transition-colors shadow-lg shadow-[#0E6B47]/25 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#FFFFFF"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                />
              </svg>
              <span>{busy || loading ? 'A entrar...' : 'Continuar com Google'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            <div className="pt-2 border-t border-[#1E3A2F] flex items-center justify-between text-xs text-[#9BB5A8]">
              <span>Após 14 dias: {formatKz(monthlyPriceKz)}/mês</span>
              <span>Multicaixa Express · IBAN</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-center sm:text-left text-xs text-[#7B9889] pb-safe">
        CaixaStock · Angola · Moeda padrão em Kwanzas (Kz)
      </footer>
    </div>
  );
};
