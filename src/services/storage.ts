import {
  CompanyProfile,
  UserProfile,
  CompanyMember,
  ChitScheme,
  ChitMembership,
  FinancialTransaction,
  AuditLog,
  NotificationItem,
  PaymentMethod,
  PendingChitMember,
  WhatsAppTemplate,
  ReminderHistoryItem,
  ChitShuffleWinner,
  UpiBankAccount,
} from '../types';
import { normalizePhoneNumber } from '../utils/financial';
import { isSupabaseConfigured } from './supabase';


const STORAGE_KEY_PREFIX = 'chitflow_v2_';

// Initial Company Profile (Company settings for administration)
export const DEFAULT_COMPANY: CompanyProfile = {
  id: 'cmp-001',
  name: 'Chit Fund Operations Co.',
  registration_no: 'REG/CF/2026/001',
  phone: '+91 98480 12345',
  email: 'admin@chitflow.internal',
  address: 'Commercial Complex, Financial District, Hyderabad, India',
  currency: 'INR',
  currency_symbol: '₹',
  receipt_prefix: 'CF-REC-',
  timezone: 'Asia/Kolkata',
  created_at: new Date().toISOString(),
};

// Company Administrative Operators
export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'usr-owner-001',
    company_id: 'cmp-001',
    email: 'owner@chitflow.internal',
    full_name: 'Company Owner (Administrator)',
    role: 'owner',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-staff-002',
    company_id: 'cmp-001',
    email: 'staff@chitflow.internal',
    full_name: 'Operations Staff',
    role: 'staff',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Default WhatsApp Message Templates with verified placeholders
export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tmpl-due-date',
    name: 'Payment Due Date Reminder',
    category: 'due_date',
    body: 'Hi {{member_name}}, this is a friendly reminder from {{company_name}} that your installment of {{amount}} for {{chit_name}} (Seat {{seat_number}}) is due on {{due_date}}. Payment status: {{payment_status}}. Please complete your payment at your earliest convenience. Thank you!',
    isSystem: true,
    isMetaApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-overdue',
    name: 'Overdue Payment Notice',
    category: 'overdue',
    body: 'URGENT REMINDER: Hi {{member_name}}, your installment of {{amount}} for {{chit_name}} (Seat {{seat_number}}) was due on {{due_date}} and remains {{payment_status}}. Kindly clear the outstanding balance immediately. Contact us if already paid. - {{company_name}}',
    isSystem: true,
    isMetaApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-confirmation',
    name: 'Payment Receipt Confirmation',
    category: 'payment_confirmation',
    body: 'Payment Received: Thank you {{member_name}}! We have successfully credited your installment payment of {{amount}} for {{chit_name}} (Seat {{seat_number}}). Current status: {{payment_status}}. - {{company_name}}',
    isSystem: true,
    isMetaApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-monthly-installment',
    name: 'Monthly Installment Cycle Announcement',
    category: 'monthly_installment',
    body: 'Hello {{member_name}}, the new installment cycle for {{chit_name}} is now active. Your contribution of {{amount}} for Seat {{seat_number}} is due on {{due_date}}. - {{company_name}}',
    isSystem: true,
    isMetaApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-announcement',
    name: 'General Chit Scheme Announcement',
    category: 'general_announcement',
    body: 'Chit Scheme Update: Hello {{member_name}}, this is an important announcement regarding {{chit_name}} (Seat {{seat_number}}). The upcoming auction and dividend review will take place as scheduled. Current payment status: {{payment_status}}. Please reach out to {{company_name}} for details.',
    isSystem: true,
    isMetaApproved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Local Storage Service Class — Zero Mock Data
