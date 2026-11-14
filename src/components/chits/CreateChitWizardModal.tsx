import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Smartphone,
  Upload,
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Edit2,
  Info,
  Check,
  FileSpreadsheet,
  Contact,
  HelpCircle,
  Eye,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  PendingChitMember,
  ContactSourceType,
  ChitStatus,
} from '../../types';
import {
  calculateMaturityDate,
  formatCurrency,
  generateInstallmentSchedule,
  normalizePhoneNumber,
  formatOrdinalDay,
} from '../../utils/financial';
import {
  parseWhatsAppCopiedText,
  parseContactsFile,
  ParsedContactResult,
  isContactPickerSupported,
} from '../../utils/contactParser';

interface CreateChitWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSchemes: ChitScheme[];
  existingMembers: CompanyMember[];
  onSaveChitWithMembers: (
    schemeData: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    pendingMembers: PendingChitMember[]
  ) => ChitScheme;
  onChitCreated: (newChitId: string) => void;
}

export const CreateChitWizardModal: React.FC<CreateChitWizardModalProps> = ({
  isOpen,
  onClose,
  existingSchemes,
  existingMembers,
  onSaveChitWithMembers,
  onChitCreated,
}) => {
  // Wizard Step: 1 = Details, 2 = Add Members, 3 = Review List, 4 = Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Scheme Details
  const [name, setName] = useState('');
  const [schemeCode, setSchemeCode] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [dueDay, setDueDay] = useState(3);
  const [shufflingDate, setShufflingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [schemeRules, setSchemeRules] = useState('');
  const [status, setStatus] = useState<ChitStatus>('active');

  // Step 2 & 3: Selected Members List
  const [selectedMembers, setSelectedMembers] = useState<PendingChitMember[]>([]);
  const [activeImportTab, setActiveImportTab] = useState<'picker' | 'whatsapp' | 'file' | 'existing'>('picker');

  // WhatsApp Tab State
  const [waMode, setWaMode] = useState<'single' | 'bulk'>('single');
  const [waSingleName, setWaSingleName] = useState('');
  const [waSinglePhone, setWaSinglePhone] = useState('');
  const [waBulkText, setWaBulkText] = useState('');
  const [waParsedRows, setWaParsedRows] = useState<ParsedContactResult[]>([]);

  // File Import State (CSV / Excel)
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileParsedRows, setFileParsedRows] = useState<ParsedContactResult[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Existing Directory Search
  const [existingSearch, setExistingSearch] = useState('');

  // General Validation Error
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Check browser contact picker support
  const isPickerSupported = isContactPickerSupported();
  const [pickerSuccessMessage, setPickerSuccessMessage] = useState<string | null>(null);
  const [pickerFallbackTab, setPickerFallbackTab] = useState<'manual' | 'file'>('manual');
  const [pickerManualName, setPickerManualName] = useState('');
  const [pickerManualPhone, setPickerManualPhone] = useState('');
  const [pickerManualEmail, setPickerManualEmail] = useState('');
  const [pickerFileRows, setPickerFileRows] = useState<ParsedContactResult[]>([]);
  const [pickerFileName, setPickerFileName] = useState<string | null>(null);
  const [isParsingPickerFile, setIsParsingPickerFile] = useState(false);

  // Initialize unique scheme code on open
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const codeSeq = String(existingSchemes.length + 1).padStart(2, '0');
      setSchemeCode(`CF-${year}-${codeSeq}`);
      setCurrentStep(1);
      setSelectedMembers([]);
      setWizardError(null);
      setPickerSuccessMessage(null);
      setPickerManualName('');
      setPickerManualPhone('');
      setPickerManualEmail('');
      setPickerFileRows([]);
      setPickerFileName(null);
      setWaBulkText('');
      setWaParsedRows([]);
      setFileParsedRows([]);
      setUploadedFileName(null);
      setDueDay(3);
      setShufflingDate('');
    }
  }, [isOpen, existingSchemes.length]);

  // 4. Existing Directory Handlers — useMemo must be above early return (Rules of Hooks)
  const filteredExistingMembers = useMemo(() => {
    const q = existingSearch.toLowerCase().trim();
    return existingMembers.filter((m) => {
      if (!q) return true;
      return (
        m.full_name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.phone_normalized.includes(q)
      );
    });
  }, [existingMembers, existingSearch]);

  const selectedPhonesInScheme = useMemo(() => {
    return new Set(selectedMembers.map((m) => m.phoneNormalized));
  }, [selectedMembers]);

  if (!isOpen) return null;

  // Calculated values
  const calculatedMaturityDate = calculateMaturityDate(startDate, durationMonths, dueDay);
  const totalPotAmount = monthlyAmount * durationMonths * totalSeats;
  const schedulePreview = generateInstallmentSchedule(startDate, durationMonths, dueDay, monthlyAmount, totalSeats);

  // Helper to add contacts to selection list with duplicate phone checking
  const addContactsToSelection = (
    contacts: Array<{
      fullName: string;
      phone: string;
      email?: string;
      notes?: string;
      source: ContactSourceType;
      memberId?: string;
    }>
  ) => {
    setWizardError(null);
    const updatedList = [...selectedMembers];
    const existingPhonesInScheme = new Set(updatedList.map((m) => m.phoneNormalized));

    let addedCount = 0;
    let duplicateCount = 0;

    contacts.forEach((c) => {
      const normalized = normalizePhoneNumber(c.phone);
      if (!normalized || normalized.length < 10) return;

      if (existingPhonesInScheme.has(normalized)) {
        duplicateCount++;
        return;
      }

      existingPhonesInScheme.add(normalized);

      // Check if matches an existing company directory member
      const matchedExisting = existingMembers.find((m) => m.phone_normalized === normalized);

      const nextSeatNumber = updatedList.length + 1;
      const newDraft: PendingChitMember = {
        tempId: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        memberId: c.memberId || matchedExisting?.id,
        fullName: matchedExisting?.full_name || c.fullName.trim() || `Subscriber ${normalized.slice(-4)}`,
        phone: c.phone.trim(),
        phoneNormalized: normalized,
        email: matchedExisting?.email || c.email?.trim() || undefined,
        notes: c.notes?.trim() || undefined,
        seatNumber: nextSeatNumber,
        expectedMonthlyContribution: monthlyAmount,
        source: c.source,
        isExistingMember: Boolean(matchedExisting || c.memberId),
      };

      updatedList.push(newDraft);
      addedCount++;
    });

    setSelectedMembers(updatedList);

    if (duplicateCount > 0) {
      setWizardError(`Added ${addedCount} contacts. (${duplicateCount} duplicate contacts were already in this scheme and skipped).`);
    }
  };

  // 1. Phone Contact Picker Handler (Native Contact Picker API)
  const handleSelectPhoneContacts = async () => {
    setWizardError(null);
    setPickerSuccessMessage(null);

    const hasContactApi =
      typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      typeof (navigator as any).contacts?.select === 'function';

    if (!hasContactApi) {
      const isSecure = typeof window !== 'undefined' && window.isSecureContext;
      if (!isSecure) {
        setWizardError(
          'Mobile Contact Picker requires HTTPS. Please open the link starting with https:// (tap "Advanced" -> "Proceed" if you see a security warning on your Wi-Fi).'
        );
      } else {
        setWizardError(
          'The Contact Picker API is supported in Chrome on Android. If using an iPhone/Safari or another browser, please enter the name and phone number in the form below.'
        );
      }
      return;
    }

    try {
      const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      if (contacts && contacts.length > 0) {
        const formatted = contacts
          .map((c: any) => {
            const rawName = Array.isArray(c.name) && c.name.length > 0 ? c.name[0] : '';
            const rawPhone = Array.isArray(c.tel) && c.tel.length > 0 ? c.tel[0] : '';
            const rawEmail = Array.isArray(c.email) && c.email.length > 0 ? c.email[0] : undefined;
            return {
              fullName: rawName.trim() || 'Contact',
              phone: rawPhone.trim(),
              email: rawEmail?.trim() || undefined,
              source: 'contact_picker' as ContactSourceType,
            };
          })
          .filter((c: any) => c.phone.length > 0);

        if (formatted.length > 0) {
          addContactsToSelection(formatted);
          setPickerSuccessMessage(
            `Successfully imported ${formatted.length} contact${formatted.length > 1 ? 's' : ''} from phone contacts.`
          );
        } else {
          setWizardError('Selected phone contacts did not include valid phone numbers.');
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User dismissed the native dialog
        return;
      }
      console.warn('Contact picker error:', err);
      setWizardError(err.message || 'Contact selection failed.');
    }
  };

  // Fallback 1: Quick Manual Entry inside Phone Contacts Tab
  const handlePickerManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);
    const normalized = normalizePhoneNumber(pickerManualPhone);
    if (!normalized || normalized.length < 10) {
      setWizardError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!pickerManualName.trim()) {
      setWizardError('Member name is required.');
      return;
    }

    addContactsToSelection([
      {
        fullName: pickerManualName.trim(),
        phone: pickerManualPhone.trim(),
        email: pickerManualEmail.trim() || undefined,
        source: 'contact_picker' as ContactSourceType,
      },
    ]);

    setPickerManualName('');
    setPickerManualPhone('');
    setPickerManualEmail('');
  };

  // Fallback 2: CSV / VCF (vCard) File Import inside Phone Contacts Tab
  const handlePickerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsingPickerFile(true);
      setWizardError(null);
      setPickerFileName(file.name);

      const res = await parseContactsFile(file);
      setPickerFileRows(res.rows);
      if (res.rows.length === 0) {
        setWizardError('No contacts found in uploaded file. Please check file format.');
      }
    } catch (err: any) {
      setWizardError('Failed to parse file: ' + err.message);
    } finally {
      setIsParsingPickerFile(false);
    }
  };

  const handleConfirmPickerFileRows = () => {
    const validRows = pickerFileRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setWizardError('No valid contacts to import.');
      return;
    }

    addContactsToSelection(
      validRows.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        source: 'contact_picker' as ContactSourceType,
      }))
    );

    setPickerFileRows([]);
    setPickerFileName(null);
  };

  // 2. WhatsApp Handlers
  const handleAddSingleWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(waSinglePhone);
    if (!normalized || normalized.length < 10) {
      setWizardError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!waSingleName.trim()) {
      setWizardError('Subscriber name is required.');
      return;
    }

    addContactsToSelection([
      {
        fullName: waSingleName.trim(),
        phone: waSinglePhone.trim(),
        source: 'whatsapp',
      },
    ]);

    setWaSingleName('');
    setWaSinglePhone('');
  };

  const handleParseWhatsAppBulk = () => {
    setWizardError(null);
    if (!waBulkText.trim()) {
      setWizardError('Please paste WhatsApp copied text into the box.');
      return;
    }

    const parsed = parseWhatsAppCopiedText(waBulkText);
    if (parsed.length === 0) {
      setWizardError('Could not detect any phone numbers in the pasted text. Please verify formatting.');
      return;
    }

    setWaParsedRows(parsed);
  };

  const handleConfirmWhatsAppBulk = () => {
    const validRows = waParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setWizardError('No valid contacts to add.');
      return;
    }

    addContactsToSelection(
      validRows.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        source: 'whatsapp',
      }))
    );

    setWaParsedRows([]);
    setWaBulkText('');
  };

  // 3. File Import Handlers (Excel / CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsingFile(true);
      setWizardError(null);
      setUploadedFileName(file.name);

      const res = await parseContactsFile(file);
      setFileParsedRows(res.rows);
      if (res.rows.length === 0) {
        setWizardError('No rows found in the uploaded file.');
      }
    } catch (err: any) {
      setWizardError('Failed to parse file: ' + err.message);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleConfirmFileRows = () => {
    const validRows = fileParsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setWizardError('No valid contacts to import.');
      return;
    }

    addContactsToSelection(
      validRows.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        source: 'csv_excel',
      }))
    );

    setFileParsedRows([]);
    setUploadedFileName(null);
  };

  // 4. Existing Directory Handlers

  // Step 1 Validation -> Proceed to Step 2
  const handleProceedToMembers = (e?: React.FormEvent) => {
    e?.preventDefault();
    setWizardError(null);

    if (monthlyAmount <= 0) {
      setWizardError('Please enter the Scheme Price / Monthly Installment amount.');
      return;
    }
    if (durationMonths <= 0 || durationMonths > 120) {
      setWizardError('Please enter a valid Duration between 1 and 120 months.');
      return;
    }

    const effectiveName = name.trim() || `Chit Scheme ₹${monthlyAmount.toLocaleString('en-IN')}`;
    if (!name.trim()) {
      setName(effectiveName);
    }

    const effectiveSeats = totalSeats > 0 ? totalSeats : durationMonths;
    if (totalSeats <= 0) {
      setTotalSeats(effectiveSeats);
    }

    if (!schemeCode.trim()) {
      setWizardError('Scheme code is required.');
      return;
    }
    if (existingSchemes.some((s) => s.scheme_code.toLowerCase() === schemeCode.trim().toLowerCase())) {
      setWizardError(`Scheme code "${schemeCode}" is already in use by another chit scheme.`);
      return;
    }

    setCurrentStep(2);
  };

  // Final Confirmation & Atomic Persistence
  const handleFinalSave = () => {
    setWizardError(null);

    try {
      const schemeData: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'> = {
        name: name.trim(),
        scheme_code: schemeCode.trim().toUpperCase(),
        start_date: startDate,
        duration_months: Number(durationMonths),
        installment_frequency: 'monthly',
        monthly_installment_amount: Number(monthlyAmount),
        total_pot_amount: totalPotAmount,
        total_seats: Number(totalSeats),
        due_day: Number(dueDay) >= 1 && Number(dueDay) <= 28 ? Number(dueDay) : 3,
        shuffling_date: shufflingDate.trim() || undefined,
        planned_maturity_date: calculatedMaturityDate,
        notes: notes.trim() || undefined,
        scheme_rules: schemeRules.trim() || undefined,
        currency: 'INR',
        status,
      };

      const newChit = onSaveChitWithMembers(schemeData, selectedMembers);
      onClose();
      onChitCreated(newChit.id);
    } catch (err: any) {
      setWizardError(err.message || 'Failed to save chit scheme');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Wizard Header with Step Indicator */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-[#111111] text-white">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-[#111111]">Create New Chit Scheme</h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Step {currentStep} of 4: {
                currentStep === 1
                  ? 'Scheme Parameters'
                  : currentStep === 2
                  ? 'Add Members from Sources'
                  : currentStep === 3
                  ? 'Review Enrolled Members'
                  : 'Confirm & Save'
              }
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Steps Bar */}
        <div className="grid grid-cols-4 border-b border-neutral-200 text-center text-xs font-semibold shrink-0">
          {[
            { step: 1, label: '1. Parameters' },
            { step: 2, label: `2. Add Members (${selectedMembers.length})` },
            { step: 3, label: '3. Review Seats' },
            { step: 4, label: '4. Save & Confirm' },
          ].map((item) => (
            <div
              key={item.step}
              className={`py-2.5 border-b-2 transition-colors ${
                currentStep === item.step
                  ? 'border-[#111111] text-[#111111] bg-neutral-50/80 font-bold'
                  : currentStep > item.step
                  ? 'border-neutral-900 text-neutral-800'
                  : 'border-transparent text-neutral-400'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {wizardError && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{wizardError}</span>
            </div>
          )}

          {/* ================= STEP 1: SCHEME DETAILS ================= */}
          {currentStep === 1 && (
            <form id="step1-form" onSubmit={handleProceedToMembers} className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Scheme Price (Monthly Installment ₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="100"
                      required
                      placeholder="e.g. 10000"
                      value={monthlyAmount || ''}
                      onChange={(e) => {
                        const amt = Number(e.target.value);
                        setMonthlyAmount(amt);
                      }}
                      className="w-full text-base font-bold bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-[#111111] focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Amount paid per month by each subscriber
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1">
                      Time Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      placeholder="e.g. 25"
                      value={durationMonths || ''}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setDurationMonths(d);
                        setTotalSeats(d);
                      }}
                      className="w-full text-base font-bold bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-[#111111] focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Total scheme duration (also sets {durationMonths || 0} seats)
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional scheme attributes */}
              <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-3">
                <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Optional Settings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Scheme Name <span className="text-neutral-400 font-normal">(Auto-generated if empty)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={monthlyAmount ? `Chit Scheme ₹${monthlyAmount.toLocaleString('en-IN')}` : 'e.g. Gold Scheme 2026'}
                      className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Chit Shuffling Date
                    </label>
                    <input
                      type="date"
                      value={shufflingDate}
                      onChange={(e) => setShufflingDate(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Manual date for chit shuffling / lucky draw / auction
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Due Day of Month (1-28) *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="28"
                        required
                        value={dueDay || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? ('' as any) : Number(e.target.value);
                          setDueDay(val);
                        }}
                        placeholder="3"
                        className="w-20 text-xs font-bold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-neutral-700">
                        {dueDay ? `${formatOrdinalDay(Number(dueDay))} of every month` : 'Enter day (1-28)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ================= STEP 2: ADD MEMBERS FROM CONTACTS ================= */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Add Members ({selectedMembers.length} of {totalSeats} seats filled)
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Add members directly from your mobile phone contacts or using the quick form below.
                  </p>
                </div>
                {selectedMembers.length > 0 && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-3 py-1.5 bg-[#111111] text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Review ({selectedMembers.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Primary: Mobile Contact Picker Button */}
              <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#111111] text-white rounded-xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111111]">Access Phone Contacts</h4>
                    <p className="text-xs text-neutral-500">
                      Tap the button below to open your mobile phone contacts and pick subscribers.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSelectPhoneContacts}
                  className="w-full py-3.5 bg-[#111111] hover:bg-[#262626] text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Contact className="w-5 h-5" />
                  <span>Add Member from Mobile Contacts</span>
                </button>

                {pickerSuccessMessage && (
                  <div className="p-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0" />
                    <span>{pickerSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* Fallback: Manual Entry */}
              <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Add Manually
                </h4>
                <form onSubmit={handlePickerManualAdd} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Member Name *</label>
                      <input
                        type="text"
                        required
                        value={pickerManualName}
                        onChange={(e) => setPickerManualName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={pickerManualPhone}
                        onChange={(e) => setPickerManualPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Added members mini-list */}
              {selectedMembers.length > 0 && (
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-[#111111]">
                    Added Members ({selectedMembers.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-neutral-100">
                    {selectedMembers.map((m, i) => (
                      <div key={m.tempId} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-[#111111]">{m.fullName}</span>
                          <span className="ml-2 text-neutral-500 font-mono">{m.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-neutral-400 text-[10px]">Seat #{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedMembers(selectedMembers.filter((_, idx) => idx !== i))}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ================= STEP 3: REVIEW SELECTED MEMBERS ================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Review Enrolled Members ({selectedMembers.length} of {totalSeats} seats)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Verify seat numbers and expected monthly contributions before finalizing
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 rounded-lg text-xs font-semibold text-[#111111] flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Contacts</span>
                </button>
              </div>

              {selectedMembers.length === 0 ? (
                <div className="p-10 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <p>No members have been added to this chit yet.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-[#111111] text-white rounded-lg text-xs font-semibold"
                  >
                    Go Back & Add Members
                  </button>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold sticky top-0 text-[11px]">
                        <tr>
                          <th className="px-4 py-2.5">Seat #</th>
                          <th className="px-4 py-2.5">Subscriber Name</th>
                          <th className="px-4 py-2.5">Phone Number</th>
                          <th className="px-4 py-2.5">Source</th>
                          <th className="px-4 py-2.5 text-right">Monthly Due</th>
                          <th className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-800">
                        {selectedMembers.map((member, index) => (
                          <tr key={member.tempId} className="hover:bg-neutral-50">
                            <td className="px-4 py-2.5 font-mono font-bold text-neutral-900">
                              #{member.seatNumber || (index + 1)}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-[#111111]">
                              {member.fullName}
                              {member.isExistingMember && (
                                <span className="ml-1.5 text-[9px] uppercase px-1 py-0.2 bg-neutral-200 text-neutral-800 rounded font-bold">
                                  Existing
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-neutral-600">
                              {member.phone}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-800 border border-neutral-200">
                                {member.source.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-[#111111]">
                              {formatCurrency(member.expectedMonthlyContribution)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMembers(selectedMembers.filter((_, i) => i !== index));
                                }}
                                className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
                                title="Remove from this scheme"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 4: CONFIRM & SAVE ================= */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <h3 className="text-sm font-bold text-[#111111]">
                  Chit Scheme Summary Confirmation
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Scheme Name</span>
                    <span className="font-bold text-[#111111]">{name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Scheme Code</span>
                    <span className="font-mono font-bold text-[#111111]">{schemeCode}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Total Pot Pool</span>
                    <span className="font-bold text-[#111111]">{formatCurrency(totalPotAmount)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Duration</span>
                    <span className="font-semibold text-neutral-800">{durationMonths} months</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Start Date</span>
                    <span className="font-semibold text-neutral-800">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Planned Maturity</span>
                    <span className="font-semibold text-neutral-800">{calculatedMaturityDate}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px]">Monthly Due / Seat</span>
                    <span className="font-semibold text-neutral-800">{formatCurrency(monthlyAmount)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[11px] mb-0.5">Due Day</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min="1"
                        max="28"
                        required
                        value={dueDay || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? ('' as any) : Number(e.target.value);
                          setDueDay(val);
                        }}
                        className="w-14 px-2 py-1 text-xs font-bold border border-neutral-300 rounded bg-white text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                      />
                      <span className="font-semibold text-neutral-800 text-[11px]">
                        {dueDay ? `${formatOrdinalDay(Number(dueDay))} of month` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className="text-neutral-500 block text-[11px] mb-0.5">Chit Shuffling Date</span>
                    <input
                      type="date"
                      value={shufflingDate}
                      onChange={(e) => setShufflingDate(e.target.value)}
                      placeholder="Select / enter shuffling date"
                      className="w-full max-w-[200px] px-2 py-1 text-xs font-semibold border border-neutral-300 rounded bg-white text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-300 text-xs space-y-1">
                <span className="font-bold text-[#111111] block">
                  Enrolled Subscribers ({selectedMembers.length} Members)
                </span>
                <p className="text-neutral-700 text-[11px] leading-relaxed">
                  Upon saving, the chit scheme will be activated and all {selectedMembers.length} selected subscribers will be assigned seats.
                  No automatic payments or transactions will be created until explicitly recorded by company staff.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 rounded-lg flex items-center space-x-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleProceedToMembers}
                className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>Proceed to Add Members</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>Review Selected Members ({selectedMembers.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>Proceed to Confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleFinalSave}
                className="px-6 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Create Scheme & Enroll Members</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
