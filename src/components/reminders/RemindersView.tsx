import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Send,
  MessageSquare,
  Phone,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Info,
  Search,
  BookOpen,
  History,
  Bell,
  Trash2,
  Plus,
  Eye,
  Bookmark,
  Sparkles,
  Smartphone,
  Layers,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  ChitMembership,
  CompanyProfile,
  FinancialTransaction,
  UserProfile,
  WhatsAppTemplate,
  ReminderRecipientInfo,
  ReminderHistoryItem,
  ReminderCategory,
} from '../../types';
import { formatCurrency } from '../../utils/financial';
import {
  whatsappApi,
  WhatsAppBackendConfig,
  DispatchBatch,
  WhatsAppJob,
} from '../../services/whatsappApi';
import { storageService } from '../../services/storage';
import {
  AVAILABLE_PLACEHOLDERS,
  renderWhatsAppTemplate,
} from '../../utils/whatsappTemplates';
import { WhatsAppMessageEditorModal } from './WhatsAppMessageEditorModal';

interface RemindersViewProps {
  schemes: ChitScheme[];
  members: CompanyMember[];
  memberships: ChitMembership[];
  transactions: FinancialTransaction[];
  company: CompanyProfile;
  currentUser?: UserProfile;
}

interface UnpaidMemberItem {
  member: CompanyMember;
  scheme: ChitScheme;
  membership: ChitMembership;
  amountDue: number;
  totalPaid: number;
  pendingDue: number;
  dueDay: number;
  monthsElapsed: number;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  schemes,
  members,
  memberships,
  transactions,
  company,
  currentUser,
}) => {
  // Main view navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<'reminders' | 'history' | 'templates'>('reminders');

  // WhatsApp Backend API State
  const [config, setConfig] = useState<WhatsAppBackendConfig | null>(null);
  const [activeDispatch, setActiveDispatch] = useState<DispatchBatch | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Config Form State
  const [configForm, setConfigForm] = useState({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    templateName: '',
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Unpaid Selection & Checkbox State
  const [selectedUnpaidKeys, setSelectedUnpaidKeys] = useState<Set<string>>(new Set());

  // Message Editor Modal State
  const [isMessageEditorOpen, setIsMessageEditorOpen] = useState(false);
  const [editorRecipients, setEditorRecipients] = useState<ReminderRecipientInfo[]>([]);
  const [editorTargetScheme, setEditorTargetScheme] = useState<ChitScheme | undefined>();

  // UI Utilities
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<string>('all');

  // Message History State
  const [historyItems, setHistoryItems] = useState<ReminderHistoryItem[]>([]);
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [viewingHistoryMessage, setViewingHistoryMessage] = useState<ReminderHistoryItem | null>(null);
  const [backendDispatches, setBackendDispatches] = useState<DispatchBatch[]>([]);

  // Templates Management State
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templateModalMode, setTemplateModalMode] = useState<'create' | 'edit' | 'preview' | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'custom' as ReminderCategory,
    body: '',
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const membersMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const activeUser = useMemo(() => {
    return currentUser || storageService.getCurrentUser();
  }, [currentUser]);

  // Load WhatsApp Config, Active Dispatch, History & Templates on Mount
  useEffect(() => {
    loadConfig();
    loadActiveDispatch();
    loadHistory();
    loadTemplates();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await whatsappApi.getConfig();
      setConfig(cfg);
      setConfigForm({
        phoneNumberId: cfg.phoneNumberId || '',
        accessToken: '',
        businessAccountId: cfg.businessAccountId || '',
        templateName: cfg.templateName || '',
      });
    } catch (e) {
      console.error('Failed to load WhatsApp config', e);
    }
  };

  const loadActiveDispatch = async () => {
    try {
      const active = await whatsappApi.getActiveDispatch();
      if (active) {
        setActiveDispatch(active);
        if (active.status === 'processing') {
          startPolling(active.id);
        }
      }
    } catch (e) {
      console.error('Failed to load active dispatch', e);
    }
  };

  const loadHistory = async () => {
    try {
      const local = storageService.getReminderHistory();
      setHistoryItems(local);
      const backendHistory = await whatsappApi.getHistory();
      setBackendDispatches(backendHistory);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const loadTemplates = () => {
    const list = storageService.getTemplates();
    setTemplates(list);
  };

  const startPolling = (dispatchId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await whatsappApi.getDispatchStatus(dispatchId);
        if (updated) {
          setActiveDispatch(updated);
          // Sync live job updates to local history
          updated.jobs.forEach((j) => {
            storageService.updateReminderStatus(
              j.whatsappMessageId || `hist-${j.id}`,
              j.status,
              j.error
            );
          });
          setHistoryItems(storageService.getReminderHistory());

          if (updated.status !== 'processing') {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1500);
  };

  // Identify members who have NOT paid their installments for active schemes
  const allUnpaidMembers = useMemo(() => {
    const list: UnpaidMemberItem[] = [];
    const activeSchemes = schemes.filter((s) => s.status === 'active');
    const now = new Date();

    activeSchemes.forEach((sch) => {
      const start = new Date(sch.start_date);
      const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const monthsElapsed = Math.min(sch.duration_months, Math.max(1, monthsDiff + 1));

      const schMemberships = memberships.filter((m) => m.chit_id === sch.id && m.is_active);
      schMemberships.forEach((cms) => {
        const mem = membersMap.get(cms.member_id);
        if (!mem) return;

        const monthlyRate = cms.expected_monthly_contribution || sch.monthly_installment_amount;

        const memberTxs = transactions.filter(
          (t) =>
            t.chit_id === sch.id &&
            t.member_id === mem.id &&
            !t.is_reversed &&
            (t.transaction_type === 'collection' || t.transaction_type === 'adjustment')
        );

        const totalPaid = memberTxs.reduce((sum, t) => sum + t.amount, 0);
        const expectedTotalToDate = monthlyRate * monthsElapsed;
        const pendingDue = Math.max(0, expectedTotalToDate - totalPaid);

        // ONLY showcase subscribers who have NOT paid
        if (pendingDue > 0) {
          list.push({
            member: mem,
            scheme: sch,
            membership: cms,
            amountDue: monthlyRate,
            totalPaid,
            pendingDue,
            dueDay: sch.due_day,
            monthsElapsed,
          });
        }
      });
    });

    return list;
  }, [schemes, memberships, membersMap, transactions]);

  // Filtered unpaid subscribers by scheme
  const unpaidMembers = useMemo(() => {
    if (selectedSchemeFilter === 'all') return allUnpaidMembers;
    return allUnpaidMembers.filter((item) => item.scheme.id === selectedSchemeFilter);
  }, [allUnpaidMembers, selectedSchemeFilter]);

  // Schemes approaching maturity (within 60 days)
  const maturingSchemes = useMemo(() => {
    const today = new Date();
    return schemes
      .filter((s) => s.status === 'active')
      .map((s) => {
        const maturity = new Date(s.planned_maturity_date);
        const diffDays = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { scheme: s, diffDays };
      })
      .filter((item) => item.diffDays <= 60 && item.diffDays >= 0)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [schemes]);

  // Map job by member and seat for live status display
  const jobMap = useMemo(() => {
    const map = new Map<string, WhatsAppJob>();
    if (activeDispatch?.jobs) {
      activeDispatch.jobs.forEach((job) => {
        map.set(`${job.memberId}_${job.schemeId}_${job.seatNumber}`, job);
      });
    }
    return map;
  }, [activeDispatch]);

  const stats = activeDispatch?.stats;

  // Generate personalized reminder message string for SMS copy
  const getPersonalizedReminder = (item: UnpaidMemberItem) => {
    return `Hi ${item.member.full_name}, this is a friendly reminder that your pending payment is ${formatCurrency(item.pendingDue)} for Seat #${item.membership.seat_number} (${item.scheme.name}). Please complete your payment at your earliest convenience. Thank you!`;
  };

  const handleCopySms = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAllSms = () => {
    if (unpaidMembers.length === 0) return;
    const combined = unpaidMembers
      .map(
        (item, idx) =>
          `[#${idx + 1}] ${item.member.full_name} (${item.member.phone}) - Seat #${item.membership.seat_number}\n${getPersonalizedReminder(item)}`
      )
      .join('\n\n----------------------------------------\n\n');

    navigator.clipboard.writeText(combined);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  // Selection handlers
  const handleSelectAllUnpaid = () => {
    setSelectedUnpaidKeys(
      new Set(unpaidMembers.map((item) => `${item.member.id}_${item.scheme.id}_${item.membership.seat_number}`))
    );
  };

  const handleDeselectAllUnpaid = () => {
    setSelectedUnpaidKeys(new Set());
  };

  // Convert UnpaidMemberItem to ReminderRecipientInfo
  const mapUnpaidToRecipient = (item: UnpaidMemberItem): ReminderRecipientInfo => ({
    memberId: item.member.id,
    memberName: item.member.full_name,
    phone: item.member.phone,
    seatNumber: item.membership.seat_number,
    schemeId: item.scheme.id,
    schemeName: item.scheme.name,
    schemeCode: item.scheme.scheme_code,
    amountDue: item.pendingDue,
    dueDate: `${item.dueDay}th of this month`,
    paymentStatus: 'Unpaid',
  });

  // Action: Open Modal for Individual Member
  const handleOpenIndividualReminder = (item: UnpaidMemberItem) => {
    setEditorRecipients([mapUnpaidToRecipient(item)]);
    setEditorTargetScheme(item.scheme);
    setIsMessageEditorOpen(true);
  };

  // Action: Open Modal for Selected Members
  const handleOpenSelectedReminders = () => {
    const selectedItems = unpaidMembers.filter((item) => {
      const key = `${item.member.id}_${item.scheme.id}_${item.membership.seat_number}`;
      return selectedUnpaidKeys.has(key);
    });

    if (selectedItems.length === 0) return;
    setEditorRecipients(selectedItems.map(mapUnpaidToRecipient));
    setEditorTargetScheme(
      selectedSchemeFilter !== 'all' ? schemes.find((s) => s.id === selectedSchemeFilter) : undefined
    );
    setIsMessageEditorOpen(true);
  };

  // Action: Open Modal for Everyone
  const handleOpenEveryoneReminders = () => {
    if (unpaidMembers.length === 0) return;
    setEditorRecipients(unpaidMembers.map(mapUnpaidToRecipient));
    setEditorTargetScheme(
      selectedSchemeFilter !== 'all' ? schemes.find((s) => s.id === selectedSchemeFilter) : undefined
    );
    setIsMessageEditorOpen(true);
  };

  // Retry failed jobs in the active batch
  const handleRetryFailed = async () => {
    if (!activeDispatch) return;
    setIsRetrying(true);
    try {
      const updated = await whatsappApi.retryFailed(activeDispatch.id);
      setActiveDispatch(updated);
      startPolling(updated.id);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  // Save WhatsApp Cloud API Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await whatsappApi.saveConfig({
        phoneNumberId: configForm.phoneNumberId,
        accessToken: configForm.accessToken || undefined,
        businessAccountId: configForm.businessAccountId,
        templateName: configForm.templateName,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadConfig();
      }
    } catch (err: any) {
      alert(`Failed to save WhatsApp config: ${err.message}`);
    }
  };

  // Test WhatsApp Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await whatsappApi.testConnection({
        phoneNumberId: configForm.phoneNumberId,
        accessToken: configForm.accessToken || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Clear Message History
  const handleClearHistory = async () => {
    if (window.confirm('Clear all local and server message history logs?')) {
      storageService.clearReminderHistory();
      await whatsappApi.clearHistory();
      setHistoryItems([]);
      setBackendDispatches([]);
    }
  };

  // Filtered History Items
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      if (historyFilterStatus !== 'all' && item.status !== historyFilterStatus) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesName = item.recipientName.toLowerCase().includes(q);
        const matchesPhone = item.recipientPhone.toLowerCase().includes(q);
        const matchesScheme = (item.schemeName || '').toLowerCase().includes(q);
        const matchesMsg = item.messageContent.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesScheme && !matchesMsg) return false;
      }
      return true;
    });
  }, [historyItems, historyFilterStatus, historySearch]);

  // Template Form Submit (Create or Edit)
  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.body.trim()) return;

    if (templateModalMode === 'edit' && activeTemplate) {
      storageService.updateTemplate(activeTemplate.id, {
        name: templateForm.name.trim(),
        category: templateForm.category,
        body: templateForm.body.trim(),
      });
    } else {
      storageService.saveTemplate({
        name: templateForm.name.trim(),
        category: templateForm.category,
        body: templateForm.body.trim(),
        isSystem: false,
        isMetaApproved: false,
      });
    }

    loadTemplates();
    setTemplateModalMode(null);
    setActiveTemplate(null);
  };

  const handleDuplicateTemplate = (tmpl: WhatsAppTemplate) => {
    storageService.duplicateTemplate(tmpl.id);
    loadTemplates();
  };

  const handleDeleteTemplate = (tmpl: WhatsAppTemplate) => {
    if (tmpl.isSystem) {
      alert('System templates cannot be deleted.');
      return;
    }
    if (window.confirm(`Delete template "${tmpl.name}"?`)) {
      storageService.deleteTemplate(tmpl.id);
      loadTemplates();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Navigation & WhatsApp Connection Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              WhatsApp Messaging & Reminders
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Custom message composer, placeholder preview, bulk dispatch, and delivery audit history
          </p>
        </div>

        {/* API Connection Status Button */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-colors cursor-pointer ${
              config?.isConfigured
                ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            {config?.isConfigured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WhatsApp Cloud API Active</span>
                <Settings className="w-3.5 h-3.5 text-neutral-500 ml-1" />
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Configure WhatsApp API</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Three Main Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 text-xs font-semibold">
        <button
          onClick={() => setActiveMainTab('reminders')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeMainTab === 'reminders'
              ? 'border-[#111111] text-[#111111] font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Dues & Reminders ({unpaidMembers.length})</span>
        </button>

        <button
          onClick={() => {
            loadHistory();
            setActiveMainTab('history');
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeMainTab === 'history'
              ? 'border-[#111111] text-[#111111] font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Message History & Logs ({historyItems.length})</span>
        </button>

        <button
          onClick={() => {
            loadTemplates();
            setActiveMainTab('templates');
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 cursor-pointer transition-colors ${
            activeMainTab === 'templates'
              ? 'border-[#111111] text-[#111111] font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Message Templates ({templates.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: DUES & REMINDERS (UNPAID SUBSCRIBERS TABLE)
         ========================================================================= */}
      {activeMainTab === 'reminders' && (
        <div className="space-y-6">
          {/* Schemes Nearing Maturity Section */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6">
            <h2 className="text-base font-bold text-[#111111] flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-[#111111]" />
              <span>Schemes Nearing Planned Maturity (30, 15, 7, 1 Days)</span>
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Prepare final auction dividends and member security clearances
            </p>

            {maturingSchemes.length === 0 ? (
              <div className="p-6 bg-neutral-50 rounded-xl text-center text-xs text-neutral-500 border border-neutral-200">
                No active schemes are maturing within the next 60 days.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {maturingSchemes.map(({ scheme, diffDays }) => (
                  <div
                    key={scheme.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-sm text-[#111111] block">{scheme.name}</span>
                      <span className="text-xs text-neutral-500">
                        Scheme: {scheme.scheme_code} • Maturity: {scheme.planned_maturity_date}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-[#111111] text-white text-xs font-bold rounded-lg block">
                        {diffDays} Days Left
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Pot: {formatCurrency(scheme.total_pot_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LIVE PROGRESS DASHBOARD (When active batch exists) */}
          {activeDispatch && stats && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-[#111111]">
                      WhatsApp Bulk Dispatch Dashboard
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeDispatch.status === 'processing'
                          ? 'bg-neutral-900 text-white animate-pulse'
                          : activeDispatch.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {activeDispatch.status === 'processing' ? 'Processing in Background' : activeDispatch.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Batch ID: <span className="font-mono text-neutral-700">{activeDispatch.id}</span> • Meta Cloud API Concurrency Guard
                  </p>
                </div>

                {stats.failed > 0 && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={isRetrying || activeDispatch.status === 'processing'}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>Retry Failed ({stats.failed})</span>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">
                    {stats.total - stats.remaining} of {stats.total} reminders processed
                  </span>
                  <span className="font-bold text-[#111111]">
                    {Math.round(((stats.total - stats.remaining) / (stats.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.failed > 0 && stats.remaining === 0 ? 'bg-amber-500' : 'bg-[#111111]'
                    }`}
                    style={{
                      width: `${((stats.total - stats.remaining) / (stats.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-lg text-center">
                  <span className="text-[11px] text-neutral-500 uppercase tracking-wider block font-semibold">Total</span>
                  <span className="text-xl font-bold text-[#111111] mt-0.5 block">{stats.total}</span>
                </div>

                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-lg text-center">
                  <span className="text-[11px] text-neutral-500 uppercase tracking-wider block font-semibold">Queued</span>
                  <span className="text-xl font-bold text-neutral-700 mt-0.5 block">{stats.queued}</span>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-center">
                  <span className="text-[11px] text-blue-700 uppercase tracking-wider block font-semibold">Processing</span>
                  <span className="text-xl font-bold text-blue-900 mt-0.5 block">{stats.processing}</span>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-center">
                  <span className="text-[11px] text-emerald-700 uppercase tracking-wider block font-semibold">Accepted</span>
                  <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{stats.accepted}</span>
                </div>

                <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-lg text-center">
                  <span className="text-[11px] text-emerald-800 uppercase tracking-wider block font-semibold">Delivered</span>
                  <span className="text-xl font-bold text-emerald-950 mt-0.5 block">{stats.delivered}</span>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-center">
                  <span className="text-[11px] text-rose-700 uppercase tracking-wider block font-semibold">Failed</span>
                  <span className="text-xl font-bold text-rose-900 mt-0.5 block">{stats.failed}</span>
                </div>
              </div>
            </div>
          )}

          {/* UNPAID SUBSCRIBERS TABLE WITH SELECTION & REMINDER ACTIONS */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-neutral-200 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-[#111111]">
                      Unpaid Subscriber Reminders
                    </h2>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-neutral-900 text-white">
                      {unpaidMembers.length} Unpaid
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select subscribers using checkboxes to send customized reminders, or message everyone in one operation.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Scheme Filter */}
                  {schemes.length > 1 && (
                    <select
                      value={selectedSchemeFilter}
                      onChange={(e) => setSelectedSchemeFilter(e.target.value)}
                      className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Schemes ({allUnpaidMembers.length})</option>
                      {schemes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.scheme_code})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Copy All SMS */}
                  <button
                    onClick={handleCopyAllSms}
                    disabled={unpaidMembers.length === 0}
                    className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                    title="Copy all formatted reminder templates"
                  >
                    {allCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neutral-900" />
                        <span>All Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Copy All SMS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bulk Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllUnpaid}
                    className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] bg-white border border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors shadow-2xs"
                  >
                    Select All ({unpaidMembers.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllUnpaid}
                    disabled={selectedUnpaidKeys.size === 0}
                    className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] bg-white border border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors disabled:opacity-40 shadow-2xs"
                  >
                    Deselect All
                  </button>
                  <span className="text-xs font-semibold text-neutral-600 pl-1">
                    {selectedUnpaidKeys.size} of {unpaidMembers.length} selected
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedUnpaidKeys.size > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenSelectedReminders}
                      className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Selected ({selectedUnpaidKeys.size})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenEveryoneReminders}
                    disabled={unpaidMembers.length === 0}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-40"
                    title="Sends individual customized WhatsApp messages to all eligible unpaid subscribers (NOT a group message)"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Everyone ({unpaidMembers.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Unpaid Subscriber List */}
            {unpaidMembers.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 bg-neutral-100 text-neutral-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    All Subscribers Are Paid Up!
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    There are no pending dues across your active chit schemes. Every enrolled subscriber has completed their installment payments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {unpaidMembers.map((item) => {
                  const { member, scheme, membership, amountDue, pendingDue, totalPaid, dueDay } = item;
                  const itemKey = `${member.id}_${scheme.id}_${membership.seat_number}`;
                  const isSelected = selectedUnpaidKeys.has(itemKey);
                  const job = jobMap.get(itemKey);
                  const smsText = getPersonalizedReminder(item);

                  return (
                    <div
                      key={itemKey}
                      className={`p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50/70 transition-colors ${
                        isSelected ? 'bg-neutral-50/90' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3 max-w-2xl">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedUnpaidKeys);
                            if (e.target.checked) next.add(itemKey);
                            else next.delete(itemKey);
                            setSelectedUnpaidKeys(next);
                          }}
                          className="mt-1 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        />

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#111111]">{member.full_name}</span>
                            <span className="font-mono text-xs text-neutral-500">{member.phone}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                              Seat #{membership.seat_number}
                            </span>
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-900 border border-neutral-300">
                              Pending: {formatCurrency(pendingDue)}
                            </span>

                            {/* LIVE STATUS BADGES */}
                            {job ? (
                              job.status === 'queued' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                                  Queued
                                </span>
                              ) : job.status === 'sending' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 flex items-center space-x-1 animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Sending...</span>
                                </span>
                              ) : job.status === 'accepted' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>Accepted</span>
                                </span>
                              ) : job.status === 'delivered' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-700 text-white flex items-center space-x-1">
                                  <CheckCheck className="w-3 h-3" />
                                  <span>Delivered</span>
                                </span>
                              ) : (
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 flex items-center space-x-1"
                                  title={job.error}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Failed</span>
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-50 text-neutral-500">
                                Ready for Dispatch
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>Scheme: <strong className="text-neutral-700">{scheme.name}</strong> ({scheme.scheme_code})</span>
                            <span>•</span>
                            <span>Monthly Installment: {formatCurrency(amountDue)}</span>
                            <span>•</span>
                            <span>Due Day: {dueDay}th of month</span>
                            {totalPaid > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-neutral-600">Paid so far: {formatCurrency(totalPaid)}</span>
                              </>
                            )}
                          </div>

                          {job?.status === 'failed' && job.error && (
                            <p className="text-[11px] text-rose-600 font-mono bg-rose-50/80 p-1.5 rounded border border-rose-200">
                              Reason: {job.error}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions for this individual subscriber */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Send Individual Reminder Action */}
                        <button
                          onClick={() => handleOpenIndividualReminder(item)}
                          className="px-3 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Open message editor to customize and send reminder to this member"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send Reminder</span>
                        </button>

                        <button
                          onClick={() => handleCopySms(smsText, itemKey)}
                          className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Copy SMS text"
                        >
                          {copiedId === itemKey ? (
                            <>
                              <Check className="w-3 h-3 text-neutral-900" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-neutral-600" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`tel:${member.phone}`}
                          className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                          title="Call member"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MESSAGE HISTORY & DELIVERY AUDIT LOGS
         ========================================================================= */}
      {activeMainTab === 'history' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                WhatsApp Reminder Message History & Delivery Audit
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Full chronological transmission logs, provider message IDs (wamid), and status tracking
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadHistory}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
                <span>Refresh Logs</span>
              </button>

              {historyItems.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-neutral-600">Filter Status:</span>
              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({historyItems.length})</option>
                <option value="delivered">Delivered</option>
                <option value="accepted">Accepted / Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
                <option value="manual_opened">Opened in WhatsApp</option>
              </select>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search recipient, phone or chit..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          {/* History Records Table */}
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
              No reminder transmissions found in message history matching your filter.
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Scheme & Seat</th>
                    <th className="px-4 py-3">Template / Message</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-neutral-500 text-[11px]">
                        {new Date(item.sentAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#111111]">
                        {item.recipientName}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-600">
                        {item.recipientPhone}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {item.schemeName || 'General'} {item.seatNumber ? `(#${item.seatNumber})` : ''}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-neutral-600">
                        {item.messageContent}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {item.channel === 'whatsapp_cloud_api' ? 'Cloud API' : 'Manual WhatsApp'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'delivered'
                              ? 'bg-emerald-700 text-white'
                              : item.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : item.status === 'skipped'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {item.status === 'manual_opened' ? 'Opened' : item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewingHistoryMessage(item)}
                          className="px-2 py-1 text-xs text-neutral-700 hover:text-[#111111] hover:bg-neutral-200 rounded font-semibold cursor-pointer"
                        >
                          View Full
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: MESSAGE TEMPLATES MANAGEMENT
         ========================================================================= */}
      {activeMainTab === 'templates' && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                WhatsApp Reminder Message Templates
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Create, edit, duplicate, and reuse templates for payment dues, overdue notices, receipts, and announcements
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setTemplateForm({
                    name: '',
                    category: 'custom',
                    body: 'Hi {{member_name}}, this is a friendly reminder from {{company_name}} regarding {{chit_name}} (Seat {{seat_number}}). Amount due: {{amount}}, payable on {{due_date}}. Thank you!',
                  });
                  setActiveTemplate(null);
                  setTemplateModalMode('create');
                }}
                className="px-3.5 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Template</span>
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#111111]">{tmpl.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                      {tmpl.category}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-800 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {tmpl.body}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                  <span className="text-[10px] text-neutral-500">
                    {tmpl.isSystem ? 'Default System Template' : 'Custom User Template'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDuplicateTemplate(tmpl)}
                      className="px-2 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] hover:bg-neutral-200 rounded cursor-pointer"
                      title="Duplicate template"
                    >
                      <Copy className="w-3 h-3 inline mr-1" />
                      <span>Duplicate</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTemplate(tmpl);
                        setTemplateForm({
                          name: tmpl.name,
                          category: tmpl.category,
                          body: tmpl.body,
                        });
                        setTemplateModalMode('edit');
                      }}
                      className="px-2 py-1 text-xs font-semibold text-neutral-700 hover:text-[#111111] hover:bg-neutral-200 rounded cursor-pointer"
                    >
                      Edit
                    </button>

                    {!tmpl.isSystem && (
                      <button
                        onClick={() => handleDeleteTemplate(tmpl)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete custom template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL 1: VIEW FULL HISTORY MESSAGE DETAILS
         ========================================================================= */}
      {viewingHistoryMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-bold text-sm text-[#111111]">
                Transmission Details & Message Body
              </h3>
              <button
                onClick={() => setViewingHistoryMessage(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">Recipient:</span>
                  <span className="font-bold text-[#111111]">{viewingHistoryMessage.recipientName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Phone Number:</span>
                  <span className="font-mono text-[#111111]">{viewingHistoryMessage.recipientPhone}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Delivery Status:</span>
                  <span className="font-bold uppercase text-[#111111]">{viewingHistoryMessage.status}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Timestamp:</span>
                  <span className="font-mono text-neutral-700">{new Date(viewingHistoryMessage.sentAt).toLocaleString()}</span>
                </div>
                {viewingHistoryMessage.providerMessageId && (
                  <div className="col-span-2">
                    <span className="text-neutral-500 block">Meta Provider Message ID:</span>
                    <span className="font-mono text-neutral-700 break-all">{viewingHistoryMessage.providerMessageId}</span>
                  </div>
                )}
                {viewingHistoryMessage.errorMessage && (
                  <div className="col-span-2 text-rose-700">
                    <span className="block font-semibold">Error Message:</span>
                    <span className="font-mono">{viewingHistoryMessage.errorMessage}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-semibold text-neutral-700 block mb-1">Delivered Message Text:</span>
                <div className="p-3 bg-neutral-100 rounded-lg text-neutral-800 text-[11px] font-mono whitespace-pre-wrap leading-relaxed border border-neutral-200">
                  {viewingHistoryMessage.messageContent}
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setViewingHistoryMessage(null)}
                className="px-4 py-1.5 bg-[#111111] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL 2: CREATE / EDIT TEMPLATE MODAL
         ========================================================================= */}
      {templateModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-bold text-sm text-[#111111]">
                {templateModalMode === 'edit' ? 'Edit Message Template' : 'Create New Message Template'}
              </h3>
              <button
                onClick={() => setTemplateModalMode(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festival Season Due Reminder"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Category
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as ReminderCategory })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-xs text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none cursor-pointer"
                >
                  <option value="due_date">Payment Due Date</option>
                  <option value="overdue">Overdue Payment</option>
                  <option value="payment_confirmation">Payment Confirmation</option>
                  <option value="monthly_installment">Monthly Installment</option>
                  <option value="general_announcement">General Announcement</option>
                  <option value="custom">Custom Template</option>
                </select>
              </div>

              {/* Placeholder helper chips */}
              <div>
                <span className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Click to insert placeholder tags:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_PLACEHOLDERS.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setTemplateForm({ ...templateForm, body: templateForm.body + item.tag })}
                      className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded text-[10px] font-mono text-neutral-800 cursor-pointer"
                      title={item.description}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Message Body Content *
                </label>
                <textarea
                  rows={5}
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Template text containing {{member_name}}, {{amount}}, etc..."
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs font-mono text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-neutral-50 border-t border-neutral-200 -mx-5 -mb-5 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalMode(null)}
                  className="px-3.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL 3: WHATSAPP BUSINESS PLATFORM CONFIGURATION MODAL
         ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#111111] text-white rounded-lg">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">
                    Meta WhatsApp Business Cloud API Configuration
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Official Meta Graph API v21.0 Credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-600 text-[11px] leading-relaxed">
                <p>
                  To send automated messages without browser popups, configure your credentials from the{' '}
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-neutral-900 underline inline-flex items-center space-x-0.5"
                  >
                    <span>Meta for Developers Portal</span>
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  . Credentials are saved securely in the backend server and never exposed in client code.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104829104928172"
                  value={configForm.phoneNumberId}
                  onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-[#111111] font-mono focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  Found under WhatsApp &gt; API Setup in Meta App Dashboard
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Cloud API Access Token *
                </label>
                <input
                  type="password"
                  placeholder={config?.isConfigured ? '••••••••••••••••••••••••••••••••' : 'EAAG...'}
                  value={configForm.accessToken}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-[#111111] font-mono focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  System User Permanent Token with <code>whatsapp_business_messaging</code> permission
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109283746592819"
                  value={configForm.businessAccountId}
                  onChange={(e) => setConfigForm({ ...configForm, businessAccountId: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-[#111111] font-mono focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Message Template Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to send direct custom reminder message"
                  value={configForm.templateName}
                  onChange={(e) => setConfigForm({ ...configForm, templateName: e.target.value })}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2.5 text-xs text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  For outbound business messages outside active 24-hr windows, specify your approved Meta template name
                </span>
              </div>

              {/* Test Connection Button & Result */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !configForm.phoneNumberId}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Test Connection with Meta API</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-[11px] font-mono border ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-1.5">
                  <Check className="w-4 h-4" />
                  <span>Credentials updated successfully!</span>
                </div>
              )}

              <div className="p-4 border-t border-neutral-200 bg-neutral-50 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save & Activate Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE CUSTOM MESSAGE EDITOR & DISPATCH MODAL
         ========================================================================= */}
      <WhatsAppMessageEditorModal
        isOpen={isMessageEditorOpen}
        onClose={() => {
          setIsMessageEditorOpen(false);
          loadHistory();
        }}
        recipients={editorRecipients}
        defaultScheme={editorTargetScheme}
        company={company}
        currentUser={activeUser}
        config={config}
        onDispatchStarted={(batch) => {
          setActiveDispatch(batch);
          startPolling(batch.id);
          loadHistory();
        }}
        onOpenConfigModal={() => {
          setIsMessageEditorOpen(false);
          setIsConfigModalOpen(true);
        }}
      />
    </div>
  );
};
