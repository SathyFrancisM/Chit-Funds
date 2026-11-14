import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  Languages,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onOpenCreateChit: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  isDemoMode: boolean;
  onResetDemoData: () => void;
  onOpenSupabaseConnect: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenNotifications,
  unreadCount,
  onOpenCreateChit,
  currentUser,
  allUsers,
  onSwitchUser,
  isDemoMode,
  onResetDemoData,
  onOpenSupabaseConnect,
  searchQuery,
  onSearchChange,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { language, setLanguage, t, translateRole } = useLanguage();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Global search */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={language === 'ta' ? "தேடுக: திட்டம், சந்தாதாரர், போன் எண், ரசீது..." : "Search scheme, subscriber, phone, receipt #..."}
            className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white border border-neutral-200 rounded-lg text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls: Language Switcher, Storage Indicator, Notifications, Role Switcher, Quick Action */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Language Switcher Toggle (English <-> தமிழ்) */}
        <div className="flex items-center rounded-lg border border-neutral-300 p-0.5 bg-neutral-100 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-[#111111] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
            title="Switch to English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ta')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              language === 'ta'
                ? 'bg-[#111111] text-white shadow-xs font-bold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
            title="தமிழ் மொழிக்கு மாற்றுக"
          >
            தமிழ்
          </button>
        </div>

        {/* Environment / Storage Indicator Badge */}
        {isDemoMode ? (
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
            <span>{t('local_database', 'Local Database')}</span>
            <button
              onClick={onResetDemoData}
              title="Clear all stored data to start completely fresh"
              className="ml-1 p-0.5 hover:text-neutral-900 rounded hover:bg-neutral-200 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-neutral-500 hover:text-neutral-900" />
            </button>
            <button
              onClick={onOpenSupabaseConnect}
              title="Configure Supabase Cloud Database"
              className="ml-1 text-[11px] underline hover:text-[#111111] cursor-pointer"
            >
              Connect DB
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
            <span>{t('cloud_active', 'Supabase Cloud Active')}</span>
          </div>
        )}

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-medium text-[#111111] transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden sm:inline">{currentUser.full_name.split(' ')[0]}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-200 text-neutral-800">
              {translateRole(currentUser.role)}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  {t('Switch Active Operator')}
                </p>
                <p className="text-xs text-neutral-700 mt-0.5">
                  {t('Simulate Owner vs Staff role permissions')}
                </p>
              </div>
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onSwitchUser(user);
                    setShowUserMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${
                    user.id === currentUser.id ? 'bg-neutral-100 font-semibold' : ''
                  }`}
                >
                  <div>
                    <p className="text-[#111111] font-medium">{user.full_name}</p>
                    <p className="text-neutral-500 text-[10px]">{user.email}</p>
                  </div>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 bg-neutral-200 rounded font-semibold">
                    {translateRole(user.role)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-neutral-600 hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="View notifications and reminders"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#111111] ring-2 ring-white" />
          )}
        </button>

        {/* Prominent Quick Action (+) Button */}
        <button
          onClick={onOpenCreateChit}
          className="h-9 px-3 sm:px-4 rounded-lg bg-[#111111] hover:bg-[#262626] text-white flex items-center space-x-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('new_chit', 'New Chit')}</span>
        </button>
      </div>
    </header>
  );
};
