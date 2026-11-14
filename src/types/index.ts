export type UserRole = 'owner' | 'staff';

export interface CompanyProfile {
  id: string;
  name: string;
  registration_no: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  currency_symbol: string;
  receipt_prefix: string;
  timezone: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  full_name: string;
  phone: string;
  phone_normalized: string;
  email?: string;
  address?: string;
  notes?: string;
  kyc_status: 'verified' | 'pending' | 'exempt';
  created_at: string;
  updated_at: string;
}

export type ChitStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface ChitScheme {
  id: string;
  company_id: string;
  name: string;
  scheme_code: string;
  start_date: string; // YYYY-MM-DD
  duration_months: number;
  installment_frequency: 'monthly';
  monthly_installment_amount: number;
  total_pot_amount: number;
  total_seats: number;
  due_day: number; // 1-28
  shuffling_date?: string; // Chit shuffling / auction date (YYYY-MM-DD)
  planned_maturity_date: string;
  notes?: string;
  scheme_rules?: string;
  currency: string;
  status: ChitStatus;
  created_at: string;
  updated_at: string;
}

export interface ChitMembership {
  id: string;
  chit_id: string;
  member_id: string;
  seat_number: number;
  expected_monthly_contribution: number;
  joined_date: string;
  is_active: boolean;
  removed_date?: string;
  removal_reason?: string;
  created_at: string;
}

export interface InstallmentScheduleItem {
  id: string;
  chit_id: string;
  installment_no: number;
  due_date: string; // YYYY-MM-DD
  expected_per_member: number;
  expected_total_pool: number;
  total_collected?: number;
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
}

export type TransactionType = 'collection' | 'payout' | 'expense' | 'reversal' | 'adjustment';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer';
export type UpiBankAccount = 'IOB Current' | 'IOB Savings' | 'TMB Savings' | 'ICICI Savings';

export const UPI_BANK_ACCOUNTS: UpiBankAccount[] = [
  'IOB Current',
  'IOB Savings',
  'TMB Savings',
  'ICICI Savings',
];

export interface FinancialTransaction {
  id: string;
  company_id: string;
  chit_id: string;
  member_id?: string;
  transaction_type: TransactionType;
  payment_method: PaymentMethod;
  bank_account?: UpiBankAccount | string;
  amount: number; // In INR
  receipt_no: string;
  installment_no?: number;
  reference_id?: string; // UPI Txn ID or UTR
  payer_name?: string;
  collector_notes?: string;
  transaction_date: string; // YYYY-MM-DD
  recorded_by: string; // User Name
  is_reversed: boolean;
  reversal_reason?: string;
  reversed_by?: string;
  reversed_at?: string;
  created_at: string;
}

export interface MemberMonthlyDueItem {
  installment_no: number;
  month_name: string;
  due_date: string;
  original_due: number;
  previous_balance: number; // positive = unpaid overdue, negative = excess credit
  total_adjusted_due: number; // original_due + previous_balance (clamped >= 0)
  amount_paid: number;
  remaining_balance: number; // total_adjusted_due - amount_paid (positive = due, negative = credit)
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  transactions: FinancialTransaction[];
}

export interface CashbookRecord {
  id: string;
  date: string;
  receipt_no: string;
  reference_id?: string;
  party_name: string;
  entry_type: TransactionType;
  description: string;
  payment_method: PaymentMethod;
  money_in: number;
  money_out: number;
  cash_balance: number;
  upi_balance: number;
  net_balance: number;
  is_reversed?: boolean;
}

export interface MemberLedgerSummary {
  member_id: string;
  member_name: string;
  phone: string;
  seat_number: number;
  expected_total_contribution: number;
  total_paid: number;
  outstanding_amount: number;
  last_payment_date?: string;
  installments_paid_count: number;
  total_installments: number;
  is_active_member: boolean;
}

export interface ChitSummaryMetrics {
  total_expected_pool: number;
  total_collected_gross: number;
  cash_collected: number;
  upi_collected: number;
  total_outstanding: number;
  months_elapsed: number;
  months_remaining: number;
  total_members: number;
  active_seats_filled: number;
  payouts_disbursed: number;
  net_scheme_cash_in_hand: number;
  net_scheme_upi_balance: number;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'overdue' | 'maturity' | 'audit' | 'system' | 'info' | 'warning' | 'alert';
  company_id?: string;
  link?: string;
  chit_id?: string;
  chit_name?: string;
  member_id?: string;
  member_name?: string;
  is_read: boolean;
  created_at: string;
}

export type ContactSourceType = 'contact_picker' | 'whatsapp' | 'csv_excel' | 'existing_directory' | 'manual';

export interface PendingChitMember {
  tempId: string;
  memberId?: string; // If already an existing company member
  fullName: string;
  phone: string;
  phoneNormalized: string;
  email?: string;
  notes?: string;
  seatNumber: number;
  expectedMonthlyContribution: number;
  source: ContactSourceType;
  isExistingMember: boolean;
  validationError?: string;
}

export type ReminderCategory =
  | 'due_date'
  | 'overdue'
  | 'payment_confirmation'
  | 'monthly_installment'
  | 'general_announcement'
  | 'custom';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: ReminderCategory;
  body: string;
  isSystem?: boolean;
  isMetaApproved?: boolean;
  metaTemplateName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderRecipientInfo {
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

export interface ReminderHistoryItem {
  id: string;
  dispatchId?: string;
  recipientMemberId: string;
  recipientName: string;
  recipientPhone: string;
  schemeId?: string;
  schemeName?: string;
  seatNumber?: number;
  templateName?: string;
  messageContent: string;
  channel: 'whatsapp_cloud_api' | 'manual_whatsapp';
  status: 'pending' | 'queued' | 'sending' | 'accepted' | 'delivered' | 'failed' | 'skipped' | 'manual_opened';
  providerMessageId?: string;
  errorMessage?: string;
  sentAt: string;
  sentBy: string;
}

export interface ChitShuffleWinner {
  id: string;
  chit_id: string;
  membership_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  seat_number: number;
  month_number: number;
  shuffled_date: string; // YYYY-MM-DD
  prize_amount?: number;
  notes?: string;
  whatsapp_status: 'sent' | 'delivered' | 'opened' | 'pending';
  whatsapp_sent_at?: string;
  created_at: string;
}

