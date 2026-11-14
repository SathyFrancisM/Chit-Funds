import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  Download,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { CompanyProfile, UserProfile, AuditLog } from '../../types';

interface SettingsViewProps {
  company: CompanyProfile;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  auditLogs: AuditLog[];
  onUpdateCompany: (updated: Partial<CompanyProfile>) => void;
  onAddUser: (user: Omit<UserProfile, 'id' | 'created_at'>) => void;
  onExportBackup: () => void;
  onOpenSupabaseConnect: () => void;
  onResetDemoData: () => void;
  isDemoMode: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  company,
  currentUser,
  allUsers,
  auditLogs,
  onUpdateCompany,
  onAddUser,
  onExportBackup,
  onOpenSupabaseConnect,
  onResetDemoData,
  isDemoMode,
}) => {
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'audit' | 'database'>('company');

  // Company Form state
  const [name, setName] = useState(company.name);
  const [regNo, setRegNo] = useState(company.registration_no);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [address, setAddress] = useState(company.address);
  const [receiptPrefix, setReceiptPrefix] = useState(company.receipt_prefix);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New User state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'staff'>('staff');

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompany({
      name: name.trim(),
      registration_no: regNo.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      receipt_prefix: receiptPrefix.trim(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    onAddUser({
      company_id: company.id,
      full_name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      is_active: true,
    });

    setNewUserName('');
    setNewUserEmail('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Company Administration & Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            System configuration, user roles, security audit trail, and database backups
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSupabaseConnect}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-neutral-600" />
            <span>Database Setup</span>
          </button>
          <button
            onClick={onExportBackup}
            className="px-3.5 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-neutral-200 rounded-xl p-2 flex items-center space-x-1 text-xs">
        {[
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'users', label: 'Staff & Roles', icon: Users },
          { id: 'audit', label: 'Security Audit Log', icon: ShieldCheck },
          { id: 'database', label: 'Data Management & Demo', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-[#111111] text-white font-semibold'
                  : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. COMPANY PROFILE TAB */}
      {activeTab === 'company' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-[#111111] mb-1">Company Business Information</h2>
          <p className="text-xs text-neutral-500 mb-6">
            Details printed on subscriber receipts, reports, and official ledger statements
          </p>

          <form onSubmit={handleSaveCompany} className="space-y-4 max-w-2xl">
            {saveSuccess && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-neutral-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#111111]" />
                <span>Company information updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Registered Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Chit Fund Registration / ROC No *
                </label>
                <input
                  type="text"
                  required
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Official Phone *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Receipt Number Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Registered Head Office Address *
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg transition-colors shadow-sm"
              >
                Save Company Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. USERS & ROLES TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User form (Only Owner can add) */}
          {currentUser.role === 'owner' ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-[#111111] mb-1">Add Authorized Staff Operator</h2>
              <p className="text-xs text-neutral-500 mb-4">
                Staff can record payments and view ledgers; Owner retains full configuration and reversal privileges
              </p>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Anand Sharma"
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="anand@company.com"
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  >
                    <option value="staff">Staff (Collections & Ledgers)</option>
                    <option value="owner">Owner (Full Administrator)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#111111] hover:bg-[#262626] text-white rounded-lg transition-colors shadow-sm flex items-center justify-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-neutral-100 rounded-xl text-xs text-neutral-700">
              User account management is restricted to Company Owner.
            </div>
          )}

          {/* User list */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200">
              <h2 className="text-sm font-bold text-[#111111]">Active Company Operators</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {allUsers.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#111111]">{u.full_name}</span>
                    <span className="block text-xs text-neutral-500">{u.email}</span>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-neutral-200 text-neutral-800">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">Financial & Security Audit Trail</h2>
              <p className="text-xs text-neutral-500">Immutable record of all scheme updates, payments & reversals</p>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {auditLogs.length} events logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3 font-mono text-neutral-500">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#111111]">{log.user_name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-neutral-900">{log.action}</td>
                    <td className="px-4 py-3 text-neutral-500 uppercase text-[10px]">{log.entity_type}</td>
                    <td className="px-4 py-3 text-neutral-700 max-w-md">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DATABASE & DEMO TAB */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#111111] mb-1">Local Demonstration Data Controls</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Reset seeded demo data without modifying production configuration
            </p>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-sm text-[#111111] block">Reset Demonstration Environment</span>
                <span className="text-xs text-neutral-500">
                  Repopulates sample chit schemes, realistic members, and sample Cash/UPI transactions.
                </span>
              </div>
              <button
                onClick={onResetDemoData}
                className="px-4 py-2 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 text-[#111111] rounded-lg flex items-center space-x-1.5 transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Demo Records</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#111111] mb-1">Full Database JSON Backup</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Download complete company backup including schemes, subscriber ledgers, cashbooks, and audit trails
            </p>
            <button
              onClick={onExportBackup}
              className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
