import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Receipt,
  Download,
  Filter,
  Banknote,
  Smartphone,
  IndianRupee,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  FinancialTransaction,
  UserProfile,
} from '../../types';
import { formatCurrency } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface CollectionsViewProps {
  schemes: ChitScheme[];
  members: CompanyMember[];
  transactions: FinancialTransaction[];
  currentUser: UserProfile;
  onOpenRecordPayment: () => void;
  onViewReceipt: (tx: FinancialTransaction) => void;
  onRequestReversal: (tx: FinancialTransaction) => void;
  onEditPayment?: (tx: FinancialTransaction) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  schemes,
  members,
  transactions,
  currentUser: _currentUser,
  onOpenRecordPayment,
  onViewReceipt,
  onRequestReversal,
  onEditPayment,
}) => {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedChit, setSelectedChit] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'cash' | 'upi'>('all');

  const membersMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const schemesMap = useMemo(() => new Map(schemes.map((s) => [s.id, s])), [schemes]);

  const collections = useMemo(() => {
    return transactions.filter((t) => t.transaction_type === 'collection');
  }, [transactions]);

  const filteredCollections = useMemo(() => {
    return collections.filter((tx) => {
      if (selectedChit !== 'all' && tx.chit_id !== selectedChit) return false;
      if (selectedMethod !== 'all' && tx.payment_method !== selectedMethod) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
        const memberName = (member?.full_name || tx.payer_name || '').toLowerCase();
        const receipt = tx.receipt_no.toLowerCase();
        const ref = (tx.reference_id || '').toLowerCase();
        if (!memberName.includes(q) && !receipt.includes(q) && !ref.includes(q)) return false;
      }
      return true;
    });
  }, [collections, selectedChit, selectedMethod, search, membersMap]);

  const totalFilteredAmount = useMemo(() => {
    return filteredCollections
      .filter((t) => !t.is_reversed)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredCollections]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Subscription Collections Register
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Complete audit register of all member installment receipts and payment allocations
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt #, subscriber name, UPI reference..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          >
            <option value="all">All Schemes</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.scheme_code})
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value as any)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          >
            <option value="all">All Methods (Cash & UPI)</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
          </select>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between text-xs font-semibold">
          <span className="text-neutral-600">
            Showing {filteredCollections.length} receipts
          </span>
          <span className="text-[#111111]">
            Active Total: {formatCurrency(totalFilteredAmount)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Receipt No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Scheme</th>
                <th className="px-4 py-3">Inst #</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / Notes</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Receipt</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredCollections.map((tx) => {
                const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
                const scheme = schemesMap.get(tx.chit_id);
                const isCash = tx.payment_method === 'cash';

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-neutral-50/80 transition-colors ${tx.is_reversed ? 'bg-neutral-100/50 opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-neutral-900">
                      {tx.receipt_no}
                      {tx.is_reversed && (
                        <span className="ml-1 text-[9px] uppercase px-1.5 py-0.2 bg-neutral-200 rounded font-bold">
                          Reversed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{tx.transaction_date}</td>
                    <td className="px-4 py-3 font-semibold text-[#111111]">
                      {member?.full_name || tx.payer_name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {scheme?.scheme_code || 'Chit'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">Month {tx.installment_no || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        isCash ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-900 text-white'
                      }`}>
                        {isCash ? <Banknote className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        <span>{tx.payment_method}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-[11px] max-w-xs truncate">
                      {tx.reference_id || tx.collector_notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#111111]">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onViewReceipt(tx)}
                        className="p-1 rounded hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                        title={language === 'ta' ? 'ரசீது காண்க' : 'Print / View Official Receipt'}
                      >
                        <Receipt className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {onEditPayment && !tx.is_reversed && (
                          <button
                            onClick={() => onEditPayment(tx)}
                            className="p-1 rounded hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                            title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                          >
                            <Edit3 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        )}
                        {!tx.is_reversed && (
                          <button
                            onClick={() => onRequestReversal(tx)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title={language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர்' : 'Undo Payment'}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mx-auto" />
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
      </div>
    </div>
  );
};
