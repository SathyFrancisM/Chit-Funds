import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { CompanyMember } from '../../types';
import { normalizePhoneNumber } from '../../utils/financial';
import { parseContactsFile } from '../../utils/contactParser';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (members: Array<Omit<CompanyMember, 'id' | 'company_id' | 'phone_normalized' | 'created_at' | 'updated_at'>>) => void;
  existingMembers: CompanyMember[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingMembers,
}) => {
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [csvText, setCsvText] = useState(
    'Full Name, Phone, Email, Address\n' +
    'Naveen Kumar, 9848012345, naveen@example.com, Hyderabad\n' +
    'Prasanna Devi, 9701234567, prasanna@example.com, Secunderabad'
  );
  const [parsedRows, setParsedRows] = useState<Array<any>>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    setFileName(file.name);

    try {
      const res = await parseContactsFile(file);
      const existingPhones = new Set(existingMembers.map((m) => m.phone_normalized));

      const rows: any[] = [];
      res.rows.forEach((r) => {
        if (r.isValid && !existingPhones.has(r.phoneNormalized)) {
          existingPhones.add(r.phoneNormalized);
          rows.push({
            full_name: r.fullName,
            phone: r.phone,
            email: r.email,
            kyc_status: 'verified',
          });
        }
      });

      if (rows.length === 0) {
        setError('No valid unique subscribers found in the uploaded file (or all were already registered).');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setError('Failed to parse file: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = () => {
    setError(null);
    try {
      const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setError('CSV must contain a header and at least one member row.');
        return;
      }

      const rows: Array<any> = [];
      const existingPhones = new Set(existingMembers.map((m) => m.phone_normalized));

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          const fullName = parts[0];
          const rawPhone = parts[1];
          const email = parts[2] || '';
          const address = parts[3] || '';
          const normalized = normalizePhoneNumber(rawPhone);

          if (normalized.length >= 10 && !existingPhones.has(normalized)) {
            existingPhones.add(normalized);
            rows.push({
              full_name: fullName,
              phone: rawPhone,
              email: email || undefined,
              address: address || undefined,
              kyc_status: 'verified',
            });
          }
        }
      }

      if (rows.length === 0) {
        setError('No valid unique members found in the entered CSV. Ensure 10-digit phone numbers and no duplicates.');
        return;
      }

      setParsedRows(rows);
    } catch (err: any) {
      setError('Failed to parse CSV: ' + err.message);
    }
  };

  const handleConfirm = () => {
    if (parsedRows.length > 0) {
      onImport(parsedRows);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Bulk Import Subscribers (Excel & CSV)</h2>
              <p className="text-xs text-neutral-500">Upload spreadsheet or paste CSV rows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode switch */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              onClick={() => { setMode('file'); setParsedRows([]); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                mode === 'file' ? 'bg-[#111111] text-white' : 'bg-neutral-100 text-neutral-600 hover:text-[#111111]'
              }`}
            >
              Upload Excel / CSV File
            </button>
            <button
              type="button"
              onClick={() => { setMode('paste'); setParsedRows([]); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                mode === 'paste' ? 'bg-[#111111] text-white' : 'bg-neutral-100 text-neutral-600 hover:text-[#111111]'
              }`}
            >
              Paste CSV Text
            </button>
          </div>

          {mode === 'file' ? (
            <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center bg-neutral-50 hover:border-neutral-900 transition-colors">
              <input
                type="file"
                id="bulk-import-file"
                accept=".xlsx, .xls, .csv, .vcf, text/vcard"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="bulk-import-file" className="cursor-pointer block space-y-2">
                <Upload className="w-6 h-6 mx-auto text-neutral-500" />
                <span className="text-xs font-semibold text-[#111111] block">
                  {fileName ? fileName : 'Click to select VCF (vCard), CSV, or Excel file'}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Supports phone vCards (.vcf), Excel (.xlsx, .xls), and CSV. Matched: Name, Phone, Email
                </span>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                CSV Format: Full Name, Phone, Email, Address
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full text-xs font-mono bg-neutral-50 border border-neutral-300 rounded-lg p-3 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg text-[#111111]"
                >
                  Parse CSV Text
                </button>
              </div>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold flex items-center justify-between">
                <span>Ready to import {parsedRows.length} unique subscribers</span>
                <CheckCircle2 className="w-4 h-4 text-[#111111]" />
              </div>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 text-neutral-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5">Name</th>
                      <th className="px-3 py-1.5">Phone</th>
                      <th className="px-3 py-1.5">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-medium">{r.full_name}</td>
                        <td className="px-3 py-1.5 font-mono">{r.phone}</td>
                        <td className="px-3 py-1.5 text-neutral-500">{r.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] disabled:bg-neutral-300 disabled:text-neutral-500 text-white rounded-lg transition-colors shadow-sm"
            >
              Save {parsedRows.length > 0 ? `${parsedRows.length} Subscribers` : ''} to Directory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
