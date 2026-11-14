import * as XLSX from 'xlsx';
import { normalizePhoneNumber } from './financial';

export interface ParsedContactResult {
  tempId: string;
  fullName: string;
  phone: string;
  phoneNormalized: string;
  email?: string;
  notes?: string;
  isValid: boolean;
  errorMessage?: string;
  sourceNote?: string;
}

/**
 * Intelligent parser for contacts copied from WhatsApp chats, group participant lists,
 * or clipboard snippets.
 * Never scrapes or accesses WhatsApp directly.
 */
export function parseWhatsAppCopiedText(text: string): ParsedContactResult[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedContactResult[] = [];

  lines.forEach((line, index) => {
    // Ignore automated WhatsApp headers/system messages
    if (
      line.includes('Messages and calls are end-to-end encrypted') ||
      line.includes('created group') ||
      line.includes('added you') ||
      line.includes('security code changed')
    ) {
      return;
    }

    let fullName = '';
    let rawPhone = '';
    let email = '';

    // Pattern 1: "Name: Phone" or "Name - Phone" or "Name, Phone"
    // e.g. "Rajesh Rao: +91 98490 12345" or "Suresh Kumar - 9876543210"
    const colonOrDashMatch = line.match(/^([^:\-,–]+)[:\-,–]\s*([+0-9\s\-()]+)(?:,\s*(.+))?$/);

    // Pattern 2: "Phone - Name" or "+91 98490 12345: Rajesh"
    const phoneFirstMatch = line.match(/^([+0-9\s\-()]{10,20})[:\-,–]\s*(.+)$/);

    // Pattern 3: "Name (+91 98490 12345)"
    const parentheticalMatch = line.match(/^([^(]+)\s*\(([+0-9\s\-()]+)\)$/);

    // Pattern 4: Tab-separated or Comma-separated (e.g. from WhatsApp web copy)
    const delimited = line.split(/[,\t]/).map((s) => s.trim());

    if (colonOrDashMatch && colonOrDashMatch[2].replace(/\D/g, '').length >= 10) {
      fullName = colonOrDashMatch[1].trim();
      rawPhone = colonOrDashMatch[2].trim();
      if (colonOrDashMatch[3] && colonOrDashMatch[3].includes('@')) {
        email = colonOrDashMatch[3].trim();
      }
    } else if (phoneFirstMatch && phoneFirstMatch[1].replace(/\D/g, '').length >= 10) {
      rawPhone = phoneFirstMatch[1].trim();
      fullName = phoneFirstMatch[2].trim();
    } else if (parentheticalMatch && parentheticalMatch[2].replace(/\D/g, '').length >= 10) {
      fullName = parentheticalMatch[1].trim();
      rawPhone = parentheticalMatch[2].trim();
    } else if (delimited.length >= 2) {
      const p1 = delimited[0];
      const p2 = delimited[1];
      const p1Digits = p1.replace(/\D/g, '');
      const p2Digits = p2.replace(/\D/g, '');

      if (p2Digits.length >= 10) {
        fullName = p1;
        rawPhone = p2;
        if (delimited[2] && delimited[2].includes('@')) email = delimited[2];
      } else if (p1Digits.length >= 10) {
        rawPhone = p1;
        fullName = p2;
        if (delimited[2] && delimited[2].includes('@')) email = delimited[2];
      }
    } else {
      // General regex search for a phone number inside the line
      const phoneExtract = line.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,12}/);
      if (phoneExtract) {
        rawPhone = phoneExtract[0];
        fullName = line.replace(phoneExtract[0], '').replace(/[:\-,–()]/g, '').trim();
      } else {
        // Fallback: Could not find 10 digits
        rawPhone = line;
      }
    }

    const normalized = normalizePhoneNumber(rawPhone);
    const isValidPhone = normalized.length >= 10;
    const isValid = isValidPhone && fullName.trim().length > 0;

    let errorMessage: string | undefined;
    if (!isValidPhone) {
      errorMessage = 'Could not detect a valid 10-digit mobile number';
    } else if (!fullName.trim()) {
      errorMessage = 'Subscriber name missing. Please enter name.';
    }

    results.push({
      tempId: `wa-parsed-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
      fullName: fullName || (isValidPhone ? `Member ${normalized.slice(-4)}` : 'Unknown'),
      phone: rawPhone,
      phoneNormalized: normalized,
      email: email || undefined,
      isValid,
      errorMessage,
      sourceNote: 'WhatsApp text entry',
    });
  });

  return results;
}

/**
 * Parses VCF (vCard .vcf) contact files exported from Android, iOS, Google Contacts, or Outlook
 */
export function parseVcfText(vcfText: string): ParsedContactResult[] {
  if (!vcfText || !vcfText.trim()) return [];

  // Unfold lines: RFC 2426/6350 specifies that lines starting with space or tab continue the previous line
  const unfolded = vcfText.replace(/\r?\n[ \t]/g, '');

  // Split by individual vCard blocks
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const results: ParsedContactResult[] = [];

  cards.forEach((card, idx) => {
    const lines = card.split(/\r?\n/);
    let fullName = '';
    let phone = '';
    let email = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.toUpperCase().startsWith('END:VCARD')) continue;

      // Formatted Name (FN:)
      if (!fullName && /^FN(?:;[^:]*)?:/i.test(line)) {
        fullName = line.replace(/^FN(?:;[^:]*)?:/i, '').trim();
      }

      // Structured Name (N: Family;Given;Additional;Prefix;Suffix)
      if (!fullName && /^N(?:;[^:]*)?:/i.test(line)) {
        const parts = line
          .replace(/^N(?:;[^:]*)?:/i, '')
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          fullName = `${parts[1]} ${parts[0]}`.trim();
        } else if (parts.length === 1) {
          fullName = parts[0];
        }
      }

      // Telephone (TEL;...:)
      if (!phone && /^TEL(?:;[^:]*)?:/i.test(line)) {
        phone = line.replace(/^TEL(?:;[^:]*)?:/i, '').trim();
      }

      // Email (EMAIL;...:)
      if (!email && /^EMAIL(?:;[^:]*)?:/i.test(line)) {
        email = line.replace(/^EMAIL(?:;[^:]*)?:/i, '').trim();
      }
    }

    if (!fullName && !phone && !email) return;

    const normalized = normalizePhoneNumber(phone);
    const isValidPhone = normalized.length >= 10;
    const isValid = isValidPhone && fullName.trim().length > 0;

    let errorMessage: string | undefined;
    if (!isValidPhone) {
      errorMessage = 'Invalid or missing phone number in vCard';
    } else if (!fullName.trim()) {
      errorMessage = 'Missing name in vCard';
    }

    results.push({
      tempId: `vcf-card-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      fullName: fullName || (isValidPhone ? `Contact ${normalized.slice(-4)}` : 'Unknown'),
      phone,
      phoneNormalized: normalized,
      email: email || undefined,
      isValid,
      errorMessage,
      sourceNote: 'vCard (.vcf) import',
    });
  });

  return results;
}

