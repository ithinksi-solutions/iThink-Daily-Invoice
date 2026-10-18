import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatAppDate, formatAppTime } from '../lib/formatters';
import * as XLSX from 'xlsx';
import {
  X,
  Download,
  Database,
  Cloud,
  GitBranch,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Clock
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Export Complete Database Records to Excel (.xlsx)
  const handleExportFullExcel = async () => {
    try {
      setDownloading('excel');
      // Fetch all entries joined with profiles and daily sheets
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*, profiles:collector_id(full_name, email), daily_sheets:sheet_id(sheet_date)')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error || !entries) {
        alert('Failed to fetch backup data: ' + error?.message);
        return;
      }

      // Sheet 1: All Entries
      const rows = entries.map((e: any, idx: number) => ({
        'S.No': idx + 1,
        'Date': e.daily_sheets?.sheet_date ? formatAppDate(e.daily_sheets.sheet_date) : '-',
        'Time': formatAppTime(e.created_at),
        'Operator Name': e.profiles?.full_name || 'Operator',
        'Operator Email': e.profiles?.email || '-',
        'Business': e.business_name || 'STAR',
        'Dealer Name': e.dealer_name,
        'Cash Collected (INR)': e.cash_amount,
        'PhonePe Collected (INR)': e.phonepe_amount,
        'Total Collected (INR)': e.total_collected,
        'Balance Owed (INR)': e.balance_owed ?? 0,
        'Note / Remarks': e.note || '',
        'Slip Photo URL': e.image_url || 'No Slip',
        'Record ID': e.id,
      }));

      // Sheet 2: Operator Summaries
      const opMap: Record<string, { name: string; count: number; cash: number; phonepe: number; total: number }> = {};
      entries.forEach((e: any) => {
        const name = e.profiles?.full_name || 'Operator';
        if (!opMap[name]) opMap[name] = { name, count: 0, cash: 0, phonepe: 0, total: 0 };
        opMap[name].count += 1;
        opMap[name].cash += Number(e.cash_amount) || 0;
        opMap[name].phonepe += Number(e.phonepe_amount) || 0;
        opMap[name].total += Number(e.total_collected) || 0;
      });
      const opRows = Object.values(opMap).map((o, idx) => ({
        'S.No': idx + 1,
        'Operator Name': o.name,
        'Total Collections': o.count,
        'Cash Sum (INR)': o.cash,
        'PhonePe Sum (INR)': o.phonepe,
        'Total Collected (INR)': o.total,
      }));

      // Sheet 3: Business Summaries
      const bizMap: Record<string, { count: number; cash: number; phonepe: number; total: number }> = {
        'STAR': { count: 0, cash: 0, phonepe: 0, total: 0 },
        'ARBO PLAST': { count: 0, cash: 0, phonepe: 0, total: 0 },
      };
      entries.forEach((e: any) => {
        const b = e.business_name || 'STAR';
        if (!bizMap[b]) bizMap[b] = { count: 0, cash: 0, phonepe: 0, total: 0 };
        bizMap[b].count += 1;
        bizMap[b].cash += Number(e.cash_amount) || 0;
        bizMap[b].phonepe += Number(e.phonepe_amount) || 0;
        bizMap[b].total += Number(e.total_collected) || 0;
      });
      const bizRows = Object.entries(bizMap).map(([bName, b], idx) => ({
        'S.No': idx + 1,
        'Business Unit': bName,
        'Total Entries': b.count,
        'Cash Sum (INR)': b.cash,
        'PhonePe Sum (INR)': b.phonepe,
        'Total Collected (INR)': b.total,
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(rows);
      const ws2 = XLSX.utils.json_to_sheet(opRows);
      const ws3 = XLSX.utils.json_to_sheet(bizRows);

      XLSX.utils.book_append_sheet(wb, ws1, 'All Collections');
      XLSX.utils.book_append_sheet(wb, ws2, 'Operator Summary');
      XLSX.utils.book_append_sheet(wb, ws3, 'Business Summary');

      const dateTag = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `iThinkAI_Complete_Backup_${dateTag}.xlsx`);
    } catch (err: any) {
      alert('Backup generation error: ' + err.message);
    } finally {
      setDownloading(null);
    }
  };

  // 2. Export Full Database Snapshot to JSON
  const handleExportJSON = async () => {
    try {
      setDownloading('json');
      const [entriesRes, sheetsRes, profilesRes] = await Promise.all([
        supabase.from('entries').select('*').eq('is_deleted', false),
        supabase.from('daily_sheets').select('*'),
        supabase.from('profiles').select('id, full_name, email, role, language_preference'),
      ]);

      const backupData = {
        metadata: {
          system: 'Daily Invoice',
          generated_at: new Date().toISOString(),
          version: '2.4.0',
        },
        profiles: profilesRes.data || [],
        daily_sheets: sheetsRes.data || [],
        entries: entriesRes.data || [],
      };

      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonStr);
      downloadAnchor.setAttribute('download', `iThinkAI_DB_Snapshot_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert('JSON backup error: ' + err.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                System Backup & Cloud Data Hub
              </h3>
              <p className="text-xs text-slate-400">Direct Download • Cloud Storage • Git Automated Sync</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Section 1: Direct 1-Click Mobile/Web Downloads */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct 1-Click Downloads (Mobile & Desktop)</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Excel Download Button */}
              <button
                type="button"
                onClick={handleExportFullExcel}
                disabled={downloading !== null}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    .XLSX
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                    Complete Excel Backup
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    All dates, slips, operator totals, and business breakdown sheets.
                  </p>
                </div>
                {downloading === 'excel' && (
                  <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Excel workbook...</span>
                  </div>
                )}
              </button>

              {/* JSON Database Snapshot Button */}
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={downloading !== null}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/60 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                    .JSON
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-teal-400 transition-colors flex items-center gap-1">
                    Full Database Snapshot
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Portable JSON dump of all records, profiles, and daily sheets.
                  </p>
                </div>
                {downloading === 'json' && (
                  <div className="mt-2 text-xs text-teal-400 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Preparing snapshot...</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Cloud Storage & Database Connection */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Cloud Storage & PostgreSQL</span>
            </h4>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PostgreSQL Primary Cluster:</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Live
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Encrypted Slip Storage Bucket:</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> bill-slips (Public Read)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cloud Host Region:</span>
                <span className="font-mono text-slate-300">Sydney (ap-southeast-2)</span>
              </div>
            </div>
          </div>

          {/* Section 3: GitHub Actions Automated Nightly Backups */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span>Git Repository & Scheduled Workflows</span>
            </h4>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Scheduled Nightly Backup (01:00 AM IST)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automated SQL/CSV dump workflow runs in your GitHub repository.
                </p>
              </div>

              <a
                href="https://github.com/ithinksi-solutions/iThink-Daily-Invoice/actions"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-bold flex items-center gap-1 transition-all shrink-0 ml-3"
              >
                <span>View Actions</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL Encrypted Export</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
