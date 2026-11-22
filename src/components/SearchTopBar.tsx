import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Search, ShoppingBag, X } from 'lucide-react';
import type { Product, Sale } from '../types';
import { formatDatePT, formatKz, fuzzyMatchScore } from '../utils/formatters';

interface SearchTopBarProps {
  products: Product[];
  pendingFiados: Sale[];
  onStartSaleFromSearch: (product: Product) => void;
  onConfirmFiadoFromSearch: (sale: Sale, method: 'dinheiro' | 'multicaixa') => Promise<void>;
}

export const SearchTopBar: React.FC<SearchTopBarProps> = ({
  products,
  pendingFiados,
  onStartSaleFromSearch,
  onConfirmFiadoFromSearch,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMagnifierClick = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 20);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return { products: [] as Product[], fiados: [] as Sale[] };

    const matchedProducts = products
      .map((p) => ({
        item: p,
        score: Math.max(fuzzyMatchScore(q, p.name), fuzzyMatchScore(q, p.category) * 0.8),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.item);

    const matchedFiados = pendingFiados
      .map((s) => ({
        item: s,
        score: Math.max(
          fuzzyMatchScore(q, s.customerName),
          fuzzyMatchScore(q, s.productName) * 0.85
        ),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.item);

    return { products: matchedProducts, fiados: matchedFiados };
  }, [query, products, pendingFiados]);

  const showSuggestions = isOpen && query.trim().length >= 1;

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  const handleSelectProductSale = (p: Product) => {
    handleClear();
    onStartSaleFromSearch(p);
  };

  const handleConfirmFiado = async (sale: Sale, method: 'dinheiro' | 'multicaixa') => {
    setSettlingId(sale.id);
    try {
      await onConfirmFiadoFromSearch(sale, method);
      handleClear();
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-2xl bg-[#111D18] border border-[#1E3A2F] focus-within:border-[#D4AF37] px-2.5 py-1.5 transition-colors">
        <button
          type="button"
          onClick={handleMagnifierClick}
          className="min-h-[40px] min-w-[40px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white flex items-center justify-center shrink-0 transition-colors"
          aria-label="Carregar pesquisa no topo"
          title="Pesquisar produtos ou fiados"
        >
          <Search className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Pesquisar produto ou cliente de fiado..."
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-[#7B9889] focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#9BB5A8] hover:text-white"
            aria-label="Limpar pesquisa"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-[#111D18] border border-[#244637] shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto divide-y divide-[#1A3329]">
          {results.products.length === 0 && results.fiados.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#9BB5A8]">
              Sem correspondências para "{query}".
            </div>
          ) : (
            <>
              {results.products.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#162720] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-xs text-[#9BB5A8] tabular-nums">
                      {p.category} · Stock: <strong className={p.stockUnits <= p.minStockAlert ? 'text-amber-400' : 'text-[#34D399]'}>{p.stockUnits} un</strong> · {formatKz(p.unitPrice)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={p.stockUnits <= 0}
                    onClick={() => handleSelectProductSale(p)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] disabled:opacity-40 text-[#0A110E] font-bold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Vender</span>
                  </button>
                </div>
              ))}

              {results.fiados.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#162720] transition-colors bg-[#0D1713]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-300 truncate">
                      Fiado: {s.customerName || 'Cliente'}
                    </p>
                    <p className="text-xs text-[#B8CEC2] tabular-nums truncate">
                      {s.productName} · {formatKz(s.totalAmount)} {s.dueDate ? `· Prazo ${formatDatePT(s.dueDate)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={settlingId === s.id}
                      onClick={() => handleConfirmFiado(s, 'dinheiro')}
                      className="min-h-[38px] px-3 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-semibold text-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dinheiro</span>
                    </button>
                    <button
                      type="button"
                      disabled={settlingId === s.id}
                      onClick={() => handleConfirmFiado(s, 'multicaixa')}
                      className="min-h-[38px] px-3 rounded-xl bg-[#192D24] hover:bg-[#234033] text-[#D4AF37] border border-[#D4AF37]/40 font-semibold text-xs"
                    >
                      MCX
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
