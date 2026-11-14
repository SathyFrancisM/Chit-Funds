export interface WhatsAppBackendConfig {
  phoneNumberId: string;
  businessAccountId: string;
  templateName?: string;
  isConfigured: boolean;
  maskedToken?: string;
}

export type WhatsAppJobStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'accepted'
  | 'delivered'
  | 'failed'
  | 'skipped'
  | 'manual_opened';

export interface WhatsAppJob {
  id: string;
  dispatchId: string;
  memberId: string;
  memberName: string;
  phone: string;
  phoneFormatted: string;
  seatNumber?: number;
  schemeId?: string;
  schemeName?: string;
  schemeCode?: string;
  amountDue?: number;
  dueDate?: string;
  paymentStatus?: string;
  messageText: string;
  templateName?: string;
  status: WhatsAppJobStatus;
  whatsappMessageId?: string;
  error?: string;
  channel?: 'whatsapp_cloud_api' | 'manual_whatsapp';
  createdAt: string;
  updatedAt: string;
  attempts: number;
}

export interface DispatchStats {
  total: number;
  pending: number;
  queued: number;
  processing: number;
  accepted: number;
  delivered: number;
  failed: number;
  skipped: number;
  remaining: number;
}

export interface DispatchBatch {
  id: string;
  schemeId?: string;
  schemeName?: string;
  messageTemplate?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  status: 'processing' | 'completed' | 'failed';
  stats: DispatchStats;
  jobs: WhatsAppJob[];
  initiatedBy?: string;
}

export interface CreateDispatchSubscriber {
  memberId: string;
  memberName: string;
  phone: string;
  seatNumber?: number;
  schemeId?: string;
  schemeName?: string;
  schemeCode?: string;
  amountDue?: number;
  dueDate?: string;
  paymentStatus?: string;
  customMessage?: string;
}

export interface CreateDispatchPayload {
  schemeId?: string;
  schemeName?: string;
  subscribers: CreateDispatchSubscriber[];
  companyName: string;
  messageTemplate?: string;
  templateName?: string;
  forceSend?: boolean;
  initiatedBy?: string;
}

class WhatsAppApiService {
  private baseUrl = '/api/whatsapp';

  public async getConfig(): Promise<WhatsAppBackendConfig> {
    try {
      const res = await fetch(`${this.baseUrl}/config`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      return {
        phoneNumberId: '',
        businessAccountId: '',
        isConfigured: false,
      };
    }
  }

  public async saveConfig(data: {
    phoneNumberId: string;
    accessToken?: string;
    businessAccountId?: string;
    templateName?: string;
  }): Promise<{ success: boolean; isConfigured: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to save configuration (HTTP ${res.status})`);
    return await res.json();
  }

  public async testConnection(data: {
    phoneNumberId?: string;
    accessToken?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  }

  public async startBulkDispatch(payload: CreateDispatchPayload): Promise<{
    success: boolean;
    dispatchId: string;
    batch: DispatchBatch;
  }> {
    const res = await fetch(`${this.baseUrl}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to initiate dispatch (HTTP ${res.status})`);
    }
    return await res.json();
  }

  public async sendBulk(items: any[]): Promise<any> {
    return this.startBulkDispatch({
      subscribers: items.map((it) => ({
        memberId: it.recipientMemberId || it.memberId || '',
        memberName: it.recipientName || it.memberName || '',
        phone: it.recipientPhone || it.phone || '',
        customMessage: it.message,
        schemeId: it.schemeId,
        schemeName: it.schemeName,
        seatNumber: it.seatNumber,
      })),
      companyName: 'ChitFlow',
    });
  }

  public async sendSingleReminder(data: {
    subscriber: CreateDispatchSubscriber;
    companyName: string;
    messageTemplate?: string;
    templateName?: string;
    forceSend?: boolean;
    initiatedBy?: string;
  }): Promise<{
    success: boolean;
    dispatchId: string;
    job: WhatsAppJob;
    batch: DispatchBatch;
  }> {
    const res = await fetch(`${this.baseUrl}/send-single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to send reminder (HTTP ${res.status})`);
    }
    return await res.json();
  }

  public async getDispatchStatus(dispatchId: string): Promise<DispatchBatch | null> {
    try {
      const res = await fetch(`${this.baseUrl}/dispatch/${dispatchId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.batch;
    } catch {
      return null;
    }
  }

  public async getActiveDispatch(): Promise<DispatchBatch | null> {
    try {
      const res = await fetch(`${this.baseUrl}/dispatch/active`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.batch;
    } catch {
      return null;
    }
  }

  public async getHistory(): Promise<DispatchBatch[]> {
    try {
      const res = await fetch(`${this.baseUrl}/history`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  }

  public async clearHistory(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/history`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async retryFailed(dispatchId: string): Promise<DispatchBatch> {
    const res = await fetch(`${this.baseUrl}/dispatch/${dispatchId}/retry`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to retry failed jobs (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.batch;
  }

  public async retryJob(dispatchId: string, jobId: string): Promise<WhatsAppJob> {
    const res = await fetch(`${this.baseUrl}/dispatch/${dispatchId}/job/${jobId}/retry`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to retry job (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.job;
  }
}

export const whatsappApi = new WhatsAppApiService();

