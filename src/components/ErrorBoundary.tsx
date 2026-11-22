import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message || 'Ocorreu um erro inesperado.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        readable = `Erro de sincronização (${parsed.operationType || 'dados'}): ${parsed.error}`;
      }
    } catch {
      // keep original message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-[#111D18] border border-red-500/40 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">Algo correu mal no CaixaStock</h2>
            </div>
            <p className="text-sm text-[#B8CEC2] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-xl bg-[#0E6B47] hover:bg-[#128257] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