/**
 * Universal file parser supporting .vcf (vCard), .csv, .xlsx, and .xls files
 */
export async function parseContactsFile(file: File): Promise<{
  rows: ParsedContactResult[];
  detectedColumns: { nameCol?: string; phoneCol?: string; emailCol?: string };
  totalFound: number;
  validCount: number;
}> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.vcf') || file.type.includes('vcard')) {
    const text = await file.text();
    const rows = parseVcfText(text);
    return {
      rows,
      detectedColumns: { nameCol: 'FN', phoneCol: 'TEL', emailCol: 'EMAIL' },
      totalFound: rows.length,
      validCount: rows.filter((r) => r.isValid).length,
    };
  }

  return parseExcelOrCsvFile(file);
}

/**
 * Parses Excel (.xlsx, .xls) and CSV files into previewable subscriber rows
 * with automatic column header detection
 */
export async function parseExcelOrCsvFile(file: File): Promise<{
  rows: ParsedContactResult[];
  detectedColumns: { nameCol?: string; phoneCol?: string; emailCol?: string };
  totalFound: number;
  validCount: number;
}> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON array of objects
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawJson.length === 0) {
    return { rows: [], detectedColumns: {}, totalFound: 0, validCount: 0 };
  }

  // Find column headers matching Name, Phone, Email
  const sampleRow = rawJson[0];
  const keys = Object.keys(sampleRow);

  let nameCol = keys.find((k) => /name|subscriber|member|customer/i.test(k));
  let phoneCol = keys.find((k) => /phone|mobile|contact|cell|tel|number/i.test(k));
  let emailCol = keys.find((k) => /email|mail/i.test(k));

  // Fallbacks if not detected by regex
  if (!nameCol && keys.length > 0) nameCol = keys[0];
  if (!phoneCol && keys.length > 1) phoneCol = keys[1];
  if (!emailCol && keys.length > 2) emailCol = keys[2];

  const parsedList: ParsedContactResult[] = [];

  rawJson.forEach((row, idx) => {
    const rawName = String(row[nameCol || ''] || '').trim();
    const rawPhone = String(row[phoneCol || ''] || '').trim();
    const rawEmail = String(row[emailCol || ''] || '').trim();

    // Skip empty rows
    if (!rawName && !rawPhone) return;

    const normalized = normalizePhoneNumber(rawPhone);
    const isValidPhone = normalized.length >= 10;
    const isValid = isValidPhone && rawName.length > 0;

    let errorMessage: string | undefined;
    if (!isValidPhone) {
      errorMessage = 'Invalid phone number (must contain at least 10 digits)';
    } else if (!rawName) {
      errorMessage = 'Name is required';
    }

    parsedList.push({
      tempId: `file-row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      fullName: rawName || 'Subscriber',
      phone: rawPhone,
      phoneNormalized: normalized,
      email: rawEmail || undefined,
      isValid,
      errorMessage,
      sourceNote: `${file.name} (Row ${idx + 2})`,
    });
  });

  const validCount = parsedList.filter((r) => r.isValid).length;

  return {
    rows: parsedList,
    detectedColumns: { nameCol, phoneCol, emailCol },
    totalFound: parsedList.length,
    validCount,
  };
}

/**
 * Check whether the native Contact Picker API is supported in the current browser
 */
export function isContactPickerSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return Boolean(
    'contacts' in navigator &&
    (navigator as any).contacts &&
    typeof (navigator as any).contacts.select === 'function'
  );
}


