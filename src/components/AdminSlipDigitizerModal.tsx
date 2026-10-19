import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, BusinessName } from '../types/database';
import { useLanguage } from '../lib/i18n';
import {
  parseSlipImage,
  ParsedSlipEntry,
  CLIENT_HANDWRITTEN_SAMPLE_ENTRIES,
} from '../lib/slipParser';
import { formatINR, getCurrentISTDateString } from '../lib/formatters';
import {
  X,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Check,
  FileText,
  UserCheck,
  Building2,
  HelpCircle,
  Eye,
  Sliders,
} from 'lucide-react';

interface AdminSlipDigitizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number, total: number, date: string) => void;
  operators: Profile[];
  initialDate: string;
}

export const AdminSlipDigitizerModal: React.FC<AdminSlipDigitizerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  operators,
  initialDate,
}) => {
  const { t } = useLanguage();
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(initialDate || getCurrentISTDateString());
  const [imageUrl, setImageUrl] = useState<string>('/samples/sample_slip.jpg');
  const [isSampleLoaded, setIsSampleLoaded] = useState<boolean>(true);
  
  // Image viewer state
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [highContrast, setHighContrast] = useState<boolean>(false);

  // Parsing & HITL Review state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [entries, setEntries] = useState<ParsedSlipEntry[]>([]);
  const [parseNotes, setParseNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Set default operator
  useEffect(() => {
    if (operators.length > 0 && !selectedOperatorId) {
      const defaultOp = operators.find((o) => o.role === 'collector') || operators[0];
      setSelectedOperatorId(defaultOp.id);
    }
  }, [operators, selectedOperatorId]);

  // Initial parse of default sample slip when modal opens
  useEffect(() => {
    if (isOpen) {
      handleParseImage('/samples/sample_slip.jpg', true);
    }
  }, [isOpen]);

  // Hardware Back Button Dismissal Listener
  useEffect(() => {
    if (!isOpen) return;
    const handleDismiss = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('dismissActiveModal', handleDismiss);
    return () => window.removeEventListener('dismissActiveModal', handleDismiss);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleParseImage = async (src: string, isSample: boolean = false) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await parseSlipImage(src, isSample);
      setEntries(result.detectedEntries);
      setParseNotes(result.notes);
      if (isSample) {
        setTargetDate(result.slipDate);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse slip image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setIsSampleLoaded(false);
    setRotation(0);
    setZoom(1);
    handleParseImage(localUrl, false);
  };

  const handleLoadSampleSlip = () => {
    setImageUrl('/samples/sample_slip.jpg');
    setIsSampleLoaded(true);
    setRotation(0);
    setZoom(1);
    handleParseImage('/samples/sample_slip.jpg', true);
  };

  // Entry table manipulation
  const handleUpdateRow = (id: string, field: keyof ParsedSlipEntry, value: any) => {
    setEntries((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const newRow: ParsedSlipEntry = {
      id: `manual-row-${Date.now()}`,
      dealerName: '',
      cashAmount: 0,
      phonePeAmount: 0,
      balanceOwed: null,
      businessName: 'STAR',
      note: 'Added during HITL review',
    };
    setEntries((prev) => [...prev, newRow]);
  };

  const handleDeleteRow = (id: string) => {
    setEntries((prev) => prev.filter((row) => row.id !== id));
  };

  // Calculations
  const calculatedCash = entries.reduce((sum, r) => sum + (Number(r.cashAmount) || 0), 0);
  const calculatedPhonePe = entries.reduce((sum, r) => sum + (Number(r.phonePeAmount) || 0), 0);
  const calculatedGrand = calculatedCash + calculatedPhonePe;
  const totalBalanceOwed = entries.reduce((sum, r) => sum + (Number(r.balanceOwed) || 0), 0);

  // Approve & Commit to Database
  const handleApproveAndCommit = async () => {
    setErrorMessage(null);

    if (!selectedOperatorId) {
      setErrorMessage('Please assign an operator for this collection slip.');
      return;
    }

    if (entries.length === 0) {
      setErrorMessage('At least one entry row is required.');
      return;
    }

    // Validate rows
    for (let i = 0; i < entries.length; i++) {
      const row = entries[i];
      if (!row.dealerName.trim()) {
        setErrorMessage(`Row #${i + 1} is missing a Dealer Name.`);
        return;
      }
      const total = (Number(row.cashAmount) || 0) + (Number(row.phonePeAmount) || 0);
      if (total <= 0) {
        setErrorMessage(`Row #${i + 1} (${row.dealerName}) must have an amount greater than ₹0.`);
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Ensure a daily_sheet exists for (targetDate, selectedOperatorId)
      let sheetId: string;
      const { data: existingSheet, error: fetchSheetErr } = await supabase
        .from('daily_sheets')
        .select('id')
        .eq('sheet_date', targetDate)
        .eq('collector_id', selectedOperatorId)
        .maybeSingle();

      if (existingSheet) {
        sheetId = existingSheet.id;
      } else {
        const { data: newSheet, error: createSheetErr } = await supabase
          .from('daily_sheets')
          .insert({
            sheet_date: targetDate,
            collector_id: selectedOperatorId,
            notes: `HITL digitized slip uploaded by Admin on ${new Date().toISOString()}`,
          })
          .select('id')
          .single();

        if (createSheetErr || !newSheet) {
          throw new Error('Failed to create daily sheet: ' + (createSheetErr?.message || 'Unknown error'));
        }
        sheetId = newSheet.id;
      }

      // 2. Prepare entries payload
      const rowsToInsert = entries.map((r) => {
        const cash = Number(r.cashAmount) || 0;
        const phonepe = Number(r.phonePeAmount) || 0;
        return {
          sheet_id: sheetId,
          collector_id: selectedOperatorId,
          dealer_name: r.dealerName.trim(),
          cash_amount: cash,
          phonepe_amount: phonepe,
          balance_owed: r.balanceOwed !== null && !isNaN(Number(r.balanceOwed)) ? Number(r.balanceOwed) : null,
          note: r.note.trim() ? `${r.note.trim()} [HITL Approved]` : '[HITL Verified Slip]',
          business_name: r.businessName,
          image_url: imageUrl,
          status: 'approved' as const,
          is_deleted: false,
        };
      });

      // 3. Batch insert verified entries
      const { data: insertedData, error: insertErr } = await supabase
        .from('entries')
        .insert(rowsToInsert)
        .select();

      if (insertErr) {
        throw new Error('Failed to insert entries: ' + insertErr.message);
      }

      // 4. Success callback
      onSuccess(entries.length, calculatedGrand, targetDate);
      onClose();
    } catch (err: any) {
      console.error('Approve and commit error:', err);
      setErrorMessage(err.message || 'Failed to commit slip entries');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-7xl h-[94vh] max-h-[94vh] bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in-50 duration-200">
        
        {/* MODAL HEADER */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase">
                  AI Slip Digitizer & HITL Review Desk
                </h2>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Human-In-The-Loop Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Upload physical handover slip • Inspect side-by-side • Edit any field • Approve to ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadSampleSlip}
              className={`hidden md:flex px-2.5 py-1.5 rounded-xl text-xs font-bold items-center gap-1.5 transition-all ${
                isSampleLoaded
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Reload the 07-Oct client pink handwritten slip"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load 07-Oct Handover Slip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* TOP CONFIGURATION STRIP */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          
          {/* Operator Selector & Target Date */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-semibold">{t('creditToOperator')}:</span>
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.full_name} ({op.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">{t('slipDate')}:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Upload New Slip Actions */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-teal-500 text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('uploadNewSlip')}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="px-6 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* WORKSPACE: SIDE-BY-SIDE SPLIT (LEFT = IMAGE, RIGHT = HITL EDITABLE GRID) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* LEFT PANE: SLIP IMAGE VIEWER (COL-SPAN 5) */}
          <div className="lg:col-span-5 h-[40vh] lg:h-full bg-slate-950 flex flex-col overflow-hidden relative">
            
            {/* Viewer Controls Toolbar */}
            <div className="h-9 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-slate-400 text-[11px] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                {t('physicalSlipPreview')}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Rotate -90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Rotate +90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-1 text-[10px] font-mono text-slate-400 hover:text-white"
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`p-1 rounded text-xs flex items-center gap-1 ${
                    highContrast
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Enhance Pencil Contrast"
                >
                  <Sliders className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Contrast</span>
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#070b14] relative">
              <div
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-full max-w-full flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt="Slip Preview"
                  className={`max-h-[70vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-800 ${
                    highContrast ? 'contrast-150 brightness-110 saturate-150' : ''
                  }`}
                />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-400 gap-2">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-bold">Analyzing handwritten slip...</span>
                </div>
              )}
            </div>

            {/* Bottom info strip for image */}
            <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Slip: {isSampleLoaded ? '07-Oct Handover Slip (Pink)' : 'Uploaded Slip'}</span>
              <span className="font-mono text-emerald-400 font-bold">
                {entries.length} items detected
              </span>
            </div>
          </div>

          {/* RIGHT PANE: HITL VERIFICATION & EDITABLE GRID (COL-SPAN 7) */}
          <div className="lg:col-span-7 h-[60vh] lg:h-full bg-slate-900/30 flex flex-col overflow-hidden">
            
            {/* Real-time Reconciliation Tally Strip */}
            <div className="bg-slate-950/80 border-b border-slate-800 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">{t('cashSubtotal')}</span>
                  <span className="font-mono text-sm font-black text-emerald-400">
                    {formatINR(calculatedCash)}
                  </span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">{t('phonePeSubtotal')}</span>
                  <span className="font-mono text-sm font-black text-purple-400">
                    {formatINR(calculatedPhonePe)}
                  </span>
                </div>
                <span className="text-slate-700">|</span>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">{t('slipGrandTotal')}</span>
                  <span className="font-mono text-sm font-black text-white">
                    {formatINR(calculatedGrand)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('subtotalsReconciled')}</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addLine')}</span>
                </button>
              </div>
            </div>

            {/* Editable Entries Table (Power BI Grid with Touch Scroll) */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              <div className="border border-slate-800 rounded-xl overflow-x-auto shadow-lg bg-slate-950/60">
                <table className="w-full min-w-[620px] text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2 w-24">Business</th>
                      <th className="py-2 px-3">Dealer / Shop Name</th>
                      <th className="py-2 px-2 text-right w-24">Cash (₹)</th>
                      <th className="py-2 px-2 text-right w-24">PhonePe (₹)</th>
                      <th className="py-2 px-2 text-right w-24">Bal Owed</th>
                      <th className="py-2 px-2">Remarks / Notes</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {entries.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-900/20'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-2 px-2 text-center font-mono text-slate-500 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Business Pill Selector */}
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateRow(
                                row.id,
                                'businessName',
                                row.businessName === 'STAR' ? 'ARBO PLAST' : 'STAR'
                              )
                            }
                            className={`w-full py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-all text-center ${
                              row.businessName === 'STAR'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            }`}
                            title="Click to toggle business"
                          >
                            {row.businessName}
                          </button>
                        </td>

                        {/* Dealer Name Input */}
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={row.dealerName}
                            onChange={(e) => handleUpdateRow(row.id, 'dealerName', e.target.value)}
                            placeholder="Dealer Name"
                            className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-white font-bold text-xs outline-none"
                          />
                        </td>

                        {/* Cash Amount */}
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.cashAmount || ''}
                            onChange={(e) =>
                              handleUpdateRow(row.id, 'cashAmount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 font-mono text-emerald-400 font-bold text-xs outline-none"
                          />
                        </td>

                        {/* PhonePe Amount */}
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.phonePeAmount || ''}
                            onChange={(e) =>
                              handleUpdateRow(row.id, 'phonePeAmount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 font-mono text-purple-400 font-bold text-xs outline-none"
                          />
                        </td>

                        {/* Balance Owed */}
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.balanceOwed ?? ''}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                'balanceOwed',
                                e.target.value !== '' ? parseFloat(e.target.value) || 0 : null
                              )
                            }
                            placeholder="Bal (₹)"
                            className="w-full text-right bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 font-mono text-amber-400 font-semibold text-xs outline-none"
                          />
                        </td>

                        {/* Note / Remarks */}
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={row.note}
                            onChange={(e) => handleUpdateRow(row.id, 'note', e.target.value)}
                            placeholder="Notes on slip (e.g. R.P.P)"
                            className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-slate-300 text-[11px] outline-none"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseNotes && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{parseNotes}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* MODAL FOOTER WITH COMMIT ACTION */}
        <footer className="min-h-16 border-t border-slate-800/80 bg-slate-900 px-4 sm:px-6 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <span className="hidden sm:inline text-xs text-slate-400">
              {t('slipDate')}: <strong className="text-white font-mono">{targetDate}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {entries.length} {t('entriesCount')}
              </span>
              <span className="font-mono text-xs font-black text-emerald-400">
                {t('slipGrandTotal')}: {formatINR(calculatedGrand)}
              </span>
            </div>

            <button
              type="button"
              disabled={saving || entries.length === 0}
              onClick={handleApproveAndCommit}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{t('approveAndCommit')} ({entries.length})</span>
                </>
              )}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