class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Local storage write failed', e);
    }
  }

  public isDemoMode(): boolean {
    return !isSupabaseConfigured();
  }

  public initializeEmptyDatabase(): void {
    // Check if v2 clean database is already initialized
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'initialized')) {
      this.clearAllData();
      localStorage.setItem(STORAGE_KEY_PREFIX + 'initialized', 'true');
    }
  }

  public clearAllData(): void {
    this.set('company', DEFAULT_COMPANY);
    this.set('users', DEFAULT_USERS);
    this.set('members', []);
    this.set('schemes', []);
    this.set('memberships', []);
    this.set('transactions', []);
    this.set('audit_logs', []);
    this.set('notifications', []);
    this.set('current_user', DEFAULT_USERS[0]);
    this.set('whatsapp_templates', DEFAULT_WHATSAPP_TEMPLATES);
    this.set('reminder_history', []);
    this.set('shuffle_winners', []);
  }


  // Company Profile
  public getCompanyProfile(): CompanyProfile {
    return this.get('company', DEFAULT_COMPANY);
  }

  public updateCompanyProfile(updated: Partial<CompanyProfile>): CompanyProfile {
    const current = this.getCompanyProfile();
    const next = { ...current, ...updated };
    this.set('company', next);
    this.logAudit('UPDATE_COMPANY_PROFILE', 'company_profile', next.id, 'Updated company business information');
    return next;
  }

  // Current User Session
  public getCurrentUser(): UserProfile {
    return this.get('current_user', DEFAULT_USERS[0]);
  }

  public setCurrentUser(user: UserProfile): void {
    this.set('current_user', user);
  }

  public getAllUsers(): UserProfile[] {
    return this.get('users', DEFAULT_USERS);
  }

  public addUser(user: Omit<UserProfile, 'id' | 'created_at'>): UserProfile {
    const users = this.getAllUsers();
    const newUser: UserProfile = {
      ...user,
      id: `usr-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    this.set('users', users);
    this.logAudit('CREATE_USER', 'user_profile', newUser.id, `Created ${newUser.role} user: ${newUser.full_name}`);
    return newUser;
  }

  // Members
  public getMembers(): CompanyMember[] {
    return this.get<CompanyMember[]>('members', []);
  }

  public getMemberById(id: string): CompanyMember | undefined {
    return this.getMembers().find((m) => m.id === id);
  }

  public findMemberByPhone(phone: string): CompanyMember | undefined {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) return undefined;
    return this.getMembers().find((m) => m.phone_normalized === normalized);
  }

  public addMember(data: Omit<CompanyMember, 'id' | 'company_id' | 'phone_normalized' | 'created_at' | 'updated_at'>): CompanyMember {
    const members = this.getMembers();
    const company = this.getCompanyProfile();
    const normalized = normalizePhoneNumber(data.phone);

    // Duplicate check
    const existing = members.find((m) => m.phone_normalized === normalized);
    if (existing) {
      throw new Error(`A member with phone ${data.phone} already exists (${existing.full_name}).`);
    }

    const newMember: CompanyMember = {
      ...data,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company_id: company.id,
      phone_normalized: normalized,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    members.unshift(newMember);
    this.set('members', members);
    this.logAudit('CREATE_MEMBER', 'company_member', newMember.id, `Registered member: ${newMember.full_name}`);
    return newMember;
  }

  public updateMember(id: string, data: Partial<CompanyMember>): CompanyMember {
    const members = this.getMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Member not found');

    const updated: CompanyMember = {
      ...members[index],
      ...data,
      phone_normalized: data.phone ? normalizePhoneNumber(data.phone) : members[index].phone_normalized,
      updated_at: new Date().toISOString(),
    };

    members[index] = updated;
    this.set('members', members);
    this.logAudit('UPDATE_MEMBER', 'company_member', id, `Updated contact details for ${updated.full_name}`);
    return updated;
  }

  // Schemes
  public getSchemes(): ChitScheme[] {
    return this.get<ChitScheme[]>('schemes', []);
  }

  public getSchemeById(id: string): ChitScheme | undefined {
    return this.getSchemes().find((s) => s.id === id);
  }

  public addScheme(data: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'>): ChitScheme {
    const schemes = this.getSchemes();
    const company = this.getCompanyProfile();

    if (schemes.some((s) => s.scheme_code.toLowerCase() === data.scheme_code.toLowerCase())) {
      throw new Error(`Scheme code ${data.scheme_code} is already in use.`);
    }

    const newScheme: ChitScheme = {
      ...data,
      id: `chit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: company.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    schemes.unshift(newScheme);
    this.set('schemes', schemes);
    this.logAudit('CREATE_SCHEME', 'chit_scheme', newScheme.id, `Created scheme: ${newScheme.name} (${newScheme.scheme_code})`);
    return newScheme;
  }

  // Atomic Creation of Scheme + Enrolled Members + Memberships
  public createChitWithMembers(
    schemeData: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    pendingMembers: PendingChitMember[]
  ): ChitScheme {
    const company = this.getCompanyProfile();
    const schemes = this.getSchemes();
    const existingMembers = this.getMembers();
    const existingMemberships = this.getMemberships();

    if (schemes.some((s) => s.scheme_code.toLowerCase() === schemeData.scheme_code.toLowerCase())) {
      throw new Error(`Scheme code "${schemeData.scheme_code}" is already in use.`);
    }

    const chitId = `chit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newScheme: ChitScheme = {
      ...schemeData,
      id: chitId,
      company_id: company.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Track newly added members and memberships
    const updatedMembersList = [...existingMembers];
    const newMembershipsList = [...existingMemberships];

    pendingMembers.forEach((pm, idx) => {
      let memberIdToUse = pm.memberId;

      // If not already an existing member ID, find or create
      if (!memberIdToUse) {
        const found = updatedMembersList.find((m) => m.phone_normalized === pm.phoneNormalized);
        if (found) {
          memberIdToUse = found.id;
        } else {
          // Create new company member
          const newMember: CompanyMember = {
            id: `mem-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            company_id: company.id,
            full_name: pm.fullName.trim(),
            phone: pm.phone.trim(),
            phone_normalized: pm.phoneNormalized,
            email: pm.email?.trim() || undefined,
            notes: pm.notes?.trim() || undefined,
            kyc_status: 'verified',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedMembersList.unshift(newMember);
          memberIdToUse = newMember.id;
        }
      }

      // Add chit membership seat
      const newMembership: ChitMembership = {
        id: `cms-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        chit_id: chitId,
        member_id: memberIdToUse,
        seat_number: pm.seatNumber || (idx + 1),
        expected_monthly_contribution: pm.expectedMonthlyContribution || schemeData.monthly_installment_amount,
        joined_date: schemeData.start_date || new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
      };
      newMembershipsList.push(newMembership);
    });

    schemes.unshift(newScheme);
    this.set('schemes', schemes);
    this.set('members', updatedMembersList);
    this.set('memberships', newMembershipsList);

    this.logAudit(
      'CREATE_CHIT_WITH_MEMBERS',
      'chit_scheme',
      newScheme.id,
      `Created chit ${newScheme.name} (${newScheme.scheme_code}) with ${pendingMembers.length} enrolled members`
    );

    return newScheme;
  }

  public updateScheme(id: string, data: Partial<ChitScheme>): ChitScheme {
    const schemes = this.getSchemes();
    const index = schemes.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Scheme not found');

    const updated: ChitScheme = {
      ...schemes[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    schemes[index] = updated;
    this.set('schemes', schemes);
    this.logAudit('UPDATE_SCHEME', 'chit_scheme', id, `Updated scheme details for ${updated.name}`);
    return updated;
  }

  // Memberships
  public getMemberships(chitId?: string): ChitMembership[] {
    const all = this.get<ChitMembership[]>('memberships', []);
    return chitId ? all.filter((m) => m.chit_id === chitId) : all;
  }

  public assignMemberToScheme(chitId: string, memberId: string, seatNumber: number, monthlyContribution: number): ChitMembership {
    const memberships = this.getMemberships();
    const chit = this.getSchemeById(chitId);
    if (!chit) throw new Error('Scheme not found');

    const seatTaken = memberships.some((m) => m.chit_id === chitId && m.seat_number === seatNumber && m.is_active);
    if (seatTaken) {
      throw new Error(`Seat number ${seatNumber} is already occupied in this scheme.`);
    }

    const newMembership: ChitMembership = {
      id: `cms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      chit_id: chitId,
      member_id: memberId,
      seat_number: seatNumber,
      expected_monthly_contribution: monthlyContribution,
      joined_date: new Date().toISOString().split('T')[0],
      is_active: true,
      created_at: new Date().toISOString(),
    };

    memberships.push(newMembership);
    this.set('memberships', memberships);

    const member = this.getMemberById(memberId);
    this.logAudit(
      'ASSIGN_MEMBER_SEAT',
      'chit_membership',
      newMembership.id,
      `Assigned ${member?.full_name || 'Member'} to Seat #${seatNumber} in ${chit.name}`
    );

    return newMembership;
  }

  public removeMemberFromScheme(membershipId: string, reason: string): void {
    const memberships = this.getMemberships();
    const index = memberships.findIndex((m) => m.id === membershipId);
    if (index === -1) throw new Error('Membership record not found');

    memberships[index].is_active = false;
    memberships[index].removed_date = new Date().toISOString().split('T')[0];
    memberships[index].removal_reason = reason;

    this.set('memberships', memberships);
    this.logAudit(
      'REMOVE_MEMBER_SEAT',
      'chit_membership',
      membershipId,
      `Seat deactivated: ${reason}. Historical payment ledger preserved.`
    );
  }

  public unassignMembership(membershipId: string): void {
    const memberships = this.getMemberships();
    const target = memberships.find((m) => m.id === membershipId);
    if (!target) throw new Error('Membership record not found');

    const transactions = this.getTransactions().filter(
      (t) => t.chit_id === target.chit_id && t.member_id === target.member_id && !t.is_reversed
    );

    if (transactions.length > 0) {
      throw new Error('Cannot undo seat assignment: Active payments exist. Please undo or reverse payments first.');
    }

    const filtered = memberships.filter((m) => m.id !== membershipId);
    this.set('memberships', filtered);
    this.logAudit(
      'UNASSIGN_MEMBER_SEAT',
      'chit_membership',
      membershipId,
      `Undid seat assignment #${target.seat_number}. Seat is now free for reassignment.`
    );
  }

  // Financial Transactions
  public getTransactions(chitId?: string): FinancialTransaction[] {
    const all = this.get<FinancialTransaction[]>('transactions', []);
    return chitId ? all.filter((t) => t.chit_id === chitId) : all;
  }

  public recordPayment(params: {
    chit_id: string;
    member_id: string;
    amount: number;
    payment_method: PaymentMethod;
    bank_account?: UpiBankAccount | string;
    installment_no?: number;
    reference_id?: string;
    collector_notes?: string;
    transaction_date?: string;
  }): FinancialTransaction {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (params.payment_method === 'upi' && !params.bank_account) {
      throw new Error('Bank Account is mandatory for UPI payments.');
    }

    const chit = this.getSchemeById(params.chit_id);
    if (!chit) throw new Error('Target chit scheme not found');

    const member = this.getMemberById(params.member_id);
    if (!member) throw new Error('Subscriber member not found');

    const company = this.getCompanyProfile();
    const user = this.getCurrentUser();
    const transactions = this.getTransactions();

    const oneMinuteAgo = Date.now() - 60000;
    const isDuplicate = transactions.some(
      (tx) =>
        tx.chit_id === params.chit_id &&
        tx.member_id === params.member_id &&
        tx.amount === params.amount &&
        tx.payment_method === params.payment_method &&
        new Date(tx.created_at).getTime() > oneMinuteAgo
    );

    if (isDuplicate) {
      throw new Error('Duplicate payment detected. Please wait before submitting identical transaction.');
    }

    const count = transactions.length + 1;
    const yearMonth = (params.transaction_date || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(0, 6);
    const receiptNo = `${company.receipt_prefix}${yearMonth}-${String(count).padStart(4, '0')}`;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: company.id,
      chit_id: params.chit_id,
      member_id: params.member_id,
      transaction_type: 'collection',
      payment_method: params.payment_method,
      bank_account: params.payment_method === 'upi' ? params.bank_account : undefined,
      amount: Math.round(params.amount),
      receipt_no: receiptNo,
      installment_no: params.installment_no,
      reference_id: params.reference_id,
      payer_name: member.full_name,
      collector_notes: params.collector_notes,
      transaction_date: params.transaction_date || new Date().toISOString().split('T')[0],
      recorded_by: user.full_name,
      is_reversed: false,
      created_at: new Date().toISOString(),
    };

    transactions.unshift(newTx);
    this.set('transactions', transactions);

    const methodDesc =
      params.payment_method === 'upi' && params.bank_account
        ? `UPI (${params.bank_account})`
        : params.payment_method.toUpperCase();

    this.logAudit(
      'RECORD_PAYMENT',
      'financial_transaction',
      newTx.id,
      `Issued ${receiptNo}: Received ${company.currency_symbol}${params.amount} via ${methodDesc} from ${member.full_name} for ${chit.name}`
    );

    return newTx;
  }

  public updatePayment(
    txId: string,
    params: {
      amount: number;
      payment_method: PaymentMethod;
      bank_account?: UpiBankAccount | string;
      installment_no?: number;
      reference_id?: string;
      collector_notes?: string;
      transaction_date?: string;
    }
  ): FinancialTransaction {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (params.payment_method === 'upi' && !params.bank_account) {
      throw new Error('Bank Account is mandatory for UPI payments.');
    }

    const transactions = this.getTransactions();
    const index = transactions.findIndex((t) => t.id === txId);
    if (index === -1) throw new Error('Transaction record not found.');

    const target = transactions[index];
    if (target.is_reversed) throw new Error('Cannot edit a reversed transaction.');

    target.amount = Math.round(params.amount);
    target.payment_method = params.payment_method;
    target.bank_account = params.payment_method === 'upi' ? params.bank_account : undefined;
    if (params.installment_no !== undefined) target.installment_no = params.installment_no;
    if (params.reference_id !== undefined) target.reference_id = params.reference_id;
    if (params.collector_notes !== undefined) target.collector_notes = params.collector_notes;
    if (params.transaction_date) target.transaction_date = params.transaction_date;

    this.set('transactions', transactions);

    this.logAudit(
      'UPDATE_PAYMENT',
      'financial_transaction',
      target.id,
      `Updated ${target.receipt_no}: Set amount to ${params.amount} via ${target.payment_method} (${target.bank_account || 'Cash'})`
    );

    return target;
  }

  public recordCustomEntry(entry: {
    chit_id: string;
    transaction_type: 'payout' | 'expense' | 'adjustment';
    payment_method: PaymentMethod;
    amount: number;
    payer_name: string;
    notes: string;
    reference_id?: string;
    transaction_date: string;
  }): FinancialTransaction {
    if (entry.amount <= 0) throw new Error('Amount must be positive.');

    const company = this.getCompanyProfile();
    const user = this.getCurrentUser();
    const transactions = this.getTransactions();

    const count = transactions.length + 1;
    const yearMonth = entry.transaction_date.replace(/-/g, '').slice(0, 6);
    const receiptNo = `ADJ-${yearMonth}-${String(count).padStart(4, '0')}`;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: company.id,
      chit_id: entry.chit_id,
      transaction_type: entry.transaction_type,
      payment_method: entry.payment_method,
      amount: Math.round(entry.amount),
      receipt_no: receiptNo,
      reference_id: entry.reference_id,
      payer_name: entry.payer_name,
      collector_notes: entry.notes,
      transaction_date: entry.transaction_date,
      recorded_by: user.full_name,
      is_reversed: false,
      created_at: new Date().toISOString(),
    };

    transactions.unshift(newTx);
    this.set('transactions', transactions);

    this.logAudit(
      'RECORD_FINANCIAL_ENTRY',
      'financial_transaction',
      newTx.id,
      `Recorded ${entry.transaction_type.toUpperCase()} of ${company.currency_symbol}${entry.amount} (${entry.payer_name})`
    );

    return newTx;
  }

  public reverseTransaction(txId: string, reason: string): FinancialTransaction {
    const user = this.getCurrentUser();
    const validReason = reason && reason.trim().length > 0 ? reason.trim() : 'Mistaken entry corrected / undone by user';

    const transactions = this.getTransactions();
    const index = transactions.findIndex((t) => t.id === txId);
    if (index === -1) throw new Error('Transaction record not found.');

    const target = transactions[index];
    if (target.is_reversed) {
      throw new Error('This transaction has already been reversed.');
    }

    target.is_reversed = true;
    target.reversal_reason = validReason;
    target.reversed_by = user?.full_name || 'Staff User';
    target.reversed_at = new Date().toISOString();

    this.set('transactions', transactions);

    this.logAudit(
      'REVERSE_TRANSACTION',
      'financial_transaction',
      target.id,
      `Undid/reversed receipt ${target.receipt_no} (${target.amount} INR). Reason: ${validReason}`
    );

    return target;
  }

  public undoTransaction(txId: string, reason?: string): FinancialTransaction {
    return this.reverseTransaction(txId, reason || 'Mistakenly recorded; payment undone');
  }

  public deleteTransaction(txId: string): void {
    const transactions = this.getTransactions();
    const target = transactions.find((t) => t.id === txId);
    if (!target) throw new Error('Transaction not found');

    const filtered = transactions.filter((t) => t.id !== txId);
    this.set('transactions', filtered);

    this.logAudit(
      'DELETE_MISTAKEN_TRANSACTION',
      'financial_transaction',
      txId,
      `Deleted mistaken payment receipt ${target.receipt_no} (${target.amount} INR)`
    );
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>('audit_logs', []);
  }

  public logAudit(action: string, entity_type: string, entity_id: string, details: string): void {
    const logs = this.getAuditLogs();
    const user = this.getCurrentUser();
    const company = this.getCompanyProfile();

    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: company.id,
      user_id: user.id,
      user_name: user.full_name,
      action,
      entity_type,
      entity_id,
      details,
      created_at: new Date().toISOString(),
    };

    logs.unshift(entry);
    this.set('audit_logs', logs.slice(0, 200));
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return this.get<NotificationItem[]>('notifications', []);
  }

  public addNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert';
    link?: string;
  }): NotificationItem {
    const list = this.getNotifications();
    const company = this.getCompanyProfile();
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: company.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      link: notification.link,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    list.unshift(item);
    this.set('notifications', list.slice(0, 100));
    return item;
  }

  public markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.is_read = true;
      this.set('notifications', list);
    }
  }

  public markAllNotificationsRead(): void {
    const list = this.getNotifications().map((n) => ({ ...n, is_read: true }));
    this.set('notifications', list);
  }

  // ==================== WhatsApp Reminder Templates ====================
  public getTemplates(): WhatsAppTemplate[] {
    const custom = this.get<WhatsAppTemplate[]>('whatsapp_templates', []);
    if (custom.length === 0) {
      this.set('whatsapp_templates', DEFAULT_WHATSAPP_TEMPLATES);
      return DEFAULT_WHATSAPP_TEMPLATES;
    }
    return custom;
  }

  public saveTemplate(
    template: Omit<WhatsAppTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): WhatsAppTemplate {
    const list = this.getTemplates();
    const newTemplate: WhatsAppTemplate = {
      ...template,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newTemplate);
    this.set('whatsapp_templates', list);
    this.logAudit(
      'CREATE_TEMPLATE',
      'whatsapp_template',
      newTemplate.id,
      `Created reminder template: "${newTemplate.name}"`
    );
    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<WhatsAppTemplate>): WhatsAppTemplate {
    const list = this.getTemplates();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Template not found');

    const updated: WhatsAppTemplate = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    this.set('whatsapp_templates', list);
    this.logAudit(
      'UPDATE_TEMPLATE',
      'whatsapp_template',
      id,
      `Updated reminder template: "${updated.name}"`
    );
    return updated;
  }

  public duplicateTemplate(id: string): WhatsAppTemplate {
    const list = this.getTemplates();
    const source = list.find((t) => t.id === id);
    if (!source) throw new Error('Source template not found');

    const duplicated: WhatsAppTemplate = {
      ...source,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(duplicated);
    this.set('whatsapp_templates', list);
    this.logAudit(
      'DUPLICATE_TEMPLATE',
      'whatsapp_template',
      duplicated.id,
      `Duplicated template "${source.name}" as "${duplicated.name}"`
    );
    return duplicated;
  }

  public deleteTemplate(id: string): boolean {
    const list = this.getTemplates();
    const target = list.find((t) => t.id === id);
    if (!target) return false;
    if (target.isSystem) {
      throw new Error('System default templates cannot be deleted, but can be reset or customized.');
    }
    const filtered = list.filter((t) => t.id !== id);
    this.set('whatsapp_templates', filtered);
    this.logAudit(
      'DELETE_TEMPLATE',
      'whatsapp_template',
      id,
      `Deleted template: "${target.name}"`
    );
    return true;
  }

  public resetDefaultTemplates(): WhatsAppTemplate[] {
    const current = this.getTemplates();
    // Keep user-created custom templates
    const userCustom = current.filter((t) => !t.isSystem);
    const merged = [...DEFAULT_WHATSAPP_TEMPLATES, ...userCustom];
    this.set('whatsapp_templates', merged);
    return merged;
  }

  // ==================== WhatsApp Reminder History ====================
  public getReminderHistory(): ReminderHistoryItem[] {
    return this.get<ReminderHistoryItem[]>('reminder_history', []);
  }

  public addReminderHistory(items: ReminderHistoryItem[] | ReminderHistoryItem): void {
    const current = this.getReminderHistory();
    const toAdd = Array.isArray(items) ? items : [items];
    const updated = [...toAdd, ...current].slice(0, 500); // retain last 500 records
    this.set('reminder_history', updated);
  }

  public updateReminderStatus(
    idOrWamid: string,
    status: ReminderHistoryItem['status'],
    error?: string
  ): void {
    const list = this.getReminderHistory();
    const item = list.find((r) => r.id === idOrWamid || r.providerMessageId === idOrWamid);
    if (item) {
      item.status = status;
      if (error) item.errorMessage = error;
      this.set('reminder_history', list);
    }
  }

  public clearReminderHistory(): void {
    this.set('reminder_history', []);
    this.logAudit(
      'CLEAR_REMINDER_HISTORY',
      'reminder_history',
      'all',
      'Cleared all local reminder dispatch history logs'
    );
  }

  public getShuffleWinners(chitId?: string): ChitShuffleWinner[] {
    const list = this.get<ChitShuffleWinner[]>('shuffle_winners', []);
    if (chitId) {
      return list.filter((w) => w.chit_id === chitId);
    }
    return list;
  }

  public markContactShuffled(
    data: Omit<ChitShuffleWinner, 'id' | 'created_at'>
  ): ChitShuffleWinner {
    const list = this.getShuffleWinners();
    const newWinner: ChitShuffleWinner = {
      ...data,
      id: `shf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    list.unshift(newWinner);
    this.set('shuffle_winners', list);

    this.logAudit(
      'CHIT_SHUFFLE_WINNER',
      'chit_scheme',
      data.chit_id,
      `Marked ${data.member_name} (Seat #${data.seat_number}) as Month ${data.month_number} winner in scheme`
    );

    return newWinner;
  }

  public deleteShuffleWinner(winnerId: string): void {
    const list = this.getShuffleWinners().filter((w) => w.id !== winnerId);
    this.set('shuffle_winners', list);
    this.logAudit(
      'REMOVE_SHUFFLE_WINNER',
      'chit_scheme',
      winnerId,
      `Removed chit shuffling winner record ${winnerId}`
    );
  }

  public deleteShuffleWinnerByMembership(membershipId: string): void {
    const list = this.getShuffleWinners().filter((w) => w.membership_id !== membershipId);
    this.set('shuffle_winners', list);
    this.logAudit(
      'REMOVE_SHUFFLE_WINNER',
      'chit_scheme',
      membershipId,
      `Undid chit shuffling winner mark for membership ${membershipId}`
    );
  }

  // Data Export / Backup
  public exportDatabaseJSON(): string {
    const payload = {
      exported_at: new Date().toISOString(),
      company: this.getCompanyProfile(),
      users: this.getAllUsers(),
      members: this.getMembers(),
      schemes: this.getSchemes(),
      memberships: this.getMemberships(),
      transactions: this.getTransactions(),
      audit_logs: this.getAuditLogs(),
      whatsapp_templates: this.getTemplates(),
      reminder_history: this.getReminderHistory(),
      shuffle_winners: this.getShuffleWinners(),
    };
    return JSON.stringify(payload, null, 2);
  }
}


export const storageService = new StorageService();
// Initialize clean empty database
storageService.initializeEmptyDatabase();
