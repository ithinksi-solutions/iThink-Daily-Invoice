# Implementation Roadmap & Task Breakdown: Daily Collection Tracker

## 1. Overview & Execution Strategy

This document outlines the granular engineering tasks required to build, test, and deploy the Daily Collection Tracker.
* **Phase 1 (MVP)** delivers the complete zero-cost, dual-role system: collector today view + add entry with autocomplete, admin daily view with date navigation, grouped subtotals, audit-logged edits/deletes, dashboard analytics, in-app export, automated nightly backups, and keep-alive ping.
* **Phase 2** introduces the Gemini Vision slip scanner, pre-fill extraction, and admin approval workflow.

---

## 2. Phase 1 (MVP) Granular Tasks

### Milestone 1: Project Scaffolding & Dual Supabase Environments
- [ ] **TASK-101: Initialize React + Vite + TypeScript PWA**
  - Scaffold project using Vite with React and TypeScript templates.
  - Install dependencies: `@supabase/supabase-js`, `lucide-react`, `date-fns`, `i18next`, `react-i18next`, `xlsx`, `canvas-confetti`.
  - Configure `vite-plugin-pwa` with web manifest (app name, icons, standalone display mode, theme color).
  - *Acceptance Criteria*: Project boots on `npm run dev`, builds with `npm run build` with 0 warnings, and manifest is detectable in browser dev tools.
- [ ] **TASK-102: Configure Tailwind CSS & Indian Design Tokens**
  - Configure `tailwind.config.js` with primary emerald/green theme, high-contrast dark neutrals, and minimum touch target utilities (`min-h-[48px]`, `min-h-[56px]`).
  - Create typography and currency formatting utility functions (`formatINR(amount)`, `formatAppDate(date)`).
  - *Acceptance Criteria*: `formatINR(125000)` renders `₹ 1,25,000.00`; `formatAppDate(new Date())` renders `18-Oct-2026`.
- [ ] **TASK-103: Dual Supabase Setup (`collection-dev` & `collection-prod`)**
  - Create two separate free projects under one Supabase account.
  - Create `.env.example`, `.env.development`, and configure GitHub Secrets.
  - *Acceptance Criteria*: Dev and Prod projects have distinct project reference IDs and API keys.

---

### Milestone 2: Database Schema, RLS & Seed Data
- [ ] **TASK-201: Author Core Database Migration (`001_initial_schema.sql`)**
  - Create `profiles`, `daily_sheets`, `entries`, and `entry_audit_logs` tables with constraints and generated columns (`total_collected`).
  - Add triggers for `updated_at`, `sync_entry_collector_id`, and `audit_entry_mutation`.
  - Add `get_current_ist_date()` and `get_or_create_daily_sheet()` RPC functions.
  - Enable `pg_trgm` extension and create GIN trigram index on `entries.dealer_name`.
  - *Acceptance Criteria*: Migration runs cleanly in Supabase SQL editor; inserting cash=100 and phonepe=200 stores total_collected=300 automatically.
- [ ] **TASK-202: Author Row Level Security Suite (`002_rls_security_policies.sql`)**
  - Enable RLS on all four tables.
  - Apply collector restrictions: read/write strictly on `sheet_date = get_current_ist_date()` and `collector_id = auth.uid()`.
  - Block hard SQL deletes (`entries_delete_policy USING (false)`).
  - Apply admin universal access policies.
  - *Acceptance Criteria*: TC-01 through TC-08 from `docs/SECURITY_ROLES.md` pass without error.
- [ ] **TASK-203: Configure Storage Bucket & Policies (`003_storage_buckets.sql`)**
  - Create private bucket `bill-slips` (5MB limit, JPEG/PNG/WebP).
  - Add RLS: collectors can upload/view in `bill-slips/{auth.uid()}/*`; admin can view and delete all.
  - *Acceptance Criteria*: Non-admin collector cannot view images in other collectors' folders.
- [ ] **TASK-204: Seed Test Users & Sample Records in `collection-dev`**
  - Create 1 admin and 3 collector Auth users with profiles.
  - Insert sample entries for today and yesterday in `collection-dev`.
  - *Acceptance Criteria*: Dev preview renders with realistic demo data immediately after login.

---

### Milestone 3: Authentication, Session & Role-Based Routing
- [ ] **TASK-301: Supabase Auth Context & Session Provider**
  - Implement React context managing user session, profile, and active role.
  - Support automatic token refresh and safe sign-out.
  - *Acceptance Criteria*: Session persists across page reloads in local storage.
- [ ] **TASK-302: Role-Based Route Guards**
  - Create `<ProtectedRoute role="admin" />` and `<ProtectedRoute role="collector" />`.
  - Redirect collectors attempting to open `/admin/*` back to `/today`.
  - Redirect authenticated admins logging in to `/admin/daily`.
  - *Acceptance Criteria*: Collector manually typing `/admin/daily` in the address bar is blocked and redirected to `/today`.
