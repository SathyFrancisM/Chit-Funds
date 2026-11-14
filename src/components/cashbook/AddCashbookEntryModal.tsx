import React, { useState } from 'react';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import { ChitScheme, PaymentMethod } from '../../types';

interface AddCashbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemes: ChitScheme[];
  defaultChitId?: string;
  onSubmit: (entry: {
    chit_id: string;
    transaction_type: 'payout' | 'expense' | 'adjustment';
    payment_method: PaymentMethod;
    amount: number;
    payer_name: string;
    notes: string;
    reference_id?: string;
    transaction_date: string;
  }) => void;
}

export const AddCashbookEntryModal: React.FC<AddCashbookEntryModalProps> = ({
  isOpen,
  onClose,
  schemes,
  defaultChitId,
  onSubmit,
}) => {
  const [chitId, setChitId] = useState(defaultChitId || schemes[0]?.id || '');
  const [entryType, setEntryType] = useState<'payout' | 'expense' | 'adjustment'>('payout');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [amount, setAmount] = useState<number>(100000);
  const [partyName, setPartyName] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!chitId) {
      setError('Please select a scheme.');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be positive.');
      return;
    }

    if (!partyName.trim()) {
      setError('Recipient or party name is required.');
      return;
    }

    onSubmit({
      chit_id: chitId,
      transaction_type: entryType,
      payment_method: paymentMethod,
      amount: Number(amount),
      payer_name: partyName.trim(),
      notes: notes.trim(),
      reference_id: referenceId.trim() || undefined,
      transaction_date: transactionDate,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Record Financial Movement</h2>
              <p className="text-xs text-neutral-500">Prize money disbursement or operational expense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Chit Scheme *
            </label>
            <select
              required
              value={chitId}
              onChange={(e) => setChitId(e.target.value)}
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.scheme_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Entry Category *
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as any)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="payout">Prize Money Payout (Auction)</option>
                <option value="expense">Operational Expense</option>
                <option value="adjustment">Capital Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Payment Channel *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="upi">UPI / Net Banking</option>
                <option value="cash">Physical Cash Drawer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full text-xs font-bold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Beneficiary / Payee Name *
            </label>
            <input
              type="text"
              required
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="e.g. Winner Name or Vendor Name"
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Reference ID / Cheque / UTR
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. NEFT-HDFC-99120"
              className="w-full text-xs font-mono bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Auction auction bid dividend notes..."
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg shadow-sm"
            >
              Record Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
