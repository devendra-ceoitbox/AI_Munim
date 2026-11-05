-- ==============================================================================
-- AI MUNIM – HIGH-CONCURRENCY POSTGRESQL DATABASE SCHEMA
-- Designed for High-Throughput Read/Write Operations in SME Accounting & Compliance
-- ==============================================================================

-- Enable UUID extension for distributed unique keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS & TENANT ISOLATION
-- ------------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    base_currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    financial_year VARCHAR(32) NOT NULL, -- e.g., '2026-2027'
    industry_profile VARCHAR(64) DEFAULT 'Trading' NOT NULL,
    approver_limit_amount NUMERIC(15,2) DEFAULT 100000.00 NOT NULL,
    lock_version INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Fast lookup by organization ID
CREATE INDEX idx_organizations_name ON organizations(legal_name);

-- ------------------------------------------------------------------------------
-- 2. GST REGISTRATIONS MASTER
-- ------------------------------------------------------------------------------
CREATE TABLE gst_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    gstin VARCHAR(15) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    registration_type VARCHAR(32) DEFAULT 'Regular' NOT NULL,
    return_frequency VARCHAR(16) DEFAULT 'Monthly' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_org_gstin UNIQUE (organization_id, gstin)
);

CREATE INDEX idx_gst_registrations_gstin ON gst_registrations(gstin);

-- ------------------------------------------------------------------------------
-- 3. PARTIES MASTER (CUSTOMERS & SUPPLIERS)
-- ------------------------------------------------------------------------------
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    party_type VARCHAR(16) NOT NULL CHECK (party_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH')),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    gstin VARCHAR(15),
    phone VARCHAR(32),
    email VARCHAR(255),
    credit_days INT DEFAULT 30 NOT NULL,
    credit_limit NUMERIC(15,2) DEFAULT 0.00,
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    lock_version INT DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Composite index for party searches by organization and type
CREATE INDEX idx_parties_org_type ON parties(organization_id, party_type, is_active);
CREATE INDEX idx_parties_gstin ON parties(organization_id, gstin);

-- ------------------------------------------------------------------------------
-- 4. CHART OF ACCOUNTS (DOUBLE-ENTRY LEDGER MATRIX)
-- ------------------------------------------------------------------------------
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_name VARCHAR(64) NOT NULL, -- 'Current Assets', 'Revenue', 'Direct Expenses', etc.
    account_type VARCHAR(32) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'
    is_control_account BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_org_account_code UNIQUE (organization_id, code)
);

CREATE INDEX idx_coa_org_group ON chart_of_accounts(organization_id, account_type);

-- ------------------------------------------------------------------------------
-- 5. DOCUMENTS (SALES INVOICES, SUPPLIER BILLS, CREDIT/DEBIT NOTES)
-- Partitioned by RANGE (created_at) for massive write and historical query scaling
-- ------------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    doc_type VARCHAR(32) NOT NULL, -- 'SALES_INVOICE', 'PURCHASE_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'
    doc_no VARCHAR(64) NOT NULL,
    doc_date DATE NOT NULL,
    due_date DATE NOT NULL,
    party_id UUID NOT NULL REFERENCES parties(id),
    gstin VARCHAR(15),
    place_of_supply VARCHAR(2),
    taxable_value NUMERIC(15,2) NOT NULL,
    cgst_amount NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    sgst_amount NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    igst_amount NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    total_tax NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(32) DEFAULT 'DRAFT' NOT NULL, -- 'DRAFT', 'EXTRACTED', 'AWAITING_APPROVAL', 'POSTED', 'DISPUTED', 'SETTLED'
    ledger_account_id UUID REFERENCES chart_of_accounts(id),
    ai_confidence_score NUMERIC(5,2), -- e.g., 98.50%
    promise_pay_date DATE,
    is_disputed BOOLEAN DEFAULT FALSE NOT NULL,
    dispute_reason TEXT,
    idempotency_key VARCHAR(128),
    lock_version INT DEFAULT 1 NOT NULL, -- Optimistic concurrency control (OCC)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partition examples for 2026/2027
CREATE TABLE documents_2026_q4 PARTITION OF documents
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE documents_2027_q1 PARTITION OF documents
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE documents_default PARTITION OF documents DEFAULT;

-- HIGH CONCURRENCY COMPOSITE & PARTIAL INDEXES:
-- 1. Fast duplicate check under high concurrency
CREATE UNIQUE INDEX idx_documents_idempotency ON documents(organization_id, idempotency_key, created_at) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_documents_org_docno ON documents(organization_id, gstin, doc_no);

