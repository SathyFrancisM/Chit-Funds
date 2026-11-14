import React, { useState, useMemo } from 'react';
import {
  Layers,
  Users,
  CreditCard,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  Receipt,
  BookOpen,
  Filter,
  CheckCircle2,
  Calendar,
  Smartphone,
  Search,
  Send,
  Banknote,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  FinancialTransaction,
  UserProfile,
} from '../../types';
import { formatCurrency, formatOrdinalDay } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';
import { openWhatsAppDirect } from '../../utils/whatsappTemplates';

interface DashboardViewProps {
  currentUser: UserProfile;
  schemes: ChitScheme[];
  members: CompanyMember[];
  transactions: FinancialTransaction[];
  onOpenCreateChit: () => void;
  onOpenAddMember: () => void;
  onOpenRecordPayment: () => void;
  onSelectChit: (chitId: string) => void;
  onNavigateTab: (tab: string) => void;
  onViewReceipt: (tx: FinancialTransaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  schemes,
  members,
  transactions,
  onOpenCreateChit,
  onOpenAddMember,
  onOpenRecordPayment,
  onSelectChit,
  onNavigateTab,
  onViewReceipt,
}) => {
  const [selectedChitFilter, setSelectedChitFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'today'>('all');

  const { language, t, getQuote, translateStatus, translatePaymentMethod } = useLanguage();

  // Daily deterministic motivational quote (English or Tamil)
  const dailyQuote = useMemo(() => getQuote(), [getQuote, language]);

  const handleShareQuoteWhatsApp = () => {
    const text = language === 'ta'
      ? `💡 *இன்றைய சேமிப்புப் பொன்மொழி:*\n\n"${dailyQuote.quote}"\n— *${dailyQuote.author}*\n\n━━━━━━━━━━━━━━━━━━━\n✨ *ChitFlow சீட்டு நிதி மேலாண்மை*`
      : `💡 *Daily Financial & Motivational Inspiration:*\n\n"${dailyQuote.quote}"\n— *${dailyQuote.author}*\n\n━━━━━━━━━━━━━━━━━━━\n✨ *ChitFlow Chit Management Suite*`;
    openWhatsAppDirect('', text);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.is_reversed) return false;
      if (selectedChitFilter !== 'all' && tx.chit_id !== selectedChitFilter) return false;
      
      const txDate = tx.transaction_date;
      const today = new Date().toISOString().split('T')[0];
      const currentYearMonth = today.slice(0, 7);

      if (dateFilter === 'today' && txDate !== today) return false;
      if (dateFilter === 'this_month' && !txDate.startsWith(currentYearMonth)) return false;

      return true;
    });
  }, [transactions, selectedChitFilter, dateFilter]);

  // Aggregate Metrics derived strictly from records
  const metrics = useMemo(() => {
    const activeSchemes = schemes.filter((s) => s.status === 'active');
    
    let totalGrossCollected = 0;
    let cashCollected = 0;
    let upiCollected = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment') {
        totalGrossCollected += tx.amount;
        if (tx.payment_method === 'cash') {
          cashCollected += tx.amount;
        } else {
          upiCollected += tx.amount;
        }
      }
    });

    const totalExpectedPool = schemes.reduce((acc, s) => {
      if (selectedChitFilter !== 'all' && s.id !== selectedChitFilter) return acc;
      return acc + (s.total_pot_amount || (s.monthly_installment_amount * s.duration_months * s.total_seats));
    }, 0);

    const outstandingAmount = Math.max(0, totalExpectedPool - totalGrossCollected);

    const today = new Date();
    const nearingMaturity = activeSchemes.filter((s) => {
      const maturity = new Date(s.planned_maturity_date);
      const diffDays = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 60 && diffDays >= 0;
    });

    return {
      activeChitsCount: activeSchemes.length,
      totalMembersCount: members.length,
      totalGrossCollected,
      cashCollected,
      upiCollected,
      outstandingAmount,
      nearingMaturityCount: nearingMaturity.length,
    };
  }, [schemes, members, filteredTransactions, selectedChitFilter]);

  const memberMap = useMemo(() => {
    return new Map(members.map((m) => [m.id, m]));
  }, [members]);

  const schemeMap = useMemo(() => {
    return new Map(schemes.map((s) => [s.id, s]));
  }, [schemes]);

  const recentTransactions = useMemo(() => {
    return [...transactions].slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcome & Daily Curated Quote Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#111111]" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                {language === 'ta' ? `வணக்கம், ${currentUser.full_name.split(' ')[0]}` : `Welcome back, ${currentUser.full_name.split(' ')[0]}`}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              {language === 'ta' ? 'நிறுவன நிர்வாகம்' : 'Company Administration'} • {new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenCreateChit}
              className="px-3.5 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('Create New Chit')}</span>
            </button>
            <button
              onClick={onOpenRecordPayment}
              disabled={schemes.length === 0}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
              <span>{t('Record Payment')}</span>
            </button>
            <button
              onClick={() => onNavigateTab('cashbook')}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-neutral-600" />
              <span>{t('Cashbook')}</span>
            </button>
          </div>
        </div>

        {/* Daily Motivational / Business Quote with WhatsApp Share */}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/70 shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-neutral-900 text-white mt-0.5 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs">
              <p className="text-neutral-900 font-semibold italic text-[12px] leading-relaxed">
                "{dailyQuote.quote}"
              </p>
              <p className="text-neutral-500 text-[11px] mt-0.5 font-medium">
                — {dailyQuote.author}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareQuoteWhatsApp}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer self-start sm:self-auto"
            title={language === 'ta' ? "இப்பொன்மொழியை WhatsApp-ல் பகிர்க" : "Share this quote to WhatsApp"}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('share_quote_wa', 'Share Quote to WhatsApp')}</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner if No Chits Created Yet */}
      {schemes.length === 0 && (
        <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 bg-neutral-100 text-[#111111] rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#111111]">
              No Chit Schemes Created Yet
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Start by creating your first chit scheme. You can import member contacts from your device address book, WhatsApp, CSV/Excel spreadsheets, or enter them manually.
            </p>
          </div>
          <button
            onClick={onOpenCreateChit}
            className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Chit Scheme</span>
          </button>
        </div>
      )}

      {/* 2. Global Filter Bar (when chits exist) */}
      {schemes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-neutral-200 rounded-xl">
          <div className="flex items-center space-x-2 text-xs font-medium text-neutral-600">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span>Dashboard Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedChitFilter}
              onChange={(e) => setSelectedChitFilter(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            >
              <option value="all">All Chit Schemes</option>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.scheme_code})
                </option>
              ))}
            </select>

            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dateFilter === 'all' ? 'bg-white text-[#111111] shadow-xs' : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('this_month')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dateFilter === 'this_month' ? 'bg-white text-[#111111] shadow-xs' : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dateFilter === 'today' ? 'bg-white text-[#111111] shadow-xs' : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Financial KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Active Chits */}
        <div
          onClick={() => onNavigateTab('chits')}
          className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-xl p-5 cursor-pointer transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Chits</span>
            <Layers className="w-4 h-4 text-[#111111] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#111111]">{metrics.activeChitsCount}</span>
            <span className="text-xs text-neutral-500">/ {schemes.length} total</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            {metrics.nearingMaturityCount > 0 ? `${metrics.nearingMaturityCount} schemes nearing maturity` : 'All schemes on schedule'}
          </p>
        </div>

        {/* Master Contact Ledger */}
        <div
          onClick={() => onNavigateTab('ledger')}
          className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-xl p-5 cursor-pointer transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Contact Ledger</span>
            <Users className="w-4 h-4 text-[#111111] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#111111]">{metrics.totalMembersCount}</span>
            <span className="text-xs text-neutral-500">contacts in chits</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2 flex items-center justify-between">
            <span>Unified multi-chit payments</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#111111]" />
          </p>
        </div>

        {/* Total Collections Received */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collections</span>
            <IndianRupee className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">
            {formatCurrency(metrics.totalGrossCollected)}
          </div>
          <div className="flex items-center space-x-3 mt-2 text-[11px] text-neutral-600">
            <span className="flex items-center space-x-1">
              <Banknote className="w-3 h-3 text-neutral-500" />
              <span>Cash: {formatCurrency(metrics.cashCollected)}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Smartphone className="w-3 h-3 text-neutral-500" />
              <span>UPI: {formatCurrency(metrics.upiCollected)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Chit Schemes Quick Overview */}
      {schemes.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#111111]">Active Schemes Overview</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Click any scheme to open its dedicated workspace</p>
            </div>
            <button
              onClick={() => onNavigateTab('chits')}
              className="text-xs font-semibold text-neutral-700 hover:text-[#111111] flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {schemes.slice(0, 3).map((scheme) => (
              <div
                key={scheme.id}
                onClick={() => onSelectChit(scheme.id)}
                className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50/50 hover:bg-white cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-200 text-neutral-800">
                    {scheme.scheme_code}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                    scheme.status === 'active' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {scheme.status}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#111111] mt-2 truncate">
                  {scheme.name}
                </h3>
                <div className="mt-3 pt-3 border-t border-neutral-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Monthly / Seat</span>
                    <span className="font-semibold text-[#111111]">{formatCurrency(scheme.monthly_installment_amount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Total Pot</span>
                    <span className="font-semibold text-[#111111]">{formatCurrency(scheme.total_pot_amount)}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>Due {formatOrdinalDay(scheme.due_day)} of month</span>
                  <span>{scheme.duration_months} Months</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recent Financial Transactions Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Recent Financial Transactions</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Real-time ledger audit trail with Cash/UPI verification</p>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={() => onNavigateTab('collections')}
              className="text-xs font-semibold text-neutral-700 hover:text-[#111111] flex items-center space-x-1"
            >
              <span>View All Collections</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 text-xs">
            No payments recorded yet. Financial transactions appear here only when explicitly collected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Chit Scheme</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {recentTransactions.map((tx) => {
                  const chit = schemeMap.get(tx.chit_id);
                  const member = tx.member_id ? memberMap.get(tx.member_id) : undefined;
                  const isCash = tx.payment_method === 'cash';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${tx.is_reversed ? 'bg-neutral-100/50 opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-neutral-900">
                        {tx.receipt_no}
                        {tx.is_reversed && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-neutral-200 text-neutral-800 font-bold uppercase">
                            Reversed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {tx.transaction_date}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111111]">
                        {member?.full_name || tx.payer_name || 'Subscriber'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {chit?.scheme_code || 'Chit'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isCash ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-900 text-white'
                        }`}>
                          {isCash ? <Banknote className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          <span>{tx.payment_method}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#111111]">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onViewReceipt(tx)}
                          className="px-2 py-1 rounded hover:bg-neutral-200 text-neutral-700 hover:text-[#111111] transition-colors"
                          title="View / Print Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
