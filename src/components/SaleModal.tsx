import React, { useMemo, useState } from 'react';
import { AlertCircle, Check, ShoppingBag, X } from 'lucide-react';
import type { PaymentMethod, Product, SaleMode } from '../types';
import { formatKz, getDeviceTodayISO } from '../utils/formatters';

interface SaleModalProps {
  products: Product[];
  initialProduct?: Product | null;
  defaultDateISO: string;
  onConfirmSale: (
    product: Product,
    input: {
      saleMode: SaleMode;
      unitsQty: number;
      boxesQty: number;
      totalUnitsSold: number;
      totalAmount: number;
      paymentMethod: PaymentMethod;
      customerName: string;
      customerPhone: string;
      dueDate: string;
      saleDate: string;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  products,
  initialProduct,
  defaultDateISO,
  onConfirmSale,
  onClose,
}) => {
  const availableProducts = products.filter((p) => p.stockUnits > 0);
  const [selectedId, setSelectedId] = useState(
    initialProduct?.id || availableProducts[0]?.id || ''
  );
  const product = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  const [saleMode, setSaleMode] = useState<SaleMode>('unit');
  const [unitsQty, setUnitsQty] = useState(1);
  const [boxesQty, setBoxesQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 7);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  });
  const [saleDate, setSaleDate] = useState(defaultDateISO || getDeviceTodayISO());
  const [customTotal, setCustomTotal] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveUnits = saleMode === 'box' ? 0 : Math.max(0, unitsQty);
  const effectiveBoxes = saleMode === 'unit' ? 0 : Math.max(0, boxesQty);
  const unitsPerBox = product?.unitsPerBox || 1;
  const totalUnitsSold = effectiveUnits + effectiveBoxes * unitsPerBox;

  const calculatedTotal = useMemo(() => {
    if (!product) return 0;
    const boxUnitValue =
      product.boxPrice > 0 ? product.boxPrice : product.unitPrice * product.unitsPerBox;
    return effectiveUnits * product.unitPrice + effectiveBoxes * boxUnitValue;
  }, [product, effectiveUnits, effectiveBoxes]);

  const finalTotal =
    customTotal.trim() !== '' && !Number.isNaN(Number(customTotal))
      ? Math.max(0, Number(customTotal))
      : calculatedTotal;

  const capitalPortion = product ? totalUnitsSold * product.unitCost : 0;
  const profitPortion = finalTotal - capitalPortion;
  const exceedsStock = product ? totalUnitsSold > product.stockUnits : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!product) {
      setError('Selecione um produto com stock disponível.');
      return;
    }
    if (totalUnitsSold <= 0) {
      setError('A quantidade vendida deve ser superior a zero.');
      return;
    }
    if (totalUnitsSold > product.stockUnits) {
      setError(`Stock insuficiente. Disponível: ${product.stockUnits} unidades.`);
      return;
    }
    if (paymentMethod === 'fiado' && !customerName.trim()) {
      setError('Para venda em Fiado, o nome do cliente é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await onConfirmSale(product, {
        saleMode,
        unitsQty: effectiveUnits,
        boxesQty: effectiveBoxes,
        totalUnitsSold,
        totalAmount: finalTotal,
        paymentMethod,
        customerName,
        customerPhone,
        dueDate,
        saleDate,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar venda.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#111D18] border border-[#1E3A2F] p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Registar Venda</h3>
              <p className="text-xs text-[#9BB5A8]">Unidade, caixa ou ambos com divisão de capital</p>
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

        {availableProducts.length === 0 ? (
          <div className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-6 text-center space-y-3">
            <p className="text-sm text-[#B8CEC2]">
              Não tem produtos com stock disponível. Adicione ou reponha stock primeiro.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 rounded-xl bg-[#0E6B47] text-white text-sm font-semibold"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#B8CEC2] mb-1">Produto</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setCustomTotal('');
                }}
                className="w-full min-h-[46px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              >
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stockUnits} un · {formatKz(p.unitPrice)})
                  </option>
                ))}
              </select>
            </div>

            {product && (
              <>
                <div className="flex items-center justify-between text-xs text-[#9BB5A8] px-1">
                  <span>Stock disponível: <strong className="text-[#34D399] font-mono-num">{product.stockUnits} un</strong></span>
                  <span>1 caixa = <strong className="text-white">{product.unitsPerBox} un</strong></span>
                </div>

                {/* Sale mode segmented selector */}
                <div>
                  <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">Tipo de Venda</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'unit', label: 'Unidade' },
                        { id: 'box', label: 'Caixa' },
                        { id: 'both', label: 'Ambos' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={m.id !== 'unit' && product.unitsPerBox <= 1}
                        onClick={() => {
                          setSaleMode(m.id);
                          setCustomTotal('');
                        }}
                        className={`min-h-[42px] rounded-xl border text-xs font-semibold transition-colors disabled:opacity-35 ${
                          saleMode === m.id
                            ? 'bg-[#D4AF37] text-[#0A110E] border-[#D4AF37]'
                            : 'bg-[#0A110E] text-[#B8CEC2] border-[#244637]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {saleMode !== 'box' && (
                    <div>
                      <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                        Qtd. Unidades
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={product.stockUnits}
                        value={unitsQty}
                        onChange={(e) => {
                          setUnitsQty(Math.max(0, Number(e.target.value)));
                          setCustomTotal('');
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  )}
                  {saleMode !== 'unit' && (
                    <div>
                      <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                        Qtd. Caixas ({product.unitsPerBox} un/cx)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={boxesQty}
                        onChange={(e) => {
                          setBoxesQty(Math.max(0, Number(e.target.value)));
                          setCustomTotal('');
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  )}
                  <div className={saleMode === 'both' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                      Data da Venda
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-[#0A110E] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {exceedsStock && (
                  <div className="rounded-xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Total ({totalUnitsSold} un) ultrapassa o stock disponível ({product.stockUnits} un).
                    </span>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium text-[#B8CEC2] mb-1.5">
                    Método de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'dinheiro', label: 'Dinheiro' },
                        { id: 'multicaixa', label: 'MCX Express' },
                        { id: 'fiado', label: 'Fiado' },
                      ] as const
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors ${
                          paymentMethod === pm.id
                            ? pm.id === 'fiado'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-[#0E6B47] border-[#34D399]/50 text-white'
                            : 'bg-[#0A110E] border-[#244637] text-[#9BB5A8]'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'fiado' && (
                  <div className="rounded-2xl bg-[#0A110E] border border-amber-500/35 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-amber-200 mb-1">
                          Nome do Cliente *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Maria Domingos"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl bg-[#111D18] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                          Telefone (opcional)
                        </label>
                        <input
                          type="tel"
                          placeholder="923..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl bg-[#111D18] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#B8CEC2] mb-1">
                        Prazo de Pagamento
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl bg-[#111D18] border border-[#244637] px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* Total override & split preview */}
                <div className="rounded-2xl bg-[#0A110E] border border-[#1E3A2F] p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#9BB5A8]">Valor Total (Kz)</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      placeholder={String(Math.round(calculatedTotal))}
                      value={customTotal}
                      onChange={(e) => setCustomTotal(e.target.value)}
                      className="w-40 text-right min-h-[40px] rounded-xl bg-[#111D18] border border-[#244637] px-3 text-base font-bold font-mono-num text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#182E25]">
                    <span className="text-[#9BB5A8]">Total Unidades: <strong className="text-white">{totalUnitsSold} un</strong></span>
                    <span className="text-[#9BB5A8]">
                      Capital: <strong className="text-white font-mono-num">{formatKz(capitalPortion)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9BB5A8]">
                      {paymentMethod === 'fiado' ? 'Lucro quando receber' : 'Lucro da Venda'}
                    </span>
                    <span className={`font-bold font-mono-num ${profitPortion >= 0 ? 'text-[#34D399]' : 'text-red-400'}`}>
                      {formatKz(profitPortion)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="rounded-xl bg-red-950/60 border border-red-500/40 px-3.5 py-2.5 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || exceedsStock || totalUnitsSold <= 0}
              className="w-full min-h-[50px] rounded-xl bg-[#0E6B47] hover:bg-[#138559] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>
                {saving
                  ? 'A registar...'
                  : `Confirmar Venda · ${formatKz(finalTotal)}`}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
