import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Users,
  CreditCard,
  BookOpen,
  Calendar,
  IndianRupee,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Banknote,
  Smartphone,
  Trash2,
  RotateCcw,
  Receipt,
  UserPlus,
  Search,
  Send,
  MessageSquare,
  Check,
  ExternalLink,
  Trophy,
  Shuffle,
} from 'lucide-react';
import {
  ChitScheme,
  ChitMembership,
  CompanyMember,
  FinancialTransaction,
  UserProfile,
  CompanyProfile,
  ReminderRecipientInfo,
  ReminderHistoryItem,
  ChitShuffleWinner,
} from '../../types';
import {
  calculateChitMetrics,
  calculateChitCashbook,
  formatCurrency,
  generateInstallmentSchedule,
  formatOrdinalDay,
  calculateMemberMonthlyDueSchedule,
} from '../../utils/financial';
import { storageService } from '../../services/storage';
import {
  whatsappApi,
  WhatsAppBackendConfig,
} from '../../services/whatsappApi';
import { WhatsAppMessageEditorModal } from '../reminders/WhatsAppMessageEditorModal';
import { buildWhatsAppDirectUrl, openWhatsAppDirect } from '../../utils/whatsappTemplates';
import { useLanguage } from '../../context/LanguageContext';

interface ChitDetailWorkspaceProps {
  chit: ChitScheme;
  onBack: () => void;
  allMembers: CompanyMember[];
  memberships: ChitMembership[];
  transactions: FinancialTransaction[];
  currentUser: UserProfile;
  company?: CompanyProfile;
  onOpenRecordPayment: (chitId: string, memberId?: string) => void;
  onOpenAssignMember: (chitId: string) => void;
  onRemoveMember: (membershipId: string, reason: string) => void;
  onOpenLedger: (chitId: string, memberId: string) => void;
  onViewReceipt: (tx: FinancialTransaction) => void;
  onRequestReversal: (tx: FinancialTransaction) => void;
  onEditPayment?: (tx: FinancialTransaction) => void;
  onRecordCashbookEntry: (chitId: string) => void;
}

