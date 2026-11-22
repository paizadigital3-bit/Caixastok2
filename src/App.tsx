import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Crown,
  FileBarChart2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Users,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AuthScreen } from './components/AuthScreen';
import { CreatorPanelModal } from './components/CreatorPanelModal';
import { DashboardTab } from './components/DashboardTab';
import { AdjustCapitalModal, ExpenseModal } from './components/ExpenseCapitalModals';
import { FiadosTab } from './components/FiadosTab';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProductFormModal, QuickRestockModal } from './components/ProductModals';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReportsTab } from './components/ReportsTab';
import { SaleModal } from './components/SaleModal';
import { SearchTopBar } from './components/SearchTopBar';
import { StockTab } from './components/StockTab';
import { SubscriptionPaywall } from './components/SubscriptionPaywall';
import { auth, CREATOR_EMAIL, googleProvider, MONTHLY_PRICE_KZ } from './lib/firebase';
import {
  adjustLiquidCapital,
  archiveMonthReport,
  clearAllMerchantData,
  confirmFiadoPayment,
  createProduct,
  deleteProduct,
  ensureUserAccountAndConfig,
  registerExpense,
  registerSale,
  restockProduct,
  subscribeBillingPrice,
  subscribeExpenses,
  subscribeMerchantConfig,
  subscribeProducts,
  subscribeReports,
  subscribeSales,
  subscribeUserAccount,
  updatePinCode,
  updateProductDetails,
} from './services/firestoreService';
import type {
  Expense,
  MerchantConfig,
  MonthlyReport,
  Product,
  Sale,
  TabId,
  UserAccount,
} from './types';
import {
  calculateFinancialSummary,
  getDeviceTodayISO,
  getMonthKey,
} from './utils/formatters';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [account, setAccount] = useState<UserAccount | null>(null);
  const [config, setConfig] = useState<MerchantConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('painel');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() => getDeviceTodayISO());

  // Modals state
  const [saleModalProduct, setSaleModalProduct] = useState<Product | null | undefined>(undefined);
  const [returnToPainelAfterSale, setReturnToPainelAfterSale] = useState(false);
  const [productFormTarget, setProductFormTarget] = useState<Product | null | undefined>(undefined);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCreatorPanel, setShowCreatorPanel] = useState(false);
  const [monthlyPriceKz, setMonthlyPriceKz] = useState<number>(MONTHLY_PRICE_KZ);

  useEffect(() => {
    const unsubBilling = subscribeBillingPrice(setMonthlyPriceKz);
    return () => unsubBilling();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          await ensureUserAccountAndConfig(nextUser);
        } catch (err) {
          setAuthError(
            err instanceof Error ? err.message : 'Erro ao inicializar conta na nuvem.'
          );
        }
      } else {
        setAccount(null);
        setConfig(null);
        setProducts([]);
        setSales([]);
        setExpenses([]);
        setReports([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const u1 = subscribeUserAccount(uid, setAccount);
    const u2 = subscribeMerchantConfig(uid, setConfig);
    const u3 = subscribeProducts(uid, setProducts);
    const u4 = subscribeSales(uid, setSales);
    const u5 = subscribeExpenses(uid, setExpenses);
    const u6 = subscribeReports(uid, setReports);

    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, [user]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o login Google.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const todayISO = getDeviceTodayISO();

  const summary = useMemo(
    () =>
      calculateFinancialSummary(
        products,
        sales,
        expenses,
        selectedDateISO,
        config?.archivedMonths || []
      ),
    [products, sales, expenses, selectedDateISO, config?.archivedMonths]
  );

  const pendingFiados = useMemo(
    () => sales.filter((s) => s.paymentMethod === 'fiado' && s.status === 'pending'),
    [sales]
  );

  const isCreator =
    (user?.email || '').toLowerCase() === CREATOR_EMAIL.toLowerCase();

  const accessState = useMemo(() => {
    if (!account) return { allowed: true, daysLeft: 14, label: 'A carregar...' };
    if (isCreator || account.role === 'creator') {
      return { allowed: true, daysLeft: 9999, label: 'Criador · Permanente' };
    }
    if (account.subscriptionStatus === 'revoked') {
      return { allowed: false, daysLeft: 0, label: 'Suspenso' };
    }
    const nowMs = Date.now();
    const subMs = account.subscriptionEndsAt?.toMillis?.() ?? 0;
    const trialMs = account.trialEndsAt?.toMillis?.() ?? 0;

    if (account.subscriptionStatus === 'active' && subMs > nowMs) {
      const daysLeft = Math.max(1, Math.ceil((subMs - nowMs) / 86400000));
      return { allowed: true, daysLeft, label: `Ativo · ${daysLeft}d` };
    }
    if (account.subscriptionStatus === 'trial' && trialMs > nowMs) {
      const daysLeft = Math.max(1, Math.ceil((trialMs - nowMs) / 86400000));
      return { allowed: true, daysLeft, label: `Teste grátis · ${daysLeft}d` };
    }
    return { allowed: false, daysLeft: 0, label: 'Expirado' };
  }, [account, isCreator]);

  const handleArchiveMonth = async (monthKey: string) => {
    if (!user || !config) return;
    const paidInMonth = sales.filter((s) => {
      if (s.status !== 'paid') return false;
      const effDate = s.paymentMethod === 'fiado' ? s.paidDate : s.saleDate;
      return effDate && getMonthKey(effDate) === monthKey;
    });
    const expInMonth = expenses.filter(
      (e) => e.type === 'expense' && getMonthKey(e.expenseDate) === monthKey
    );

    const totalSales = paidInMonth.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCash = paidInMonth
      .filter((s) => (s.paymentMethod === 'fiado' ? s.paidMethod : s.paymentMethod) === 'dinheiro')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalMulticaixa = paidInMonth
      .filter((s) => (s.paymentMethod === 'fiado' ? s.paidMethod : s.paymentMethod) === 'multicaixa')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expInMonth.reduce((sum, e) => sum + e.amount, 0);
    const salesProfit = paidInMonth.reduce((sum, s) => sum + s.profitPortion, 0);

    await archiveMonthReport(user.uid, config, {
      monthKey,
      totalSales,
      totalCash,
      totalMulticaixa,
      totalExpenses,
      netProfit: salesProfit - totalExpenses,
      closedDate: todayISO,
    });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex flex-col items-center justify-center gap-3 p-6">
        <img src="/icon.svg" alt="CaixaStock" className="w-12 h-12 rounded-2xl" />
        <p className="text-sm font-medium text-[#9BB5A8]">A carregar CaixaStock...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <OfflineIndicator />
        <AuthScreen
          monthlyPriceKz={monthlyPriceKz}
          onLoginGoogle={handleGoogleLogin}
          loading={!authReady}
          errorMsg={authError}
        />
      </>
    );
  }

  if (!account || !config) {
    return (
      <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex flex-col items-center justify-center gap-3 p-6">
        <img src="/icon.svg" alt="CaixaStock" className="w-12 h-12 rounded-2xl" />
        <p className="text-sm font-medium text-[#9BB5A8]">A sincronizar a sua conta...</p>
      </div>
    );
  }

  if (!accessState.allowed) {
    return (
      <>
        <OfflineIndicator />
        <SubscriptionPaywall
          user={user}
          account={account}
          monthlyPriceKz={monthlyPriceKz}
          isLocked={true}
          onSignOut={handleSignOut}
        />
      </>
    );
  }

  const navItems: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'painel', label: 'Painel', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'stock', label: 'Stock', icon: <Package className="w-5 h-5" /> },
    {
      id: 'fiados',
      label: 'Fiados',
      icon: <Users className="w-5 h-5" />,
      badge: pendingFiados.length > 0 ? pendingFiados.length : undefined,
    },
    { id: 'relatorios', label: 'Relatórios', icon: <FileBarChart2 className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A110E] text-[#F4F7F5] flex flex-col lg:flex-row">
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 flex-col justify-between bg-[#0E1814] border-r border-[#1A3329] p-5 sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="CaixaStock"
              className="w-10 h-10 rounded-xl border border-[#D4AF37]/40"
            />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">CaixaStock</h1>
              <p className="text-[11px] text-[#9BB5A8] truncate max-w-[160px]">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[46px] px-4 rounded-xl flex items-center justify-between text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#0E6B47] text-white'
                      : 'text-[#B8CEC2] hover:bg-[#14251E] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="text-xs font-mono-num font-bold text-[#D4AF37]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {isCreator && (
            <button
              type="button"
              onClick={() => setShowCreatorPanel(true)}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/50 text-[#D4AF37] text-sm font-bold flex items-center gap-2.5 transition-colors"
            >
              <Crown className="w-4 h-4" />
              <span>Painel do Criador</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5 pt-4 border-t border-[#1A3329]">
          <PWAInstallButton />

          {!isCreator && (
            <button
              type="button"
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#111D18] hover:bg-[#182B23] border border-[#244637] text-xs font-semibold text-[#D4AF37] flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                <span>{accessState.label}</span>
              </span>
              <span>Ativar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full min-h-[42px] px-3.5 rounded-xl text-xs font-semibold text-[#9BB5A8] hover:text-white hover:bg-[#14251E] flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        {/* Top Bar with Device Date Picker, Account/Creator Actions & Search Bar */}
        <header className="sticky top-0 z-30 bg-[#0A110E]/92 backdrop-blur-md border-b border-[#182E25] pt-safe">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
                <img
                  src="/icon.svg"
                  alt="CaixaStock"
                  className="w-8 h-8 rounded-lg border border-[#D4AF37]/40 shrink-0"
                />
                <span className="text-base font-bold text-white truncate">CaixaStock</span>
              </div>

              {/* Calendar Date Selector (auto device today) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-[#111D18] border border-[#1E3A2F] px-2.5 py-1.5">
                  <CalendarDays className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <input
                    type="date"
                    value={selectedDateISO}
                    onChange={(e) => setSelectedDateISO(e.target.value || todayISO)}
                    aria-label="Selecionar data de referência"
                    className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none"
                  />
                </div>
                {selectedDateISO !== todayISO && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateISO(todayISO)}
                    className="min-h-[34px] px-2.5 rounded-xl bg-[#0E6B47] text-white text-xs font-semibold"
                  >
                    Hoje
                  </button>
                )}
              </div>

              {/* Mobile utility actions */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <PWAInstallButton compact />
                {isCreator ? (
                  <button
                    type="button"
                    onClick={() => setShowCreatorPanel(true)}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center"
                    aria-label="Painel do Criador"
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(true)}
                    className="min-h-[40px] px-2.5 rounded-xl bg-[#111D18] border border-[#244637] text-[11px] font-semibold text-[#D4AF37] whitespace-nowrap"
                  >
                    {accessState.daysLeft}d
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-[#111D18] border border-[#1E3A2F] text-[#9BB5A8] flex items-center justify-center"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Intuitive Search Bar with immediate suggestions & magnifier button */}
            <SearchTopBar
              products={products}
              pendingFiados={pendingFiados}
              onStartSaleFromSearch={(product) => {
                setReturnToPainelAfterSale(true);
                setSaleModalProduct(product);
              }}
              onConfirmFiadoFromSearch={async (sale, method) => {
                await confirmFiadoPayment(user.uid, sale, method, selectedDateISO || todayISO);
                setActiveTab('painel');
              }}
            />
          </div>
        </header>

        {/* Active Tab View */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5">
          {activeTab === 'painel' && (
            <DashboardTab
              config={config}
              summary={summary}
              products={products}
              sales={sales}
              expenses={expenses}
              selectedDateISO={selectedDateISO}
              onOpenSale={() => {
                setReturnToPainelAfterSale(false);
                setSaleModalProduct(null);
              }}
              onOpenExpense={() => setShowExpenseModal(true)}
              onOpenNewProduct={() => setProductFormTarget(null)}
              onOpenAdjustCapital={() => setShowCapitalModal(true)}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'stock' && (
            <StockTab
              products={products}
              onNewProduct={() => setProductFormTarget(null)}
              onEditProduct={(p) => setProductFormTarget(p)}
              onQuickRestock={(p) => setRestockTarget(p)}
              onStartSale={(p) => {
                setReturnToPainelAfterSale(false);
                setSaleModalProduct(p);
              }}
              onDeleteProduct={(id) => deleteProduct(user.uid, id)}
            />
          )}

          {activeTab === 'fiados' && (
            <FiadosTab
              sales={sales}
              selectedDateISO={selectedDateISO}
              onConfirmPayment={(sale, method, paidDate) =>
                confirmFiadoPayment(user.uid, sale, method, paidDate)
              }
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsTab
              config={config}
              summary={summary}
              sales={sales}
              expenses={expenses}
              reports={reports}
              selectedDateISO={selectedDateISO}
              onUpdatePin={(pin) => updatePinCode(user.uid, pin)}
              onArchiveMonth={handleArchiveMonth}
              onClearAllData={() => clearAllMerchantData(user.uid)}
            />
          )}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation (4 tabs) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E1814]/95 backdrop-blur-md border-t border-[#1E3A2F] pb-safe"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  active ? 'text-[#D4AF37]' : 'text-[#8DA89B] hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-1.5 right-4 text-[10px] font-mono-num font-bold text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {saleModalProduct !== undefined && (
        <SaleModal
          products={products}
          initialProduct={saleModalProduct}
          defaultDateISO={selectedDateISO}
          onConfirmSale={async (product, input) => {
            await registerSale(user.uid, product, input);
            if (returnToPainelAfterSale) {
              setActiveTab('painel');
            }
          }}
          onClose={() => {
            setSaleModalProduct(undefined);
            setReturnToPainelAfterSale(false);
          }}
        />
      )}

      {productFormTarget !== undefined && (
        <ProductFormModal
          editingProduct={productFormTarget}
          defaultDateISO={selectedDateISO}
          onSaveNew={(input) => createProduct(user.uid, input)}
          onSaveEdit={(id, updates) => updateProductDetails(user.uid, id, updates)}
          onClose={() => setProductFormTarget(undefined)}
        />
      )}

      {restockTarget && (
        <QuickRestockModal
          product={restockTarget}
          defaultDateISO={selectedDateISO}
          onRestock={(p, input) => restockProduct(user.uid, p, input)}
          onClose={() => setRestockTarget(null)}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          defaultDateISO={selectedDateISO}
          onSaveExpense={(input) => registerExpense(user.uid, input)}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {showCapitalModal && (
        <AdjustCapitalModal
          currentCapital={config.liquidCapital}
          onSaveCapital={(val) => adjustLiquidCapital(user.uid, val)}
          onClose={() => setShowCapitalModal(false)}
        />
      )}

      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A110E]">
          <SubscriptionPaywall
            user={user}
            account={account}
            monthlyPriceKz={monthlyPriceKz}
            isLocked={false}
            onClose={() => setShowSubscriptionModal(false)}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {showCreatorPanel && isCreator && (
        <CreatorPanelModal
          creatorEmail={user.email || CREATOR_EMAIL}
          monthlyPriceKz={monthlyPriceKz}
          onClose={() => setShowCreatorPanel(false)}
        />
      )}
    </div>
  );
}
