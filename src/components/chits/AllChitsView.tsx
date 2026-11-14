import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ChitScheme, ChitMembership, FinancialTransaction } from '../../types';
import { formatCurrency, formatOrdinalDay } from '../../utils/financial';
import { useLanguage } from '../../context/LanguageContext';

interface AllChitsViewProps {
  schemes: ChitScheme[];
  memberships: ChitMembership[];
  transactions: FinancialTransaction[];
  onSelectChit: (chitId: string) => void;
  onOpenCreateChit: () => void;
}

export const AllChitsView: React.FC<AllChitsViewProps> = ({
  schemes,
  memberships,
  transactions,
  onSelectChit,
  onOpenCreateChit,
}) => {
  const { language, t, translateStatus } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');

  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCode = s.scheme_code.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [schemes, statusFilter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              {t('All Chit Schemes & Groups', 'All Chit Schemes & Groups')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {language === 'ta' ? 'திட்டக் கால அளவுகள், குலுக்கல் அட்டவணைகள் மற்றும் தவணைகளை நிர்வகிக்கவும்' : 'Manage scheme tenures, auction schedules, seat rosters, and maturity timelines'}
          </p>
        </div>

        <button
          onClick={onOpenCreateChit}
          className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('Create New Scheme')}</span>
        </button>
      </div>

      {schemes.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 bg-neutral-100 text-[#111111] rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#111111]">
              {language === 'ta' ? 'சீட்டுத் திட்டங்கள் எதுவும் இல்லை' : 'No Chit Schemes Found'}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {language === 'ta' ? 'நீங்கள் இன்னும் எந்த சீட்டுத் திட்டத்தையும் உருவாக்கவில்லை. புதிய திட்டத்தைத் தொடங்க கீழேயுள்ள பொத்தானைச் சொடுக்கவும்.' : "You haven't created any chit schemes yet. Click the button below to launch the chit creation wizard and enroll member contacts."}
            </p>
          </div>
          <button
            onClick={onOpenCreateChit}
            className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ta' ? 'முதல் திட்டத்தை உருவாக்கவும்' : 'Create Your First Scheme'}</span>
          </button>
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
                placeholder={language === 'ta' ? "திட்டத்தின் பெயர் அல்லது குறியீடு மூலம் தேடுக..." : "Search by scheme name or code..."}
                className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-neutral-600">{t('col_status', 'Status')}:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              >
                <option value="all">{language === 'ta' ? `அனைத்து திட்டங்கள் (${schemes.length})` : `All Schemes (${schemes.length})`}</option>
                <option value="active">{language === 'ta' ? 'செயலில் உள்ளவை' : 'Active Only'}</option>
                <option value="draft">{language === 'ta' ? 'வரைவுகள்' : 'Drafts'}</option>
                <option value="completed">{language === 'ta' ? 'முடிவுற்றவை' : 'Completed / Matured'}</option>
              </select>
            </div>
          </div>

          {/* Schemes Grid */}
          {filteredSchemes.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-xs text-neutral-500">
              {language === 'ta' ? 'எந்தவொரு சீட்டுத் திட்டமும் பொருந்தவில்லை.' : 'No chit schemes matched the current search filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSchemes.map((scheme) => {
                const filledSeats = memberships.filter((m) => m.chit_id === scheme.id && m.is_active).length;
                const schemeTxs = transactions.filter((t) => t.chit_id === scheme.id && !t.is_reversed && t.transaction_type === 'collection');
                const collectedGross = schemeTxs.reduce((sum, t) => sum + t.amount, 0);
                const totalExpected = scheme.total_pot_amount || (scheme.monthly_installment_amount * scheme.duration_months * scheme.total_seats);
                const progressPercent = Math.min(100, (collectedGross / (totalExpected || 1)) * 100);

                return (
                  <div
                    key={scheme.id}
                    onClick={() => onSelectChit(scheme.id)}
                    className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-xl p-5 cursor-pointer transition-all shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-200 text-neutral-800">
                          {scheme.scheme_code}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          scheme.status === 'active' ? 'bg-[#111111] text-white' : 'bg-neutral-200 text-neutral-800'
                        }`}>
                          {translateStatus(scheme.status)}
                        </span>
                      </div>

                      <h2 className="font-bold text-base text-[#111111] mt-2 group-hover:text-neutral-900 transition-colors">
                        {scheme.name}
                      </h2>

                      <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">{language === 'ta' ? 'மாதத் தவணை' : 'Monthly / Seat'}</span>
                          <span className="font-bold text-[#111111]">{formatCurrency(scheme.monthly_installment_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">{language === 'ta' ? 'மொத்த நிதித் தொகை' : 'Total Pot Pool'}</span>
                          <span className="font-bold text-[#111111]">{formatCurrency(scheme.total_pot_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">{language === 'ta' ? 'இருக்கைகள்' : 'Capacity'}</span>
                          <span className="font-semibold text-neutral-800">{filledSeats} / {scheme.total_seats} {language === 'ta' ? 'இருக்கைகள்' : 'Seats'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase block font-semibold">{language === 'ta' ? 'தவணைத் தேதி' : 'Due Day'}</span>
                          <span className="font-semibold text-neutral-800">{language === 'ta' ? `மாதம் ${scheme.due_day}-ஆம் தேதி` : `${formatOrdinalDay(scheme.due_day)} of month`}</span>
                        </div>
                        {scheme.shuffling_date && (
                          <div>
                            <span className="text-[10px] text-neutral-500 uppercase block font-semibold">{t('Chit Shuffling Date')}</span>
                            <span className="font-semibold text-neutral-800">{scheme.shuffling_date}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                          <span>Collection Progress</span>
                          <span className="font-semibold text-[#111111]">{progressPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#111111] h-2 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-700 group-hover:text-[#111111]">
                      <span>Open Dedicated Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