export const ChitDetailWorkspace: React.FC<ChitDetailWorkspaceProps> = ({
  chit,
  onBack,
  allMembers,
  memberships,
  transactions,
  currentUser,
  company,
  onOpenRecordPayment,
  onOpenAssignMember,
  onRemoveMember,
  onOpenLedger,
  onViewReceipt,
  onRequestReversal,
  onEditPayment,
  onRecordCashbookEntry,
}) => {
  const { language, t, getWinnerWhatsAppMessage } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'collections' | 'cashbook' | 'schedule'
  >('members');

  const [memberSearch, setMemberSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'paid' | 'partial'>('all');
  const [removeModalMembership, setRemoveModalMembership] = useState<ChitMembership | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  // WhatsApp reminder & selection state
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<Set<string>>(new Set());
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [activeModalRecipients, setActiveModalRecipients] = useState<ReminderRecipientInfo[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppBackendConfig | null>(null);
  const [reminderHistory, setReminderHistory] = useState<ReminderHistoryItem[]>([]);

  // Chit Shuffling Winners State
  const [shuffleWinners, setShuffleWinners] = useState<ChitShuffleWinner[]>(() =>
    storageService.getShuffleWinners(chit.id)
  );
  const [shuffleModalRow, setShuffleModalRow] = useState<(typeof memberRowData)[0] | null>(null);
  const [shuffleMonthNumber, setShuffleMonthNumber] = useState<number>(1);
  const [shuffleDate, setShuffleDate] = useState<string>(
    () => chit.shuffling_date || new Date().toISOString().split('T')[0]
  );
  const [shuffleNotes, setShuffleNotes] = useState<string>('');
  const [shuffleSuccessToast, setShuffleSuccessToast] = useState<{
    memberName: string;
    phone: string;
    directUrl: string;
    monthNumber: number;
  } | null>(null);

  const shuffleWinnerMap = useMemo(() => {
    return new Map(shuffleWinners.map((w) => [w.membership_id, w]));
  }, [shuffleWinners]);

  const handleOpenShuffleModal = (row: (typeof memberRowData)[0]) => {
    const existing = shuffleWinnerMap.get(row.membership.id);
    setShuffleModalRow(row);
    if (existing) {
      setShuffleMonthNumber(existing.month_number);
      setShuffleDate(existing.shuffled_date);
      setShuffleNotes(existing.notes || '');
    } else {
      const highestMonth = shuffleWinners.reduce((max, w) => Math.max(max, w.month_number), 0);
      const nextMonth = Math.min(chit.duration_months, highestMonth + 1);
      setShuffleMonthNumber(nextMonth || 1);
      setShuffleDate(chit.shuffling_date || new Date().toISOString().split('T')[0]);
      setShuffleNotes('');
    }
  };

  // 1. Direct WhatsApp Sharing handler
  const handleDirectShareWhatsApp = (phone: string, memberName: string, roundNumber: number) => {
    const messageText = getWinnerWhatsAppMessage();
    const directUrl = buildWhatsAppDirectUrl(phone, messageText);
    openWhatsAppDirect(phone, messageText);

    setShuffleSuccessToast({
      memberName,
      phone,
      directUrl,
      monthNumber: roundNumber,
    });

    whatsappApi
      .sendBulk([
        {
          recipientPhone: phone,
          message: messageText,
          recipientName: memberName,
          schemeId: chit.id,
          schemeName: chit.name,
          templateName: 'chit_shuffle_winner',
        },
      ])
      .catch(() => {});
  };

  const handleUndoShuffleForMembership = (membershipId: string, memberName: string) => {
    if (window.confirm(`Undo chit shuffling winner mark for ${memberName}? You can then re-select this or another winner.`)) {
      storageService.deleteShuffleWinnerByMembership(membershipId);
      setShuffleWinners(storageService.getShuffleWinners(chit.id));
      setShuffleModalRow(null);
    }
  };

  const handleUndoSeatAssignment = (membershipId: string, memberName: string, seatNo: number) => {
    if (window.confirm(`Undo seat assignment #${seatNo} for ${memberName}? This will free the seat for another subscriber.`)) {
      try {
        storageService.unassignMembership(membershipId);
        onRemoveMember(membershipId, 'Mistaken enrollment undone');
      } catch (err: any) {
        alert(err.message || 'Failed to unassign seat');
      }
    }
  };

  // 2. Mark / Update Shuffle Record Only (without WhatsApp)
  const handleSaveShuffleOnly = () => {
    if (!shuffleModalRow || !shuffleModalRow.member) return;

    const member = shuffleModalRow.member;
    const membership = shuffleModalRow.membership;
    const roundNumber = Number(shuffleMonthNumber);
    const existing = shuffleWinnerMap.get(membership.id);

    storageService.markContactShuffled({
      chit_id: chit.id,
      membership_id: membership.id,
      member_id: member.id,
      member_name: member.full_name,
      member_phone: member.phone,
      seat_number: membership.seat_number,
      month_number: roundNumber,
      shuffled_date: shuffleDate,
      notes: shuffleNotes.trim() || undefined,
      whatsapp_status: existing?.whatsapp_status || 'pending',
      whatsapp_sent_at: existing?.whatsapp_sent_at,
    });

    storageService.addNotification({
      title: 'Chit Shuffling Winner Marked',
      message: `${member.full_name} (Seat #${membership.seat_number}) marked as Month #${roundNumber} winner for ${chit.name}.`,
      type: 'info',
      link: `/chits/${chit.id}`,
    });

    setShuffleWinners(storageService.getShuffleWinners(chit.id));
    setShuffleModalRow(null);

    const directUrl = buildWhatsAppDirectUrl(member.phone, getWinnerWhatsAppMessage());
    setShuffleSuccessToast({
      memberName: member.full_name,
      phone: member.phone,
      directUrl,
      monthNumber: roundNumber,
    });
  };

  // 3. Mark / Update AND Share via WhatsApp
  const handleSaveAndShareWhatsApp = () => {
    if (!shuffleModalRow || !shuffleModalRow.member) return;

    const member = shuffleModalRow.member;
    const membership = shuffleModalRow.membership;
    const roundNumber = Number(shuffleMonthNumber);
    const messageText = getWinnerWhatsAppMessage();

    // 1. Build direct WhatsApp URL and open immediately
    const directUrl = buildWhatsAppDirectUrl(member.phone, messageText);
    openWhatsAppDirect(member.phone, messageText);

    // 2. Persist to storage engine
    storageService.markContactShuffled({
      chit_id: chit.id,
      membership_id: membership.id,
      member_id: member.id,
      member_name: member.full_name,
      member_phone: member.phone,
      seat_number: membership.seat_number,
      month_number: roundNumber,
      shuffled_date: shuffleDate,
      notes: shuffleNotes.trim() || undefined,
      whatsapp_status: 'sent',
      whatsapp_sent_at: new Date().toISOString(),
    });

    // 3. Add system notification for audit trail
    storageService.addNotification({
      title: 'Chit Shuffling Winner Declared & Shared',
      message: `${member.full_name} (Seat #${membership.seat_number}) marked as Month #${roundNumber} winner for ${chit.name}. WhatsApp opened.`,
      type: 'info',
      link: `/chits/${chit.id}`,
    });

    // 4. Update local state
    setShuffleWinners(storageService.getShuffleWinners(chit.id));
    setShuffleModalRow(null);

    // 5. Show toast with direct WhatsApp link fallback
    setShuffleSuccessToast({
      memberName: member.full_name,
      phone: member.phone,
      directUrl,
      monthNumber: roundNumber,
    });

    // 6. Asynchronous backend API dispatch (if configured)
    whatsappApi
      .sendBulk([
        {
          recipientPhone: member.phone,
          message: messageText,
          recipientMemberId: member.id,
          recipientName: member.full_name,
          schemeId: chit.id,
          schemeName: chit.name,
          seatNumber: membership.seat_number,
          templateName: 'chit_shuffle_winner',
        },
      ])
      .catch(() => {});
  };

  const handleDeleteShuffleWinner = (winnerId: string) => {
    if (window.confirm('Remove this chit shuffling winner record?')) {
      storageService.deleteShuffleWinner(winnerId);
      setShuffleWinners(storageService.getShuffleWinners(chit.id));
    }
  };

  const companyProfile = useMemo(() => {
    return company || storageService.getCompanyProfile();
  }, [company]);

  // Load WhatsApp config & reminder history on mount
  useEffect(() => {
    whatsappApi.getConfig().then((cfg) => setWhatsappConfig(cfg)).catch(() => {});
    setReminderHistory(storageService.getReminderHistory());
  }, []);

  // Members map for lookup
  const membersMap = useMemo(() => new Map(allMembers.map((m) => [m.id, m])), [allMembers]);

  // Memberships for this chit
  const chitMemberships = useMemo(() => {
    return memberships.filter((m) => m.chit_id === chit.id);
  }, [memberships, chit.id]);


  // Transactions for this chit
  const chitTransactions = useMemo(() => {
    return transactions.filter((t) => t.chit_id === chit.id);
  }, [transactions, chit.id]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateChitMetrics(chit, chitMemberships, chitTransactions);
  }, [chit, chitMemberships, chitTransactions]);

  // Isolated Cashbook
  const cashbookRecords = useMemo(() => {
    return calculateChitCashbook(chitTransactions, membersMap);
  }, [chitTransactions, membersMap]);

  // Installment schedule
  const schedule = useMemo(() => {
    return generateInstallmentSchedule(
      chit.start_date,
      chit.duration_months,
      chit.due_day,
      chit.monthly_installment_amount,
      chit.total_seats
    );
  }, [chit]);

  // Member-wise table data with payment status
  const memberRowData = useMemo(() => {
    return chitMemberships.map((cms) => {
      const member = membersMap.get(cms.member_id);
      const memberTxs = chitTransactions.filter(
        (t) => t.member_id === cms.member_id && !t.is_reversed && t.transaction_type === 'collection'
      );
      const totalPaid = memberTxs.reduce((sum, t) => sum + t.amount, 0);
      const expectedMonthly = cms.expected_monthly_contribution || chit.monthly_installment_amount;
      const expectedTotal = expectedMonthly * chit.duration_months;
      const lastTx = memberTxs[memberTxs.length - 1];

      // Calculate dynamic running monthly dues with carry-forward
      const monthlyData = calculateMemberMonthlyDueSchedule(chit, cms, chitTransactions);
      const activeMonthItem =
        monthlyData.monthlyItems.find((item) => item.installment_no === monthlyData.firstUnpaidOrPartialMonth) ||
        monthlyData.monthlyItems[0];
      const currentMonthStatus = activeMonthItem ? activeMonthItem.status : 'Unpaid';
      const outstanding = monthlyData.netOutstandingBalance;
      const isPaid = currentMonthStatus === 'Paid' || outstanding === 0;
      const isPartial = currentMonthStatus === 'Partially Paid';
      const isUnpaid = currentMonthStatus === 'Unpaid';

      return {
        membership: cms,
        member,
        totalPaid,
        expectedMonthly,
        expectedTotal,
        outstanding,
        advanceCredit: monthlyData.currentAdvanceCredit,
        currentMonthStatus,
        activeMonthItem,
        isPaid,
        isPartial,
        isUnpaid,
        lastPaymentDate: lastTx?.transaction_date,
        lastPaymentMethod: lastTx?.payment_method,
        lastTx,
      };
    });
  }, [chitMemberships, membersMap, chitTransactions, chit]);

  const paidMembersCount = useMemo(() => memberRowData.filter((m) => m.isPaid).length, [memberRowData]);
  const unpaidMembersCount = useMemo(() => memberRowData.filter((m) => m.isUnpaid).length, [memberRowData]);
  const partialMembersCount = useMemo(() => memberRowData.filter((m) => m.isPartial).length, [memberRowData]);

  const filteredMemberRows = useMemo(() => {
    return memberRowData.filter((row) => {
      if (paymentFilter === 'paid' && !row.isPaid) return false;
      if (paymentFilter === 'unpaid' && !row.isUnpaid) return false;
      if (paymentFilter === 'partial' && !row.isPartial) return false;
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase().trim();
        const name = (row.member?.full_name || '').toLowerCase();
        const phone = (row.member?.phone || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [memberRowData, paymentFilter, memberSearch]);

  // Lookup map for latest reminder sent to a member
  const latestReminderMap = useMemo(() => {
    const map = new Map<string, ReminderHistoryItem>();
    reminderHistory.forEach((item) => {
      if (!map.has(item.recipientMemberId)) {
        map.set(item.recipientMemberId, item);
      }
    });
    return map;
  }, [reminderHistory]);

  const handleSelectAll = () => {
    setSelectedMembershipIds(new Set(filteredMemberRows.map((r) => r.membership.id)));
  };

  const handleDeselectAll = () => {
    setSelectedMembershipIds(new Set());
  };

  const handleSendIndividualReminder = (row: (typeof memberRowData)[0]) => {
    if (!row.member) return;
    const recipient: ReminderRecipientInfo = {
      memberId: row.member.id,
      memberName: row.member.full_name,
      phone: row.member.phone,
      seatNumber: row.membership.seat_number,
      schemeId: chit.id,
      schemeName: chit.name,
      schemeCode: chit.scheme_code,
      amountDue: row.outstanding > 0 ? row.outstanding : row.expectedMonthly,
      dueDate: `${formatOrdinalDay(chit.due_day)} of this month`,
      paymentStatus: row.isPaid ? 'Paid' : 'Unpaid',
    };
    setActiveModalRecipients([recipient]);
    setIsMessageModalOpen(true);
  };

  const handleSendToSelected = () => {
    const selectedRows = memberRowData.filter(
      (r) => selectedMembershipIds.has(r.membership.id) && r.member
    );
    if (selectedRows.length === 0) return;

    const recipientsList: ReminderRecipientInfo[] = selectedRows.map((r) => ({
      memberId: r.member!.id,
      memberName: r.member!.full_name,
      phone: r.member!.phone,
      seatNumber: r.membership.seat_number,
      schemeId: chit.id,
      schemeName: chit.name,
      schemeCode: chit.scheme_code,
      amountDue: r.outstanding > 0 ? r.outstanding : r.expectedMonthly,
      dueDate: `${formatOrdinalDay(chit.due_day)} of this month`,
      paymentStatus: r.isPaid ? 'Paid' : 'Unpaid',
    }));

    setActiveModalRecipients(recipientsList);
    setIsMessageModalOpen(true);
  };

  const handleSendToEveryone = () => {
    const activeRows = memberRowData.filter((r) => r.membership.is_active && r.member);
    if (activeRows.length === 0) return;

    const recipientsList: ReminderRecipientInfo[] = activeRows.map((r) => ({
      memberId: r.member!.id,
      memberName: r.member!.full_name,
      phone: r.member!.phone,
      seatNumber: r.membership.seat_number,
      schemeId: chit.id,
      schemeName: chit.name,
      schemeCode: chit.scheme_code,
      amountDue: r.outstanding > 0 ? r.outstanding : r.expectedMonthly,
      dueDate: `${formatOrdinalDay(chit.due_day)} of this month`,
      paymentStatus: r.isPaid ? 'Paid' : 'Unpaid',
    }));

    setActiveModalRecipients(recipientsList);
    setIsMessageModalOpen(true);
  };

  const handleConfirmRemove = () => {

    if (removeModalMembership && removeReason.trim()) {
      onRemoveMember(removeModalMembership.id, removeReason.trim());
      setRemoveModalMembership(null);
      setRemoveReason('');
    }
  };

  const exportCashbookCsv = () => {
    const headers = ['Date', 'Receipt/Ref', 'Party', 'Type', 'Method', 'Money In', 'Money Out', 'Cash Bal', 'UPI Bal', 'Net Bal'];
    const rows = cashbookRecords.map((r) => [
      r.date,
      r.receipt_no,
      `"${r.party_name}"`,
      r.entry_type,
      r.payment_method,
      r.money_in,
      r.money_out,
      r.cash_balance,
      r.upi_balance,
      r.net_balance,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashbook_${chit.scheme_code}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] transition-colors"
              title="Back to all chits"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                  {chit.scheme_code}
                </span>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                  chit.status === 'active' ? 'bg-[#111111] text-white' : 'bg-neutral-200 text-neutral-800'
                }`}>
                  {chit.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111] mt-1 tracking-tight">
                {chit.name}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Started {chit.start_date} • Maturity {chit.planned_maturity_date} • {chit.duration_months} Months • Due on {formatOrdinalDay(chit.due_day)}</span>
                {chit.shuffling_date && (
                  <span className="font-semibold text-neutral-900 bg-neutral-200/80 px-2 py-0.5 rounded text-[11px]">
                    Shuffling: {chit.shuffling_date}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenAssignMember(chit.id)}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-neutral-600" />
              <span>Enroll Member</span>
            </button>
            <button
              onClick={() => onOpenRecordPayment(chit.id)}
              className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {/* 5 Tabs Navigation */}
        <div className="flex items-center space-x-1 mt-6 border-b border-neutral-200 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'members', label: `Members (${chitMemberships.filter((m) => m.is_active).length}/${chit.total_seats})`, icon: Users },
            { id: 'collections', label: `Collections (${chitTransactions.filter((t) => !t.is_reversed && t.transaction_type === 'collection').length})`, icon: CreditCard },
            { id: 'cashbook', label: 'Cashbook', icon: BookOpen },
            { id: 'schedule', label: 'Schedule & Maturity', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[#111111] text-[#111111] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Total Chit Pool
              </span>
              <span className="text-2xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.total_expected_pool)}
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                {chit.total_seats} seats × {formatCurrency(chit.monthly_installment_amount)}/mo
              </span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Actual Collections Received
              </span>
              <span className="text-2xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.total_collected_gross)}
              </span>
              <div className="flex items-center space-x-2 mt-1 text-[11px] text-neutral-600">
                <span>Cash: {formatCurrency(metrics.cash_collected)}</span>
                <span>•</span>
                <span>UPI: {formatCurrency(metrics.upi_collected)}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className="text-2xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.total_outstanding)}
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Scheduled future collections
              </span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Scheme Progress
              </span>
              <span className="text-2xl font-bold text-[#111111] mt-1 block">
                Month {metrics.months_elapsed} / {chit.duration_months}
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                {metrics.months_remaining} months to planned maturity
              </span>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#111111]">Overall Collection Milestone</span>
              <span className="text-neutral-500">
                {((metrics.total_collected_gross / (metrics.total_expected_pool || 1)) * 100).toFixed(1)}% collected
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#111111] h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (metrics.total_collected_gross / (metrics.total_expected_pool || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Scheme Information & Rules Box */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Scheme Rules & Agreement Terms
              </h3>
              <p className="text-xs text-neutral-600 whitespace-pre-line bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                {chit.scheme_rules || 'Standard cooperative rules under Chit Funds Act 1982. Reverse auctions held monthly.'}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                Foreman Notes & Operating Guidelines
              </h3>
              <p className="text-xs text-neutral-600 whitespace-pre-line bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                {chit.notes || 'Foreman commission payable upon successful monthly auction payout.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-0">
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-neutral-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#111111]">
                  Enrolled Subscribers & Payment Status ({chitMemberships.filter((m) => m.is_active).length} of {chit.total_seats} seats filled)
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select each contact below to record payments or send customized WhatsApp reminders.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAssignMember(chit.id)}
                  className="px-3 py-1.5 bg-white border border-neutral-300 hover:border-neutral-900 text-[#111111] text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Seat</span>
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    paymentFilter === 'all'
                      ? 'bg-[#111111] text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All ({memberRowData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('unpaid')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    paymentFilter === 'unpaid'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Unpaid ({unpaidMembersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('partial')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    paymentFilter === 'partial'
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Partial ({partialMembersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    paymentFilter === 'paid'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Paid ({paidMembersCount})</span>
                </button>
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search contact by name or phone..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Chit Shuffling Winner Success Toast */}
            {shuffleSuccessToast && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold">
                      Month #{shuffleSuccessToast.monthNumber} Winner Declared:
                    </span>{' '}
                    <span>
                      {shuffleSuccessToast.memberName} ({shuffleSuccessToast.phone}) marked as Chit Shuffled!
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={shuffleSuccessToast.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShuffleSuccessToast(null)}
                    className="p-1 hover:bg-emerald-200/60 rounded text-emerald-800 cursor-pointer text-xs"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp Reminder Bulk Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] bg-white border border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
                >
                  Select All ({filteredMemberRows.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={selectedMembershipIds.size === 0}
                  className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] bg-white border border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors disabled:opacity-40 shadow-2xs"
                >
                  Deselect All
                </button>
                <span className="text-xs font-semibold text-neutral-600 pl-1">
                  {selectedMembershipIds.size} of {filteredMemberRows.length} selected
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {selectedMembershipIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleSendToSelected}
                    className="px-3 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Selected ({selectedMembershipIds.size})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSendToEveryone}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                  title="Sends individual customized WhatsApp messages to all enrolled members in this chit (NOT a WhatsApp group post)"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Everyone ({chitMemberships.filter((m) => m.is_active).length})</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredMemberRows.length > 0 &&
                        filteredMemberRows.every((r) => selectedMembershipIds.has(r.membership.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembershipIds(
                            new Set(filteredMemberRows.map((r) => r.membership.id))
                          );
                        } else {
                          setSelectedMembershipIds(new Set());
                        }
                      }}
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      title="Select all shown members"
                    />
                  </th>
                  <th className="px-4 py-3">Seat #</th>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Monthly Due</th>
                  <th className="px-4 py-3 text-center">Payment Status</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-center">Chit Shuffled</th>
                  <th className="px-4 py-3 text-center">Reminder</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {filteredMemberRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-xs text-neutral-500">
                      No enrolled members match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredMemberRows.map(
                    (row) => {
                      const {
                        membership,
                        member,
                        totalPaid,
                        expectedMonthly,
                        outstanding,
                        isPaid,
                        lastTx,
                      } = row;
                      const isSelected = selectedMembershipIds.has(membership.id);
                      const latestReminder = member ? latestReminderMap.get(member.id) : undefined;

                      return (
                        <tr
                          key={membership.id}
                          className={`hover:bg-neutral-50/80 transition-colors ${
                            isSelected ? 'bg-neutral-50/90' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedMembershipIds);
                                if (e.target.checked) next.add(membership.id);
                                else next.delete(membership.id);
                                setSelectedMembershipIds(next);
                              }}
                              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                            #{membership.seat_number}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#111111]">
                            {member?.full_name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-600">
                            {member?.phone || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-900">
                            {formatCurrency(expectedMonthly)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.isPaid ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-900 text-white shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Paid ({formatCurrency(totalPaid)})</span>
                              </span>
                            ) : row.isPartial ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Partially Paid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                                <span>Unpaid</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#111111]">
                            {formatCurrency(totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-600">
                            {formatCurrency(outstanding)}
                          </td>

                          {/* CHIT SHUFFLED STATUS COLUMN */}
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const winner = shuffleWinnerMap.get(membership.id);
                              if (winner) {
                                return (
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                      <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span>Month #{winner.month_number} Winner</span>
                                    </span>
                                    <span className="text-[10px] text-neutral-500 mt-0.5">
                                      {winner.shuffled_date}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <span className="text-[11px] text-neutral-400 font-medium">
                                  Eligible
                                </span>
                              );
                            })()}
                          </td>

                          {/* REMINDER COLUMN */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-center justify-center space-y-1">
                              {latestReminder ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    latestReminder.status === 'delivered'
                                      ? 'bg-emerald-700 text-white'
                                      : latestReminder.status === 'accepted'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : latestReminder.status === 'failed'
                                      ? 'bg-rose-100 text-rose-800'
                                      : latestReminder.status === 'manual_opened'
                                      ? 'bg-neutral-100 text-neutral-700'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                  title={`Last reminder: ${latestReminder.status} at ${new Date(
                                    latestReminder.sentAt
                                  ).toLocaleTimeString()}`}
                                >
                                  {latestReminder.status === 'manual_opened'
                                    ? 'Opened'
                                    : latestReminder.status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400">Not Sent</span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSendIndividualReminder(row)}
                                className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 hover:text-[#111111] rounded text-[10px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                title="Send customized WhatsApp reminder to this subscriber"
                              >
                                <MessageSquare className="w-3 h-3 text-neutral-600" />
                                <span>Send Reminder</span>
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Chit Shuffle & WhatsApp Sharing Buttons near Payment Mark Button */}
                              {(() => {
                                const winner = shuffleWinnerMap.get(membership.id);
                                return winner ? (
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenShuffleModal(row)}
                                      className="px-2 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs transition-colors cursor-pointer"
                                      title={`Marked as Month #${winner.month_number} Winner (Click to view/update mark)`}
                                    >
                                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                                      <span>{t('shuffled', 'Shuffled')} (#{winner.month_number})</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        member &&
                                        handleDirectShareWhatsApp(
                                          member.phone,
                                          member.full_name,
                                          winner.month_number
                                        )
                                      }
                                      className="px-2 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition-colors cursor-pointer"
                                      title="Share winner notification message to subscriber on WhatsApp"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>{t('share_wa', 'Share WA')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => member && handleUndoShuffleForMembership(membership.id, member.full_name)}
                                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-300 text-xs font-bold transition-colors cursor-pointer"
                                      title="Undo winner mark if marked mistakenly"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenShuffleModal(row)}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
                                    title="Mark this contact as Chit Shuffling Winner"
                                  >
                                    <Trophy className="w-3.5 h-3.5" />
                                    <span>{t('chit_shuffle', 'Chit Shuffle')}</span>
                                  </button>
                                );
                              })()}

                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => member && onOpenRecordPayment(chit.id, member.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer ${
                                    row.isPartial
                                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                      : 'bg-[#111111] hover:bg-[#262626] text-white'
                                  }`}
                                  title="Record installment payment for this member"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>{row.isPartial ? t('top_up', '+ Top Up') : t('mark_paid', 'Mark Paid')}</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      member && onOpenRecordPayment(chit.id, member.id)
                                    }
                                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                                    title="Add another installment or payment"
                                  >
                                    <span>+ Pay</span>
                                  </button>
                                  {lastTx && (
                                    <button
                                      type="button"
                                      onClick={() => onViewReceipt(lastTx)}
                                      className="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                                      title="View official receipt"
                                    >
                                      {t('receipt', 'Receipt')}
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Undo / Edit Mistaken Payment Buttons */}
                              {lastTx && !lastTx.is_reversed && onEditPayment && (
                                <button
                                  type="button"
                                  onClick={() => onEditPayment(lastTx)}
                                  className="px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors cursor-pointer"
                                  title="Edit or redo this payment if entered mistakenly"
                                >
                                  {t('edit', 'Edit')}
                                </button>
                              )}
                              {lastTx && !lastTx.is_reversed && (
                                <button
                                  type="button"
                                  onClick={() => onRequestReversal(lastTx)}
                                  className="px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer"
                                  title="Undo this payment if marked mistakenly"
                                >
                                  {t('undo', 'Undo')}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => member && onOpenLedger(chit.id, member.id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-neutral-300 hover:border-neutral-900 rounded-md text-[#111111] transition-colors cursor-pointer"
                                title="Open member ledger for this chit"
                              >
                                {t('ledger', 'Ledger')}
                              </button>

                              {membership.is_active && (
                                <div className="flex items-center space-x-0.5">
                                  {totalPaid === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleUndoSeatAssignment(membership.id, member?.full_name || 'Member', membership.seat_number)}
                                      className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 cursor-pointer"
                                      title="Undo mistaken seat assignment"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-neutral-500 hover:text-rose-600" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setRemoveModalMembership(membership)}
                                    className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                                    title="Deactivate seat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Below table: Monthly Chit Shuffling Winners Register */}
          <div className="border-t border-neutral-200 bg-neutral-50/50 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-2xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Monthly Chit Shuffling Winners Register
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {shuffleWinners.length} of {chit.duration_months} monthly shuffling rounds completed
                  </p>
                </div>
              </div>
            </div>

            {shuffleWinners.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center text-xs text-neutral-500">
                No contacts marked as chit shuffled yet. Click the <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Chit Shuffle</span> button beside any contact above to declare this month's winner and automatically send the WhatsApp winner notification.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Round</th>
                      <th className="px-4 py-2.5">Winner Contact</th>
                      <th className="px-4 py-2.5">Mobile Number</th>
                      <th className="px-4 py-2.5">Seat #</th>
                      <th className="px-4 py-2.5">Shuffled Date</th>
                      <th className="px-4 py-2.5">WhatsApp Notification</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {shuffleWinners.map((winner) => (
                      <tr key={winner.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-amber-900">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-bold">
                            Month #{winner.month_number}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-[#111111]">
                          {winner.member_name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-neutral-600">
                          {winner.member_phone}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          #{winner.seat_number}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600">
                          {winner.shuffled_date}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Winner Notified</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              openWhatsAppDirect(
                                winner.member_phone,
                                getWinnerWhatsAppMessage()
                              );
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Resend WhatsApp Winner Message"
                          >
                            <Send className="w-3 h-3" />
                            <span>{t('resend_wa', 'Resend WA')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteShuffleWinner(winner.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md inline-flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Undo and remove this winner mark"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>{t('undo', 'Undo')}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB 3: COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111111]">
              Collections Register for {chit.scheme_code}
            </h2>
            <button
              onClick={() => onOpenRecordPayment(chit.id)}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#262626] text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">Inst #</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Receipt</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {chitTransactions.filter((t) => t.transaction_type === 'collection').map((tx) => {
                  const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
                  const isCash = tx.payment_method === 'cash';
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${tx.is_reversed ? 'bg-neutral-100/50 opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-neutral-900">
                        {tx.receipt_no}
                        {tx.is_reversed && (
                          <span className="ml-1 text-[9px] uppercase px-1 py-0.2 bg-neutral-200 rounded font-bold">
                            Reversed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{tx.transaction_date}</td>
                      <td className="px-4 py-3 font-semibold text-[#111111]">
                        {member?.full_name || tx.payer_name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">Month {tx.installment_no || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isCash ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-900 text-white'
                        }`}>
                          {isCash ? <Banknote className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          <span>{tx.payment_method}</span>
                        </span>
                        {tx.payment_method === 'upi' && tx.bank_account && (
                          <span className="text-[10px] text-neutral-600 font-mono block mt-0.5 font-medium">
                            {tx.bank_account}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-[11px] max-w-xs truncate">
                        {tx.reference_id || tx.collector_notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#111111]">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onViewReceipt(tx)}
                          className="p-1 rounded hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                          title="Print / View Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 inline" />
                        </button>
                        {!tx.is_reversed && onEditPayment && (
                          <button
                            onClick={() => onEditPayment(tx)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                            title="Edit / Redo payment details"
                          >
                            {t('edit', 'Edit')}
                          </button>
                        )}
                        {!tx.is_reversed && (
                          <button
                            onClick={() => onRequestReversal(tx)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                            title="Undo / Reverse this payment"
                          >
                            {t('undo', 'Undo')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CHIT-SPECIFIC CASHBOOK */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          {/* Cashbook Header & Accounts Summary */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                Chit Isolated Cashbook — {chit.scheme_code}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Strict segregation: Cash on hand does not mix with digital UPI accounts
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={exportCashbookCsv}
                className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-neutral-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => onRecordCashbookEntry(chit.id)}
                className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Payout / Expense</span>
              </button>
            </div>
          </div>

          {/* Running balances summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-neutral-500 text-xs font-semibold">
                <Banknote className="w-4 h-4 text-[#111111]" />
                <span>Physical Cash on Hand</span>
              </div>
              <span className="text-xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.cash_collected)}
              </span>
              <span className="text-[10px] text-neutral-500">Vault / cash drawer balance</span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-neutral-500 text-xs font-semibold">
                <Smartphone className="w-4 h-4 text-[#111111]" />
                <span>UPI / Bank Ledger Balance</span>
              </div>
              <span className="text-xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.upi_collected)}
              </span>
              <span className="text-[10px] text-neutral-500">Bank accounts pooled for this chit</span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-neutral-500 text-xs font-semibold">
                <IndianRupee className="w-4 h-4 text-[#111111]" />
                <span>Net Scheme Balance</span>
              </div>
              <span className="text-xl font-bold text-[#111111] mt-1 block">
                {formatCurrency(metrics.cash_collected + metrics.upi_collected)}
              </span>
              <span className="text-[10px] text-neutral-500">Consolidated scheme liquidity</span>
            </div>
          </div>

          {/* Cashbook Ledger Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Receipt / Ref</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Entry Type</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Money In</th>
                    <th className="px-4 py-3 text-right">Money Out</th>
                    <th className="px-4 py-3 text-right">Cash Bal</th>
                    <th className="px-4 py-3 text-right">UPI Bal</th>
                    <th className="px-4 py-3 text-right">Net Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {cashbookRecords.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${r.is_reversed ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3 text-neutral-600">{r.date}</td>
                      <td className="px-4 py-3 font-mono font-medium text-neutral-800">{r.receipt_no}</td>
                      <td className="px-4 py-3 font-semibold text-[#111111]">{r.party_name}</td>
                      <td className="px-4 py-3 uppercase text-[10px] font-bold text-neutral-700">{r.entry_type}</td>
                      <td className="px-4 py-3 uppercase text-[10px] font-medium text-neutral-600">{r.payment_method}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#111111]">
                        {r.money_in > 0 ? formatCurrency(r.money_in) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-600">
                        {r.money_out > 0 ? formatCurrency(r.money_out) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {formatCurrency(r.cash_balance)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-700">
                        {formatCurrency(r.upi_balance)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#111111]">
                        {formatCurrency(r.net_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SCHEDULE AND MATURITY */}
      {activeTab === 'schedule' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">
                Monthly Installment Schedule & Maturity Timeline
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Calendar-month arithmetic schedule ending on {chit.planned_maturity_date}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-md text-xs font-semibold">
              Due on {formatOrdinalDay(chit.due_day)} of every month
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Installment #</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Per Member</th>
                  <th className="px-4 py-3 text-right">Expected Pool</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {schedule.map((inst) => (
                  <tr key={inst.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#111111]">
                      Month {inst.installment_no}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-600">
                      {inst.due_date}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-800">
                      {formatCurrency(inst.expected_per_member)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#111111]">
                      {formatCurrency(inst.expected_total_pool)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inst.status === 'overdue'
                          ? 'bg-neutral-200 text-neutral-800'
                          : inst.status === 'due'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {removeModalMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#111111]">
              Deactivate Seat #{removeModalMembership.seat_number}
            </h3>
            <p className="text-xs text-neutral-600 mt-2">
              Deactivating this member seat will preserve all historical payment records, ledgers, and cashbook transactions.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Mandatory Reason for Deactivation *
              </label>
              <textarea
                rows={2}
                required
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. Subscriber requested premature exit; surrendered seat"
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setRemoveModalMembership(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!removeReason.trim()}
                onClick={handleConfirmRemove}
                className="px-4 py-1.5 text-xs font-semibold bg-[#111111] hover:bg-[#262626] disabled:bg-neutral-300 text-white rounded-lg"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Custom Reminder Modal */}
      <WhatsAppMessageEditorModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setReminderHistory(storageService.getReminderHistory());
        }}
        recipients={activeModalRecipients}
        defaultScheme={chit}
        company={companyProfile}
        currentUser={currentUser}
        config={whatsappConfig}
        onDispatchStarted={() => {
          setReminderHistory(storageService.getReminderHistory());
        }}
      />

      {/* Chit Shuffle Winner Modal */}
      {shuffleModalRow && shuffleModalRow.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-neutral-200">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Mark Chit Shuffling Winner
                </h3>
                <p className="text-xs text-neutral-500">
                  {shuffleModalRow.member.full_name} • Seat #{shuffleModalRow.membership.seat_number} • {chit.name}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Shuffling Round / Month *
                  </label>
                  <select
                    value={shuffleMonthNumber}
                    onChange={(e) => setShuffleMonthNumber(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  >
                    {Array.from({ length: chit.duration_months }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Month #{m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Shuffled Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={shuffleDate}
                    onChange={(e) => setShuffleDate(e.target.value)}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg px-3 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* WhatsApp Message Preview Box */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Message to be Sent to Subscriber:</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 font-sans text-xs text-neutral-800 leading-relaxed shadow-2xs font-medium">
                  "{getWinnerWhatsAppMessage()}"
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                  <p className="text-[11px] text-emerald-800">
                    Recipient Mobile: <span className="font-mono font-bold text-emerald-950">{shuffleModalRow.member.phone}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = getWinnerWhatsAppMessage();
                      openWhatsAppDirect(shuffleModalRow.member!.phone, msg);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                    title="Open WhatsApp Web or App directly with winner message"
                  >
                    <Send className="w-3 h-3" />
                    <span>Direct WhatsApp Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons: Separate Mark & WhatsApp Sharing */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShuffleModalRow(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                {shuffleWinnerMap.has(shuffleModalRow.membership.id) && (
                  <button
                    type="button"
                    onClick={() => handleUndoShuffleForMembership(shuffleModalRow.membership.id, shuffleModalRow.member!.full_name)}
                    className="px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Undo this winner mark if marked mistakenly"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t('undo_remove_mark', 'Undo / Remove Winner Mark')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* 1. SEPARATE BUTTON: Mark / Update Record Only */}
                <button
                  type="button"
                  onClick={handleSaveShuffleOnly}
                  className="px-3.5 py-2 text-xs font-bold bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Mark or update this member as winner in the register without opening WhatsApp"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {shuffleWinnerMap.has(shuffleModalRow.membership.id)
                      ? t('update_mark_only', 'Update Mark Only')
                      : t('mark_as_shuffled', 'Mark as Shuffled')}
                  </span>
                </button>

                {/* 2. SEPARATE BUTTON: WhatsApp Sharing */}
                <button
                  type="button"
                  onClick={handleSaveAndShareWhatsApp}
                  className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Mark as winner and immediately share the winner notification via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('share_on_whatsapp', 'Share on WhatsApp')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

