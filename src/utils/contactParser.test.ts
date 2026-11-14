import { describe, it, expect } from 'vitest';
import { parseWhatsAppCopiedText, parseVcfText } from './contactParser';

describe('WhatsApp Contact Text Parser', () => {
  it('parses "Name: Phone" format accurately', () => {
    const text = 'Rajesh Rao: +91 98490 12345';
    const results = parseWhatsAppCopiedText(text);
    expect(results.length).toBe(1);
    expect(results[0].fullName).toBe('Rajesh Rao');
    expect(results[0].phoneNormalized).toBe('9849012345');
    expect(results[0].isValid).toBe(true);
  });

  it('parses "Name - Phone" format accurately', () => {
    const text = 'Venkat Ramana - 9876543210';
    const results = parseWhatsAppCopiedText(text);
    expect(results.length).toBe(1);
    expect(results[0].fullName).toBe('Venkat Ramana');
    expect(results[0].phoneNormalized).toBe('9876543210');
    expect(results[0].isValid).toBe(true);
  });

  it('parses multiple pasted lines with diverse formats', () => {
    const text = 
      'Sunitha Deshmukh: +91 99887 76655\n' +
      '+91 91234 56789 - Abdul Khader\n' +
      'Ananya Srinivasan (+91 94401 23456)\n' +
      'CS Reddy, 9701234567, cs@example.com';

    const results = parseWhatsAppCopiedText(text);
    expect(results.length).toBe(4);
    expect(results[0].fullName).toBe('Sunitha Deshmukh');
    expect(results[0].phoneNormalized).toBe('9988776655');

    expect(results[1].fullName).toBe('Abdul Khader');
    expect(results[1].phoneNormalized).toBe('9123456789');

    expect(results[2].fullName).toBe('Ananya Srinivasan');
    expect(results[2].phoneNormalized).toBe('9440123456');

    expect(results[3].fullName).toBe('CS Reddy');
    expect(results[3].phoneNormalized).toBe('9701234567');
    expect(results[3].email).toBe('cs@example.com');
  });

  it('handles invalid numbers with clear validation message', () => {
    const text = 'Invalid Person: 12345';
    const results = parseWhatsAppCopiedText(text);
    expect(results.length).toBe(1);
    expect(results[0].isValid).toBe(false);
    expect(results[0].errorMessage).toBeDefined();
  });
});

describe('VCF (vCard) Contact Parser', () => {
  it('parses standard vCard with FN, TEL, and EMAIL', () => {
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:Suresh Kumar
TEL;TYPE=CELL:+919876543210
EMAIL;TYPE=HOME:suresh@example.com
END:VCARD`;

    const results = parseVcfText(vcf);
    expect(results.length).toBe(1);
    expect(results[0].fullName).toBe('Suresh Kumar');
    expect(results[0].phoneNormalized).toBe('9876543210');
    expect(results[0].email).toBe('suresh@example.com');
    expect(results[0].isValid).toBe(true);
  });

  it('parses multiple vCards including structured N names', () => {
    const vcf = `BEGIN:VCARD
VERSION:2.1
N:Verma;Anjali;;;
TEL;CELL:+91 98123 45678
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Vikramaditya
TEL;TYPE=VOICE:94400 11223
EMAIL:vikram@test.in
END:VCARD`;

    const results = parseVcfText(vcf);
    expect(results.length).toBe(2);
    expect(results[0].fullName).toBe('Anjali Verma');
    expect(results[0].phoneNormalized).toBe('9812345678');
    expect(results[0].isValid).toBe(true);

    expect(results[1].fullName).toBe('Vikramaditya');
    expect(results[1].phoneNormalized).toBe('9440011223');
    expect(results[1].email).toBe('vikram@test.in');
    expect(results[1].isValid).toBe(true);
  });
});

