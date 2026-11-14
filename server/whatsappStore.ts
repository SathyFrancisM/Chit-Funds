import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { WhatsAppConfig, DispatchBatch, WhatsAppJob, CreateDispatchPayload } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'whatsapp_store.json');

interface StoreSchema {
  config: WhatsAppConfig;
  dispatches: Record<string, DispatchBatch>;
  activeDispatchId: string | null;
  dedupKeys: Record<string, string>; // hash -> timestamp
}

const DEFAULT_CONFIG: WhatsAppConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  templateName: process.env.WHATSAPP_TEMPLATE_NAME || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'chitflow_webhook_verify_token',
  isConfigured: !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN),
};

class WhatsAppStore {
  private data: StoreSchema = {
    config: DEFAULT_CONFIG,
    dispatches: {},
    activeDispatchId: null,
    dedupKeys: {},
  };

  constructor() {
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.error('Failed to create .data dir', e);
      }
    }
  }

  private load() {
    try {
      this.ensureDir();
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          config: {
            ...DEFAULT_CONFIG,
            ...(parsed.config || {}),
            isConfigured: !!(
              (parsed.config?.phoneNumberId || DEFAULT_CONFIG.phoneNumberId) &&
              (parsed.config?.accessToken || DEFAULT_CONFIG.accessToken)
            ),
          },
          dispatches: parsed.dispatches || {},
          activeDispatchId: parsed.activeDispatchId || null,
          dedupKeys: parsed.dedupKeys || {},
        };
      }
    } catch (err) {
      console.error('Error loading WhatsApp store, using defaults', err);
    }
  }

  private save() {
    try {
      this.ensureDir();
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving WhatsApp store', err);
    }
  }

  public getConfig(): WhatsAppConfig {
    return { ...this.data.config };
  }

  public saveConfig(updates: Partial<WhatsAppConfig>): WhatsAppConfig {
    this.data.config = {
      ...this.data.config,
      ...updates,
      isConfigured: !!(
        (updates.phoneNumberId ?? this.data.config.phoneNumberId) &&
        (updates.accessToken ?? this.data.config.accessToken)
      ),
    };
    this.save();
    return this.getConfig();
  }

  public normalizePhone(raw: string): string {
    if (!raw) return '';
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 10) return `91${clean}`;
    if (clean.length === 12 && clean.startsWith('91')) return clean;
    if (clean.length === 11 && clean.startsWith('0')) return `91${clean.slice(1)}`;
    if (clean.length >= 10 && clean.length <= 15) return clean;
    return clean;
  }

  public renderMessageTemplate(
    template: string,
    sub: {
      memberName: string;
      amountDue?: number;
      seatNumber?: number;
      schemeName?: string;
      dueDate?: string;
      paymentStatus?: string;
    },
    companyName: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(sub.amountDue || 0);

    const seatStr = sub.seatNumber ? `#${sub.seatNumber}` : 'N/A';
    const chitStr = sub.schemeName || 'Chit Scheme';
    const dueStr = sub.dueDate || '10th of this month';
    const statusStr = sub.paymentStatus || 'Due';

    return template
      .replace(/\{\{member_name\}\}/gi, sub.memberName || 'Member')
      .replace(/\{\{chit_name\}\}/gi, chitStr)
      .replace(/\{\{amount\}\}/gi, formattedAmount)
      .replace(/\{\{due_date\}\}/gi, dueStr)
      .replace(/\{\{payment_status\}\}/gi, statusStr)
      .replace(/\{\{seat_number\}\}/gi, seatStr)
      .replace(/\{\{company_name\}\}/gi, companyName || 'Chit Funds');
  }

  public formatPersonalizedMessage(
    name: string,
    amount: number,
    seatNumber: number,
    schemeName: string
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

    return `Hi ${name}, this is a friendly reminder that your pending payment is ${formattedAmount} for Seat #${seatNumber} (${schemeName}). Please complete your payment at your earliest convenience. Thank you!`;
  }

  public createDispatch(payload: CreateDispatchPayload): DispatchBatch {
    const dispatchId = `disp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const cooldownMs = 5 * 60 * 1000; // 5 minute duplicate prevention window

    const jobs: WhatsAppJob[] = [];

    payload.subscribers.forEach((sub) => {
      const dedupKey = `${sub.memberId}_${sub.schemeId || 'general'}`;
      const lastSent = this.data.dedupKeys[dedupKey];
      const isDuplicate = lastSent && Date.now() - new Date(lastSent).getTime() < cooldownMs;

      const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const phoneClean = (sub.phone || '').replace(/\D/g, '');
      const phoneFormatted = this.normalizePhone(sub.phone);

      // Determine final message text
      let messageText = '';
      if (sub.customMessage && sub.customMessage.trim()) {
        messageText = sub.customMessage.trim();
      } else if (payload.messageTemplate && payload.messageTemplate.trim()) {
        messageText = this.renderMessageTemplate(
          payload.messageTemplate,
          sub,
          payload.companyName
        );
      } else {
        messageText = this.formatPersonalizedMessage(
          sub.memberName,
          sub.amountDue || 0,
          sub.seatNumber || 0,
          sub.schemeName || 'Chit Scheme'
        );
      }

      // Check phone number validity
      let initialStatus: WhatsAppJob['status'] = 'queued';
      let initialError: string | undefined = undefined;

      if (!phoneClean || phoneClean.length < 10) {
        initialStatus = 'failed';
        initialError = `Invalid or missing phone number: "${sub.phone || 'empty'}" (Requires valid 10-15 digit number with country code)`;
      } else if (isDuplicate && !payload.forceSend) {
        initialStatus = 'skipped';
        initialError = 'Duplicate prevention: Reminder was already sent within the last 5 minutes. Use Force Send to override.';
      }

      jobs.push({
        id: jobId,
        dispatchId,
        memberId: sub.memberId,
        memberName: sub.memberName,
        phone: sub.phone,
        phoneFormatted,
        seatNumber: sub.seatNumber,
        schemeId: sub.schemeId,
        schemeName: sub.schemeName,
        schemeCode: sub.schemeCode,
        amountDue: sub.amountDue,
        dueDate: sub.dueDate,
        paymentStatus: sub.paymentStatus,
        messageText,
        templateName: payload.templateName,
        status: initialStatus,
        error: initialError,
        createdAt: now,
        updatedAt: now,
        attempts: 0,
      });

      if (initialStatus === 'queued') {
        this.data.dedupKeys[dedupKey] = now;
      }
    });

    const batch: DispatchBatch = {
      id: dispatchId,
      schemeId: payload.schemeId,
      schemeName: payload.schemeName,
      messageTemplate: payload.messageTemplate,
      templateName: payload.templateName,
      initiatedBy: payload.initiatedBy,
      createdAt: now,
      updatedAt: now,
      status: 'processing',
      stats: {
        total: jobs.length,
        pending: 0,
        queued: jobs.filter((j) => j.status === 'queued').length,
        processing: 0,
        accepted: 0,
        delivered: 0,
        failed: jobs.filter((j) => j.status === 'failed').length,
        skipped: jobs.filter((j) => j.status === 'skipped').length,
        remaining: jobs.filter((j) => j.status === 'queued').length,
      },
      jobs,
    };

    this.data.dispatches[dispatchId] = batch;
    this.data.activeDispatchId = dispatchId;
    this.recalculateStats(dispatchId);
    this.save();
    return batch;
  }

  public getDispatch(id: string): DispatchBatch | null {
    return this.data.dispatches[id] || null;
  }

  public getActiveDispatch(): DispatchBatch | null {
    if (!this.data.activeDispatchId) return null;
    return this.data.dispatches[this.data.activeDispatchId] || null;
  }

  public getAllDispatches(): DispatchBatch[] {
    return Object.values(this.data.dispatches).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public clearHistory(): boolean {
    const active = this.getActiveDispatch();
    if (active && active.status === 'processing') {
      this.data.dispatches = { [active.id]: active };
    } else {
      this.data.dispatches = {};
      this.data.activeDispatchId = null;
    }
    this.save();
    return true;
  }

  public updateJob(
    dispatchId: string,
    jobId: string,
    updates: Partial<WhatsAppJob>
  ): WhatsAppJob | null {
    const dispatch = this.data.dispatches[dispatchId];
    if (!dispatch) return null;

    const job = dispatch.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    this.recalculateStats(dispatchId);
    this.save();
    return job;
  }

  public updateJobByWamid(
    wamid: string,
    status: 'delivered' | 'accepted' | 'failed',
    error?: string
  ): boolean {
    for (const disp of Object.values(this.data.dispatches)) {
      const job = disp.jobs.find((j) => j.whatsappMessageId === wamid);
      if (job) {
        job.status = status;
        if (error) job.error = error;
        job.updatedAt = new Date().toISOString();
        this.recalculateStats(disp.id);
        this.save();
        return true;
      }
    }
    return false;
  }

  public recalculateStats(dispatchId: string) {
    const dispatch = this.data.dispatches[dispatchId];
    if (!dispatch) return;

    let pending = 0;
    let queued = 0;
    let processing = 0;
    let accepted = 0;
    let delivered = 0;
    let failed = 0;
    let skipped = 0;

    dispatch.jobs.forEach((j) => {
      if (j.status === 'pending') pending++;
      else if (j.status === 'queued') queued++;
      else if (j.status === 'sending') processing++;
      else if (j.status === 'accepted') accepted++;
      else if (j.status === 'delivered') delivered++;
      else if (j.status === 'failed') failed++;
      else if (j.status === 'skipped') skipped++;
    });

    const total = dispatch.jobs.length;
    const remaining = pending + queued + processing;

    dispatch.stats = {
      total,
      pending,
      queued,
      processing,
      accepted,
      delivered,
      failed,
      skipped,
      remaining,
    };

    if (remaining === 0) {
      dispatch.status = failed === total && total > 0 ? 'failed' : 'completed';
    } else {
      dispatch.status = 'processing';
    }

    dispatch.updatedAt = new Date().toISOString();
  }

  public retryJob(dispatchId: string, jobId: string): WhatsAppJob | null {
    const dispatch = this.data.dispatches[dispatchId];
    if (!dispatch) return null;

    const job = dispatch.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    // Check phone number validity before re-queuing
    const phoneClean = (job.phone || '').replace(/\D/g, '');
    if (!phoneClean || phoneClean.length < 10) {
      job.status = 'failed';
      job.error = `Invalid or missing phone number: "${job.phone || 'empty'}" (Requires valid 10-15 digit number)`;
      this.recalculateStats(dispatchId);
      this.save();
      return job;
    }

    job.status = 'queued';
    job.error = undefined;
    job.attempts = 0;
    job.updatedAt = new Date().toISOString();

    this.data.activeDispatchId = dispatchId;
    this.recalculateStats(dispatchId);
    this.save();
    return job;
  }

  public retryFailedJobs(dispatchId: string): DispatchBatch | null {
    const dispatch = this.data.dispatches[dispatchId];
    if (!dispatch) return null;

    let hasRetried = false;
    dispatch.jobs.forEach((job) => {
      if (job.status === 'failed' || job.status === 'skipped') {
        const phoneClean = (job.phone || '').replace(/\D/g, '');
        if (phoneClean && phoneClean.length >= 10) {
          job.status = 'queued';
          job.error = undefined;
          job.attempts = 0;
          job.updatedAt = new Date().toISOString();
          hasRetried = true;
        }
      }
    });

    if (hasRetried) {
      this.data.activeDispatchId = dispatchId;
      this.recalculateStats(dispatchId);
      this.save();
    }

    return dispatch;
  }
}

export const whatsappStore = new WhatsAppStore();