- [ ] **TASK-303: Login Screen with Error Handling**
  - Build responsive login form with email and password inputs, submit button, and invalid credentials banner.
  - *Acceptance Criteria*: Form validates inputs, displays bilingual error on wrong password, and auto-navigates based on user role.

---

### Milestone 4: Internationalization (i18n) & Layout
- [ ] **TASK-401: Setup i18next & Translation Dictionaries**
  - Create `src/locales/en.json` and `src/locales/te.json` containing all UI labels, button text, and alerts.
  - Implement header language toggle button: `[ EN | తెలుగు ]`.
  - Sync language switch with `profiles.language_preference` and `localStorage`.
  - *Acceptance Criteria*: Toggling to Telugu instantly updates all headers, cards, and buttons without page refresh.
- [ ] **TASK-402: App Shell, Mobile Header & Network Status Banner**
  - Build top navigation bar showing app title, current user name, language toggle, and logout button.
  - Add offline detection banner using `navigator.onLine` and `window.addEventListener('offline')`.
  - *Acceptance Criteria*: Disconnecting Wi-Fi/cellular shows "Offline" badge; reconnecting clears it.

---

### Milestone 5: Collector Experience
- [ ] **TASK-501: Collector Today Screen (`/today`)**
  - Fetch today's sheet using `get_or_create_daily_sheet()`.
  - Display non-interactive date banner: `📅 Today: dd-mon-yyyy (IST)`.
  - Display sticky summary cards: Total Cash, Total PhonePe, Grand Total.
  - Render list of today's collections with dealer name, time, amount split, and balance owed badge.
  - Render fixed bottom "+ Add New Entry" button (56px height).
  - *Acceptance Criteria*: Collector sees only their own entries for today; totals accurately match the sum of items.
- [ ] **TASK-502: Dealer Name Autocomplete Component**
  - Implement searchable input calling `get_dealer_suggestions()` RPC with debounced input (200ms).
  - Allow picking from dropdown or typing a new dealer name freely.
  - *Acceptance Criteria*: Typing "Sri" displays past dealer names starting with or containing "Sri"; user can also enter an entirely new name.
- [ ] **TASK-503: Split Payment Form & Dynamic Total Display**
  - Build numeric inputs for Cash and PhonePe.
  - Auto-calculate and display dynamic `Total Collected: ₹ X` as user types.
  - Default blank PhonePe to 0. Enforce at least one amount > 0.
  - Add optional Balance Owed input and optional Note input.
  - *Acceptance Criteria*: Typing 500 cash and leaving PhonePe empty displays "Total Collected: ₹ 500.00".
- [ ] **TASK-504: Bill Slip Photo Attachment & Client Compression**
  - Implement camera / gallery file picker with `<input type="file" accept="image/*" capture="environment">`.
  - Compress image client-side via HTML5 Canvas (max 1280px dimension, 80% JPEG quality) before upload to Supabase Storage.
  - *Acceptance Criteria*: A 4MB phone camera photo compresses to <450KB and uploads in under 2 seconds on 4G.
- [ ] **TASK-505: Entry Submission & Tactile "Saved" Confirmation**
  - Insert entry into `entries` table.
  - Trigger green success overlay with checkmark, haptic vibration (`navigator.vibrate([100, 50, 100])`), and redirect to `/today`.
  - *Acceptance Criteria*: Collector receives immediate, unmistakable visual and physical confirmation that data is saved.

---

### Milestone 6: Admin Daily View
- [ ] **TASK-601: Date Navigator & Calendar Picker**
  - Build date control bar with `[ < Prev Day ]`, `[ Next Day > ]`, `[ Today ]`, and a native calendar picker formatted as `dd-mon-yyyy`.
  - *Acceptance Criteria*: Clicking Prev Day decrements the date and refreshes the data table for that specific day.
- [ ] **TASK-602: Grouped Daily Table with Subtotals**
  - Query all entries for selected date across all collectors.
  - Group rows by collector name with collector-level subtotals (Cash, PhonePe, Total).
  - Render sticky bottom bar with Grand Totals across all collectors.
  - *Acceptance Criteria*: Grand total equals exact sum of collector subtotals.
- [ ] **TASK-603: Multi-Attribute Filters & Search**
  - Implement filters: Collector dropdown, Dealer Name search input, Payment Mode filter (All / Cash only / PhonePe only / Split).
  - *Acceptance Criteria*: Filtering by "PhonePe only" hides pure cash entries and recalculates visible totals dynamically.
- [ ] **TASK-604: Slip Image Modal Preview**
  - Clicking the camera icon on any entry row opens a full-screen image preview with pinch-to-zoom support.
  - *Acceptance Criteria*: Image loads from Supabase signed URL; modal closes on tap outside or Esc key.
- [ ] **TASK-605: Admin Edit Entry Modal with Audit Reason**
  - Build modal allowing Admin to modify dealer name, cash amount, PhonePe amount, balance owed, and note.
  - Enforce mandatory "Reason for Edit" text field.
  - Update `entries` row; verify trigger writes old and new snapshots to `entry_audit_logs`.
  - *Acceptance Criteria*: Edited entry reflects updated amounts in the table; audit log records the user and reason.
