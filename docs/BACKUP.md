# Automated Backup, Cloud Sync & Disaster Recovery Runbook: Daily Collection Tracker

## 1. Architectural Decisions & Redundancy Strategy

A business tracking daily cash collections cannot tolerate data loss. To maintain **zero monthly financial cost** while providing enterprise-grade disaster recovery, the system uses a **triple-redundancy backup architecture**:

```mermaid
flowchart TD
    SupabaseProd[(Supabase PROD Database)]

    subgraph GitHubAutomation["GitHub Actions (Automated Daily 01:00 AM IST)"]
        CronTrigger[Schedule: 19:30 UTC / 01:00 IST]
        DataExtractor[pg_dump & Supabase REST Exporter]
        Compressor[Gzip & Timestamped Archive]
    end

    subgraph StorageLocations["Free Redundant Storage Targets"]
        GHArtifacts[GitHub Workflow Artifacts<br/>(Retained 90 Days)]
        PrivateRepo[Private GitHub Backup Repository<br/>(Encrypted Git LFS / Releases)]
        GDrive[Google Drive 15GB Free<br/>(Synced via Rclone)]
    end

    subgraph InAppExport["In-App On-Demand Backup (Admin)"]
        AdminDevice[Admin Mobile Phone or Laptop]
        BrowserEngine[Client-side Excel/CSV Generator]
    end

    SupabaseProd -->|Scheduled Read via Service Role| GitHubAutomation
    CronTrigger --> DataExtractor
    DataExtractor --> Compressor
    Compressor --> GHArtifacts
    Compressor --> PrivateRepo
    Compressor --> GDrive

    SupabaseProd -->|REST API Query| InAppExport
    InAppExport -->|Direct Download| AdminDevice
```

### Triple Redundancy Model:
1. **Automated Remote Daily Backup (Target: Prod Only)**:
   * Triggers automatically via GitHub Actions at 01:00 AM IST every day.
   * Exports both clean relational SQL dumps (`pg_dump`) and human-readable CSV/JSON data files for every table.
   * Stores files in GitHub Artifacts and automatically syncs to a free Google Drive folder via Rclone.
2. **On-Demand In-App Export (Mobile & Desktop)**:
   * Accessible exclusively to the Admin inside the application.
   * Generates `.xlsx` (Excel) and `.csv` files locally on the device with one tap.
   * Enables the Admin to save a copy directly to their phone's Files / Downloads app anytime.
3. **Zero Cost Verification**:
   * GitHub Actions: Free for public repositories, 2,000 free minutes/month for private repositories (a 2-minute daily backup uses only ~60 minutes/month).
   * Google Drive: 15 GB free personal tier (a year of zipped text dumps takes less than 200 MB).

---

## 2. GitHub Actions Scheduled Backup Workflow

Create the following file in `.github/workflows/daily-backup.yml`. This workflow runs strictly against the **Production** environment.

