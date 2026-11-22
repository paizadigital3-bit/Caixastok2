import React, { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className={
          compact
            ? 'min-h-[40px] px-3 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0'
            : 'min-h-[44px] px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] text-[#0A110E] font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Instalar App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-semibold text-[#F4F7F5]">
                  Instalar CaixaStock no Ecrã Inicial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9BB5A8] hover:text-white hover:bg-[#192D24]"
                aria-label="Fechar guia de instalação"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-sm text-[#D1E2D8] leading-relaxed">
                <p>No iPhone / iPad (Safari), siga estes passos para abrir em ecrã cheio:</p>
                <ol className="list-decimal list-inside space-y-2 text-[#F4F7F5]">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#D4AF37]">1.</span>
                    <span>
                      Toque no botão <strong className="inline-flex items-center gap-1 text-white"><Share className="w-3.5 h-3.5" /> Partilhar</strong> na barra inferior do Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#D4AF37]">2.</span>
                    <span>Desça e toque em <strong>Adicionar ao Ecrã Principal</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#D4AF37]">3.</span>
                    <span>Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-[#D1E2D8] leading-relaxed">
                <p>Para instalar no Android ou computador:</p>
                <ol className="list-decimal list-inside space-y-2 text-[#F4F7F5]">
                  <li>Abra o menu do navegador (três pontos no canto superior).</li>
                  <li>Selecione <strong>Instalar aplicação</strong> ou <strong>Adicionar ao ecrã principal</strong>.</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#0E6B47] hover:bg-[#128257] text-white font-semibold text-sm transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
