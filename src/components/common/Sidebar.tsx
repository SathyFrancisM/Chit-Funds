import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  CreditCard,
  BookOpen,
  Bell,
  Settings,
  Plus,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserProfile;
  unreadCount: number;
  onOpenCreateChit: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  unreadCount,
  onOpenCreateChit,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { t, translateRole } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'chits', label: t('all_chits', 'All Chits'), icon: Layers },
    { id: 'ledger', label: t('ledger', 'Master Ledger'), icon: FileSpreadsheet },
    { id: 'collections', label: t('collections', 'Collections'), icon: CreditCard },
    { id: 'cashbook', label: t('cashbook', 'Cashbook'), icon: BookOpen },
    { id: 'reminders', label: t('reminders', 'Reminders'), icon: Bell, badge: unreadCount },
    { id: 'settings', label: t('settings', 'Settings'), icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="h-16 px-6 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center font-bold text-sm tracking-wider">
              CF
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#111111]">CHITFLOW</span>
              <span className="block text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                {t('Admin Suite')}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <button
            onClick={() => {
              onOpenCreateChit();
              if (isMobileOpen) onCloseMobile();
            }}
            className="w-full h-10 px-4 rounded-lg bg-[#111111] hover:bg-[#262626] text-white flex items-center justify-center space-x-2 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Create New Chit')}</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-[#111111] font-semibold'
                    : 'text-neutral-600 hover:text-[#111111] hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#111111]' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#111111] text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Operator User Card */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 text-[#111111] flex items-center justify-center font-semibold text-xs border border-neutral-300">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#111111] truncate">{currentUser.full_name}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                {currentUser.role === 'owner' ? (
                  <ShieldCheck className="w-3 h-3 text-[#111111]" />
                ) : (
                  <UserCheck className="w-3 h-3 text-neutral-500" />
                )}
                <span className="text-[11px] font-medium text-neutral-600 capitalize">
                  {translateRole(currentUser.role)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
