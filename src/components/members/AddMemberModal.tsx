import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, MapPin, AlertCircle, Contact, Info } from 'lucide-react';
import { CompanyMember } from '../../types';
import { normalizePhoneNumber } from '../../utils/financial';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CompanyMember, 'id' | 'company_id' | 'phone_normalized' | 'created_at' | 'updated_at'>) => void;
  existingMembers: CompanyMember[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingMembers,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [kycStatus, setKycStatus] = useState<'verified' | 'pending' | 'exempt'>('verified');
  const [error, setError] = useState<string | null>(null);
  const [contactPickerSupported, setContactPickerSupported] = useState<boolean>(
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator as any).contacts
  );

  if (!isOpen) return null;

  const handleDeviceContactPicker = async () => {
    try {
      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'tel', 'email'];
        const contacts = await (navigator as any).contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name[0]) setFullName(contact.name[0]);
          if (contact.tel && contact.tel[0]) setPhone(contact.tel[0]);
          if (contact.email && contact.email[0]) setEmail(contact.email[0]);
        }
      }
    } catch (err: any) {
      console.warn('Contact picker cancelled or unsupported', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Member full name is required.');
      return;
    }

    const normalized = normalizePhoneNumber(phone);
    if (!normalized || normalized.length < 10) {
      setError('Please provide a valid 10-digit mobile phone number.');
      return;
    }

    // Check duplicate
    const existing = existingMembers.find((m) => m.phone_normalized === normalized);
    if (existing) {
      setError(`A member with phone "${phone}" is already registered as ${existing.full_name}.`);
      return;
    }

    onSubmit({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      kyc_status: kycStatus,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl border border-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#111111] text-white rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111]">Register New Subscriber</h2>
              <p className="text-xs text-neutral-500">Add verified chit fund participant</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#111111]" />
              <span>{error}</span>
            </div>
          )}

          {/* Device Contact Picker Integration */}
          {contactPickerSupported ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold text-[#111111] block">Device Contact Book</span>
                <span className="text-[11px] text-neutral-500">Pick contact directly from your device</span>
              </div>
              <button
                type="button"
                onClick={handleDeviceContactPicker}
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg text-[#111111] flex items-center space-x-1"
              >
                <Contact className="w-3.5 h-3.5 text-neutral-700" />
                <span>Select Contact</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-600 flex items-start space-x-2">
              <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Standard desktop browsers require manual entry or CSV import. Mobile Chrome on Android supports device Contact Picker with user permission.
              </span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Chandra Varma"
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98490 12345"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@gmail.com"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">
              Residential / Business Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, locality, city, pincode"
              className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* KYC Status */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                KYC Verification Status
              </label>
              <select
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value as any)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="verified">Verified (Aadhaar / PAN)</option>
                <option value="pending">Pending Document Submission</option>
                <option value="exempt">Exempt (Known Promoter)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Notes / Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Introduced by Rajesh Rao..."
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

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
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg transition-colors shadow-sm"
            >
              Add Subscriber
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
