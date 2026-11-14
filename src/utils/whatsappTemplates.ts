import { formatCurrency } from './financial';
import { ReminderRecipientInfo } from '../types';

export interface PlaceholderDefinition {
  tag: string;
  label: string;
  example: string;
  description: string;
}

export const AVAILABLE_PLACEHOLDERS: PlaceholderDefinition[] = [
  {
    tag: '{{member_name}}',
    label: 'Member Name',
    example: 'Rajesh Kumar',
    description: 'Full name of the enrolled chit subscriber',
  },
  {
    tag: '{{chit_name}}',
    label: 'Chit Scheme',
    example: 'Gold Wealth Chit A1',
    description: 'Name of the chit fund scheme',
  },
  {
    tag: '{{amount}}',
    label: 'Amount Due',
    example: '₹10,000',
    description: 'Pending installment or monthly contribution amount in INR',
  },
  {
    tag: '{{due_date}}',
    label: 'Due Date',
    example: '10th Oct 2026',
    description: 'Installment payment due date or scheduled cycle day',
  },
  {
    tag: '{{payment_status}}',
    label: 'Payment Status',
    example: 'Pending',
    description: 'Current status (Pending, Overdue, Due, Paid)',
  },
  {
    tag: '{{seat_number}}',
    label: 'Seat Number',
    example: '#4',
    description: 'Enrolled chit seat/ticket number for this member',
  },
  {
    tag: '{{company_name}}',
    label: 'Company Name',
    example: 'Chitflow Operations Co.',
    description: 'Registered business name of the chit fund operator',
  },
];

export interface TemplateRenderData {
  memberName?: string;
  chitName?: string;
  amount?: number | string;
  dueDate?: string;
  paymentStatus?: string;
  seatNumber?: number | string;
  companyName?: string;
}

/**
 * Replaces all placeholder tags in template text with actual member and chit data.
 */
export function renderWhatsAppTemplate(templateText: string, data: TemplateRenderData): string {
  if (!templateText) return '';

  const memberName = data.memberName || 'Member';
  const chitName = data.chitName || 'Chit Scheme';
  const amountStr =
    typeof data.amount === 'number'
      ? formatCurrency(data.amount)
      : data.amount || '₹0';
  const dueDate = data.dueDate || '10th of this month';
  const paymentStatus = data.paymentStatus || 'Pending';
  const seatStr = data.seatNumber
    ? String(data.seatNumber).startsWith('#')
      ? String(data.seatNumber)
      : `#${data.seatNumber}`
    : 'N/A';
  const companyName = data.companyName || 'Chit Funds';

  return templateText
    .replace(/\{\{member_name\}\}/gi, memberName)
    .replace(/\{\{chit_name\}\}/gi, chitName)
    .replace(/\{\{amount\}\}/gi, amountStr)
    .replace(/\{\{due_date\}\}/gi, dueDate)
    .replace(/\{\{payment_status\}\}/gi, paymentStatus)
    .replace(/\{\{seat_number\}\}/gi, seatStr)
    .replace(/\{\{company_name\}\}/gi, companyName);
}

/**
 * Validates and normalizes phone number for WhatsApp E.164 compliance without plus prefix.
 */
export function validateRecipientPhone(rawPhone: string): {
  isValid: boolean;
  phoneFormatted: string;
  cleanDigits: string;
  error?: string;
} {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      phoneFormatted: '',
      cleanDigits: '',
      error: 'Missing mobile phone number',
    };
  }

  const clean = rawPhone.replace(/\D/g, '');

  if (clean.length < 10) {
    return {
      isValid: false,
      phoneFormatted: clean,
      cleanDigits: clean,
      error: `Phone number is too short (${clean.length} digits). Requires at least 10 digits.`,
    };
  }

  if (clean.length > 15) {
    return {
      isValid: false,
      phoneFormatted: clean,
      cleanDigits: clean,
      error: `Phone number exceeds maximum length of 15 digits (${clean.length} digits).`,
    };
  }

  // Format with country code (default to India 91 if 10 digits)
  let formatted = clean;
  if (clean.length === 10) {
    formatted = `91${clean}`;
  } else if (clean.length === 11 && clean.startsWith('0')) {
    formatted = `91${clean.slice(1)}`;
  } else if (clean.length === 12 && clean.startsWith('91')) {
    formatted = clean;
  }

  return {
    isValid: true,
    phoneFormatted: formatted,
    cleanDigits: clean,
  };
}

/**
 * Categorizes a list of recipients into valid WhatsApp numbers vs invalid/missing numbers.
 */
export function categorizeRecipients(recipients: ReminderRecipientInfo[]): {
  valid: Array<ReminderRecipientInfo & { phoneFormatted: string }>;
  invalid: Array<{ recipient: ReminderRecipientInfo; reason: string }>;
} {
  const valid: Array<ReminderRecipientInfo & { phoneFormatted: string }> = [];
  const invalid: Array<{ recipient: ReminderRecipientInfo; reason: string }> = [];

  recipients.forEach((r) => {
    const val = validateRecipientPhone(r.phone);
    if (val.isValid) {
      valid.push({
        ...r,
        phoneFormatted: val.phoneFormatted,
      });
    } else {
      invalid.push({
        recipient: r,
        reason: val.error || 'Invalid phone number format',
      });
    }
  });

  return { valid, invalid };
}

/**
 * Builds standard compliant WhatsApp Web / App deep link for manual fallback.
 */
export function buildWhatsAppDirectUrl(phone: string, text: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  if (!clean) {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
  const val = validateRecipientPhone(phone);
  const targetNumber = val.isValid ? val.phoneFormatted : clean;
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Universally opens WhatsApp in desktop or mobile browsers.
 * Bypasses aggressive browser popup blockers using a safe DOM anchor simulation.
 */
export function openWhatsAppDirect(phone: string, text: string): void {
  const url = buildWhatsAppDirectUrl(phone, text);
  try {
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
