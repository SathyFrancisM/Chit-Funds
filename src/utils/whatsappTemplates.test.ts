import { describe, it, expect } from 'vitest';
import {
  renderWhatsAppTemplate,
  validateRecipientPhone,
  categorizeRecipients,
  buildWhatsAppDirectUrl,
} from './whatsappTemplates';
import { ReminderRecipientInfo } from '../types';

describe('WhatsApp Templates Utilities', () => {
  describe('renderWhatsAppTemplate', () => {
    it('correctly substitutes all standard placeholders', () => {
      const template =
        'Hi {{member_name}}, installment of {{amount}} for {{chit_name}} (Seat {{seat_number}}) is due on {{due_date}}. Status: {{payment_status}}. - {{company_name}}';

      const rendered = renderWhatsAppTemplate(template, {
        memberName: 'Ananya Sharma',
        chitName: 'Diamond Chit Scheme 5L',
        amount: 25000,
        seatNumber: 12,
        dueDate: '15th Nov 2026',
        paymentStatus: 'Pending',
        companyName: 'Chitflow Apex',
      });

      expect(rendered).toContain('Hi Ananya Sharma');
      expect(rendered).toContain('₹25,000');
      expect(rendered).toContain('Diamond Chit Scheme 5L');
      expect(rendered).toContain('Seat #12');
      expect(rendered).toContain('15th Nov 2026');
      expect(rendered).toContain('Status: Pending');
      expect(rendered).toContain('Chitflow Apex');
    });

    it('handles case-insensitive placeholder variants', () => {
      const template = 'Reminder: {{MEMBER_NAME}}, due {{AMOUNT}} for {{CHIT_NAME}}';
      const rendered = renderWhatsAppTemplate(template, {
        memberName: 'Vikram',
        amount: 10000,
        chitName: 'Scheme B',
      });

      expect(rendered).toBe('Reminder: Vikram, due ₹10,000 for Scheme B');
    });

    it('supplies sensible defaults when fields are missing', () => {
      const template = 'Hello {{member_name}} from {{company_name}}, amount: {{amount}}';
      const rendered = renderWhatsAppTemplate(template, {});

      expect(rendered).toBe('Hello Member from Chit Funds, amount: ₹0');
    });
  });

  describe('validateRecipientPhone', () => {
    it('validates 10-digit Indian numbers and prefixes 91', () => {
      const result = validateRecipientPhone('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.phoneFormatted).toBe('919876543210');
    });

    it('handles numbers with spaces, dashes, and parentheses', () => {
      const result = validateRecipientPhone('+91 (987) 65-43210');
      expect(result.isValid).toBe(true);
      expect(result.phoneFormatted).toBe('919876543210');
    });

    it('strips leading 0 from 11-digit numbers', () => {
      const result = validateRecipientPhone('09876543210');
      expect(result.isValid).toBe(true);
      expect(result.phoneFormatted).toBe('919876543210');
    });

    it('flags phone numbers shorter than 10 digits as invalid', () => {
      const result = validateRecipientPhone('98765');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('flags empty phone numbers as invalid', () => {
      const result = validateRecipientPhone('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing mobile phone number');
    });
  });

  describe('categorizeRecipients', () => {
    it('separates valid from invalid recipients accurately', () => {
      const recipients: ReminderRecipientInfo[] = [
        {
          memberId: 'm1',
          memberName: 'Valid User 1',
          phone: '9848011223',
          amountDue: 5000,
        },
        {
          memberId: 'm2',
          memberName: 'Invalid User 2',
          phone: '1234',
          amountDue: 5000,
        },
        {
          memberId: 'm3',
          memberName: 'Empty Phone User',
          phone: '',
          amountDue: 5000,
        },
      ];

      const categorized = categorizeRecipients(recipients);
      expect(categorized.valid.length).toBe(1);
      expect(categorized.valid[0].memberName).toBe('Valid User 1');
      expect(categorized.valid[0].phoneFormatted).toBe('919848011223');

      expect(categorized.invalid.length).toBe(2);
      expect(categorized.invalid[0].recipient.memberName).toBe('Invalid User 2');
      expect(categorized.invalid[1].recipient.memberName).toBe('Empty Phone User');
    });
  });

  describe('buildWhatsAppDirectUrl', () => {
    it('generates compliant https://wa.me/ deep link with URL-encoded message', () => {
      const url = buildWhatsAppDirectUrl('9876543210', 'Hello from Chitflow: ₹5,000 due');
      expect(url).toContain('https://wa.me/919876543210?text=');
      expect(url).toContain(encodeURIComponent('Hello from Chitflow: ₹5,000 due'));
    });
  });
});
