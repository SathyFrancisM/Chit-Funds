import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  normalizePhoneNumber,
  calculateMaturityDate,
  generateInstallmentSchedule,
  calculateMemberLedger,
  calculateChitCashbook,
  calculateChitMetrics,
  getDailyMotivationalQuote,
  calculateMemberMonthlyDueSchedule,
} from './financial';
import { ChitScheme, ChitMembership, CompanyMember, FinancialTransaction } from '../types';

describe('Financial Utilities and Calculations', () => {
  it('formats currency correctly in Indian numbering system', () => {
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(500)).toBe('₹500');
    expect(formatCurrency(10000)).toBe('₹10,000');
    expect(formatCurrency(2500000)).toBe('₹25,00,000');
    expect(formatCurrency(-5000)).toBe('-₹5,000');
  });

  it('normalizes Indian phone numbers accurately', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('9876543210');
    expect(normalizePhoneNumber('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
    expect(normalizePhoneNumber('9876-543-210')).toBe('9876543210');
  });

  it('calculates planned maturity date with calendar-month arithmetic', () => {
    // 25 months scheme starting on April 10, 2026:
    // Month 1 is Apr 2026, Month 25 is Apr 2028 (24 calendar months later)
    const maturity = calculateMaturityDate('2026-04-10', 25, 10);
    expect(maturity).toBe('2028-04-10');

    // Clamping on 31st to February
    const febClamped = calculateMaturityDate('2026-01-31', 2, 31);
    expect(febClamped).toBe('2026-02-28'); // 2026 is non-leap
  });

  it('generates an exact installment schedule', () => {
    const schedule = generateInstallmentSchedule('2026-01-10', 12, 10, 5000, 20);
    expect(schedule.length).toBe(12);
    expect(schedule[0].installment_no).toBe(1);
    expect(schedule[0].expected_per_member).toBe(5000);
    expect(schedule[0].expected_total_pool).toBe(100000);
    expect(schedule[11].installment_no).toBe(12);
    expect(schedule[11].due_date).toBe('2026-12-10');
  });

  it('strictly segregates Cash and UPI in chit cashbook', () => {
    const membersMap = new Map<string, CompanyMember>();
    membersMap.set('m1', {
      id: 'm1',
      company_id: 'c1',
      full_name: 'Rajesh Kumar',
      phone: '9876543210',
      phone_normalized: '9876543210',
      kyc_status: 'verified',
      created_at: '',
      updated_at: '',
    });

    const txs: FinancialTransaction[] = [
      {
        id: 'tx1',
        company_id: 'c1',
        chit_id: 'ch1',
        member_id: 'm1',
        transaction_type: 'collection',
        payment_method: 'cash',
        amount: 5000,
        receipt_no: 'REC-001',
        transaction_date: '2026-01-10',
        recorded_by: 'Owner',
        is_reversed: false,
        created_at: '2026-01-10T10:00:00Z',
      },
      {
        id: 'tx2',
        company_id: 'c1',
        chit_id: 'ch1',
        member_id: 'm1',
        transaction_type: 'collection',
        payment_method: 'upi',
        amount: 15000,
        receipt_no: 'REC-002',
        reference_id: 'UPI984214',
        transaction_date: '2026-01-11',
        recorded_by: 'Owner',
        is_reversed: false,
        created_at: '2026-01-11T10:00:00Z',
      },
    ];

    const records = calculateChitCashbook(txs, membersMap, 0, 0);
    expect(records.length).toBe(2);
    expect(records[0].cash_balance).toBe(5000);
    expect(records[0].upi_balance).toBe(0);

    expect(records[1].cash_balance).toBe(5000); // UPI does not affect cash balance
    expect(records[1].upi_balance).toBe(15000);
    expect(records[1].net_balance).toBe(20000);
  });

  it('nullifies reversed transactions in ledger calculations', () => {
    const chit: ChitScheme = {
      id: 'ch1',
      company_id: 'c1',
      name: 'Scheme A',
      scheme_code: 'SCH-A',
      start_date: '2026-01-10',
      duration_months: 10,
      installment_frequency: 'monthly',
      monthly_installment_amount: 5000,
      total_pot_amount: 50000,
      total_seats: 10,
      due_day: 10,
      planned_maturity_date: '2026-10-10',
      currency: 'INR',
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    const membership: ChitMembership = {
      id: 'mem1',
      chit_id: 'ch1',
      member_id: 'm1',
      seat_number: 1,
      expected_monthly_contribution: 5000,
      joined_date: '2026-01-10',
      is_active: true,
      created_at: '',
    };

    const member: CompanyMember = {
      id: 'm1',
      company_id: 'c1',
      full_name: 'Anita Sharma',
      phone: '9812345678',
      phone_normalized: '9812345678',
      kyc_status: 'verified',
      created_at: '',
      updated_at: '',
    };

    const transactions: FinancialTransaction[] = [
      {
        id: 'tx1',
        company_id: 'c1',
        chit_id: 'ch1',
        member_id: 'm1',
        transaction_type: 'collection',
        payment_method: 'upi',
        amount: 5000,
        receipt_no: 'REC-101',
        transaction_date: '2026-01-10',
        recorded_by: 'Owner',
        is_reversed: false,
        created_at: '2026-01-10T10:00:00Z',
      },
      {
        id: 'tx2_err',
        company_id: 'c1',
        chit_id: 'ch1',
        member_id: 'm1',
        transaction_type: 'collection',
        payment_method: 'cash',
        amount: 10000,
        receipt_no: 'REC-102',
        transaction_date: '2026-01-15',
        recorded_by: 'Staff',
        is_reversed: true, // Reversed!
        reversal_reason: 'Entered wrong member',
        created_at: '2026-01-15T10:00:00Z',
      },
    ];

    const { summary } = calculateMemberLedger(chit, membership, member, transactions);
    expect(summary.total_paid).toBe(5000); // 10000 reversed txn is excluded!
    expect(summary.outstanding_amount).toBe(45000); // 50,000 - 5,000
    expect(summary.installments_paid_count).toBe(1);
  });

  it('deterministic motivational quote changes by calendar day', () => {
    const d1 = new Date('2026-04-10T10:00:00Z');
    const d2 = new Date('2026-04-10T18:00:00Z');
    const q1 = getDailyMotivationalQuote(d1);
    const q2 = getDailyMotivationalQuote(d2);
    expect(q1.quote).toBe(q2.quote); // Same on the same calendar day
  });

  describe('Monthly Due Schedule and Carry-Forward System', () => {
    const baseChit: ChitScheme = {
      id: 'chit_cf_1',
      company_id: 'c1',
      name: 'Monthly 5K Scheme',
      scheme_code: 'CF-5K',
      start_date: '2026-01-03',
      duration_months: 6,
      installment_frequency: 'monthly',
      monthly_installment_amount: 5000,
      total_pot_amount: 30000,
      total_seats: 6,
      due_day: 3,
      planned_maturity_date: '2026-06-03',
      currency: 'INR',
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    const baseMembership: ChitMembership = {
      id: 'mem_cf_1',
      chit_id: 'chit_cf_1',
      member_id: 'sub_1',
      seat_number: 1,
      expected_monthly_contribution: 5000,
      joined_date: '2026-01-03',
      is_active: true,
      created_at: '',
    };

    it('Scenario A: carries forward unpaid dues when partial payment is made', () => {
      // Month 1 due is 5,000. Member pays 3,000.
      const txs: FinancialTransaction[] = [
        {
          id: 'tx_p1',
          company_id: 'c1',
          chit_id: 'chit_cf_1',
          member_id: 'sub_1',
          transaction_type: 'collection',
          payment_method: 'cash',
          amount: 3000,
          receipt_no: 'REC-001',
          installment_no: 1,
          transaction_date: '2026-01-03',
          recorded_by: 'Owner',
          is_reversed: false,
          created_at: '2026-01-03T10:00:00Z',
        },
      ];

      const { monthlyItems } = calculateMemberMonthlyDueSchedule(baseChit, baseMembership, txs);
      expect(monthlyItems.length).toBe(6);

      // Month 1
      const m1 = monthlyItems[0];
      expect(m1.installment_no).toBe(1);
      expect(m1.original_due).toBe(5000);
      expect(m1.previous_balance).toBe(0);
      expect(m1.total_adjusted_due).toBe(5000);
      expect(m1.amount_paid).toBe(3000);
      expect(m1.remaining_balance).toBe(2000); // 2,000 unpaid carried
      expect(m1.status).toBe('Partially Paid');

      // Month 2
      const m2 = monthlyItems[1];
      expect(m2.installment_no).toBe(2);
      expect(m2.original_due).toBe(5000);
      expect(m2.previous_balance).toBe(2000); // Carried from Month 1
      expect(m2.total_adjusted_due).toBe(7000); // 5,000 + 2,000
      expect(m2.amount_paid).toBe(0);
      expect(m2.remaining_balance).toBe(7000);
      expect(m2.status).toBe('Unpaid');
    });

    it('Scenario B: clears balance to zero on exact full payment', () => {
      const txs: FinancialTransaction[] = [
        {
          id: 'tx_full',
          company_id: 'c1',
          chit_id: 'chit_cf_1',
          member_id: 'sub_1',
          transaction_type: 'collection',
          payment_method: 'upi',
          bank_account: 'IOB Current',
          amount: 5000,
          receipt_no: 'REC-002',
          installment_no: 1,
          transaction_date: '2026-01-03',
          recorded_by: 'Owner',
          is_reversed: false,
          created_at: '2026-01-03T10:00:00Z',
        },
      ];

      const { monthlyItems } = calculateMemberMonthlyDueSchedule(baseChit, baseMembership, txs);
      const m1 = monthlyItems[0];
      expect(m1.total_adjusted_due).toBe(5000);
      expect(m1.amount_paid).toBe(5000);
      expect(m1.remaining_balance).toBe(0);
      expect(m1.status).toBe('Paid');
      expect(m1.transactions[0].payment_method).toBe('upi');
      expect(m1.transactions[0].bank_account).toBe('IOB Current');

      const m2 = monthlyItems[1];
      expect(m2.previous_balance).toBe(0);
      expect(m2.total_adjusted_due).toBe(5000);
      expect(m2.status).toBe('Unpaid');
    });

    it('Scenario C: rolls excess payment forward as credit reducing next month due', () => {
      // Month 1 due 5,000. Member pays 6,000.
      const txs: FinancialTransaction[] = [
        {
          id: 'tx_ex',
          company_id: 'c1',
          chit_id: 'chit_cf_1',
          member_id: 'sub_1',
          transaction_type: 'collection',
          payment_method: 'cash',
          amount: 6000,
          receipt_no: 'REC-003',
          installment_no: 1,
          transaction_date: '2026-01-03',
          recorded_by: 'Owner',
          is_reversed: false,
          created_at: '2026-01-03T10:00:00Z',
        },
      ];

      const { monthlyItems } = calculateMemberMonthlyDueSchedule(baseChit, baseMembership, txs);
      const m1 = monthlyItems[0];
      expect(m1.total_adjusted_due).toBe(5000);
      expect(m1.amount_paid).toBe(6000);
      expect(m1.remaining_balance).toBe(-1000); // 1,000 credit
      expect(m1.status).toBe('Paid');

      const m2 = monthlyItems[1];
      expect(m2.original_due).toBe(5000);
      expect(m2.previous_balance).toBe(-1000); // Credit
      expect(m2.total_adjusted_due).toBe(4000); // 5,000 - 1,000 credit
      expect(m2.status).toBe('Unpaid');
    });

    it('Scenario D: credit seamlessly covers multiple consecutive future months', () => {
      // Month 1 due 5,000. Member pays 16,000 lump sum.
      const txs: FinancialTransaction[] = [
        {
          id: 'tx_lump',
          company_id: 'c1',
          chit_id: 'chit_cf_1',
          member_id: 'sub_1',
          transaction_type: 'collection',
          payment_method: 'upi',
          bank_account: 'ICICI Savings',
          amount: 16000,
          receipt_no: 'REC-004',
          installment_no: 1,
          transaction_date: '2026-01-03',
          recorded_by: 'Owner',
          is_reversed: false,
          created_at: '2026-01-03T10:00:00Z',
        },
      ];

      const { monthlyItems } = calculateMemberMonthlyDueSchedule(baseChit, baseMembership, txs);

      // Month 1: 5K due, 16K paid -> 11K credit
      expect(monthlyItems[0].status).toBe('Paid');
      expect(monthlyItems[0].remaining_balance).toBe(-11000);

      // Month 2: 5K due fully absorbed by credit -> 6K credit remains
      expect(monthlyItems[1].total_adjusted_due).toBe(0);
      expect(monthlyItems[1].status).toBe('Paid');
      expect(monthlyItems[1].remaining_balance).toBe(-6000);

      // Month 3: 5K due fully absorbed by credit -> 1K credit remains
      expect(monthlyItems[2].total_adjusted_due).toBe(0);
      expect(monthlyItems[2].status).toBe('Paid');
      expect(monthlyItems[2].remaining_balance).toBe(-1000);

      // Month 4: 5K base due - 1K credit = 4K adjusted due
      expect(monthlyItems[3].original_due).toBe(5000);
      expect(monthlyItems[3].previous_balance).toBe(-1000);
      expect(monthlyItems[3].total_adjusted_due).toBe(4000);
      expect(monthlyItems[3].status).toBe('Unpaid');

      // Month 5: remaining unpaid 4K carries forward to make 9K adjusted due
      expect(monthlyItems[4].original_due).toBe(5000);
      expect(monthlyItems[4].previous_balance).toBe(4000);
      expect(monthlyItems[4].total_adjusted_due).toBe(9000);
    });

    it('ignores reversed transactions in carry-forward schedule', () => {
      const txs: FinancialTransaction[] = [
        {
          id: 'tx_rev',
          company_id: 'c1',
          chit_id: 'chit_cf_1',
          member_id: 'sub_1',
          transaction_type: 'collection',
          payment_method: 'cash',
          amount: 5000,
          receipt_no: 'REC-REV',
          installment_no: 1,
          transaction_date: '2026-01-03',
          recorded_by: 'Owner',
          is_reversed: true, // Reversed!
          created_at: '2026-01-03T10:00:00Z',
        },
      ];

      const { monthlyItems } = calculateMemberMonthlyDueSchedule(baseChit, baseMembership, txs);
      expect(monthlyItems[0].amount_paid).toBe(0);
      expect(monthlyItems[0].status).toBe('Unpaid');
      expect(monthlyItems[0].remaining_balance).toBe(5000);
    });
  });
});