- [ ] **TASK-606: Admin Soft-Delete Modal with Confirmation**
  - Build delete modal requiring a reason note before confirming.
  - Sets `is_deleted = TRUE` and `deleted_at = NOW()`.
  - *Acceptance Criteria*: Deleted entry vanishes from Daily View and collector tallies; audit log records action='DELETE'.

---

### Milestone 7: Admin Dashboard & Analytics
- [ ] **TASK-701: Metric Cards & Day-to-Day Variance**
  - Compute collection metrics: Today, Yesterday, This Week, This Month, Last Month.
  - Calculate percentage variance: `((Today - Yesterday) / Yesterday) * 100`.
  - *Acceptance Criteria*: Variance badge shows green `+X%` or red `-X%` correctly.
- [ ] **TASK-702: Interactive Visual Breakdown Charts**
  - Render Payment Mode Mix (Cash vs PhonePe donut/bar chart).
  - Render Collector Leaderboard (horizontal bar chart).
  - Render 7-day collection trend.
  - *Acceptance Criteria*: Charts render cleanly on mobile screens and desktop screens alike.
- [ ] **TASK-703: Chart & Card Date Drill-Down**
  - Wire click handlers on summary cards and trend bars to navigate to `/admin/daily?date=YYYY-MM-DD`.
  - *Acceptance Criteria*: Tapping "Yesterday" card opens Daily View set to yesterday's date.

---

### Milestone 8: Export, Backups & User Management
- [ ] **TASK-801: In-App Mobile Excel / CSV Export**
  - Implement export dialog allowing single-day or date-range selection.
  - Generate formatted `.xlsx` workbook using `xlsx` library with columns: Date, Time, Collector, Dealer Name, Cash, PhonePe, Total, Balance Owed, Note.
  - *Acceptance Criteria*: File downloads cleanly on both iOS Safari and Android Chrome without crashing memory.
- [ ] **TASK-802: Admin User Management Screen (`/admin/users`)**
  - Display list of the 3 collectors with status and last active timestamp.
  - Provide "Reset Password" action that calls Supabase Auth Admin API.
  - *Acceptance Criteria*: Admin can set a temporary password for a collector who forgot their login.
- [ ] **TASK-803: Automated Daily Backup GitHub Action (`daily-backup.yml`)**
  - Create workflow executing daily at 19:30 UTC (01:00 AM IST).
  - Runs `pg_dump` and exports CSVs of all tables to GitHub Artifacts (90-day retention).
  - *Acceptance Criteria*: Workflow runs successfully on `workflow_dispatch` manual trigger and generates downloadable archive.
- [ ] **TASK-804: Weekly Keep-Alive Ping Action (`keep-alive.yml`)**
  - Create workflow running every 5 days to send HTTP GET ping to `collection-dev` and `collection-prod`.
  - *Acceptance Criteria*: Workflow succeeds with HTTP 200/OK, preventing project pausing.

---

## 3. Phase 2 (AI Slip Scanner) Tasks

- [ ] **TASK-P2-01: Google AI Studio Gemini API Integration**
  - Obtain free Gemini API key (no credit card required).
  - Configure Supabase Edge Function or Python microservice on Hugging Face Spaces.
  - *Acceptance Criteria*: Sending test slip image returns structured JSON with extracted dealer, cash, and PhonePe amounts.
- [ ] **TASK-P2-02: Slip Scanner Camera Viewfinder Component**
  - Build viewfinder UI on collector device with document alignment boundary guidelines.
  - *Acceptance Criteria*: Captures slip, compresses to <400KB, and displays loading spinner with progress indicator.
- [ ] **TASK-P2-03: Pre-filled Review & Submit Workflow**
  - Map AI response JSON into the Add Entry form fields.
  - Highlight extracted values in soft blue so collector knows what was auto-read.
  - Save entry with `status = 'submitted'`.
  - *Acceptance Criteria*: Collector can tap any pre-filled field to alter values before saving.
- [ ] **TASK-P2-04: Admin Slip Approval Tab & Quick Verification**
  - Add "Pending Approvals" badge in Admin navigation.
  - Display side-by-side view: Slip photo on left, submitted numbers on right.
  - One-tap "Approve" button updates `status = 'approved'`.
  - *Acceptance Criteria*: Approved entries seamlessly fold into standard Daily View totals.

---

## 4. Definition of Done (DoD) for Phase 1 Release

A feature is considered complete only when:
1. TypeScript compiles with 0 errors (`tsc --noEmit`).
2. Vite builds cleanly (`npm run build`).
3. Tested on both mobile viewport (390px iPhone / 360px Android) and desktop (1280px+).
4. All text is verified in both English and Telugu translations.
5. RLS policies verified to prevent collector privilege escalation.
6. SQL migration committed to `/supabase/migrations/`.
