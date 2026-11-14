import React, { useState, useMemo } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ChitScheme, CompanyMember, ChitMembership } from '../../types';
import { formatCurrency } from '../../utils/financial';

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  chit: ChitScheme;
  allMembers: CompanyMember[];
  existingMemberships: ChitMembership[];
  onAssign: (memberId: string, seatNumber: number, contribution: number) => void;
  onOpenCreateMember: () => void;
}

export const AssignMemberModal: React.FC<AssignMemberModalProps> = ({
  isOpen,
  onClose,
  chit,
  allMembers,
  existingMemberships,
  onAssign,
  onOpenCreateMember,
}) => {
  const chitMemberships = useMemo(
    () => existingMemberships.filter((m) => m.chit_id === chit.id && m.is_active),
    [existingMemberships, chit.id]
  );

  const occupiedSeats = useMemo(() => new Set(chitMemberships.map((m) => m.seat_number)), [chitMemberships]);

  // Find next available seat number
  const nextAvailableSeat = useMemo(() => {
    for (let i = 1; i <= chit.total_seats; i++) {
      if (!occupiedSeats.has(i)) return i;
    }
    return 1;
  }, [chit.total_seats, occupiedSeats]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(allMembers[0]?.id || '');
  const [seatNumber, setSeatNumber] = useState<number>(nextAvailableSeat);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(chit.monthly_installment_amount);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Please select a subscriber.');
      return;
    }

    if (occupiedSeats.has(Number(seatNumber))) {
      setError(`Seat #${seatNumber} is already occupied in this scheme.`);
      return;
    }

    if (seatNumber < 1 || seatNumber > chit.total_seats) {
      setError(`Seat number must be between 1 and ${chit.total_seats}.`);
      return;
    }

    if (monthlyContribution <= 0) {
      setError('Monthly contribution must be greater than zero.');
      return;
    }

    onAssign(selectedMemberId, Number(seatNumber), Number(monthlyContribution));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Enroll Subscriber in Scheme</h2>
              <p className="text-xs text-neutral-500">Assign seat in {chit.scheme_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#111111]">
                Select Subscriber Member *
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateMember();
                }}
                className="text-[11px] font-semibold text-neutral-800 underline hover:text-[#111111]"
              >
                + New Subscriber
              </button>
            </div>
            <select
              required
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Seat Number (1 - {chit.total_seats}) *
              </label>
              <input
                type="number"
                min="1"
                max={chit.total_seats}
                required
                value={seatNumber}
                onChange={(e) => setSeatNumber(Number(e.target.value))}
                className="w-full text-xs font-bold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Monthly Due (₹) *
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs space-y-1">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block">
              Enrollment Summary
            </span>
            <div className="flex justify-between">
              <span className="text-neutral-600">Scheme Capacity:</span>
              <span className="font-semibold text-[#111111]">
                {chitMemberships.length} / {chit.total_seats} seats filled
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Scheduled Commitment:</span>
              <span className="font-bold text-[#111111]">
                {formatCurrency(monthlyContribution * chit.duration_months)}
              </span>
            </div>
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
              Assign Seat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
