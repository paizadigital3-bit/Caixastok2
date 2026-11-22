import React, { useMemo, useState } from 'react';
import { Edit3, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { formatKz, normalizeSearch } from '../utils/formatters';

interface StockTabProps {
  products: Product[];
  onNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onQuickRestock: (product: Product) => void;
  onStartSale: (product: Product) => void;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export const StockTab: React.FC<StockTabProps> = ({
  products,
  onNewProduct,
  onEditProduct,
  onQuickRestock,
  onStartSale,
  onDeleteProduct,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [filterQuery, setFilterQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'Geral'));
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'))];
  }, [products]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(filterQuery);
    return products.filter((p) => {
      if (selectedCategory !== 'Todas' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        normalizeSearch(p.name).includes(q) || normalizeSearch(p.category).includes(q)
      );
    });
  }, [products, selectedCategory, filterQuery]);

  const totalCostValue = filtered.reduce((s, p) => s + p.stockUnits * p.unitCost, 0);
  const totalPotentialProfit = filtered.reduce(
    (s, p) => s + p.stockUnits * Math.max(0, p.unitPrice - p.unitCost),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de Stock</h2>
          <p className="text-xs text-[#9BB5A8] tabular-nums">
            Valor em stock: <strong className="text-white">{formatKz(totalCostValue)}</strong> · Lucro potencial:{' '}
            <strong className="text-[#D4AF37]">{formatKz(totalPotentialProfit)}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProduct}
          className="min-h-[46px] px-5 rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-semibold text-sm flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Category tabs & local filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filtrar lista de stock..."
          className="sm:w-64 min-h-[42px] rounded-xl bg-[#111D18] border border-[#1E3A2F] px-3.5 text-sm text-white placeholder:text-[#7B9889] focus:outline-none focus:border-[#D4AF37]"
        />
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#D4AF37] text-[#0A110E]'
                  : 'bg-[#111D18] text-[#B8CEC2] border border-[#1E3A2F] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-10 text-center space-y-3">
          <Package className="w-10 h-10 text-[#9BB5A8] mx-auto" />
          <p className="text-sm font-medium text-[#D1E2D8]">
            {products.length === 0
              ? 'Ainda não tem produtos no stock.'
              : 'Nenhum produto corresponde ao filtro atual.'}
          </p>
          {products.length === 0 && (
            <button
              type="button"
              onClick={onNewProduct}
              className="min-h-[44px] px-5 rounded-xl bg-[#D4AF37] text-[#0A110E] font-bold text-sm"
            >
              Adicionar Primeiro Produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filtered.map((p) => {
            const isLow = p.stockUnits <= p.minStockAlert;
            const boxesCount =
              p.unitsPerBox > 1 ? Math.floor(p.stockUnits / p.unitsPerBox) : 0;
            const unitMargin = p.unitPrice - p.unitCost;

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-[#111D18] border border-[#1E3A2F] p-4 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[#9BB5A8]">
                        {p.category}
                        {isLow && (
                          <span className="text-amber-400 font-semibold"> · Stock Baixo</span>
                        )}
                      </p>
                      <h3 className="text-base font-bold text-white truncate">{p.name}</h3>
                    </div>

                    {/* Direct '+' restock button on card */}
                    <button
                      type="button"
                      onClick={() => onQuickRestock(p)}
                      title="Aumentar stock"
                      aria-label={`Aumentar stock de ${p.name}`}
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-bold flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="rounded-xl bg-[#0A110E] border border-[#1A3329] p-2.5">
                      <span className="text-[#9BB5A8] block">Disponível</span>
                      <span
                        className={`text-sm font-bold font-mono-num ${
                          p.stockUnits === 0
                            ? 'text-red-400'
                            : isLow
                            ? 'text-amber-300'
                            : 'text-[#34D399]'
                        }`}
                      >
                        {p.stockUnits} un
                        {boxesCount > 0 ? ` (${boxesCount} cx)` : ''}
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#0A110E] border border-[#1A3329] p-2.5">
                      <span className="text-[#9BB5A8] block">Venda Unidade</span>
                      <span className="text-sm font-bold font-mono-num text-[#D4AF37]">
                        {formatKz(p.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9BB5A8] pt-1 tabular-nums">
                    <span>Custo: {formatKz(p.unitCost)}</span>
                    <span>
                      Lucro/un:{' '}
                      <strong className={unitMargin >= 0 ? 'text-[#34D399]' : 'text-red-400'}>
                        {formatKz(unitMargin)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1A3329]">
                  <button
                    type="button"
                    disabled={p.stockUnits <= 0}
                    onClick={() => onStartSale(p)}
                    className="flex-1 min-h-[42px] rounded-xl bg-[#D4AF37] hover:bg-[#E5C150] disabled:opacity-35 text-[#0A110E] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Vender</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-[#0A110E] hover:bg-[#192D24] border border-[#244637] text-[#B8CEC2] flex items-center justify-center"
                    aria-label={`Editar ${p.name}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {confirmDeleteId === p.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteProduct(p.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[42px] px-3 rounded-xl bg-red-600 text-white text-xs font-bold"
                    >
                      Apagar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="min-h-[42px] min-w-[42px] rounded-xl bg-[#0A110E] hover:bg-red-950/60 border border-[#244637] text-[#9BB5A8] hover:text-red-300 flex items-center justify-center"
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
