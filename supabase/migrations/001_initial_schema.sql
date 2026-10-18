-- =============================================================================
-- 001_initial_schema.sql: Daily Collection Tracker Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Helper Function: Current IST Date (UTC+05:30)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_ist_date()
RETURNS DATE AS $$
BEGIN
    RETURN (now() AT TIME ZONE 'Asia/Kolkata')::date;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------------------------------
-- 2. User Profiles Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'collector' CHECK (role IN ('admin', 'collector')),
    language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'te')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- -----------------------------------------------------------------------------
-- 3. Daily Sheets Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_date DATE NOT NULL,
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sheet_date_collector UNIQUE (sheet_date, collector_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_sheets_date ON public.daily_sheets(sheet_date);
CREATE INDEX IF NOT EXISTS idx_daily_sheets_collector_date ON public.daily_sheets(collector_id, sheet_date);

-- -----------------------------------------------------------------------------
-- 4. Entries Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES public.daily_sheets(id) ON DELETE CASCADE,
    collector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    dealer_name TEXT NOT NULL,
    cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (cash_amount >= 0),
    phonepe_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (phonepe_amount >= 0),
    total_collected NUMERIC(12,2) GENERATED ALWAYS AS (cash_amount + phonepe_amount) STORED,
    balance_owed NUMERIC(12,2) NULL CHECK (balance_owed IS NULL OR balance_owed >= 0),
    note TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'draft', 'submitted')),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID REFERENCES public.profiles(id),
    CONSTRAINT chk_at_least_one_payment CHECK (cash_amount > 0 OR phonepe_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_entries_sheet_id ON public.entries(sheet_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entries_collector_id ON public.entries(collector_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON public.entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entries_dealer_name_trgm ON public.entries USING gin (dealer_name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 5. Entry Audit Logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entry_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('UPDATE', 'DELETE')),
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_values JSONB NOT NULL,
    new_values JSONB,
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_entry_id ON public.entry_audit_logs(entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON public.entry_audit_logs(changed_at);

-- -----------------------------------------------------------------------------
-- 6. Trigger: Updated At Auto-Update
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_daily_sheets_updated_at ON public.daily_sheets;
CREATE TRIGGER trg_daily_sheets_updated_at
BEFORE UPDATE ON public.daily_sheets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_entries_updated_at ON public.entries;
CREATE TRIGGER trg_entries_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- -----------------------------------------------------------------------------
-- 7. Trigger: Auto-populate Collector ID on Entries from Sheet
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_entry_collector_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.collector_id IS NULL THEN
        SELECT collector_id INTO NEW.collector_id
        FROM public.daily_sheets
        WHERE id = NEW.sheet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_entry_collector ON public.entries;
CREATE TRIGGER trg_sync_entry_collector
BEFORE INSERT ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.sync_entry_collector_id();

-- -----------------------------------------------------------------------------
-- 8. Trigger: Audit Logging for Admin Edits & Deletes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_entry_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action TEXT;
BEGIN
    v_user_id := auth.uid();

    IF (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) THEN
        v_action := 'DELETE';
    ELSE
        v_action := 'UPDATE';
    END IF;

    INSERT INTO public.entry_audit_logs (
        entry_id,
        action,
        changed_by,
        changed_at,
        old_values,
        new_values,
        reason
    ) VALUES (
        NEW.id,
        v_action,
        COALESCE(v_user_id, NEW.updated_by, NEW.collector_id),
        now(),
        to_jsonb(OLD),
        to_jsonb(NEW),
        COALESCE(NEW.note, 'Modified by Admin')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_entries ON public.entries;
CREATE TRIGGER trg_audit_entries
AFTER UPDATE ON public.entries
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.audit_entry_mutation();

-- -----------------------------------------------------------------------------
-- 9. Trigger: Handle New User Signup from auth.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, language_preference)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'collector'),
        COALESCE(NEW.raw_user_meta_data->>'language_preference', 'en')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        language_preference = EXCLUDED.language_preference,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 10. RPC: Safe Get-or-Create Daily Sheet for Collector
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_daily_sheet(p_collector_id UUID, p_date DATE)
RETURNS UUID AS $$
DECLARE
    v_sheet_id UUID;
BEGIN
    SELECT id INTO v_sheet_id
    FROM public.daily_sheets
    WHERE collector_id = p_collector_id AND sheet_date = p_date;

    IF v_sheet_id IS NULL THEN
        INSERT INTO public.daily_sheets (collector_id, sheet_date)
        VALUES (p_collector_id, p_date)
        ON CONFLICT (sheet_date, collector_id)
        DO UPDATE SET updated_at = now()
        RETURNING id INTO v_sheet_id;
    END IF;

    RETURN v_sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 11. RPC: Dealer Name Autocomplete Suggestions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dealer_suggestions(search_query TEXT, max_limit INT DEFAULT 10)
RETURNS TABLE (dealer_name TEXT, last_used TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (e.dealer_name)
        e.dealer_name,
        e.created_at as last_used
    FROM public.entries e
    WHERE e.is_deleted = FALSE
      AND (search_query = '' OR e.dealer_name ILIKE '%' || search_query || '%')
    ORDER BY e.dealer_name, e.created_at DESC
    LIMIT max_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
