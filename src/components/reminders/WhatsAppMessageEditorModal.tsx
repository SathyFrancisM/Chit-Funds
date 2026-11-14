import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Eye,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Bookmark,
  Sparkles,
  Smartphone,
  Info,
  Clock,
  CheckCheck,
  Layers,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyProfile,
  UserProfile,
  WhatsAppTemplate,
  ReminderRecipientInfo,
} from '../../types';
import {
  AVAILABLE_PLACEHOLDERS,
  renderWhatsAppTemplate,
  validateRecipientPhone,
  categorizeRecipients,
  buildWhatsAppDirectUrl,
} from '../../utils/whatsappTemplates';
import {
  whatsappApi,
  WhatsAppBackendConfig,
  DispatchBatch,
  WhatsAppJob,
} from '../../services/whatsappApi';
import { storageService } from '../../services/storage';
import { formatCurrency } from '../../utils/financial';

interface WhatsAppMessageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: ReminderRecipientInfo[];
  defaultScheme?: ChitScheme;
  company: CompanyProfile;
  currentUser: UserProfile;
  config: WhatsAppBackendConfig | null;
  onDispatchStarted?: (batch: DispatchBatch) => void;
  onOpenConfigModal?: () => void;
}

export const WhatsAppMessageEditorModal: React.FC<WhatsAppMessageEditorModalProps> = ({
  isOpen,
  onClose,
  recipients,
  defaultScheme,
  company,
  currentUser,
  config,
  onDispatchStarted,
  onOpenConfigModal,
}) => {
  // Templates state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-due-date');

  // Editor message text
  const [messageText, setMessageText] = useState<string>('');
  const [isDraftModified, setIsDraftModified] = useState(false);

  // Template saving state
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active preview recipient index
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Confirmation & sending states
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [forceSendDuplicates, setForceSendDuplicates] = useState(false);
  const [sendMethod, setSendMethod] = useState<'cloud_api' | 'manual_whatsapp'>('cloud_api');

  // Active batch progress inside modal
  const [activeBatch, setActiveBatch] = useState<DispatchBatch | null>(null);
  const [isRetryingJob, setIsRetryingJob] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fallback manual sequence state
  const [manualSentMemberIds, setManualSentMemberIds] = useState<Set<string>>(new Set());

  // Load templates on open
  useEffect(() => {
    if (isOpen) {
      const tmpls = storageService.getTemplates();
      setTemplates(tmpls);

      // Find appropriate default template based on scheme or due status
      const dueTmpl = tmpls.find((t) => t.category === 'due_date') || tmpls[0];
      if (dueTmpl) {
        setSelectedTemplateId(dueTmpl.id);
        setMessageText(dueTmpl.body);
        setIsDraftModified(false);
      }

      // Default send method based on config
      if (config?.isConfigured) {
        setSendMethod('cloud_api');
      } else {
        setSendMethod('manual_whatsapp');
      }

      setIsConfirming(false);
      setActiveBatch(null);
      setPreviewRecipientIdx(0);
      setManualSentMemberIds(new Set());
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, config]);

  // Recipient analysis
  const { valid, invalid } = useMemo(() => {
    return categorizeRecipients(recipients);
  }, [recipients]);

  // Current preview recipient
  const currentPreviewRecipient = useMemo(() => {
    if (recipients.length === 0) return null;
    return recipients[previewRecipientIdx] || recipients[0];
  }, [recipients, previewRecipientIdx]);

  // Rendered text for current preview recipient
  const previewRenderedText = useMemo(() => {
    if (!currentPreviewRecipient) return '';
    return renderWhatsAppTemplate(messageText, {
      memberName: currentPreviewRecipient.memberName,
      chitName: currentPreviewRecipient.schemeName || defaultScheme?.name || 'Chit Scheme',
      amount: currentPreviewRecipient.amountDue,
      dueDate: currentPreviewRecipient.dueDate,
      paymentStatus: currentPreviewRecipient.paymentStatus || 'Due',
      seatNumber: currentPreviewRecipient.seatNumber,
      companyName: company.name,
    });
  }, [messageText, currentPreviewRecipient, defaultScheme, company.name]);

  // Handle template selection change
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setMessageText(tmpl.body);
      setIsDraftModified(false);
    }
  };

  // Insert placeholder at current cursor position
  const handleInsertPlaceholder = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessageText((prev) => prev + tag);
      setIsDraftModified(true);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = messageText;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setMessageText(updated);
    setIsDraftModified(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Save customized message as a brand new template
  const handleSaveAsNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      const saved = storageService.saveTemplate({
        name: newTemplateName.trim(),
        category: 'custom',
        body: messageText,
        isSystem: false,
        isMetaApproved: false,
      });

      const updatedList = storageService.getTemplates();
      setTemplates(updatedList);
      setSelectedTemplateId(saved.id);
      setIsSavingTemplate(false);
      setNewTemplateName('');
      setIsDraftModified(false);
      setSaveSuccessMsg(`Template "${saved.name}" saved successfully!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    }
  };

  // Start Background Dispatch (Meta Cloud API)
  const handleStartCloudDispatch = async () => {
    setIsDispatching(true);
    try {
      const payloadSubscribers = recipients.map((r) => ({
        memberId: r.memberId,
        memberName: r.memberName,
        phone: r.phone,
        seatNumber: r.seatNumber,
        schemeId: r.schemeId || defaultScheme?.id,
        schemeName: r.schemeName || defaultScheme?.name,
        schemeCode: r.schemeCode || defaultScheme?.scheme_code,
        amountDue: r.amountDue,
        dueDate: r.dueDate,
        paymentStatus: r.paymentStatus,
        customMessage: renderWhatsAppTemplate(messageText, {
          memberName: r.memberName,
          chitName: r.schemeName || defaultScheme?.name,
          amount: r.amountDue,
          dueDate: r.dueDate,
          paymentStatus: r.paymentStatus,
          seatNumber: r.seatNumber,
          companyName: company.name,
        }),
      }));

      const res = await whatsappApi.startBulkDispatch({
        schemeId: defaultScheme?.id,
        schemeName: defaultScheme?.name,
        companyName: company.name,
        messageTemplate: messageText,
        templateName: config?.templateName || undefined,
        forceSend: forceSendDuplicates,
        initiatedBy: currentUser.full_name,
        subscribers: payloadSubscribers,
      });

      setActiveBatch(res.batch);
      setIsConfirming(false);
      if (onDispatchStarted) onDispatchStarted(res.batch);

      // Save to local reminder history
      res.batch.jobs.forEach((job) => {
        storageService.addReminderHistory({
          id: `hist-${job.id}`,
          dispatchId: res.batch.id,
          recipientMemberId: job.memberId,
          recipientName: job.memberName,
          recipientPhone: job.phone,
          schemeId: job.schemeId,
          schemeName: job.schemeName,
          seatNumber: job.seatNumber,
          templateName: selectedTemplate?.name || 'Custom Reminder',
          messageContent: job.messageText,
          channel: 'whatsapp_cloud_api',
          status: job.status,
          providerMessageId: job.whatsappMessageId,
          errorMessage: job.error,
          sentAt: new Date().toISOString(),
          sentBy: currentUser.full_name,
        });
      });

      startPolling(res.batch.id);
    } catch (err: any) {
      alert(`Failed to start WhatsApp dispatch: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Poll for background batch progress
  const startPolling = (dispatchId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await whatsappApi.getDispatchStatus(dispatchId);
        if (updated) {
          setActiveBatch(updated);
          // Sync live job statuses to local history
          updated.jobs.forEach((j) => {
            storageService.updateReminderStatus(
              j.whatsappMessageId || `hist-${j.id}`,
              j.status,
              j.error
            );
          });

          if (updated.status !== 'processing') {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        console.error('Batch polling error:', err);
      }
    }, 1200);
  };

  // Retry an individual failed job
  const handleRetryJob = async (jobId: string) => {
    if (!activeBatch) return;
    setIsRetryingJob(jobId);
    try {
      const updatedJob = await whatsappApi.retryJob(activeBatch.id, jobId);
      if (updatedJob) {
        setActiveBatch((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            jobs: prev.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
          };
        });
        startPolling(activeBatch.id);
      }
    } catch (err: any) {
      alert(`Error retrying job: ${err.message}`);
    } finally {
      setIsRetryingJob(null);
    }
  };

  // Retry all failed jobs in batch
  const handleRetryAllFailed = async () => {
    if (!activeBatch) return;
    try {
      const updated = await whatsappApi.retryFailed(activeBatch.id);
      setActiveBatch(updated);
      startPolling(updated.id);
    } catch (err: any) {
      alert(`Error retrying failed jobs: ${err.message}`);
    }
  };

  // Handle single manual WhatsApp link open
  const handleOpenManualWhatsApp = (recipient: ReminderRecipientInfo) => {
    const text = renderWhatsAppTemplate(messageText, {
      memberName: recipient.memberName,
      chitName: recipient.schemeName || defaultScheme?.name,
      amount: recipient.amountDue,
      dueDate: recipient.dueDate,
      paymentStatus: recipient.paymentStatus,
      seatNumber: recipient.seatNumber,
      companyName: company.name,
    });

    const url = buildWhatsAppDirectUrl(recipient.phone, text);
    window.open(url, '_blank');

    setManualSentMemberIds((prev) => new Set([...prev, recipient.memberId]));

    // Record in local history as manual_opened (compliant: not claiming sent unless confirmed)
    storageService.addReminderHistory({
      id: `hist-manual-${Date.now()}-${recipient.memberId}`,
      recipientMemberId: recipient.memberId,
      recipientName: recipient.memberName,
      recipientPhone: recipient.phone,
      schemeId: recipient.schemeId || defaultScheme?.id,
      schemeName: recipient.schemeName || defaultScheme?.name,
      seatNumber: recipient.seatNumber,
      templateName: selectedTemplate?.name || 'Manual WhatsApp Message',
      messageContent: text,
      channel: 'manual_whatsapp',
      status: 'manual_opened',
      errorMessage: 'Opened in WhatsApp for manual review and sending',
      sentAt: new Date().toISOString(),
      sentBy: currentUser.full_name,
    });
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-neutral-200 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#111111] tracking-tight">
                  WhatsApp Reminder Composer
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                  {recipients.length} {recipients.length === 1 ? 'Recipient' : 'Recipients'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Customize, preview placeholders, and dispatch individual WhatsApp reminders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            VIEW 1: LIVE BATCH PROGRESS & SUMMARY (When actively dispatching or done)
           ========================================================================= */}
        {activeBatch ? (
          <div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
            {/* Progress Header Card */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#111111]">
                      Dispatch Batch Status
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeBatch.status === 'processing'
                          ? 'bg-neutral-900 text-white animate-pulse'
                          : activeBatch.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {activeBatch.status === 'processing' ? 'Processing in Queue' : activeBatch.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    Batch: {activeBatch.id} • Concurrency: Controlled rate limits (~400ms/msg)
                  </p>
                </div>

                {activeBatch.stats.failed > 0 && (
                  <button
                    onClick={handleRetryAllFailed}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry All Failed ({activeBatch.stats.failed})</span>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-neutral-600">
                  <span>
                    {activeBatch.stats.total - activeBatch.stats.remaining} of {activeBatch.stats.total} processed
                  </span>
                  <span>
                    {Math.round(
                      ((activeBatch.stats.total - activeBatch.stats.remaining) /
                        (activeBatch.stats.total || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeBatch.stats.failed > 0 ? 'bg-amber-600' : 'bg-[#111111]'
                    }`}
                    style={{
                      width: `${
                        ((activeBatch.stats.total - activeBatch.stats.remaining) /
                          (activeBatch.stats.total || 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-center">
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Total</span>
                  <span className="font-bold text-sm text-[#111111]">{activeBatch.stats.total}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Queued</span>
                  <span className="font-bold text-sm text-neutral-700">{activeBatch.stats.queued}</span>
                </div>
                <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-blue-700 uppercase block font-semibold">Sending</span>
                  <span className="font-bold text-sm text-blue-900">{activeBatch.stats.processing}</span>
                </div>
                <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase block font-semibold">Accepted</span>
                  <span className="font-bold text-sm text-emerald-900">{activeBatch.stats.accepted}</span>
                </div>
                <div className="p-2 bg-emerald-100/60 rounded-lg border border-emerald-300">
                  <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Delivered</span>
                  <span className="font-bold text-sm text-emerald-950">{activeBatch.stats.delivered}</span>
                </div>
                <div className="p-2 bg-rose-50/60 rounded-lg border border-rose-200">
                  <span className="text-[10px] text-rose-700 uppercase block font-semibold">Failed</span>
                  <span className="font-bold text-sm text-rose-900">{activeBatch.stats.failed}</span>
                </div>
              </div>
            </div>

            {/* Individual Job Rows in this Dispatch */}
            <div className="space-y-2">
              <h3 className="font-bold text-neutral-800 text-xs">
                Recipient Message Transmissions ({activeBatch.jobs.length})
              </h3>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                {activeBatch.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#111111] truncate">{job.memberName}</span>
                        <span className="font-mono text-neutral-500 text-[11px]">{job.phone}</span>
                        {job.seatNumber && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                            Seat #{job.seatNumber}
                          </span>
                        )}
                      </div>
                      {job.error && (
                        <p className="text-[11px] text-rose-600 font-mono mt-0.5 truncate max-w-md">
                          Error: {job.error}
                        </p>
                      )}
                      {job.whatsappMessageId && (
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
                          wamid: {job.whatsappMessageId}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {job.status === 'queued' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600">
                          Queued
                        </span>
                      ) : job.status === 'sending' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 flex items-center space-x-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Sending</span>
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
                      ) : job.status === 'skipped' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          Skipped Duplicate
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            disabled={isRetryingJob === job.id}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-600 cursor-pointer"
                            title="Retry this job"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${isRetryingJob === job.id ? 'animate-spin' : ''}`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions for Batch View */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <span className="text-neutral-500 text-[11px]">
                {activeBatch.status === 'processing'
                  ? 'Dispatch is executing in background. You can safely close this modal.'
                  : 'Batch processing finished. Summary and logs saved to Message History.'}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : isConfirming ? (
          /* =========================================================================
              VIEW 2: FINAL CONFIRMATION & VERIFICATION BREAKDOWN
             ========================================================================= */
          <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-amber-900">
              <div className="flex items-center space-x-2 font-bold text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Confirm WhatsApp Reminder Dispatch</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                You are about to dispatch individual customized WhatsApp reminders. Please review recipient validation breakdown before confirming.
              </p>
            </div>

            {/* Recipient Breakdown Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Total Recipients</span>
                <span className="text-xl font-bold text-[#111111] mt-0.5 block">{recipients.length} Members</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Valid WhatsApp Numbers</span>
                <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{valid.length} Valid</span>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                <span className="text-[10px] text-rose-700 uppercase font-semibold block">Invalid / Missing Numbers</span>
                <span className="text-xl font-bold text-rose-900 mt-0.5 block">{invalid.length} Invalid</span>
              </div>
            </div>

            {/* Flagged Invalid Contacts Warning */}
            {invalid.length > 0 && (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
                <span className="font-bold text-[11px] flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>The following {invalid.length} contact(s) will be flagged as Failed:</span>
                </span>
                <div className="divide-y divide-rose-200/50 max-h-28 overflow-y-auto">
                  {invalid.map(({ recipient, reason }) => (
                    <div key={recipient.memberId} className="py-1 text-[11px] flex justify-between">
                      <span className="font-semibold">{recipient.memberName}</span>
                      <span className="text-rose-700 font-mono">{recipient.phone || 'No phone'} ({reason})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Preview Sample */}
            <div className="space-y-1.5">
              <span className="font-semibold text-neutral-700 block">
                Sample Personalized Message for First Recipient ({valid[0]?.memberName || recipients[0]?.memberName}):
              </span>
              <div className="p-3 bg-neutral-100 rounded-xl text-neutral-800 text-[11px] font-mono whitespace-pre-wrap border border-neutral-200 leading-relaxed">
                {previewRenderedText}
              </div>
              <p className="text-[10px] text-neutral-500 italic">
                * Each member receives strictly their own customized name, seat number, and outstanding balance.
              </p>
            </div>

            {/* Duplicate Protection Option */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#111111] block">Prevent Accidental Duplicate Reminders</span>
                <p className="text-[11px] text-neutral-500">
                  Members who were messaged within the last 5 minutes will be safely skipped.
                </p>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceSendDuplicates}
                  onChange={(e) => setForceSendDuplicates(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-[11px] font-semibold text-neutral-700">Force Resend (Override Cooldown)</span>
              </label>
            </div>

            {/* Sending Channel Selection */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <span className="font-semibold text-neutral-800 block">Delivery Channel:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`p-3 rounded-lg border flex items-start space-x-2.5 cursor-pointer transition-all ${
                    sendMethod === 'cloud_api'
                      ? 'border-[#111111] bg-white shadow-xs'
                      : 'border-neutral-200 bg-neutral-100/50 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMethod"
                    value="cloud_api"
                    checked={sendMethod === 'cloud_api'}
                    onChange={() => setSendMethod('cloud_api')}
                    disabled={!config?.isConfigured}
                    className="mt-0.5 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="font-bold text-[#111111] block text-xs">
                      Official Meta WhatsApp Cloud API
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      {config?.isConfigured
                        ? 'Automated background queue with delivery receipts'
                        : 'Credentials not configured (Configure in Settings)'}
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-lg border flex items-start space-x-2.5 cursor-pointer transition-all ${
                    sendMethod === 'manual_whatsapp'
                      ? 'border-[#111111] bg-white shadow-xs'
                      : 'border-neutral-200 bg-neutral-100/50 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMethod"
                    value="manual_whatsapp"
                    checked={sendMethod === 'manual_whatsapp'}
                    onChange={() => setSendMethod('manual_whatsapp')}
                    className="mt-0.5 text-neutral-900 focus:ring-neutral-900"
                  />
                  <div>
                    <span className="font-bold text-[#111111] block text-xs">
                      Manual WhatsApp Web / App Fallback
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Pre-filled editable wa.me links for direct review & sending
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Confirmation Footer Actions */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 -mx-5 -mb-5 flex items-center justify-between">
              <button
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Back to Message Editor
              </button>

              {sendMethod === 'cloud_api' ? (
                <button
                  onClick={handleStartCloudDispatch}
                  disabled={isDispatching || valid.length === 0}
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Initiating Queue...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Confirm & Send via Cloud API ({valid.length})</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setIsConfirming(false)}
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold flex items-center space-x-2 cursor-pointer"
                >
                  <span>Proceed with Manual Sequence</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
              VIEW 3: PRIMARY MESSAGE EDITOR & PREVIEW
             ========================================================================= */
          <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
            {/* Top Bar: Template Selector & Draft Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Choose Message Template:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-[#111111] font-medium focus:ring-1 focus:ring-neutral-900 focus:outline-none cursor-pointer"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} {tmpl.isSystem ? '(Default)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2 sm:pt-4">
                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isDraftModified
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-neutral-200 text-neutral-800'
                  }`}
                >
                  {isDraftModified ? 'Customized Draft' : 'Saved Template'}
                </span>

                {isDraftModified && (
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplate(true)}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-md text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    title="Save current message as a reusable template without overwriting defaults"
                  >
                    <Bookmark className="w-3 h-3 text-neutral-600" />
                    <span>Save as Template</span>
                  </button>
                )}
              </div>
            </div>

            {/* Template Save Dialog Popup */}
            {isSavingTemplate && (
              <form
                onSubmit={handleSaveAsNewTemplate}
                className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-300 space-y-2.5 animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111111]">
                    Save Customized Message as New Template
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplate(false)}
                    className="text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter template name (e.g. Diwali Special Reminder)"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Save Template
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  * Saved templates are preserved and will not overwrite other existing templates.
                </p>
              </form>
            )}

            {saveSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Tab switch between Editor and Live Recipient Preview */}
            <div className="flex items-center space-x-1 border-b border-neutral-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  activeTab === 'editor'
                    ? 'border-[#111111] text-[#111111] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <span>Message Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-2 border-b-2 flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  activeTab === 'preview'
                    ? 'border-[#111111] text-[#111111] font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Recipient Preview ({recipients.length})</span>
              </button>
            </div>

            {/* TAB CONTENT: EDITOR */}
            {activeTab === 'editor' && (
              <div className="space-y-3">
                {/* Placeholder Chips Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-neutral-700 text-[11px] flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-neutral-500" />
                      <span>Click to insert placeholder tags into message:</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Actual subscriber data replaces these tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_PLACEHOLDERS.map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(item.tag)}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 hover:border-neutral-400 rounded-md text-[11px] font-mono text-neutral-800 transition-colors cursor-pointer"
                        title={`${item.description} (e.g. ${item.example})`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea Editor */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-800 mb-1">
                    Message Body Content (Editable Draft):
                  </label>
                  <textarea
                    ref={textareaRef}
                    rows={6}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setIsDraftModified(true);
                    }}
                    placeholder="Type customized reminder message with {{placeholders}}..."
                    className="w-full p-3 bg-white border border-neutral-300 rounded-xl text-xs text-[#111111] font-mono leading-relaxed focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                    <span>Characters: {messageText.length}</span>
                    <span>Standard WhatsApp formatting: *bold*, _italics_, ~strike~</span>
                  </div>
                </div>

                {/* Meta Business API Approved Template Distinction Note */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start space-x-2 text-neutral-600 text-[11px] leading-relaxed">
                  <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-neutral-800 block">
                      Editable Draft vs. Meta Approved Templates
                    </strong>
                    <span>
                      Direct text messages can be delivered within customer-initiated service windows. For outbound business-initiated messages outside 24h windows, Meta requires pre-approved template names configured in your settings.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PREVIEW */}
            {activeTab === 'preview' && (
              <div className="space-y-3">
                {/* Recipient Switcher */}
                <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-neutral-700">Previewing Subscriber:</span>
                    <span className="font-bold text-[#111111]">
                      {currentPreviewRecipient?.memberName || 'None'}
                    </span>
                    {currentPreviewRecipient?.seatNumber && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-200 text-neutral-800">
                        Seat #{currentPreviewRecipient.seatNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-neutral-500">
                      {previewRecipientIdx + 1} of {recipients.length}
                    </span>
                    <button
                      type="button"
                      disabled={previewRecipientIdx === 0}
                      onClick={() => setPreviewRecipientIdx((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={previewRecipientIdx >= recipients.length - 1}
                      onClick={() =>
                        setPreviewRecipientIdx((prev) => Math.min(recipients.length - 1, prev + 1))
                      }
                      className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Chat Bubble Preview */}
                <div className="p-4 bg-emerald-50/40 border border-emerald-200/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 border-b border-emerald-100 pb-2">
                    <span className="flex items-center space-x-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>WhatsApp Preview ({currentPreviewRecipient?.phone || 'No phone'})</span>
                    </span>
                    <span className="text-[10px]">Just Now</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl rounded-tl-xs shadow-xs border border-emerald-100 text-neutral-800 text-xs font-sans whitespace-pre-wrap leading-relaxed max-w-xl">
                    {previewRenderedText}
                  </div>
                </div>
              </div>
            )}

            {/* Manual Sequence Recipient List (When Manual WhatsApp mode selected) */}
            {sendMethod === 'manual_whatsapp' && (
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111111]">
                    Manual WhatsApp Dispatch Sequence ({recipients.length} Contacts)
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {manualSentMemberIds.size} of {recipients.length} Opened
                  </span>
                </div>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                  {recipients.map((rec) => {
                    const isOpened = manualSentMemberIds.has(rec.memberId);
                    return (
                      <div
                        key={rec.memberId}
                        className="p-2.5 sm:px-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-[#111111]">
                            {rec.memberName}
                          </span>
                          <span className="font-mono text-neutral-500 text-[11px]">
                            {rec.phone}
                          </span>
                          {rec.amountDue !== undefined && (
                            <span className="text-neutral-700 font-medium text-[11px]">
                              Due: {formatCurrency(rec.amountDue)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {isOpened && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 flex items-center space-x-1">
                              <Check className="w-3 h-3 text-neutral-800" />
                              <span>Opened</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenManualWhatsApp(rec)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open in WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
                  className="px-3 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{activeTab === 'editor' ? 'Preview Message' : 'Back to Editor'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                {sendMethod === 'cloud_api' ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    disabled={recipients.length === 0}
                    className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Proceed to Send ({recipients.length})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <span>Done with Manual Sending</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
