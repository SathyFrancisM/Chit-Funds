export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  templateName?: string;
  verifyToken: string;
  isConfigured: boolean;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  templateName?: string;
  verifyToken: string;
  isConfigured: boolean;
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

