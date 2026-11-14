import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Filter,
  Calendar,
  Banknote,
  Smartphone,
  IndianRupee,
  Layers,
  Users,
} from 'lucide-react';
import {
  ChitScheme,
  CompanyMember,
  FinancialTransaction,
  ChitMembership,
  CompanyProfile,
} from '../../types';
import { formatCurrency } from '../../utils/financial';

interface ReportsViewProps {
  schemes: ChitScheme[];
  members: CompanyMember[];
  memberships: ChitMembership[];
  transactions: FinancialTransaction[];
  company: CompanyProfile;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  schemes,
  members,
  memberships,
  transactions,
  company,
}) => {
  const [reportType, setReportType] = useState<
    'collection_summary' | 'member_wise' | 'cash_vs_upi' | 'outstanding' | 'maturity_calendar'
  >('collection_summary');

  const [selectedChit, setSelectedChit] = useState<string>('all');

  const membersMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const schemesMap = useMemo(() => new Map(schemes.map((s) => [s.id, s])), [schemes]);

  // Valid non-reversed transactions
  const validTransactions = useMemo(() => {
    return transactions.filter((t) => !t.is_reversed && (selectedChit === 'all' || t.chit_id === selectedChit));
  }, [transactions, selectedChit]);

  // Overall financial sums
  const stats = useMemo(() => {
    let grossCollection = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let payoutTotal = 0;
    let expenseTotal = 0;

    validTransactions.forEach((tx) => {
      if (tx.transaction_type === 'collection' || tx.transaction_type === 'adjustment') {
        grossCollection += tx.amount;
        if (tx.payment_method === 'cash') cashTotal += tx.amount;
        else upiTotal += tx.amount;
      } else if (tx.transaction_type === 'payout') {
        payoutTotal += tx.amount;
      } else if (tx.transaction_type === 'expense') {
        expenseTotal += tx.amount;
      }
    });

    return { grossCollection, cashTotal, upiTotal, payoutTotal, expenseTotal };
  }, [validTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csvData = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (reportType === 'collection_summary') {
      const headers = ['Receipt No', 'Date', 'Member', 'Scheme', 'Method', 'Amount'];
      const rows = validTransactions.filter((t) => t.transaction_type === 'collection').map((t) => [
        t.receipt_no,
        t.transaction_date,
        `"${membersMap.get(t.member_id || '')?.full_name || t.payer_name}"`,
        schemesMap.get(t.chit_id)?.scheme_code || '',
        t.payment_method,
        t.amount,
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      // General ledger dump
      const headers = ['Date', 'Receipt', 'Scheme', 'Type', 'Method', 'Amount'];
      const rows = validTransactions.map((t) => [
        t.transaction_date,
        t.receipt_no,
        schemesMap.get(t.chit_id)?.scheme_code || '',
        t.transaction_type,
        t.payment_method,
        t.amount,
      ]);
      csvData = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvData);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report_${reportType}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#111111]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
              Financial Reporting & Compliance Audits
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Chit Funds Act 1982 audit registers, method breakdowns, and maturity calendars
          </p>
        </div>

        <div className="flex items-center space-x-2 no-print">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-[#111111] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#111111] hover:bg-[#262626] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Report Category Navigation */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs">
          {[
            { id: 'collection_summary', label: 'Collections Summary' },
            { id: 'cash_vs_upi', label: 'Cash vs UPI Breakdown' },
            { id: 'member_wise', label: 'Member-wise Register' },
            { id: 'outstanding', label: 'Outstanding Balance Audit' },
            { id: 'maturity_calendar', label: 'Maturity Calendar' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setReportType(cat.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                reportType === cat.id
                  ? 'bg-[#111111] text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:text-[#111111]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scheme Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-neutral-600">Scheme Filter:</span>
          <select
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[#111111] focus:ring-1 focus:ring-neutral-900 focus:outline-none"
          >
            <option value="all">Consolidated (All Schemes)</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.scheme_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* REPORT CONTENT BODY */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
        {/* Formal Report Header */}
        <div className="border-b border-neutral-200 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">
              {company.name}
            </h2>
            <p className="text-xs text-neutral-500">
              Registration No: {company.registration_no} • {company.address}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p>Generated on: {new Date().toLocaleDateString('en-IN')}</p>
            <p className="font-semibold text-[#111111] uppercase mt-0.5">
              Report: {reportType.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* 1. COLLECTION SUMMARY REPORT */}
        {reportType === 'collection_summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500 uppercase block font-semibold">Total Gross Collections</span>
                <span className="text-xl font-bold text-[#111111] mt-1 block">
                  {formatCurrency(stats.grossCollection)}
                </span>
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500 uppercase block font-semibold">Prize Payouts Disbursed</span>
                <span className="text-xl font-bold text-[#111111] mt-1 block">
                  {formatCurrency(stats.payoutTotal)}
                </span>
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-xs text-neutral-500 uppercase block font-semibold">Operational Expenses</span>
                <span className="text-xl font-bold text-[#111111] mt-1 block">
                  {formatCurrency(stats.expenseTotal)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Receipt #</th>
                    <th className="px-4 py-2.5">Subscriber</th>
                    <th className="px-4 py-2.5">Scheme</th>
                    <th className="px-4 py-2.5">Method</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {validTransactions.filter((t) => t.transaction_type === 'collection').map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-2.5">{tx.transaction_date}</td>
                      <td className="px-4 py-2.5 font-mono font-medium">{tx.receipt_no}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#111111]">
                        {membersMap.get(tx.member_id || '')?.full_name || tx.payer_name}
                      </td>
                      <td className="px-4 py-2.5">{schemesMap.get(tx.chit_id)?.scheme_code}</td>
                      <td className="px-4 py-2.5 uppercase font-medium">{tx.payment_method}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#111111]">{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. CASH VS UPI BREAKDOWN REPORT */}
        {reportType === 'cash_vs_upi' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center space-x-2 text-neutral-700 font-bold text-xs uppercase mb-2">
                  <Banknote className="w-4 h-4 text-[#111111]" />
                  <span>Physical Cash Collections</span>
                </div>
                <span className="text-2xl font-bold text-[#111111] block">
                  {formatCurrency(stats.cashTotal)}
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  {((stats.cashTotal / (stats.grossCollection || 1)) * 100).toFixed(1)}% of total receipts
                </span>
              </div>

              <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center space-x-2 text-neutral-700 font-bold text-xs uppercase mb-2">
                  <Smartphone className="w-4 h-4 text-[#111111]" />
                  <span>Digital UPI / Bank Collections</span>
                </div>
                <span className="text-2xl font-bold text-[#111111] block">
                  {formatCurrency(stats.upiTotal)}
                </span>
                <span className="text-xs text-neutral-500 mt-1 block">
                  {((stats.upiTotal / (stats.grossCollection || 1)) * 100).toFixed(1)}% of total receipts
                </span>
              </div>
            </div>

            <div className="p-4 bg-neutral-100 rounded-lg text-xs text-neutral-700">
              <p className="font-semibold text-[#111111]">Compliance Verification Note:</p>
              <p className="mt-1">
                Under company accounting guidelines, all cash collections are physically verified at the company vault counter and remain segregated from electronic bank receipts.
              </p>
            </div>
          </div>
        )}

        {/* 3. MEMBER-WISE REGISTER */}
        {reportType === 'member_wise' && (
          <div className="overflow-x-auto border border-neutral-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Subscriber</th>
                  <th className="px-4 py-2.5">Mobile</th>
                  <th className="px-4 py-2.5 text-center">Active Seats</th>
                  <th className="px-4 py-2.5 text-right">Total Subscribed</th>
                  <th className="px-4 py-2.5 text-right">Total Paid</th>
                  <th className="px-4 py-2.5 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {members.map((m) => {
                  const mSeats = memberships.filter((cms) => cms.member_id === m.id && cms.is_active);
                  const mTransactions = validTransactions.filter((tx) => tx.member_id === m.id && tx.transaction_type === 'collection');
                  const totalPaid = mTransactions.reduce((acc, t) => acc + t.amount, 0);
                  const totalSubscribed = mSeats.reduce((acc, cms) => {
                    const sch = schemesMap.get(cms.chit_id);
                    return acc + (cms.expected_monthly_contribution * (sch?.duration_months || 0));
                  }, 0);
                  const outstanding = Math.max(0, totalSubscribed - totalPaid);

                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 font-bold text-[#111111]">{m.full_name}</td>
                      <td className="px-4 py-2.5 font-mono">{m.phone}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{mSeats.length}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(totalSubscribed)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#111111]">{formatCurrency(totalPaid)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-neutral-600">{formatCurrency(outstanding)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. OUTSTANDING BALANCE AUDIT */}
        {reportType === 'outstanding' && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              Audit statement of all active schemes and uncollected commitments:
            </p>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Scheme</th>
                    <th className="px-4 py-2.5">Start Date</th>
                    <th className="px-4 py-2.5">Planned Maturity</th>
                    <th className="px-4 py-2.5 text-right">Pot Value</th>
                    <th className="px-4 py-2.5 text-right">Gross Collected</th>
                    <th className="px-4 py-2.5 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {schemes.map((s) => {
                    const sTxs = validTransactions.filter((tx) => tx.chit_id === s.id && tx.transaction_type === 'collection');
                    const gross = sTxs.reduce((sum, t) => sum + t.amount, 0);
                    const pot = s.total_pot_amount || (s.monthly_installment_amount * s.duration_months * s.total_seats);
                    const outstanding = Math.max(0, pot - gross);

                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-bold text-[#111111]">{s.name} ({s.scheme_code})</td>
                        <td className="px-4 py-2.5">{s.start_date}</td>
                        <td className="px-4 py-2.5">{s.planned_maturity_date}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(pot)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#111111]">{formatCurrency(gross)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-neutral-700">{formatCurrency(outstanding)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. MATURITY CALENDAR */}
        {reportType === 'maturity_calendar' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schemes.map((s) => {
                const maturityDate = new Date(s.planned_maturity_date);
                const today = new Date();
                const diffDays = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <div key={s.id} className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-[#111111]">{s.name}</span>
                        <span className="block text-[11px] text-neutral-500 font-mono mt-0.5">{s.scheme_code}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        diffDays < 0
                          ? 'bg-neutral-300 text-neutral-800'
                          : diffDays <= 60
                          ? 'bg-[#111111] text-white'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}>
                        {diffDays < 0 ? 'Matured' : `${diffDays} Days Remaining`}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-200/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Planned Maturity</span>
                        <span className="font-semibold text-[#111111]">{s.planned_maturity_date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">Sanctioned Pot</span>
                        <span className="font-semibold text-[#111111]">{formatCurrency(s.total_pot_amount)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
