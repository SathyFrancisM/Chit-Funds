import {
  ChitScheme,
  ChitMembership,
  CompanyMember,
  FinancialTransaction,
  InstallmentScheduleItem,
  CashbookRecord,
  MemberLedgerSummary,
  ChitSummaryMetrics,
  MemberMonthlyDueItem,
} from '../types';

/**
 * Format currency in Indian numbering system (e.g., ₹25,00,000)
 */
export function formatCurrency(amount: number | undefined | null, symbol = '₹'): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${symbol}0`;
  }
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const str = absAmount.toString();
  
  let formatted = '';
  if (str.length <= 3) {
    formatted = str;
  } else {
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${withCommas},${lastThree}`;
  }
  
  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Normalizes an Indian phone number to 10 standard digits
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Format day of month with proper English ordinal (e.g., 3rd, 1st, 10th)
 */
export function formatOrdinalDay(day: number): string {
  if (day === 1 || day === 21 || day === 31) return `${day}st`;
  if (day === 2 || day === 22) return `${day}nd`;
  if (day === 3 || day === 23) return `${day}rd`;
  return `${day}th`;
}

/**
 * Calendar-month calculation for planned maturity date
 */
export function calculateMaturityDate(startDateStr: string, durationMonths: number, dueDay = 3): string {
  if (!startDateStr || durationMonths <= 0) return '';
  
  const parts = startDateStr.split('-').map(Number);
  if (parts.length < 3) return '';
  
  const [year, month] = parts; // Month is 1-indexed (1 = Jan)
  
  // Adding durationMonths - 1 full calendar cycles
  const totalMonths = month - 1 + (durationMonths - 1);
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1; // 1-indexed
  
  // Calculate max days in target month
  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(dueDay || 3, daysInTargetMonth);
  
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

/**
 * Generate full monthly installment schedule
 */
export function generateInstallmentSchedule(
  startDateStr: string,
  durationMonths: number,
  dueDay = 3,
  monthlyPerMember = 0,
  totalSeats = 1
): InstallmentScheduleItem[] {
  if (!startDateStr || durationMonths <= 0) return [];

  const parts = startDateStr.split('-').map(Number);
  if (parts.length < 3) return [];
  const [startYear, startMonth] = parts;

  const todayStr = new Date().toISOString().split('T')[0];
  const schedule: InstallmentScheduleItem[] = [];

  for (let i = 0; i < durationMonths; i++) {
    const totalMonthIndex = (startMonth - 1) + i;
    const year = startYear + Math.floor(totalMonthIndex / 12);
    const month = (totalMonthIndex % 12) + 1;

    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.min(dueDay || 10, daysInMonth);

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dueDateStr = `${year}-${mm}-${dd}`;

    let status: 'upcoming' | 'due' | 'overdue' | 'completed' = 'upcoming';
    if (dueDateStr < todayStr) {
      status = 'overdue';
    } else if (dueDateStr === todayStr) {
      status = 'due';
    }

    schedule.push({
      id: `inst-${i + 1}`,
      chit_id: '',
      installment_no: i + 1,
      due_date: dueDateStr,
      expected_per_member: monthlyPerMember,
      expected_total_pool: monthlyPerMember * totalSeats,
      total_collected: 0,
      status,
    });
  }

  return schedule;
}

/**
 * Scoped calculation for member ledger within a specific chit
 */
export function calculateMemberLedger(
  chit: ChitScheme,
  membership: ChitMembership,
  member: CompanyMember,
  allTransactions: FinancialTransaction[]
): {
  summary: MemberLedgerSummary;
  scopedTransactions: FinancialTransaction[];
  runningLedger: Array<{
    transaction: FinancialTransaction;
    runningTotalPaid: number;
    remainingScheduledBalance: number;
  }>;
} {
  // Only valid collections and adjustments for this specific member in this chit
  const scopedTransactions = allTransactions
    .filter(
      (tx) =>
        tx.chit_id === chit.id &&
        tx.member_id === member.id &&
        !tx.is_reversed &&
        (tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment')
    )
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  const expectedTotalContribution =
    (membership.expected_monthly_contribution || chit.monthly_installment_amount) *
    chit.duration_months;

  let totalPaid = 0;
  const runningLedger: Array<{
    transaction: FinancialTransaction;
    runningTotalPaid: number;
    remainingScheduledBalance: number;
  }> = [];

  scopedTransactions.forEach((tx) => {
    totalPaid += tx.amount;
    const remaining = Math.max(0, expectedTotalContribution - totalPaid);
    runningLedger.push({
      transaction: tx,
      runningTotalPaid: totalPaid,
      remainingScheduledBalance: remaining,
    });
  });

  const outstandingAmount = Math.max(0, expectedTotalContribution - totalPaid);
  const monthlyRate = membership.expected_monthly_contribution || chit.monthly_installment_amount || 1;
  const installmentsPaidCount = Math.floor(totalPaid / monthlyRate);

  const lastTx = scopedTransactions[scopedTransactions.length - 1];

  const summary: MemberLedgerSummary = {
    member_id: member.id,
    member_name: member.full_name,
    phone: member.phone,
    seat_number: membership.seat_number,
    expected_total_contribution: expectedTotalContribution,
    total_paid: totalPaid,
    outstanding_amount: outstandingAmount,
    last_payment_date: lastTx ? lastTx.transaction_date : undefined,
    installments_paid_count: installmentsPaidCount,
    total_installments: chit.duration_months,
    is_active_member: membership.is_active,
  };

  return { summary, scopedTransactions, runningLedger };
}

/**
 * Calculates dynamically the month-by-month running balance and carry-forward dues for a contact in a chit.
 * 
 * Rules:
 * - Base monthly due is fixed from chit / membership.
 * - Previous balance is ending balance from prior month (positive = unpaid overdue, negative = excess advance credit).
 * - Total Adjusted Due = Base Due + Previous Balance (if previous balance is negative credit, it deducts from due, minimum 0).
 * - Total Amount Paid in this month = sum of active collection transactions for this installment_no.
 * - Ending Balance = Total Adjusted Due - Amount Paid.
 * - If ending balance > 0: unpaid amount carries forward to next month.
 * - If ending balance == 0: fully cleared.
 * - If ending balance < 0: excess amount carries forward as credit to deduct from next month's due.
 * - If credit covers entire next month's due, next month's due becomes 0, and remaining credit continues to next month.
 */
export function calculateMemberMonthlyDueSchedule(
  chit: ChitScheme,
  membership: ChitMembership,
  allTransactions: FinancialTransaction[]
): {
  monthlyItems: MemberMonthlyDueItem[];
  firstUnpaidOrPartialMonth: number;
  totalPaidAllMonths: number;
  totalScheduledDue: number;
  netOutstandingBalance: number;
  currentAdvanceCredit: number;
} {
  const baseMonthlyDue =
    membership.expected_monthly_contribution || chit.monthly_installment_amount || 0;
  const totalMonths = chit.duration_months || 1;

  // Filter scoped unreversed collections for this member and chit
  const scopedTxs = allTransactions.filter(
    (tx) =>
      tx.chit_id === chit.id &&
      tx.member_id === membership.member_id &&
      !tx.is_reversed &&
      (tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment')
  );

  const parts = chit.start_date ? chit.start_date.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const startYear = parts[0] || new Date().getFullYear();
  const startMonth = parts[1] || 1;
  const dueDay = chit.due_day || 3;

  const monthlyItems: MemberMonthlyDueItem[] = [];
  let previousEndingBalance = 0; // positive = unpaid, negative = credit
  let totalPaidAllMonths = 0;

  for (let i = 0; i < totalMonths; i++) {
    const installmentNo = i + 1;

    // Date computation
    const totalMonthIndex = startMonth - 1 + i;
    const year = startYear + Math.floor(totalMonthIndex / 12);
    const month = (totalMonthIndex % 12) + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const clampedDay = Math.min(dueDay, daysInMonth);
    const mm = String(month).padStart(2, '0');
    const dd = String(clampedDay).padStart(2, '0');
    const dueDateStr = `${year}-${mm}-${dd}`;

    const monthObj = new Date(year, month - 1, 1);
    const monthLabel = monthObj.toLocaleString('en-US', { month: 'short' });
    const monthName = `Month #${installmentNo} (${monthLabel} ${year})`;

    // Transactions recorded specifically for this installment month
    const monthTxs = scopedTxs.filter((tx) => tx.installment_no === installmentNo);
    const amountPaid = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);
    totalPaidAllMonths += amountPaid;

    // Carry-forward calculation
    const originalDue = baseMonthlyDue;
    const prevBalance = previousEndingBalance;
    let totalAdjustedDue = 0;
    let remainingBalance = 0;

    if (prevBalance >= 0) {
      // Prior month had 0 or unpaid dues -> add to current base due
      totalAdjustedDue = originalDue + prevBalance;
      remainingBalance = totalAdjustedDue - amountPaid;
    } else {
      // Prior month had excess credit (prevBalance is negative)
      const availableCredit = Math.abs(prevBalance);
      if (availableCredit <= originalDue) {
        totalAdjustedDue = originalDue - availableCredit;
        remainingBalance = totalAdjustedDue - amountPaid;
      } else {
        // Credit is larger than this whole month's due!
        totalAdjustedDue = 0;
        const excessCreditAfterThisMonth = availableCredit - originalDue;
        remainingBalance = -(excessCreditAfterThisMonth + amountPaid);
      }
    }

    // Determine status
    let status: 'Unpaid' | 'Partially Paid' | 'Paid';
    if (totalAdjustedDue === 0) {
      status = 'Paid'; // Covered 100% by credit from previous months
    } else if (amountPaid === 0) {
      status = 'Unpaid';
    } else if (amountPaid < totalAdjustedDue) {
      status = 'Partially Paid';
    } else {
      status = 'Paid';
    }

    monthlyItems.push({
      installment_no: installmentNo,
      month_name: monthName,
      due_date: dueDateStr,
      original_due: originalDue,
      previous_balance: prevBalance,
      total_adjusted_due: totalAdjustedDue,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      status,
      transactions: monthTxs,
    });

    previousEndingBalance = remainingBalance;
  }

  // Find first unpaid or partial month to recommend for next collection
  const firstPending = monthlyItems.find((item) => item.status !== 'Paid');
  const firstUnpaidOrPartialMonth = firstPending ? firstPending.installment_no : totalMonths;

  const totalScheduledDue = baseMonthlyDue * totalMonths;
  const netOutstandingBalance = Math.max(0, previousEndingBalance);
  const currentAdvanceCredit = previousEndingBalance < 0 ? Math.abs(previousEndingBalance) : 0;

  return {
    monthlyItems,
    firstUnpaidOrPartialMonth,
    totalPaidAllMonths,
    totalScheduledDue,
    netOutstandingBalance,
    currentAdvanceCredit,
  };
}

/**
 * Isolated Chit-Specific Cashbook Calculation
 * Guarantees that Cash and UPI balances remain segregated!
 */
export function calculateChitCashbook(
  transactions: FinancialTransaction[],
  membersMap: Map<string, CompanyMember>,
  openingCashBalance = 0,
  openingUpiBalance = 0
): CashbookRecord[] {
  // Sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let currentCash = openingCashBalance;
  let currentUpi = openingUpiBalance;

  const records: CashbookRecord[] = [];

  sorted.forEach((tx) => {
    const isMoneyIn = tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment';
    const isMoneyOut = tx.transaction_type === 'payout' || tx.transaction_type === 'expense';
    
    // If reversed, effect is inverted or nullified in active ledger
    const factor = tx.is_reversed ? 0 : 1;
    const moneyIn = isMoneyIn ? tx.amount : 0;
    const moneyOut = isMoneyOut ? tx.amount : 0;

    if (tx.payment_method === 'cash') {
      currentCash += (moneyIn - moneyOut) * factor;
    } else if (tx.payment_method === 'upi' || tx.payment_method === 'bank_transfer') {
      currentUpi += (moneyIn - moneyOut) * factor;
    }

    const member = tx.member_id ? membersMap.get(tx.member_id) : undefined;
    const partyName = member ? member.full_name : tx.payer_name || 'Counterparty';

    let description = '';
    if (tx.transaction_type === 'collection') {
      description = `Installment #${tx.installment_no || 'Misc'} received`;
    } else if (tx.transaction_type === 'payout') {
      description = `Prize/Auction payout disbursed`;
    } else if (tx.transaction_type === 'expense') {
      description = `Operational expense`;
    } else if (tx.transaction_type === 'reversal') {
      description = `Reversal of txn: ${tx.reversal_reason || 'Correction'}`;
    } else {
      description = tx.collector_notes || 'Adjustment entry';
    }

    records.push({
      id: tx.id,
      date: tx.transaction_date,
      receipt_no: tx.receipt_no,
      reference_id: tx.reference_id,
      party_name: partyName,
      entry_type: tx.transaction_type,
      description,
      payment_method: tx.payment_method,
      money_in: moneyIn,
      money_out: moneyOut,
      cash_balance: currentCash,
      upi_balance: currentUpi,
      net_balance: currentCash + currentUpi,
      is_reversed: tx.is_reversed,
    });
  });

  return records;
}

/**
 * Calculate high-level aggregated metrics for a chit scheme
 */
export function calculateChitMetrics(
  chit: ChitScheme,
  memberships: ChitMembership[],
  transactions: FinancialTransaction[]
): ChitSummaryMetrics {
  const activeMemberships = memberships.filter((m) => m.is_active);
  const totalSeatsFilled = activeMemberships.length;

  const totalExpectedPool = chit.total_pot_amount || (chit.monthly_installment_amount * chit.duration_months * chit.total_seats);

  let cashCollected = 0;
  let upiCollected = 0;
  let payoutsDisbursed = 0;

  transactions.forEach((tx) => {
    if (tx.chit_id !== chit.id || tx.is_reversed) return;

    if (tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment') {
      if (tx.payment_method === 'cash') {
        cashCollected += tx.amount;
      } else {
        upiCollected += tx.amount;
      }
    } else if (tx.transaction_type === 'payout') {
      payoutsDisbursed += tx.amount;
    }
  });

  const totalCollectedGross = cashCollected + upiCollected;
  const totalOutstanding = Math.max(0, totalExpectedPool - totalCollectedGross);

  // Month calculation
  const start = new Date(chit.start_date);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const monthsElapsed = Math.min(chit.duration_months, Math.max(0, monthsDiff + 1));
  const monthsRemaining = Math.max(0, chit.duration_months - monthsElapsed);

  return {
    total_expected_pool: totalExpectedPool,
    total_collected_gross: totalCollectedGross,
    cash_collected: cashCollected,
    upi_collected: upiCollected,
    total_outstanding: totalOutstanding,
    months_elapsed: monthsElapsed,
    months_remaining: monthsRemaining,
    total_members: memberships.length,
    active_seats_filled: totalSeatsFilled,
    payouts_disbursed: payoutsDisbursed,
    net_scheme_cash_in_hand: cashCollected - (payoutsDisbursed > 0 ? 0 : 0), // Cash segregation
    net_scheme_upi_balance: upiCollected,
  };
}

/**
 * Curated motivational and financial quotes that change deterministically
 * by day of the year (never randomly re-rendering)
 */
export function getDailyMotivationalQuote(date = new Date()): { quote: string; author: string } {
  const quotes = [
    { quote: "A small saving today is the cornerstone of great security tomorrow.", author: "Chanakya (Arthashastra)" },
    { quote: "Discipline in financial record-keeping builds the foundation of trust and prosperity.", author: "Warren Buffett" },
    { quote: "Trust is earned when actions meet commitments every single month.", author: "Financial Wisdom" },
    { quote: "Mutual credit and community trust turn collective savings into empowered growth.", author: "Indian Chit Fund Heritage" },
    { quote: "He who looks after the small pennies will never have to worry about the millions.", author: "Proverb" },
    { quote: "Consistency in collection is the lifeblood of a healthy chit fund company.", author: "Operations Rule" },
    { quote: "Integrity in accounts is the highest virtue of an entrepreneur.", author: "M. K. Gandhi" },
    { quote: "A rupee saved and pooled systematically compounds into life-changing opportunities.", author: "Financial Principle" },
    { quote: "Punctuality in payments creates an unshakeable reputation in business.", author: "Commerce Adage" },
    { quote: "Clarity in financial ledgers dispels all ambiguity and preserves long-term harmony.", author: "Accounting Canon" },
    { quote: "The secret to financial success is simple: track every single transaction with diligence.", author: "B. Franklin" },
    { quote: "Community-driven finance is the oldest and most resilient form of cooperative prosperity.", author: "Economic Thought" },
  ];

  // Deterministic calculation by day of the year
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = Math.abs(dayOfYear) % quotes.length;
  return quotes[index];
}