-- 2. Partial index for Approver Queue (only pending approvals, skips million posted docs)
CREATE INDEX idx_documents_awaiting_approval ON documents(organization_id, due_date)
    WHERE status = 'AWAITING_APPROVAL';

-- 3. Partial index for Collections Autopilot (only unpaid customer invoices)
CREATE INDEX idx_documents_receivables_active ON documents(organization_id, due_date, party_id)
    WHERE doc_type = 'SALES_INVOICE' AND status IN ('POSTED', 'AWAITING_APPROVAL') AND is_disputed = FALSE;

-- ------------------------------------------------------------------------------
-- 6. DOUBLE-ENTRY GENERAL LEDGER (JOURNALS)
-- ------------------------------------------------------------------------------
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    voucher_no VARCHAR(64) NOT NULL,
    voucher_date DATE NOT NULL,
    source_document_id UUID,
    source_type VARCHAR(32) NOT NULL, -- 'INVOICE', 'RECEIPT', 'PAYMENT', 'BANK_LINE', 'MANUAL'
    narration TEXT NOT NULL,
    total_debit NUMERIC(15,2) NOT NULL,
    total_credit NUMERIC(15,2) NOT NULL,
    is_balanced BOOLEAN NOT NULL DEFAULT TRUE,
    posted_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit)
);

CREATE INDEX idx_journal_entries_org_date ON journal_entries(organization_id, voucher_date);

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    party_id UUID REFERENCES parties(id),
    debit NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    credit NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    line_narration VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Fast ledger statement aggregation index
CREATE INDEX idx_journal_lines_account_created ON journal_lines(account_id, created_at);

-- ------------------------------------------------------------------------------
-- 7. BANK ACCOUNTS & IMPORTED BANK STATEMENT LINES
-- Includes SKIP LOCKED worker queue support for high-throughput reconciliation
-- ------------------------------------------------------------------------------
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_name VARCHAR(128) NOT NULL,
    account_number_masked VARCHAR(32) NOT NULL,
    ifsc_code VARCHAR(16) NOT NULL,
    book_balance NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE bank_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    narration TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL, -- + credit (inflow), - debit (outflow)
    reference_number VARCHAR(128),
    ai_suggested_match_id UUID,
    ai_confidence_score NUMERIC(5,2),
    status VARCHAR(32) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'RECONCILED', 'EXCEPTION'
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Partial index for high-concurrency bank worker polling
CREATE INDEX idx_bank_lines_pending_queue ON bank_lines(bank_account_id, amount)
    WHERE status = 'PENDING';

-- ------------------------------------------------------------------------------
-- 8. GSTR-2B PORTAL DOCUMENTS & RECONCILIATION
-- ------------------------------------------------------------------------------
CREATE TABLE gstr2b_portal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    return_period VARCHAR(16) NOT NULL, -- e.g. '102026' (Oct 2026)
    supplier_gstin VARCHAR(15) NOT NULL,
    supplier_name VARCHAR(255),
    invoice_number VARCHAR(64) NOT NULL,
    invoice_date DATE NOT NULL,
    taxable_value NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) NOT NULL,
    match_status VARCHAR(32) DEFAULT 'PORTAL_ONLY' NOT NULL, -- 'MATCHED', 'MISMATCH', 'PORTAL_ONLY', 'RESOLVED'
    matched_document_id UUID,
    difference_amount NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_gstr2b_reconcile ON gstr2b_portal_documents(organization_id, supplier_gstin, invoice_number);

-- ------------------------------------------------------------------------------
-- 9. IMMUTABLE AUDIT LOG (BRIN INDEXED FOR HIGH-CONCURRENCY WRITES)
-- ------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id BIGSERIAL,
    organization_id UUID NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- BRIN (Block Range Index) is extraordinarily lightweight (<1% disk) for append-only logs
CREATE INDEX idx_audit_logs_brin_time ON audit_logs USING BRIN(created_at);

-- ------------------------------------------------------------------------------
-- HIGH-CONCURRENCY WORKER PATTERN EXAMPLE:
-- For worker threads polling unreconciled bank lines without deadlocks:
--
-- BEGIN;
-- SELECT id, narration, amount
--   FROM bank_lines
--  WHERE status = 'PENDING'
--  ORDER BY transaction_date ASC
--  LIMIT 50
--  FOR UPDATE SKIP LOCKED;
-- ... process matching ...
-- UPDATE bank_lines SET status = 'RECONCILED' WHERE id IN (...);
-- COMMIT;
-- ==============================================================================
