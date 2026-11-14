import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Layers,
  ArrowRight,
  BookOpen,
  Edit2,
  Check,
} from 'lucide-react';
import { CompanyMember, ChitMembership, ChitScheme } from '../../types';
import { formatCurrency, formatOrdinalDay } from '../../utils/financial';

interface MemberProfileModalProps {
  member: CompanyMember | null;
  onClose: () => void;
  memberships: ChitMembership[];
  schemes: ChitScheme[];
  onOpenLedger: (chitId: string, memberId: string) => void;
  onUpdateMember: (id: string, updated: Partial<CompanyMember>) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  onClose,
  memberships,
  schemes,
  onOpenLedger,
  onUpdateMember,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member?.full_name || '');
  const [editPhone, setEditPhone] = useState(member?.phone || '');
  const [editEmail, setEditEmail] = useState(member?.email || '');
  const [editAddress, setEditAddress] = useState(member?.address || '');
  const [editNotes, setEditNotes] = useState(member?.notes || '');

  if (!member) return null;

  const schemeMap = new Map(schemes.map((s) => [s.id, s]));
  const memberEnrollments = memberships.filter((m) => m.member_id === member.id && m.is_active);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMember(member.id, {
      full_name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-sm">
              {member.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">{member.full_name}</h2>
              <span className="text-xs text-neutral-500 font-mono">{member.phone}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => {
                  setEditName(member.full_name);
                  setEditPhone(member.phone);
                  setEditEmail(member.email || '');
                  setEditAddress(member.address || '');
                  setEditNotes(member.notes || '');
                  setIsEditing(true);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg text-[#111111] flex items-center space-x-1"
              >
                <Edit2 className="w-3.5 h-3.5 text-neutral-600" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-[#111111] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#111111] text-white rounded-lg hover:bg-[#262626]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-4 rounded-xl text-xs border border-neutral-200">
              <div>
                <span className="text-neutral-500 block text-[11px]">Email</span>
                <span className="font-medium text-[#111111]">{member.email || 'None provided'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">KYC Status</span>
                <span className="font-semibold text-neutral-900 uppercase text-[10px] px-1.5 py-0.5 bg-neutral-200 rounded">
                  {member.kyc_status}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[11px]">Enrolled Schemes</span>
                <span className="font-bold text-[#111111]">{memberEnrollments.length} Active Scheme Seats</span>
              </div>
            </div>
          )}

          {/* Scheme Enrollments & Ledgers Section */}
          <div>
            <h3 className="text-sm font-bold text-[#111111] mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-neutral-700" />
              <span>Participating Chit Schemes & Individual Ledgers</span>
            </h3>

            {memberEnrollments.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-neutral-50 rounded-lg border border-neutral-200">
                This subscriber is not currently enrolled in any active scheme seats.
              </div>
            ) : (
              <div className="space-y-2.5">
                {memberEnrollments.map((cms) => {
                  const scheme = schemeMap.get(cms.chit_id);
                  if (!scheme) return null;

                  return (
                    <div
                      key={cms.id}
                      className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-900 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                            Seat #{cms.seat_number}
                          </span>
                          <span className="font-bold text-sm text-[#111111]">
                            {scheme.name}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 flex items-center space-x-3">
                          <span>Scheme: {scheme.scheme_code}</span>
                          <span>Monthly Due: {formatCurrency(cms.expected_monthly_contribution)}</span>
                          <span>Due Day: {formatOrdinalDay(scheme.due_day)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onOpenLedger(scheme.id, member.id);
                          onClose();
                        }}
                        className="px-3.5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Member Ledger</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
