-- ==============================================================================
-- CHITFLOW - Production PostgreSQL Database Schema & Migrations
-- Designed for Chit Fund Company Administrators (Owner & Staff)
-- Compliant with Chit Funds Act 1982 audit trail & double-entry record standards
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Company Profiles (Multi-tenant company entity)
CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_no VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
    receipt_prefix VARCHAR(20) NOT NULL DEFAULT 'CF-REC-',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Profiles (Owner & Staff company operators)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);

-- 3. Company Members (Chit participants / subscribers)
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    phone_normalized VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (kyc_status IN ('verified', 'pending', 'exempt')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_company_phone UNIQUE (company_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON company_members(phone_normalized);

-- 4. Chit Schemes (Individual Chit Groups / Batches)
CREATE TABLE IF NOT EXISTS chit_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    scheme_code VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    duration_months INT NOT NULL CHECK (duration_months > 0),
    installment_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (installment_frequency IN ('monthly', 'weekly')),
    monthly_installment_amount NUMERIC(15, 2) NOT NULL CHECK (monthly_installment_amount > 0),
    total_pot_amount NUMERIC(15, 2) NOT NULL CHECK (total_pot_amount > 0),
    total_seats INT NOT NULL CHECK (total_seats > 0),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 28),
    planned_maturity_date DATE NOT NULL,
    notes TEXT,
    scheme_rules TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scheme_code_company UNIQUE (company_id, scheme_code)
);

CREATE INDEX IF NOT EXISTS idx_schemes_company ON chit_schemes(company_id);
CREATE INDEX IF NOT EXISTS idx_schemes_status ON chit_schemes(status);

-- 5. Chit Memberships (Seats assigned to members in schemes)
CREATE TABLE IF NOT EXISTS chit_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_id UUID NOT NULL REFERENCES chit_schemes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE RESTRICT,
    seat_number INT NOT NULL CHECK (seat_number > 0),
    expected_monthly_contribution NUMERIC(15, 2) NOT NULL CHECK (expected_monthly_contribution > 0),
    joined_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    removed_date DATE,
    removal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chit_seat UNIQUE (chit_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_memberships_chit ON chit_memberships(chit_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON chit_memberships(member_id);

-- 6. Installment Schedules
CREATE TABLE IF NOT EXISTS installment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_id UUID NOT NULL REFERENCES chit_schemes(id) ON DELETE CASCADE,
    installment_no INT NOT NULL CHECK (installment_no > 0),
    due_date DATE NOT NULL,
    expected_per_member NUMERIC(15, 2) NOT NULL CHECK (expected_per_member >= 0),
    expected_total_pool NUMERIC(15, 2) NOT NULL CHECK (expected_total_pool >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'overdue', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chit_installment UNIQUE (chit_id, installment_no)
);

CREATE INDEX IF NOT EXISTS idx_installment_due_date ON installment_schedules(due_date);

-- 7. Financial Transactions (Immutable single source of truth for all collections & cash movements)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE RESTRICT,
    chit_id UUID NOT NULL REFERENCES chit_schemes(id) ON DELETE RESTRICT,
    member_id UUID REFERENCES company_members(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('collection', 'payout', 'expense', 'reversal', 'adjustment')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    receipt_no VARCHAR(50) NOT NULL,
    installment_no INT,
    reference_id VARCHAR(100), -- UPI txn id or UTR
    payer_name VARCHAR(150),
    collector_notes TEXT,
    transaction_date DATE NOT NULL,
    recorded_by VARCHAR(150) NOT NULL,
    is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_reason TEXT,
    reversed_by VARCHAR(150),
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_transaction_receipt UNIQUE (company_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_tx_chit ON financial_transactions(chit_id);
CREATE INDEX IF NOT EXISTS idx_tx_member ON financial_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_method ON financial_transactions(payment_method);

-- 8. Transaction Allocations (Relates payments to specific installment periods)
CREATE TABLE IF NOT EXISTS transaction_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    installment_no INT NOT NULL,
    amount_allocated NUMERIC(15, 2) NOT NULL CHECK (amount_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Audit Logs (Compliance & Security tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);

-- 10. Notifications (Reminders & System alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'reminder',
    chit_id UUID REFERENCES chit_schemes(id) ON DELETE SET NULL,
    member_id UUID REFERENCES company_members(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(company_id, is_read);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Security helper function to get current company
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Security helper function to check owner role
CREATE OR REPLACE FUNCTION is_company_owner()
RETURNS BOOLEAN AS $$
    SELECT (role = 'owner') FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Apply company isolation policy
CREATE POLICY company_members_policy ON company_members
    FOR ALL USING (company_id = get_current_company_id());

CREATE POLICY chit_schemes_policy ON chit_schemes
    FOR ALL USING (company_id = get_current_company_id());

CREATE POLICY financial_transactions_policy ON financial_transactions
    FOR ALL USING (company_id = get_current_company_id());

CREATE POLICY audit_logs_policy ON audit_logs
    FOR ALL USING (company_id = get_current_company_id());

CREATE POLICY notifications_policy ON notifications
    FOR ALL USING (company_id = get_current_company_id());
