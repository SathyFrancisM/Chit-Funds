# CHITFLOW — Enterprise Chit Fund Management Suite

**CHITFLOW** is a secure, high-performance financial administration web application built specifically for chit fund company owners and authorized operations staff. It streamlines the day-to-day management of multiple chit schemes, subscriber enrollments, installment collections (Cash & UPI), isolated member ledgers, chit cashbooks, compliance reporting, and maturity countdowns.

---

## Key Features & Highlights

- **Executive Financial Dashboard**
  - Live KPI metrics for active chits, subscriber seats, gross collections, and outstanding installment balances.
  - Strict segregation of physical **Cash on Hand** versus digital **UPI / Bank account** balances.
  - Curated daily financial & business quotes that change deterministically by calendar day.
  - Quick action shortcuts for instant daily operations.

- **Chit Scheme Engine**
  - Unique scheme code generation with customizable durations, monthly installment amounts, and seat quotas.
  - Exact calendar-month arithmetic for planned maturity date calculations.
  - Live monthly installment schedule preview before scheme activation.
  - Support for Draft, Active, and Completed scheme states.

- **Subscriber Contact Management & Device Access**
  - Normalized phone deduplication ensuring no subscriber collisions.
  - Browser **Contact Picker API** integration (`navigator.contacts.select`) for mobile devices with automatic fallback to manual entry and multi-contact CSV import.
  - Member profile drawer detailing active seat participation across multiple schemes.

- **Chit Dedicated Workspace (6 Tabs)**
  1. **Overview**: Financial progress bar, months elapsed, months remaining, gross collections.
  2. **Members**: Enrolled subscribers, expected contributions, total paid, outstanding balances, seat deactivations with mandatory reason audit.
  3. **Collections**: Chronological receipt register with Cash/UPI verification.
  4. **Cashbook**: Isolated double-entry cashbook with running cash and UPI balances. Support for recording prize money payouts (auctions) and operational expenses.
  5. **Reports**: Formatted statements in accordance with Section 16 & 23 of the Chit Funds Act, 1982.
  6. **Schedule & Maturity**: Chronological monthly installment timeline and maturity countdown.

- **Scoped Member Ledgers & Receipts**
  - Every subscriber has an isolated ledger strictly scoped to their scheme seat.
  - Itemized statement of account with running totals and remaining scheduled contributions.
  - Official printable Chit Fund receipt generator (`CF-REC-YYYYMM-XXXX`) with company masthead and signature seals.

- **Financial Data Integrity & Auditing**
  - Idempotency guard preventing accidental duplicate payment submissions.
  - Partial payments and overpayment allocation detection.
  - Permission-controlled transaction reversals (Owner only) with mandatory audit reasons, backing out cashbook and ledger totals without deleting historical records.
  - Complete security audit log tracking all scheme creations, payments, and reversals.

- **Reminders & Direct Communication**
  - Installment deadline alerts (due in 30, 15, 7, 1 days).
  - WhatsApp template launcher with pre-filled reminder text.
  - One-click copy SMS templates and direct phone call triggers.

- **Dual-Mode Architecture (Supabase Cloud + Local Demo Mode)**
  - Seamlessly operates in Local Demonstration Mode with pre-seeded realistic data when Supabase credentials are not configured.
  - Full PostgreSQL schema and migrations with Row-Level Security (RLS) for production deployment.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4
- **Icons**: Lucide React
- **Testing**: Vitest
- **Database (Production)**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Local Persistence**: Browser LocalStorage & JSON backup/restore

---

## Visual Design System

CHITFLOW follows a strictly monochrome, financial administration palette:
- **Primary Background**: White (`#FFFFFF`) & Subdued Grey (`#FAFAFA`)
- **Typography & Headings**: Near-Black (`#111111`) with Inter font
- **Borders & Separators**: Light Neutral Grey (`#E5E7EB` / `#F4F4F4`)
- **Controls**: Crisp borders, accessible focus rings, zero decorative distractions or colorful neon gradients.

---

## Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Vite will start the server binding to `0.0.0.0`, exposing:
- **Localhost URL**: `http://localhost:5173/`
- **Network URL**: `http://<your-local-ip>:5173/` (accessible from mobile devices on the same Wi-Fi)

### 3. Run Automated Unit Tests
```bash
npx vitest run
```
Executes tests validating:
- Indian numbering system currency formatting (`₹25,00,000`).
- Indian phone number normalization.
- Calendar-month maturity date calculations and month-end clamping.
- Strict Cash vs UPI account balance segregation.
- Ledger calculation and reversal nullification.
- Deterministic calendar-day motivational quote selection.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

---

## Supabase PostgreSQL Production Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard and run the migration script:
   ```sql
   supabase/migrations/20261011000001_chitflow_initial_schema.sql
   ```
3. Copy your project credentials into `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
   ```
4. Restart your Vite development server:
   ```bash
   npm run dev
   ```

---

## Role-Based Access Control (RBAC)

- **Owner (`Managing Director`)**: Full administrative access, company profile updates, user account management, and financial transaction reversal authorizations.
- **Staff (`Accounts Executive`)**: Everyday operations including adding subscribers, enrolling members in seats, recording Cash & UPI payments, generating receipts, and viewing reports.

You can switch between Owner and Staff on the top navigation bar to test role permissions.

---

## Legal & Compliance Awareness

CHITFLOW is an operational management and record-keeping tool, designed following the general principles of the **Chit Funds Act, 1982**. Chit fund companies should configure their specific auction discounts, foreman commission rates, and dividend rules according to their sanctioned state by-laws and consult a qualified chartered accountant or legal advisor for statutory filings.
