import React from 'react';
import { X, Printer, Download, CheckCircle2, Building2, Smartphone, Banknote, Share2, MessageCircle } from 'lucide-react';
import { FinancialTransaction, CompanyProfile, ChitScheme, CompanyMember } from '../../types';
import { formatCurrency } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface ReceiptModalProps {
  transaction: FinancialTransaction | null;
  onClose: () => void;
  company: CompanyProfile;
  scheme?: ChitScheme;
  member?: CompanyMember;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  onClose,
  company,
  scheme,
  member,
}) => {
  const { language, t } = useLanguage();
  if (!transaction) return null;

  const isCash = transaction.payment_method === 'cash';

  const sendWhatsAppReceipt = () => {
    const subscriberName = member?.full_name || transaction.payer_name || (language === 'ta' ? 'சந்தாதாரர்' : 'Subscriber');
    const schemeName = scheme?.name || (language === 'ta' ? 'சீட்டுத் திட்டம்' : 'Chit Scheme');
    const schemeCode = scheme?.scheme_code ? ` (${scheme.scheme_code})` : '';
    const formattedAmount = formatCurrency(transaction.amount);
    const receiptNo = transaction.receipt_no;
    const date = transaction.transaction_date;
    const mode = transaction.payment_method === 'cash' ? (language === 'ta' ? 'ரொக்கம்' : 'Cash') : 'UPI';
    const companyName = company.name || (language === 'ta' ? 'சீட்டு நிதி நிறுவனம்' : 'Chit Fund Office');

    const message = language === 'ta'
      ? `*பணம் செலுத்தியதற்கான உறுதி ரசீது* 🧾\n\n` +
        `அன்பார்ந்த *${subscriberName}*,\n\n` +
        `*${schemeName}*${schemeCode} திட்டத்திற்காக உங்கள் தவணைத் தொகை *${formattedAmount}* வெற்றிகரமாகப் பெறப்பட்டது என்பதை உறுதிப்படுத்துகிறோம்.\n\n` +
        `• *ரசீது எண்:* ${receiptNo}\n` +
        `• *தேதி:* ${date}\n` +
        `• *செலுத்திய முறை:* ${mode}\n` +
        (transaction.reference_id ? `• *பரிவர்த்தனை எண்:* ${transaction.reference_id}\n` : '') +
        `\nஎங்களுடன் இணைந்திருப்பதற்கு நன்றி!\n— *${companyName}*`
      : `*Payment Receipt Confirmation* 🧾\n\n` +
        `Dear *${subscriberName}*,\n\n` +
        `We have received your payment of *${formattedAmount}* towards *${schemeName}*${schemeCode}.\n\n` +
        `• *Receipt No:* ${receiptNo}\n` +
        `• *Date:* ${date}\n` +
        `• *Payment Mode:* ${mode}\n` +
        (transaction.reference_id ? `• *Reference ID:* ${transaction.reference_id}\n` : '') +
        `\nThank you for your payment!\n— *${companyName}*`;

    // Normalize phone number for WhatsApp
    const rawPhone = member?.phone || member?.phone_normalized || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    let waPhone = '';
    if (cleanDigits.length === 10) {
      waPhone = `91${cleanDigits}`;
    } else if (cleanDigits.length > 10) {
      waPhone = cleanDigits;
    }

    const waUrl = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  const handlePrint = () => {
    // Automatically open WhatsApp with receipt message
    sendWhatsAppReceipt();
    // Trigger browser print
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Actions Bar */}
        <div className="px-6 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              {language === 'ta' ? 'பணம் செலுத்தியதற்கான உறுதி ரசீது' : 'Payment Confirmation Receipt'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={sendWhatsAppReceipt}
              className="px-3 py-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
              title="Share receipt via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? 'வாட்ஸ்அப்பில் பகிர்க' : 'Share WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
              title="Print receipt and share via WhatsApp"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? 'ரசீதை அச்சிடுக' : 'Print Receipt'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Formal Receipt Document */}
        <div className="p-8 space-y-6 text-[#111111]">
          {/* Company Masthead */}
          <div className="text-center pb-5 border-b-2 border-neutral-900">
            <h1 className="text-lg font-black tracking-tight uppercase text-[#111111]">
              {company.name}
            </h1>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              {language === 'ta' ? 'பதிவு எண்' : 'Reg No'}: {company.registration_no} • {language === 'ta' ? 'தொலைபேசி' : 'Phone'}: {company.phone}
            </p>
            <p className="text-[10px] text-neutral-500">
              {company.address}
            </p>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-neutral-200">
            <div>
              <span className="text-neutral-500 text-[10px] uppercase block">{language === 'ta' ? 'ரசீது எண்' : 'Receipt Number'}</span>
              <span className="font-mono font-bold text-sm text-[#111111]">{transaction.receipt_no}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 text-[10px] uppercase block">{language === 'ta' ? 'தேதி' : 'Transaction Date'}</span>
              <span className="font-semibold">{transaction.transaction_date}</span>
            </div>
          </div>

          {/* Subscriber & Chit Scheme Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-500">{language === 'ta' ? 'சந்தாதாரர் பெயர்:' : 'Subscriber Name:'}</span>
              <span className="font-bold">{member?.full_name || transaction.payer_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-500">{language === 'ta' ? 'தொடர்பு எண்:' : 'Contact Number:'}</span>
              <span className="font-mono">{member?.phone || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-500">{language === 'ta' ? 'திட்டத்தின் பெயர்:' : 'Scheme Name:'}</span>
              <span className="font-medium">{scheme?.name || (language === 'ta' ? 'சீட்டுத் திட்டம்' : 'Chit Scheme')} ({scheme?.scheme_code || '—'})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-500">{language === 'ta' ? 'தவணை காலம்:' : 'Installment Period:'}</span>
              <span className="font-medium">{language === 'ta' ? `மாதம் ${transaction.installment_no || 'சந்தா'}` : `Month ${transaction.installment_no || 'Subscription'}`}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-100">
              <span className="text-neutral-500">{language === 'ta' ? 'செலுத்தும் முறை:' : 'Payment Mode:'}</span>
              <span className="font-bold uppercase tracking-wider">
                {transaction.payment_method === 'upi' && transaction.bank_account
                  ? `UPI — ${transaction.bank_account}`
                  : (transaction.payment_method === 'cash' ? (language === 'ta' ? 'ரொக்கம்' : 'Cash') : 'UPI')}
              </span>
            </div>
            {transaction.payment_method === 'upi' && transaction.bank_account && (
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">{language === 'ta' ? 'வரவு வைக்கப்பட்ட வங்கி:' : 'Credited Bank Account:'}</span>
                <span className="font-semibold text-[#111111]">{transaction.bank_account}</span>
              </div>
            )}
            {transaction.reference_id && (
              <div className="flex justify-between py-1 border-b border-neutral-100 font-mono text-[11px]">
                <span className="text-neutral-500">{language === 'ta' ? 'பரிவர்த்தனை எண்:' : 'UPI / Reference ID:'}</span>
                <span>{transaction.reference_id}</span>
              </div>
            )}
            {transaction.collector_notes && (
              <div className="py-1 text-[11px] text-neutral-600 italic">
                {language === 'ta' ? 'குறிப்புகள்:' : 'Notes:'} {transaction.collector_notes}
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-neutral-100 rounded-xl flex items-center justify-between border border-neutral-300">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              {language === 'ta' ? 'பெறப்பட்ட தொகை' : 'Amount Received'}
            </span>
            <span className="text-2xl font-black text-[#111111]">
              {formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-neutral-600">
            <div>
              <div className="border-t border-neutral-300 pt-2 w-36 mx-auto">
                <span className="text-[10px] uppercase font-semibold">{language === 'ta' ? 'சந்தாதாரர் கையொப்பம்' : 'Subscriber Signature'}</span>
              </div>
            </div>
            <div>
              <div className="border-t border-neutral-300 pt-2 w-36 mx-auto">
                <span className="text-[10px] uppercase font-semibold">{language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signatory'}</span>
                <p className="text-[9px] text-neutral-400 mt-0.5">{language === 'ta' ? `பதிவு செய்தவர்: ${transaction.recorded_by}` : `Recorded by ${transaction.recorded_by}`}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
