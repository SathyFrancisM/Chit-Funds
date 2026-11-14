import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  CreditCard,
  Printer,
  Calendar,
  Banknote,
  Smartphone,
  AlertCircle,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  TrendingDown,
  TrendingUp,
  Edit3,
} from 'lucide-react';
import {
  ChitScheme,
  ChitMembership,
  CompanyMember,
  FinancialTransaction,
  UserProfile,
} from '../../types';
import {
  calculateMemberLedger,
  calculateMemberMonthlyDueSchedule,
  formatCurrency,
} from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface MemberLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  chit: ChitScheme;
  membership: ChitMembership;
  member: CompanyMember;
  allTransactions: FinancialTransaction[];
  currentUser: UserProfile;
  onOpenRecordPayment: (chitId: string, memberId: string) => void;
  onViewReceipt: (tx: FinancialTransaction) => void;
  onRequestReversal: (tx: FinancialTransaction) => void;
  onEditPayment?: (tx: FinancialTransaction) => void;
}

export const MemberLedgerModal: React.FC<MemberLedgerModalProps> = ({
  isOpen,
  onClose,
  chit,
  membership,
  member,
  allTransactions,
  currentUser: _currentUser,
  onOpenRecordPayment,
  onViewReceipt,
  onRequestReversal,
  onEditPayment,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'monthly_schedule' | 'transactions'>('monthly_schedule');

  if (!isOpen) return null;

  // Running Ledger Summary & Itemized Txns
  const { summary, runningLedger } = useMemo(() => {
    return calculateMemberLedger(chit, membership, member, allTransactions);
  }, [chit, membership, member, allTransactions]);

  // Running Month-by-Month Carry-Forward Due Schedule
  const monthlyScheduleData = useMemo(() => {
    return calculateMemberMonthlyDueSchedule(chit, membership, allTransactions);
  }, [chit, membership, allTransactions]);

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#111111] text-white rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#111111]">
                  Subscriber Ledger — {member.full_name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                  Seat #{membership.seat_number}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Scheme: {chit.name} ({chit.scheme_code}) • Mobile: {member.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 no-print">
            <button
              onClick={handlePrintLedger}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg text-[#111111] flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-700" />
              <span>Print</span>
            </button>
            <button
              onClick={() => onOpenRecordPayment(chit.id, member.id)}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ledger Summary Cards */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                Total Scheduled
              </span>
              <span className="text-lg font-bold text-[#111111] mt-1 block">
                {formatCurrency(summary.expected_total_contribution)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {chit.duration_months} mo × {formatCurrency(membership.expected_monthly_contribution || chit.monthly_installment_amount)}
              </span>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                Total Paid
              </span>
              <span className="text-lg font-bold text-emerald-700 mt-1 block">
                {formatCurrency(summary.total_paid)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {summary.installments_paid_count} full installments cleared
              </span>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className="text-lg font-bold text-neutral-900 mt-1 block">
                {formatCurrency(monthlyScheduleData.netOutstandingBalance)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {monthlyScheduleData.currentAdvanceCredit > 0
                  ? `Available Advance Credit: ${formatCurrency(monthlyScheduleData.currentAdvanceCredit)}`
                  : 'Total unpaid running balance'}
              </span>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                Advance Credit
              </span>
              <span className="text-lg font-bold text-emerald-800 mt-1 block">
                {formatCurrency(monthlyScheduleData.currentAdvanceCredit)}
              </span>
              <span className="text-[10px] text-neutral-500">
                Excess amount credited for future months
              </span>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center space-x-2 border-b border-neutral-200 pb-2">
            <button
              onClick={() => setActiveTab('monthly_schedule')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'monthly_schedule'
                  ? 'bg-[#111111] text-white shadow-2xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Monthly Due & Carry-Forward Running Balance ({monthlyScheduleData.monthlyItems.length} Months)
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-[#111111] text-white shadow-2xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Individual Receipts Register ({runningLedger.length})
            </button>
          </div>

          {/* TAB 1: MONTHLY CARRY-FORWARD DUE SCHEDULE TABLE */}
          {activeTab === 'monthly_schedule' && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Monthly Due & Carry-Forward Statement
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Unpaid dues automatically carry forward to next month; excess payments automatically credit upcoming dues.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Month</th>
                      <th className="px-3.5 py-2.5 text-right">Base Due</th>
                      <th className="px-3.5 py-2.5 text-right">Carried Bal / Credit</th>
                      <th className="px-3.5 py-2.5 text-right">Adjusted Due</th>
                      <th className="px-3.5 py-2.5 text-right">Amount Paid</th>
                      <th className="px-3.5 py-2.5">Payment Method & Bank</th>
                      <th className="px-3.5 py-2.5 text-right">Ending Balance</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                      <th className="px-3.5 py-2.5 text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {monthlyScheduleData.monthlyItems.map((item) => {
                      const isUnpaid = item.status === 'Unpaid';
                      const isPartial = item.status === 'Partially Paid';
                      const isPaid = item.status === 'Paid';

                      return (
                        <tr
                          key={item.installment_no}
                          className={`hover:bg-neutral-50/80 transition-colors ${
                            isPartial ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="px-3.5 py-3 font-semibold text-neutral-900">
                            <div>{item.month_name}</div>
                            <span className="text-[10px] text-neutral-400 font-normal">
                              Due: {item.due_date}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right font-medium text-neutral-700">
                            {formatCurrency(item.original_due)}
                          </td>
                          <td className="px-3.5 py-3 text-right font-semibold">
                            {item.previous_balance > 0 ? (
                              <span className="text-rose-600">
                                +{formatCurrency(item.previous_balance)}
                              </span>
                            ) : item.previous_balance < 0 ? (
                              <span className="text-emerald-700">
                                -{formatCurrency(Math.abs(item.previous_balance))}
                              </span>
                            ) : (
                              <span className="text-neutral-400">₹0</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right font-bold text-[#111111]">
                            {formatCurrency(item.total_adjusted_due)}
                          </td>
                          <td className="px-3.5 py-3 text-right font-bold text-emerald-700">
                            {formatCurrency(item.amount_paid)}
                          </td>
                          <td className="px-3.5 py-3">
                            {item.transactions.length === 0 ? (
                              <span className="text-neutral-400 italic text-[11px]">Pending</span>
                            ) : (
                              <div className="space-y-1">
                                {item.transactions.map((tx) => (
                                  <div key={tx.id} className="flex flex-col">
                                    <span
                                      className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase w-fit ${
                                        tx.payment_method === 'cash'
                                          ? 'bg-neutral-200 text-neutral-800'
                                          : 'bg-neutral-900 text-white'
                                      }`}
                                    >
                                      {tx.payment_method === 'cash' ? (
                                        <Banknote className="w-2.5 h-2.5" />
                                      ) : (
                                        <Smartphone className="w-2.5 h-2.5" />
                                      )}
                                      <span>{tx.payment_method}</span>
                                    </span>
                                    {tx.payment_method === 'upi' && tx.bank_account && (
                                      <span className="text-[10px] font-mono text-neutral-600 flex items-center space-x-1">
                                        <Building2 className="w-2.5 h-2.5 text-neutral-400" />
                                        <span>{tx.bank_account}</span>
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right font-semibold">
                            {item.remaining_balance > 0 ? (
                              <span className="text-rose-600">
                                {formatCurrency(item.remaining_balance)} Due
                              </span>
                            ) : item.remaining_balance < 0 ? (
                              <span className="text-emerald-700 font-bold">
                                {formatCurrency(Math.abs(item.remaining_balance))} Credit
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-normal">₹0</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
                              }`}
                            >
                              {isPaid ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : isPartial ? (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-neutral-400" />
                              )}
                              <span>{item.status}</span>
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right no-print">
                            <div className="flex items-center justify-end space-x-1">
                              {item.transactions.length > 0 && (
                                <>
                                  <button
                                    onClick={() => onViewReceipt(item.transactions[item.transactions.length - 1])}
                                    className="p-1 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                                    title={language === 'ta' ? 'ரசீது காண்க' : 'View Receipt'}
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                  {onEditPayment && (
                                    <button
                                      onClick={() => onEditPayment(item.transactions[item.transactions.length - 1])}
                                      className="p-1 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                                      title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onRequestReversal(item.transactions[item.transactions.length - 1])}
                                    className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title={language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர்' : 'Undo Payment'}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {!isPaid && (
                                <button
                                  onClick={() => onOpenRecordPayment(chit.id, member.id)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-md cursor-pointer transition-colors"
                                >
                                  {isPartial ? '+ Top Up' : 'Pay'}
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
          )}

          {/* TAB 2: ITEMIZED TRANSACTIONS REGISTER */}
          {activeTab === 'transactions' && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Itemized Collection Receipts Register
                </h3>
                <span className="text-xs text-neutral-500">{runningLedger.length} total receipts</span>
              </div>

              {runningLedger.length === 0 ? (
                <div className="p-10 text-center text-xs text-neutral-500">
                  No collection receipts have been recorded for this subscriber in this chit yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Receipt #</th>
                        <th className="px-4 py-2.5">Installment #</th>
                        <th className="px-4 py-2.5">Method & Bank Account</th>
                        <th className="px-4 py-2.5">Reference / Notes</th>
                        <th className="px-4 py-2.5 text-right">Amount Received</th>
                        <th className="px-4 py-2.5 text-right">Running Total</th>
                        <th className="px-4 py-2.5 text-center no-print">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {runningLedger.map(({ transaction, runningTotalPaid }) => {
                        const isCash = transaction.payment_method === 'cash';
                        return (
                          <tr key={transaction.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {transaction.transaction_date}
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-neutral-700">
                              {transaction.receipt_no}
                            </td>
                            <td className="px-4 py-3 text-neutral-600">
                              Month #{transaction.installment_no || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                  isCash
                                    ? 'bg-neutral-200 text-neutral-800'
                                    : 'bg-neutral-900 text-white'
                                }`}
                              >
                                {isCash ? (
                                  <Banknote className="w-3 h-3" />
                                ) : (
                                  <Smartphone className="w-3 h-3" />
                                )}
                                <span>{transaction.payment_method}</span>
                              </span>
                              {transaction.payment_method === 'upi' && transaction.bank_account && (
                                <span className="text-[10px] font-mono text-neutral-600 block mt-0.5">
                                  {transaction.bank_account}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-neutral-500 text-[11px] max-w-xs truncate">
                              {transaction.reference_id || transaction.collector_notes || '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#111111]">
                              {formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-neutral-700">
                              {formatCurrency(runningTotalPaid)}
                            </td>
                            <td className="px-4 py-3 text-center no-print">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => onViewReceipt(transaction)}
                                  className="p-1 rounded hover:bg-neutral-200 text-neutral-600 hover:text-[#111111] cursor-pointer"
                                  title={language === 'ta' ? 'ரசீது காண்க' : 'View Official Receipt'}
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                                {onEditPayment && !transaction.is_reversed && (
                                  <button
                                    onClick={() => onEditPayment(transaction)}
                                    className="p-1 rounded hover:bg-neutral-200 text-neutral-600 hover:text-[#111111] cursor-pointer"
                                    title={language === 'ta' ? 'பரிவர்த்தனையை திருத்து' : 'Edit Payment'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!transaction.is_reversed && (
                                  <button
                                    onClick={() => onRequestReversal(transaction)}
                                    className="p-1 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
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
      </div>
    </div>
  );
};