```yaml
name: Production Daily Database Backup

on:
  schedule:
    # Runs at 19:30 UTC daily = 01:00 AM Indian Standard Time (IST)
    - cron: '30 19 * * *'
  workflow_dispatch: # Allows manual trigger from GitHub UI

jobs:
  backup:
    name: Backup Supabase Production Database
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set Backup Timestamp
        id: vars
        run: |
          echo "TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')" >> $GITHUB_OUTPUT
          echo "DATE_STAMP=$(date +'%Y-%m-%d')" >> $GITHUB_OUTPUT

      - name: Install PostgreSQL Client & Tools
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client rclone

      - name: Create Backup Directory
        run: mkdir -p ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}

      - name: Dump PostgreSQL Database via pg_dump
        env:
          PGPASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
        run: |
          pg_dump -h ${{ secrets.PROD_DB_HOST }} \
                  -U ${{ secrets.PROD_DB_USER }} \
                  -d ${{ secrets.PROD_DB_NAME }} \
                  -p 5432 \
                  --clean \
                  --if-exists \
                  --no-owner \
                  --no-privileges \
                  -F p > ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}/full_database_dump.sql

      - name: Export Application Tables as CSV via Supabase REST API
        env:
          SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          SERVICE_KEY: ${{ secrets.PROD_SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          # Fetch Profiles
          curl -s "${SUPABASE_URL}/rest/v1/profiles?select=*" \
            -H "apikey: ${SERVICE_KEY}" \
            -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Accept: text/csv" > ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}/profiles.csv

          # Fetch Daily Sheets
          curl -s "${SUPABASE_URL}/rest/v1/daily_sheets?select=*" \
            -H "apikey: ${SERVICE_KEY}" \
            -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Accept: text/csv" > ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}/daily_sheets.csv

          # Fetch Entries (including soft-deleted)
          curl -s "${SUPABASE_URL}/rest/v1/entries?select=*" \
            -H "apikey: ${SERVICE_KEY}" \
            -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Accept: text/csv" > ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}/entries.csv

          # Fetch Audit Logs
          curl -s "${SUPABASE_URL}/rest/v1/entry_audit_logs?select=*" \
            -H "apikey: ${SERVICE_KEY}" \
            -H "Authorization: Bearer ${SERVICE_KEY}" \
            -H "Accept: text/csv" > ./backups/prod_${{ steps.vars.outputs.TIMESTAMP }}/entry_audit_logs.csv

      - name: Compress Backup Archive
        run: |
          cd ./backups
          tar -czf backup_daily_collection_prod_${{ steps.vars.outputs.TIMESTAMP }}.tar.gz prod_${{ steps.vars.outputs.TIMESTAMP }}

      - name: Upload Backup to GitHub Actions Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-prod-${{ steps.vars.outputs.DATE_STAMP }}
          path: ./backups/backup_daily_collection_prod_${{ steps.vars.outputs.TIMESTAMP }}.tar.gz
          retention-days: 90

      - name: Sync Backup to Google Drive (Optional Cloud Copy)
        if: env.RCLONE_CONFIG_GDRIVE != ''
        env:
          RCLONE_CONFIG_GDRIVE: ${{ secrets.RCLONE_CONFIG_GDRIVE }}
        run: |
          mkdir -p ~/.config/rclone
          echo "${RCLONE_CONFIG_GDRIVE}" > ~/.config/rclone/rclone.conf
          rclone copy ./backups/backup_daily_collection_prod_${{ steps.vars.outputs.TIMESTAMP }}.tar.gz gdrive:CollectionBackups/
```

### GitHub Repository Secrets Required:
* `PROD_DB_HOST`: Direct database host from Supabase Project Settings (Database -> Connection Pooling / Direct Connection).
* `PROD_DB_NAME`: `postgres`.
* `PROD_DB_USER`: `postgres`.
* `PROD_DB_PASSWORD`: Database master password for `collection-prod`.
* `PROD_SUPABASE_URL`: `https://<prod-project-ref>.supabase.co`.
* `PROD_SUPABASE_SERVICE_ROLE_KEY`: Service role secret (bypasses RLS to capture all tables and soft-deleted rows).
* `RCLONE_CONFIG_GDRIVE`: (Optional) Free Google Drive OAuth credentials token.

---

## 3. In-App Mobile Backup ("Download Backup" Button)

The Admin has an on-demand button inside the application header or settings modal: **[ 📥 Download Full Backup ]**.

