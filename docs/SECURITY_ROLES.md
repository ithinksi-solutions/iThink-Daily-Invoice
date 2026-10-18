# Security Architecture & Row Level Security (RLS): Daily Collection Tracker

## 1. Security Philosophy & Threat Model

1. **Zero Trust in the Client**:
   * The React PWA running on a collector's phone is considered an untrusted environment.
   * UI guards (such as hiding date pickers or disabling delete buttons) are treated as **conveniences**, not security.
   * **Every authorization invariant is enforced directly inside PostgreSQL Row Level Security (RLS) policies**.
2. **Strict Role Separation**:
   * **Admin (1 client)**: Sovereign visibility over all collectors, all dates, all amounts, and all audit logs. Sole authority to edit or soft-delete entries.
   * **Collector (3 field collectors)**: Ultra-restricted privilege sandbox. Can only interact with the **current IST date** and **their own entries**. Cannot view other collectors' collections. Cannot view past dates. Cannot edit or delete once submitted.
3. **Immutable Audit Trail**:
   * Audit logs are append-only. Even the Admin cannot delete rows from `entry_audit_logs`.
   * Hard SQL `DELETE` operations on `entries` are blocked at the engine level; all deletions are soft-deletes (`is_deleted = TRUE`).

---

## 2. Invariants & Enforcement Matrix

| Entity | Operation | Collector Privilege | Admin Privilege | Enforcement Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | `SELECT` | Own profile only (`id = auth.uid()`) | All profiles | RLS Policy |
| **`profiles`** | `UPDATE` | Own name/language only; **cannot alter role** | Any profile | RLS + Trigger Guard |
| **`daily_sheets`**| `SELECT` | Own sheet for **current IST date only** | All dates, all collectors | RLS Policy |
| **`daily_sheets`**| `INSERT` | Own sheet for **current IST date only** | Any sheet | RLS Policy |
| **`daily_sheets`**| `UPDATE/DELETE`| ❌ **FORBIDDEN** (Blocked) | Permitted | RLS Policy (`USING (false)`) |
| **`entries`** | `SELECT` | Own active entries for **current IST date only** | All entries (any date) | RLS Policy |
| **`entries`** | `INSERT` | Own entry under **today's sheet only** | Permitted | RLS Policy |
| **`entries`** | `UPDATE` | ❌ **FORBIDDEN** (Blocked) | Permitted (Audited) | RLS Policy (`USING (false)`) |
| **`entries`** | `DELETE` | ❌ **FORBIDDEN** (Blocked) | Soft-delete only | RLS Policy (`USING (false)`) |
| **`entry_audit_logs`**| `SELECT` | ❌ **FORBIDDEN** (Blocked) | Read-only | RLS Policy |
| **`entry_audit_logs`**| `INSERT` | System trigger only | System trigger only | `SECURITY DEFINER` Trigger |
| **Storage (`bill-slips`)**| `INSERT` | Upload to `bill-slips/{auth.uid()}/*` | Upload anywhere | Storage RLS Policy |
| **Storage (`bill-slips`)**| `SELECT` | Read own slip uploads | Read all slips | Storage RLS Policy |
| **Storage (`bill-slips`)**| `DELETE` | ❌ **FORBIDDEN** (Blocked) | Delete permitted | Storage RLS Policy |

---

## 3. PostgreSQL Security Functions & RLS Policies

The following SQL migration can be applied in `supabase/migrations/002_rls_security_policies.sql`.

