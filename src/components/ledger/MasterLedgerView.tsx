import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Printer,
  Smartphone,
  Banknote,
  Building2,
  Layers,
  Phone,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Receipt,
  CheckCircle2,
  AlertCircle,
  User,
  ArrowUpDown,
  FileSpreadsheet,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ChitScheme,
  CompanyMember,
  ChitMembership,
  FinancialTransaction,
  UserProfile,
  CompanyProfile,
  PaymentMethod,
} from '../../types';
import { formatCurrency } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface MasterLedgerViewProps {
  schemes: ChitScheme[];
  members: CompanyMember[];
  memberships: ChitMembership[];
  transactions: FinancialTransaction[];
  currentUser: UserProfile;
  company: CompanyProfile;
  onOpenRecordPayment: (chitId?: string, memberId?: string) => void;
  onViewReceipt: (tx: FinancialTransaction) => void;
  onRequestReversal: (tx: FinancialTransaction) => void;
  onEditPayment?: (tx: FinancialTransaction) => void;
}

export const MasterLedgerView: React.FC<MasterLedgerViewProps> = ({
  schemes,
  members,
  memberships,
  transactions,
  currentUser: _currentUser,
  company,
  onOpenRecordPayment,
  onViewReceipt,
  onRequestReversal,
  onEditPayment,
}) => {
  const { language, t } = useLanguage();
  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedChitFilter, setSelectedChitFilter] = useState<string>('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'all' | 'cash' | 'upi' | 'bank_transfer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_chits' | 'with_balance'>('all');
  const [viewMode, setViewMode] = useState<'contacts' | 'transactions'>('contacts');
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set());
  const [memberTabMap, setMemberTabMap] = useState<Record<string, 'by_chit' | 'all_txs'>>({});

  // Maps for rapid lookup
  const schemesMap = useMemo(() => new Map(schemes.map((s) => [s.id, s])), [schemes]);
  const membersMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Valid collections
  const validCollections = useMemo(() => {
    return transactions.filter(
      (t) => (t.transaction_type === 'collection' || t.transaction_type === 'adjustment')
    );
  }, [transactions]);

  // Aggregate Contact Ledgers
  const contactLedgers = useMemo(() => {
    return members.map((member) => {
      // Find all memberships for this member
      const memberMemberships = memberships.filter((m) => m.member_id === member.id);
      
      // Breakdown by chit
      const chitBreakdowns = memberMemberships.map((membership) => {
        const chit = schemesMap.get(membership.chit_id);
        const chitTxs = validCollections
          .filter((t) => t.chit_id === membership.chit_id && t.member_id === member.id)
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

        const totalPaid = chitTxs
          .filter((t) => !t.is_reversed)
          .reduce((sum, t) => sum + t.amount, 0);

        const cashPaid = chitTxs
          .filter((t) => !t.is_reversed && t.payment_method === 'cash')
          .reduce((sum, t) => sum + t.amount, 0);

        const upiPaid = chitTxs
          .filter((t) => !t.is_reversed && (t.payment_method === 'upi' || t.payment_method === 'bank_transfer'))
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyInstallment = membership.expected_monthly_contribution || chit?.monthly_installment_amount || 0;
        const totalDuration = chit?.duration_months || 0;
        const expectedTotal = monthlyInstallment * totalDuration;
        const outstanding = Math.max(0, expectedTotal - totalPaid);

        return {
          membership,
          chit,
          transactions: chitTxs,
          totalPaid,
          cashPaid,
          upiPaid,
          monthlyInstallment,
          expectedTotal,
          outstanding,
          totalDuration,
          installmentsPaidCount: monthlyInstallment > 0 ? Math.floor(totalPaid / monthlyInstallment) : 0,
        };
      });

      // All transactions for this member across all their chits
      const allMemberTxs = validCollections
        .filter((t) => t.member_id === member.id)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

      const totalPaidOverall = allMemberTxs
        .filter((t) => !t.is_reversed)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCashOverall = allMemberTxs
        .filter((t) => !t.is_reversed && t.payment_method === 'cash')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalUpiOverall = allMemberTxs
        .filter((t) => !t.is_reversed && (t.payment_method === 'upi' || t.payment_method === 'bank_transfer'))
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpectedOverall = chitBreakdowns.reduce((sum, c) => sum + c.expectedTotal, 0);
      const totalOutstandingOverall = Math.max(0, totalExpectedOverall - totalPaidOverall);

      return {
        member,
        memberships: memberMemberships,
        chitBreakdowns,
        allTransactions: allMemberTxs,
        totalPaidOverall,
        totalCashOverall,
        totalUpiOverall,
        totalExpectedOverall,
        totalOutstandingOverall,
        chitsCount: memberMemberships.length,
      };
    });
  }, [members, memberships, schemesMap, validCollections]);

  // Overall Global Statistics
  const overallStats = useMemo(() => {
    let totalCollected = 0;
    let totalCash = 0;
    let totalUpi = 0;
    let totalOutstanding = 0;
    let totalSeatsEnrolled = 0;

    contactLedgers.forEach((cl) => {
      totalCollected += cl.totalPaidOverall;
      totalCash += cl.totalCashOverall;
      totalUpi += cl.totalUpiOverall;
      totalOutstanding += cl.totalOutstandingOverall;
      totalSeatsEnrolled += cl.chitsCount;
    });

    const activeContactsCount = contactLedgers.filter((cl) => cl.chitsCount > 0).length;

    return {
      activeContactsCount,
      totalSeatsEnrolled,
      totalCollected,
      totalCash,
      totalUpi,
      totalOutstanding,
    };
  }, [contactLedgers]);

  // Filtered Contacts for Contact Ledger View
  const filteredContacts = useMemo(() => {
    return contactLedgers.filter((cl) => {
      // Status filter
      if (statusFilter === 'with_chits' && cl.chitsCount === 0) return false;
      if (statusFilter === 'with_balance' && cl.totalOutstandingOverall <= 0) return false;

      // Chit Scheme Filter
      if (selectedChitFilter !== 'all') {
        const belongsToChit = cl.chitBreakdowns.some((cb) => cb.chit?.id === selectedChitFilter);
        if (!belongsToChit) return false;
      }

      // Method filter
      if (selectedMethodFilter !== 'all') {
        const hasMethodTx = cl.allTransactions.some(
          (t) => !t.is_reversed && t.payment_method === selectedMethodFilter
        );
        if (!hasMethodTx) return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = cl.member.full_name.toLowerCase().includes(q);
        const phoneMatch = cl.member.phone.includes(q) || (cl.member.phone_normalized && cl.member.phone_normalized.includes(q));
        const chitMatch = cl.chitBreakdowns.some(
          (cb) => cb.chit?.name.toLowerCase().includes(q) || cb.chit?.scheme_code.toLowerCase().includes(q)
        );
        const receiptMatch = cl.allTransactions.some(
          (t) => t.receipt_no.toLowerCase().includes(q) || (t.reference_id && t.reference_id.toLowerCase().includes(q))
        );
        if (!nameMatch && !phoneMatch && !chitMatch && !receiptMatch) return false;
      }

      return true;
    });
  }, [contactLedgers, statusFilter, selectedChitFilter, selectedMethodFilter, search]);

  // Master Flat Transactions List for Table Register View
  const filteredFlatTransactions = useMemo(() => {
    return validCollections
      .filter((tx) => {
        if (selectedChitFilter !== 'all' && tx.chit_id !== selectedChitFilter) return false;
        if (selectedMethodFilter !== 'all' && tx.payment_method !== selectedMethodFilter) return false;
        
        if (search.trim()) {
          const q = search.toLowerCase();
          const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
          const chit = schemesMap.get(tx.chit_id);
          const memberName = (member?.full_name || tx.payer_name || '').toLowerCase();
          const phone = member?.phone || '';
          const receipt = tx.receipt_no.toLowerCase();
          const ref = (tx.reference_id || '').toLowerCase();
          const notes = (tx.collector_notes || '').toLowerCase();
          const chitCode = (chit?.scheme_code || '').toLowerCase();
          const chitName = (chit?.name || '').toLowerCase();

          if (
            !memberName.includes(q) &&
            !phone.includes(q) &&
            !receipt.includes(q) &&
            !ref.includes(q) &&
            !notes.includes(q) &&
            !chitCode.includes(q) &&
            !chitName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [validCollections, selectedChitFilter, selectedMethodFilter, search, membersMap, schemesMap]);

  // Toggle single member expand
  const toggleExpandMember = (memberId: string) => {
    setExpandedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const toggleAllContacts = () => {
    if (expandedMemberIds.size === filteredContacts.length) {
      setExpandedMemberIds(new Set());
    } else {
      setExpandedMemberIds(new Set(filteredContacts.map((c) => c.member.id)));
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const rows = filteredFlatTransactions.map((tx) => {
      const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
      const chit = schemesMap.get(tx.chit_id);

      return {
        'Receipt No': tx.receipt_no,
        'Date': tx.transaction_date,
        'Subscriber Name': member?.full_name || tx.payer_name || 'Anonymous',
        'Mobile Number': member?.phone || 'N/A',
        'Chit Scheme': chit ? `${chit.name} (${chit.scheme_code})` : 'N/A',
        'Installment No': tx.installment_no ? `Inst #${tx.installment_no}` : 'General',
        'Payment Mode': tx.payment_method.toUpperCase(),
        'Bank Account': tx.bank_account || 'N/A',
        'Amount (INR)': tx.amount,
        'Reference ID / UTR': tx.reference_id || 'N/A',
        'Payment Description': tx.collector_notes || 'Monthly installment contribution',
        'Recorded By': tx.recorded_by || 'Staff',
        'Status': tx.is_reversed ? 'REVERSED' : 'VERIFIED',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Ledger');
    XLSX.writeFile(workbook, `chitflow_master_ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Helper renderer for transaction method badge
  const renderMethodBadge = (method: PaymentMethod, refId?: string, bankAccount?: string) => {
    if (method === 'cash') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Banknote className="w-3 h-3 text-emerald-600" />
          <span>Cash</span>
        </span>
      );
    }
    if (method === 'upi') {
      return (
        <div className="inline-flex flex-col">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200" title={refId ? `UPI Ref: ${refId}` : undefined}>
            <Smartphone className="w-3 h-3 text-purple-600" />
            <span>UPI {refId ? `(${refId.slice(-6)})` : ''}</span>
          </span>
          {bankAccount && (
            <span className="text-[10px] text-neutral-600 font-mono font-medium mt-0.5">
              {bankAccount}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200" title={refId ? `UTR: ${refId}` : undefined}>
        <Building2 className="w-3 h-3 text-blue-600" />
        <span>Bank Transfer</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Actions */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Master Contact Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Unified contact-centric ledger • Multi-chit payment breakdown • Verified transaction modes & receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>Print Ledger</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => onOpenRecordPayment()}
            className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Global Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Active Contacts */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Subscribers</span>
            <User className="w-3.5 h-3.5 text-[#111111]" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold text-[#111111]">
              {overallStats.activeContactsCount}
            </span>
            <span className="text-[11px] text-neutral-500">enrolled</span>
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            {overallStats.totalSeatsEnrolled} seats across chits
          </p>
        </div>

        {/* Total Paid Overall */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Received</span>
            <BookOpen className="w-3.5 h-3.5 text-[#111111]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#111111]">
            {formatCurrency(overallStats.totalCollected)}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Across all subscriber receipts
          </p>
        </div>

        {/* Cash Collections */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cash Mode</span>
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-900">
            {formatCurrency(overallStats.totalCash)}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Physical cash on hand
          </p>
        </div>

        {/* UPI & Digital Collections */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">UPI / Bank Mode</span>
            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-purple-900">
            {formatCurrency(overallStats.totalUpi)}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Direct bank settlements
          </p>
        </div>

        {/* Balance Outstanding */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Due Balance</span>
            <AlertCircle className="w-3.5 h-3.5 text-neutral-700" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-neutral-900">
            {formatCurrency(overallStats.totalOutstanding)}
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">
            Remaining scheduled installments
          </p>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Controls */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3.5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contact name, phone, chit code, receipt no..."
              className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-4 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs self-start md:self-auto">
            <button
              onClick={() => setViewMode('contacts')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 ${
                viewMode === 'contacts'
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Contact-Wise Ledger</span>
            </button>
            <button
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 ${
                viewMode === 'transactions'
                  ? 'bg-white text-[#111111] shadow-xs'
                  : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>All Transactions Register</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-neutral-500 font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>

            {/* Scheme Filter */}
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

            {/* Payment Method Filter */}
            <select
              value={selectedMethodFilter}
              onChange={(e) => setSelectedMethodFilter(e.target.value as any)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            >
              <option value="all">All Transaction Modes</option>
              <option value="cash">💵 Cash Payments Only</option>
              <option value="upi">📱 UPI Payments Only</option>
              <option value="bank_transfer">🏦 Bank Transfers Only</option>
            </select>

            {/* Contact Status Filter */}
            {viewMode === 'contacts' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="all">All Contacts</option>
                <option value="with_chits">Enrolled in Active Chits</option>
                <option value="with_balance">Pending Due Balance</option>
              </select>
            )}
          </div>

          {/* Quick Expand Toggle (Contact view only) */}
          {viewMode === 'contacts' && filteredContacts.length > 0 && (
            <button
              onClick={toggleAllContacts}
              className="text-[11px] font-semibold text-neutral-600 hover:text-[#111111] flex items-center space-x-1"
            >
              <span>{expandedMemberIds.size === filteredContacts.length ? 'Collapse All' : 'Expand All'}</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. VIEW MODE A: Contact-Centric Ledger List */}
      {viewMode === 'contacts' && (
        <div className="space-y-4">
          {filteredContacts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <User className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#111111]">No Contact Ledgers Found</h3>
              <p className="text-xs text-neutral-500 mt-1">
                No subscriber matches your current search or filter criteria.
              </p>
            </div>
          ) : (
            filteredContacts.map((contactItem) => {
              const { member, chitBreakdowns, allTransactions: contactTxs } = contactItem;
              const isExpanded = expandedMemberIds.has(member.id);
              const activeSubTab = memberTabMap[member.id] || 'by_chit';

              return (
                <div
                  key={member.id}
                  className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
                >
                  {/* Contact Summary Header Bar */}
                  <div
                    onClick={() => toggleExpandMember(member.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Left: Contact Info & Chit Badges */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-[#111111] truncate">
                            {member.full_name}
                          </h2>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-100 text-neutral-700 border border-neutral-200">
                            <Phone className="w-2.5 h-2.5 text-neutral-500" />
                            <span>{member.phone}</span>
                          </span>
                          {member.kyc_status === 'verified' && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>KYC</span>
                            </span>
                          )}
                        </div>

                        {/* List of enrolled chits */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {chitBreakdowns.length === 0 ? (
                            <span className="text-[11px] text-neutral-400 italic">
                              No chit schemes enrolled yet
                            </span>
                          ) : (
                            chitBreakdowns.map((cb) => (
                              <span
                                key={cb.membership.id}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80 flex items-center space-x-1"
                              >
                                <Layers className="w-2.5 h-2.5 text-neutral-500" />
                                <span>{cb.chit?.scheme_code || 'Chit'} • Seat #{cb.membership.seat_number}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Aggregated Totals & Toggle */}
                    <div className="flex items-center justify-between md:justify-end space-x-4 sm:space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
                          Total Paid
                        </span>
                        <span className="text-sm sm:text-base font-bold text-emerald-700">
                          {formatCurrency(contactItem.totalPaidOverall)}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-neutral-500 mt-0.5">
                          <span>Cash: {formatCurrency(contactItem.totalCashOverall)}</span>
                          <span>•</span>
                          <span>UPI: {formatCurrency(contactItem.totalUpiOverall)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
                          Due Balance
                        </span>
                        <span className="text-sm sm:text-base font-bold text-neutral-900">
                          {formatCurrency(contactItem.totalOutstandingOverall)}
                        </span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          {contactItem.chitsCount} {contactItem.chitsCount === 1 ? 'Chit Scheme' : 'Chit Schemes'}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:text-neutral-900">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Breakdown */}
                  {isExpanded && (
                    <div className="border-t border-neutral-200 bg-neutral-50/40 p-4 sm:p-6 space-y-5">
                      {/* Sub-Tabs: By Chit vs All Combined Transactions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setMemberTabMap((prev) => ({ ...prev, [member.id]: 'by_chit' }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              activeSubTab === 'by_chit'
                                ? 'bg-[#111111] text-white'
                                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            Scheme Breakdown ({chitBreakdowns.length})
                          </button>
                          <button
                            onClick={() =>
                              setMemberTabMap((prev) => ({ ...prev, [member.id]: 'all_txs' }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              activeSubTab === 'all_txs'
                                ? 'bg-[#111111] text-white'
                                : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            Combined Payment History ({contactTxs.length})
                          </button>
                        </div>

                        {/* Quick Action for this Contact */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onOpenRecordPayment(undefined, member.id)}
                            className="px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Collect from {member.full_name.split(' ')[0]}</span>
                          </button>
                        </div>
                      </div>

                      {/* Sub-Tab 1: By Chit Scheme */}
                      {activeSubTab === 'by_chit' && (
                        <div className="space-y-4">
                          {chitBreakdowns.length === 0 ? (
                            <div className="bg-white p-6 rounded-lg border border-neutral-200 text-center text-xs text-neutral-500">
                              This contact is not currently enrolled in any chit schemes.
                            </div>
                          ) : (
                            chitBreakdowns.map((cb) => {
                              const chit = cb.chit;
                              if (!chit) return null;

                              return (
                                <div
                                  key={cb.membership.id}
                                  className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
                                >
                                  {/* Chit Scheme Card Header */}
                                  <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-900 text-white">
                                          {chit.scheme_code}
                                        </span>
                                        <h3 className="font-bold text-sm text-[#111111]">
                                          {chit.name}
                                        </h3>
                                        <span className="text-xs text-neutral-500 font-medium">
                                          • Seat #{cb.membership.seat_number}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-neutral-500 mt-0.5">
                                        Monthly: {formatCurrency(cb.monthlyInstallment)} • Duration: {chit.duration_months} Months • Started: {chit.start_date}
                                      </p>
                                    </div>

                                    {/* Chit Specific Ledger Totals */}
                                    <div className="flex items-center space-x-4 text-right">
                                      <div>
                                        <span className="text-[10px] text-neutral-500 block uppercase font-medium">
                                          Paid
                                        </span>
                                        <span className="text-xs font-bold text-emerald-700">
                                          {formatCurrency(cb.totalPaid)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-neutral-500 block uppercase font-medium">
                                          Expected
                                        </span>
                                        <span className="text-xs font-semibold text-neutral-700">
                                          {formatCurrency(cb.expectedTotal)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-neutral-500 block uppercase font-medium">
                                          Balance
                                        </span>
                                        <span className="text-xs font-bold text-neutral-900">
                                          {formatCurrency(cb.outstanding)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => onOpenRecordPayment(chit.id, member.id)}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-md flex items-center space-x-1"
                                      >
                                        <CreditCard className="w-3 h-3" />
                                        <span>Pay</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Table of all payments for this specific chit */}
                                  {cb.transactions.length === 0 ? (
                                    <div className="p-6 text-center text-neutral-400 text-xs">
                                      No payments recorded for this chit scheme yet.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[10px]">
                                          <tr>
                                            <th className="px-3.5 py-2.5">Receipt #</th>
                                            <th className="px-3.5 py-2.5">Date</th>
                                            <th className="px-3.5 py-2.5">Installment</th>
                                            <th className="px-3.5 py-2.5">Transaction Mode</th>
                                            <th className="px-3.5 py-2.5">Reference / Notes</th>
                                            <th className="px-3.5 py-2.5 text-right">Amount</th>
                                            <th className="px-3.5 py-2.5 text-center">Receipt</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 text-neutral-800">
                                          {cb.transactions.map((tx) => (
                                            <tr
                                              key={tx.id}
                                              className={`hover:bg-neutral-50/80 transition-colors ${
                                                tx.is_reversed ? 'bg-neutral-100/60 opacity-60' : ''
                                              }`}
                                            >
                                              <td className="px-3.5 py-2.5 font-mono font-medium text-neutral-900">
                                                {tx.receipt_no}
                                                {tx.is_reversed && (
                                                  <span className="ml-1 text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-200 text-neutral-700">
                                                    Rev
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3.5 py-2.5 text-neutral-600">
                                                {tx.transaction_date}
                                              </td>
                                              <td className="px-3.5 py-2.5">
                                                <span className="font-semibold text-neutral-900">
                                                  {tx.installment_no ? `Inst #${tx.installment_no}` : 'General'}
                                                </span>
                                              </td>
                                              <td className="px-3.5 py-2.5">
                                                {renderMethodBadge(tx.payment_method, tx.reference_id, tx.bank_account)}
                                              </td>
                                              <td className="px-3.5 py-2.5 text-neutral-600 max-w-xs truncate">
                                                {tx.collector_notes || tx.reference_id ? (
                                                  <span>
                                                    {tx.reference_id && <span className="font-mono text-neutral-500 mr-1">[{tx.reference_id}]</span>}
                                                    {tx.collector_notes}
                                                  </span>
                                                ) : (
                                                  <span className="text-neutral-400 italic">No notes</span>
                                                )}
                                              </td>
                                              <td className="px-3.5 py-2.5 text-right font-bold text-neutral-900">
                                                {formatCurrency(tx.amount)}
                                              </td>
                                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-1">
                                                  <button
                                                    onClick={() => onViewReceipt(tx)}
                                                    className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded transition-colors cursor-pointer"
                                                    title={language === 'ta' ? 'ரசீது காண்க' : 'View Official Receipt'}
                                                  >
                                                    <Receipt className="w-3.5 h-3.5" />
                                                  </button>
                                                  {onEditPayment && !tx.is_reversed && (
                                                    <button
                                                      onClick={() => onEditPayment(tx)}
                                                      className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded transition-colors cursor-pointer"
                                                      title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                                                    >
                                                      <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                  {!tx.is_reversed && (
                                                    <button
                                                      onClick={() => onRequestReversal(tx)}
                                                      className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors cursor-pointer"
                                                      title={language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர்' : 'Undo Payment'}
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Sub-Tab 2: Combined Chronological Payment History */}
                      {activeSubTab === 'all_txs' && (
                        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                          {contactTxs.length === 0 ? (
                            <div className="p-8 text-center text-neutral-400 text-xs">
                              No payment transactions recorded for this subscriber across any scheme.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="px-3.5 py-2.5">Receipt #</th>
                                    <th className="px-3.5 py-2.5">Date</th>
                                    <th className="px-3.5 py-2.5">Which Chit Scheme</th>
                                    <th className="px-3.5 py-2.5">Installment</th>
                                    <th className="px-3.5 py-2.5">Transaction Mode</th>
                                    <th className="px-3.5 py-2.5">Description & Ref ID</th>
                                    <th className="px-3.5 py-2.5 text-right">Amount</th>
                                    <th className="px-3.5 py-2.5 text-center">Receipt</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                                  {contactTxs.map((tx) => {
                                    const chit = schemesMap.get(tx.chit_id);
                                    return (
                                      <tr
                                        key={tx.id}
                                        className={`hover:bg-neutral-50/80 transition-colors ${
                                          tx.is_reversed ? 'bg-neutral-100/60 opacity-60' : ''
                                        }`}
                                      >
                                        <td className="px-3.5 py-2.5 font-mono font-medium text-neutral-900">
                                          {tx.receipt_no}
                                          {tx.is_reversed && (
                                            <span className="ml-1 text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-200 text-neutral-700">
                                              Rev
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-neutral-600">
                                          {tx.transaction_date}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                          {chit ? (
                                            <div className="flex items-center space-x-1.5">
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-800">
                                                {chit.scheme_code}
                                              </span>
                                              <span className="font-medium text-neutral-900 truncate max-w-[140px]">
                                                {chit.name}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-neutral-400">Scheme N/A</span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-semibold text-neutral-900">
                                          {tx.installment_no ? `Inst #${tx.installment_no}` : 'General'}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                          {renderMethodBadge(tx.payment_method, tx.reference_id, tx.bank_account)}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-neutral-600 max-w-xs truncate">
                                          {tx.collector_notes || tx.reference_id ? (
                                            <span>
                                              {tx.reference_id && <span className="font-mono text-neutral-500 mr-1">[{tx.reference_id}]</span>}
                                              {tx.collector_notes}
                                            </span>
                                          ) : (
                                            <span className="text-neutral-400 italic">No notes</span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right font-bold text-neutral-900">
                                          {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-1">
                                                  <button
                                                    onClick={() => onViewReceipt(tx)}
                                                    className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded transition-colors cursor-pointer"
                                                    title={language === 'ta' ? 'ரசீது காண்க' : 'View Official Receipt'}
                                                  >
                                                    <Receipt className="w-3.5 h-3.5" />
                                                  </button>
                                                  {onEditPayment && !tx.is_reversed && (
                                                    <button
                                                      onClick={() => onEditPayment(tx)}
                                                      className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded transition-colors cursor-pointer"
                                                      title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                                                    >
                                                      <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                  {!tx.is_reversed && (
                                                    <button
                                                      onClick={() => onRequestReversal(tx)}
                                                      className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors cursor-pointer"
                                                      title={language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர்' : 'Undo Payment'}
                                                    >
                                                      <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. VIEW MODE B: All-Transactions Master Table Register */}
      {viewMode === 'transactions' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                Master Financial Payment Register
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Showing {filteredFlatTransactions.length} receipts • Complete transaction modes and chit descriptions
              </p>
            </div>
            <div className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-lg">
              Filtered Total: <span className="font-bold text-[#111111]">{formatCurrency(
                filteredFlatTransactions
                  .filter((t) => !t.is_reversed)
                  .reduce((sum, t) => sum + t.amount, 0)
              )}</span>
            </div>
          </div>

          {filteredFlatTransactions.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 text-xs">
              No transactions match your current search or filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Subscriber & Contact</th>
                    <th className="px-4 py-3">Which Chit Scheme</th>
                    <th className="px-4 py-3">Installment</th>
                    <th className="px-4 py-3">Transaction Mode</th>
                    <th className="px-4 py-3">Payment Description & Ref ID</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {filteredFlatTransactions.map((tx) => {
                    const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
                    const chit = schemesMap.get(tx.chit_id);

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-neutral-50/80 transition-colors ${
                          tx.is_reversed ? 'bg-neutral-100/60 opacity-60' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-neutral-900">
                          {tx.receipt_no}
                          {tx.is_reversed && (
                            <span className="block text-[9px] uppercase font-bold text-neutral-500">
                              REVERSED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                          {tx.transaction_date}
                        </td>
                        <td className="px-4 py-3">
                          {member ? (
                            <div>
                              <span className="font-bold text-neutral-900 block truncate max-w-[160px]">
                                {member.full_name}
                              </span>
                              <span className="text-[11px] font-mono text-neutral-500 flex items-center space-x-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{member.phone}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-700 font-medium">{tx.payer_name || 'N/A'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {chit ? (
                            <div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-200 text-neutral-800 mr-1.5">
                                {chit.scheme_code}
                              </span>
                              <span className="font-medium text-neutral-900">
                                {chit.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400">Scheme N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">
                          {tx.installment_no ? `Inst #${tx.installment_no}` : 'General'}
                        </td>
                        <td className="px-4 py-3">
                          {renderMethodBadge(tx.payment_method, tx.reference_id, tx.bank_account)}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 max-w-sm">
                          {tx.reference_id && (
                            <span className="font-mono text-[11px] text-neutral-500 block truncate">
                              Ref: {tx.reference_id}
                            </span>
                          )}
                          <span className="truncate block">
                            {tx.collector_notes || 'Installment contribution'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-neutral-900 whitespace-nowrap">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => onViewReceipt(tx)}
                              className="p-1.5 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded-lg transition-colors"
                              title={language === 'ta' ? 'ரசீது காண்க' : 'View / Print Receipt'}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            {onEditPayment && !tx.is_reversed && (
                              <button
                                onClick={() => onEditPayment(tx)}
                                className="p-1.5 hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] rounded-lg transition-colors"
                                title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {!tx.is_reversed && (
                              <button
                                onClick={() => onRequestReversal(tx)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                title={language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர்' : 'Undo Payment'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