### UI Wireframe
```text
+---------------------------------------------------------+
| Database & Collection Backup                        [X] |
+---------------------------------------------------------+
| Export all records directly to your device.             |
|                                                         |
| Range:                                                  |
| (•) All Time Data (Complete Backup)                     |
| ( ) Selected Month: [ October 2026 v ]                  |
| ( ) Date Range: [ 01-Oct-2026 ] to [ 18-Oct-2026 ]      |
|                                                         |
| Format:                                                 |
| [ Excel Workbook (.xlsx) ]   [ Plain CSV (.zip) ]       |
|                                                         |
| Includes:                                               |
|  ✓ Daily Sheets Summary                                 |
|  ✓ All Collections (Cash, PhonePe, Balance Owed)        |
|  ✓ Collector Attribution                                |
|  ✓ Audit Change History                                 |
|                                                         |
| +-----------------------------------------------------+ |
| |            DOWNLOAD BACKUP FILE NOW                 | |
| |              (Works on iPhone & Android)            | |
| +-----------------------------------------------------+ |
+---------------------------------------------------------+
```

### Client-Side Generator Implementation Concept
* Uses the lightweight `xlsx` (SheetJS) or native CSV blob generator.
* Direct download handled via `URL.createObjectURL(blob)` and `<a download="daily_collection_backup_18-Oct-2026.xlsx">`.
* 100% compatible with mobile Safari (iOS Files app) and Chrome for Android.

---

## 4. Disaster Recovery & Restoration Runbook

### Scenario A: Restoring Single Table Records from CSV
If an admin accidentally made batch modifications or needs to inspect historical data:
1. Download the latest artifact `db-backup-prod-YYYY-MM-DD` from GitHub Actions.
2. Unpack `entries.csv`.
3. Open Supabase Dashboard -> **Table Editor** -> `entries`.
4. Use **Import data via CSV** or run a targeted SQL `COPY` command.

### Scenario B: Complete Database Restoration from SQL Dump
If the entire Supabase instance was corrupted or dropped:

#### Step 1: Prepare Clean Target Database
If restoring to a new Supabase project:
1. Log into Supabase and create a new project (e.g. `collection-prod-recovery`).
2. Run migration scripts from `/supabase/migrations` to rebuild the schema, tables, and RLS policies.

#### Step 2: Restore the SQL Data Dump
Using the command line with `psql`:

```bash
# Decompress the backup
tar -xzf backup_daily_collection_prod_2026-10-18_19-30-00.tar.gz

# Connect to the target Supabase Postgres instance and restore
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
     -f ./prod_2026-10-18_19-30-00/full_database_dump.sql
```

#### Step 3: Re-link Storage Bucket (if necessary)
1. Verify that `bill-slips` bucket exists in Supabase Storage.
2. If image files need recovery, restore them from Google Drive or GitHub Artifacts into `bill-slips/`.

---

## 5. Post-Restore Verification Checklist

After restoring data, the engineer or admin must execute these 5 checks before resuming live operations:

- [ ] **Row Count Match**: Compare count of `entries`, `daily_sheets`, and `profiles` with the backup manifest.
- [ ] **IST Date Verification**: Run `SELECT get_current_ist_date();` to ensure timezone returns Indian Standard Time.
- [ ] **Total Reconciliation**: Check that `SELECT sum(cash_amount), sum(phonepe_amount), sum(total_collected) FROM entries WHERE sheet_id = ...` matches yesterday's closing numbers.
- [ ] **Collector Login Test**: Log in as `collector1@ithinkai.in` and verify that only Today's sheet is visible and writable.
- [ ] **Admin Dashboard Test**: Log in as Admin and verify that all past dates render correctly with collector subtotals.

---

## 6. Backup Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **GitHub Actions Secret Expiration** | Scheduled backups fail silently. | Add an email alert or healthchecks.io webhook at the end of the backup job to notify the engineer if a run fails. |
| **Database Exceeds Free Storage** | Free tier limits reached. | Daily collection data is lightweight (1,000 rows ≈ 300 KB). At 50 entries/day, 10 years of data is less than 50 MB. |
| **Collector Slip Photos Missing from SQL Dump** | Images are in Supabase Storage, not Postgres DB. | Images are stored with public or signed URLs. The backup job can optionally download newly added storage objects. |