```sql
-- =============================================================================
-- 002_rls_security_policies.sql: Complete RLS Policy Suite
-- =============================================================================

-- Enable Row Level Security on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Helper Security Functions (SECURITY DEFINER to avoid recursion)
-- -----------------------------------------------------------------------------

-- Get current authenticated user's role
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

-- Check if caller is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_auth_role() = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if caller is Collector
CREATE OR REPLACE FUNCTION public.is_collector()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (public.get_auth_role() = 'collector');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies: `profiles`
-- -----------------------------------------------------------------------------

-- SELECT: Users can read their own profile; Admins can read all profiles
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR public.is_admin()
);

-- UPDATE: Users can update their own language preference or name, but NOT role
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    id = auth.uid() OR public.is_admin()
)
WITH CHECK (
    -- Prevent non-admins from promoting themselves to admin
    (public.is_admin()) OR (id = auth.uid() AND role = 'collector')
);

-- -----------------------------------------------------------------------------
-- 3. RLS Policies: `daily_sheets`
-- -----------------------------------------------------------------------------

-- SELECT:
-- 1. Admin can view all daily sheets across all dates.
-- 2. Collector can ONLY view their own sheet for CURRENT IST DATE.
CREATE POLICY "daily_sheets_select_policy"
ON public.daily_sheets
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND sheet_date = get_current_ist_date()
    )
);

-- INSERT:
-- 1. Admin can create sheets for any date/collector.
-- 2. Collector can ONLY create a sheet for themselves for CURRENT IST DATE.
CREATE POLICY "daily_sheets_insert_policy"
ON public.daily_sheets
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        collector_id = auth.uid()
        AND sheet_date = get_current_ist_date()
    )
);

-- UPDATE: Only Admin can update sheets; Collectors are FORBIDDEN
CREATE POLICY "daily_sheets_update_policy"
ON public.daily_sheets
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE: Only Admin can delete sheets; Collectors are FORBIDDEN
CREATE POLICY "daily_sheets_delete_policy"
ON public.daily_sheets
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. RLS Policies: `entries`
-- -----------------------------------------------------------------------------

-- SELECT:
-- 1. Admin can view all entries (any collector, any date, including soft-deleted).
-- 2. Collector can ONLY view non-deleted entries created by themselves on CURRENT IST DATE.
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
              AND s.sheet_date = get_current_ist_date()
        )
    )
);

-- INSERT:
-- 1. Admin can insert entries.
-- 2. Collector can ONLY insert entries into their own sheet on CURRENT IST DATE.
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
              AND s.sheet_date = get_current_ist_date()
        )
    )
);

-- UPDATE:
-- Only Admin can update entries (e.g. modify amount or set is_deleted = TRUE).
-- Collectors are HARD BLOCKED from editing once saved.
CREATE POLICY "entries_update_policy"
ON public.entries
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE:
-- Hard SQL DELETE is disabled for everyone. All deletions must be soft-deletes via UPDATE.
CREATE POLICY "entries_delete_policy"
ON public.entries
FOR DELETE
TO authenticated
USING (FALSE);

-- -----------------------------------------------------------------------------
-- 5. RLS Policies: `entry_audit_logs`
-- -----------------------------------------------------------------------------

-- SELECT: Only Admin can view audit logs
CREATE POLICY "audit_logs_select_policy"
ON public.entry_audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- INSERT: Block direct client inserts; only system triggers (SECURITY DEFINER) insert logs
CREATE POLICY "audit_logs_insert_policy"
ON public.entry_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (FALSE);

-- UPDATE & DELETE: Audit logs are completely immutable
CREATE POLICY "audit_logs_update_policy"
ON public.entry_audit_logs
FOR UPDATE
TO authenticated
USING (FALSE);

CREATE POLICY "audit_logs_delete_policy"
ON public.entry_audit_logs
FOR DELETE
TO authenticated
USING (FALSE);

-- -----------------------------------------------------------------------------
-- 6. Storage Bucket RLS Policies (`bill-slips`)
-- -----------------------------------------------------------------------------

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- UPLOAD: Collector can upload to their own folder: bill-slips/{auth.uid()}/*
CREATE POLICY "storage_upload_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'bill-slips'
    AND (
        public.is_admin()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- READ: Collectors can read their own uploads; Admin can read all
CREATE POLICY "storage_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'bill-slips'
    AND (
        public.is_admin()
        OR (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- DELETE: Only Admin can delete files from storage
CREATE POLICY "storage_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'bill-slips'
    AND public.is_admin()
);
```

---

## 4. Verification & Penetration Test Scenarios

The following test scenarios must be executed against the Dev database before releasing to Production:

| Test Case | Actor | Action Attempted | Expected Outcome | RLS Rule Verified |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Collector | Attempt to query `entries` from yesterday (`sheet_date = yesterday`). | Empty array returned `[]`. | `entries_select_policy` |
| **TC-02** | Collector | Attempt to update `cash_amount` on an entry saved 5 minutes ago. | Error: `42501 (insufficient privilege)`. | `entries_update_policy` |
| **TC-03** | Collector | Attempt SQL `DELETE` on an entry. | Error: `42501 (insufficient privilege)`. | `entries_delete_policy` |
| **TC-04** | Collector | Attempt to view `daily_sheets` of another collector. | Empty array returned `[]`. | `daily_sheets_select_policy` |
| **TC-05** | Collector | Attempt to modify `profiles.role` to `'admin'`. | Update rejected or role unchanged. | `profiles_update_policy` |
| **TC-06** | Collector | Attempt to insert an entry with `sheet_id` pointing to tomorrow's sheet. | Error: violation of `entries_insert_policy`. | `entries_insert_policy` |
| **TC-07** | Admin | Update `cash_amount` on an entry from 3 weeks ago. | Update succeeds; row inserted into `entry_audit_logs`. | Admin bypass + Audit trigger |
| **TC-08** | Admin | Attempt to hard delete row from `entry_audit_logs`. | Blocked by `audit_logs_delete_policy`. | Audit immutability |

---

## 5. Security Risks & Mitigations

| Risk | Attack Vector | Mitigation |
| :--- | :--- | :--- |
| **Device Clock Manipulation** | Collector sets phone date back by 2 days to log or see past entries. | Ignored: RLS evaluates `get_current_ist_date()` directly on the PostgreSQL server using `Asia/Kolkata`. |
| **JWT Token Theft** | Stolen collector JWT used from another device. | Short JWT expiry (1 hour) with automatic token refresh. Admin can revoke user session instantly from Supabase Auth dashboard. |
| **Anonymous API Access** | Malicious bot calls Supabase REST endpoints without auth. | All tables have RLS enabled with `TO authenticated`; anonymous (`anon`) role has 0 access to application tables. |
| **Privilege Escalation via Metadata** | User injects `role: 'admin'` into signup payload. | `profiles_update_policy` explicitly blocks role modification. New users default strictly to `'collector'`. |
