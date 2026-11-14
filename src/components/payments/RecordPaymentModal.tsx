import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  ShieldAlert,
  Building2,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  ChitMembership,
  PaymentMethod,
  FinancialTransaction,
  UpiBankAccount,
  UPI_BANK_ACCOUNTS,
} from '../../types';
import {
  formatCurrency,
  calculateMemberMonthlyDueSchedule,
} from '../../utils/financial';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemes: ChitScheme[];
  members: CompanyMember[];
  memberships: ChitMembership[];
  transactions?: FinancialTransaction[];
  preselectedChitId?: string;
  preselectedMemberId?: string;
  editingTransaction?: FinancialTransaction | null;
  onUpdatePayment?: (
    txId: string,
    params: {
      amount: number;
      payment_method: PaymentMethod;
      bank_account?: UpiBankAccount | string;
      installment_no?: number;
      reference_id?: string;
      collector_notes?: string;
      transaction_date?: string;
    }
  ) => void;
  onUndoPayment?: (txId: string) => void;
  onSubmit: (params: {
    chit_id: string;
    member_id: string;
    amount: number;
    payment_method: PaymentMethod;
    bank_account?: UpiBankAccount | string;
    installment_no?: number;
    reference_id?: string;
    collector_notes?: string;
    transaction_date?: string;
  }) => FinancialTransaction;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  schemes,
  members,
  memberships,
  transactions = [],
  preselectedChitId,
  preselectedMemberId,
  editingTransaction,
  onUpdatePayment,
  onUndoPayment,
  onSubmit,
}) => {
  const activeSchemes = useMemo(() => schemes.filter((s) => s.status === 'active'), [schemes]);

  const [selectedChitId, setSelectedChitId] = useState(
    editingTransaction?.chit_id || preselectedChitId || (activeSchemes[0]?.id || '')
  );
  const [selectedMemberId, setSelectedMemberId] = useState(
    editingTransaction?.member_id || preselectedMemberId || ''
  );
  const [installmentNo, setInstallmentNo] = useState(editingTransaction?.installment_no || 1);
  const [transactionDate, setTransactionDate] = useState(
    () => editingTransaction?.transaction_date || new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<number | ''>(
    editingTransaction ? editingTransaction.amount : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingTransaction ? editingTransaction.payment_method : 'cash'
  );
  const [selectedBank, setSelectedBank] = useState<UpiBankAccount | ''>(
    (editingTransaction?.bank_account as UpiBankAccount) || 'IOB Current'
  );
  const [referenceId, setReferenceId] = useState(editingTransaction?.reference_id || '');
  const [collectorNotes, setCollectorNotes] = useState(editingTransaction?.collector_notes || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync props when opening or editingTransaction changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);

      if (editingTransaction) {
        setSelectedChitId(editingTransaction.chit_id);
        setSelectedMemberId(editingTransaction.member_id || '');
        setAmount(editingTransaction.amount);
        setPaymentMethod(editingTransaction.payment_method);
        setSelectedBank((editingTransaction.bank_account as UpiBankAccount) || 'IOB Current');
        setInstallmentNo(editingTransaction.installment_no || 1);
        setTransactionDate(editingTransaction.transaction_date);
        setReferenceId(editingTransaction.reference_id || '');
        setCollectorNotes(editingTransaction.collector_notes || '');
      } else {
        const defaultChit = preselectedChitId || activeSchemes[0]?.id || '';
        setSelectedChitId(defaultChit);
        if (preselectedMemberId) {
          setSelectedMemberId(preselectedMemberId);
        }
      }
    }
  }, [isOpen, editingTransaction, preselectedChitId, preselectedMemberId, activeSchemes]);

  // Enrolled members for chosen chit
  const enrolledMembers = useMemo(() => {
    const chitMemberships = memberships.filter((m) => m.chit_id === selectedChitId && m.is_active);
    const memberMap = new Map(members.map((m) => [m.id, m]));
    return chitMemberships
      .map((cms) => ({
        membership: cms,
        member: memberMap.get(cms.member_id),
      }))
      .filter((item) => Boolean(item.member));
  }, [memberships, selectedChitId, members]);

  // Set default member if none selected or not in enrolled list
  useEffect(() => {
    if (
      enrolledMembers.length > 0 &&
      (!selectedMemberId || !enrolledMembers.some((e) => e.member?.id === selectedMemberId))
    ) {
      setSelectedMemberId(enrolledMembers[0].member!.id);
    }
  }, [enrolledMembers, selectedMemberId]);

  // Current scheme & membership
  const currentScheme = useMemo(() => schemes.find((s) => s.id === selectedChitId), [schemes, selectedChitId]);
  const currentMembership = useMemo(
    () =>
      memberships.find(
        (m) => m.chit_id === selectedChitId && m.member_id === selectedMemberId && m.is_active
      ),
    [memberships, selectedChitId, selectedMemberId]
  );
  const currentMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  // Dynamically calculate running monthly carry-forward schedule
  const monthlyDueData = useMemo(() => {
    if (!currentScheme || !currentMembership) return null;
    return calculateMemberMonthlyDueSchedule(currentScheme, currentMembership, transactions);
  }, [currentScheme, currentMembership, transactions]);

  // Automatically select the next recommended unpaid / partial installment
  useEffect(() => {
    if (monthlyDueData) {
      setInstallmentNo(monthlyDueData.firstUnpaidOrPartialMonth);
    }
  }, [monthlyDueData?.firstUnpaidOrPartialMonth]);

  // Active month item
  const activeMonthItem = useMemo(() => {
    if (!monthlyDueData) return null;
    return (
      monthlyDueData.monthlyItems.find((item) => item.installment_no === installmentNo) ||
      monthlyDueData.monthlyItems[0]
    );
  }, [monthlyDueData, installmentNo]);

  // Base and adjusted due for chosen month
  const baseMonthlyDue =
    currentMembership?.expected_monthly_contribution || currentScheme?.monthly_installment_amount || 0;
  const currentMonthTotalAdjustedDue = activeMonthItem ? activeMonthItem.total_adjusted_due : baseMonthlyDue;
  const currentMonthAlreadyPaid = activeMonthItem ? activeMonthItem.amount_paid : 0;
  const currentMonthNetRemainingDue = Math.max(0, currentMonthTotalAdjustedDue - currentMonthAlreadyPaid);

  // Pre-fill amount when switching month or subscriber, allowing user manual override
  useEffect(() => {
    const suggested = currentMonthNetRemainingDue > 0 ? currentMonthNetRemainingDue : baseMonthlyDue;
    setAmount(suggested);
  }, [installmentNo, selectedMemberId, selectedChitId, currentMonthNetRemainingDue, baseMonthlyDue]);

  if (!isOpen) return null;

  const numericAmount = Number(amount) || 0;
  const isPartialPayment = numericAmount > 0 && numericAmount < currentMonthNetRemainingDue;
  const isFullPayment = numericAmount > 0 && numericAmount === currentMonthNetRemainingDue;
  const isOverpayment = numericAmount > currentMonthNetRemainingDue && currentMonthNetRemainingDue > 0;
  const excessAmount = Math.max(0, numericAmount - currentMonthNetRemainingDue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedChitId) {
      setError('Please select a chit scheme.');
      return;
    }

    if (!selectedMemberId) {
      setError('Please select an enrolled subscriber member.');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentMethod === 'upi' && !selectedBank) {
      setError('Bank Account selection is mandatory for UPI payments. Please choose an account.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingTransaction && onUpdatePayment) {
        onUpdatePayment(editingTransaction.id, {
          amount: Math.round(numericAmount),
          payment_method: paymentMethod,
          bank_account: paymentMethod === 'upi' ? (selectedBank as UpiBankAccount) : undefined,
          installment_no: Number(installmentNo),
          reference_id: referenceId.trim() || undefined,
          collector_notes: collectorNotes.trim() || undefined,
          transaction_date: transactionDate,
        });
      } else {
        onSubmit({
          chit_id: selectedChitId,
          member_id: selectedMemberId,
          amount: Math.round(numericAmount),
          payment_method: paymentMethod,
          bank_account: paymentMethod === 'upi' ? (selectedBank as UpiBankAccount) : undefined,
          installment_no: Number(installmentNo),
          reference_id: referenceId.trim() || undefined,
          collector_notes: collectorNotes.trim() || undefined,
          transaction_date: transactionDate,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 ${editingTransaction ? 'bg-amber-600' : 'bg-[#111111]'} text-white rounded-lg`}>
              {editingTransaction ? <RotateCcw className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                {editingTransaction
                  ? `Edit & Redo Payment (${editingTransaction.receipt_no})`
                  : 'Mark Monthly Chit Payment'}
              </h2>
              <p className="text-xs text-neutral-500">
                {editingTransaction
                  ? 'Update mistakenly entered amount, payment mode, or bank account • Recalculates immediately'
                  : 'Manual collection with automatic running balance & carry-forward dues'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Chit & Subscriber Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Scheme Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Chit Scheme *
              </label>
              <select
                required
                value={selectedChitId}
                onChange={(e) => setSelectedChitId(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                {activeSchemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.scheme_code}) — {formatCurrency(s.monthly_installment_amount)}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Subscriber Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Subscriber Member *
              </label>
              <select
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                {enrolledMembers.length === 0 ? (
                  <option value="">No members enrolled in this chit</option>
                ) : (
                  enrolledMembers.map(({ membership, member }) => (
                    <option key={member!.id} value={member!.id}>
                      Seat #{membership.seat_number} — {member!.full_name} ({member!.phone})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Month & Running Due Carry-Forward Breakdown Box */}
          {activeMonthItem && currentScheme && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="font-bold text-neutral-900">
                    Payment Month: {activeMonthItem.month_name}
                  </span>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase ${
                      activeMonthItem.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeMonthItem.status === 'Partially Paid'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {activeMonthItem.status}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-[11px] text-neutral-500">
                  <span>Scheduled Due Date:</span>
                  <span className="font-semibold text-neutral-800">{activeMonthItem.due_date}</span>
                </div>
              </div>

              {/* Carry-Forward Running Balance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-center">
                <div className="p-2 bg-white rounded-lg border border-neutral-200/80">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                    Base Due
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    {formatCurrency(activeMonthItem.original_due)}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-neutral-200/80">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                    Carried Balance
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      activeMonthItem.previous_balance > 0
                        ? 'text-rose-600'
                        : activeMonthItem.previous_balance < 0
                        ? 'text-emerald-700'
                        : 'text-neutral-700'
                    }`}
                  >
                    {activeMonthItem.previous_balance > 0
                      ? `+${formatCurrency(activeMonthItem.previous_balance)} Unpaid`
                      : activeMonthItem.previous_balance < 0
                      ? `-${formatCurrency(Math.abs(activeMonthItem.previous_balance))} Credit`
                      : '₹0'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-neutral-200/80">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                    Total Adjusted Due
                  </span>
                  <span className="text-xs font-bold text-[#111111]">
                    {formatCurrency(activeMonthItem.total_adjusted_due)}
                  </span>
                </div>

                <div className="p-2 bg-neutral-900 text-white rounded-lg shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-neutral-300 block">
                    Net Due to Pay
                  </span>
                  <span className="text-xs font-bold text-amber-400">
                    {formatCurrency(currentMonthNetRemainingDue)}
                  </span>
                </div>
              </div>

              {activeMonthItem.previous_balance > 0 && (
                <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    <strong>Unpaid Dues Carried Forward:</strong> Previous month had an outstanding balance of{' '}
                    <strong>{formatCurrency(activeMonthItem.previous_balance)}</strong>, which has been automatically added to this month's total due.
                  </span>
                </div>
              )}

              {activeMonthItem.previous_balance < 0 && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60 flex items-center space-x-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Advance Credit Applied:</strong> Previous excess payment of{' '}
                    <strong>{formatCurrency(Math.abs(activeMonthItem.previous_balance))}</strong> has been automatically deducted from this month's due.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Month, Date & Amount Entry Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Installment Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Installment Month *
              </label>
              <select
                value={installmentNo}
                onChange={(e) => setInstallmentNo(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                {Array.from({ length: currentScheme?.duration_months || 25 }, (_, i) => i + 1).map((m) => {
                  const mItem = monthlyDueData?.monthlyItems.find((item) => item.installment_no === m);
                  return (
                    <option key={m} value={m}>
                      Month #{m} {mItem ? `(${mItem.status})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Collection Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Manually Entered Amount */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Amount Received (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="Enter collected amount"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setAmount(val);
                  }}
                  className="w-full pl-7 pr-3 py-2 text-xs font-bold bg-white border border-neutral-300 rounded-lg text-[#111111] focus:ring-2 focus:ring-neutral-900 focus:outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Payment Amount Validation & Carry-Forward Live Feedback */}
          {numericAmount > 0 && (
            <div>
              {isPartialPayment && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Partial Payment Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    You entered <strong>{formatCurrency(numericAmount)}</strong> out of{' '}
                    <strong>{formatCurrency(currentMonthNetRemainingDue)}</strong> total due. The remaining unpaid balance of{' '}
                    <strong>{formatCurrency(currentMonthNetRemainingDue - numericAmount)}</strong> will{' '}
                    <strong>automatically carry forward</strong> to Month #{installmentNo + 1}'s due.
                  </p>
                </div>
              )}

              {isFullPayment && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Exact Full Payment:</strong> Month #{installmentNo} due of{' '}
                    {formatCurrency(currentMonthNetRemainingDue)} will be 100% settled.
                  </span>
                </div>
              )}

              {isOverpayment && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Excess Payment Credit: +{formatCurrency(excessAmount)}</span>
                  </div>
                  <p className="text-[11px] text-blue-900 leading-relaxed">
                    Subscriber paid <strong>{formatCurrency(numericAmount)}</strong> against{' '}
                    <strong>{formatCurrency(currentMonthNetRemainingDue)}</strong> due. The extra{' '}
                    <strong>{formatCurrency(excessAmount)}</strong> will <strong>automatically carry forward as advance credit</strong> and reduce upcoming month dues.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector: Cash or UPI */}
          <div className="space-y-2 pt-1 border-t border-neutral-100">
            <label className="block text-xs font-semibold text-[#111111]">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-[#111111] bg-neutral-100 text-[#111111] font-bold shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <Banknote className="w-4 h-4 text-[#111111]" />
                <div>
                  <span className="text-xs block font-bold">Physical Cash</span>
                  <span className="text-[10px] text-neutral-500 font-normal">No bank selection needed</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-[#111111] bg-neutral-100 text-[#111111] font-bold shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#111111]" />
                <div>
                  <span className="text-xs block font-bold">Digital UPI</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Mandatory bank account credit</span>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Method Details: UPI Bank Account or Cash Notes */}
          {paymentMethod === 'upi' ? (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
              <div className="flex items-center space-x-2 text-[#111111] font-bold">
                <Building2 className="w-4 h-4 text-neutral-800" />
                <span>UPI Bank Account Selection *</span>
              </div>

              {/* Scrollable Bank Account Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Credited Bank Account <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value as UpiBankAccount)}
                  className="w-full text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    -- Select Bank Account --
                  </option>
                  {UPI_BANK_ACCOUNTS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Selection mandatory for UPI transaction reconciliation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  UPI Reference ID / UTR Number <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. UPI-GPAY-984210 or 12-digit UTR"
                  className="w-full text-xs font-mono bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Cash Collector Desk Notes <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={collectorNotes}
                onChange={(e) => setCollectorNotes(e.target.value)}
                placeholder="e.g. Handed at head office counter, cash counted and verified"
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          )}

          {/* Confirmation Summary Box */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block">
              Payment Summary Confirmation
            </span>
            <div className="flex justify-between text-neutral-700">
              <span>Subscriber:</span>
              <span className="font-semibold text-[#111111]">
                {currentMember?.full_name || 'Subscriber'} (Seat #{currentMembership?.seat_number})
              </span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>Chit Scheme:</span>
              <span className="font-semibold text-[#111111]">{currentScheme?.name}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>Payment Mode:</span>
              <span className="font-semibold text-[#111111] uppercase">
                {paymentMethod === 'upi' ? `UPI — ${selectedBank || 'Pending Selection'}` : 'Cash'}
              </span>
            </div>
            <div className="flex justify-between text-neutral-700 pt-1.5 border-t border-neutral-200">
              <span className="font-bold text-[#111111]">Total Amount Collected:</span>
              <span className="font-bold text-[#111111] text-sm">
                {formatCurrency(numericAmount)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
            <div>
              {editingTransaction && onUndoPayment && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Undo and reverse this payment of ${formatCurrency(editingTransaction.amount)} (Receipt ${editingTransaction.receipt_no})? All monthly balances will recalculate automatically.`)) {
                      onUndoPayment(editingTransaction.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Undo This Payment</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || enrolledMembers.length === 0}
                className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-[#262626] disabled:bg-neutral-300 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {editingTransaction ? 'Update & Redo Payment' : 'Confirm & Issue Receipt'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
