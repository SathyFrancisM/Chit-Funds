import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Upload,
  Phone,
  Mail,
  ShieldCheck,
  Clock,
  Layers,
  ArrowUpRight,
  Filter,
  MessageSquare,
  Send,
} from 'lucide-react';
import {
  CompanyMember,
  ChitMembership,
  ChitScheme,
  UserProfile,
  CompanyProfile,
  ReminderRecipientInfo,
} from '../../types';
import { storageService } from '../../services/storage';
import { whatsappApi, WhatsAppBackendConfig } from '../../services/whatsappApi';
import { WhatsAppMessageEditorModal } from '../reminders/WhatsAppMessageEditorModal';

interface MemberListViewProps {
  members: CompanyMember[];
  memberships: ChitMembership[];
  schemes: ChitScheme[];
  company?: CompanyProfile;
  currentUser?: UserProfile;
  onOpenAddMember: () => void;
  onOpenCsvImport: () => void;
  onSelectMember: (member: CompanyMember) => void;
}

export const MemberListView: React.FC<MemberListViewProps> = ({
  members,
  memberships,
  schemes,
  company,
  currentUser,
  onOpenAddMember,
  onOpenCsvImport,
  onSelectMember,
}) => {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'pending' | 'exempt'>('all');

  // WhatsApp Messaging Modal State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [activeModalRecipients, setActiveModalRecipients] = useState<ReminderRecipientInfo[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppBackendConfig | null>(null);

  const companyProfile = useMemo(() => {
    return company || storageService.getCompanyProfile();
  }, [company]);

  const activeUser = useMemo(() => {
    return currentUser || storageService.getCurrentUser();
  }, [currentUser]);

  useEffect(() => {
    whatsappApi.getConfig().then((cfg) => setWhatsappConfig(cfg)).catch(() => {});
  }, []);

  const handleOpenWhatsApp = (member: CompanyMember) => {
    const recipient: ReminderRecipientInfo = {
      memberId: member.id,
      memberName: member.full_name,
      phone: member.phone,
      schemeName: 'Subscribers Directory',
      paymentStatus: 'Active Subscriber',
    };
    setActiveModalRecipients([recipient]);
    setIsMessageModalOpen(true);
  };

  // Scheme Map

  const schemeMap = useMemo(() => new Map(schemes.map((s) => [s.id, s])), [schemes]);

  // Compute membership seats count per member
  const memberSeatsCount = useMemo(() => {
    const map = new Map<string, number>();
    memberships.forEach((m) => {
      if (m.is_active) {
        map.set(m.member_id, (map.get(m.member_id) || 0) + 1);
      }
    });
    return map;
  }, [memberships]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (kycFilter !== 'all' && m.kyc_status !== kycFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = m.full_name.toLowerCase().includes(q);
        const matchesPhone = m.phone.includes(q) || m.phone_normalized.includes(q);
        const matchesEmail = m.email ? m.email.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [members, kycFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Company Subscribers Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Registered subscribers, multi-chit seat enrollments, and KYC profiles
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenCsvImport}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-600" />
            <span>Import CSV / Excel</span>
          </button>
          <button
            onClick={onOpenAddMember}
            className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Subscriber</span>
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 bg-neutral-100 text-[#111111] rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#111111]">
              No Subscribers Enrolled Yet
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Add your first company subscriber or import a spreadsheet list. You can also import contacts from WhatsApp or your phone during chit creation.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={onOpenAddMember}
              className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Subscriber</span>
            </button>
            <button
              onClick={onOpenCsvImport}
              className="px-4 py-2.5 bg-white border border-neutral-300 hover:border-neutral-900 text-[#111111] rounded-lg text-xs font-semibold inline-flex items-center space-x-2"
            >
              <Upload className="w-4 h-4 text-neutral-600" />
              <span>Import Spreadsheet</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone or email..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-neutral-600">KYC Status:</span>
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value as any)}
                className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="all">All Members ({members.length})</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-xs">
                No subscribers match the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Subscriber Name</th>
                      <th className="px-5 py-3">Mobile Phone</th>
                      <th className="px-5 py-3">Email & City</th>
                      <th className="px-5 py-3 text-center">Active Seats</th>
                      <th className="px-5 py-3">KYC Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {filteredMembers.map((member) => {
                      const seatsCount = memberSeatsCount.get(member.id) || 0;
                      return (
                        <tr
                          key={member.id}
                          onClick={() => onSelectMember(member)}
                          className="hover:bg-neutral-50/80 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3.5 font-semibold text-[#111111]">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-neutral-200 text-[#111111] flex items-center justify-center font-bold text-xs">
                                {member.full_name.charAt(0)}
                              </div>
                              <div>
                                <span>{member.full_name}</span>
                                {member.notes && (
                                  <span className="block text-[10px] text-neutral-500 font-normal truncate max-w-xs">
                                    {member.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-neutral-700">
                            <div className="flex items-center space-x-1.5">
                              <Phone className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{member.phone}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-neutral-600">
                            {member.email ? (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{member.email}</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                            {member.address && (
                              <span className="block text-[10px] text-neutral-400 truncate max-w-[200px]">
                                {member.address}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                              <Layers className="w-3.5 h-3.5 text-neutral-500" />
                              <span>{seatsCount} {seatsCount === 1 ? 'seat' : 'seats'}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              member.kyc_status === 'verified'
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-200 text-neutral-800'
                            }`}>
                              {member.kyc_status === 'verified' ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              <span>{member.kyc_status}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWhatsApp(member);
                                }}
                                className="p-1.5 text-neutral-600 hover:text-[#111111] hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
                                title="Send WhatsApp message or reminder to subscriber"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-neutral-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectMember(member);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
                              >
                                View Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* WhatsApp Message Editor Modal */}
      <WhatsAppMessageEditorModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        recipients={activeModalRecipients}
        company={companyProfile}
        currentUser={activeUser}
        config={whatsappConfig}
      />
    </div>
  );
};

