import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Plus,
  Filter,
  IndianRupee,
  Banknote,
  Smartphone,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  FinancialTransaction,
} from '../../types';
import { calculateChitCashbook, formatCurrency } from '../../utils/financial';

interface CashbookViewProps {
  schemes: ChitScheme[];
  members: CompanyMember[];
  transactions: FinancialTransaction[];
  onOpenAddEntry: () => void;
}

export const CashbookView: React.FC<CashbookViewProps> = ({
  schemes,
  members,
  transactions,
  onOpenAddEntry,
}) => {
  const [selectedChitFilter, setSelectedChitFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [search, setSearch] = useState('');

  const membersMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Filtered transactions for cashbook
  const relevantTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedChitFilter !== 'all' && t.chit_id !== selectedChitFilter) return false;
      if (methodFilter !== 'all' && t.payment_method !== methodFilter) return false;
      return true;
    });
  }, [transactions, selectedChitFilter, methodFilter]);

  const cashbookRecords = useMemo(() => {
    return calculateChitCashbook(relevantTransactions, membersMap);
  }, [relevantTransactions, membersMap]);

  // Filter by search text
  const searchedRecords = useMemo(() => {
    if (!search.trim()) return cashbookRecords;
    const q = search.toLowerCase();
    return cashbookRecords.filter((r) =>
      r.party_name.toLowerCase().includes(q) ||
      r.receipt_no.toLowerCase().includes(q) ||
      (r.reference_id && r.reference_id.toLowerCase().includes(q))
    );
  }, [cashbookRecords, search]);

  // Final balances
  const latestRecord = cashbookRecords[cashbookRecords.length - 1];
  const cashBalance = latestRecord?.cash_balance || 0;
  const upiBalance = latestRecord?.upi_balance || 0;
  const netBalance = latestRecord?.net_balance || 0;

  const handleExportCsv = () => {
    const headers = ['Date', 'Receipt/Ref', 'Party', 'Type', 'Method', 'Money In', 'Money Out', 'Cash Bal', 'UPI Bal', 'Net Bal'];
    const rows = searchedRecords.map((r) => [
      r.date,
      r.receipt_no,
      `"${r.party_name}"`,
      r.entry_type,
      r.payment_method,
      r.money_in,
      r.money_out,
      r.cash_balance,
      r.upi_balance,
      r.net_balance,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `company_cashbook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Company Financial Cashbook
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Reconciled dual-entry journal with isolated physical cash drawers and digital bank accounts
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddEntry}
            className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Movement</span>
          </button>
        </div>
      </div>

      {/* Account Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Physical Cash in Hand</span>
            <Banknote className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">
            {formatCurrency(cashBalance)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Verified office vault & counter drawer balance
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">UPI / Bank Balance</span>
            <Smartphone className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">
            {formatCurrency(upiBalance)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Verified electronic collections deposited in bank
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Liquidity</span>
            <IndianRupee className="w-4 h-4 text-[#111111]" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">
            {formatCurrency(netBalance)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Cash in hand + bank account balance
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, reference ID, subscriber..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scheme selector */}
          <select
            value={selectedChitFilter}
            onChange={(e) => setSelectedChitFilter(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          >
            <option value="all">Consolidated (All Schemes)</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.scheme_code})
              </option>
            ))}
          </select>

          {/* Method selector */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          >
            <option value="all">All Channels (Cash & UPI)</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
          </select>
        </div>
      </div>

      {/* Cashbook Ledger Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Receipt / Ref</th>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Money In</th>
                <th className="px-4 py-3 text-right">Money Out</th>
                <th className="px-4 py-3 text-right">Cash Balance</th>
                <th className="px-4 py-3 text-right">UPI Balance</th>
                <th className="px-4 py-3 text-right">Net Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {searchedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                    No cashbook movements found matching the criteria.
                  </td>
                </tr>
              ) : (
                searchedRecords.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${r.is_reversed ? 'opacity-50 line-through' : ''}`}
                  >
                    <td className="px-4 py-3 text-neutral-600">{r.date}</td>
                    <td className="px-4 py-3 font-mono font-medium text-neutral-800">{r.receipt_no}</td>
                    <td className="px-4 py-3 font-semibold text-[#111111]">{r.party_name}</td>
                    <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-3 uppercase text-[10px] font-bold text-neutral-700">{r.payment_method}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#111111]">
                      {r.money_in > 0 ? formatCurrency(r.money_in) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-600">
                      {r.money_out > 0 ? formatCurrency(r.money_out) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-700">
                      {formatCurrency(r.cash_balance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-700">
                      {formatCurrency(r.upi_balance)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#111111]">
                      {formatCurrency(r.net_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
