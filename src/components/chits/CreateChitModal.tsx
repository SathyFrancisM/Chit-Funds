import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Check, Info, Eye, Layers } from 'lucide-react';
import { ChitScheme, ChitStatus } from '../../types';
import { calculateMaturityDate, formatCurrency, generateInstallmentSchedule } from '../../utils/financial';

interface CreateChitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => void;
  existingSchemes: ChitScheme[];
}

export const CreateChitModal: React.FC<CreateChitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingSchemes,
}) => {
  const [name, setName] = useState('');
  const [schemeCode, setSchemeCode] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(25);
  const [monthlyAmount, setMonthlyAmount] = useState(10000);
  const [totalSeats, setTotalSeats] = useState(25);
  const [dueDay, setDueDay] = useState(3);
  const [shufflingDate, setShufflingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [schemeRules, setSchemeRules] = useState('');
  const [status, setStatus] = useState<ChitStatus>('active');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate unique scheme code on open
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const codeSeq = String(existingSchemes.length + 1).padStart(2, '0');
      setSchemeCode(`CF-${year}-${codeSeq}`);
      setError(null);
      setShowPreview(false);
    }
  }, [isOpen, existingSchemes.length]);

  if (!isOpen) return null;

  // Planned maturity date computed with calendar-month arithmetic
  const calculatedMaturityDate = calculateMaturityDate(startDate, durationMonths, dueDay);
  const totalPotAmount = monthlyAmount * durationMonths * totalSeats;

  // Schedule preview
  const previewSchedule = generateInstallmentSchedule(startDate, durationMonths, dueDay, monthlyAmount, totalSeats);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a descriptive scheme name.');
      return;
    }

    if (!schemeCode.trim()) {
      setError('Scheme code is mandatory.');
      return;
    }

    // Check duplicate code
    if (existingSchemes.some((s) => s.scheme_code.toLowerCase() === schemeCode.trim().toLowerCase())) {
      setError(`Scheme code "${schemeCode}" is already taken by another chit scheme.`);
      return;
    }

    if (durationMonths <= 0 || durationMonths > 120) {
      setError('Duration must be between 1 and 120 months.');
      return;
    }

    if (monthlyAmount <= 0) {
      setError('Monthly installment amount must be greater than zero.');
      return;
    }

    if (totalSeats <= 0) {
      setError('Total seats must be at least 1.');
      return;
    }

    if (dueDay < 1 || dueDay > 28) {
      setError('Due day must be between 1 and 28 of the calendar month.');
      return;
    }

    onSubmit({
      name: name.trim(),
      scheme_code: schemeCode.trim().toUpperCase(),
      start_date: startDate,
      duration_months: Number(durationMonths),
      installment_frequency: 'monthly',
      monthly_installment_amount: Number(monthlyAmount),
      total_pot_amount: totalPotAmount,
      total_seats: Number(totalSeats),
      due_day: Number(dueDay),
      shuffling_date: shufflingDate.trim() || undefined,
      planned_maturity_date: calculatedMaturityDate,
      notes: notes.trim() || undefined,
      scheme_rules: schemeRules.trim() || undefined,
      currency: 'INR',
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Create New Chit Scheme</h2>
              <p className="text-xs text-neutral-500">Configure scheme parameters, schedule & terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheme Name */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Scheme Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sri Lakshmi 25L Fortune Chit"
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Scheme Code */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Scheme Code / Reference *
              </label>
              <input
                type="text"
                required
                value={schemeCode}
                onChange={(e) => setSchemeCode(e.target.value)}
                className="w-full text-xs font-mono uppercase bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Duration (Months) *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                required
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Due Day */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Due Day of Month *
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Chit Shuffling Date */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Chit Shuffling Date
              </label>
              <input
                type="date"
                value={shufflingDate}
                onChange={(e) => setShufflingDate(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Installment per seat */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Monthly Amount per Seat (INR ₹) *
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            {/* Total Seats */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Total Seats / Members *
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalSeats}
                onChange={(e) => setTotalSeats(Number(e.target.value))}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Computed Summary Box */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-neutral-500 block text-[11px]">Total Pot Value</span>
              <span className="font-bold text-base text-[#111111]">{formatCurrency(totalPotAmount)}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[11px]">Planned Maturity Date</span>
              <span className="font-semibold text-neutral-800">{calculatedMaturityDate || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[11px]">Total Installments</span>
              <span className="font-semibold text-neutral-800">{durationMonths} monthly cycles</span>
            </div>
          </div>

          {/* Scheme Rules & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Scheme Rules & Auction Terms (Optional)
              </label>
              <textarea
                rows={2}
                value={schemeRules}
                onChange={(e) => setSchemeRules(e.target.value)}
                placeholder="e.g. 5% foreman commission, reverse auction discount cap 30%"
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Internal Administrative Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for staff..."
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Status selector */}
          <div className="flex items-center space-x-4 pt-1">
            <span className="text-xs font-semibold text-[#111111]">Scheme Status:</span>
            <label className="flex items-center space-x-1.5 text-xs text-neutral-800 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="text-[#111111] focus:ring-neutral-900"
              />
              <span>Active (Enrolling)</span>
            </label>
            <label className="flex items-center space-x-1.5 text-xs text-neutral-800 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="text-[#111111] focus:ring-neutral-900"
              />
              <span>Save as Draft</span>
            </label>
          </div>

          {/* Schedule Preview Toggle */}
          <div className="pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-semibold text-neutral-700 hover:text-[#111111] flex items-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Hide Schedule Preview' : 'Show Schedule Preview (All Months)'}</span>
            </button>

            {showPreview && (
              <div className="mt-3 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 font-semibold sticky top-0 border-b border-neutral-200">
                    <tr>
                      <th className="px-3 py-2">Inst #</th>
                      <th className="px-3 py-2">Due Date</th>
                      <th className="px-3 py-2 text-right">Per Seat</th>
                      <th className="px-3 py-2 text-right">Total Pool</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {previewSchedule.map((inst) => (
                      <tr key={inst.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-1.5 font-medium">Month {inst.installment_no}</td>
                        <td className="px-3 py-1.5 text-neutral-600">{inst.due_date}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(inst.expected_per_member)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(inst.expected_total_pool)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg transition-colors shadow-sm"
            >
              Create Scheme
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
