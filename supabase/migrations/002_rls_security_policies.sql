-- =============================================================================
-- 002_rls_security_policies.sql: Complete RLS Policy Suite
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Helper Security Functions (SECURITY DEFINER to avoid recursion)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(v_role, 'collector');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_auth_role() = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_collector()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_auth_role() = 'collector');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies: `profiles`
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR public.is_admin()
);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid() OR public.is_admin()
)
WITH CHECK (
    public.is_admin() OR (id = auth.uid() AND role = 'collector')
);

-- -----------------------------------------------------------------------------
-- 3. RLS Policies: `daily_sheets`
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "daily_sheets_select_policy" ON public.daily_sheets;
CREATE POLICY "daily_sheets_select_policy"
ON public.daily_sheets
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND sheet_date = public.get_current_ist_date()
    )
);

DROP POLICY IF EXISTS "daily_sheets_insert_policy" ON public.daily_sheets;
CREATE POLICY "daily_sheets_insert_policy"
ON public.daily_sheets
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND sheet_date = public.get_current_ist_date()
    )
);

DROP POLICY IF EXISTS "daily_sheets_update_policy" ON public.daily_sheets;
CREATE POLICY "daily_sheets_update_policy"
ON public.daily_sheets
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "daily_sheets_delete_policy" ON public.daily_sheets;
CREATE POLICY "daily_sheets_delete_policy"
ON public.daily_sheets
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. RLS Policies: `entries`
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "entries_select_policy" ON public.entries;
CREATE POLICY "entries_select_policy"
ON public.entries
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM public.daily_sheets s
            WHERE s.id = entries.sheet_id
              AND s.collector_id = auth.uid()
              AND s.sheet_date = public.get_current_ist_date()
        )
    )
);

DROP POLICY IF EXISTS "entries_insert_policy" ON public.entries;
CREATE POLICY "entries_insert_policy"
ON public.entries
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND is_deleted = FALSE
        AND EXISTS (
            SELECT 1 FROM public.daily_sheets s
            WHERE s.id = sheet_id
              AND s.collector_id = auth.uid()
              AND s.sheet_date = public.get_current_ist_date()
        )
    )
);

DROP POLICY IF EXISTS "entries_update_policy" ON public.entries;
CREATE POLICY "entries_update_policy"
ON public.entries
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "entries_delete_policy" ON public.entries;
CREATE POLICY "entries_delete_policy"
ON public.entries
FOR DELETE
TO authenticated
USING (FALSE);

-- -----------------------------------------------------------------------------
-- 5. RLS Policies: `entry_audit_logs`
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.entry_audit_logs;
CREATE POLICY "audit_logs_select_policy"
ON public.entry_audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.entry_audit_logs;
CREATE POLICY "audit_logs_insert_policy"
ON public.entry_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (FALSE);

DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.entry_audit_logs;
CREATE POLICY "audit_logs_update_policy"
ON public.entry_audit_logs
FOR UPDATE
TO authenticated
USING (FALSE);

DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.entry_audit_logs;
CREATE POLICY "audit_logs_delete_policy"
ON public.entry_audit_logs
FOR DELETE
TO authenticated
USING (FALSE);
