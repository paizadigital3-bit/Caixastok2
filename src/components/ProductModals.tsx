import React, { useState } from 'react';
import { PackagePlus, Plus, X } from 'lucide-react';
import type { Product } from '../types';
import { formatKz, getDeviceTodayISO } from '../utils/formatters';

interface ProductFormModalProps {
  editingProduct?: Product | null;
  defaultDateISO: string;
  onSaveNew: (input: {
    name: string;
    category: string;
    unitCost: number;
    unitPrice: number;
    boxPrice: number;
    unitsPerBox: number;
    stockUnits: number;
    minStockAlert: number;
    transportCost: number;
    deductFromCapital: boolean;
    purchaseDate: string;
  }) => Promise<void>;
  onSaveEdit: (
    productId: string,
    updates: {
      name: string;
      category: string;
      unitCost: number;
      unitPrice: number;
      boxPrice: number;
      unitsPerBox: number;
      minStockAlert: number;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  editingProduct,
  defaultDateISO,
  onSaveNew,
  onSaveEdit,
  onClose,
}) => {
  const isEdit = !!editingProduct;

  const [name, setName] = useState(editingProduct?.name || '');
  const [category, setCategory] = useState(editingProduct?.category || 'Bebidas');
  const [unitsPerBox, setUnitsPerBox] = useState(editingProduct?.unitsPerBox || 12);
  const [stockUnits, setStockUnits] = useState(editingProduct?.stockUnits || 24);
  const [lotCost, setLotCost] = useState(
    editingProduct ? editingProduct.unitCost * editingProduct.stockUnits : 10000
  );
  const [unitCostEdit, setUnitCostEdit] = useState(editingProduct?.unitCost || 0);
  const [transportCost, setTransportCost] = useState(0);
  const [unitPrice, setUnitPrice] = useState(editingProduct?.unitPrice || 700);
  const [boxPrice, setBoxPrice] = useState(editingProduct?.boxPrice || 8000);
  const [minStockAlert, setMinStockAlert] = useState(editingProduct?.minStockAlert ?? 5);
  const [deductFromCapital, setDeductFromCapital] = useState(true);
  const [purchaseDate, setPurchaseDate] = useState(defaultDateISO || getDeviceTodayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realUnitCost = isEdit
    ? unitCostEdit
    : stockUnits > 0
    ? (lotCost + transportCost) / stockUnits
    : 0;
  const marginKz = unitPrice - realUnitCost;
  const marginPct = realUnitCost > 0 ? (marginKz / realUnitCost) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Indique o nome do produto.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editingProduct) {
        await onSaveEdit(editingProduct.id, {
          name,
          category,
          unitCost: unitCostEdit,
          unitPrice,
          boxPrice,
          unitsPerBox,
          minStockAlert,
        });
      } else {
        const baseUnitCost = stockUnits > 0 ? lotCost / stockUnits : 0;
        await onSaveNew({
          name,
          category,
          unitCost: baseUnitCost,
          unitPrice,
          boxPrice,
          unitsPerBox,
          stockUnits,
          minStockAlert,
          transportCost,
          deductFromCapital,
          purchaseDate,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0E6B47]/25 border border-[#0E6B47] flex items-center justify-center text-[#34D399]">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEdit ? 'Editar Produto' : 'Novo Produto & Compra'}
              </h3>
              <p className="text-xs text-[#9BB5A8]">
                {isEdit ? 'Atualizar preços e limites de alerta' : 'Com rateio automático de transporte'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#9BB5A8] hover:text-white hover:bg-[#192D24]"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Nome do Produto *</label>
              <input
                type="text"
                required
                placeholder="Ex: Água Pura 1.5L"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Categoria</label>
              <input
                type="text"
                placeholder="Ex: Bebidas, Mercearia"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Unidades por Caixa</label>
              <input
                type="number"
                min={1}
                value={unitsPerBox}
                onChange={(e) => setUnitsPerBox(Math.max(1, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Alerta Stock Baixo (un)</label>
              <input
                type="number"
                min={0}
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
          </div>

          {!isEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Qtd. Comprada (un)</label>
                <input
                  type="number"
                  min={0}
                  value={stockUnits}
                  onChange={(e) => setStockUnits(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Custo Mercadoria (Kz)</label>
                <input
                  type="number"
                  min={0}
                  value={lotCost}
                  onChange={(e) => setLotCost(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Transporte (Kz)</label>
                <input
                  type="number"
                  min={0}
                  value={transportCost}
                  onChange={(e) => setTransportCost(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Custo Unitário Real (Kz)</label>
              <input
                type="number"
                min={0}
                value={unitCostEdit}
                onChange={(e) => setUnitCostEdit(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Preço Venda Unidade (Kz)</label>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-[#D4AF37] font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Preço Venda Caixa (Kz)</label>
              <input
                type="number"
                min={0}
                value={boxPrice}
                onChange={(e) => setBoxPrice(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-[#D4AF37] font-semibold"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Data da Compra</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white"
                />
              </div>
              <label className="flex items-center gap-2.5 pt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromCapital}
                  onChange={(e) => setDeductFromCapital(e.target.checked)}
                  className="w-5 h-5 accent-[#D4AF37] rounded"
                />
                <span className="text-xs font-medium text-[#D1E2D8]">
                  Abater compra do Capital Líquido
                </span>
              </label>
            </div>
          )}

          {/* Margin preview */}
          <div className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Custo Unitário Real</span>
              <span className="font-bold font-mono-num text-white">{formatKz(realUnitCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Margem Unitária Estimada</span>
              <span className={`font-bold font-mono-num ${marginKz >= 0 ? 'text-[#34D399]' : 'text-red-400'}`}>
                {formatKz(marginKz)} ({marginPct.toFixed(1)}%)
              </span>
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
            className="w-full min-h-[48px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-bold text-sm transition-colors"
          >
            {saving ? 'A guardar...' : isEdit ? 'Guardar Alterações' : 'Guardar Produto'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface QuickRestockModalProps {
  product: Product;
  defaultDateISO: string;
  onRestock: (
    product: Product,
    input: {
      unitsToAdd: number;
      lotCost: number;
      transportCost: number;
      deductFromCapital: boolean;
      purchaseDate: string;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export const QuickRestockModal: React.FC<QuickRestockModalProps> = ({
  product,
  defaultDateISO,
  onRestock,
  onClose,
}) => {
  const [mode, setMode] = useState<'unit' | 'box'>('unit');
  const [qty, setQty] = useState(product.unitsPerBox > 1 ? 1 : 10);
  const unitsToAdd = mode === 'box' ? qty * product.unitsPerBox : qty;

  const [lotCost, setLotCost] = useState(() => Math.round(unitsToAdd * product.unitCost));
  const [transportCost, setTransportCost] = useState(0);
  const [deductFromCapital, setDeductFromCapital] = useState(true);
  const [purchaseDate, setPurchaseDate] = useState(defaultDateISO || getDeviceTodayISO());
  const [saving, setSaving] = useState(false);

  const handleModeOrQty = (nextMode: 'unit' | 'box', nextQty: number) => {
    setMode(nextMode);
    setQty(nextQty);
    const totalU = nextMode === 'box' ? nextQty * product.unitsPerBox : nextQty;
    setLotCost(Math.round(totalU * product.unitCost));
  };

  const totalOutlay = lotCost + transportCost;
  const nextStock = product.stockUnits + unitsToAdd;
  const weightedCost =
    nextStock > 0
      ? (product.stockUnits * product.unitCost + totalOutlay) / nextStock
      : product.unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unitsToAdd <= 0) return;
    setSaving(true);
    try {
      await onRestock(product, {
        unitsToAdd,
        lotCost,
        transportCost,
        deductFromCapital,
        purchaseDate,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Aumentar Stock (+)</h3>
            <p className="text-xs text-[#9BB5A8]">
              {product.name} · Atual: <strong className="text-white">{product.stockUnits} un</strong>
            </p>
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
          {product.unitsPerBox > 1 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeOrQty('unit', qty)}
                className={`min-h-[40px] rounded-xl text-xs font-semibold border ${
                  mode === 'unit'
                    ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                    : 'bg-[#0A110E] text-[#B8CEC2] border-[#244637]'
                }`}
              >
                Por Unidade
              </button>
              <button
                type="button"
                onClick={() => handleModeOrQty('box', qty)}
                className={`min-h-[40px] rounded-xl text-xs font-semibold border ${
                  mode === 'box'
                    ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                    : 'bg-[#0A110E] text-[#B8CEC2] border-[#244637]'
                }`}
              >
                Por Caixa ({product.unitsPerBox} un)
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                Quantidade ({mode === 'box' ? 'caixas' : 'unidades'})
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => handleModeOrQty(mode, Math.max(1, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Data</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Custo do Lote (Kz)</label>
              <input
                type="number"
                min={0}
                value={lotCost}
                onChange={(e) => setLotCost(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Transporte (Kz)</label>
              <input
                type="number"
                min={0}
                value={transportCost}
                onChange={(e) => setTransportCost(Math.max(0, Number(e.target.value)))}
                className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={deductFromCapital}
              onChange={(e) => setDeductFromCapital(e.target.checked)}
              className="w-5 h-5 accent-[#D4AF37]"
            />
            <span className="text-xs font-medium text-[#D1E2D8]">
              Deduzir {formatKz(totalOutlay)} do Capital Líquido
            </span>
          </label>

          <div className="rounded-xl bg-[#0A110E] border border-[#1E3A2F] p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Novo stock total</span>
              <span className="font-bold text-[#34D399] font-mono-num">{nextStock} un</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9BB5A8]">Novo custo médio unitário</span>
              <span className="font-bold text-white font-mono-num">{formatKz(weightedCost)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'A adicionar...' : `Adicionar +${unitsToAdd} un`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
