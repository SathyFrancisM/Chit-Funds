import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Edit3 } from 'lucide-react';
import { FinancialTransaction, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface ReversalModalProps {
  transaction: FinancialTransaction | null;
  onClose: () => void;
  currentUser: UserProfile;
  onConfirmReversal: (txId: string, reason: string) => void;
  onEditInstead?: (tx: FinancialTransaction) => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  transaction,
  onClose,
  currentUser: _currentUser,
  onConfirmReversal,
  onEditInstead,
}) => {
  const { language, t } = useLanguage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const quickReasons = language === 'ta' ? [
    'தவறான சந்தாதாரருக்கு பதிவு செய்யப்பட்டது',
    'தவறான தொகை உள்ளிடப்பட்டது',
    'இருமுறை பதிவு செய்யப்பட்டது',
    'தவறான வங்கி / கட்டண முறை தேர்வு செய்யப்பட்டது',
  ] : [
    'Mistakenly recorded on wrong subscriber',
    'Incorrect payment amount entered',
    'Duplicate payment entry',
    'Wrong payment method or bank selected',
  ];

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalReason = reason.trim() || (language === 'ta' ? 'தவறுதலாக பதிவு செய்யப்பட்டது - சரிசெய்யப்பட்டது' : 'Mistaken entry undone by user');

    onConfirmReversal(transaction.id, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                {language === 'ta' ? 'பரிவர்த்தனையை செயல்தவிர் / மாற்று' : 'Undo / Reverse Transaction'}
              </h2>
              <p className="text-xs text-neutral-500">
                {language === 'ta' ? 'தவறை உடனடியாக சரிசெய்யலாம்' : 'Correct payment mistakes & restore ledger balance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-neutral-500">{t('receiptNo')}:</span>
              <span className="font-mono font-bold text-[#111111]">{transaction.receipt_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{language === 'ta' ? 'ரத்து செய்யப்படும் தொகை' : 'Amount to Reverse'}:</span>
              <span className="font-bold text-rose-600">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">{t('paymentMethod')}:</span>
              <span className="uppercase font-semibold">{transaction.payment_method}</span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-600">
            {language === 'ta' 
              ? 'இந்த பரிவர்த்தனை ரத்து செய்யப்பட்டு, நிலுவைத் தொகை தானாகவே முந்தைய நிலைக்கு மாற்றியமைக்கப்படும்.'
              : 'Reversing will immediately remove this amount from the member ledger and scheme cashbook while logging the correction.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              {language === 'ta' ? 'காரணம் (விரைவு தேர்வு)' : 'Reason / Mistake Note'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickReasons.map((qr) => (
                <button
                  type="button"
                  key={qr}
                  onClick={() => setReason(qr)}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                    reason === qr
                      ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'ta' ? 'அல்லது உங்கள் காரணத்தை உள்ளிடவும்...' : 'Or enter custom mistake explanation...'}
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
            {onEditInstead ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditInstead(transaction);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'மாற்றி அமை (திருத்து)' : 'Edit Instead'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('undo')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

